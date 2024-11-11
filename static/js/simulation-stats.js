class SimulationStats {
    constructor() {
        this.current_stats = {
            generation: 1,
            average_fitness: 0,
            best_fitness: 0,
            population_size: 0
        };
    }

update(population) {
    if (!population || population.length === 0) {
        this.current_stats.population_size = 0;
        this.current_stats.average_fitness = 0;
        this.current_stats.best_fitness = 0;
        return;
    }

    this.current_stats.population_size = population.length;
    
    // Debug log population energy values
    console.log("Population energy values:", population.map(fish => ({
        energy: fish.energy,
        metabolism: fish.metabolism
    })));
    
    // Use energy directly as fitness
    const energyValues = population.map(fish => Number(fish.energy) || 0);
    this.current_stats.average_fitness = energyValues.reduce((a, b) => a + b, 0) / population.length;
    this.current_stats.best_fitness = Math.max(...energyValues, 0);
    
    // Debug log stats
    console.log("Updated stats:", {
        population_size: this.current_stats.population_size,
        average_fitness: this.current_stats.average_fitness,
        best_fitness: this.current_stats.best_fitness
    });
}

    getCurrentStats() {
        return {
            generation: this.current_stats.generation,
            population_size: this.current_stats.population_size,
            average_fitness: Number(this.current_stats.average_fitness.toFixed(2)),
            best_fitness: Number(this.current_stats.best_fitness.toFixed(2))
        };
    }

    // Add this method to properly track generations
    setGeneration(gen) {
        this.current_stats.generation = gen;
    }
}
