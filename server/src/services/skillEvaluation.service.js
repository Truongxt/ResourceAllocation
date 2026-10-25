const Resource = require('../models/Resource');
const User = require('../models/User');
const Project = require('../models/Project');
const { sendNotification } = require('./socket.service');

// Never includes the reviewer's own profile: a two-way evaluation needs a second person.
async function reviewScope(user) {
  const companyName = user.companyName || 'Công ty Công nghệ RAO';
  const notSelf = { user: { $ne: user._id } };
  if (user.role === 'admin') return { companyName, isActive: true, ...notSelf };
  const reports = await User.find({ companyName, manager: user._id }).select('_id').lean();
  const projects = await Project.find({ companyName, $or: [{ manager: user._id }, { createdBy: user._id }] }).select('members').lean();
  const users = [...reports.map((report) => report._id), ...projects.flatMap((project) => (project.members || []).map((member) => member.user))].filter(Boolean);
  return { companyName, isActive: true, ...notSelf, $or: [{ user: { $in: users } }, { createdBy: user._id }] };
}

// Keep the official level intact until a manager explicitly approves a new one.
function applyEvaluation(resource, input, actor, action, now = new Date()) {
  const skills = resource.skills.map((skill) => skill.toObject ? skill.toObject() : { ...skill });
  const changes = [];
  for (const value of input) {
    const name = value.name.trim();
    let skill = skills.find((entry) => entry.name.trim().toLowerCase() === name.toLowerCase());
    if (!skill && action === 'returned') throw new Error('Không thể trả lại kỹ năng chưa được gửi');
    const previousLevel = skill ? (skill.managerLevel ?? (skill.evaluationStatus === 'approved' ? skill.level : null)) : null;
    if (!skill) { skill = { name, level: 1, selfLevel: value.selfLevel ?? value.managerLevel ?? value.level ?? 1, yearsOfExperience: Number(value.yearsOfExperience || 0), evaluationStatus: 'draft' }; skills.push(skill); }
    if (action === 'submitted') {
      skill.selfLevel = Number(value.selfLevel);
      skill.yearsOfExperience = Number(value.yearsOfExperience || 0);
      skill.evidence = String(value.evidence || '').trim();
      skill.submittedAt = now;
      // Previously imported/approved skills also have an official level.
      if (previousLevel != null) skill.managerLevel = previousLevel;
      skill.evaluationStatus = 'self_assessed';
    } else {
      if (action === 'returned' && skill.evaluationStatus !== 'self_assessed') throw new Error('Chỉ trả lại kỹ năng đang chờ duyệt');
      skill.managerFeedback = String(value.managerFeedback || '').trim();
      skill.evaluatedAt = now;
      skill.evaluatedBy = actor._id;
      if (action === 'approved') {
        skill.level = Number(value.managerLevel ?? value.level);
        skill.managerLevel = skill.level;
        skill.evaluationStatus = 'approved';
      } else {
        if (!skill.managerFeedback) throw new Error('Cần ghi yêu cầu bổ sung cho mỗi kỹ năng trả lại');
        skill.evaluationStatus = 'returned';
      }
    }
    changes.push({ name: skill.name, previousLevel, selfLevel: skill.selfLevel,
      approvedLevel: skill.managerLevel ?? null, feedback: action === 'submitted' ? '' : skill.managerFeedback,
      evidence: skill.evidence || '' });
  }
  return { skills, history: { action, actor: actor._id, actorName: actor.name, at: now, changes } };
}

async function saveEvaluation(resource, body, actor, action) {
  const version = resource.evaluationVersion || 0;
  if (body.evaluationVersion !== undefined && Number(body.evaluationVersion) !== version) {
    const error = new Error('Bản đánh giá đã thay đổi. Vui lòng tải lại trước khi gửi.'); error.status = 409; throw error;
  }
  let update;
  try { update = applyEvaluation(resource, body.skills, actor, action); }
  catch (error) { error.status = 400; throw error; }
  const fields = { skills: update.skills };
  if (action === 'approved') {
    if (body.performanceRating !== undefined) fields.performanceRating = body.performanceRating;
    if (body.performanceNotes !== undefined) fields.performanceNotes = body.performanceNotes;
  }
  const saved = await Resource.findOneAndUpdate({ _id: resource._id,
    ...(version === 0 ? { $or: [{ evaluationVersion: 0 }, { evaluationVersion: { $exists: false } }] } : { evaluationVersion: version }),
  }, { $set: fields, $push: { skillEvaluationHistory: update.history }, $inc: { evaluationVersion: 1 } }, { new: true, runValidators: true });
  if (!saved) { const error = new Error('Có đánh giá mới hơn. Vui lòng tải lại để tránh ghi đè.'); error.status = 409; throw error; }
  return saved;
}

async function notifyEvaluation(resource, actor, action) {
  const companyName = resource.companyName || 'Công ty Công nghệ RAO';
  let recipients;
  if (action === 'submitted') {
    const candidates = await User.find({ companyName, isActive: true, role: { $in: ['admin', 'project_manager'] }, _id: { $ne: actor._id } }).select('_id name role companyName');
    recipients = [];
    for (const candidate of candidates) {
      if (await Resource.exists({ $and: [await reviewScope(candidate), { _id: resource._id }] })) recipients.push(candidate._id);
    }
  } else recipients = [resource.user];
  await Promise.all(recipients.map((recipient) => sendNotification({
    recipient, actor: actor._id, type: 'system', entityType: 'resource', entityId: resource._id,
    title: action === 'submitted' ? 'Có năng lực đang chờ duyệt' : action === 'approved' ? 'Năng lực đã được duyệt' : 'Cần bổ sung bản tự đánh giá',
    message: action === 'submitted' ? `${actor.name} vừa gửi bản tự đánh giá năng lực.` : `${actor.name} đã ${action === 'approved' ? 'duyệt' : 'yêu cầu bổ sung'} bản đánh giá của bạn. Mở để xem phản hồi.`,
    link: action === 'submitted' ? `/resources?tab=evaluations&resource=${resource._id}` : '/settings?tab=skills',
  })));
}
module.exports = { reviewScope, applyEvaluation, saveEvaluation, notifyEvaluation };
