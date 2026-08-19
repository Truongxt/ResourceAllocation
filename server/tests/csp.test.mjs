/**
 * Kiểm thử CSPSolver ở mức đơn vị, tập trung vào ràng buộc H4 (Dependency).
 *
 * Bộ này không cần server hay database: nạp thẳng class và cho chạy trên dữ liệu
 * dựng sẵn, nhờ vậy khẳng định được đúng hành vi của thuật toán chứ không phải
 * của cả đường đi HTTP.
 */

import { createRequire } from 'module';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const CSPSolver = require('../src/algorithms/csp/CSPSolver');

const day = (d) => new Date(`2026-03-${String(d).padStart(2, '0')}T00:00:00.000Z`);

/** Task rút gọn: chỉ những trường thuật toán thực sự đọc. */
const task = (id, from, to, dependencies = []) => ({
  _id: id,
  title: `Task ${id}`,
  estimatedHours: 8,
  requiredSkills: [],
  startDate: day(from),
  endDate: day(to),
  dependencies,
});

const resource = (id, overrides = {}) => ({
  _id: id,
  userName: `Người ${id}`,
  position: 'Developer',
  skills: [],
  maxCapacity: 40,
  fte: 1,
  hourlyRate: 20,
  availability: 'available',
  unavailablePeriods: [],
  ...overrides,
});

/** Task cần một kỹ năng hiếm, dùng để ép miền về đúng một nhân sự. */
const needing = (id, from, to, skill, dependencies = []) => ({
  ...task(id, from, to, dependencies),
  requiredSkills: [{ name: skill, level: 3, weight: 1 }],
});

const solver = () => new CSPSolver({ timeout: 5000 });
const assignedTo = (result, taskId) =>
  result.assignments.find((a) => a.task === taskId)?.resource;
const depEntries = (result, bucket) =>
  result.constraintReport.details[bucket].filter((d) => d.type === 'dependency');

// ══════════════════════════════════════════════
S('H4 — hai việc phụ thuộc nhau, lịch chồng nhau');
{
  // B phụ thuộc A; A: 01–10/03, B: 05–15/03 → chồng 5 ngày.
  const tasks = [task('A', 1, 10), task('B', 5, 15, ['A'])];
  const result = await solver().solve(tasks, [resource('R1'), resource('R2')]);

  ok(result.success, 'Vẫn tìm được lời giải khi có đủ người');
  ok(
    assignedTo(result, 'A') !== assignedTo(result, 'B'),
    'Hai việc chồng lịch được giao cho hai người khác nhau',
    `A→${assignedTo(result, 'A')}, B→${assignedTo(result, 'B')}`
  );
}

{
  // Chỉ có một người: không thể vừa làm A vừa làm B → vô nghiệm.
  const tasks = [task('A', 1, 10), task('B', 5, 15, ['A'])];
  const result = await solver().solve(tasks, [resource('R1')]);

  ok(!result.success, 'Chỉ có một người thì bài toán vô nghiệm');
  ok(
    /không tìm thấy giải pháp/i.test(result.message || ''),
    'Báo đúng lý do vô nghiệm',
    result.message
  );
}

// ══════════════════════════════════════════════
S('H4 — phụ thuộc đúng thứ tự thì không ràng buộc gì thêm');
{
  // A kết thúc đúng lúc B bắt đầu: chạm mốc chứ không chồng lịch.
  const tasks = [task('A', 1, 10), task('B', 10, 20, ['A'])];
  const result = await solver().solve(tasks, [resource('R1')]);

  ok(result.success, 'Một người làm tuần tự hai việc nối tiếp → có lời giải');
  ok(
    assignedTo(result, 'A') === assignedTo(result, 'B'),
    'Không cấm cùng một người khi hai việc không chồng lịch'
  );
  ok(depEntries(result, 'violated').length === 0, 'Không báo vi phạm phụ thuộc');
  ok(depEntries(result, 'satisfied').length === 1, 'Ghi nhận 1 quan hệ phụ thuộc đúng thứ tự');
}

