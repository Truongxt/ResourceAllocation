const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resource_allocation';

async function setupResourcesData() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB for Resources setup...');

  const User = require('../models/User');
  const Resource = require('../models/Resource');
  const Department = require('../models/Department');
  const Task = require('../models/Task');
  const Project = require('../models/Project');

  const company = 'Công ty Công nghệ RAO';

  // 1. Chuẩn hóa các Phòng ban chuẩn
  const deptsData = [
    { name: 'Phòng Phát Triển Phần Mềm', code: 'DEV', color: '#3b82f6', description: 'Phát triển ứng dụng Web, Mobile và Hệ thống AI' },
    { name: 'Phòng Quản Lý Dự Án', code: 'PMO', color: '#8b5cf6', description: 'Điều phối, giám sát tiến độ và phân bổ nguồn lực' },
    { name: 'Phòng Thiết Kế UI/UX', code: 'DESIGN', color: '#ec4899', description: 'Nghiên cứu trải nghiệm người dùng và thiết kế giao diện' },
    { name: 'Phòng Đảm Bảo Chất Lượng', code: 'QA', color: '#10b981', description: 'Kiểm thử thủ công, tự động hóa và đảm bảo chất lượng phần mềm' },
  ];

  for (const d of deptsData) {
    await Department.findOneAndUpdate(
      { code: d.code, companyName: company },
      { ...d, companyName: company, isActive: true },
      { upsert: true, new: true }
    );
  }
  console.log('Departments synchronized.');

  // 2. Xóa các resource dummy không hợp lệ
  const allRes = await Resource.find({ companyName: company });
  for (const r of allRes) {
    if (!r.user) {
      await Resource.deleteOne({ _id: r._id });
      continue;
    }
    const u = await User.findById(r.user);
    if (!u || u.email?.match(/follower_|outsider_/i)) {
      await Resource.deleteOne({ _id: r._id });
      if (u) await User.deleteOne({ _id: u._id });
    }
  }
  console.log('Cleaned up dummy resources.');

  // 3. Danh sách nhân sự chuẩn hóa
  const employees = [
    {
      name: 'Nguyễn Xuân Trường',
      email: 'truongprohm2@gmail.com',
      role: 'admin',
      isOwner: true,
      position: 'Trưởng nhóm Kỹ thuật (Fullstack Tech Lead)',
      department: 'Phòng Phát Triển Phần Mềm',
      maxCapacity: 40,
      skills: [
        { name: 'React Native & Mobile', level: 4, yearsOfExperience: 5 },
        { name: 'Node.js & Express', level: 4, yearsOfExperience: 5 },
        { name: 'MongoDB', level: 3, yearsOfExperience: 4 },
        { name: 'Genetic Algorithm', level: 3, yearsOfExperience: 2 },
      ],
    },
    {
      name: 'Trần Xuân Trường',
      email: 'truongprolavua2004@gmail.com',
      role: 'admin',
      isOwner: true,
      position: 'Kỹ sư Backend Cấp cao (Senior Backend Engineer)',
      department: 'Phòng Phát Triển Phần Mềm',
      maxCapacity: 40,
      skills: [
        { name: 'Node.js & Microservices', level: 4, yearsOfExperience: 4 },
        { name: 'MongoDB & Redis', level: 4, yearsOfExperience: 4 },
        { name: 'System Security & JWT', level: 3, yearsOfExperience: 3 },
      ],
    },
    {
      name: 'Trần Văn Thái',
      email: 'truongxt2501@gmail.com',
      role: 'project_manager',
      position: 'Quản lý Dự án (Senior Project Manager / Scrum Master)',
      department: 'Phòng Quản Lý Dự Án',
      maxCapacity: 40,
      skills: [
        { name: 'Agile & Scrum Master', level: 4, yearsOfExperience: 6 },
        { name: 'Resource Allocation', level: 4, yearsOfExperience: 5 },
        { name: 'Risk Management', level: 3, yearsOfExperience: 4 },
      ],
    },
    {
      name: 'Lê Hoàng Nam',
      email: 'nam.le@rao.com',
      role: 'member',
      position: 'Kỹ sư Di động & Frontend (Senior Mobile Engineer)',
      department: 'Phòng Phát Triển Phần Mềm',
      maxCapacity: 40,
      skills: [
        { name: 'React Native (Expo SDK 57)', level: 4, yearsOfExperience: 4 },
        { name: 'TypeScript & Redux', level: 3, yearsOfExperience: 3 },
        { name: 'Performance Tuning', level: 3, yearsOfExperience: 3 },
      ],
    },
    {
      name: 'Vinh Thái',
      email: 'tr@gmail.com',
      role: 'member',
      position: 'Chuyên viên Thiết kế UI/UX (Senior Product Designer)',
      department: 'Phòng Thiết Kế UI/UX',
      maxCapacity: 40,
      skills: [
        { name: 'Figma & Design Tokens', level: 4, yearsOfExperience: 4 },
        { name: 'Mobile App UX', level: 4, yearsOfExperience: 4 },
        { name: 'Wireframing & Prototype', level: 4, yearsOfExperience: 4 },
      ],
    },
    {
      name: 'Hoàng Thu Trang',
      email: 'trang.hoang@rao.com',
      role: 'member',
      position: 'Kỹ sư Đảm bảo Chất lượng (Senior QA/QC Engineer)',
      department: 'Phòng Đảm Bảo Chất Lượng',
      maxCapacity: 40,
      skills: [
        { name: 'Automated Testing (Jest/Detox)', level: 3, yearsOfExperience: 3 },
        { name: 'Manual & Regression Testing', level: 4, yearsOfExperience: 4 },
        { name: 'API Testing (Postman)', level: 3, yearsOfExperience: 3 },
      ],
    },
    {
      name: 'Đỗ Minh Quân',
      email: 'quan.do@rao.com',
      role: 'member',
      position: 'Kỹ sư DevOps & Điện toán Đám mây (DevOps Engineer)',
      department: 'Phòng Phát Triển Phần Mềm',
      maxCapacity: 40,
      skills: [
        { name: 'Docker & Kubernetes', level: 3, yearsOfExperience: 3 },
        { name: 'CI/CD GitHub Actions', level: 4, yearsOfExperience: 4 },
        { name: 'AWS & Cloud Security', level: 3, yearsOfExperience: 3 },
      ],
    },
  ];

  let empCounter = 100;
  for (const emp of employees) {
    empCounter++;
    // Create or update user
    let user = await User.findOne({ email: emp.email });
    if (!user) {
      user = await User.create({
        name: emp.name,
        email: emp.email,
        password: '$2a$10$wT9tTj1vjM2Vp8O1T2z9te1Y7rXqZ9KjZ2yL0qC8H6K5m8N9O0P1e', // hashed default password
        role: emp.role,
        isOwner: !!emp.isOwner,
        companyName: company,
        department: emp.department,
        jobTitle: emp.position,
        appPermissions: {
          projects: 'manage',
          tasks: 'manage',
          calendar: 'manage',
          optimization: 'manage',
          reports: 'manage',
        },
      });
    } else {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            name: emp.name,
            companyName: company,
            role: emp.role,
            isOwner: !!emp.isOwner,
            department: emp.department,
            jobTitle: emp.position,
          },
        }
      );
    }

    // Create or update resource
    const existingRes = await Resource.findOne({ user: user._id });
    if (existingRes) {
      await Resource.updateOne(
        { _id: existingRes._id },
        {
          $set: {
            position: emp.position,
            department: emp.department,
            companyName: company,
            maxCapacity: emp.maxCapacity,
            skills: emp.skills,
            availability: 'available',
          },
        }
      );
    } else {
      await Resource.create({
        user: user._id,
        employeeId: `RAO-${empCounter}`,
        position: emp.position,
        department: emp.department,
        companyName: company,
        maxCapacity: emp.maxCapacity,
        fte: 1.0,
        skills: emp.skills,
        availability: 'available',
        currentWorkload: 0,
      });
    }
    console.log(`Saved resource for: ${emp.name} (${emp.position})`);
  }

  // 4. Cập nhật phân bổ task và đồng bộ workload cho từng nhân sự
  const primaryUser = await User.findOne({ email: 'truongprohm2@gmail.com' });
  const backendLead = await User.findOne({ email: 'truongprolavua2004@gmail.com' });
  const mobileEng = await User.findOne({ email: 'nam.le@rao.com' });
  const designer = await User.findOne({ email: 'tr@gmail.com' });
  const qaEng = await User.findOne({ email: 'trang.hoang@rao.com' });
  const devopsEng = await User.findOne({ email: 'quan.do@rao.com' });

  // Gán task vào nhân sự theo chuyên môn
  const tasks = await Task.find({ companyName: company });
  for (const t of tasks) {
    const title = (t.title || '').toLowerCase();
    let targetAssignee = primaryUser._id;
    if (title.includes('giao diện') || title.includes('mobile') || title.includes('màn hình')) {
      targetAssignee = mobileEng ? mobileEng._id : primaryUser._id;
    } else if (title.includes('thiết kế') || title.includes('prototype') || title.includes('ui/ux')) {
      targetAssignee = designer ? designer._id : primaryUser._id;
    } else if (title.includes('kiểm thử') || title.includes('test') || title.includes('qa')) {
      targetAssignee = qaEng ? qaEng._id : primaryUser._id;
    } else if (title.includes('hạ tầng') || title.includes('gateway') || title.includes('docker') || title.includes('bảo mật')) {
      targetAssignee = devopsEng ? devopsEng._id : backendLead._id;
    } else if (title.includes('api') || title.includes('backend') || title.includes('di truyền')) {
      targetAssignee = backendLead ? backendLead._id : primaryUser._id;
    }
    await Task.updateOne(
      { _id: t._id },
      {
        $set: { assignee: targetAssignee },
        $pull: { comments: { content: { $in: [null, undefined, ''] } } },
      }
    );
  }
  console.log(`Assigned tasks to specialized team members.`);

  // 5. Cập nhật members cho các dự án của RAO
  const allUsers = [primaryUser, backendLead, mobileEng, designer, qaEng, devopsEng].filter(Boolean);
  const projects = await Project.find({ companyName: company });
  for (const p of projects) {
    p.members = allUsers.map((u, i) => ({
      user: u._id,
      role: i === 0 ? 'lead' : i === 3 ? 'designer' : i === 4 ? 'tester' : i === 5 ? 'devops' : 'developer',
      allocation: 100,
    }));
    await p.save();
  }
  console.log(`Updated project members for ${projects.length} projects.`);

  // 6. Tính lại currentWorkload cho tất cả resources
  const allResources = await Resource.find({ companyName: company });
  for (const resDoc of allResources) {
    if (!resDoc.user) continue;
    const activeTasks = await Task.find({
      assignee: resDoc.user,
      status: { $in: ['todo', 'in_progress', 'review'] },
    });
    const totalHours = activeTasks.reduce((acc, cur) => acc + (cur.estimatedHours || 0), 0);
    resDoc.currentWorkload = totalHours;
    await resDoc.save();
  }
  console.log('Workloads recalculated.');

  await mongoose.disconnect();
  console.log('Setup resources completed successfully!');
}

setupResourcesData().catch((err) => {
  console.error('Error in setupResourcesData:', err);
  process.exit(1);
});
