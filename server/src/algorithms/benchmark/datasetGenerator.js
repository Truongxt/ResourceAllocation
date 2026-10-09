/**
 * Bộ sinh dữ liệu thử nghiệm phân bổ nguồn lực (Synthetic Dataset Generator)
 * Phục vụ chạy Benchmark và viết Báo cáo Thực nghiệm Luận văn.
 *
 * Kỹ năng của người và của việc đều xoay quanh **vai trò**. Mỗi vai trò có một cụm kỹ năng
 * chính. Mỗi người nắm trọn cụm của vai trò mình (cấp 2–4) cộng 0–2 kỹ năng ngoài cụm (cấp
 * 1–2). Mỗi việc thuộc vai trò của một người có thật trong đội và đòi 1–3 kỹ năng (cấp 1–3)
 * từ cụm đó. Nhờ vậy việc nào cũng có ít nhất một người đạt ≥ 2/3 điểm khớp.
 *
 * Trước đây hai bên bốc độc lập từ 15 kỹ năng: 26% việc ở bộ small không ai đạt ngưỡng H2
 * mặc định (0.5), nên CSP giải được 0/30 bộ small. Số đo khi đó nói về bộ sinh, không nói về
 * thuật toán.
 */

const ROLES = [
  {
    position: 'Senior Fullstack Engineer',
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    titles: ['Phát triển tính năng', 'Refactor module dịch vụ'],
  },
  {
    position: 'Frontend Specialist',
    skills: ['React', 'TypeScript', 'GraphQL', 'UI/UX Design'],
    titles: ['Xây dựng giao diện cho', 'Xây dựng realtime websocket'],
  },
  {
    position: 'Backend Architect',
    skills: ['Node.js', 'Java Spring', 'Golang', 'PostgreSQL'],
    titles: ['Thiết kế kiến trúc', 'Phát triển API cho', 'Tích hợp cổng thanh toán'],
  },
  {
    position: 'DevOps Engineer',
    skills: ['Docker', 'Kubernetes', 'AWS', 'Golang'],
    titles: ['Triển khai hạ tầng CI/CD', 'Nâng cấp caching layer'],
  },
  {
    position: 'AI/ML Researcher',
    skills: ['Python', 'Machine Learning', 'Docker'],
    titles: ['Huấn luyện mô hình phân loại', 'Đánh giá mô hình gợi ý'],
  },
  {
    position: 'QA Automation Lead',
    skills: ['QA Testing', 'TypeScript', 'Python', 'Security Audit'],
    titles: ['Viết bộ kiểm thử tự động', 'Kiểm thử hồi quy'],
  },
  {
    position: 'UI/UX Designer',
    skills: ['UI/UX Design', 'React'],
    titles: ['Thiết kế màn hình', 'Nghiên cứu trải nghiệm người dùng'],
  },
  {
    position: 'Cloud Infrastructure Engineer',
    skills: ['AWS', 'Kubernetes', 'Docker', 'Security Audit'],
    titles: ['Đánh giá an toàn thông tin', 'Di chuyển hạ tầng lên cloud'],
  },
  {
    position: 'Database Administrator',
    skills: ['PostgreSQL', 'AWS', 'Security Audit'],
    titles: ['Tối ưu hóa cơ sở dữ liệu', 'Sao lưu và phục hồi dữ liệu'],
  },
];

const SKILL_POOL = [...new Set(ROLES.flatMap((role) => role.skills))];

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

  // 1. Generate Resources — vai trò chia vòng tròn từ một điểm ngẫu nhiên, nên đội nhỏ
  // vẫn đa dạng vai trò mà mỗi lần sinh lại là một tổ hợp khác.
  const resources = [];
  const roleOfResource = [];
  const roleOffset = getRandomInt(0, ROLES.length - 1);
  for (let i = 1; i <= numResources; i++) {
    const role = ROLES[(roleOffset + i) % ROLES.length];
    const extras = getRandomSubset(
      SKILL_POOL.filter((name) => !role.skills.includes(name)),
      getRandomInt(0, 2)
    );

    const skills = [
      ...role.skills.map((name) => ({ name, level: getRandomInt(2, 4) })),
      ...extras.map((name) => ({ name, level: getRandomInt(1, 2) })),
    ];

    roleOfResource.push(role);
    resources.push({
      _id: `synth-res-${i}`,
      userId: `user-res-${i}`,
      userName: `Nhân sự ${i.toString().padStart(2, '0')}`,
      position: role.position,
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
  // Mỗi việc thuộc một trong ⌈n/10⌉ dự án — thiếu trường này thì không đo được chuyển
  // ngữ cảnh (S3), và thứ tự ứng viên của CSP không có gì để ưu tiên "cùng dự án".
  const numProjects = Math.max(1, Math.ceil(numTasks / 10));

  for (let i = 1; i <= numTasks; i++) {
    // Vai trò của việc lấy theo một người ngẫu nhiên trong đội: đội có nhiều người vai trò
    // nào thì nhận nhiều việc vai trò đó, và không có việc nào đòi vai trò đội không có.
    const role = roleOfResource[getRandomInt(0, numResources - 1)];
    const chosenSkills = getRandomSubset(role.skills, getRandomInt(1, Math.min(3, role.skills.length)));

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
      title: `${role.titles[getRandomInt(0, role.titles.length - 1)]} #${i}`,
      estimatedHours: getRandomInt(4, 24),
      requiredSkills,
      priority: ['low', 'medium', 'high', 'critical'][getRandomInt(0, 3)],
      status: 'todo',
      project: `synth-project-${getRandomInt(1, numProjects)}`,
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
  ROLES,
  SKILL_POOL,
};