// ══════════════════════════════════════════════
S('H4 — vi phạm thứ tự ngày được báo lại, không làm vô nghiệm');
{
  // B bắt đầu 05/03 trong khi A tới 10/03 mới xong → sai thứ tự 5 ngày.
  const tasks = [task('A', 1, 10), task('B', 5, 15, ['A'])];
  const result = await solver().solve(tasks, [resource('R1'), resource('R2')]);
  const violations = depEntries(result, 'violated');

  ok(violations.length === 1, 'Báo đúng 1 vi phạm thứ tự phụ thuộc');
  ok(
    violations[0]?.subject === 'Task A → Task B',
    'Nêu rõ cặp công việc nào',
    violations[0]?.subject
  );
  ok(
    /5 ngày/.test(violations[0]?.detail || ''),
    'Nêu rõ lệch bao nhiêu ngày',
    violations[0]?.detail
  );
  ok(
    result.success,
    'Vi phạm về ngày không làm bài toán vô nghiệm (thuật toán không đổi được ngày)'
  );
}

// ══════════════════════════════════════════════
S('H4 — các trường hợp biên');
{
  // Tiền nhiệm không nằm trong tập đang tối ưu (đã done, hoặc khác dự án).
  const tasks = [task('A', 1, 10, ['KHONG_TON_TAI']), task('B', 5, 15)];
  const result = await solver().solve(tasks, [resource('R1')]);

  ok(result.success, 'Bỏ qua tiền nhiệm ngoài tập, vẫn giải được');
  ok(depEntries(result, 'violated').length === 0, 'Không báo vi phạm cho tiền nhiệm ngoài tập');
}

{
  // Task thiếu ngày tháng: không xác định được chồng lịch nên không ràng buộc.
  const tasks = [
    { _id: 'A', title: 'Task A', estimatedHours: 8, requiredSkills: [], dependencies: [] },
    { _id: 'B', title: 'Task B', estimatedHours: 8, requiredSkills: [], dependencies: ['A'] },
  ];
  const result = await solver().solve(tasks, [resource('R1')]);

  ok(result.success, 'Task không có ngày tháng vẫn giải được');
  ok(
    result.constraintReport.details.violated.every((d) => d.type !== 'dependency'),
    'Không suy đoán vi phạm khi thiếu ngày tháng'
  );
}

{
  // Chuỗi 3 việc chồng nhau từng đôi một → cần đúng 3 người.
  const tasks = [task('A', 1, 10), task('B', 5, 15, ['A']), task('C', 12, 20, ['B'])];

  const withThree = await solver().solve(tasks, [resource('R1'), resource('R2'), resource('R3')]);
  ok(withThree.success, 'Chuỗi 3 việc chồng nhau: 3 người thì giải được');

  const ids = new Set(['A', 'B', 'C'].map((t) => String(assignedTo(withThree, t))));
  ok(ids.size === 3, 'Mỗi việc một người khác nhau', [...ids].join(', '));

  // A và C không chồng lịch (A xong 10/03, C bắt đầu 12/03) nên 2 người là đủ.
  const withTwo = await solver().solve(tasks, [resource('R1'), resource('R2')]);
  ok(withTwo.success, 'Hai người vẫn đủ vì A và C không chồng lịch');
  ok(
    assignedTo(withTwo, 'A') === assignedTo(withTwo, 'C'),
    'A và C dồn về cùng một người'
  );
}

// ══════════════════════════════════════════════
S('H3 — lịch nghỉ của nhân sự');
// ══════════════════════════════════════════════
{
  // Task 05–15/03. R1 nghỉ 10–12/03 (giao) → chỉ còn R2 nhận được việc.
  const tasks = [task('A', 5, 15)];
  const onLeave = resource('R1', {
    unavailablePeriods: [{ startDate: day(10), endDate: day(12), reason: 'Nghỉ phép' }],
  });
  const result = await solver().solve(tasks, [onLeave, resource('R2')]);

  ok(result.success, 'Vẫn giải được khi còn người khác rảnh');
  ok(assignedTo(result, 'A') === 'R2', 'Không giao việc cho người đang nghỉ trong kỳ đó');
}

