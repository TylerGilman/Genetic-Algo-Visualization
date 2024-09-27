class UIController {
    constructor() {
        console.log("Initializing UIController");
        this.simulation = null;
        this.startButton = document.getElementById('start-simulation');
        this.form = document.getElementById('simulation-form');
        this.statsElement = document.getElementById('stats');
        this.speedControl = document.getElementById('simulation-speed');
        this.speedDisplay = document.getElementById('speed-display');
        this.updateInterval = null;

        if (!this.startButton || !this.form || !this.statsElement || !this.speedControl || !this.speedDisplay) {
            console.error("Some UI elements are missing");
        }

        this.initEventListeners();
        console.log("UIController initialized");
    }

    initEventListeners() {
        console.log("Initializing event listeners");
        this.startButton.addEventListener('click', () => {
            console.log("Start button clicked");
            this.startSimulation();
        });
        this.speedControl.addEventListener('input', () => this.updateSimulationSpeed());
    }

    startSimulation() {
        console.log("Starting simulation");
        const params = this.getFormParams();
        console.log("Simulation parameters:", params);
        if (!this.simulation) {
            console.log("Creating new GeneticFishSimulation");
            this.simulation = new GeneticFishSimulation('fishtank', params);
        } else {
            console.log("Updating existing simulation parameters");
            this.simulation.updateParameters(params);
        }
        this.simulation.start();
        this.updateSimulationSpeed();

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(() => this.updateStats(), 1000);
        console.log("Simulation started and stats update interval set");
    }

    updateSimulationSpeed() {
        if (this.simulation) {
            const speed = parseFloat(this.speedControl.value);
            this.simulation.setSpeed(speed);
            this.speedDisplay.textContent = `${speed.toFixed(1)}`;
        }
    }

    getFormParams() {
        const formData = new FormData(this.form);
        const params = Object.fromEntries(formData.entries());

        for (let key in params) {
            params[key] = Number(params[key]);
        }

        return params;
    }

    updateStats() {
        if (this.simulation) {
            const stats = {
                populationSize: this.simulation.fishes.length,
                foodCount: this.simulation.foodItems.length,
                waterTemperature: this.simulation.params.waterTemperature,
                simulationSpeed: this.simulation.speedMultiplier,
                fishStats: this.simulation.fishes.map(fish => fish.getStats())
            };
            this.updateStatsDisplay(stats);
        }
    }

    updateStatsDisplay(stats) {
        let html = `
            <p>Population: ${stats.populationSize}</p>
            <p>Food Available: ${stats.foodCount}</p>
            <p>Water Temperature: ${stats.waterTemperature.toFixed(1)}°C</p>
            <p>Simulation Speed: ${stats.simulationSpeed.toFixed(1)}x</p>
            <table>
                <thead>
                    <tr>
                        <th>Color</th>
                        <th>Speed</th>
                        <th>Size</th>
                        <th>Energy</th>
                        <th>Metabolism</th>
                    </tr>
                </thead>
                <tbody>
        `;

        stats.fishStats.forEach(fish => {
            html += `
                <tr>
                    <td><div style="width: 20px; height: 20px; background-color: ${fish.color};"></div></td>
                    <td>${fish.speed}</td>
                    <td>${fish.size}</td>
                    <td>${fish.energy}</td>
                    <td>${fish.metabolism}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        this.statsElement.innerHTML = html;
    }
}

// Initialize the UI controller when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");
    new UIController();
});
