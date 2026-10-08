/**
 * Vòng đời dự án: lưu trữ, mẫu, nhân bản.
 *
 * - Lưu trữ: ẩn khỏi danh sách mặc định và CHỈ ĐỌC. Chỉ lưu trữ được khi không còn
 *   việc mở và không còn việc lặp lại đang bật, nên tải nhân sự không đổi ngầm.
 * - Mẫu (`isTemplate`): nằm ngoài mọi tính toán; việc trong mẫu không có người thực hiện.
 */

const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const RecurringTask = require('../models/RecurringTask');
const TaskGroup = require('../models/TaskGroup');

const OPEN_STATUSES = ['todo', 'in_progress', 'review', 'blocked'];

const ARCHIVED_MESSAGE = 'Dự án đã lưu trữ — mở lại để chỉnh sửa';

/**
 * Id các dự án không hoạt động (mẫu, và lưu trữ nếu `includeArchived`) trong một phạm
 * vi công ty. Dùng để loại việc của chúng khỏi danh sách, thống kê và tối ưu bằng
 * `project: { $nin: ids }` — thay vì rải điều kiện ra từng truy vấn.
 */
const inactiveProjectIds = async (companyName, { includeArchived = true } = {}) => {
  const lifecycle = includeArchived
    ? [{ isTemplate: true }, { isArchived: true }]
    : [{ isTemplate: true }];
  return Project.find({ companyName, $or: lifecycle }).distinct('_id');
};

/** Lý do chưa lưu trữ được dự án, hoặc `null` nếu được. */
const archiveBlocker = async (projectId) => {
  const [openTasks, activeRecurring] = await Promise.all([
    Task.countDocuments({ project: projectId, status: { $in: OPEN_STATUSES } }),
    RecurringTask.countDocuments({ project: projectId, isActive: true }),
  ]);
  if (openTasks > 0) {
    return `Còn ${openTasks} công việc chưa đóng (cần làm, đang làm, chờ duyệt hoặc bị chặn). Hãy hoàn thành, đánh dấu thất bại hoặc chuyển chúng đi trước khi lưu trữ.`;
  }
  if (activeRecurring > 0) {
    return `Còn ${activeRecurring} cấu hình việc lặp lại đang bật — chúng sẽ tiếp tục sinh việc mới vào dự án. Hãy tắt hoặc xóa trước khi lưu trữ.`;
  }
  return null;
};

/**
 * Lý do không đặt được một công việc vào dự án này, hoặc `null`. Áp cho MỌI vai —
 * khác `createDeniedReason`, vốn cho admin/PM đi thẳng qua — vì đây là luật của dự án
 * chứ không phải quyền của người gọi. Dùng ở tạo mới, việc con, chuyển, nhân bản, sửa.
 *
 * @returns {{ status: number, message: string } | null}
 */
const placementError = (project, { assignee } = {}) => {
  if (project?.isArchived) return { status: 409, message: ARCHIVED_MESSAGE };
  if (project?.isTemplate && assignee) {
    return { status: 400, message: 'Việc trong dự án mẫu không có người thực hiện — người được chọn khi tạo dự án từ mẫu' };
  }
  return null;
};

/**
 * Nhân bản một dự án: dự án mới, nhóm việc, công việc và việc con.
 *
 * - Mọi ngày dời theo `startDate` mới, giữ khoảng cách tương đối. Không truyền thì
 *   giữ nguyên ngày.
 * - Giữ cấu trúc (nhóm, việc con, phụ thuộc, checklist) và nội dung (mô tả, giờ ước
 *   tính, kỹ năng, ưu tiên). Trạng thái về `todo`, tiến độ về 0.
 * - **Bỏ người**: không người thực hiện, không người theo dõi, không người đánh giá
 *   riêng — thuật toán tối ưu sẽ phân công lại.
 * - Thành viên dự án chỉ giữ khi nhân bản dự án thường thành dự án thường: tối ưu
 *   dùng thành viên làm tập nhân sự. Mẫu không có thành viên.
 *
 * Id mới được cấp TRƯỚC khi ghi, nên việc con và phụ thuộc trỏ sang bản sao ngay
 * trong một lần `insertMany`, không cần lượt sửa thứ hai.
 */
const cloneProject = async (source, { name, code, startDate, asTemplate = false, user }) => {
  const shiftMs = startDate && source.startDate ? new Date(startDate).getTime() - source.startDate.getTime() : 0;
  const shift = (d) => (d ? new Date(new Date(d).getTime() + shiftMs) : d);
  const peopleless = asTemplate || source.isTemplate;

  const project = await Project.create({
    name,
    code: code || undefined,
    description: source.description,
    priority: source.priority,
    kind: source.kind,
    projectType: source.projectType,
    department: source.department,
    color: source.color,
    tags: source.tags,
    budget: source.budget,
    startDate: shift(source.startDate),
    ...(source.endDate ? { endDate: shift(source.endDate) } : {}),
    status: 'planning',
    progress: 0,
    manager: peopleless ? user._id : source.manager,
    members: peopleless ? [] : source.members.map((m) => ({ user: m.user, role: m.role, allocation: m.allocation })),
    permissions: source.permissions,
    failureConfig: source.failureConfig,
    reviewConfig: { ...(source.reviewConfig?.toObject?.() || source.reviewConfig || {}), reviewers: peopleless ? [] : source.reviewConfig?.reviewers || [] },
    isTemplate: Boolean(asTemplate),
    companyName: source.companyName,
    createdBy: user._id,
  });

  const groups = await TaskGroup.find({ project: source._id }).sort('order');
  const groupMap = new Map();
  if (groups.length) {
    const created = await TaskGroup.insertMany(groups.map((g) => ({
      name: g.name, color: g.color, order: g.order, isOpen: g.isOpen,
      project: project._id, companyName: source.companyName, createdBy: user._id,
    })));
    groups.forEach((g, i) => groupMap.set(String(g._id), created[i]._id));
  }

  const tasks = await Task.find({ project: source._id });
  const idMap = new Map(tasks.map((t) => [String(t._id), new mongoose.Types.ObjectId()]));
  const remap = (id) => (id ? idMap.get(String(id)) || null : null);

  if (tasks.length) {
    await Task.insertMany(tasks.map((t) => ({
      _id: idMap.get(String(t._id)),
      title: t.title,
      description: t.description,
      project: project._id,
      taskGroup: t.taskGroup ? groupMap.get(String(t.taskGroup)) || null : null,
      parentTask: remap(t.parentTask),
      priority: t.priority,
      difficulty: t.difficulty,
      difficultyLevel: t.difficultyLevel,
      startDate: shift(t.startDate),
      endDate: shift(t.endDate),
      estimatedHours: t.estimatedHours,
      requiredSkills: t.requiredSkills,
      checklist: (t.checklist || []).map((c) => ({ title: c.title, isCompleted: false, order: c.order })),
      // Phụ thuộc trỏ ra ngoài dự án (không có trong idMap) thì bỏ, không trỏ về bản gốc.
      dependencies: (t.dependencies || [])
        .map((d) => ({ task: remap(d.task), type: d.type }))
        .filter((d) => d.task),
      status: 'todo',
      progress: 0,
      assignee: null,
      followers: [],
      companyName: source.companyName,
      createdBy: user._id,
    })));
  }

  return { project, groupCount: groups.length, taskCount: tasks.length };
};

module.exports = {
  OPEN_STATUSES,
  ARCHIVED_MESSAGE,
  placementError,
  cloneProject,
  inactiveProjectIds,
  archiveBlocker,
};
