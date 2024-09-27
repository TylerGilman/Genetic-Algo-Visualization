function SimulationStats() {
    this.currentStats = {
        generation: 0,
        averageFitness: 0,
        bestFitness: 0,
        populationSize: 0
    };
}

SimulationStats.prototype.update = function(population, environmentParams) {
    this.currentStats.generation++;
    this.currentStats.populationSize = population.length;
    
    const fitnesses = population.map(fish => fish.calculateFitness(environmentParams));
    this.currentStats.averageFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    this.currentStats.bestFitness = Math.max(...fitnesses);
};

SimulationStats.prototype.getCurrentStats = function() {
    return Object.assign({}, this.currentStats);
};
