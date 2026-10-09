/**
 * Đo tác dụng của ràng buộc mềm S1/S3 trong CSP (ALGORITHMS.md mục 2.3).
 *
 *   npm run measure:csp-soft                 # 30 bộ mỗi cỡ, ngưỡng 0.5 và 0
 *   npm run measure:csp-soft -- 10           # số bộ mỗi cỡ
 *
 * "Trước" là thứ tự thử ứng viên chỉ xét chỗ trống của tuần nặng nhất (LCV, trước `1c73ee0`);
 * "sau" là `_orderCandidates` hiện tại. Mọi phần khác của bộ giải giữ nguyên, nên chênh lệch
 * chỉ do thứ tự. Dữ liệu sinh một lần bằng bộ sinh của Benchmark với seed cố định — chạy lại ra
 * đúng số cũ — và CSP tất định nên mỗi bộ chỉ cần chạy một lần. Số trung bình chỉ lấy trên các
 * bộ mà **cả hai** bản cùng giải được, để so cặp.
 */

const CSPSolver = require('../algorithms/csp/CSPSolver');

/** Bộ giải "trước": thứ tự ứng viên chỉ theo chỗ trống, đúng bản trước `1c73ee0`. */
class LcvOnlySolver extends CSPSolver {
  _orderCandidates(varIdx, domains, resources, loads) {
    const remainingOf = (rIdx) => {
      const capacity = (resources[rIdx].maxCapacity || 40) * (resources[rIdx].fte || 1);
      return capacity - this._peakOf(loads[rIdx]);
    };
    return [...domains[varIdx]].sort((a, b) => remainingOf(b) - remainingOf(a));
  }
}

/** mulberry32 — đủ tốt cho dữ liệu thử, và tái lập được. */
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Sinh `count` bộ cỡ `scale` với Math.random đã gieo seed; khôi phục Math.random sau đó. */
const makeDatasets = (scale, count, seed) => {
  // Nạp trễ để bộ sinh dùng đúng Math.random đang thay.
  const { generateBenchmarkDataset } = require('../algorithms/benchmark/datasetGenerator');
  const original = Math.random;
  Math.random = seeded(seed);
  try {
    return Array.from({ length: count }, () => generateBenchmarkDataset(scale));
  } finally {
    Math.random = original;
  }
};

const mean = (values) => values.reduce((s, v) => s + v, 0) / (values.length || 1);

const measure = async (datasets, threshold) => {
  const pairs = [];
  let solvedBefore = 0;
  let solvedAfter = 0;
  for (const { tasks, resources } of datasets) {
    const options = { timeout: 10000, minSkillMatchThreshold: threshold };
    const before = await new LcvOnlySolver(options).solve(tasks, resources);
    const after = await new CSPSolver(options).solve(tasks, resources);
    if (before.success) solvedBefore++;
    if (after.success) solvedAfter++;
    if (before.success && after.success) pairs.push([before, after]);
  }
  const pick = (side, fn) => mean(pairs.map((p) => fn(p[side])));
  const row = (fn, digits) => `${pick(0, fn).toFixed(digits)} → ${pick(1, fn).toFixed(digits)}`;
  return {
    skill: row((r) => r.metrics.averageSkillMatch, 0),
    switches: row((r) => r.metrics.contextSwitches, 1),
    fitness: row((r) => r.fitness, 3),
    sigma: row((r) => r.metrics.workloadVariance, 1),
    solved: `${solvedBefore} → ${solvedAfter}/${datasets.length}`,
    paired: pairs.length,
  };
};

const main = async () => {
  const count = parseInt(process.argv[2], 10) || 30;
  console.log(`CSP: thứ tự LCV → S1/S2/S3, ${count} bộ mỗi cỡ (so cặp trên các bộ cả hai cùng giải được)\n`);
  console.log('| | Khớp kỹ năng (%) | Chuyển ngữ cảnh | Fitness | Độ lệch tải σ (giờ) | Giải được | Số cặp |');
  console.log('|---|---|---|---|---|---|---|');
  for (const scale of ['medium', 'small']) {
    const datasets = makeDatasets(scale, count, scale === 'small' ? 20261008 : 20261009);
    for (const threshold of [0.5, 0]) {
      const r = await measure(datasets, threshold);
      console.log(`| ${scale}, ngưỡng ${threshold} | ${r.skill} | ${r.switches} | ${r.fitness} | ${r.sigma} | ${r.solved} | ${r.paired} |`);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