{
  // Kỳ nghỉ nằm ngoài thời gian task → không ảnh hưởng.
  const tasks = [task('A', 5, 15)];
  const onLeaveLater = resource('R1', {
    unavailablePeriods: [{ startDate: day(20), endDate: day(25), reason: 'Công tác' }],
  });
  const result = await solver().solve(tasks, [onLeaveLater]);

  ok(result.success, 'Kỳ nghỉ không giao với task thì không loại nhân sự');
  ok(assignedTo(result, 'A') === 'R1', 'Vẫn giao việc như bình thường');
}

{
  // Kỳ nghỉ chạm đúng ngày bắt đầu task: vẫn chung một ngày nên bị loại.
  const tasks = [task('A', 10, 15)];
  const touching = resource('R1', {
    unavailablePeriods: [{ startDate: day(5), endDate: day(10) }],
  });
  const result = await solver().solve(tasks, [touching]);

  ok(!result.success, 'Kỳ nghỉ chạm ngày bắt đầu task vẫn tính là bận (biên đóng)');
  ok(
    (result.infeasibleTasks || []).length === 1,
    'Báo rõ task nào không có ai nhận',
    (result.infeasibleTasks || []).join(', ')
  );
}

{
  // Nhiều kỳ nghỉ: chỉ cần một kỳ giao với task là bị loại.
  const tasks = [task('A', 5, 15)];
  const many = resource('R1', {
    unavailablePeriods: [
      { startDate: day(1), endDate: day(2) },
      { startDate: day(12), endDate: day(13) },
      { startDate: day(25), endDate: day(26) },
    ],
  });
  const result = await solver().solve(tasks, [many, resource('R2')]);

  ok(assignedTo(result, 'A') === 'R2', 'Một kỳ nghỉ giao với task là đủ để loại');
}

{
  // availability = 'unavailable' loại nhân sự khỏi mọi task, không cần kỳ nghỉ nào.
  const tasks = [task('A', 5, 15)];
  const result = await solver().solve(tasks, [resource('R1', { availability: 'unavailable' })]);

  ok(!result.success, "availability='unavailable' loại nhân sự khỏi mọi task");
}

// ══════════════════════════════════════════════
S('AC-3 — lan truyền ràng buộc H4');
// ══════════════════════════════════════════════
{
  // A chỉ R0 làm được (kỹ năng hiếm). B phụ thuộc A, chồng lịch, ai cũng làm được.
  // AC-3 phải loại R0 khỏi miền của B trước khi backtracking bắt đầu.
  const tasks = [needing('A', 1, 10, 'COBOL'), task('B', 5, 15, ['A'])];
  const resources = [resource('R0', { skills: [{ name: 'COBOL', level: 4 }] }), resource('R1')];

  const domains = solver().buildFeasibleDomains(tasks, resources);
  ok(JSON.stringify(domains[0]) === '[0]', 'A bị ép về đúng một nhân sự', JSON.stringify(domains[0]));
  ok(JSON.stringify(domains[1]) === '[1]', 'AC-3 loại nhân sự đó khỏi miền của B', JSON.stringify(domains[1]));
}

{
  // Dây chuyền: A={R0}. B xung đột A → còn {R1}. C xung đột B → còn {R2}.
  // Chỉ lan truyền được nếu AC-3 đẩy lại cung sau mỗi lần cắt.
  const tasks = [
    needing('A', 1, 10, 'COBOL'),
    needing('B', 5, 15, 'Java', ['A']),
    needing('C', 8, 20, 'Java', ['B']),
  ];
  const resources = [
    resource('R0', { skills: [{ name: 'COBOL', level: 4 }, { name: 'Java', level: 4 }] }),
    resource('R1', { skills: [{ name: 'Java', level: 4 }] }),
    resource('R2', { skills: [{ name: 'Java', level: 4 }] }),
  ];

  const domains = solver().buildFeasibleDomains(tasks, resources);
  ok(JSON.stringify(domains[0]) === '[0]', 'Dây chuyền: A = {R0}', JSON.stringify(domains[0]));
  ok(JSON.stringify(domains[1]) === '[1,2]', 'B mất R0', JSON.stringify(domains[1]));
  ok(
    JSON.stringify(domains[2]) === '[0,1,2]',
    'C chưa cắt được vì B còn hai lựa chọn — giới hạn của arc consistency trên ràng buộc ≠',
    JSON.stringify(domains[2])
  );
}

