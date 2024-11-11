class GeneticFishSimulation {
    constructor(canvasId, params) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }
        this.ctx = this.canvas.getContext('2d');
        
        // Properly parse all parameters with defaults
        this.params = {
            population_size: Number(params.population_size) || 10,
            mutation_rate: Number(params.mutation_rate) || 0.01,
            crossover_rate: Number(params.crossover_rate) || 0.7,
            food_availability: Number(params.food_availability) || 1,
            water_temperature: Number(params.water_temperature) || 20,
            generation_length: Number(params.generation_length) || 60,
            breeding_strategy: 'keep_parents'
        };
        
        console.log("Initialized with parameters:", this.params);

        // Initialize simulation state
        this.fishes = [];
        this.food_items = [];
        this.is_running = false;
        this.speed_multiplier = 1;
        this.simulation_time = 0;
        this.last_animation_time = 0;
        this.stats = new SimulationStats();
        this.time_data = [];
        this.fish_data = [];
        
        // Generation tracking
        this.generation = 1;
        this.generation_length = this.params.generation_length;
        this.generation_start_time = 0;
        this.is_breeding = false;
        
        // Food generation
        this.food_interval = 1.0 / this.params.food_availability;
        this.time_since_last_food = 0;

        // State change callbacks
        this.stateChangeCallback = null;
        this.timerCallback = null;

        // Initialize
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.initializeFishes();

        // Add stats display elements
        this.overall_stats_display = document.createElement('div');
        this.overall_stats_display.id = 'overall-stats';
        this.overall_stats_display.className = 'overall-stats';
        
        // Find stats container or create one
        let statsContainer = document.getElementById('stats-container');
        if (!statsContainer) {
            statsContainer = document.createElement('div');
            statsContainer.id = 'stats-container';
            const timerElement = document.getElementById('simulation-timer');
            if (timerElement) {
                timerElement.parentNode.insertBefore(statsContainer, timerElement.nextSibling);
            }
        }
        statsContainer.appendChild(this.overall_stats_display);
    }

    setStateChangeCallback(callback) {
        this.stateChangeCallback = callback;
    }

    setTimerCallback(callback) {
        this.timerCallback = callback;
    }

    getSimulationState() {
        return {
            isRunning: this.is_running,
            isPaused: this.speed_multiplier === 0,
            generation: this.generation,
            simulationTime: this.simulation_time,
            speedMultiplier: this.speed_multiplier
        };
    }

    notifyStateChange() {
        if (this.stateChangeCallback) {
            this.stateChangeCallback(this.getSimulationState());
        }
    }

    updateTimers() {
        if (this.timerCallback) {
            this.timerCallback({
                elapsedTime: this.getSimulationDuration(),
                generationTime: this.formatTime(
                    Math.max(0, this.generation_length - 
                    (this.simulation_time - this.generation_start_time))
                ),
                generation: this.generation
            });
        }
    }

    start() {
        this.is_running = true;
        this.last_animation_time = performance.now();
        this.simulation_time = 0;
        this.generation_start_time = 0;
        this.generation = 1;
        this.stats.setGeneration(1);
        this.is_breeding = false;
        
        this.notifyStateChange();
        this.animate(this.last_animation_time);
    }

    stop() {
        this.is_running = false;
        this.notifyStateChange();
    }

    reset(params) {
        // Update parameters
        this.params = {
            population_size: Number(params.population_size) || 10,
            mutation_rate: Number(params.mutation_rate) || 0.01,
            crossover_rate: Number(params.crossover_rate) || 0.7,
            food_availability: Number(params.food_availability) || 1,
            water_temperature: Number(params.water_temperature) || 20,
            generation_length: Number(params.generation_length) || 60
        };
        
        this.generation_length = this.params.generation_length;
        this.food_interval = 1.0 / this.params.food_availability;
        
        // Reset state
        this.generation = 1;
        this.stats = new SimulationStats();
        this.stats.setGeneration(1);
        this.generation_start_time = 0;
        this.is_breeding = false;
        this.fishes = [];
        this.food_items = [];
        this.simulation_time = 0;
        this.last_animation_time = 0;
        this.time_since_last_food = 0;
        this.time_data = [];
        this.fish_data = [];
        
        this.initializeFishes();
        this.notifyStateChange();
    }

    formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    animate(currentTime) {
        if (!this.is_running) return;

        if (this.speed_multiplier === 0) {
            requestAnimationFrame((time) => this.animate(time));
            return;
        }

        const deltaTime = (currentTime - this.last_animation_time) / 1000;
        this.simulation_time += deltaTime * this.speed_multiplier;

        // Calculate generation time remaining
        const generationElapsed = this.simulation_time - this.generation_start_time;
        const timeRemaining = Math.max(0, this.generation_length - generationElapsed);
        
        // Update timers and stats every frame
        this.updateTimers();
        this.updateOverallStats();

        // Collect data every second of simulation time
        if (Math.floor(this.simulation_time) > this.time_data.length) {
            this.collectData();
        }

        // Check for generation end
        if (timeRemaining <= 0 && !this.is_breeding) {
            console.log("Generation ended, triggering breeding");
            this.triggerBreeding();
        }

        // Update food generation
        this.time_since_last_food += deltaTime * this.speed_multiplier;
        if (this.time_since_last_food >= this.food_interval) {
            this.generateFood();
            this.time_since_last_food = 0;
        }

        // Clear and redraw
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw simulation elements
        this.drawFood();
        this.updateAndDrawFishes(deltaTime);
        this.drawTime();
        this.drawGenerationTime();

        this.last_animation_time = currentTime;
        requestAnimationFrame((time) => this.animate(time));
    }

    updateAndDrawFishes(deltaTime) {
        // Update fish positions and states
        for (let i = 0; i < this.speed_multiplier; i++) {
            for (let j = this.fishes.length - 1; j >= 0; j--) {
                const fish = this.fishes[j];
                fish.update(this.canvas, this.food_items, this.params.water_temperature);
                
                if (fish.isDead()) {
                    this.fishes.splice(j, 1);
                }
            }
        }

        // Draw all living fish
        for (const fish of this.fishes) {
            fish.draw(this.ctx);
        }
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = window.innerHeight / 2;
            console.log(`Canvas resized to ${this.canvas.width}x${this.canvas.height}`);
        }
    }

    initializeFishes() {
        this.fishes = [];
        const maxAttempts = this.params.population_size * 2;
        let attempts = 0;
        
        while (this.fishes.length < this.params.population_size && attempts < maxAttempts) {
            attempts++;
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            
            // Check for minimum spacing between fish
            const minSpacing = 20;
            const tooClose = this.fishes.some(fish => 
                Math.hypot(fish.x - x, fish.y - y) < minSpacing
            );
            
            if (!tooClose) {
                const genome = {
                    color: Math.random(),
                    speed: Math.random(),
                    size: Math.random()
                };
                this.fishes.push(new Fish(x, y, genome, this.params.water_temperature));
            }
        }
        
        console.log(`Initialized ${this.fishes.length} fish`);
    }

    generateFood() {
        const padding = 20;
        const food = {
            x: padding + Math.random() * (this.canvas.width - 2 * padding),
            y: padding + Math.random() * (this.canvas.height - 2 * padding),
            radius: 3,
            color: 'rgb(0, 255, 0)'
        };
        this.food_items.push(food);
    }

    drawFood() {
        this.ctx.fillStyle = 'rgb(0, 255, 0)';
        for (const food of this.food_items) {
            this.ctx.beginPath();
            this.ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawTime() {
        const hours = Math.floor(this.simulation_time / 3600);
        const minutes = Math.floor((this.simulation_time % 3600) / 60);
        const seconds = Math.floor(this.simulation_time % 60);
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`Time: ${timeString}`, 10, 20);
    }

    drawGenerationTime() {
        const timeLeft = Math.max(0, this.generation_length - (this.simulation_time - this.generation_start_time));
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60);
        const timeString = `Gen ${this.generation} - Next: ${minutes}:${seconds.toString().padStart(2, '0')}`;

        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(timeString, 10, 40);
    }

    collectData() {
        if (this.fishes.length === 0) return;

        const meanValues = {
            size: 0,
            speed: 0,
            energy: 0,
            metabolism: 0
        };

        this.fishes.forEach(fish => {
            meanValues.size += Number(fish.size) || 0;
            meanValues.speed += Number(fish.speed) || 0;
            meanValues.energy += Number(fish.energy) || 0;
            meanValues.metabolism += Number(fish.metabolism) || 0;
        });

        const fishCount = this.fishes.length;
        Object.keys(meanValues).forEach(key => {
            meanValues[key] = Number((meanValues[key] / fishCount).toFixed(2));
        });

        this.time_data.push(Math.floor(this.simulation_time));
        this.fish_data.push(meanValues);

        this.stats.update(this.fishes);
    }

    getGraphData() {
        if (!this.time_data.length || !this.fish_data.length) {
            return {
                labels: [],
                datasets: []
            };
        }

        return {
            labels: this.time_data,
            datasets: [
                {
                    label: 'Average Size',
                    data: this.fish_data.map(d => Number(d.size) || 0),
                    borderColor: 'red',
                    fill: false
                },
                {
                    label: 'Average Speed',
                    data: this.fish_data.map(d => Number(d.speed) || 0),
                    borderColor: 'blue',
                    fill: false
                },
                {
                    label: 'Average Energy',
                    data: this.fish_data.map(d => Number(d.energy) || 0),
                    borderColor: 'green',
                    fill: false
                },
                {
                    label: 'Average Metabolism',
                    data: this.fish_data.map(d => Number(d.metabolism) || 0),
                    borderColor: 'purple',
                    fill: false
                }
            ]
        };
    }

    getStats() {
        return {
            population_size: this.fishes.length,
            food_count: this.food_items.length,
            water_temperature: this.params.water_temperature,
            simulation_speed: this.speed_multiplier,
            fish_stats: this.fishes.map(fish => ({
                color: fish.color || '#000',
                speed: (fish.speed || 0).toFixed(2),
                size: (fish.size || 0).toFixed(2),
                energy: (fish.energy || 0).toFixed(2),
                metabolism: (fish.metabolism || 0).toFixed(4)
            }))
        };
    }

    setSpeed(speed) {
        this.speed_multiplier = speed;
        this.notifyStateChange();
    }

    getSimulationDuration() {
        const totalSeconds = Math.floor(this.simulation_time);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

triggerBreeding() {
    if (this.is_breeding) return;
    this.is_breeding = true;
    
    const previousSpeed = this.speed_multiplier;
    this.setSpeed(0);

    // Get all living fish
    const livingFish = this.fishes.filter(fish => !fish.isDead());
    const numToBreed = Math.ceil(livingFish.length / 2);
    
    // Sort by energy/fitness
    const sortedFish = livingFish.sort((a, b) => b.energy - a.energy);
    
    // Split into breeding pool and non-breeding pool
    const breedingPool = sortedFish.slice(0, numToBreed);
    const nonBreedingPool = sortedFish.slice(numToBreed);
    
    console.log(`Breeding pool: ${breedingPool.length} fish, Non-breeding: ${nonBreedingPool.length} fish`);

    if (breedingPool.length === 0) {
        console.error('Population extinct');
        this.is_breeding = false;
        this.setSpeed(previousSpeed);
        return;
    }

    // Ensure even number of breeding fish (server expects pairs)
    if (breedingPool.length % 2 !== 0) {
        breedingPool.pop(); // Remove last fish if odd number
    }

    // Prepare breeding pool data - simplified to match server expectations
    const fish_data = breedingPool.map(fish => ({
        genome: {
            color: fish.genome.color,
            speed: fish.genome.speed,
            size: fish.genome.size
        }
    }));

    // Send only the essential data that the server expects
    fetch('/breed', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            fish_data: fish_data
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Breeding server error: ${response.status}`);
        }
        return response.json();
    })
    .then(newfish_data => {
        if (!Array.isArray(newfish_data) || newfish_data.length === 0) {
            throw new Error('Invalid breeding data received from server');
        }
        this.handleBreedingResponse(newfish_data, breedingPool, nonBreedingPool, previousSpeed);
    })
    .catch(error => {
        console.error('Breeding error:', error);
        this.is_breeding = false;
        this.setSpeed(previousSpeed);
        this.generation_start_time = this.simulation_time;
    });
}

handleBreedingResponse(newfish_data, breedingPool, nonBreedingPool, previousSpeed) {
    try {
        // Clear only food
        this.food_items = [];
        
        // Strategy 1: Keep parents + children
        if (this.params.breeding_strategy === 'keep_parents') {
            // Start with breeding pool (parents)
            this.fishes = [...breedingPool];
            
            // Add children to match original population
            const numChildrenNeeded = breedingPool.length;
            newfish_data.slice(0, numChildrenNeeded).forEach(fish_data => {
                const fish = new Fish(
                    Math.random() * this.canvas.width,
                    Math.random() * this.canvas.height,
                    fish_data.genome,
                    this.params.water_temperature
                );
                this.fishes.push(fish);
            });
        }
        // Strategy 2: Keep non-breeders + children
        else if (this.params.breeding_strategy === 'keep_non_breeders') {
            // Start with non-breeding pool
            this.fishes = [...nonBreedingPool];
            
            // Add children to match original population
            const numChildrenNeeded = nonBreedingPool.length;
            newfish_data.slice(0, numChildrenNeeded).forEach(fish_data => {
                const fish = new Fish(
                    Math.random() * this.canvas.width,
                    Math.random() * this.canvas.height,
                    fish_data.genome,
                    this.params.water_temperature
                );
                this.fishes.push(fish);
            });
        }

        console.log(`New generation created. Population: ${this.fishes.length}`);

        // Increment generation
        this.generation++;
        this.stats.setGeneration(this.generation);
        
        // Reset generation timer
        this.generation_start_time = this.simulation_time;
        
        // Update stats with new population
        this.stats.update(this.fishes);
        this.updateOverallStats();

    } catch (error) {
        console.error('Error handling breeding response:', error);
    } finally {
        this.is_breeding = false;
        this.setSpeed(previousSpeed);
    }
}

    updateOverallStats() {
        if (!this.stats || !this.overall_stats_display) return;

        const currentStats = this.getDetailedStats();
        this.stats.setGeneration(this.generation);
        const generationStats = this.stats.getCurrentStats();

        const html = `
            <div class="stats-group">
                <div class="stat-item">
                    <label>Population:</label>
                    <span>${this.fishes.length}/${this.params.population_size}</span>
                </div>
                <div class="stat-item">
                    <label>Generation:</label>
                    <span>${this.generation}</span>
                </div>
                <div class="stat-item">
                    <label>Time to Next Gen:</label>
                    <span>${this.formatTime(Math.max(0, this.generation_length - (this.simulation_time - this.generation_start_time)))}</span>
                </div>
                <div class="stat-item">
                    <label>Average Energy:</label>
                    <span>${currentStats.averageEnergy.toFixed(1)}</span>
                </div>
                <div class="stat-item">
                    <label>Average Size:</label>
                    <span>${currentStats.averageSize.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <label>Average Speed:</label>
                    <span>${currentStats.averageSpeed.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <label>Average Metabolism:</label>
                    <span>${currentStats.averageMetabolism.toFixed(4)}</span>
                </div>
            </div>
            <div class="generation-stats">
                <div class="stat-item">
                    <label>Peak Population:</label>
                    <span>${generationStats.peakPopulation || 0}</span>
                </div>
                <div class="stat-item">
                    <label>Survival Rate:</label>
                    <span>${((generationStats.survivalRate || 0) * 100).toFixed(1)}%</span>
                </div>
            </div>
        `;

        this.overall_stats_display.innerHTML = html;
    }

    // Add getDetailedStats method
    getDetailedStats() {
        const stats = {
            averageEnergy: 0,
            bestEnergy: 0,
            averageSize: 0,
            averageSpeed: 0,
            averageMetabolism: 0,
            totalFish: this.fishes.length
        };

        if (this.fishes.length === 0) return stats;

        const totals = this.fishes.reduce((acc, fish) => {
            acc.energy += Number(fish.energy) || 0;
            acc.size += Number(fish.size) || 0;
            acc.speed += Number(fish.speed) || 0;
            acc.metabolism += Number(fish.metabolism) || 0;
            acc.bestEnergy = Math.max(acc.bestEnergy, fish.energy);
            return acc;
        }, { energy: 0, size: 0, speed: 0, metabolism: 0, bestEnergy: 0 });

        return {
            averageEnergy: totals.energy / this.fishes.length,
            bestEnergy: totals.bestEnergy,
            averageSize: totals.size / this.fishes.length,
            averageSpeed: totals.speed / this.fishes.length,
            averageMetabolism: totals.metabolism / this.fishes.length
        };
    }

}
