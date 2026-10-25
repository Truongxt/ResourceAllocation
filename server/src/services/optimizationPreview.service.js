const { createHash } = require('node:crypto');
const { reportingPeriod, workloadInPeriod } = require('../analytics/workloadPeriod');

const idOf = (value) => String(value?._id || value || '');
const ACTIVE = ['todo', 'in_progress', 'review'];
const compactLoad = ({ workload, capacity, utilizationRate, noCapacity, unscheduledWorkload }) =>
  ({ workload, capacity, utilizationRate, noCapacity, unscheduledWorkload });

// Pure calculation shared by the preview endpoint and the final pre-apply check.
function buildOptimizationPreview(result, tasks, resources, now = new Date()) {
  const taskMap = new Map(tasks.map((task) => [idOf(task), task]));
  const resourceMap = new Map(resources.map((resource) => [idOf(resource), resource]));
  const byUser = new Map(resources.filter((r) => r.user).map((r) => [idOf(r.user), r]));
  const affectedUsers = new Set();
  const proposed = new Map();
  const seen = new Set();
  const assignments = (result.assignments || []).map((assignment, index) => {
    const taskId = idOf(assignment.task);
    const task = taskMap.get(taskId);
    const resource = resourceMap.get(idOf(assignment.resource));
    const currentUser = idOf(task?.assignee);
    const proposedUser = idOf(resource?.user);
    let issue = null;
    if (!task) issue = 'task_missing';
    else if (!ACTIVE.includes(task.status)) issue = 'task_closed';
    else if (!resource?.user || resource.isActive === false || resource.user.isActive === false || resource.availability === 'unavailable') issue = 'resource_unavailable';
    else if (currentUser && !byUser.has(currentUser)) issue = 'current_resource_missing';
    else if (seen.has(taskId)) issue = 'duplicate_task';
    seen.add(taskId);
    if (currentUser) affectedUsers.add(currentUser);
    if (proposedUser) affectedUsers.add(proposedUser);
    if (!issue) proposed.set(taskId, proposedUser);
    return {
      key: `${taskId}-${index}`, taskId, proposedResourceId: idOf(assignment.resource), title: task?.title || assignment.taskTitle,
      currentName: task?.assignee?.name || byUser.get(currentUser)?.user?.name || null,
      proposedName: resource?.user?.name || assignment.resourceName || null,
      change: issue ? 'invalid' : currentUser === proposedUser ? 'unchanged' : currentUser ? 'reassigned' : 'assigned',
      issue, estimatedHours: task?.estimatedHours ?? assignment.estimatedHours ?? 0,
      skillMatch: Number.isFinite(assignment.skillMatch) ? assignment.skillMatch : null,
    };
  });
  const currentWeek = reportingPeriod({}, now);
  const nextWeek = reportingPeriod({}, new Date(currentWeek.start + 7 * 86400000));
  const periods = [currentWeek, nextWeek];
  const relevantTasks = tasks.filter((task) => seen.has(idOf(task)) || affectedUsers.has(idOf(task.assignee)));
  const relevantResources = resources.filter((resource) => affectedUsers.has(idOf(resource.user)));
  const workloads = relevantResources.map((resource) => {
    const userId = idOf(resource.user);
    const before = relevantTasks.filter((task) => idOf(task.assignee) === userId);
    const after = relevantTasks.filter((task) => (proposed.get(idOf(task)) || idOf(task.assignee)) === userId);
    return {
      resourceId: idOf(resource), name: resource.user?.name || resource.position,
      periods: periods.map((period) => ({
        from: period.from, to: period.to,
        before: compactLoad(workloadInPeriod(resource, before, period)),
        after: compactLoad(workloadInPeriod(resource, after, period)),
      })),
    };
  });
  const changedCount = assignments.filter((a) => ['assigned', 'reassigned'].includes(a.change)).length;
  const blockedCount = assignments.filter((a) => a.issue).length;
  // Include the source fields that affect the review. Unrelated company work does
  // not invalidate it; an assignee, estimate, schedule or capacity change does.
  const snapshot = {
    result: idOf(result), status: result.status, isApplied: result.isApplied, assignments,
    week: currentWeek.from,
    tasks: relevantTasks.map((t) => ({ id: idOf(t), assignee: idOf(t.assignee), status: t.status,
      estimatedHours: t.estimatedHours, startDate: t.startDate, endDate: t.endDate,
      requiredSkills: t.requiredSkills, difficultyLevel: t.difficultyLevel, project: idOf(t.project), dependencies: t.dependencies })).sort((a, b) => a.id.localeCompare(b.id)),
    resources: relevantResources.map((r) => ({ id: idOf(r), user: idOf(r.user), active: r.isActive,
      maxCapacity: r.maxCapacity, fte: r.fte, leaves: r.unavailablePeriods, skills: r.skills,
      availability: r.availability, hourlyRate: r.hourlyRate })).sort((a, b) => a.id.localeCompare(b.id)),
  };
  return {
    assignments, workloads, changedCount, blockedCount,
    unchangedCount: assignments.filter((a) => a.change === 'unchanged').length,
    canApply: result.status === 'completed' && !result.isApplied && assignments.length > 0 && !blockedCount && changedCount > 0,
    previewToken: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),
  };
}

async function loadOptimizationPreview(result) {
  const Task = require('../models/Task');
  const Resource = require('../models/Resource');
  const company = result.companyName || 'Công ty Công nghệ RAO';
  const companyName = company === 'Công ty Công nghệ RAO' ? { $in: [company, null] } : company;
  const [tasks, resources] = await Promise.all([
    Task.find({ companyName, $or: [{ status: { $in: ACTIVE } }, { _id: { $in: result.assignments.map((a) => a.task).filter(Boolean) } }] })
      .select('title assignee status estimatedHours startDate endDate requiredSkills difficultyLevel project dependencies').populate('assignee', 'name').lean(),
    Resource.find({ companyName }).select('user position isActive maxCapacity fte unavailablePeriods skills availability hourlyRate')
      .populate('user', 'name isActive').lean(),
  ]);
  return buildOptimizationPreview(result, tasks, resources);
}

module.exports = { buildOptimizationPreview, loadOptimizationPreview };
