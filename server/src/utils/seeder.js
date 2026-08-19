const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Resource = require('../models/Resource');
const Department = require('../models/Department');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const OptimizationResult = require('../models/OptimizationResult');
const RefreshToken = require('../models/RefreshToken');

// .env nằm ở thư mục gốc dự án, không phải trong server/
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

// Phải trùng tên biến với src/config/db.js, nếu không seeder sẽ ghi vào DB mặc định
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resource_allocation';

async function seedData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Xóa cả 8 collection. Trước đây chỉ xóa 5 cái đầu, nên notifications,
    // activitylogs và optimizationresults tồn đọng qua mọi lần seed và trỏ tới
    // những user/task đã bị xóa — dữ liệu mồ côi làm lệch mọi báo cáo.
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({}),
      Resource.deleteMany({}),
      Department.deleteMany({}),
      Notification.deleteMany({}),
      ActivityLog.deleteMany({}),
      OptimizationResult.deleteMany({}),
      // Seed xóa sạch User rồi tạo lại với _id mới, nên mọi refresh token cũ đều
      // trỏ vào khoảng không. Bỏ sót thì chúng nằm lại tới khi TTL dọn.
      RefreshToken.deleteMany({}),
    ]);
    console.log('Cleared all 8 collections.');

    // 1. Create Users
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@rao.com',
      password: 'password123',
      role: 'admin',
      department: 'Management',
    });

    const pmUser = await User.create({
      name: 'Nguyễn Văn Quản Lý',
      email: 'pm@rao.com',
      password: 'password123',
      role: 'project_manager',
      department: 'Project Management Office',
    });

    const dev1 = await User.create({
      name: 'Trần Văn Nam',
      email: 'nam.tran@rao.com',
      password: 'password123',
      role: 'member',
      department: 'Engineering',
    });

    const dev2 = await User.create({
      name: 'Lê Thị Hoa',
      email: 'hoa.le@rao.com',
      password: 'password123',
      role: 'member',
      department: 'Engineering',
    });

    const designer = await User.create({
      name: 'Phạm Minh Tuấn',
      email: 'tuan.pham@rao.com',
      password: 'password123',
      role: 'member',
      department: 'Design',
    });

    console.log('Created 5 users (Admin, PM, 3 Members).');

    // 2. Create Departments
    await Department.insertMany([
      { name: 'Engineering', code: 'ENG', managerName: 'Nguyễn Văn Quản Lý', description: 'Phát triển phần mềm và kỹ thuật hệ thống' },
      { name: 'Design', code: 'DES', managerName: 'Phạm Minh Tuấn', description: 'Thiết kế UI/UX và design system' },
      { name: 'Quality', code: 'QA', managerName: 'Lê Thị Hoa', description: 'Kiểm thử và đảm bảo chất lượng' },
      { name: 'Project Management Office', code: 'PMO', managerName: 'Nguyễn Văn Quản Lý', description: 'Quản lý danh mục dự án và nguồn lực' },
    ]);

    console.log('Created 4 departments.');

    // 3. Create Resources with Skills
    const r1 = await Resource.create({
      user: dev1._id,
      employeeId: 'NV0001',
      position: 'Senior Fullstack Developer',
      department: 'Engineering',
      maxCapacity: 40,
      fte: 1,
      hourlyRate: 350000,
      availability: 'available',
      skills: [
        { name: 'React', level: 4, yearsOfExperience: 5 },
        { name: 'Node.js', level: 4, yearsOfExperience: 4 },
        { name: 'MongoDB', level: 3, yearsOfExperience: 3 },
      ],
    });

    const r2 = await Resource.create({
      user: dev2._id,
      employeeId: 'NV0002',
      position: 'Frontend Developer',
      department: 'Engineering',
      maxCapacity: 40,
      fte: 1,
      hourlyRate: 250000,
      availability: 'available',
      skills: [
        { name: 'React', level: 3, yearsOfExperience: 3 },
        { name: 'TypeScript', level: 3, yearsOfExperience: 2 },
        { name: 'UI/UX', level: 2, yearsOfExperience: 1 },
      ],
    });

    const r3 = await Resource.create({
      user: designer._id,
      employeeId: 'NV0003',
      position: 'UI/UX Designer',
      department: 'Design',
      maxCapacity: 40,
      fte: 1,
      hourlyRate: 280000,
      availability: 'available',
      skills: [
        { name: 'Figma', level: 4, yearsOfExperience: 4 },
        { name: 'Design System', level: 3, yearsOfExperience: 3 },
        { name: 'UI/UX', level: 4, yearsOfExperience: 4 },
      ],
    });

    console.log('Created 3 resources with Skill Matrices.');

    // 4. Create Projects
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 86400000);
    const nextTwoMonths = new Date(today.getTime() + 60 * 86400000);

    const p1 = await Project.create({
      name: 'Nâng cấp Nền tảng E-Commerce',
      code: 'ECOM-01',
      description: 'Hiện đại hóa kiến trúc microservices và giao diện người dùng cho hệ sinh thái thương mại điện tử.',
      status: 'in_progress',
      priority: 'high',
      startDate: today,
      endDate: nextMonth,
      budget: 150000000,
      manager: pmUser._id,
      members: [
        { user: dev1._id, role: 'lead', allocation: 60 },
        { user: dev2._id, role: 'developer', allocation: 80 },
        { user: designer._id, role: 'designer', allocation: 40 },
      ],
      tags: ['ecommerce', 'react', 'nodejs'],
    });

    const p2 = await Project.create({
      name: 'Ứng dụng Di động RAO Mobile App',
      code: 'RAO-MOB',
      description: 'Phát triển ứng dụng di động theo dõi tiến độ và thông báo phân bổ tức thì.',
      status: 'planning',
      priority: 'medium',
      startDate: today,
      endDate: nextTwoMonths,
      budget: 90000000,
      manager: pmUser._id,
      members: [
        { user: dev1._id, role: 'lead', allocation: 40 },
        { user: designer._id, role: 'designer', allocation: 60 },
      ],
      tags: ['mobile', 'react-native'],
    });

    console.log('Created 2 sample projects.');

    // 5. Create Tasks
    const t1 = await Task.create({
      title: 'Thiết kế Design System & Wireframes',
      description: 'Tạo bộ UI kit đồng nhất trên Figma cho các luồng thanh toán và quản trị.',
      project: p1._id,
      assignee: designer._id,
      status: 'done',
      priority: 'high',
      estimatedHours: 24,
      actualHours: 22,
      progress: 100,
      startDate: today,
      endDate: new Date(today.getTime() + 7 * 86400000),
      requiredSkills: [{ name: 'Figma', level: 3, weight: 1 }],
    });

    const t2 = await Task.create({
      title: 'Xây dựng REST APIs Quản lý Đơn hàng',
      description: 'Phát triển API CRUD và tích hợp cổng thanh toán.',
      project: p1._id,
      assignee: dev1._id,
      status: 'in_progress',
      priority: 'critical',
      estimatedHours: 32,
      actualHours: 16,
      progress: 50,
      startDate: new Date(today.getTime() + 5 * 86400000),
      endDate: new Date(today.getTime() + 18 * 86400000),
      dependencies: [t1._id],
      requiredSkills: [
        { name: 'Node.js', level: 3, weight: 1 },
        { name: 'MongoDB', level: 2, weight: 1 },
      ],
    });

    const t3 = await Task.create({
      title: 'Phát triển Giao diện Quản lý Đơn hàng (React)',
      description: 'Xây dựng giao diện bảng và bộ lọc danh sách đơn hàng.',
      project: p1._id,
      assignee: dev2._id,
      status: 'todo',
      priority: 'high',
      estimatedHours: 28,
      actualHours: 0,
      progress: 0,
      startDate: new Date(today.getTime() + 12 * 86400000),
      endDate: new Date(today.getTime() + 25 * 86400000),
      dependencies: [t2._id],
      requiredSkills: [{ name: 'React', level: 3, weight: 1 }],
    });

    console.log('Created 3 sample tasks with dependencies.');
    console.log('\n=============================================');
    console.log('SEEDING COMPLETED SUCCESSFULLY!');
    console.log('Admin Account: admin@rao.com / password123 (role: admin)');
    console.log('PM Account:    pm@rao.com    / password123 (role: project_manager)');
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedData();
