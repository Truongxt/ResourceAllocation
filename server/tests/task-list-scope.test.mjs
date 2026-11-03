// HTTP regressions for task-list permissions. Fixtures use the real test database,
// including stale cross-company references that today's write APIs would reject.
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Project from '../src/models/Project.js';
import Task from '../src/models/Task.js';
import { call, login, ok, section, summary } from './helpers.mjs';

const uri = process.env.MONGODB_URI;
if (!uri || !new URL(uri).pathname.endsWith('_test')) throw new Error('An isolated _test database is required');

const stamp = new mongoose.Types.ObjectId().toString();
const marker = `task-list-scope-${stamp}`;
const company = `Task list A ${stamp}`;
const otherCompany = `Task list B ${stamp}`;
const defaultCompany = 'Công ty Công nghệ RAO';
const now = new Date();
const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const startDate = new Date(endDate);
startDate.setDate(startDate.getDate() - 2);
const dates = { from: startDate.toISOString(), to: endDate.toISOString() };
const later = new Date(endDate);
later.setDate(later.getDate() + 2);
const noOverlap = { from: later.toISOString(), to: later.toISOString() };

const users = {};
const projects = {};
const tasks = {};
const fixtureIds = { users: [], projects: [], tasks: [] };
const id = (value) => String(value?._id || value);
const newId = (kind) => {
  const value = new mongoose.Types.ObjectId();
  fixtureIds[kind].push(value);
  return value;
};
const makeUser = async (key, extra = {}) => {
  users[key] = await User.create({
    _id: newId('users'), name: `Task list ${key}`, email: `${marker}-${key}@example.test`,
    password: 'password123', companyName: company, ...extra,
  });
};
const makeProject = async (key, extra = {}) => {
  projects[key] = await Project.create({
    _id: newId('projects'), name: `${marker} ${key}`, companyName: company,
    manager: users.peer._id, createdBy: users.peer._id, projectType: 'client',
    startDate, endDate, ...extra,
  });
};
const makeTask = async (key, project, extra = {}) => {
  tasks[key] = await Task.create({
    _id: newId('tasks'), title: `${marker} ${key}`, project: projects[project]._id,
    companyName: projects[project].companyName || defaultCompany,
    assignee: users.peer._id, createdBy: users.peer._id, startDate, endDate, ...extra,
  });
};

// Permission expectations are explicit fixture keys; optional filters only narrow them.
const checkList = async (token, label, query, expectedKeys, { total = expectedKeys.length } = {}) => {
  const params = new URLSearchParams({ limit: '50', ...query });
  const response = await call('GET', `/tasks?${params}`, { token });
  const rows = response.data?.tasks;
  const expected = expectedKeys.map((key) => id(tasks[key])).sort();
  const actual = Array.isArray(rows) ? rows.map(id).sort() : [];
  const detail = `status=${response.status}, count=${response.count}, total=${response.total}, expected=${expectedKeys.join(',')}`;
  ok(response.status === 200 && response.success === true && Array.isArray(rows), `${label}: HTTP success`, detail);
  ok(JSON.stringify(actual) === JSON.stringify(expected), `${label}: exact task IDs`, detail);
  ok(response.count === expectedKeys.length && response.count === rows?.length && response.total === total,
    `${label}: count and total`, detail);
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 50);
  ok(response.pagination?.page === page && response.pagination?.limit === limit &&
    response.pagination?.pages === (Math.ceil(total / limit) || 1), `${label}: pagination`, detail);
};

