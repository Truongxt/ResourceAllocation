const Task = require('../models/Task');

/**
 * Phân quyền cho các thao tác sửa công việc.
 *
 * Bảng vai trò trong tài liệu quy định Member "xem task được gán, cập nhật tiến độ".
 * `authorize()` không diễn đạt được vế thứ hai vì nó chỉ xét role, không xét việc
 * người dùng có phải người được giao task đó hay không — nên cần middleware riêng.
 *
 * Admin và Project Manager qua được mọi trường hợp. Người được giao task qua được
 * nhưng chỉ với các trường liên quan tới tiến độ, để họ không tự chuyển việc sang
 * người khác hay đổi phạm vi công việc.
 */

const PRIVILEGED_ROLES = ['admin', 'project_manager'];

// Trường mà người được giao việc tự sửa được
const ASSIGNEE_EDITABLE_FIELDS = ['status', 'progress', 'actualHours'];

const canModifyTask = ({ restrictFields = false } = {}) => async (req, res, next) => {
  try {
    if (PRIVILEGED_ROLES.includes(req.user.role)) return next();

    const task = await Task.findById(req.params.id).select('assignee');
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công việc',
      });
    }

    const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();
    if (!isAssignee) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có thể cập nhật công việc được giao cho mình.',
      });
    }

    if (restrictFields) {
      const attempted = Object.keys(req.body || {});
      const disallowed = attempted.filter((field) => !ASSIGNEE_EDITABLE_FIELDS.includes(field));
      if (disallowed.length) {
        return res.status(403).json({
          success: false,
          message: `Bạn chỉ được cập nhật ${ASSIGNEE_EDITABLE_FIELDS.join(', ')} trên công việc của mình. `
            + `Không được phép sửa: ${disallowed.join(', ')}.`,
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { canModifyTask, ASSIGNEE_EDITABLE_FIELDS, PRIVILEGED_ROLES };