{
  // Lan truyền hai bước: A={R0} ép B về {R1}, rồi chính B={R1} ép C về {R2}.
  const tasks = [
    needing('A', 1, 10, 'COBOL'),
    needing('B', 5, 15, 'Java', ['A']),
    needing('C', 8, 20, 'Java', ['B']),
  ];
  const resources = [
    resource('R0', { skills: [{ name: 'COBOL', level: 4 }, { name: 'Java', level: 4 }] }),
    resource('R1', { skills: [{ name: 'Java', level: 4 }] }),
    resource('R2', { skills: [{ name: 'Java', level: 4 }] }),
  ];
  // Kỳ nghỉ 05–07/03 chỉ giao với B (05–15) chứ không giao với C (08–20),
  // nên B mất R2 còn C vẫn giữ đủ ba lựa chọn ban đầu.
  resources[2].unavailablePeriods = [{ startDate: day(5), endDate: day(7) }];

  const domains = solver().buildFeasibleDomains(tasks, resources);
  ok(JSON.stringify(domains[1]) === '[1]', 'B bị ép về một giá trị', JSON.stringify(domains[1]));
  ok(
    JSON.stringify(domains[2]) === '[0,2]',
    'Rồi chính B lan tiếp sang C — cung được đẩy lại sau mỗi lần cắt',
    JSON.stringify(domains[2])
  );
}

{
  // Cả hai task đều chỉ có R0 làm được, mà lại xung đột nhau → vô nghiệm.
  // AC-3 phát hiện ngay, không cần backtrack tới lúc hết giờ.
  const tasks = [needing('A', 1, 10, 'COBOL'), needing('B', 5, 15, 'COBOL', ['A'])];
  const resources = [resource('R0', { skills: [{ name: 'COBOL', level: 4 }] }), resource('R1')];

  const result = await solver().solve(tasks, resources);
  ok(!result.success, 'Hai việc xung đột cùng cần một người → vô nghiệm');
  ok(
    /ràng buộc quá chặt/i.test(result.message || ''),
    'Báo là ràng buộc quá chặt, không phải "không có nhân sự phù hợp"',
    result.message
  );
  ok((result.infeasibleTasks || []).length === 1, 'Nêu đúng task bị kẹt',
    (result.infeasibleTasks || []).join(', '));
  ok(result.iterations === 0, 'Không tốn một vòng backtracking nào', `(${result.iterations})`);
}

{
  // Không biến nào bị ép về một giá trị → AC-3 không cắt được gì. Ghi lại cho rõ
  // đây là giới hạn của arc consistency trên ≠, không phải lỗi.
  const tasks = [task('A', 1, 10), task('B', 5, 15, ['A'])];
  const resources = [resource('R0'), resource('R1')];

  const domains = solver().buildFeasibleDomains(tasks, resources);
  ok(
    domains.every((d) => d.length === 2),
    'Hai biến cùng hai lựa chọn: AC-3 không cắt được giá trị nào'
  );
}

{
  // Node consistency (capacity) là bước riêng, không phụ thuộc H4.
  const heavy = { ...task('A', 1, 10), estimatedHours: 100 };
  const result = await solver().solve([heavy], [resource('R0', { maxCapacity: 40, fte: 1 })]);

  ok(!result.success, 'Task nặng hơn capacity của mọi nhân sự → vô nghiệm');
  ok((result.infeasibleTasks || []).length === 1, 'Báo rõ task nào không xếp được');
}

{
  // Báo cáo lan truyền để đối chiếu được, thay vì chỉ tin là nó có chạy.
  const tasks = [needing('A', 1, 10, 'COBOL'), task('B', 5, 15, ['A'])];
  const resources = [resource('R0', { skills: [{ name: 'COBOL', level: 4 }] }), resource('R1')];
  const result = await solver().solve(tasks, resources);

  ok(result.propagation?.prunedValues === 1, 'Đếm đúng số giá trị bị AC-3 cắt',
    `(${result.propagation?.prunedValues})`);
  ok(result.propagation?.arcs === 2, 'Đếm đúng số cung (mỗi cặp xung đột là hai chiều)',
    `(${result.propagation?.arcs})`);
}

process.exit(summary() === 0 ? 0 : 1);
