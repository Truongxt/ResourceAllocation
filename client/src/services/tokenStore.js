/**
 * Nơi giữ access token — **chỉ trong bộ nhớ**, không chạm `localStorage`.
 *
 * Vì sao: token trong `localStorage` sống qua cả lần đóng trình duyệt và bất kỳ
 * đoạn script nào chạy trên trang cũng đọc được. Một lỗ XSS là mất token dùng
 * được nhiều ngày.
 *
 * Giữ trong biến module thì:
 *   - Đóng tab là mất, không còn gì để trộm về sau.
 *   - XSS vẫn có thể đọc được **trong lúc đang chạy** — không có cách nào chặn
 *     hẳn điều đó ở SPA. Nhưng nó chỉ lấy được token sống 15 phút, không lấy
 *     được refresh token (cookie httpOnly), nên không duy trì được quyền truy cập.
 *
 * Cái giá phải trả: tải lại trang là mất token. Bù lại bằng cách gọi
 * `/auth/refresh` lúc khởi động — cookie refresh vẫn còn nên người dùng không
 * phải đăng nhập lại.
 */

let accessToken = null;

export const getToken = () => accessToken;

export const setToken = (token) => {
  accessToken = token || null;
};

export const clearToken = () => {
  accessToken = null;
};

export default { getToken, setToken, clearToken };
