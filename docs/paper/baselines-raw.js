// Chạy: RAO=<thư mục gốc dự án> node baselines-raw.js
// Bản sao đúng logic measure-baselines.js (seed 20261019, ngày mốc 08/10/2026), lưu kết quả từng bộ.
const R = process.env.RAO + '/server/src/algorithms/';
const { runComparativeBenchmark } = require(R + 'benchmark/benchmarkRunner');
const { generateBenchmarkDataset } = require(R + 'benchmark/datasetGenerator');
const BASE_DATE = new Date('2026-10-08T14:00:00+07:00');
const seeded = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
(async () => {
  Math.random = seeded(20261019);
  const out = {};
  for (const scale of ['small', 'medium']) {
    out[scale] = [];
    for (let k = 0; k < 30; k++) {
      const { tasks, resources } = generateBenchmarkDataset(scale, { baseDate: BASE_DATE });
      const { results } = await runComparativeBenchmark(tasks, resources);
      const row = {};
      for (const key of ['greedy', 'csp', 'genetic', 'hybrid']) {
        const r = results[key];
        row[key] = { f: r.fitness, s: r.skillMatchRate, sig: r.workloadStdDev, o: r.overallocationCount, cs: r.contextSwitches, ms: r.executionTime,
          solved: !r.error && r.assignedCount === tasks.length && !r.constraintViolations };
      }
      out[scale].push(row);
      process.stderr.write(`${scale} ${k + 1}\n`);
    }
  }
  require('fs').writeFileSync(__dirname + '/baselines-raw.json', JSON.stringify(out));
})();
