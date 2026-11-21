// Chạy: RAO=<thư mục gốc dự án> node ga-vs-hybrid.js 30 30   (Bảng II của bài báo)
// GA một mình vs Hybrid (miền từ CSP), CÙNG tham số GA, cùng dữ liệu, seed cố định.
const R = process.env.RAO + '/server/src/algorithms/';
const GA = require(R + 'genetic/GeneticAlgorithm');
const CSP = require(R + 'csp/CSPSolver');
const { generateBenchmarkDataset } = require(R + 'benchmark/datasetGenerator');
const BASE_DATE = new Date('2026-10-08T14:00:00+07:00');
const seeded = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
(async () => {
  Math.random = seeded(20261120);
  const plan = [['small', +process.argv[2] || 30], ['medium', +process.argv[3] || 10]];
  const all = {};
  for (const [scale, n] of plan) {
    const rows = { ga: [], hy: [] }; const red = [];
    for (let k = 0; k < n; k++) {
      const { tasks, resources } = generateBenchmarkDataset(scale, { baseDate: BASE_DATE });
      const opts = { populationSize: 80, maxGenerations: 250, crossoverRate: 0.8, mutationRate: 0.1 };
      const g = await new GA(opts).optimize(tasks, resources);
      const domains = new CSP().buildFeasibleDomains(tasks, resources);
      const h = await new GA(opts).optimize(tasks, resources, { domains });
      for (const [key, r] of [['ga', g], ['hy', h]]) rows[key].push({ f: r.fitness, s: r.metrics.averageSkillMatch, o: r.metrics.overallocatedResources, sig: r.metrics.workloadVariance, cg: r.metrics.convergenceGeneration, gen: r.generations, ms: r.executionTime });
      red.push(h.domainReduction);
      process.stderr.write(`${scale} ${k + 1}/${n}\n`);
    }
    console.log(`\n## ${scale} (${n} bộ)`);
    console.log('| | Fitness (TB ± ĐLC) | Khớp KN % | Quá tải | σ (giờ) | Hội tụ 90% (thế hệ) | Thế hệ dừng | ms |');
    for (const [key, name] of [['ga', 'GA'], ['hy', 'Hybrid']]) {
      const r = rows[key]; const c = (f) => r.map(f);
      console.log(`| ${name} | ${mean(c((x) => x.f)).toFixed(4)} ± ${sd(c((x) => x.f)).toFixed(4)} | ${mean(c((x) => x.s)).toFixed(1)} | ${mean(c((x) => x.o)).toFixed(2)} | ${mean(c((x) => x.sig)).toFixed(1)} | ${mean(c((x) => x.cg)).toFixed(1)} ± ${sd(c((x) => x.cg)).toFixed(1)} | ${mean(c((x) => x.gen)).toFixed(1)} | ${mean(c((x) => x.ms)).toFixed(0)} |`);
    }
    const wins = rows.hy.filter((x, i) => x.f > rows.ga[i].f).length, ties = rows.hy.filter((x, i) => x.f === rows.ga[i].f).length;
    console.log(`Hybrid > GA: ${wins}/${n}, bằng: ${ties}`);
    console.log(`Miền: cặp khả thi TB ${mean(red.map((d) => d.feasiblePairs / d.totalPairs * 100)).toFixed(1)}% tổng cặp; tasksReopened TB ${mean(red.map((d) => d.tasksReopened)).toFixed(2)}; mẫu ${JSON.stringify(red[0])}`);
    all[scale] = rows;
  }
  require('fs').writeFileSync(__dirname + '/ga-vs-hybrid.json', JSON.stringify(all));
})();
