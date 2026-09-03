/**
 * ============================================================================
 * TIỆN ÍCH SINH MÃ NHÂN VIÊN TỰ ĐỘNG (Employee ID Generator Utility)
 * ============================================================================
 *
 * Mục đích:
 *   - Sinh mã định danh duy nhất cho nhân sự theo định dạng chuẩn: "NV" + 4 chữ số.
 *   - Ví dụ: NV0001, NV0002, NV0010, NV0100...
 *
 * Cách hoạt động:
 *   1. Tìm kiếm bản ghi Resource có mã nhân viên lớn nhất hiện tại theo regex ^NV\d+$.
 *   2. Tách phần số ra, tăng lên 1 (nếu chưa có nhân sự nào thì bắt đầu từ 1).
 *   3. Sử dụng padStart(4, '0') để bù số 0 ở đầu, đảm bảo độ dài đồng nhất.
 *
 * Phạm vi sử dụng chung:
 *   - auth.controller.js: Tự động tạo hồ sơ nhân sự khi người dùng mới đăng ký.
 *   - resource.controller.js: Tạo nhân sự mới thủ công từ trang quản trị.
 */

const Resource = require('../models/Resource');

const EMPLOYEE_ID_PREFIX = 'NV';
const EMPLOYEE_ID_LENGTH = 4;

/**
 * Sinh mã nhân sự tiếp theo trong hệ thống.
 * @returns {Promise<string>} Mã nhân sự mới, ví dụ: 'NV0005'
 */
const generateEmployeeId = async () => {
  // Tìm mã nhân sự cao nhất hiện có khớp với tiền tố NV
  const latest = await Resource.findOne({
    employeeId: new RegExp(`^${EMPLOYEE_ID_PREFIX}\\d+$`),
  })
    .sort({ employeeId: -1 })
    .select('employeeId');

  // Lấy giá trị số của mã gần nhất
  const latestNumber = latest?.employeeId
    ? parseInt(latest.employeeId.replace(EMPLOYEE_ID_PREFIX, ''), 10)
    : 0;

  // Tăng lên 1 đơn vị
  const nextNumber = Number.isNaN(latestNumber) ? 1 : latestNumber + 1;

  // Bù số 0 phía trước theo độ dài quy chuẩn
  return `${EMPLOYEE_ID_PREFIX}${String(nextNumber).padStart(EMPLOYEE_ID_LENGTH, '0')}`;
};

module.exports = {
  EMPLOYEE_ID_PREFIX,
  EMPLOYEE_ID_LENGTH,
  generateEmployeeId,
};
