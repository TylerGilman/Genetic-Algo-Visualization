class SimulationStats {
    constructor() {
        this.currentStats = {
            generation: 1,
            averageFitness: 0,
            bestFitness: 0,
            populationSize: 0
        };
    }

update(population) {
    if (!population || population.length === 0) {
        this.currentStats.populationSize = 0;
        this.currentStats.averageFitness = 0;
        this.currentStats.bestFitness = 0;
        return;
    }

    this.currentStats.populationSize = population.length;
    
    // Debug log population energy values
    console.log("Population energy values:", population.map(fish => ({
        energy: fish.energy,
        metabolism: fish.metabolism
    })));
    
    // Use energy directly as fitness
    const energyValues = population.map(fish => Number(fish.energy) || 0);
    this.currentStats.averageFitness = energyValues.reduce((a, b) => a + b, 0) / population.length;
    this.currentStats.bestFitness = Math.max(...energyValues, 0);
    
    // Debug log stats
    console.log("Updated stats:", {
        populationSize: this.currentStats.populationSize,
        averageFitness: this.currentStats.averageFitness,
        bestFitness: this.currentStats.bestFitness
    });
}

    getCurrentStats() {
        return {
            generation: this.currentStats.generation,
            populationSize: this.currentStats.populationSize,
            averageFitness: Number(this.currentStats.averageFitness.toFixed(2)),
            bestFitness: Number(this.currentStats.bestFitness.toFixed(2))
        };
    }

    // Add this method to properly track generations
    setGeneration(gen) {
        this.currentStats.generation = gen;
    }
}
