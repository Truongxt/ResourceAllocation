/**
 * Interceptor làm mới access token.
 *
 * Đây là đoạn client dễ hỏng âm thầm nhất trong cả tính năng refresh token: hỏng
 * thì không có màn hình nào đỏ lên, người dùng chỉ thấy thỉnh thoảng bị đá về
 * trang đăng nhập không rõ lý do.
 *
 * Ca nguy hiểm nhất là **bão refresh**: một trang bắn nhiều request song song,
 * access token hết hạn nên tất cả cùng nhận 401 và cùng đòi làm mới. Server xoay
 * vòng refresh token, nên lần làm mới thứ hai trình ra token vừa bị thu hồi →
 * server hiểu là token bị đánh cắp và thu hồi cả chuỗi. Người dùng bị đá ra dù
 * không ai tấn công gì cả.
 *
 * Dùng adapter giả của axios thay vì mock cả thư viện, để interceptor thật chạy
 * qua đúng bộ máy thật của axios.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import api from '../src/services/api.js';
import { setToken, getToken, clearToken } from '../src/services/tokenStore.js';

let refreshCalls = 0;
let tokenCounter = 0;

/** Access token nào đang được server coi là hợp lệ. */
let validToken = 'token-cu';

function makeResponse(config, status, data) {
  const response = { data, status, statusText: '', headers: {}, config };
  if (status >= 400) {
    const error = new Error(`Request failed with status code ${status}`);
    error.config = config;
    error.response = response;
    return Promise.reject(error);
  }
  return Promise.resolve(response);
}

/** Giả lập server: 401 khi access token đã cũ, và một endpoint làm mới. */
const adapter = (config) => {
  const url = config.url || '';

  if (url.includes('/auth/refresh')) {
    refreshCalls += 1;
    validToken = `token-moi-${++tokenCounter}`;
    return makeResponse(config, 200, { data: { token: validToken } });
  }

  const sent = (config.headers?.Authorization || '').replace('Bearer ', '');
  if (sent !== validToken) {
    return makeResponse(config, 401, { message: 'hết hạn' });
  }

  return makeResponse(config, 200, { data: { url } });
};

describe('Tự làm mới access token khi hết hạn', () => {
  beforeEach(() => {
    refreshCalls = 0;
    tokenCounter = 0;
    validToken = 'token-cu';
    clearToken();
    localStorage.clear();
    setToken('token-cu');
    api.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;
  });

  it('401 vì hết hạn thì làm mới rồi chạy lại request, người dùng không thấy gì', async () => {
    validToken = 'token-server-doi-roi'; // token trong localStorage nay đã cũ

    const res = await api.get('/tasks');

    expect(res.status).toBe(200);
    expect(refreshCalls).toBe(1);
    expect(getToken()).toBe(validToken);
  });

  it('access token KHÔNG bao giờ chạm localStorage', async () => {
    validToken = 'token-server-doi-roi';
    await api.get('/tasks');

    // Lỗ XSS đọc được localStorage. Token chỉ sống trong bộ nhớ thì đóng tab là
    // mất, và không còn gì để trộm về sau.
    expect(localStorage.getItem('rao_token')).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(getToken()).toBe(validToken);
  });

  it('401 không cứu được thì xóa token trong bộ nhớ', async () => {
    api.defaults.adapter = (config) => makeResponse(config, 401, { message: 'hết hạn' });
    axios.defaults.adapter = api.defaults.adapter;

    await expect(api.get('/tasks')).rejects.toBeTruthy();
    expect(getToken()).toBeNull();
  });

  it('nhiều request cùng gặp 401 chỉ kích hoạt MỘT lượt làm mới', async () => {
    validToken = 'token-server-doi-roi';

    const results = await Promise.all([
      api.get('/tasks'),
      api.get('/projects'),
      api.get('/resources'),
      api.get('/analytics/dashboard'),
    ]);

    expect(results.every((r) => r.status === 200)).toBe(true);
    // Đây là assertion giữ cả tính năng: >1 nghĩa là có lượt làm mới trình ra
    // token đã bị xoay vòng, và server sẽ thu hồi cả chuỗi.
    expect(refreshCalls).toBe(1);
  });

  it('request đã thử lại mà vẫn 401 thì không thử vô hạn', async () => {
    // Làm mới "thành công" nhưng token mới vẫn không được chấp nhận.
    api.defaults.adapter = (config) => {
      if ((config.url || '').includes('/auth/refresh')) {
        refreshCalls += 1;
        return makeResponse(config, 200, { data: { token: 'van-khong-dung' } });
      }
      return makeResponse(config, 401, { message: 'hết hạn' });
    };
    axios.defaults.adapter = api.defaults.adapter;

    await expect(api.get('/tasks')).rejects.toBeTruthy();
    expect(refreshCalls).toBe(1);
  });

  it('401 từ chính trang đăng nhập không kích hoạt làm mới', async () => {
    api.defaults.adapter = (config) => {
      if ((config.url || '').includes('/auth/refresh')) {
        refreshCalls += 1;
        return makeResponse(config, 200, { data: { token: 'x' } });
      }
      return makeResponse(config, 401, { message: 'sai mật khẩu' });
    };
    axios.defaults.adapter = api.defaults.adapter;

    await expect(api.post('/auth/login', { email: 'a@b.c', password: 'sai' })).rejects.toBeTruthy();
    // Sai mật khẩu không phải hết hạn phiên — làm mới ở đây là vô nghĩa.
    expect(refreshCalls).toBe(0);
  });

  it('lỗi không phải 401 được trả nguyên trạng', async () => {
    api.defaults.adapter = (config) => makeResponse(config, 500, { message: 'lỗi server' });

    await expect(api.get('/tasks')).rejects.toMatchObject({ response: { status: 500 } });
    expect(refreshCalls).toBe(0);
  });
});
