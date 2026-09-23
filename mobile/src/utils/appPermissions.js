/**
 * Quyền theo phân hệ — bản sao của `requireAppPermission` bên server và của
 * `client/src/context/AuthContext.jsx`.
 *
 * Tách khỏi AuthContext để kiểm thử được bằng Node thuần: file context phải
 * `import 'react-native'` nên không chạy ngoài Expo, mà đây lại đúng là chỗ sai
 * một dòng là khóa nhầm cả app hoặc mở nhầm nút cho người không có quyền.
 *
 * Ba quy tắc phải giữ nguyên ở cả ba nơi:
 *   1. Chủ sở hữu luôn đủ quyền, bỏ qua mọi cấu hình.
 *   2. **Thiếu cấu hình nghĩa là `manage`**, không phải `none` — tài khoản cũ
 *      chưa có `appPermissions` mà mặc định thành cấm thì mất sạch tính năng.
 *   3. Giá trị lạ cũng coi như `manage`, cùng lý do: dữ liệu hỏng không được
 *      biến thành khóa tài khoản.
 */

export const APP_PERMISSION_RANK = { none: 0, view: 1, manage: 2 };

/** @returns {0|1|2} 0 = không được vào, 1 = chỉ xem, 2 = được sửa. */
export function appPermissionRank(user, moduleKey) {
  if (!user) return 0;
  if (user.isOwner) return 2;
  const level = user.appPermissions?.[moduleKey];
  if (level === undefined) return 2;
  return APP_PERMISSION_RANK[level] ?? 2;
}

export const canViewModule = (user, moduleKey) => appPermissionRank(user, moduleKey) >= 1;

export const canManageModule = (user, moduleKey) => appPermissionRank(user, moduleKey) >= 2;

/**
 * Quyền **Quản trị ứng dụng** (`User.appAdmins`) — lớp quyền thứ hai, độc lập
 * hoàn toàn với `appPermissions` ở trên.
 *
 * Bản sao của `hasAppAccess` trong `client/src/context/AuthContext.jsx`, và phải
 * khớp với `authorizeApp` ở server (`server/src/middleware/auth.js`).
 *
 * Trước đây mobile không có lớp này: tab Tối ưu hóa hiện ra cho bất kỳ ai có
 * `appPermissions.optimization >= view`, trong khi server chặn cả phân hệ sau
 * `authorizeApp('optimize')`. Người dùng thấy tab, bấm vào, nhận 403 — còn trên
 * web thì tab đó không hề xuất hiện. Hai client nói hai chuyện khác nhau về cùng
 * một tài khoản.
 */
export const hasAppAccess = (user, appKey) => {
  if (!user) return false;
  if (user.isOwner) return true;
  if (user.role === 'admin') return true;
  return Array.isArray(user.appAdmins) && user.appAdmins.includes(appKey);
};

/**
 * Có được vào phân hệ Nhân sự không.
 *
 * Quy tắc của web (`Sidebar.jsx`): không phải `member`, **hoặc** là Owner,
 * **hoặc** được cấp quyền quản trị ứng dụng `resource`.
 *
 * Mobile trước đây chỉ kiểm `role !== 'member'`, nên một thành viên đã được cấp
 * quyền `resource` thấy phân hệ này trên web nhưng không thấy trên điện thoại.
 */
export const canAccessResources = (user) =>
  Boolean(user && (user.role !== 'member' || user.isOwner || hasAppAccess(user, 'resource')));
