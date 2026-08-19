import axios from 'axios';
import { getToken, setToken, clearToken } from './tokenStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Cần thiết để cookie refresh (httpOnly) được gửi kèm khi gọi /auth/refresh.
  // Server đã bật CORS credentials và giới hạn origin theo CLIENT_URL.
  withCredentials: true,
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Làm mới access token khi nó hết hạn.
 *
 * Access token nay chỉ sống 15 phút, nên 401 vì hết hạn là chuyện bình thường
 * chứ không còn là lỗi. Bắt được nó, đổi lấy token mới bằng cookie refresh, rồi
 * chạy lại đúng request vừa hỏng — người dùng không thấy gì cả.
 *
 * Hai cái bẫy phải tránh:
 *
 *   1. **Bão refresh.** Một trang thường bắn nhiều request song song; token hết hạn
 *      thì tất cả cùng nhận 401 và cùng đòi làm mới. Mà server xoay vòng token: lần
 *      làm mới thứ hai trình ra token vừa bị thu hồi → server hiểu là bị đánh cắp và
 *      thu hồi cả chuỗi, đá người dùng ra. Nên chỉ cho **một** lượt làm mới chạy,
 *      các request còn lại xếp hàng chờ kết quả của nó.
 *
 *   2. **Vòng lặp vô hạn.** Chính lời gọi /auth/refresh cũng có thể trả 401.
 *      Đánh dấu request đã thử lại và bỏ qua endpoint refresh.
 */
let refreshing = null;
const waiters = [];

const runRefresh = async () => {
  // axios trần, không qua interceptor, để 401 ở đây không kích hoạt lại chính nó
  const response = await axios.post(
    `${API_URL}/auth/refresh`,
    {},
    { withCredentials: true }
  );
  return response.data?.data?.token;
};

const onRefreshed = (token, error) => {
  while (waiters.length) waiters.shift()(token, error);
};

const clearSessionAndRedirect = () => {
  clearToken();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isAuthEndpoint =
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/register');

    if (status !== 401 || !original || original._retried || isAuthEndpoint) {
      // 401 mà không cứu được nữa: dọn phiên và về trang đăng nhập.
      if (status === 401 && !isAuthEndpoint) clearSessionAndRedirect();
      return Promise.reject(error);
    }

    original._retried = true;

    if (!refreshing) {
      refreshing = runRefresh()
        .then((token) => {
          setToken(token);
          onRefreshed(token, null);
          return token;
        })
        .catch((err) => {
          onRefreshed(null, err);
          clearSessionAndRedirect();
          throw err;
        })
        .finally(() => {
          refreshing = null;
        });
    }

    return new Promise((resolve, reject) => {
      waiters.push((token, err) => {
        if (err || !token) return reject(err || error);
        original.headers.Authorization = `Bearer ${token}`;
        resolve(api(original));
      });
    });
  }
);

export default api;
