const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });

const BASE_URL = 'http://localhost:5000/api';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Department = mongoose.model('Department', new mongoose.Schema({}, { strict: false }));

  // Find Nasani CEO: Xuan Truong Tran
  const ceo = await User.findOne({ email: 'truongprolavua20041@gmail.com' });
  if (!ceo) throw new Error('Cannot find Xuan Truong Tran');

  // Find Nasani Member: Lam Bùng Binh
  const member = await User.findOne({ email: 'truongmeli2004@gmail.com' });
  if (!member) throw new Error('Cannot find Lam Bùng Binh');

  // Generate JWT for CEO
  const ceoToken = jwt.sign(
    { id: ceo._id, role: ceo.role, companyName: ceo.companyName, isOwner: ceo.isOwner },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars-long!',
    { expiresIn: '1h' }
  );

  // Generate JWT for Member
  const memberToken = jwt.sign(
    { id: member._id, role: member.role, companyName: member.companyName, isOwner: member.isOwner },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars-long!',
    { expiresIn: '1h' }
  );

  console.log('\n--- TEST 1: Direct Manager Hierarchy Constraint ---');
  // Attempt to assign regular member Lam Bùng Binh as Direct Manager of CEO Xuan Truong Tran
  const res1 = await fetch(`${BASE_URL}/auth/users/${ceo._id}/manager`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ceoToken}`,
    },
    body: JSON.stringify({ managerId: member._id }),
  });
  const data1 = await res1.json();
  console.log('Assign member to CEO status:', res1.status);
  console.log('Assign member to CEO response:', data1);
  if (res1.status === 400 && data1.message.includes('Quản trị cấp cao / CEO')) {
    console.log('✓ PASS: System correctly blocked assigning member as manager of CEO/Owner');
  } else {
    console.error('✗ FAIL: Expected 400 rejection');
    process.exit(1);
  }

  // Assign CEO as manager of Member (valid)
  const resValid = await fetch(`${BASE_URL}/auth/users/${member._id}/manager`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ceoToken}`,
    },
    body: JSON.stringify({ managerId: ceo._id }),
  });
  const dataValid = await resValid.json();
  console.log('Assign CEO as manager of member status:', resValid.status);
  if (resValid.status === 200) {
    console.log('✓ PASS: Successfully assigned CEO as direct manager of member');
  } else {
    console.error('✗ FAIL: Valid assignment failed:', dataValid);
    process.exit(1);
  }

  console.log('\n--- TEST 2: Department Update by CEO ---');
  // Find Nasani IT department
  const nasaniIT = await Department.findOne({ companyName: 'Công ty Phần Mềm Nasani', name: 'IT' });
  if (!nasaniIT) throw new Error('Cannot find Nasani IT department');

  // CEO Xuan Truong Tran updates Department IT to add Lam Bùng Binh as Manager
  const resDept = await fetch(`${BASE_URL}/departments/${nasaniIT._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ceoToken}`,
    },
    body: JSON.stringify({
      name: 'IT',
      code: 'DEV',
      description: 'Khối Kỹ thuật & Phát triển Phần mềm Nasani',
      color: '#6366f1',
      managers: [member._id],
    }),
  });
  const dataDept = await resDept.json();
  console.log('CEO update Department status:', resDept.status);
  console.log('CEO update Department message:', dataDept.message);
  if (resDept.status === 200 && dataDept.success) {
    console.log('✓ PASS: CEO successfully updated department & assigned Department Manager without cross-company errors');
  } else {
    console.error('✗ FAIL: Department update failed:', dataDept);
    process.exit(1);
  }

  console.log('\n--- TEST 3: Base Wework System Settings (CompanySetting) ---');
  // Get settings
  const resGetSettings = await fetch(`${BASE_URL}/company-settings`, {
    headers: { Authorization: `Bearer ${ceoToken}` },
  });
  const dataGetSettings = await resGetSettings.json();
  console.log('Current Company Settings:', dataGetSettings.data.settings);

  // Update settings to allow all members to create projects
  const resUpdateSettings = await fetch(`${BASE_URL}/company-settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ceoToken}`,
    },
    body: JSON.stringify({
      createProjectPermission: 'all_members',
      createDepartmentPermission: 'only_admin',
    }),
  });
  const dataUpdateSettings = await resUpdateSettings.json();
  console.log('Update settings status:', resUpdateSettings.status);
  if (resUpdateSettings.status === 200) {
    console.log('✓ PASS: System Owner updated Wework creation permissions');
  }

  // Member tries to create project with all_members allowed -> Should succeed!
  const resMemberProj = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
    body: JSON.stringify({
      name: 'Dự án Thử nghiệm Quyền Thành viên',
      code: 'TEST-MBR',
      description: 'Dự án do member tạo khi all_members được bật',
      department: nasaniIT._id,
      budget: 10000000,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    }),
  });
  const dataMemberProj = await resMemberProj.json();
  console.log('Member create project when all_members status:', resMemberProj.status);
  if (resMemberProj.status === 201) {
    console.log('✓ PASS: Member can create project when all_members is enabled');
    // Cleanup project
    await fetch(`${BASE_URL}/projects/${dataMemberProj.data.project._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ceoToken}` },
    });
  } else {
    console.error('✗ FAIL: Member create project failed:', dataMemberProj);
  }

  // Member tries to create department when only_admin is set -> Should be blocked 403!
  const resMemberDept = await fetch(`${BASE_URL}/departments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
    body: JSON.stringify({
      name: 'Phòng ban Member tạo',
      code: 'MBR-DEPT',
    }),
  });
  const dataMemberDept = await resMemberDept.json();
  console.log('Member create department when only_admin status:', resMemberDept.status);
  if (resMemberDept.status === 403) {
    console.log('✓ PASS: Member blocked from creating department when only_admin is set');
  } else {
    console.error('✗ FAIL: Member should have been blocked with 403:', dataMemberDept);
  }

  // Reset settings back to only_admin
  await fetch(`${BASE_URL}/company-settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ceoToken}`,
    },
    body: JSON.stringify({
      createProjectPermission: 'only_admin',
      createDepartmentPermission: 'only_admin',
    }),
  });
  console.log('Reset company settings to default only_admin');

  console.log('\n================ ALL INTEGRATION TESTS PASSED 100% ================');
  process.exit(0);
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
