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
        this.chart = null;
        this.simulationDurationElement = document.getElementById('simulation-duration');
        this.timerElement = document.getElementById('simulation-timer');

        if (!this.startButton || !this.form || !this.statsElement || !this.speedControl || !this.speedDisplay || !this.simulationDurationElement || !this.timerElement) {
            console.error("Some UI elements are missing");
        }

        this.initEventListeners();
        this.initChart();
        this.resizeSimulationContainer();
        window.addEventListener('resize', () => this.resizeSimulationContainer());
        console.log("UIController initialized");
    }

    resizeSimulationContainer() {
        const container = document.getElementById('simulation-container');
        if (container) {
            container.style.height = `${window.innerHeight / 2}px`;
        }
    }

    startSimulation() {
        console.log("Starting simulation");
        this.resetChart();
        const params = this.getFormParams();
        console.log("Simulation parameters:", params);

        if (!this.simulation) {
            console.log("Creating new GeneticFishSimulation");
            this.simulation = new GeneticFishSimulation('fishtank', params);
        } else {
            console.log("Resetting existing simulation");
            this.simulation.reset(params);
        }
        
        this.simulation.start();
        this.updateSimulationSpeed();

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(() => this.updateStats(), 1000);
        console.log("Simulation started and stats update interval set");

        // Reset the timer display
        this.updateTimer("00:00:00");
    }

    updateTimer(duration) {
        if (this.timerElement) {
            this.timerElement.textContent = `Elapsed Time: ${duration}`;
        }
    }

    initEventListeners() {
        console.log("Initializing event listeners");
        this.startButton.addEventListener('click', () => {
            console.log("Start button clicked");
            this.startSimulation();
        });
        this.speedControl.addEventListener('input', () => this.updateSimulationSpeed());
    }

    initChart() {
        const ctx = document.getElementById('fishChart');
        if (!ctx) {
            console.error("Fish chart canvas not found");
            return;
        }
        this.chart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Average Size', data: [], borderColor: 'red' },
                    { label: 'Average Speed', data: [], borderColor: 'blue' },
                    { label: 'Average Energy', data: [], borderColor: 'green' },
                    { label: 'Average Metabolism', data: [], borderColor: 'purple' }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Time (seconds)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 1,
                        title: {
                            display: true,
                            text: 'Normalized Value'
                        }
                    }
                }
            }
        });
        console.log("Chart initialized");
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
            const graphData = this.simulation.getGraphData();
            this.updateChart(graphData);
            const stats = {
                populationSize: this.simulation.fishes.length,
                foodCount: this.simulation.foodItems.length,
                waterTemperature: this.simulation.params.waterTemperature,
                simulationSpeed: this.simulation.speedMultiplier,
                fishStats: this.simulation.fishes.map(fish => fish.getStats()),
                duration: this.simulation.getSimulationDuration()
            };
            this.updateStatsDisplay(stats);
            this.updateTimer(stats.duration);
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

    updateChart(data) {
        if (!this.chart) {
            console.error("Chart not initialized");
            return;
        }
        this.chart.data.labels = data.labels;
        data.datasets.forEach((dataset, index) => {
            this.chart.data.datasets[index].data = dataset.data;
        });
        this.chart.update();
    }

    updateSimulationSpeed() {
        if (this.simulation) {
            const speed = parseFloat(this.speedControl.value);
            this.simulation.setSpeed(speed);
            this.speedDisplay.textContent = `${speed.toFixed(1)}x`;
        }
    }

    resetChart() {
        if (this.chart) {
            this.chart.data.labels = [];
            this.chart.data.datasets.forEach((dataset) => {
                dataset.data = [];
            });
            this.chart.update();
        }
    }
}

// Initialize the UI controller when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");
    new UIController();
});
