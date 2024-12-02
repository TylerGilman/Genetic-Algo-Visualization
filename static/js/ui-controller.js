class UIController {
    constructor() {
        console.log("Initializing UIController");
        this.simulation = null;
        
        // Initialize DOM elements with validation
        this.startButton = document.getElementById('start-simulation');
        if (!this.startButton) {
            console.error("Start button not found");
            return;
        }

        this.endButton = document.createElement('button');
        this.endButton.id = 'end-simulation';
        this.endButton.textContent = 'End Simulation';
        this.endButton.style.display = 'none';
        this.startButton.parentNode.insertBefore(this.endButton, this.startButton.nextSibling);
        
        const elements = {
            form: document.getElementById('simulation-form'),
            statsElement: document.getElementById('stats'),
            speedControl: document.getElementById('simulation-speed'),
            speedDisplay: document.getElementById('speed-display'),
            timerElement: document.getElementById('simulation-timer'),
            generationDisplay: document.getElementById('generation-number'),
            generationCountdown: document.getElementById('generation-countdown')
        };

        // Make generation elements optional to prevent crashes
        if (!elements.generationDisplay) {
            console.warn("Generation display element not found, creating one");
            elements.generationDisplay = document.createElement('span');
            elements.generationDisplay.id = 'generation-number';
            if (elements.timerElement) {
                elements.timerElement.parentNode.insertBefore(elements.generationDisplay, elements.timerElement);
            }
        }

        if (!elements.generationCountdown) {
            console.warn("Generation countdown element not found, creating one");
            elements.generationCountdown = document.createElement('span');
            elements.generationCountdown.id = 'generation-countdown';
            if (elements.generationDisplay) {
                elements.generationDisplay.parentNode.insertBefore(elements.generationCountdown, elements.generationDisplay.nextSibling);
            }
        }

        // Remove generation elements from required elements check
        const requiredElements = ['form', 'statsElement', 'speedControl', 'speedDisplay', 'timerElement'];
        const missingElements = requiredElements
            .filter(key => !elements[key])
            .map(key => key);

        if (missingElements.length > 0) {
            console.error("Missing UI elements:", missingElements.join(', '));
            return;
        }

        // Assign verified elements
        Object.assign(this, elements);

        this.updateInterval = null;
        this.charts = {
            size: null,
            speed: null,
            energy: null,
            metabolism: null
        };

        this.initEventListeners();
        this.resizeSimulationContainer();
        this.debouncedResize = this.debounce(this.resizeSimulationContainer.bind(this), 250);
        window.addEventListener('resize', this.debouncedResize);
        console.log("UIController initialized");
    }

cleanup() {
    try {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // Remove resize listener
        window.removeEventListener('resize', this.debouncedResize);

        // Remove event listeners for buttons
        this.startButton.removeEventListener('click', this.startSimulation);
        this.endButton.removeEventListener('click', this.endSimulation);

        // Destroy charts to prevent memory leaks
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });

        // Clear the simulation object
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
    } catch (error) {
        console.error("Error during cleanup:", error);
    }
}

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    initEventListeners() {
        console.log("Initializing event listeners");
        try {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.startSimulation();
            });

            this.startButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Start button clicked");
                this.startSimulation();
            });

            this.endButton.addEventListener('click', () => {
                console.log("End button clicked");
                this.endSimulation();
            });

            this.speedControl.addEventListener('input', () => this.updateSimulationSpeed());
        } catch (error) {
            console.error("Error initializing event listeners:", error);
        }
    }

    startSimulation() {
        console.log("Starting simulation");
        try {
            this.initCharts();
            const params = this.getFormParams();
            console.log("Simulation parameters:", params);

            if (!this.validateParams(params)) {
                console.error("Invalid simulation parameters");
                return;
            }

            if (!this.simulation) {
                console.log("Creating new GeneticFishSimulation");
                this.simulation = new GeneticFishSimulation('fishtank', params);
                this.setupSimulationCallbacks();
            } else {
                console.log("Resetting existing simulation");
                this.simulation.reset(params);
            }
            
            this.simulation.start();
            this.updateSimulationSpeed();
            this.startUpdateInterval();

            // Hide start button and show end button
            this.startButton.style.display = 'none';
            this.endButton.style.display = 'inline-block';
        } catch (error) {
            console.error("Error starting simulation:", error);
            this.endSimulation();
        }
    }

    setupSimulationCallbacks() {
        if (!this.simulation) return;
        
        this.simulation.setStateChangeCallback((state) => {
            this.startButton.style.display = state.isRunning ? 'none' : 'inline-block';
            this.endButton.style.display = state.isRunning ? 'inline-block' : 'none';
            this.speedDisplay.textContent = state.isPaused ? "Paused" : `${state.speedMultiplier.toFixed(1)}x`;
        });

        this.simulation.setTimerCallback((timerState) => {
            if (this.timerElement) {
                this.timerElement.textContent = `Elapsed Time: ${timerState.elapsedTime}`;
            }
            if (this.generationDisplay) {
                this.generationDisplay.textContent = timerState.generation;
            }
            if (this.generationCountdown) {
                this.generationCountdown.textContent = timerState.generationTime;
            }
        });
    }

    startUpdateInterval() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(() => this.updateStats(), 1000);
        console.log("Stats update interval set");
    }

    initCharts() {
        const chartConfigs = [
            { id: 'sizeChart', label: 'Average Size', color: 'red' },
            { id: 'speedChart', label: 'Average Speed', color: 'blue' },
            { id: 'energyChart', label: 'Average Energy', color: 'green' },
            { id: 'metabolismChart', label: 'Average Metabolism', color: 'purple' }
        ];

        try {
            chartConfigs.forEach(config => {
                const ctx = document.getElementById(config.id);
                if (!ctx) {
                    console.error(`${config.id} canvas not found`);
                    return;
                }

                // Clean up existing chart
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
        } catch (error) {
            console.error("Error initializing charts:", error);
        }
    }

    updateCharts(data) {
        if (!data || !data.labels || !data.datasets) {
            console.error("Invalid data format for updating charts");
            return;
        }

        try {
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
                    chart.update('quiet');
                } else {
                    console.warn(`No data found for ${key} chart`);
                }
            });
        } catch (error) {
            console.error("Error updating charts:", error);
        }
    }

