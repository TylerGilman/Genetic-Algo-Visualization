class UIController {
    constructor() {
        console.log("Initializing UIController");
        this.simulation = null;
        this.startButton = document.getElementById('start-simulation');
        this.endButton = document.createElement('button');
        this.endButton.id = 'end-simulation';
        this.endButton.textContent = 'End Simulation';
        this.endButton.style.display = 'none';
        this.startButton.parentNode.insertBefore(this.endButton, this.startButton.nextSibling);
        this.form = document.getElementById('simulation-form');
        this.statsElement = document.getElementById('stats');
        this.speedControl = document.getElementById('simulation-speed');
        this.speedDisplay = document.getElementById('speed-display');
        this.updateInterval = null;
        this.charts = {
            size: null,
            speed: null,
            energy: null,
            metabolism: null
        };
        this.timerElement = document.getElementById('simulation-timer');

        if (!this.startButton || !this.form || !this.statsElement || !this.speedControl || !this.speedDisplay || !this.timerElement) {
            console.error("Some UI elements are missing");
        }

        this.initEventListeners();
        this.resizeSimulationContainer();
        window.addEventListener('resize', () => this.resizeSimulationContainer());
        console.log("UIController initialized");
    }

    initEventListeners() {
        console.log("Initializing event listeners");
        this.form.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent form submission
            this.startSimulation();
        });
        this.startButton.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent button click from submitting form
            console.log("Start button clicked");
            this.startSimulation();
        });
        this.endButton.addEventListener('click', () => {
            console.log("End button clicked");
            this.endSimulation();
        });
        this.speedControl.addEventListener('input', () => this.updateSimulationSpeed());
    }

    startSimulation() {
        console.log("Starting simulation");
        this.initCharts(); // Initialize charts here
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
        this.updateTimerDisplay("00:00:00");

        // Show end button and hide start button
        this.startButton.style.display = 'none';
        this.endButton.style.display = 'inline-block';
    }

    initCharts() {
        const chartConfigs = [
            { id: 'sizeChart', label: 'Average Size', color: 'red' },
            { id: 'speedChart', label: 'Average Speed', color: 'blue' },
            { id: 'energyChart', label: 'Average Energy', color: 'green' },
            { id: 'metabolismChart', label: 'Average Metabolism', color: 'purple' }
        ];

        chartConfigs.forEach(config => {
            const ctx = document.getElementById(config.id);
            if (!ctx) {
                console.error(`${config.id} canvas not found`);
                return;
            }

            // Destroy existing chart if it exists
            if (this.charts[config.id.replace('Chart', '')]) {
                this.charts[config.id.replace('Chart', '')].destroy();
            }

            this.charts[config.id.replace('Chart', '')] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: config.label,
                        data: [],
                        borderColor: config.color,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
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
                            title: {
                                display: true,
                                text: config.label
                            }
                        }
                    }
                }
            });
        });
        console.log("Charts initialized:", Object.keys(this.charts));
    }

updateCharts(data) {
    if (!data || !data.labels || !data.datasets) {
        console.error("Invalid data format for updating charts");
        return;
    }

    Object.entries(this.charts).forEach(([key, chart]) => {
        if (!chart) {
            console.error(`Chart for ${key} not initialized`);
            return;
        }
        
        const dataset = data.datasets.find(d => 
            d.label.toLowerCase().includes(key.toLowerCase())
        );
        
        if (dataset) {
            console.log(`Updating ${key} chart with ${dataset.data.length} points`);
            chart.data.labels = data.labels;
            chart.data.datasets[0].data = dataset.data;
            chart.data.datasets[0].borderColor = dataset.borderColor;
            chart.update('quiet'); // Use quiet update for better performance
        } else {
            console.warn(`No data found for ${key} chart`);
        }
    });
}

    endSimulation() {
        console.log("Ending simulation");
        if (this.simulation) {
            this.simulation.isRunning = false;
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        // Show start button and hide end button
        this.startButton.style.display = 'inline-block';
        this.endButton.style.display = 'none';
    }

    updateSimulationSpeed() {
        if (this.simulation) {
            const speed = parseFloat(this.speedControl.value);
            this.simulation.setSpeed(speed);
            if (speed === 0) {
                this.speedDisplay.textContent = "Paused";
            } else {
                this.speedDisplay.textContent = `${speed.toFixed(1)}x`;
            }
        }
    }

    updateTimerDisplay(duration) {
        if (this.timerElement) {
            this.timerElement.textContent = `Elapsed Time: ${duration}`;
        }
    }

      getFormParams() {
          return {
              populationSize: Number(document.getElementById('populationSize').value),
              mutation_rate: Number(document.getElementById('mutationRate').value),
              crossover_rate: Number(document.getElementById('crossoverRate').value),
              foodAvailability: Number(document.getElementById('foodAvailability').value),
              water_temperature: Number(document.getElementById('waterTemperature').value),
              generation_length: Number(document.getElementById('generation_length').value)
          };
      }

    updateStats() {
        if (this.simulation) {
            const graphData = this.simulation.getGraphData();
            this.updateCharts(graphData);
            const stats = {
                populationSize: this.simulation.fishes.length,
                foodCount: this.simulation.foodItems.length,
                waterTemperature: this.simulation.params.waterTemperature,
                simulationSpeed: this.simulation.speedMultiplier,
                fishStats: this.simulation.fishes.map(fish => fish.getStats()),
                duration: this.simulation.getSimulationDuration()
            };
            this.updateStatsDisplay(stats);
            this.updateTimerDisplay(stats.duration);
        }
    }

updateStatsDisplay(stats) {
    if (!stats || typeof stats !== 'object') {
        console.error('Invalid stats object');
        return;
    }

    // Base stats
    let html = `
        <div class="stats-section">
            <p>Population: ${stats.populationSize || 0}</p>
            <p>Food Available: ${stats.foodCount || 0}</p>
            <p>Water Temperature: ${(stats.waterTemperature || 0).toFixed(1)}°C</p>
            <p>Simulation Speed: ${(stats.simulationSpeed || 0).toFixed(1)}x</p>
        </div>
    `;

    // Fish stats table
    if (stats.fishStats && stats.fishStats.length > 0) {
        html += `
            <table class="stats-table">
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
            if (fish) {
                html += `
                    <tr>
                        <td><div style="width: 20px; height: 20px; background-color: ${fish.color || '#000'};"></div></td>
                        <td>${fish.speed || '0'}</td>
                        <td>${fish.size || '0'}</td>
                        <td>${fish.energy || '0'}</td>
                        <td>${fish.metabolism || '0'}</td>
                    </tr>
                `;
            }
        });

        html += `
                </tbody>
            </table>
        `;
    } else {
        html += '<p>No fish data available</p>';
    }

    const statsElement = document.getElementById('stats');
    if (statsElement) {
        statsElement.innerHTML = html;
    }
}

    resizeSimulationContainer() {
        const container = document.getElementById('simulation-container');
        if (container) {
            container.style.height = `${window.innerHeight / 2}px`;
        }
    }
}

// Initialize the UI controller when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");
    new UIController();
});