const checkSummary = async (token, label, query, expectedKeys) => {
  const response = await call('GET', `/tasks/stats/summary?${new URLSearchParams(query)}`, { token });
  const expectedTasks = expectedKeys.map((key) => tasks[key]);
  const sum = (field) => expectedTasks.reduce((total, task) => total + task[field], 0);
  const groups = (field) => {
    const counts = new Map();
    for (const task of expectedTasks) counts.set(task[field], (counts.get(task[field]) || 0) + 1);
    return [...counts].sort(([a], [b]) => a.localeCompare(b));
  };
  const actualGroups = (rows) => Array.isArray(rows)
    ? rows.map((row) => [row._id, row.count]).sort(([a], [b]) => String(a).localeCompare(String(b)))
    : null;
  const data = response.data;
  const detail = `status=${response.status}, totals=${JSON.stringify(data?.totals)}, expected=${expectedKeys.join(',')}`;
  ok(response.status === 200 && response.success === true, `${label}: HTTP success`, detail);
  ok(data?.totals?.totalTasks === expectedKeys.length, `${label}: authorized task count`, detail);
  ok(JSON.stringify(actualGroups(data?.byStatus)) === JSON.stringify(groups('status')),
    `${label}: exact status breakdown`, JSON.stringify(data?.byStatus));
  ok(JSON.stringify(actualGroups(data?.byPriority)) === JSON.stringify(groups('priority')),
    `${label}: exact priority breakdown`, JSON.stringify(data?.byPriority));
  ok(data?.totals?.totalEstimatedHours === sum('estimatedHours'), `${label}: estimated hours`, detail);
  ok(data?.totals?.totalActualHours === sum('actualHours'), `${label}: actual hours`, detail);
  ok(data?.totals?.averageProgress === (expectedTasks.length ? sum('progress') / expectedTasks.length : 0),
    `${label}: average progress`, detail);
};

