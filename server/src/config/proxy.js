/**
 * `TRUST_PROXY` — server đứng sau bao nhiêu lớp proxy (Nginx, load balancer, CDN).
 *
 * Không khai thì Express lấy IP của kết nối TCP, tức là IP của proxy: mọi khách hàng
 * trông như cùng một địa chỉ. Hệ quả với giới hạn tần suất: cả hệ thống chia nhau
 * 1000 request / 15 phút, và 10 lần đăng nhập sai của một người khóa đăng nhập của
 * tất cả.
 *
 * Giá trị nhận:
 *   (bỏ trống)            không tin proxy nào — đúng khi server nhận kết nối trực tiếp
 *   1, 2, …               số lớp proxy đứng trước server
 *   loopback, 10.0.0.0/8  tên dải hoặc danh sách IP/CIDR của proxy, ngăn bằng dấu phẩy
 *
 * `true` bị từ chối: nó tin mọi giá trị `X-Forwarded-For`, nên ai cũng tự đặt được IP
 * cho mình và giới hạn tần suất mất tác dụng — tệ hơn cả không khai.
 */
const parseTrustProxy = (value = process.env.TRUST_PROXY) => {
  const text = String(value ?? '').trim();
  if (!text || text.toLowerCase() === 'false') return undefined;

  if (text.toLowerCase() === 'true') {
    throw new Error(
      'TRUST_PROXY=true cho phép giả mạo IP qua X-Forwarded-For. ' +
      'Hãy khai số lớp proxy (ví dụ 1) hoặc dải IP của proxy.'
    );
  }

  if (/^\d+$/.test(text)) {
    const hops = Number(text);
    return hops > 0 ? hops : undefined;
  }

  return text;
};

module.exports = { parseTrustProxy };
