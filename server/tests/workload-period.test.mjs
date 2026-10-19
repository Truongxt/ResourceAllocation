import test from 'node:test';
import assert from 'node:assert/strict';
import periodModule from '../src/analytics/workloadPeriod.js';
import evaluation from '../src/services/skillEvaluation.service.js';
import scoring from '../src/algorithms/scoring.js';
const { reportingPeriod, workloadInPeriod, calendarDay } = periodModule;
const period = reportingPeriod({ from: '2026-10-12', to: '2026-10-18' });
const task = { _id: 'task1', title: 'Build', status: 'in_progress', estimatedHours: 80, startDate: '2026-10-12', endDate: '2026-10-23' };

test('same period, FTE, leave and task contribution agree', () => {
  const result = workloadInPeriod({ maxCapacity: 40, fte: 0.5, unavailablePeriods: [{ startDate: '2026-10-14', endDate: '2026-10-14' }] }, [task], period);
  assert.equal(result.workload, 40); assert.equal(result.capacity, 16);
  assert.equal(result.utilizationRate, 250); assert.equal(result.breakdown[0].periodDays, 5);
  assert.equal(result.breakdown[0].workingDays, 10);
  const nextOnly = { ...task, startDate: '2026-10-19', endDate: '2026-10-23' };
  assert.equal(workloadInPeriod({}, [nextOnly], period).workload, 0);
});
test('zero FTE stays zero; unscheduled and completed work are separated', () => {
  assert.equal(scoring.capacityOf({ maxCapacity: 40, fte: 0 }), 0);
  assert.equal(scoring.capacityOf({ maxCapacity: 0, fte: 1 }), 0);
  const result = workloadInPeriod({ maxCapacity: 40, fte: 0 }, [task, { ...task, startDate: null }, { ...task, status: 'done' }], period);
  assert.equal(result.capacity, 0); assert.equal(result.noCapacity, true);
  assert.equal(result.workload, 40); assert.equal(result.unscheduledWorkload, 80);
});
test('weekend-only work has hours but no normal capacity', () => {
  const weekend = reportingPeriod({ from: '2026-10-17', to: '2026-10-18' });
  const result = workloadInPeriod({}, [{ ...task, startDate: weekend.from, endDate: weekend.to, estimatedHours: 8 }], weekend);
  assert.equal(result.workload, 8); assert.equal(result.capacity, 0);
});
test('Vietnam dates and invalid ranges', () => {
  assert.equal(calendarDay('2026-10-11T18:00:00Z'), calendarDay('2026-10-12'));
  assert.equal(reportingPeriod({}, new Date('2026-10-11T18:00:00Z')).from, '2026-10-12');
  for (const query of [{ from: '2026-02-30', to: '2026-03-02' }, { from: '2026-10-12' }, { from: '2026-10-18', to: '2026-10-12' }, { from: '2025-01-01', to: '2026-10-12' }]) assert.throws(() => reportingPeriod(query));
});
test('return and resubmission preserve approved level and record evidence/history', () => {
  const actor = { _id: 'user', name: 'Manager' };
  const original = { skills: [{ name: 'React', level: 2, evaluationStatus: 'approved' }] };
  const submitted = evaluation.applyEvaluation(original, [{ name: 'React', selfLevel: 4, evidence: 'Module A' }], actor, 'submitted');
  assert.equal(submitted.skills[0].managerLevel, 2);
  const returned = evaluation.applyEvaluation(submitted, [{ name: 'React', managerFeedback: 'Cần kết quả kiểm thử' }], actor, 'returned');
  assert.equal(returned.skills[0].level, 2); assert.equal(returned.skills[0].evaluationStatus, 'returned');
  const resubmitted = evaluation.applyEvaluation(returned, [{ name: 'React', selfLevel: 4, evidence: 'Module A + test report' }], actor, 'submitted');
  const approved = evaluation.applyEvaluation(resubmitted, [{ name: 'React', level: 3 }], actor, 'approved');
  assert.equal(approved.skills[0].level, 3);
  assert.equal(approved.history.changes[0].previousLevel, 2);
  assert.equal(approved.history.changes[0].approvedLevel, 3);
  assert.equal(approved.history.changes[0].evidence, 'Module A + test report');
  assert.throws(() => evaluation.applyEvaluation(submitted, [{ name: 'React', managerFeedback: '' }], actor, 'returned'));
});
