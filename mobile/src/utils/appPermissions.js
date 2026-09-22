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