endSimulation() {
    console.log("Ending simulation");
    try {
        if (this.simulation) {
            this.simulation.stop(); // Stop the simulation and animation loop
            this.simulation = null; // Clear the simulation object
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.startButton.style.display = 'inline-block';
        this.endButton.style.display = 'none';
    } catch (error) {
        console.error("Error ending simulation:", error);
    }
}

    updateSimulationSpeed() {
        try {
            if (this.simulation) {
                const speed = parseFloat(this.speedControl.value);
                this.simulation.setSpeed(speed);
                this.speedDisplay.textContent = speed === 0 ? "Paused" : `${speed.toFixed(1)}x`;
            }
        } catch (error) {
            console.error("Error updating simulation speed:", error);
        }
    }

    getFormParams() {
        try {
            return {
                population_size: Number(document.getElementById('population_size').value),
                mutation_rate: Number(document.getElementById('mutation_rate').value),
                crossover_rate: Number(document.getElementById('crossover_rate').value),
                food_availability: Number(document.getElementById('food_availability').value),
                water_temperature: Number(document.getElementById('water_temperature').value),
                generation_length: Number(document.getElementById('generation_length').value)
            };
        } catch (error) {
            console.error("Error getting form parameters:", error);
            return null;
        }
    }

    validateParams(params) {
        if (!params) return false;
        
        const requiredParams = [
            'population_size',
            'mutation_rate',
            'crossover_rate',
            'food_availability',
            'water_temperature',
            'generation_length'
        ];

        return requiredParams.every(param => {
            const value = params[param];
            return value !== undefined && value !== null && !isNaN(value);
        });
    }

    updateStats() {
        try {
            if (this.simulation) {
                const graphData = this.simulation.getGraphData();
                this.updateCharts(graphData);
                
                const stats = this.simulation.getStats();
                this.updateStatsDisplay(stats);
            }
        } catch (error) {
            console.error("Error updating stats:", error);
        }
    }

    updateStatsDisplay(stats) {
        if (this.statsElement) {
            // Clear existing stats content to prevent duplication
            this.statsElement.innerHTML = '';
        }
        if (!stats || typeof stats !== 'object') {
            console.error('Invalid stats object');
            return;
        }

        try {
            let html = `
                <div class="stats-section">
                    <p>Population: ${stats.population_size || 0}</p>
                    <p>Food Available: ${stats.food_count || 0}</p>
                    <p>Water Temperature: ${(stats.water_temperature || 0).toFixed(1)}°C</p>
                    <p>Simulation Speed: ${(stats.simulation_speed || 0).toFixed(1)}x</p>
                </div>
            `;

            if (stats.fish_stats && stats.fish_stats.length > 0) {
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

                stats.fish_stats.forEach(fish => {
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

            if (this.statsElement) {
                this.statsElement.innerHTML = html;
            }
        } catch (error) {
            console.error("Error updating stats display:", error);
        }
    }

    resizeSimulationContainer() {
        try {
            const container = document.getElementById('simulation-container');
            if (container) {
                container.style.height = `${window.innerHeight / 2}px`;
            }
        } catch (error) {
            console.error("Error resizing simulation container:", error);
        }
    }

    cleanup() {
        try {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
            }
            window.removeEventListener('resize', this.debouncedResize);
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
            if (this.simulation) {
                this.simulation.cleanup();
            }
        } catch (error) {
            console.error("Error during cleanup:", error);
        }
    }
}

// Initialize the UI controller when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");
    try {
        window.uiController = new UIController();
    } catch (error) {
        console.error("Failed to initialize UIController:", error);
    }
});
