/**
 * ============================================================================
 * BASE WEWORK — Client Task Permissions Helper
 * ============================================================================
 * Tham chiếu chuẩn: https://help.base.vn/support/solutions/articles/63000273353
 */

export function getTaskPermissions(task, project, user) {
  if (!user) {
    return {
      isOwner: false,
      isPM: false,
      isCreator: false,
      isAssignee: false,
      isFollower: false,
      roleLabel: 'Khách',
      canEditDetails: false,
      canEditDeadline: false,
      canChangeAssignee: false,
      canUpdateStatus: false,
      canDelete: false,
      canManageChecklist: false,
      canReportResult: false,
      canDuplicate: false,
      canMove: false,
      canAddSubtask: false,
      canAddFollower: false,
      canRemoveFollower: () => false,
    };
  }

  const userId = user._id || user.id;
  const isOwner = user.role === 'admin' || Boolean(user.isOwner);

  const proj =
    (project && project.permissions)
      ? project
      : (task?.project && task.project.permissions ? task.project : (project || task?.project));
  const managerId = proj?.manager?._id || proj?.manager;
  const isPM = isOwner || (!!managerId && managerId.toString() === userId.toString()) || user.role === 'project_manager';

  const creatorId = task?.createdBy?._id || task?.createdBy;
  const isCreator = !!creatorId && creatorId.toString() === userId.toString();

  const assigneeId = task?.assignee?._id || task?.assignee;
  const isAssignee = !!assigneeId && assigneeId.toString() === userId.toString();

  const followers = task?.followers || [];
  const isFollower = followers.some((f) => {
    const fid = f?._id || f;
    return fid && fid.toString() === userId.toString();
  });

  const perms = proj?.permissions || {};

  // Nhãn vai trò hiển thị
  let roleLabel = 'Thành viên';
  if (isOwner) roleLabel = 'Chủ sở hữu (Owner)';
  else if (isPM) roleLabel = 'Quản lý dự án (PM)';
  else if (isCreator && isAssignee) roleLabel = 'Người giao & Thực hiện';
  else if (isCreator) roleLabel = 'Người giao việc';
  else if (isAssignee) roleLabel = 'Người thực hiện';
  else if (isFollower) roleLabel = 'Người theo dõi';

  // 1. Chỉnh sửa tiêu đề & mô tả
  const canEditDetails = isOwner || isPM || isCreator || (isAssignee && !!perms.allowAssigneeEditTitleDesc);

  // 2. Chỉnh sửa deadline & ngày bắt đầu
  const canEditDeadline = isOwner || isPM || isCreator || (isAssignee && !!perms.allowAssigneeEditDeadline);

  // 3. Đổi người thực hiện (Reassign)
  const canChangeAssignee = isOwner || isPM || isCreator || (isAssignee && !!perms.allowAssigneeReassign);

  // 4. Đánh dấu hoàn thành / Cập nhật tiến độ
  const canUpdateStatus = isOwner || isPM || isCreator || isAssignee || (isFollower && !!perms.allowFollowerMarkDone);

  // 5. Xóa công việc
  const isSubtask = !!task?.parentTask;
  const canDelete =
    isOwner ||
    isPM ||
    (isSubtask && (isCreator || isAssignee)) ||
    (isCreator && !!perms.allowCreatorDeleteTask) ||
    (isAssignee && !!perms.allowAssigneeDeleteTask);

  // 6. Checklist
  const canManageChecklist = isOwner || isPM || isCreator || isAssignee || (isFollower && !!perms.allowFollowerManageChecklist);

  // 7. Báo cáo kết quả
  const canReportResult = isOwner || isPM || isCreator || isAssignee;

  // 8. Nhân bản công việc (Creator, PM, Owner)
  const canDuplicate = isOwner || isPM || isCreator;

  // 9. Di chuyển công việc (Creator, Assignee, PM, Owner)
  const canMove = isOwner || isPM || isCreator || isAssignee;

  // 10. Tạo công việc con
  const canAddSubtask = isOwner || isPM || isCreator || isAssignee || isFollower;

  // 11. Thêm người theo dõi
  const canAddFollower = isOwner || isPM || isCreator || isAssignee;

  // 12. Gỡ người theo dõi
  const canRemoveFollower = (targetUserId) => {
    if (isOwner || isPM || isCreator || isAssignee) return true;
    // Follower chỉ được tự gỡ chính mình
    if (isFollower && targetUserId && targetUserId.toString() === userId.toString()) return true;
    return false;
  };

  return {
    isOwner,
    isPM,
    isCreator,
    isAssignee,
    isFollower,
    roleLabel,
    canEditDetails,
    canEditDeadline,
    canChangeAssignee,
    canUpdateStatus,
    canDelete,
    canManageChecklist,
    canReportResult,
    canDuplicate,
    canMove,
    canAddSubtask,
    canAddFollower,
    canRemoveFollower,
  };
}
