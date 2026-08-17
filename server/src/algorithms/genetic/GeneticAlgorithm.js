/**
 * Genetic Algorithm - Tối ưu hóa phân bổ nhân sự
 *
 * Multi-objective optimization:
 *   1. Minimize workload variance (cân bằng khối lượng công việc)
 *   2. Maximize skill match (nhân sự phù hợp nhất với task)
 *   3. Minimize cost (tối thiểu chi phí)
 *   4. Avoid overallocation (không vượt quá capacity)
 *
 * Chromosome: Array of resource indices [taskIndex → resourceIndex]
 */

class GeneticAlgorithm {
  constructor(options = {}) {
    this.populationSize = options.populationSize || 100;
    this.maxGenerations = options.maxGenerations || 500;
    this.crossoverRate = options.crossoverRate || 0.8;
    this.mutationRate = options.mutationRate || 0.1;
    this.elitismRate = options.elitismRate || 0.05;
    this.tournamentSize = options.tournamentSize || 5;
    this.stagnationLimit = options.stagnationLimit || 50;
    this.targetFitness = options.targetFitness || 0.95;

    this.weights = {
      workloadBalance: options.workloadWeight ?? 0.30,
      skillMatch: options.skillWeight ?? 0.35,
      cost: options.costWeight ?? 0.15,
      overallocation: options.overallocationWeight ?? 0.20,
    };
  }

  /**
   * Run the genetic algorithm optimization
   * @param {Array} tasks - [{ _id, estimatedHours, requiredSkills: [{name, level, weight}] }]
   * @param {Array} resources - [{ _id, maxCapacity, fte, hourlyRate, skills: [{name, level}], currentWorkload }]
   * @returns {Object} Best solution
   */
  async optimize(tasks, resources) {
    if (!tasks.length || !resources.length) {
      return this._emptyResult('Không có dữ liệu tasks hoặc resources');
    }

    const startTime = Date.now();
    const numTasks = tasks.length;
    const numResources = resources.length;

    // Precompute skill match matrix: skillMatrix[t][r] = match score 0..1
    const skillMatrix = this._precomputeSkillMatrix(tasks, resources);

    // Precompute max values for normalization
    const maxCost = resources.reduce((max, r) => Math.max(max, r.hourlyRate || 1), 1)
      * tasks.reduce((sum, t) => sum + (t.estimatedHours || 1), 0);

    // Initialize population
    let population = this._initializePopulation(numTasks, numResources);
    let fitnesses = population.map((ch) =>
      this._evaluateFitness(ch, tasks, resources, skillMatrix, maxCost)
    );

    let bestIdx = fitnesses.indexOf(Math.max(...fitnesses));
    let bestFitness = fitnesses[bestIdx];
    let bestChromosome = [...population[bestIdx]];
    let stagnation = 0;

    const convergenceHistory = [{ generation: 0, fitness: bestFitness }];

    // Evolution loop
    for (let gen = 1; gen <= this.maxGenerations; gen++) {
      const newPopulation = [];

      // Elitism: keep top N
      const eliteCount = Math.max(1, Math.floor(this.populationSize * this.elitismRate));
      const sorted = fitnesses
        .map((f, i) => ({ f, i }))
        .sort((a, b) => b.f - a.f);
      for (let i = 0; i < eliteCount; i++) {
        newPopulation.push([...population[sorted[i].i]]);
      }

      // Fill rest with crossover + mutation
      while (newPopulation.length < this.populationSize) {
        const parent1 = this._tournamentSelection(population, fitnesses);
        const parent2 = this._tournamentSelection(population, fitnesses);

        let child1, child2;
        if (Math.random() < this.crossoverRate) {
          [child1, child2] = this._crossover(parent1, parent2);
        } else {
          child1 = [...parent1];
          child2 = [...parent2];
        }

        this._mutate(child1, numResources);
        this._mutate(child2, numResources);

        newPopulation.push(child1);
        if (newPopulation.length < this.populationSize) {
          newPopulation.push(child2);
        }
      }

      population = newPopulation;
      fitnesses = population.map((ch) =>
        this._evaluateFitness(ch, tasks, resources, skillMatrix, maxCost)
      );

      const genBestIdx = fitnesses.indexOf(Math.max(...fitnesses));
      const genBestFitness = fitnesses[genBestIdx];

      if (genBestFitness > bestFitness) {
        bestFitness = genBestFitness;
        bestChromosome = [...population[genBestIdx]];
        stagnation = 0;
      } else {
        stagnation++;
      }

      // Record every 10 generations or last
      if (gen % 10 === 0 || gen === this.maxGenerations) {
        convergenceHistory.push({ generation: gen, fitness: bestFitness });
      }

      // Termination conditions
      if (bestFitness >= this.targetFitness) break;
      if (stagnation >= this.stagnationLimit) break;
    }

    // Build result
    const assignments = this._buildAssignments(bestChromosome, tasks, resources, skillMatrix);
    const metrics = this._computeMetrics(bestChromosome, tasks, resources, skillMatrix);

    return {
      success: true,
      assignments,
      fitness: Math.round(bestFitness * 10000) / 10000,
      generations: convergenceHistory[convergenceHistory.length - 1].generation,
      convergenceHistory,
      metrics,
      executionTime: Date.now() - startTime,
      parameters: {
        populationSize: this.populationSize,
        maxGenerations: this.maxGenerations,
        crossoverRate: this.crossoverRate,
        mutationRate: this.mutationRate,
        weights: this.weights,
      },
    };
  }

