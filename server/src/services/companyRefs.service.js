/**
 * Kiểm tham chiếu chéo công ty cho những id đi trong body/query.
 *
 * Chốt `router.param('id')` và các guard theo bản ghi chỉ soi id trên URL. Mọi id
 * khác — người được giao, người theo dõi, người duyệt, quản lý, nhóm việc, việc cha,
 * phòng ban, dự án đích — thì controller phải tự kiểm, và rải `findById` + so
 * `companyName` vào từng nơi đúng bằng số lần có thể quên. Đo thật cho thấy đã quên
 * ở 41 chỗ. Các hàm ở đây trả về câu lỗi (hoặc `null` nếu hợp lệ) để controller chỉ
 * việc trả 400.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const TaskGroup = require('../models/TaskGroup');
const Department = require('../models/Department');

const DEFAULT_COMPANY = 'Công ty Công nghệ RAO';

const companyOf = (doc) => (doc && doc.companyName) || DEFAULT_COMPANY;

/**
 * Các trường KHÔNG BAO GIỜ được ghi qua body. `companyName` là khóa phân lập: ghi
 * được nó là chuyển bản ghi (hoặc chính mình) sang công ty khác.
 */
const PROTECTED_FIELDS = ['companyName', 'createdBy', '_id', '__v'];

/** Bỏ các trường được bảo vệ khỏi một object body (sửa tại chỗ, trả lại chính nó). */
const stripProtected = (body) => {
  if (body && typeof body === 'object') {
    PROTECTED_FIELDS.forEach((field) => delete body[field]);
  }
  return body;
};

const idOf = (value) => String((value && value._id) || value);
const toIdList = (value) =>
  (Array.isArray(value) ? value : [value])
    .filter((v) => v !== undefined && v !== null && v !== '')
    .map(idOf);

/** Mọi người dùng trong `ids` phải tồn tại và thuộc `company`. */
const usersError = async (ids, company) => {
  const list = [...new Set(toIdList(ids))];
  if (!list.length) return null;
  if (list.some((id) => !mongoose.Types.ObjectId.isValid(id))) return 'Id người dùng không hợp lệ';
  const found = await User.find({ _id: { $in: list } }).select('companyName');
  if (found.length !== list.length) return 'Có người dùng không tồn tại';
  if (found.some((u) => companyOf(u) !== company)) return 'Không thể gán người dùng của công ty khác';
  return null;
};

/** Dự án phải tồn tại và thuộc `company`. Trả `{ error, project }`. */
const projectRef = async (id, company) => {
  if (!mongoose.Types.ObjectId.isValid(idOf(id))) return { error: 'Id dự án không hợp lệ' };
  const project = await Project.findById(idOf(id));
  if (!project) return { error: 'Không tìm thấy dự án', status: 404 };
  if (companyOf(project) !== company) return { error: 'Không thể dùng dự án của công ty khác', status: 403 };
  return { project };
};

/** Nhóm việc phải thuộc đúng dự án `projectId`. */
const taskGroupError = async (groupId, projectId) => {
  if (!groupId) return null;
  if (!mongoose.Types.ObjectId.isValid(idOf(groupId))) return 'Id nhóm công việc không hợp lệ';
  const group = await TaskGroup.findById(idOf(groupId)).select('project');
  if (!group || idOf(group.project) !== idOf(projectId)) return 'Nhóm công việc không thuộc dự án này';
  return null;
};

/** Việc cha phải thuộc đúng dự án `projectId`. */
const parentTaskError = async (parentId, projectId) => {
  if (!parentId) return null;
  if (!mongoose.Types.ObjectId.isValid(idOf(parentId))) return 'Id công việc cha không hợp lệ';
  const parent = await Task.findById(idOf(parentId)).select('project');
  if (!parent || idOf(parent.project) !== idOf(projectId)) return 'Công việc cha không thuộc dự án này';
  return null;
};

/** Phòng ban phải tồn tại và thuộc `company`. */
const departmentError = async (deptId, company) => {
  if (!deptId) return null;
  if (!mongoose.Types.ObjectId.isValid(idOf(deptId))) return 'Id phòng ban không hợp lệ';
  const dept = await Department.findById(idOf(deptId)).select('companyName');
  if (!dept || companyOf(dept) !== company) return 'Phòng ban không thuộc công ty này';
  return null;
};

/**
 * Kiểm các tham chiếu thường gặp của một công việc trong `projectId`.
 * Chỉ kiểm trường nào có mặt trong `fields` (cho phép dùng cho cả tạo lẫn sửa).
 */
const taskRefsError = async (fields, { projectId, company }) => {
  // Trần số người theo dõi kiểm TRƯỚC, để lý do từ chối vẫn là "vượt trần" chứ không
  // bị che bởi bước tra người dùng phía sau
  if (Array.isArray(fields.followers) && fields.followers.length > Task.MAX_FOLLOWERS) {
    return `Tối đa ${Task.MAX_FOLLOWERS} người theo dõi trên một công việc`;
  }
  const users = [];
  if (fields.assignee) users.push(fields.assignee);
  if (Array.isArray(fields.followers)) users.push(...fields.followers);
  if (Array.isArray(fields.reviewers)) users.push(...fields.reviewers);
  return (
    (await usersError(users, company)) ||
    (await taskGroupError(fields.taskGroup, projectId)) ||
    (await parentTaskError(fields.parentTask, projectId))
  );
};

module.exports = {
  DEFAULT_COMPANY,
  PROTECTED_FIELDS,
  companyOf,
  stripProtected,
  usersError,
  projectRef,
  taskGroupError,
  parentTaskError,
  departmentError,
  taskRefsError,
};
