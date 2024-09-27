class UIController {
    constructor() {
        this.simulation = null;
        this.startButton = document.getElementById('start-simulation');
        this.form = document.getElementById('simulation-form');
        this.statsElement = document.getElementById('stats');

        this.initEventListeners();
    }

    initEventListeners() {
        this.startButton.addEventListener('click', () => this.startSimulation());
        this.form.addEventListener('change', () => this.updateSimulationParams());
    }

    startSimulation() {
        const params = this.getFormParams();
        if (!this.simulation) {
            this.simulation = new GeneticFishSimulation('fishtank', params);
        } else {
            this.simulation.updateParameters(params);
        }
        this.simulation.start();
    }

    updateSimulationParams() {
        if (this.simulation) {
            const params = this.getFormParams();
            this.simulation.updateParameters(params);
        }
    }

    getFormParams() {
        const formData = new FormData(this.form);
        const params = Object.fromEntries(formData.entries());

        // Convert string values to numbers
        for (let key in params) {
            params[key] = Number(params[key]);
        }

        return params;
    }

    updateStats(stats) {
        this.statsElement.innerHTML = `
            <p>Generation: ${stats.generation}</p>
            <p>Average Fitness: ${stats.averageFitness.toFixed(2)}</p>
            <p>Best Fitness: ${stats.bestFitness.toFixed(2)}</p>
            <p>Population Size: ${stats.populationSize}</p>
        `;
    }
}

// Initialize the UI controller when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UIController();
});
