class UIController extends SimulationComponent {
    constructor() {
        super('ui-controller');
        console.log("Initializing UIController");
        
        this.registry = new ComponentRegistry();
        this.elements = this.initializeElements();
        if (!this.elements) return;

        this.initializeComponents();
        this.initEventListeners();
        
        this.simulation = null;
        this.isSimulationRunning = false;
        this.charts = {
            size: null,
            speed: null,
            energy: null,
            metabolism: null
        };
        
        this.updateInterval = null;
        this.debouncedResize = this.debounce(this.resizeSimulationContainer.bind(this), 250);
        window.addEventListener('resize', this.debouncedResize);
    }

    initializeElements() {
        const elements = {
            startButton: document.getElementById('start-simulation'),
            form: document.getElementById('simulation-form'),
            statsElement: document.getElementById('stats'),
            speedControl: document.getElementById('simulation-speed'),
            speedDisplay: document.getElementById('speed-display'),
            timerElement: document.getElementById('simulation-timer'),
            generationDisplay: document.getElementById('generation-number'),
            generationCountdown: document.getElementById('generation-countdown')
        };

        // Create end button if it doesn't exist
        elements.endButton = document.getElementById('end-simulation');
        if (!elements.endButton) {
            elements.endButton = document.createElement('button');
            elements.endButton.id = 'end-simulation';
            elements.endButton.textContent = 'End Simulation';
            elements.endButton.style.display = 'none';
            elements.startButton.parentNode.insertBefore(elements.endButton, elements.startButton.nextSibling);
        }

        // Validate required elements
        const requiredElements = ['startButton', 'form', 'statsElement', 'speedControl', 'speedDisplay', 'timerElement'];
        const missingElements = requiredElements
            .filter(key => !elements[key])
            .map(key => key);

        if (missingElements.length > 0) {
            console.error("Missing UI elements:", missingElements.join(', '));
            return null;
        }

        return elements;
    }

    initEventListeners() {
        // Form submission - only handle explicit form submissions
        this.elements.form.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent form submission
        });

        // Start button handler
        this.elements.startButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event from bubbling to form
            if (!this.isSimulationRunning) {
                console.log("Start button clicked");
                this.startSimulation();
            }
        });

        // End button handler
        this.elements.endButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event from bubbling to form
            if (this.isSimulationRunning) {
                console.log("End button clicked");
                this.endSimulation();
            }
        });

        // Speed control
        this.elements.speedControl.addEventListener('input', () => this.updateSimulationSpeed());
    }


    initializeComponents() {
        // Create and register logger
        const logger = new SimulationLogger();
        this.registry.register('logger', logger);

        // Initialize charts
        this.charts = {
            size: null,
            speed: null,
            energy: null,
            metabolism: null
        };
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

            // Get logger from registry
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
            
            this.simulation.start();
            this.isSimulationRunning = true;
            this.updateSimulationSpeed();
            this.startUpdateInterval();

            this.elements.startButton.style.display = 'none';
            this.elements.endButton.style.display = 'inline-block';

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
                const speed = parseFloat(this.elements.speedControl.value);
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
        // Update summary stats
        document.getElementById('population-stat').textContent = `${stats.population_size}`;
        document.getElementById('food-stat').textContent = `${stats.food_count}`;
        document.getElementById('temperature-stat').textContent = `${stats.water_temperature.toFixed(1)}°C`;
        document.getElementById('speed-stat').textContent = `${stats.simulation_speed.toFixed(1)}x`;
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
