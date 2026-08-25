/**
 * Bộ sinh dữ liệu thử nghiệm phân bổ nguồn lực (Synthetic Dataset Generator)
 * Phục vụ chạy Benchmark và viết Báo cáo Thực nghiệm Luận văn.
 */

const SKILL_POOL = [
  'React', 'Node.js', 'Python', 'PostgreSQL', 'Docker',
  'AWS', 'UI/UX Design', 'QA Testing', 'Machine Learning', 'Java Spring',
  'Kubernetes', 'TypeScript', 'Golang', 'GraphQL', 'Security Audit',
];

const POSITIONS = [
  'Senior Fullstack Engineer', 'Frontend Specialist', 'Backend Architect',
  'DevOps Engineer', 'AI/ML Researcher', 'QA Automation Lead',
  'UI/UX Designer', 'Cloud Infrastructure Engineer', 'Database Administrator',
];

const TASK_PREFIXES = [
  'Thiết kế kiến trúc', 'Phát triển API cho', 'Tối ưu hóa cơ sở dữ liệu',
  'Xây dựng giao diện cho', 'Viết bộ kiểm thử tự động', 'Triển khai hạ tầng CI/CD',
  'Huấn luyện mô hình phân loại', 'Đánh giá an toàn thông tin', 'Tích hợp cổng thanh toán',
  'Refactor module dịch vụ', 'Nâng cấp caching layer', 'Xây dựng realtime websocket',
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomSubset(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateBenchmarkDataset(scaleOrConfig = 'medium') {
  let numTasks = 100;
  let numResources = 20;
  let label = 'Quy mô Vừa (Medium Dataset)';

  if (typeof scaleOrConfig === 'string') {
    switch (scaleOrConfig.toLowerCase()) {
      case 'small':
        numTasks = 20;
        numResources = 5;
        label = 'Quy mô Nhỏ (Small Dataset: 20 tasks, 5 resources)';
        break;
      case 'large':
        numTasks = 500;
        numResources = 60;
        label = 'Quy mô Lớn (Large Dataset: 500 tasks, 60 resources)';
        break;
      case 'medium':
      default:
        numTasks = 100;
        numResources = 20;
        label = 'Quy mô Vừa (Medium Dataset: 100 tasks, 20 resources)';
        break;
    }
  } else if (typeof scaleOrConfig === 'object') {
    numTasks = Math.max(5, Math.min(1000, Number(scaleOrConfig.taskCount) || 50));
    numResources = Math.max(2, Math.min(200, Number(scaleOrConfig.resourceCount) || 10));
    label = `Tùy chỉnh (${numTasks} tasks, ${numResources} resources)`;
  }

  // 1. Generate Resources
  const resources = [];
  for (let i = 1; i <= numResources; i++) {
    const numSkills = getRandomInt(3, 6);
    const chosenSkills = getRandomSubset(SKILL_POOL, numSkills);

    const skills = chosenSkills.map((skName) => ({
      name: skName,
      level: getRandomInt(1, 4),
    }));

    resources.push({
      _id: `synth-res-${i}`,
      userId: `user-res-${i}`,
      userName: `Nhân sự ${i.toString().padStart(2, '0')}`,
      position: POSITIONS[i % POSITIONS.length],
      department: `Phòng Ban ${String.fromCharCode(65 + (i % 5))}`,
      skills,
      maxCapacity: 40,
      fte: 1,
      hourlyRate: getRandomInt(150, 450) * 1000, // VND 150k - 450k/h
      availability: 'available',
      currentWorkload: 0,
    });
  }

  // 2. Generate Tasks
  const tasks = [];
  const baseDate = new Date();

  for (let i = 1; i <= numTasks; i++) {
    const numReqSkills = getRandomInt(1, 3);
    const chosenSkills = getRandomSubset(SKILL_POOL, numReqSkills);

    const requiredSkills = chosenSkills.map((skName) => ({
      name: skName,
      level: getRandomInt(1, 3),
      weight: parseFloat((Math.random() * 0.5 + 0.5).toFixed(2)),
    }));

    const durationDays = getRandomInt(2, 10);
    const startOffset = getRandomInt(0, 15);
    const startDate = new Date(baseDate.getTime() + startOffset * 86400000);
    const endDate = new Date(startDate.getTime() + durationDays * 86400000);

    tasks.push({
      _id: `synth-task-${i}`,
      title: `${TASK_PREFIXES[i % TASK_PREFIXES.length]} #${i}`,
      estimatedHours: getRandomInt(4, 24),
      requiredSkills,
      priority: ['low', 'medium', 'high', 'critical'][getRandomInt(0, 3)],
      status: 'todo',
      startDate,
      endDate,
    });
  }

  return {
    label,
    taskCount: numTasks,
    resourceCount: numResources,
    tasks,
    resources,
  };
}

module.exports = {
  generateBenchmarkDataset,
  SKILL_POOL,
};
