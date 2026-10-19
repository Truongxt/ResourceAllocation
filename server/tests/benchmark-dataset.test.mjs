/**
 * Bộ sinh dữ liệu tổng hợp của Benchmark.
 *
 * Trước đây kỹ năng của người và kỹ năng việc đòi được bốc độc lập từ 15 kỹ năng. Kết quả:
 * 26% việc ở bộ small không ai đạt ngưỡng H2 mặc định (0.5), nên CSP giải được 0/30 bộ
 * small. Số đo trên dữ liệu đó nói về bộ sinh, không nói về thuật toán.
 *
 * Giờ mỗi việc thuộc vai trò của một người có thật trong đội và đòi kỹ năng từ cụm kỹ năng
 * của vai trò đó. Bộ này giữ ba điều:
 *   1. Mọi việc đều có ít nhất một người đạt ngưỡng 0.5 (H2 không bao giờ làm rỗng miền).
 *   2. Vẫn còn lựa chọn: không phải ai cũng đạt mọi việc, nên thứ tự ứng viên còn ý nghĩa.
 *   3. Hình dạng dữ liệu giữ nguyên cho Benchmark Studio.
 */

import { createRequire } from 'module';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { generateBenchmarkDataset, ROLES } = require('../src/algorithms/benchmark/datasetGenerator');
const { computeSkillMatch } = require('../src/algorithms/scoring');

const RUNS = 40;
const DEFAULT_THRESHOLD = 0.5;

// ══════════════════════════════════════════════
S('Mọi việc đều có người đạt ngưỡng H2 mặc định');
for (const scale of ['small', 'medium', 'large', { taskCount: 12, resourceCount: 2 }]) {
  let unmatched = 0;
  let total = 0;
  for (let k = 0; k < RUNS; k++) {
    const d = generateBenchmarkDataset(scale);
    for (const task of d.tasks) {
      total++;
      if (!d.resources.some((r) => computeSkillMatch(task, r) >= DEFAULT_THRESHOLD)) unmatched++;
    }
    if (scale === 'large' && k >= 4) break; // bộ large to, vài lượt là đủ
  }
  ok(unmatched === 0, `${JSON.stringify(scale)}: 0 việc không ai đạt ${DEFAULT_THRESHOLD}`, `${unmatched}/${total}`);
}

// ══════════════════════════════════════════════
S('Vẫn còn lựa chọn giữa các ứng viên');
{
  let pairs = 0;
  let qualified = 0;
  const scores = new Set();
  for (let k = 0; k < RUNS; k++) {
    const d = generateBenchmarkDataset('medium');
    for (const task of d.tasks) {
      for (const r of d.resources) {
        const m = computeSkillMatch(task, r);
        pairs++;
        if (m >= DEFAULT_THRESHOLD) qualified++;
        scores.add(m.toFixed(2));
      }
    }
  }
  const share = qualified / pairs;
  ok(share > 0.05 && share < 0.6, 'Tỉ lệ cặp (việc, người) đạt ngưỡng nằm giữa, không phải ai cũng hợp mọi việc',
    `${(share * 100).toFixed(1)}%`);
  ok(scores.size >= 10, 'Điểm khớp kỹ năng trải nhiều mức (S1 có cái để chọn)', `${scores.size} mức`);
}

// ══════════════════════════════════════════════
S('Việc đòi kỹ năng từ đúng một vai trò có trong đội');
{
  let bad = 0;
  for (let k = 0; k < RUNS; k++) {
    const d = generateBenchmarkDataset('small');
    const teamRoles = new Set(d.resources.map((r) => r.position));
    for (const task of d.tasks) {
      const fits = ROLES.some((role) => teamRoles.has(role.position)
        && task.requiredSkills.every((s) => role.skills.includes(s.name)));
      if (!fits) bad++;
    }
  }
  ok(bad === 0, 'Mọi việc nằm trọn trong cụm kỹ năng của một vai trò có người đảm nhận', `${bad} việc lệch`);
}

// ══════════════════════════════════════════════
S('Hình dạng dữ liệu');
{
  const d = generateBenchmarkDataset('small');
  ok(d.tasks.length === 20 && d.resources.length === 5, 'small = 20 việc, 5 người');
  ok(d.taskCount === 20 && d.resourceCount === 5 && typeof d.label === 'string', 'Có taskCount, resourceCount, label');
  const t = d.tasks[0];
  ok(t._id && t.title && t.estimatedHours > 0 && t.project && t.startDate < t.endDate, 'Việc có _id, title, giờ, dự án, khoảng ngày');
  ok(t.requiredSkills.length >= 1 && t.requiredSkills.length <= 3
    && t.requiredSkills.every((s) => s.level >= 1 && s.level <= 3 && s.weight >= 0.5 && s.weight <= 1),
    'Việc đòi 1–3 kỹ năng, cấp 1–3, trọng số 0.5–1');
  const r = d.resources[0];
  ok(r._id && r.userName && r.position && r.maxCapacity === 40 && r.fte === 1 && r.availability === 'available',
    'Người có _id, tên, vị trí, capacity 40h');
  ok(new Set(r.skills.map((s) => s.name)).size === r.skills.length, 'Kỹ năng của một người không trùng tên');
  const custom = generateBenchmarkDataset({ taskCount: 7, resourceCount: 3 });
  ok(custom.tasks.length === 7 && custom.resources.length === 3, 'Cấu hình tùy chỉnh giữ đúng số lượng');
}

summary();
