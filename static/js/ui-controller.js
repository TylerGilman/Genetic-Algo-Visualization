class UIController {
    constructor() {
        console.log("Initializing UIController");
        this.registry = {
            get: (name) => null,  // Simplified registry
            register: (name, component) => {},
            getEventBus: () => ({ emit: () => {} })  // Simplified event bus
        };
        this.initializeElements();
        this.setupEventListeners();
        this.isSimulationRunning = false;
        this.simulation = null;
        this.charts = {};
        this.initCharts();
    }

    initializeElements() {
        this.elements = {
            startButton: document.getElementById('start-simulation'),
            endButton: document.getElementById('end-simulation'),
            speedSlider: document.getElementById('simulation-speed'),
            speedDisplay: document.getElementById('speed-display'),
            timer: document.getElementById('simulation-timer')
        };
    }

    setupEventListeners() {
        if (this.elements.startButton) {
            this.elements.startButton.addEventListener('click', () => {
                console.log("Start button clicked");
                this.startSimulation();
            });
        }

        if (this.elements.endButton) {
            this.elements.endButton.addEventListener('click', () => {
                console.log("End button clicked");
                this.endSimulation();
            });
        }

        if (this.elements.speedSlider) {
            this.elements.speedSlider.addEventListener('input', () => {
                this.updateSimulationSpeed();
            });
        }
    }

    startSimulation() {
        if (this.isSimulationRunning) {
            console.log("Simulation already running");
            return;
        }

        console.log("Starting simulation");
        try {
            this.initCharts();
            const params = this.getFormParams();
            console.log("Simulation parameters:", params);

            if (!this.validateParams(params)) {
                console.error("Invalid simulation parameters");
                return;
            }

            // Get logger from registry (now won't throw error)
            const logger = this.registry.get('logger');
            if (logger) {
                logger.clearLogs();
            }

            if (!this.simulation) {
                console.log("Creating new GeneticFishSimulation");
                this.simulation = new GeneticFishSimulation('fishtank', params, logger);
                this.registry.register('simulation', this.simulation);
            } else {
                console.log("Resetting existing simulation");
                this.simulation.reset(params);
            }
            
            // Start the simulation and update UI
            this.simulation.start();
            this.isSimulationRunning = true;
            this.updateSimulationSpeed();
            this.startUpdateInterval();

            // Update UI elements
            this.elements.startButton.style.display = 'none';
            this.elements.endButton.style.display = 'inline-block';

            // Initialize animation loop
            if (this.simulation.animate) {
                requestAnimationFrame(() => this.simulation.animate());
            }

            // Emit event
            this.registry.getEventBus().emit('simulation:started');
        } catch (error) {
            console.error("Error starting simulation:", error);
            this.endSimulation();
        }
    }

    endSimulation() {
        if (!this.isSimulationRunning) {
            console.log("No simulation running");
            return;
        }

        console.log("Ending simulation");
        try {
            if (this.simulation) {
                this.simulation.stop();
                this.isSimulationRunning = false;
            }
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
            
            // Switch buttons
            this.elements.startButton.style.display = 'inline-block';
            this.elements.endButton.style.display = 'none';

            // Emit event
            this.registry.getEventBus().emit('simulation:ended');
        } catch (error) {
            console.error("Error ending simulation:", error);
        }
    }

    resetSimulation() {
        // This method is called when we want to completely reset everything
        if (this.simulation) {
            this.simulation.stop();
            this.registry.cleanup('simulation');
            this.simulation = null;
        }
        
        // Clear charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        // Clear logger
        const logger = this.registry.get('logger');
        if (logger) {
            logger.clearLogs();
        }
        
        this.isSimulationRunning = false;
        this.startButton.style.display = 'inline-block';
        this.endButton.style.display = 'none';
    }

    cleanup() {
        // Clear update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Remove event listeners
        window.removeEventListener('resize', this.debouncedResize);

        // Cleanup charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });

        // Cleanup components
        this.registry.cleanup();

        // Call parent cleanup
        super.cleanup();
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

    // UI update handlers
    updateUIForSimulationStart() {
        this.elements.startButton.style.display = 'none';
        this.elements.endButton.style.display = 'inline-block';
    }

    updateUIForSimulationEnd() {
        this.elements.startButton.style.display = 'inline-block';
        this.elements.endButton.style.display = 'none';
    }

    startUpdateInterval() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(() => this.updateStats(), 1000);
        console.log("Stats update interval set");
    }

    updateSimulationSpeed() {
        try {
            if (this.simulation) {
                const speed = parseFloat(this.elements.speedSlider.value);
                this.simulation.setSpeed(speed);
                this.elements.speedDisplay.textContent = speed === 0 ? "Paused" : `${speed.toFixed(1)}x`;
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
        if (!stats || typeof stats !== 'object') {
            console.error('Invalid stats object');
            return;
        }
        try {
            const elements = {
                population: document.getElementById('population-stat'),
                food: document.getElementById('food-stat'),
                temperature: document.getElementById('temperature-stat'),
                speed: document.getElementById('speed-stat')
            };

            // Only update if elements exist
            if (elements.population) elements.population.textContent = `${stats.population_size}`;
            if (elements.food) elements.food.textContent = `${stats.food_count}`;
            if (elements.temperature) elements.temperature.textContent = `${stats.water_temperature.toFixed(1)}°C`;
            if (elements.speed) elements.speed.textContent = `${stats.simulation_speed.toFixed(1)}x`;
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
}
// Make UIController available globally
window.UIController = UIController;
