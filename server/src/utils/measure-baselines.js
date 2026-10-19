/**
 * So sánh bốn cách phân bổ trên cùng dữ liệu: Greedy (mốc so sánh — quy tắc phân công tay
 * "người hợp kỹ năng nhất, đang rảnh nhất"), CSP, GA và Hybrid. Đúng bộ chạy của Benchmark
 * Studio (`runComparativeBenchmark`), chỉ khác là lặp trên nhiều bộ dữ liệu rồi lấy trung bình.
 *
 *   npm run measure:baselines                 # 30 bộ mỗi cỡ
 *   npm run measure:baselines -- 10           # số bộ mỗi cỡ
 *
 * Tái tạo được: dữ liệu sinh với seed và ngày mốc cố định, và `Math.random` được gieo seed suốt
 * lần đo nên GA/Hybrid cũng ra cùng số. Riêng thời gian chạy phụ thuộc máy.
 *
 * CSP có thể không giải được một bộ (vô nghiệm hoặc hết ngân sách tìm kiếm). Số trung bình của
 * CSP chỉ lấy trên các bộ nó giải được; ba cột còn lại luôn gán đủ việc nên lấy trên mọi bộ.
 */

const { runComparativeBenchmark } = require('../algorithms/benchmark/benchmarkRunner');
const { generateBenchmarkDataset } = require('../algorithms/benchmark/datasetGenerator');

/** Cùng ngày mốc với `measure-csp-soft.js`. */
const BASE_DATE = new Date('2026-10-08T14:00:00+07:00');
const ALGORITHMS = [
  ['greedy', 'Greedy (mốc)'],
  ['csp', 'CSP'],
  ['genetic', 'GA'],
  ['hybrid', 'Hybrid'],
];

/** mulberry32 — như `measure-csp-soft.js`. */
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const mean = (values) => values.reduce((s, v) => s + v, 0) / (values.length || 1);

const measure = async (scale, count) => {
  const rows = Object.fromEntries(ALGORITHMS.map(([key]) => [key, []]));
  for (let k = 0; k < count; k++) {
    const { tasks, resources } = generateBenchmarkDataset(scale, { baseDate: BASE_DATE });
    const { results } = await runComparativeBenchmark(tasks, resources);
    for (const [key] of ALGORITHMS) {
      const r = results[key];
      const solved = !r.error && r.assignedCount === tasks.length && !r.constraintViolations;
      // Với CSP, "không giải được" là kết quả chứ không phải lỗi của lần đo.
      if (key === 'csp' ? solved : !r.error) rows[key].push(r);
    }
  }
  return rows;
};

const main = async () => {
  const count = parseInt(process.argv[2], 10) || 30;
  const original = Math.random;
  Math.random = seeded(20261019);
  try {
    console.log(`Greedy / CSP / GA / Hybrid, ${count} bộ mỗi cỡ, ngày mốc ${BASE_DATE.toISOString().slice(0, 10)}\n`);
    console.log('| Cỡ | Thuật toán | Fitness | Khớp kỹ năng (%) | σ tải (giờ) | Người quá tải | Chuyển ngữ cảnh | Thời gian (ms) | Số bộ |');
    console.log('|---|---|---|---|---|---|---|---|---|');
    for (const scale of ['small', 'medium']) {
      const rows = await measure(scale, count);
      for (const [key, label] of ALGORITHMS) {
        const list = rows[key];
        const avg = (field, digits) => mean(list.map((r) => r[field] || 0)).toFixed(digits);
        console.log(`| ${scale} | ${label} | ${avg('fitness', 3)} | ${avg('skillMatchRate', 1)} | ${avg('workloadStdDev', 1)} | ${avg('overallocationCount', 2)} | ${avg('contextSwitches', 1)} | ${avg('executionTime', 0)} | ${list.length}/${count} |`);
      }
    }
  } finally {
    Math.random = original;
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
