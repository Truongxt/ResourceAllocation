/**
 * `taskApi.getAllPages`: server trả tối đa 100 việc mỗi trang (mặc định 50), nên màn nào cần
 * đủ việc phải tự đi hết các trang. Trước đây Công việc / chi tiết dự án chỉ thấy 50 việc đầu,
 * Lịch chỉ thấy 100 — đúng lỗi web đã sửa ở 51f0d5f.
 */
jest.mock('../src/api/client', () => ({ __esModule: true, default: { get: jest.fn() } }));

import apiClient from '../src/api/client';
import taskApi, { SCREEN_MAX_PAGES } from '../src/api/taskApi';

const pageOf = (n, pages, total) => ({
  data: {
    data: { tasks: [{ _id: `t${n}` }] },
    pagination: { page: n, pages },
    total,
  },
});

beforeEach(() => apiClient.get.mockReset());

test('đi hết mọi trang, giữ bộ lọc, mỗi trang 100 việc', async () => {
  apiClient.get.mockImplementation((url, { params }) => Promise.resolve(pageOf(params.page, 3, 250)));
  const { tasks, total } = await taskApi.getAllPages({ project: 'p1' });

  expect(tasks.map((t) => t._id)).toEqual(['t1', 't2', 't3']);
  expect(total).toBe(250);
  const calls = apiClient.get.mock.calls.map(([, { params }]) => params);
  expect(calls).toEqual([1, 2, 3].map((page) => ({ project: 'p1', limit: 100, page })));
});

test('dừng ở trần số trang', async () => {
  apiClient.get.mockImplementation((url, { params }) => Promise.resolve(pageOf(params.page, 50, 5000)));
  const { tasks, total } = await taskApi.getAllPages({}, 2);

  expect(apiClient.get).toHaveBeenCalledTimes(2);
  expect(tasks).toHaveLength(2);
  expect(total).toBe(5000);
});

test('trần mặc định cho màn hình là 10 trang', () => {
  expect(SCREEN_MAX_PAGES).toBe(10);
});