  // ──────────────────────────────────────────────
  // Precompute skill match matrix
  // ──────────────────────────────────────────────
  _precomputeSkillMatrix(tasks, resources) {
    return tasks.map((task) =>
      resources.map((resource) => this._skillMatch(task, resource))
    );
  }

  _skillMatch(task, resource) {
    const required = task.requiredSkills || [];
    if (!required.length) return 1; // No requirements → perfect match

    let totalWeight = 0;
    let totalMatch = 0;

    for (const req of required) {
      const weight = req.weight ?? 1;
      totalWeight += weight * req.level;

      const resSkill = (resource.skills || []).find(
        (s) => s.name.toLowerCase() === req.name.toLowerCase()
      );
      const resLevel = resSkill ? resSkill.level : 0;
      totalMatch += weight * Math.min(resLevel, req.level);
    }

    return totalWeight > 0 ? totalMatch / totalWeight : 0;
  }

  // ──────────────────────────────────────────────
  // Population
  // ──────────────────────────────────────────────
  _initializePopulation(numTasks, numResources) {
    const pop = [];
    for (let i = 0; i < this.populationSize; i++) {
      const chromosome = [];
      for (let t = 0; t < numTasks; t++) {
        chromosome.push(Math.floor(Math.random() * numResources));
      }
      pop.push(chromosome);
    }
    return pop;
  }

  // ──────────────────────────────────────────────
  // Fitness Function (Multi-objective)
  // ──────────────────────────────────────────────
  _evaluateFitness(chromosome, tasks, resources, skillMatrix, maxCost) {
    const numResources = resources.length;

    // 1. Workload per resource
    const workloads = new Array(numResources).fill(0);
    for (let t = 0; t < chromosome.length; t++) {
      workloads[chromosome[t]] += tasks[t].estimatedHours || 1;
    }

    // f_workload: 1 - normalized standard deviation
    const avgWorkload = workloads.reduce((s, w) => s + w, 0) / numResources;
    const variance = workloads.reduce((s, w) => s + (w - avgWorkload) ** 2, 0) / numResources;
    const stdDev = Math.sqrt(variance);
    const maxWorkload = Math.max(...workloads, 1);
    const fWorkload = Math.max(0, 1 - stdDev / maxWorkload);

    // 2. f_skill: average skill match
    let totalSkillMatch = 0;
    for (let t = 0; t < chromosome.length; t++) {
      totalSkillMatch += skillMatrix[t][chromosome[t]];
    }
    const fSkill = totalSkillMatch / chromosome.length;

    // 3. f_cost: normalized cost
    let totalCost = 0;
    for (let t = 0; t < chromosome.length; t++) {
      totalCost += (resources[chromosome[t]].hourlyRate || 0) * (tasks[t].estimatedHours || 1);
    }
    const fCost = maxCost > 0 ? Math.max(0, 1 - totalCost / maxCost) : 1;

    // 4. f_overalloc: penalty for overloaded resources
    let overallocated = 0;
    for (let r = 0; r < numResources; r++) {
      const capacity = (resources[r].maxCapacity || 40) * (resources[r].fte || 1);
      if (workloads[r] > capacity) overallocated++;
    }
    const fOveralloc = 1 - overallocated / numResources;

    // Weighted sum
    const fitness =
      this.weights.workloadBalance * fWorkload +
      this.weights.skillMatch * fSkill +
      this.weights.cost * fCost +
      this.weights.overallocation * fOveralloc;

    return Math.max(0, Math.min(1, fitness));
  }

