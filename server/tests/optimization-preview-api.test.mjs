import mongoose from 'mongoose';
import Task from '../src/models/Task.js';
import Resource from '../src/models/Resource.js';
import Project from '../src/models/Project.js';
import OptimizationResult from '../src/models/OptimizationResult.js';
import { call, login, ok, section, summary } from './helpers.mjs';

const uri = process.env.MONGODB_URI;
if (!uri || !new URL(uri).pathname.endsWith('_test')) throw new Error('An isolated _test database is required');
await mongoose.connect(uri);
try {
  const admin = await login('admin@rao.com');
  const member = await login('nam.tran@rao.com');
  const resources = await Resource.find({ isActive: true }).limit(2).lean();
  const project = await Project.findOne();
  const task = await Task.create({ title: 'Preview transfer', project: project._id, assignee: resources[0].user,
    estimatedHours: 8, startDate: '2026-10-15', endDate: '2026-10-23', status: 'in_progress' });
  const unchangedTask = await Task.create({ title: 'Keep assignee', project: project._id, assignee: resources[1].user, estimatedHours: 4 });
  const plan = await OptimizationResult.create({ algorithm: 'genetic', status: 'completed', assignments: [
    { task: task._id, taskTitle: task.title, resource: resources[1]._id, skillMatch: 80, estimatedHours: 8 },
    { task: unchangedTask._id, taskTitle: unchangedTask.title, resource: resources[1]._id, skillMatch: 80, estimatedHours: 4 },
  ] });
  const path = `/optimization/${plan._id}`;
  section('Preview scope and freshness');
  let response = await call('GET', `${path}/preview`, { token: admin });
  ok(response.status === 200 && response.data.changedCount === 1, 'Preview computes one reassignment');
  ok((await call('GET', `${path}/preview`, { token: member })).status === 403, 'Member cannot access optimization preview');
  const other = await call('POST', '/auth/register', { body: { name: 'Other owner', email: `preview-${Date.now()}@other.test`, password: 'password123', companyName: 'Other preview company' } });
  ok((await call('GET', `${path}/preview`, { token: other.data.token })).status === 403, 'Other company cannot view preview');
  ok((await call('POST', `${path}/apply`, { token: other.data.token })).status === 403, 'Other company cannot apply proposal');
  const staleToken = response.data.previewToken;
  await Task.updateOne({ _id: task._id }, { estimatedHours: 16 });
  response = await call('POST', `${path}/apply`, { token: admin, body: { previewToken: staleToken } });
  ok(response.status === 409, 'Changed estimate rejects stale preview', response.message);
  ok(String((await Task.findById(task._id)).assignee) === String(resources[0].user), 'Rejected apply leaves assignee unchanged');
  response = await call('GET', `${path}/preview`, { token: admin });
  const freshToken = response.data.previewToken;
  ok(freshToken !== staleToken && response.data.assignments[0].estimatedHours === 16, 'Refreshed preview reflects latest estimate');
  response = await call('POST', `${path}/apply`, { token: admin, body: { previewToken: freshToken } });
  ok(response.status === 200 && response.data?.appliedCount === 1, 'Fresh reviewed proposal applies', response.message);
  ok((await Task.findById(unchangedTask._id)).updatedAt.getTime() === unchangedTask.updatedAt.getTime(), 'Unchanged assignment is not rewritten');
  ok((await OptimizationResult.findById(plan._id)).previousAssignments.length === 1, 'Rollback snapshot contains only changed assignments');
  ok(String((await Task.findById(task._id)).assignee) === String(resources[1].user), 'New assignee persisted');
  response = await call('POST', `${path}/rollback`, { token: admin });
  ok(response.status === 200 && String((await Task.findById(task._id)).assignee) === String(resources[0].user), 'Rollback restores original assignee');
  await Task.updateOne({ _id: task._id }, { status: 'done' });
  response = await call('GET', `${path}/preview`, { token: admin });
  ok(response.data?.blockedCount === 1 && !response.data.canApply, 'Completed task is marked invalid');
  ok((await call('POST', `${path}/apply`, { token: admin })).status === 409, 'Invalid plan is rejected even without a preview token');
  // A result belonging to this company must never dereference another company's task.
  await Task.updateOne({ _id: task._id }, { status: 'todo', companyName: 'Other preview company' });
  response = await call('GET', `${path}/preview`, { token: admin });
  ok(response.data?.assignments[0].issue === 'task_missing', 'Cross-company task reference is excluded from preview');
  ok((await call('POST', `${path}/apply`, { token: admin })).status === 409, 'Cross-company task reference cannot be written');
} finally { await mongoose.disconnect(); }
process.exitCode = summary() ? 1 : 0;
