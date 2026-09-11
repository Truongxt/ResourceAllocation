/**
 * ============================================================================
 * DỊCH VỤ XÁC ĐỊNH PHẠM VI DỮ LIỆU PHÂN TÍCH (Analytics Data Scoping Service)
 * ============================================================================
 *
 * Mục đích:
 *   - Bảo vệ an toàn dữ liệu, chống rò rỉ thông tin giữa các tổ chức / nhóm dự án khác nhau.
 *   - Khi người dùng đăng nhập không phải Global Admin (ví dụ PM hoặc Member), hệ thống
 *     sẽ tự động giới hạn chỉ trả về các dữ liệu (Project, Task, Resource) mà người dùng đó
 *     có quyền xem hoặc trực tiếp tham gia.
 *
 * Nguyên tắc phân quyền dữ liệu:
 *   1. Global Admin (role === 'admin'):
 *      - Không áp dụng bộ lọc, xem toàn quyền mọi dự án, task, và nhân sự trong DB.
 *   2. Quản lý dự án (PM) & Thành viên (Member):
 *      - Dự án hợp lệ: Dự án do user làm Quản lý (manager), hoặc có tên trong danh sách thành viên
 *        (members.user), hoặc do user tạo (createdBy), hoặc có task gán cho user.
 *      - Task hợp lệ: Thuộc các dự án hợp lệ nói trên, HOẶC do user phụ trách (assignee), HOẶC do user tạo.
 *      - Resource hợp lệ: Tất cả nhân sự cùng tham gia trong các dự án hợp lệ của user, HOẶC do user tạo.
 *      - Kết quả tối ưu hợp lệ: Kết quả do chính user chạy (runBy), HOẶC tối ưu cho dự án hợp lệ của user.
 */

const Project = require('../models/Project');
const Task = require('../models/Task');

/**
 * Xây dựng các điều kiện lọc MongoDB ($match) tương ứng với quyền của người dùng.
 *
 * @param {Object} user - Đối tượng user từ req.user (chứa _id, role...)
 * @returns {Promise<Object>} Bộ lọc quyền:
 *   - projectMatch: Điều kiện lọc Project
 *   - taskMatch: Điều kiện lọc Task
 *   - resourceMatch: Điều kiện lọc Resource
 *   - recentOptimizationFilter: Điều kiện lọc OptimizationResult
 *   - userProjectIds: Danh sách ID các dự án được phép xem
 *   - isGlobalAdmin: Boolean cờ admin
 */
const getUserAnalyticsScope = async (user) => {
  const isGlobalAdmin = user && user.role === 'admin';
  const userCompany = user?.companyName || 'Công ty Công nghệ RAO';

  // Trường hợp 1: Admin công ty -> Xem toàn bộ dữ liệu trong phạm vi công ty mình
  if (isGlobalAdmin || !user) {
    return {
      projectMatch: { companyName: userCompany },
      taskMatch: { companyName: userCompany },
      resourceMatch: { isActive: true, companyName: userCompany },
      recentOptimizationFilter: { status: 'completed' },
      isGlobalAdmin: true,
      userProjectIds: null,
    };
  }

  // Trường hợp 2: PM hoặc Member -> Truy vết các dự án liên quan
  // Bước 2.1: Tìm các dự án mà user có task được gán hoặc tự tạo task (cùng công ty)
  const userTasks = await Task.find({
    companyName: userCompany,
    $or: [{ assignee: user._id }, { createdBy: user._id }],
  }).select('project');
  const assignedProjectIds = userTasks.map((t) => t.project).filter(Boolean);

  // Bước 2.2: Lọc các dự án mà user có liên quan
  const projectMatch = {
    companyName: userCompany,
    $or: [
      { manager: user._id },
      { 'members.user': user._id },
      { createdBy: user._id },
      { _id: { $in: assignedProjectIds } },
    ],
  };

  const userProjects = await Project.find(projectMatch).select('_id members');
  const userProjectIds = userProjects.map((p) => p._id);

  // Bước 2.3: Lọc các công việc nằm trong các dự án của user hoặc do user làm/tạo
  const taskMatch = {
    $or: [
      { project: { $in: userProjectIds } },
      { assignee: user._id },
      { createdBy: user._id },
    ],
  };

  // Bước 2.4: Gom danh sách các User ID là đồng đội cùng làm việc trong các dự án của user
  const memberUserIds = new Set();
  userProjects.forEach((p) => {
    if (p.members) {
      p.members.forEach((m) => {
        if (m.user) memberUserIds.add(m.user.toString());
      });
    }
  });
  memberUserIds.add(user._id.toString());

  // Chỉ lấy hồ sơ nhân sự của các đồng nghiệp trong cùng nhóm dự án
  const resourceMatch = {
    isActive: true,
    $or: [
      { user: { $in: Array.from(memberUserIds) } },
      { createdBy: user._id },
    ],
  };

  // Chỉ lấy các đợt tối ưu hóa của chính user hoặc cho dự án của user
  const recentOptimizationFilter = {
    status: 'completed',
    $or: [
      { runBy: user._id },
      { projectFilter: { $in: userProjectIds } },
    ],
  };

  return {
    projectMatch,
    taskMatch,
    resourceMatch,
    recentOptimizationFilter,
    userProjectIds,
    isGlobalAdmin: false,
  };
};

module.exports = {
  getUserAnalyticsScope,
};