  // ──────────────────────────────────────────────
  // Selection: Tournament
  // ──────────────────────────────────────────────
  _tournamentSelection(population, fitnesses) {
    let bestIdx = Math.floor(Math.random() * population.length);
    for (let i = 1; i < this.tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      if (fitnesses[idx] > fitnesses[bestIdx]) {
        bestIdx = idx;
      }
    }
    return [...population[bestIdx]];
  }

  // ──────────────────────────────────────────────
  // Crossover: Uniform
  // ──────────────────────────────────────────────
  _crossover(parent1, parent2) {
    const child1 = [];
    const child2 = [];
    for (let i = 0; i < parent1.length; i++) {
      if (Math.random() < 0.5) {
        child1.push(parent1[i]);
        child2.push(parent2[i]);
      } else {
        child1.push(parent2[i]);
        child2.push(parent1[i]);
      }
    }
    return [child1, child2];
  }

  // ──────────────────────────────────────────────
  // Mutation: Random Reassignment
  // ──────────────────────────────────────────────
  _mutate(chromosome, numResources) {
    for (let i = 0; i < chromosome.length; i++) {
      if (Math.random() < this.mutationRate) {
        chromosome[i] = Math.floor(Math.random() * numResources);
      }
    }
  }

  // ──────────────────────────────────────────────
  // Build result assignments
  // ──────────────────────────────────────────────
  _buildAssignments(chromosome, tasks, resources, skillMatrix) {
    return chromosome.map((rIdx, tIdx) => ({
      task: tasks[tIdx]._id,
      taskTitle: tasks[tIdx].title,
      resource: resources[rIdx]._id,
      resourceName: resources[rIdx].userName || resources[rIdx].position,
      skillMatch: Math.round(skillMatrix[tIdx][rIdx] * 100),
      estimatedHours: tasks[tIdx].estimatedHours || 0,
    }));
  }

  // ──────────────────────────────────────────────
  // Compute final metrics
  // ──────────────────────────────────────────────
  _computeMetrics(chromosome, tasks, resources, skillMatrix) {
    const numResources = resources.length;
    const workloads = new Array(numResources).fill(0);

    for (let t = 0; t < chromosome.length; t++) {
      workloads[chromosome[t]] += tasks[t].estimatedHours || 1;
    }

    const avgWorkload = workloads.reduce((s, w) => s + w, 0) / numResources;
    const variance = workloads.reduce((s, w) => s + (w - avgWorkload) ** 2, 0) / numResources;

    let totalSkillMatch = 0;
    let totalCost = 0;
    for (let t = 0; t < chromosome.length; t++) {
      totalSkillMatch += skillMatrix[t][chromosome[t]];
      totalCost += (resources[chromosome[t]].hourlyRate || 0) * (tasks[t].estimatedHours || 1);
    }

    let overallocated = 0;
    const resourceUtilization = resources.map((r, i) => {
      const capacity = (r.maxCapacity || 40) * (r.fte || 1);
      const util = capacity > 0 ? Math.round((workloads[i] / capacity) * 100) : 0;
      if (workloads[i] > capacity) overallocated++;
      return {
        resource: r._id,
        name: r.userName || r.position,
        workload: Math.round(workloads[i] * 10) / 10,
        capacity,
        utilization: util,
        isOverloaded: workloads[i] > capacity,
      };
    });

    return {
      workloadVariance: Math.round(Math.sqrt(variance) * 100) / 100,
      averageSkillMatch: Math.round((totalSkillMatch / chromosome.length) * 100),
      totalCost: Math.round(totalCost),
      overallocatedResources: overallocated,
      averageUtilization: Math.round(
        resourceUtilization.reduce((s, r) => s + r.utilization, 0) / numResources
      ),
      resourceUtilization,
    };
  }

  _emptyResult(message) {
    return {
      success: false,
      message,
      assignments: [],
      fitness: 0,
      generations: 0,
      convergenceHistory: [],
      metrics: {
        workloadVariance: 0,
        averageSkillMatch: 0,
        totalCost: 0,
        overallocatedResources: 0,
        averageUtilization: 0,
        resourceUtilization: [],
      },
      executionTime: 0,
    };
  }
}

module.exports = GeneticAlgorithm;
