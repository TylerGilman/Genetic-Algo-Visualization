class UIController {
    constructor() {
        console.log("Initializing UIController");

        // Get references to DOM elements
        this.form = document.getElementById('simulation-form');
        this.startButton = document.getElementById('start-simulation');
        this.endButton = document.getElementById('end-simulation');

        // Check for missing elements
        if (!this.form) console.error("Form not found: 'simulation-form'");
        if (!this.startButton) console.error("Start button not found: 'start-simulation'");
        if (!this.endButton) console.error("End button not found: 'end-simulation'");

        if (!this.form || !this.startButton || !this.endButton) {
            throw new Error("Required DOM elements are missing. Check IDs: 'simulation-form', 'start-simulation', 'end-simulation'.");
        }

        // Initially hide the End button
        this.endButton.style.display = 'none';

        // Initialize event listeners
        this.initEventListeners();

        console.log("UIController initialized");
    }

    initEventListeners() {
        console.log("Initializing event listeners");

        // Add listener to form submit
        this.form.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent default form submission
            this.startSimulation(); // Start the simulation
        });

        // Add listener to end simulation button
        this.endButton.addEventListener('click', () => {
            console.log("End button clicked");
            this.endSimulation();
        });
    }

    startSimulation() {
        console.log("Starting simulation...");

        try {
            if (this.simulation) {
                console.warn("Simulation is already running. End it before starting a new one.");
                return;
            }

            // Collect form values
            const params = this.getFormParams();
            if (!this.validateParams(params)) {
                console.error("Invalid simulation parameters");
                return;
            }

            // Create a new simulation instance
            this.simulation = new GeneticFishSimulation('fishtank', params);

            // Clear logs before starting
            if (this.simulation.logger) {
                this.simulation.logger.clear();
            }

            // Start the simulation
            this.simulation.start();

            // Toggle buttons
            this.toggleButtons(false);

            console.log("Simulation started with params:", params);
        } catch (error) {
            console.error("Error starting simulation:", error);
        }
    }

    endSimulation() {
        console.log("Ending simulation...");

        try {
            if (this.simulation) {
                this.simulation.stop();
                this.simulation = null;
            }

            // Toggle buttons
            this.toggleButtons(true);

            console.log("Simulation ended successfully");
        } catch (error) {
            console.error("Error ending simulation:", error);
        }
    }

    toggleButtons(showStart) {
        console.log(`Toggling buttons: ${showStart ? "Show Start, Hide End" : "Show End, Hide Start"}`);
        this.startButton.style.display = showStart ? 'inline-block' : 'none';
        this.endButton.style.display = showStart ? 'none' : 'inline-block';
    }

    getFormParams() {
        try {
            return {
                population_size: Number(document.getElementById('population_size').value),
                mutation_rate: Number(document.getElementById('mutation_rate').value),
                crossover_rate: Number(document.getElementById('crossover_rate').value),
                food_availability: Number(document.getElementById('food_availability').value),
                water_temperature: Number(document.getElementById('water_temperature').value),
                generation_length: Number(document.getElementById('generation_length').value),
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
            'generation_length',
        ];

        return requiredParams.every((param) => {
            const value = params[param];
            return value !== undefined && value !== null && !isNaN(value);
        });
    }
}
