import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../src/models/User.js';
import Resource from '../src/models/Resource.js';
import CompanySetting from '../src/models/CompanySetting.js';
import RefreshToken from '../src/models/RefreshToken.js';
import Project from '../src/models/Project.js';
import Department from '../src/models/Department.js';
import Task from '../src/models/Task.js';
import TaskGroup from '../src/models/TaskGroup.js';
import RecurringTask from '../src/models/RecurringTask.js';
import OptimizationResult from '../src/models/OptimizationResult.js';
import WorkloadSnapshot from '../src/models/WorkloadSnapshot.js';
import ActivityLog from '../src/models/ActivityLog.js';
import Attachment from '../src/models/Attachment.js';
import { register as registerController } from '../src/controllers/auth.controller.js';
import { API } from './helpers.mjs';

const uri = process.env.MONGODB_URI;
assert.ok(uri && new URL(uri).pathname.endsWith('_test'), 'Use an isolated _test database');
assert.equal(process.env.NODE_ENV, 'test');
assert.ok(process.env.TEST_PORT, 'Use the runner test server');

const marker = `registration-${randomUUID()}`;
const companies = new Set();
const fixtureIds = [];
let emailSerial = 0;
const payload = (tag, extra = {}) => {
  const companyName = `${marker} ${tag}`;
  companies.add(companyName);
  return { name: 'Registration fixture', email: `${marker}-${emailSerial++}@example.test`, password: 'password123', companyName, ...extra };
};
const register = async (body) => {
  const response = await fetch(`${API}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
};
const denied = async (body, expected) => {
  const result = await register(body);
  assert.equal(result.status, expected, JSON.stringify(result.body));
  assert.equal(result.body.success, false);
  assert.ok(!result.body.data?.token && !result.cookie, 'Rejected registration must not issue a session');
  assert.equal(await User.countDocuments({ email: body.email }), 0, 'Rejected account must not exist');
  return result;
};
const legacyModels = [User, Project, Resource, Department, Task, TaskGroup, RecurringTask,
  OptimizationResult, WorkloadSnapshot, ActivityLog, Attachment];

await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
try {
  console.log('Registration: existing/default companies and privilege injection');
  const seeded = await User.findOne({ email: 'admin@rao.com' }).lean();
  assert.ok(seeded, 'Runner must seed the test database');
  await denied(payload('default', { companyName: seeded.companyName }), 409);
  await denied(payload('trimmed-default', { companyName: `  ${seeded.companyName}  ` }), 409);
  for (const companyName of [undefined, null, '', '   ', [], {}, 123, 'a'.repeat(201)]) {
    await denied(payload(`invalid-${randomUUID()}`, { companyName }), 400);
  }
  for (const role of ['admin', 'project_manager', 'member', 'superadmin']) {
    const body = payload(`role-${role}`, { role });
    await denied(body, 400);
    assert.equal(await CompanySetting.countDocuments({ companyName: body.companyName }), 0);
  }

  console.log('Registration: a new company gets only its own owner and resource');
  const fresh = payload('fresh', { isOwner: false, isGuest: true, appAdmins: ['optimize'], specialGrants: ['can_change_email'] });
  const result = await register({ ...fresh, companyName: ` ${fresh.companyName} ` });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  const owner = result.body.data?.user;
  assert.equal(owner?.companyName, fresh.companyName);
  assert.equal(owner?.role, 'admin');
  assert.equal(owner?.isOwner, true);
  assert.equal(owner?.isGuest, false, 'Client-controlled flags are not accepted');
  assert.deepEqual(owner?.appAdmins, []);
  assert.deepEqual(owner?.specialGrants, []);
  assert.equal(jwt.decode(result.body.data?.token)?.purpose, 'access');
  assert.ok(result.cookie?.includes('rao_refresh='));
  assert.equal(await Resource.countDocuments({ user: owner._id, companyName: fresh.companyName }), 1);
  assert.equal(await CompanySetting.countDocuments({ companyName: fresh.companyName }), 1);
  const usersResponse = await fetch(`${API}/auth/users`, {
    headers: { Authorization: `Bearer ${result.body.data.token}` }, signal: AbortSignal.timeout(5000),
  });
  const usersBody = await usersResponse.json();
  assert.equal(usersResponse.status, 200);
  assert.deepEqual(usersBody.data.users.map((u) => u._id), [owner._id]);
  await denied(payload('duplicate', { companyName: fresh.companyName }), 409);
  assert.equal(await User.countDocuments({ companyName: fresh.companyName }), 1);
  const seededAfter = await User.findById(seeded._id).lean();
  assert.equal(seededAfter.role, seeded.role);
  assert.equal(seededAfter.isOwner, seeded.isOwner);
  assert.equal(seededAfter.password, seeded.password);

  console.log('Registration: legacy tenants are protected even without settings/users');
  for (const Model of legacyModels) {
    const companyName = `${marker} legacy-${Model.modelName}`;
    companies.add(companyName);
    const _id = new mongoose.Types.ObjectId();
    fixtureIds.push({ Model, _id });
    // Represent retained legacy data without creating unrelated business fixtures.
    await Model.collection.insertOne({ _id, companyName });
    await denied(payload(`legacy-${Model.modelName}`, { companyName }), 409);
    assert.equal(await CompanySetting.countDocuments({ companyName }), 0, 'No new reservation for a legacy tenant');
  }
  const settingsOnly = payload('settings-only');
  await CompanySetting.create({ companyName: settingsOnly.companyName });
  await denied(settingsOnly, 409);

  console.log('Registration: concurrent requests cannot create multiple owners for one company');
  const concurrentCompany = `${marker} concurrent`;
  companies.add(concurrentCompany);
  const attempts = Array.from({ length: 4 }, (_, index) => payload(`concurrent-${index}`, {
    companyName: index % 2 ? ` ${concurrentCompany} ` : concurrentCompany,
  }));
  const concurrent = await Promise.all(attempts.map(register));
  assert.equal(concurrent.filter((r) => r.status === 201).length, 1, JSON.stringify(concurrent));
  assert.equal(concurrent.filter((r) => r.status === 409).length, 3);
  assert.equal(await User.countDocuments({ companyName: concurrentCompany, isOwner: true }), 1);
  assert.equal(await Resource.countDocuments({ companyName: concurrentCompany }), 1);
  assert.equal(await CompanySetting.countDocuments({ companyName: concurrentCompany }), 1);
  for (let index = 0; index < concurrent.length; index++) {
    if (concurrent[index].status !== 201) {
      assert.ok(!concurrent[index].body.data?.token && !concurrent[index].cookie);
      assert.equal(await User.countDocuments({ email: attempts[index].email }), 0);
    }
  }

  console.log('Registration: failed writes release only their own reservation after cleanup');
  for (const Model of [User, Resource]) {
    const body = payload(`failed-${Model.modelName}`);
    const originalCreate = Model.create;
    let status;
    let response;
    let caught;
    const res = {
      status(value) { status = value; return this; },
      json(value) { response = value; return this; },
    };
    // Failure injection is test-only; the controller and persistence/cleanup remain real.
    Model.create = async () => { throw new Error(`Injected ${Model.modelName} creation failure`); };
    try {
      await registerController({ body }, res, (error) => { caught = error; });
    } finally {
      Model.create = originalCreate;
    }
    if (Model === User) assert.match(caught?.message || '', /Injected User/);
    else {
      assert.equal(status, 500);
      assert.equal(response?.success, false);
    }
    assert.equal(await User.countDocuments({ email: body.email }), 0);
    assert.equal(await Resource.countDocuments({ companyName: body.companyName }), 0);
    assert.equal(await CompanySetting.countDocuments({ companyName: body.companyName }), 0);
    const retried = await register(body);
    assert.equal(retried.status, 201, 'A fully cleaned-up registration can be retried');
  }

  console.log('PASS: registration boundaries, concurrent reservation and failure recovery');
} finally {
  try {
    const names = [...companies];
    const userIds = (await User.find({ companyName: { $in: names } }).select('_id')).map((u) => u._id);
    await RefreshToken.deleteMany({ user: { $in: userIds } });
    await Resource.deleteMany({ companyName: { $in: names } });
    await User.deleteMany({ companyName: { $in: names } });
    await CompanySetting.deleteMany({ companyName: { $in: names } });
    for (const { Model, _id } of fixtureIds) await Model.collection.deleteOne({ _id });
  } finally {
    await mongoose.disconnect();
  }
}
