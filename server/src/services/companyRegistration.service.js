const CompanySetting = require('../models/CompanySetting');
const User = require('../models/User');
const Project = require('../models/Project');
const Resource = require('../models/Resource');
const Department = require('../models/Department');
const Task = require('../models/Task');
const TaskGroup = require('../models/TaskGroup');
const RecurringTask = require('../models/RecurringTask');
const OptimizationResult = require('../models/OptimizationResult');
const WorkloadSnapshot = require('../models/WorkloadSnapshot');
const ActivityLog = require('../models/ActivityLog');
const Attachment = require('../models/Attachment');

const tenantModels = [
  User, Project, Resource, Department, Task, TaskGroup, RecurringTask,
  OptimizationResult, WorkloadSnapshot, ActivityLog, Attachment,
];

const companyExistsError = () => Object.assign(
  new Error('Công ty đã tồn tại. Vui lòng liên hệ quản trị viên của công ty để được tạo tài khoản.'),
  { statusCode: 409 },
);

/** Public registration creates a new tenant, never joins an existing one. */
async function reserveCompanyName(companyName) {
  // Null/missing legacy tenant keys belong to this reserved default company.
  if (companyName === 'Công ty Công nghệ RAO') throw companyExistsError();

  // Older tenants may not have settings yet, or may retain data after user deletion.
  const occupied = await Promise.all(tenantModels.map((model) => model.exists({ companyName })));
  if (occupied.some(Boolean)) throw companyExistsError();

  // The existing unique companyName index arbitrates concurrent signups. Await
  // initialization so a newly created database has the index before accepting one.
  await CompanySetting.init();
  try {
    return await CompanySetting.create({ companyName });
  } catch (error) {
    if (error.code === 11000) throw companyExistsError();
    throw error;
  }
}

module.exports = { reserveCompanyName };
