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

const {
  DEFAULT_WEIGHTS,
  buildSkillMatrix,
  computeMaxCost,
  computeFitness,
  computeMetrics,
  emptyMetrics,
} = require('../scoring');

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
      workloadBalance: options.workloadWeight ?? DEFAULT_WEIGHTS.workloadBalance,
      skillMatch: options.skillWeight ?? DEFAULT_WEIGHTS.skillMatch,
      cost: options.costWeight ?? DEFAULT_WEIGHTS.cost,
      overallocation: options.overallocationWeight ?? DEFAULT_WEIGHTS.overallocation,
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
    const skillMatrix = buildSkillMatrix(tasks, resources);

    // Precompute max values for normalization
    const maxCost = computeMaxCost(tasks, resources);

    // Initialize population
    let population = this._initializePopulation(numTasks, numResources);
    let fitnesses = population.map((ch) =>
      computeFitness(ch, tasks, resources, skillMatrix, maxCost, this.weights)
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
        computeFitness(ch, tasks, resources, skillMatrix, maxCost, this.weights)
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
    const metrics = computeMetrics(bestChromosome, tasks, resources, skillMatrix);

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

  // Fitness và metrics dùng chung với CSP — xem ../scoring.js

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

  _emptyResult(message) {
    return {
      success: false,
      message,
      assignments: [],
      fitness: 0,
      generations: 0,
      convergenceHistory: [],
      metrics: emptyMetrics(),
      executionTime: 0,
    };
  }
}

module.exports = GeneticAlgorithm;
