const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resource_allocation';

async function setupDemoData() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB...');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }));
  const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }));
  const TaskGroup = mongoose.model('TaskGroup', new mongoose.Schema({}, { strict: false }));
  const CompanySetting = mongoose.model('CompanySetting', new mongoose.Schema({}, { strict: false }));
  const Department = mongoose.model('Department', new mongoose.Schema({}, { strict: false }));

  const company = 'Công ty Công nghệ RAO';

  // 1. Cập nhật phân quyền cho tài khoản người dùng
  await User.updateMany(
    { email: { $in: ['truongprohm2@gmail.com', 'truongprolavua2004@gmail.com'] } },
    {
      $set: {
        role: 'admin',
        isOwner: true,
        companyName: company,
        appPermissions: {
          projects: 'manage',
          tasks: 'manage',
          calendar: 'manage',
          optimization: 'manage',
          reports: 'manage',
        },
      },
    }
  );
  console.log('Updated user permissions to admin and owner.');

  // 2. Cập nhật CompanySetting cho phép tạo dự án
  await CompanySetting.findOneAndUpdate(
    { companyName: company },
    {
      companyName: company,
      createProjectPermission: 'all_members',
      createDepartmentPermission: 'all_members',
    },
    { upsert: true }
  );
  console.log('Updated CompanySetting for RAO.');

  // 3. Lấy users đại diện
  const user1 = await User.findOne({ email: 'truongprohm2@gmail.com' });
  const user2 = await User.findOne({ email: 'truongprolavua2004@gmail.com' });
  const primaryUser = user1 || user2;
  const secondaryUser = user2 || user1;

  if (!primaryUser) {
    console.log('User not found!');
    mongoose.disconnect();
    return;
  }

  // 4. Lấy phòng ban mẫu
  let dept = await Department.findOne({ companyName: company });
  if (!dept) {
    dept = await Department.create({
      name: 'Phòng Phát Triển Phần Mềm',
      code: 'DEV',
      companyName: company,
      color: '#3b82f6',
      isActive: true,
    });
  }

  // 5. Chuẩn hóa hoặc tạo dự án mẫu
  const existingProject = await Project.findOne({ companyName: company });
  if (existingProject) {
    existingProject.name = 'Hệ thống Quản lý Phân bổ Nhân sự (RAO Enterprise)';
    existingProject.code = 'RAO-ENT';
    existingProject.description = 'Nền tảng tối ưu hóa phân bổ nguồn lực đa dự án tự động bằng giải thuật di truyền (Genetic Algorithm).';
    existingProject.projectType = 'internal';
    existingProject.status = 'in_progress';
    existingProject.priority = 'critical';
    existingProject.progress = 68;
    existingProject.manager = primaryUser._id;
    existingProject.department = dept._id;
    existingProject.members = [
      { user: primaryUser._id, role: 'lead', allocation: 100 },
      { user: secondaryUser._id, role: 'developer', allocation: 100 },
    ];
    await existingProject.save();
    console.log('Updated existing project RAO-ENT.');
  }

  // Tạo thêm Dự án Mobile
  let mobileProject = await Project.findOne({ code: 'RAO-MOB' });
  if (!mobileProject) {
    mobileProject = await Project.create({
      name: 'Ứng dụng Di động RAO Mobile App (Expo SDK 57)',
      code: 'RAO-MOB',
      description: 'Ứng dụng di động quản lý công việc và phân bổ nhân sự chạy trên nền tảng React Native Expo SDK 57.',
      companyName: company,
      projectType: 'internal',
      status: 'in_progress',
      priority: 'high',
      startDate: new Date(Date.now() - 10 * 86400000),
      endDate: new Date(Date.now() + 30 * 86400000),
      budget: 85000000,
      progress: 52,
      manager: primaryUser._id,
      createdBy: primaryUser._id,
      department: dept._id,
      color: '#10b981',
      members: [
        { user: primaryUser._id, role: 'lead', allocation: 100 },
        { user: secondaryUser._id, role: 'developer', allocation: 100 },
      ],
    });
    console.log('Created project RAO-MOB.');
  }

  // Tạo thêm Dự án Hạ tầng
  let infraProject = await Project.findOne({ code: 'RAO-INFRA' });
  if (!infraProject) {
    infraProject = await Project.create({
      name: 'Nâng cấp Hạ tầng & Bảo mật API Gateway',
      code: 'RAO-INFRA',
      description: 'Tối ưu hóa hiệu năng cơ sở dữ liệu MongoDB, thiết lập rate limiter và kiểm thử bảo mật API.',
      companyName: company,
      projectType: 'internal',
      status: 'planning',
      priority: 'medium',
      startDate: new Date(),
      endDate: new Date(Date.now() + 45 * 86400000),
      budget: 50000000,
      progress: 25,
      manager: secondaryUser._id,
      createdBy: primaryUser._id,
      department: dept._id,
      color: '#8b5cf6',
      members: [
        { user: primaryUser._id, role: 'developer', allocation: 80 },
        { user: secondaryUser._id, role: 'lead', allocation: 100 },
      ],
    });
    console.log('Created project RAO-INFRA.');
  }

  const targetProjects = [existingProject, mobileProject, infraProject].filter(Boolean);

  // 6. Tạo Nhóm công việc (Task Groups)
  for (const proj of targetProjects) {
    const groups = [
      { name: 'Khảo sát & Thiết kế UI/UX', color: '#8b5cf6', order: 1 },
      { name: 'Phát triển Backend API', color: '#3b82f6', order: 2 },
      { name: 'Xây dựng Màn hình Mobile', color: '#10b981', order: 3 },
      { name: 'Kiểm thử & Đánh giá', color: '#f59e0b', order: 4 },
    ];

    for (const g of groups) {
      await TaskGroup.findOneAndUpdate(
        { project: proj._id, name: g.name },
        { ...g, project: proj._id, companyName: company },
        { upsert: true }
      );
    }
  }
  console.log('Created task groups for all projects.');

  // 7. Tạo danh sách Tasks mẫu phong phú
  const mobGroups = await TaskGroup.find({ project: mobileProject._id });
  const gUI = mobGroups.find((g) => g.name.includes('UI/UX')) || mobGroups[0];
  const gAPI = mobGroups.find((g) => g.name.includes('Backend')) || mobGroups[0];
  const gMobile = mobGroups.find((g) => g.name.includes('Mobile')) || mobGroups[0];
  const gQA = mobGroups.find((g) => g.name.includes('Kiểm thử')) || mobGroups[0];

  const now = Date.now();
  const sampleTasks = [
    {
      title: 'Thiết kế hệ thống giao diện Mobile Dark Mode',
      project: mobileProject._id,
      taskGroup: gUI?._id,
      assignee: primaryUser._id,
      createdBy: secondaryUser._id,
      companyName: company,
      status: 'done',
      priority: 'high',
      progress: 100,
      estimatedHours: 16,
      actualHours: 14,
      startDate: new Date(now - 7 * 86400000),
      endDate: new Date(now - 2 * 86400000),
      description: 'Hoàn thiện bảng màu, hệ thống tokens, và các thẻ task, project theo chuẩn thiết kế tối giản hiện đại.',
      checklist: [
        { title: 'Tạo Color Palette Dark/Light', completed: true },
        { title: 'Thiết kế TaskCard & Badge', completed: true },
        { title: 'Kiểm tra tỷ lệ tương phản', completed: true },
      ],
      comments: [
        { user: secondaryUser._id, text: 'Giao diện nhìn rất mượt và chuyên nghiệp!', createdAt: new Date(now - 3 * 86400000) },
      ],
    },
    {
      title: 'Tích hợp bộ lọc công việc đa chiều (Scope & Time)',
      project: mobileProject._id,
      taskGroup: gMobile?._id,
      assignee: primaryUser._id,
      createdBy: primaryUser._id,
      companyName: company,
      status: 'in_progress',
      priority: 'critical',
      progress: 75,
      estimatedHours: 20,
      actualHours: 12,
      startDate: new Date(now - 2 * 86400000),
      endDate: new Date(now + 2 * 86400000),
      description: 'Hỗ trợ lọc việc của tôi, việc tôi giao, theo dõi và lọc thời hạn hôm nay, tuần này, quá hạn.',
      checklist: [
        { title: 'Thiết kế thanh Scope filter tab', completed: true },
        { title: 'Thiết kế thanh Time filter tab', completed: true },
        { title: 'Gắn API query params vào request', completed: false },
      ],
      comments: [
        { user: primaryUser._id, text: 'Đã hoàn tất UI filter, đang kiểm tra gọi API backend.', createdAt: new Date(now - 1 * 86400000) },
      ],
    },
    {
      title: 'Xây dựng màn hình chi tiết công việc chuyên sâu',
      project: mobileProject._id,
      taskGroup: gMobile?._id,
      assignee: secondaryUser._id,
      createdBy: primaryUser._id,
      companyName: company,
      status: 'review',
      priority: 'high',
      progress: 90,
      estimatedHours: 24,
      actualHours: 22,
      startDate: new Date(now - 4 * 86400000),
      endDate: new Date(now + 1 * 86400000),
      description: 'Bao gồm 4 tabs: Thông tin, Checklist tương tác, Quy trình duyệt kết quả và Thảo luận thời gian thực.',
      checklist: [
        { title: 'Tab Info & Metadata', completed: true },
        { title: 'Tab Checklist tương tác', completed: true },
        { title: 'Tab Workflow báo cáo kết quả', completed: true },
        { title: 'Tab Comments timeline', completed: true },
      ],
      resultReport: {
        submittedAt: new Date(now - 12 * 3600000),
        submittedBy: secondaryUser._id,
        actualHours: 22,
        resultLinks: ['https://github.com/rao-mobile/pull/15'],
        notes: 'Đã hoàn tất kiểm thử trên Android Emulator và iPhone thật.',
      },
    },
    {
      title: 'Tối ưu hóa hiệu năng API và kết nối LAN máy chủ',
      project: infraProject?._id || mobileProject._id,
      taskGroup: gAPI?._id,
      assignee: primaryUser._id,
      createdBy: secondaryUser._id,
      companyName: company,
      status: 'todo',
      priority: 'medium',
      progress: 0,
      estimatedHours: 12,
      startDate: new Date(now),
      endDate: new Date(now + 5 * 86400000),
      description: 'Tự động phát hiện IP dev server và mở cổng LAN cho các thiết bị di động truy cập trực tiếp.',
      checklist: [
        { title: 'Tự động đọc hostUri từ Expo Constants', completed: false },
        { title: 'Bổ sung Modal chẩn đoán kết nối trên app', completed: false },
      ],
    },
    {
      title: 'Kiểm thử toàn diện luồng đăng nhập và tạo dự án',
      project: mobileProject._id,
      taskGroup: gQA?._id,
      assignee: secondaryUser._id,
      createdBy: primaryUser._id,
      companyName: company,
      status: 'in_progress',
      priority: 'high',
      progress: 40,
      estimatedHours: 8,
      actualHours: 3,
      startDate: new Date(now - 1 * 86400000),
      endDate: new Date(now + 3 * 86400000),
      description: 'Kiểm thử luồng authentication, lưu trữ token AsyncStorage và điều hướng sang các tab chức năng.',
      checklist: [
        { title: 'Test đăng nhập email/mật khẩu đúng', completed: true },
        { title: 'Test đăng ký tài khoản mới', completed: true },
        { title: 'Test tạo công việc có gắn Nhóm việc', completed: false },
      ],
    },
    {
      title: 'Kiểm tra bảo mật và giới hạn tần suất đăng nhập',
      project: infraProject?._id || mobileProject._id,
      taskGroup: gAPI?._id,
      assignee: primaryUser._id,
      createdBy: primaryUser._id,
      companyName: company,
      status: 'todo',
      priority: 'low',
      progress: 0,
      estimatedHours: 6,
      startDate: new Date(now + 2 * 86400000),
      endDate: new Date(now + 7 * 86400000),
      description: 'Điều chỉnh authLimiter ở môi trường development để người dùng thử nghiệm không bị nghẽn IP.',
      checklist: [
        { title: 'Kiểm tra biến môi trường AUTH_RATE_LIMIT', completed: false },
      ],
    },
  ];

  for (const t of sampleTasks) {
    const existing = await Task.findOne({ title: t.title, project: t.project });
    if (!existing) {
      await Task.create(t);
      console.log('Created sample task:', t.title);
    }
  }

  console.log('Demo setup completed successfully!');
  mongoose.disconnect();
}

setupDemoData().catch((err) => {
  console.error('Error setting up demo data:', err);
  process.exit(1);
});
