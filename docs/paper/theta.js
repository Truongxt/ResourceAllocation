// Chạy: RAO=<thư mục gốc dự án> node theta.js
// GA vs Hybrid với θ ∈ {0, 0.25, 0.5}, cùng tham số GA và cùng dữ liệu; lưu lịch sử hội tụ.
const R = process.env.RAO + '/server/src/algorithms/';
const GA = require(R + 'genetic/GeneticAlgorithm');
const CSP = require(R + 'csp/CSPSolver');
const { generateBenchmarkDataset } = require(R + 'benchmark/datasetGenerator');
const BASE_DATE = new Date('2026-10-08T14:00:00+07:00');
const seeded = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
(async () => {
  Math.random = seeded(20261121);
  const opts = { populationSize: 80, maxGenerations: 250, crossoverRate: 0.8, mutationRate: 0.1 };
  const out = {};
  for (const scale of ['small', 'medium']) {
    out[scale] = [];
    for (let k = 0; k < 30; k++) {
      const { tasks, resources } = generateBenchmarkDataset(scale, { baseDate: BASE_DATE });
      const row = {};
      const pack = (r, extra = {}) => ({ f: r.fitness, s: r.metrics.averageSkillMatch, sig: r.metrics.workloadVariance, o: r.metrics.overallocatedResources,
        cg: r.metrics.convergenceGeneration, gen: r.generations, ms: r.executionTime, hist: r.convergenceHistory, ...extra });
      row.ga = pack(await new GA(opts).optimize(tasks, resources));
      for (const th of [0, 0.25, 0.5]) {
        const domains = new CSP({ minSkillMatchThreshold: th }).buildFeasibleDomains(tasks, resources);
        const h = await new GA(opts).optimize(tasks, resources, { domains });
        row['hy' + th] = pack(h, { pairs: h.domainReduction.feasiblePairs / h.domainReduction.totalPairs, reopened: h.domainReduction.tasksReopened });
      }
      out[scale].push(row);
      process.stderr.write(`${scale} ${k + 1}\n`);
    }
  }
  require('fs').writeFileSync(__dirname + '/theta.json', JSON.stringify(out));
})();
