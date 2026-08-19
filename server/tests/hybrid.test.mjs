/**
 * Kiểm thử bàn giao CSP → GA của thuật toán Hybrid, ở mức đơn vị.
 *
 * Điểm cần khẳng định: GA thật sự chạy trên miền giá trị đã được CSP thu hẹp.
 * Fitness của GA là ngẫu nhiên nên không assert theo con số; thứ kiểm được chắc
 * chắn là **mọi phân công đều nằm trong miền** — đó mới là hợp đồng giữa hai pha.
 */

import { createRequire } from 'module';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const CSPSolver = require('../src/algorithms/csp/CSPSolver');
const GeneticAlgorithm = require('../src/algorithms/genetic/GeneticAlgorithm');

const task = (id, requiredSkills = []) => ({
  _id: id,
  title: `Task ${id}`,
  estimatedHours: 8,
  requiredSkills,
});

const resource = (id, skills = [], overrides = {}) => ({
  _id: id,
  userName: `Người ${id}`,
  position: 'Developer',
  skills,
  maxCapacity: 40,
  fte: 1,
  hourlyRate: 20,
  availability: 'available',
  unavailablePeriods: [],
  ...overrides,
});

// Tham số nhỏ cho nhanh; bài toán bé nên vẫn hội tụ.
const ga = () => new GeneticAlgorithm({ populationSize: 30, maxGenerations: 40 });

/** Chỉ số resource của từng task trong kết quả GA. */
const indicesOf = (result, tasks, resources) =>
  tasks.map((t) => {
    const found = result.assignments.find((a) => a.task === t._id);
    return resources.findIndex((r) => r._id === found?.resource);
  });

// ══════════════════════════════════════════════
S('CSP thu hẹp miền giá trị');
{
  // R1 biết React, R2 biết Vue, R3 không biết gì. Task cần React lv4.
  const tasks = [task('A', [{ name: 'React', level: 4 }])];
  const resources = [
    resource('R1', [{ name: 'React', level: 4 }]),
    resource('R2', [{ name: 'Vue', level: 4 }]),
    resource('R3', []),
  ];

  const domains = new CSPSolver().buildFeasibleDomains(tasks, resources);
  ok(domains.length === 1, 'Trả về miền cho từng task');
  ok(
    JSON.stringify(domains[0]) === '[0]',
    'Chỉ nhân sự qua ngưỡng kỹ năng còn trong miền',
    JSON.stringify(domains[0])
  );
}

{
  // Không task nào yêu cầu kỹ năng → mọi nhân sự đều khả thi, miền không bị cắt.
  const tasks = [task('A'), task('B')];
  const resources = [resource('R1'), resource('R2')];
  const domains = new CSPSolver().buildFeasibleDomains(tasks, resources);

  ok(domains.every((d) => d.length === 2), 'Không có ràng buộc thì miền giữ nguyên toàn bộ');
}

{
  const domains = new CSPSolver().buildFeasibleDomains([], []);
  ok(Array.isArray(domains) && domains.length === 0, 'Dữ liệu rỗng → mảng rỗng, không lỗi');
}

// ══════════════════════════════════════════════
S('GA chạy trong miền được truyền vào');
{
  // 4 task đều cần React; chỉ R0 và R2 biết React.
  const tasks = ['A', 'B', 'C', 'D'].map((id) => task(id, [{ name: 'React', level: 3 }]));
  const resources = [
    resource('R0', [{ name: 'React', level: 4 }]),
    resource('R1', [{ name: 'Excel', level: 4 }]),
    resource('R2', [{ name: 'React', level: 3 }]),
    resource('R3', []),
  ];

  const domains = new CSPSolver().buildFeasibleDomains(tasks, resources);
  ok(JSON.stringify(domains[0]) === '[0,2]', 'CSP giữ lại đúng hai nhân sự biết React');

  const result = await ga().optimize(tasks, resources, { domains });
  const picked = indicesOf(result, tasks, resources);

  ok(result.success, 'GA chạy xong với miền đã lọc');
  ok(
    picked.every((r, t) => domains[t].includes(r)),
    'Mọi phân công đều nằm trong miền CSP đưa sang',
    `chọn: [${picked.join(', ')}]`
  );
  ok(
    picked.every((r) => r === 0 || r === 2),
    'Nhân sự không đủ kỹ năng không bao giờ được chọn'
  );
  ok(result.domainReduction.restricted === true, 'Kết quả ghi nhận có thu hẹp miền');
  ok(
    result.domainReduction.totalPairs === 16 && result.domainReduction.feasiblePairs === 8,
    'Báo đúng số cặp trước/sau khi lọc',
    `${result.domainReduction.feasiblePairs}/${result.domainReduction.totalPairs}`
  );
  ok(result.domainReduction.tasksReopened === 0, 'Không task nào phải mở lại miền');
}

{
  // Không truyền miền → GA giữ nguyên hành vi cũ, chọn tự do.
  const tasks = [task('A', [{ name: 'React', level: 3 }])];
  const resources = [resource('R0', [{ name: 'React', level: 4 }]), resource('R1', [])];
  const result = await ga().optimize(tasks, resources);

  ok(result.success, 'Không có miền thì GA vẫn chạy như trước');
  ok(result.domainReduction.restricted === false, 'Ghi nhận là không thu hẹp');
  ok(
    result.domainReduction.feasiblePairs === result.domainReduction.totalPairs,
    'Số cặp khả thi bằng toàn bộ không gian'
  );
}

// ══════════════════════════════════════════════
S('Miền rỗng — không được để GA bí');
{
  // Task B yêu cầu kỹ năng không ai có → miền rỗng.
  const tasks = [task('A'), task('B', [{ name: 'COBOL', level: 4 }])];
  const resources = [resource('R0', [{ name: 'React', level: 4 }]), resource('R1', [])];

  const domains = new CSPSolver().buildFeasibleDomains(tasks, resources);
  ok(domains[1].length === 0, 'CSP báo miền rỗng chứ không tự ý nới lỏng');

  const result = await ga().optimize(tasks, resources, { domains });
  ok(result.success, 'GA vẫn cho ra lời giải thay vì treo');
  ok(result.assignments.length === 2, 'Mọi task đều được gán người');
  ok(
    result.domainReduction.tasksReopened === 1,
    'Báo rõ có 1 task phải mở lại toàn bộ nhân sự',
    `(${result.domainReduction.tasksReopened})`
  );
}

{
  // Miền chứa chỉ số ngoài phạm vi (dữ liệu hỏng) thì bị lọc bỏ.
  const tasks = [task('A')];
  const resources = [resource('R0'), resource('R1')];
  const result = await ga().optimize(tasks, resources, { domains: [[0, 99, -1]] });
  const picked = indicesOf(result, tasks, resources);

  ok(picked[0] === 0, 'Chỉ số nằm ngoài danh sách nhân sự bị bỏ qua', `chọn: ${picked[0]}`);
}

process.exit(summary() === 0 ? 0 : 1);
