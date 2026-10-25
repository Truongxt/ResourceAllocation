import test from 'node:test';
import assert from 'node:assert/strict';
import preview from '../src/services/optimizationPreview.service.js';
const { buildOptimizationPreview: build } = preview;
const now = new Date('2026-10-17T08:00:00Z');
const resources = [
  { _id: 'r1', user: { _id: 'u1', name: 'Lan' }, maxCapacity: 40, fte: 1, isActive: true },
  { _id: 'r2', user: { _id: 'u2', name: 'Nem' }, maxCapacity: 40, fte: 0.5, isActive: true },
];
const task = { _id: 't1', title: 'Build app', assignee: 'u1', estimatedHours: 8, startDate: '2026-10-15', endDate: '2026-10-23', status: 'review' };
const result = { _id: 'plan', status: 'completed', assignments: [{ task: 't1', resource: 'r2', skillMatch: 75 }] };
const calculate = (tasks = [task], people = resources, plan = result) => build(plan, tasks, people, now);

test('a move removes hours from the old assignee and adds them to the new one in both weeks', () => {
  const value = calculate();
  assert.equal(value.changedCount, 1);
  assert.equal(value.canApply, true);
  assert.equal(value.assignments[0].change, 'reassigned');
  assert.equal(value.workloads[0].periods[0].before.workload, 2.29);
  assert.equal(value.workloads[0].periods[0].after.workload, 0);
  assert.equal(value.workloads[1].periods[0].after.workload, 2.29);
  assert.equal(value.workloads[1].periods[1].after.workload, 5.71);
  assert.equal(value.workloads[1].periods[0].after.capacity, 20);
});
test('includes other commitments, keeps unscheduled work separate and accounts for leave', () => {
  const extra = { ...task, _id: 'other', assignee: 'u2', estimatedHours: 35, startDate: '2026-10-12', endDate: '2026-10-16' };
  const missing = { ...extra, _id: 'unscheduled', startDate: null, estimatedHours: 10 };
  const people = [resources[0], { ...resources[1], unavailablePeriods: [{ startDate: '2026-10-14', endDate: '2026-10-14' }] }];
  const value = calculate([task, extra, missing, { ...extra, _id: 'done', status: 'done' }], people);
  const load = value.workloads[1].periods[0];
  assert.equal(load.before.workload, 35);
  assert.equal(load.after.workload, 37.29);
  assert.equal(load.after.capacity, 16);
  assert.equal(load.after.unscheduledWorkload, 10);
});
test('distinguishes unassigned work, no changes and unavailable resources', () => {
  assert.equal(calculate([{ ...task, assignee: null }]).assignments[0].change, 'assigned');
  assert.equal(calculate([{ ...task, assignee: 'u2' }]).canApply, false);
  assert.equal(calculate([{ ...task, assignee: 'u2' }]).unchangedCount, 1);
  assert.equal(calculate([task], [resources[0], { ...resources[1], isActive: false }]).blockedCount, 1);
  assert.equal(calculate([task], [resources[0], { ...resources[1], availability: 'unavailable' }]).blockedCount, 1);
  assert.equal(calculate([task], [resources[0], { ...resources[1], fte: 0 }]).workloads[1].periods[0].after.noCapacity, true);
});
test('missing, closed or duplicate tasks prevent application', () => {
  assert.equal(calculate([]).assignments[0].issue, 'task_missing');
  assert.equal(calculate([{ ...task, status: 'done' }]).assignments[0].issue, 'task_closed');
  assert.equal(calculate([task], resources, { ...result, assignments: [...result.assignments, ...result.assignments] }).canApply, false);
  assert.equal(calculate([task], resources, { ...result, status: 'failed' }).canApply, false);
});
test('freshness token changes for relevant estimates, schedules, assignments and capacity', () => {
  const token = calculate().previewToken;
  for (const update of [{ estimatedHours: 12 }, { endDate: '2026-10-24' }, { assignee: 'u2' }, { requiredSkills: [{ name: 'React', level: 4 }] }]) {
    assert.notEqual(calculate([{ ...task, ...update }]).previewToken, token);
  }
  assert.notEqual(calculate([task], [resources[0], { ...resources[1], fte: 0 }]).previewToken, token);
  assert.notEqual(calculate([task, { ...task, _id: 'another', assignee: 'u2' }]).previewToken, token);
  assert.equal(calculate([task], [...resources].reverse()).previewToken, token);
  assert.equal(calculate([task, { ...task, _id: 'unrelated', assignee: 'u3' }]).previewToken, token);
});