await mongoose.connect(uri);
try {
  section('Task list scope: real database fixtures and HTTP login');
  await makeUser('actor');
  await makeUser('peer');
  await makeUser('sub1', { manager: users.actor._id });
  await makeUser('sub2', { manager: users.actor._id });
  await makeUser('admin', { role: 'admin' });
  await makeUser('owner', { role: 'member', isOwner: true });
  await makeUser('foreignSub', { companyName: otherCompany, manager: users.actor._id });
  await makeUser('legacy', { companyName: defaultCompany });
  await makeUser('legacySub', { companyName: defaultCompany, manager: users.legacy._id });

  await makeProject('internal', { projectType: 'internal' });
  await makeProject('member', { members: [{ user: users.actor._id }] });
  await makeProject('managed', { manager: users.actor._id });
  await makeProject('created', { createdBy: users.actor._id });
  await makeProject('private');
  await makeProject('foreign', {
    companyName: otherCompany, projectType: 'internal', manager: users.foreignSub._id,
    members: [{ user: users.actor._id }], createdBy: users.actor._id,
  });
  await makeProject('legacyNull', { companyName: null, manager: users.legacy._id });
  await makeProject('legacyMissing', { companyName: defaultCompany, manager: users.legacy._id });
  // Bypass schema defaults only to represent an actual pre-companyName project.
  await Project.collection.updateOne({ _id: projects.legacyMissing._id }, { $unset: { companyName: '' } });
  const legacyRows = await Project.collection.find({
    _id: { $in: [projects.legacyNull._id, projects.legacyMissing._id] },
  }).toArray();
  ok(legacyRows.some((p) => p.companyName === null) && legacyRows.some((p) => !('companyName' in p)),
    'Legacy fixtures really have null and missing project companyName');

  await makeTask('internal', 'internal', { description: `description-only ${marker}` });
  await makeTask('member', 'member');
  await makeTask('managed', 'managed');
  await makeTask('created', 'created');
  await makeTask('privateSelf', 'private', { assignee: users.actor._id });
  await makeTask('privateCreated', 'private', { createdBy: users.actor._id });
  await makeTask('privateFollowing', 'private', { followers: [users.actor._id] });
  await makeTask('privateSub1', 'private', { assignee: users.sub1._id });
  await makeTask('privateSub2', 'private', { assignee: users.sub2._id });
  await makeTask('privateHidden', 'private', { description: `description-only ${marker}` });
  await makeTask('privateUnassigned', 'private', { assignee: null });
  await makeTask('privateCreatedUnassigned', 'private', {
    assignee: null, createdBy: users.actor._id, followers: [users.actor._id],
  });
  await makeTask('privateDoneUnassigned', 'private', {
    assignee: null, createdBy: users.actor._id, followers: [users.actor._id], status: 'done',
  });
  await makeTask('internalSelf', 'internal', {
    assignee: users.actor._id, createdBy: users.actor._id, followers: [users.actor._id],
  });
  await makeTask('internalSub', 'internal', { assignee: users.sub1._id, followers: [users.actor._id] });
  await makeTask('internalUnassigned', 'internal', { assignee: null });
  await makeTask('internalDone', 'internal', { assignee: null, status: 'done' });

  // These match each personal scope, but the project is in another tenant. A stale
  // task.companyName is deliberately not a substitute for the project boundary.
  await makeTask('foreignSelf', 'foreign', {
    companyName: company, assignee: users.actor._id, description: `description-only ${marker}`,
  });
  await makeTask('foreignCreated', 'foreign', { createdBy: users.actor._id });
  await makeTask('foreignFollowing', 'foreign', { followers: [users.actor._id] });
  await makeTask('foreignLocalSub', 'foreign', { assignee: users.sub1._id });
  await makeTask('foreignSub', 'foreign', { assignee: users.foreignSub._id });
  await makeTask('foreignUnassigned', 'foreign', {
    assignee: null, createdBy: users.actor._id, followers: [users.actor._id],
  });
  await makeTask('foreignLegacySelf', 'foreign', {
    assignee: users.legacy._id, createdBy: users.legacy._id, followers: [users.legacy._id],
  });
  await makeTask('foreignLegacySub', 'foreign', {
    assignee: users.legacySub._id, createdBy: users.legacy._id, followers: [users.legacy._id],
  });
  for (const key of ['admin', 'owner']) {
    await makeTask(`${key}Self`, 'internal', {
      assignee: users[key]._id, createdBy: users[key]._id, followers: [users[key]._id],
    });
    await makeTask(`foreign${key}`, 'foreign', {
      assignee: users[key]._id, createdBy: users[key]._id, followers: [users[key]._id],
    });
  }
  for (const project of ['legacyNull', 'legacyMissing']) {
    await makeTask(`${project}Self`, project, {
      assignee: users.legacy._id, createdBy: users.legacy._id, followers: [users.legacy._id],
    });
    await makeTask(`${project}Sub`, project, {
      assignee: users.legacySub._id, createdBy: users.legacy._id, followers: [users.legacy._id],
    });
  }

  const tokens = {};
  for (const key of ['actor', 'admin', 'owner', 'legacy']) {
    tokens[key] = await login(users[key].email);
    ok(!!tokens[key], `${key} logs in over HTTP`);
    if (!tokens[key]) throw new Error(`Task-list fixture login failed: ${key}`);
  }

  const visible = {
    all: ['internal', 'member', 'managed', 'created', 'privateSelf', 'privateCreated',
      'privateCreatedUnassigned', 'privateDoneUnassigned', 'internalSelf', 'internalSub',
      'internalUnassigned', 'internalDone', 'adminSelf', 'ownerSelf'],
    my_tasks: ['privateSelf', 'internalSelf'],
    assigned_by_me: ['privateCreated', 'privateCreatedUnassigned', 'privateDoneUnassigned', 'internalSelf'],
    following: ['privateFollowing', 'privateCreatedUnassigned', 'privateDoneUnassigned', 'internalSelf', 'internalSub'],
    subordinates: ['privateSub1', 'privateSub2', 'internalSub'],
  };
  const inProject = (keys, project) => keys.filter((key) => id(tasks[key].project) === id(projects[project]));
  const assignedTo = (keys, user) => keys.filter((key) => id(tasks[key].assignee) === id(users[user]));
  const unassigned = (keys) => keys.filter((key) => !tasks[key].assignee && tasks[key].status !== 'done');

  section('Every personal scope stays in the tenant and optional filters only narrow');
  for (const [scope, keys] of Object.entries(visible)) {
    const privateKeys = inProject(keys, 'private');
    const variants = [
      ['baseline', {}, keys],
      ['date overlap', dates, keys],
      ['inclusive overlap boundary', { from: dates.to, to: dates.to }, keys],
      ['non-overlapping dates', noOverlap, []],
      ['search', { search: marker }, keys],
      ['dates + search', { ...dates, search: marker }, keys],
      ['today', { timeFilter: 'today' }, keys],
      ['this week + dates', { timeFilter: 'this_week', ...dates }, keys],
      ['overdue + search', { timeFilter: 'overdue', search: marker }, keys.filter((key) => tasks[key].status !== 'done')],
      ['done + dates', { timeFilter: 'done', ...dates }, keys.filter((key) => tasks[key].status === 'done')],
      ['accessible project', { project: id(projects.member) }, inProject(keys, 'member')],
      ['private project', { project: id(projects.private) }, privateKeys],
      ['private project + dates + search', { project: id(projects.private), ...dates, search: marker }, privateKeys],
      ['self assignee', { assignee: id(users.actor) }, assignedTo(keys, 'actor')],
      ['subordinate assignee', { assignee: id(users.sub1), ...dates, search: marker }, assignedTo(keys, 'sub1')],
      ['unrelated assignee', { assignee: id(users.peer), ...dates, search: marker }, assignedTo(keys, 'peer')],
      ['private project + unrelated assignee', { project: id(projects.private), assignee: id(users.peer), ...dates, search: marker }, assignedTo(privateKeys, 'peer')],
      ['unassigned', { unassigned: 'true' }, unassigned(keys)],
      ['unassigned + dates + search', { unassigned: 'true', ...dates, search: marker }, unassigned(keys)],
      ['private project + unassigned', { project: id(projects.private), unassigned: 'true', ...dates, search: marker }, unassigned(privateKeys)],
      ['assignee + unassigned is an intersection', { assignee: id(users.actor), unassigned: 'true', ...dates }, []],
      ['foreign search', { search: `${marker} foreign` }, []],
      ['foreign search + dates', { search: `${marker} foreign`, ...dates }, []],
      ['foreign subordinate + dates', { assignee: id(users.foreignSub), ...dates, search: marker }, []],
      ['foreign project', { project: id(projects.foreign) }, []],
      ['foreign project + dates + search', { project: id(projects.foreign), ...dates, search: marker }, []],
      ['foreign project + assignee', { project: id(projects.foreign), assignee: id(users.actor), ...dates, search: marker }, []],
      ['foreign project + unassigned', { project: id(projects.foreign), unassigned: 'true', ...dates, search: marker }, []],
      ['private hidden search', { search: tasks.privateHidden.title }, []],
      ['private hidden project + dates + assignee', { project: id(projects.private), search: tasks.privateHidden.title, assignee: id(users.peer), ...dates }, []],
      ['private hidden unassigned', { project: id(projects.private), search: tasks.privateUnassigned.title, unassigned: 'true', ...dates }, []],
    ];
    for (const [label, query, expected] of variants) {
      await checkList(tokens.actor, `${scope}: ${label}`, { scope, ...query }, expected);
    }
  }
  await checkList(tokens.actor, 'Default scope is all', {}, visible.all);
  await checkList(tokens.actor, 'Description search still intersects access', {
    search: `description-only ${marker}`, ...dates,
  }, ['internal']);
  await checkList(tokens.actor, 'Description search cannot open a private project', {
    project: id(projects.private), search: `description-only ${marker}`, ...dates,
  }, []);

  section('Pagination totals count only authorized tasks, before pagination');
  for (const [scope, keys] of Object.entries(visible)) {
    const ordered = [...keys].sort((a, b) => id(tasks[a]).localeCompare(id(tasks[b])));
    await checkList(tokens.actor, `${scope}: second page`, {
      scope, ...dates, search: marker, sort: '_id', page: '2', limit: '1',
    }, ordered.slice(1, 2), { total: keys.length });
  }

  section('Admin and owner access stays company-bound with every scope');
  const allOwnKeys = [
    ...visible.all, 'privateFollowing', 'privateSub1', 'privateSub2', 'privateHidden', 'privateUnassigned',
  ];
  for (const role of ['admin', 'owner']) {
    await checkList(tokens[role], `${role}: all company tasks`, { scope: 'all', ...dates, search: marker }, allOwnKeys);
    await checkList(tokens[role], `${role}: private project allowed`, {
      project: id(projects.private), ...dates, search: marker,
    }, inProject(allOwnKeys, 'private'));
    for (const scope of Object.keys(visible)) {
      const expected = scope === 'all' ? allOwnKeys : scope === 'subordinates' ? [] : [`${role}Self`];
      await checkList(tokens[role], `${role}/${scope}: tenant intersection`, { scope, ...dates, search: marker }, expected);
      await checkList(tokens[role], `${role}/${scope}: foreign search`, { scope, ...dates, search: `${marker} foreign` }, []);
      await checkList(tokens[role], `${role}/${scope}: foreign project`, { scope, project: id(projects.foreign), ...dates, search: marker }, []);
    }
  }

  section('Default company retains null/missing project companyName, without foreign tasks');
  const legacySelf = ['legacyNullSelf', 'legacyMissingSelf'];
  const legacySubs = ['legacyNullSub', 'legacyMissingSub'];
  for (const scope of Object.keys(visible)) {
    const expected = scope === 'my_tasks' ? legacySelf : scope === 'subordinates' ? legacySubs : [...legacySelf, ...legacySubs];
    await checkList(tokens.legacy, `legacy/${scope}: null and missing projects`, { scope, search: marker }, expected);
    await checkList(tokens.legacy, `legacy/${scope}: dates do not remove personal scope`, { scope, search: marker, ...dates }, expected);
    for (const project of ['legacyNull', 'legacyMissing']) {
      await checkList(tokens.legacy, `legacy/${scope}: explicit ${project}`, {
        scope, project: id(projects[project]), search: marker, ...dates,
      }, inProject(expected, project));
      await checkList(tokens.actor, `non-default/${scope}: cannot query ${project}`, {
        scope, project: id(projects[project]), search: marker, ...dates,
      }, []);
    }
    await checkList(tokens.legacy, `legacy/${scope}: foreign references excluded`, {
      scope, search: `${marker} foreign`, ...dates,
    }, []);
  }

  section('Task summary: tenant-bound counts, breakdowns and hours');
  // Add summary-specific metrics only after all existing list assertions above.
  await makeTask('summaryChild', 'private', { parentTask: tasks.privateSelf._id, assignee: users.actor._id });
  await makeTask('foreignSummaryChild', 'foreign', { parentTask: tasks.foreignSelf._id, assignee: users.actor._id });
  const summaryMetrics = {
    member: { status: 'todo', priority: 'low', estimatedHours: 2, actualHours: 1, progress: 0 },
    managed: { status: 'in_progress', priority: 'medium', estimatedHours: 5, actualHours: 2, progress: 20 },
    created: { status: 'review', priority: 'high', estimatedHours: 8, actualHours: 4, progress: 60 },
    privateSelf: { status: 'blocked', priority: 'critical', estimatedHours: 13, actualHours: 7, progress: 30 },
    privateCreated: { status: 'done', priority: 'low', estimatedHours: 21, actualHours: 11, progress: 100 },
    privateCreatedUnassigned: { status: 'failed', priority: 'medium', estimatedHours: 34, actualHours: 17, progress: 40 },
    privateDoneUnassigned: { status: 'done', priority: 'high', estimatedHours: 55, actualHours: 27, progress: 100 },
    internalSelf: { status: 'in_progress', priority: 'critical', estimatedHours: 89, actualHours: 43, progress: 50 },
    summaryChild: { status: 'todo', priority: 'low', estimatedHours: 3, actualHours: 1, progress: 10 },
  };
  for (const [key, task] of Object.entries(tasks)) {
    task.set(key.startsWith('foreign')
      ? { status: 'review', priority: 'critical', estimatedHours: 1000, actualHours: 500, progress: 90 }
      : { estimatedHours: 4, actualHours: 2, progress: task.status === 'done' ? 100 : 10, ...summaryMetrics[key] });
    await task.save();
  }

  // Summary intentionally does not grant project access merely for internal type,
  // following a task, managing its assignee, or being a non-admin company owner.
  const summaryKeys = ['member', 'managed', 'created', 'privateSelf', 'privateCreated',
    'privateCreatedUnassigned', 'privateDoneUnassigned', 'internalSelf'];
  await checkSummary(tokens.actor, 'Member summary excludes stale foreign assignee/creator references', {}, summaryKeys);
  await checkSummary(tokens.actor, 'Member summary can include authorized subtasks only', {
    includeSubtasks: 'true',
  }, [...summaryKeys, 'summaryChild']);
  for (const project of ['member', 'managed', 'created', 'internal', 'private']) {
    await checkSummary(tokens.actor, `Member summary intersects project ${project}`, {
      project: id(projects[project]),
    }, inProject(summaryKeys, project));
  }
  await checkSummary(tokens.actor, 'Private project summary keeps task-level access with subtasks', {
    project: id(projects.private), includeSubtasks: 'true',
  }, [...inProject(summaryKeys, 'private'), 'summaryChild']);

  await checkSummary(tokens.admin, 'Admin summary contains all own-company root tasks', {}, allOwnKeys);
  await checkSummary(tokens.admin, 'Admin summary includes only own-company subtasks', {
    includeSubtasks: 'true',
  }, [...allOwnKeys, 'summaryChild']);
  await checkSummary(tokens.admin, 'Admin summary project filter retains own-company private tasks', {
    project: id(projects.private),
  }, inProject(allOwnKeys, 'private'));
  await checkSummary(tokens.owner, 'Non-admin owner summary retains existing person/project semantics', {}, ['ownerSelf']);
  await checkSummary(tokens.owner, 'Non-admin owner cannot open an unrelated private project summary', {
    project: id(projects.private),
  }, []);

  for (const role of ['actor', 'admin', 'owner', 'legacy']) {
    await checkSummary(tokens[role], `${role}: foreign project summary is empty`, {
      project: id(projects.foreign),
    }, []);
    await checkSummary(tokens[role], `${role}: foreign project summary with subtasks is empty`, {
      project: id(projects.foreign), includeSubtasks: 'true',
    }, []);
  }
  await checkSummary(tokens.actor, 'Unknown project summary is empty', {
    project: id(new mongoose.Types.ObjectId()),
  }, []);

  const legacySummaryKeys = [...legacySelf, ...legacySubs];
  await checkSummary(tokens.legacy, 'Legacy company summary excludes stale foreign references', {}, legacySummaryKeys);
  for (const project of ['legacyNull', 'legacyMissing']) {
    await checkSummary(tokens.legacy, `Legacy summary retains ${project}`, {
      project: id(projects[project]),
    }, inProject(legacySummaryKeys, project));
    await checkSummary(tokens.actor, `Non-default company summary cannot query ${project}`, {
      project: id(projects[project]),
    }, []);
  }
} finally {
  try {
    await Task.deleteMany({ _id: { $in: fixtureIds.tasks } });
    await Project.deleteMany({ _id: { $in: fixtureIds.projects } });
    await User.deleteMany({ _id: { $in: fixtureIds.users } });
  } finally {
    await mongoose.disconnect();
  }
}
process.exitCode = summary() ? 1 : 0;
