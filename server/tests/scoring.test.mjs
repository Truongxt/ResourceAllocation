/**
 * Kiểm thử đơn vị cho `src/algorithms/scoring.js` — thang điểm dùng chung của GA và CSP.
 *
 * Trọng tâm là `computeSkillMatch`: công thức này quyết định 35% fitness (trọng số
 * mặc định), và là chỗ duy nhất `weight` của từng kỹ năng yêu cầu có tác dụng.
 * Không cần server hay database.
 */

import { createRequire } from 'module';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { computeSkillMatch, capacityOf, effortOf } = require('../src/algorithms/scoring');

/** Làm tròn để so sánh số thực cho gọn. */
const round = (n) => Math.round(n * 1000) / 1000;

const task = (requiredSkills) => ({ _id: 't', title: 'T', requiredSkills });
const dev = (skills) => ({ _id: 'r', skills });

// ══════════════════════════════════════════════
S('Điểm khớp kỹ năng — trường hợp cơ bản');
{
  ok(computeSkillMatch(task([]), dev([{ name: 'React', level: 4 }])) === 1,
    'Task không yêu cầu kỹ năng nào → khớp tuyệt đối');

  ok(computeSkillMatch(task([{ name: 'React', level: 3 }]), dev([{ name: 'React', level: 3 }])) === 1,
    'Đúng mức yêu cầu → 1');

  ok(computeSkillMatch(task([{ name: 'React', level: 3 }]), dev([{ name: 'React', level: 4 }])) === 1,
    'Vượt mức yêu cầu vẫn là 1, không thưởng thêm');

  ok(computeSkillMatch(task([{ name: 'React', level: 4 }]), dev([{ name: 'Vue', level: 4 }])) === 0,
    'Không có kỹ năng được yêu cầu → 0');

  ok(computeSkillMatch(task([{ name: 'React', level: 4 }]), dev([{ name: 'React', level: 2 }])) === 0.5,
    'Có một nửa mức yêu cầu → 0.5');

  ok(computeSkillMatch(task([{ name: 'react', level: 2 }]), dev([{ name: 'REACT', level: 2 }])) === 1,
    'So khớp tên không phân biệt hoa thường');

  ok(computeSkillMatch(task([{ name: 'React', level: 2 }]), dev([])) === 0,
    'Nhân sự chưa có kỹ năng nào → 0');
}

// ══════════════════════════════════════════════
S('Trọng số (weight) — thứ mà form Task cho phép đặt');
{
  const skills = dev([{ name: 'React', level: 4 }, { name: 'SQL', level: 1 }]);

  // Cùng dữ liệu nhân sự, chỉ đổi weight của kỹ năng yếu.
  const equal = computeSkillMatch(
    task([{ name: 'React', level: 4, weight: 1 }, { name: 'SQL', level: 4, weight: 1 }]),
    skills
  );
  const sqlMinor = computeSkillMatch(
    task([{ name: 'React', level: 4, weight: 1 }, { name: 'SQL', level: 4, weight: 0.2 }]),
    skills
  );

  ok(round(equal) === 0.625, 'Hai kỹ năng cùng trọng số: (4+1)/(4+4) = 0.625', `(${round(equal)})`);
  // (1×4 + 0.2×1) / (1×4 + 0.2×4) = 4.2 / 4.8
  ok(round(sqlMinor) === 0.875,
    'Hạ trọng số kỹ năng yếu xuống 0.2 → điểm tăng lên 0.875',
    `(${round(sqlMinor)})`);
  ok(sqlMinor > equal, 'Trọng số thực sự đổi kết quả, không phải trang trí');

  const zeroWeight = computeSkillMatch(
    task([{ name: 'React', level: 4, weight: 1 }, { name: 'SQL', level: 4, weight: 0 }]),
    skills
  );
  ok(zeroWeight === 1, 'Trọng số 0 loại hẳn kỹ năng đó khỏi công thức');

  const missing = computeSkillMatch(task([{ name: 'React', level: 4 }]), skills);
  ok(missing === 1, 'Thiếu weight thì mặc định là 1');
}

// ══════════════════════════════════════════════
S('Giới hạn thang điểm');
{
  // Cả hai thang nay đều là 1-4, nên không tạo mới được yêu cầu Lv.5. Nhưng bản ghi
  // cũ trong DB có thể còn, và hàm chấm điểm vẫn phải xử lý được thay vì vỡ —
  // dọn dứt điểm bằng `npm run migrate:skill-level`.
  const legacy = computeSkillMatch(
    task([{ name: 'React', level: 5 }]),
    dev([{ name: 'React', level: 4 }])
  );
  ok(legacy === 0.8,
    'Bản ghi cũ còn Lv.5 vẫn chấm được, nhân sự giỏi nhất đạt 0.8 — lý do phải migrate',
    `(${legacy})`);

  const topOfScale = computeSkillMatch(
    task([{ name: 'React', level: 4 }]),
    dev([{ name: 'React', level: 4 }])
  );
  ok(topOfScale === 1,
    'Trên thang mới, mức cao nhất của yêu cầu khớp tuyệt đối với nhân sự giỏi nhất',
    `(${topOfScale})`);

  const allZero = computeSkillMatch(
    task([{ name: 'React', level: 3, weight: 0 }]),
    dev([{ name: 'React', level: 3 }])
  );
  ok(allZero === 0, 'Tổng trọng số bằng 0 → trả 0, không chia cho 0');
}

// ══════════════════════════════════════════════
S('Capacity và effort');
{
  ok(capacityOf({ maxCapacity: 40, fte: 0.5 }) === 20, 'capacity = maxCapacity × FTE');
  ok(capacityOf({}) === 40, 'Thiếu dữ liệu → mặc định 40h, FTE 1');
  ok(effortOf({ estimatedHours: 12 }) === 12, 'effort lấy theo estimatedHours');
  ok(effortOf({}) === 1, 'Task không có estimatedHours tính là 1h để không bị bỏ qua khi cân tải');
}

process.exit(summary() === 0 ? 0 : 1);
