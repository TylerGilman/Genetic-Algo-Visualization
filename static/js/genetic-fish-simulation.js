class GeneticFishSimulation {
    constructor(canvasId, params) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Properly parse all parameters with defaults
        this.params = {
            populationSize: Number(params.populationSize) || 10,
            mutation_rate: Number(params.mutation_rate) || 0.01,
            crossover_rate: Number(params.crossover_rate) || 0.7,
            foodAvailability: Number(params.foodAvailability) || 1,
            water_temperature: Number(params.water_temperature) || 20,
            generation_length: Number(params.generation_length) || 60
        };
        
        console.log("Initialized with parameters:", this.params); // Debug log

        this.fishes = [];
        this.foodItems = [];
        this.isRunning = false;
        this.speedMultiplier = 1;
        this.simulationTime = 0;
        this.lastAnimationTime = 0;
        this.stats = new SimulationStats();
        this.timeData = [];
        this.fishData = [];
        
        // Add stats display elements
        this.overallStatsDisplay = document.createElement('div');
        this.overallStatsDisplay.id = 'overall-stats';
        this.overallStatsDisplay.className = 'overall-stats';
        document.getElementById('simulation-timer').after(this.overallStatsDisplay);
        this.isPaused = false;
        
        // Generation tracking
        this.generation = 1;
        this.generationLength = this.params.generation_length;
        this.generationStartTime = 0;
        this.isBreeding = false;
        
        // Food generation
        this.foodInterval = 1.0 / this.params.foodAvailability;
        this.timeSinceLastFood = 0;

        // Initialize generation display
        // Debug element finding
        this.generationDisplay = document.getElementById('generation-number');
        this.generationCountdown = document.getElementById('generation-countdown');
        
        console.log("Timer elements found:", {
            generationDisplay: this.generationDisplay,
            generationCountdown: this.generationCountdown
        });

        // Initialize timers
        if (this.generationDisplay && this.generationCountdown) {
            this.generationDisplay.textContent = '1';
            this.generationCountdown.textContent = '00:00';
            console.log("Timer elements initialized");
        }

        console.log("Generation length set to:", this.generationLength);

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.initializeFishes();


    }

  start() {
      this.isRunning = true;
      this.lastAnimationTime = performance.now();
      this.simulationTime = 0;
      this.generationStartTime = 0;
      this.generation = 1;
      this.stats.setGeneration(1); // Make sure stats generation is set
      this.isBreeding = false;
      
      // Reset timer displays
      if (this.generationDisplay) {
          this.generationDisplay.textContent = '1';
      }
      if (this.generationCountdown) {
          this.generationCountdown.textContent = this.formatTime(this.generationLength);
      }

      this.animate(this.lastAnimationTime);
  }

reset(params) {
    // Properly parse all parameters with defaults
    this.params = {
        populationSize: Number(params.populationSize) || 10,
        mutation_rate: Number(params.mutation_rate) || 0.01,
        crossover_rate: Number(params.crossover_rate) || 0.7,
        foodAvailability: Number(params.foodAvailability) || 1,
        water_temperature: Number(params.water_temperature) || 20,
        generation_length: Number(params.generation_length) || 60
    };
    
    this.generationLength = this.params.generation_length;
    this.foodInterval = 1.0 / this.params.foodAvailability;
  this.generation = 1;
    this.stats = new SimulationStats();
    this.stats.setGeneration(1); // Make sure stats generation is set
    this.generationStartTime = 0;
    this.isBreeding = false;
    this.fishes = [];
    this.foodItems = [];
    this.simulationTime = 0;
    this.lastAnimationTime = 0;
    this.timeSinceLastFood = 0;
    this.timeData = [];
    this.fishData = [];
    this.updateOverallStats();
    
    this.initializeFishes();
}

    formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    animate(currentTime) {
        if (!this.isRunning) return;

        if (this.isPaused) {
            requestAnimationFrame((time) => this.animate(time));
            return;
        }

        const deltaTime = (currentTime - this.lastAnimationTime) / 1000;
        this.simulationTime += deltaTime * this.speedMultiplier;

        // Calculate time remaining in current generation
        const generationElapsed = this.simulationTime - this.generationStartTime;
        const timeRemaining = Math.max(0, this.generationLength - generationElapsed);
        
        // Update countdown display
        if (this.generationCountdown) {
            const newValue = this.formatTime(timeRemaining);
            this.generationCountdown.textContent = newValue;
        }

        // Collect data every second of simulation time
        if (Math.floor(this.simulationTime) > this.timeData.length) {
            this.collectData();
        }

    // Check for generation end
    if (timeRemaining <= 0 && !this.isBreeding) {
        console.log("Generation ended, triggering breeding");
        this.triggerBreeding();
    }

        // Update food generation
        this.timeSinceLastFood += deltaTime * this.speedMultiplier;
        if (this.timeSinceLastFood >= this.foodInterval) {
            this.generateFood();
            this.timeSinceLastFood = 0;
        }


        // Clear and redraw
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background (optional - helps see food better)
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw food and fish
        this.drawFood();

        // Update and draw fishes
        for (let i = 0; i < this.speedMultiplier; i++) {
            for (let j = this.fishes.length - 1; j >= 0; j--) {
                const fish = this.fishes[j];
                fish.update(this.canvas, this.foodItems, this.params.waterTemperature);
                
                if (fish.isDead()) {
                    this.fishes.splice(j, 1);
                }
            }
        }

        // Draw fishes
        for (const fish of this.fishes) {
            fish.draw(this.ctx);
        }

        // Draw timers
        this.drawTime();
        this.drawGenerationTime();

        this.lastAnimationTime = currentTime;
        requestAnimationFrame((time) => this.animate(time));
    }

    getStats() {
        if (!this.fishes || this.fishes.length === 0) {
            return {
                populationSize: 0,
                foodCount: this.foodItems ? this.foodItems.length : 0,
                waterTemperature: this.params.water_temperature,
                simulationSpeed: this.speedMultiplier,
                fishStats: []
            };
        }

        return {
            populationSize: this.fishes.length,
            foodCount: this.foodItems.length,
            waterTemperature: this.params.water_temperature,
            simulationSpeed: this.speedMultiplier,
            fishStats: this.fishes.map(fish => ({
                color: fish.color || '#000',
                speed: (fish.speed || 0).toFixed(2),
                size: (fish.size || 0).toFixed(2),
                energy: (fish.energy || 0).toFixed(2),
                metabolism: (fish.metabolism || 0).toFixed(4)
            }))
        };
    }

    updateOverallStats() {
        const stats = this.stats.getCurrentStats();
        const html = `
            <div class="stat-item">Population: ${stats.populationSize}</div>
            <div class="stat-item">Average Energy: ${stats.averageFitness}</div>
            <div class="stat-item">Best Energy: ${stats.bestFitness}</div>
        `;
        if (this.overallStatsDisplay) {
            this.overallStatsDisplay.innerHTML = html;
        }
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = window.innerHeight / 2;
        console.log(`Canvas resized to ${this.canvas.width}x${this.canvas.height}`);
        
        // Reinitialize fishes if the simulation is already running
        if (this.isRunning) {
            this.initializeFishes();
        }
    }

    initializeFishes() {
        this.fishes = [];
        for (let i = 0; i < this.params.populationSize; i++) {
            const genome = {
                color: Math.random(),
                speed: Math.random(),
                size: Math.random()
            };
            this.fishes.push(new Fish(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                genome,
                this.params.waterTemperature
            ));
        }
    }

    generateFood() {
        const padding = 20; // Keep food away from edges
        const food = {
            x: padding + Math.random() * (this.canvas.width - 2 * padding),
            y: padding + Math.random() * (this.canvas.height - 2 * padding),
            radius: 3,
            color: 'rgb(0, 255, 0)' // Bright green for visibility
        };
        this.foodItems.push(food);
        console.log("Generated food at:", food.x, food.y); // Debug log
    }

    drawFood() {
        this.ctx.fillStyle = 'rgb(0, 255, 0)';
        for (const food of this.foodItems) {
            this.ctx.beginPath();
            this.ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.closePath();
        }
    }

    drawTime() {
    const hours = Math.floor(this.simulationTime / 3600);
    const minutes = Math.floor((this.simulationTime % 3600) / 60);
    const seconds = Math.floor(this.simulationTime % 60);
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = 'white';
    this.ctx.fillText(`Time: ${timeString}`, 10, 20);

    // Also update the hidden timer element for other components that might need it
    const timerElement = document.getElementById('simulation-timer');
    if (timerElement) {
        timerElement.textContent = `Elapsed Time: ${timeString}`;
    }
}

collectData() {
    if (this.fishes.length === 0) return;

    const meanValues = {
        size: 0,
        speed: 0,
        energy: 0,
        metabolism: 0
    };

    // Debug log fish values
    console.log("Fish values:", this.fishes.map(fish => ({
        energy: fish.energy,
        metabolism: fish.metabolism
    })));

    // Calculate sums
    this.fishes.forEach(fish => {
        meanValues.size += Number(fish.size) || 0;
        meanValues.speed += Number(fish.speed) || 0;
        meanValues.energy += Number(fish.energy) || 0;
        meanValues.metabolism += Number(fish.metabolism) || 0;
    });

    // Calculate averages
    const fishCount = this.fishes.length;
    Object.keys(meanValues).forEach(key => {
        meanValues[key] = Number((meanValues[key] / fishCount).toFixed(2));
    });

    // Debug log mean values
    console.log("Mean values:", meanValues);

    // Update time and fish data for graphs
    this.timeData.push(Math.floor(this.simulationTime));
    this.fishData.push(meanValues);

    // Update simulation stats
    this.stats.update(this.fishes);
    this.updateOverallStats();
}

getGraphData() {
    if (!this.timeData.length || !this.fishData.length) {
        return {
            labels: [],
            datasets: []
        };
    }

    return {
        labels: this.timeData,
        datasets: [
            {
                label: 'Average Size',
                data: this.fishData.map(d => Number(d.size) || 0),
                borderColor: 'red',
                fill: false
            },
            {
                label: 'Average Speed',
                data: this.fishData.map(d => Number(d.speed) || 0),
                borderColor: 'blue',
                fill: false
            },
            {
                label: 'Average Energy',
                data: this.fishData.map(d => Number(d.energy) || 0),
                borderColor: 'green',
                fill: false
            },
            {
                label: 'Average Metabolism',
                data: this.fishData.map(d => Number(d.metabolism) || 0),
                borderColor: 'purple',
                fill: false
            }
        ]
    };
}


    normalizeData(data) {
        const maxValues = {
            size: Math.max(...data.map(d => d.size), 1),
            speed: Math.max(...data.map(d => d.speed), 1),
            energy: Math.max(...data.map(d => d.energy), 1),
            metabolism: Math.max(...data.map(d => d.metabolism), 1)
        };

        return data.map(d => ({
            size: d.size / maxValues.size,
            speed: d.speed / maxValues.speed,
            energy: d.energy / maxValues.energy,
            metabolism: d.metabolism / maxValues.metabolism
        }));
    }

    setSpeed(speed) {
        this.speedMultiplier = speed;
        this.isPaused = (speed === 0);
    }

    getSimulationDuration() {
        const totalSeconds = Math.floor(this.simulationTime);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateParameters(newParams) {
        this.params = { ...this.params, ...newParams };
        // Update fish metabolism when water temperature changes
        for (const fish of this.fishes) {
            fish.metabolism = fish.calculateMetabolism(this.params.waterTemperature);
        }
    }

    drawGenerationTime() {
        const timeLeft = Math.max(0, this.generationLength - (this.simulationTime - this.generationStartTime));
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60);
        const timeString = `Gen ${this.generation} - Next: ${minutes}:${seconds.toString().padStart(2, '0')}`;

        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(timeString, 10, 40);
    }

  triggerBreeding() {
      if (this.isBreeding) return;
      this.isBreeding = true;
      
      // Pause simulation temporarily
      const previousSpeed = this.speedMultiplier;
      this.setSpeed(0);

      // Get top 50% of initial population size
      const livingFish = this.fishes.filter(fish => !fish.isDead());
      const initialPopSize = this.params.populationSize;
      const numToBreed = Math.ceil(initialPopSize / 2);
      
      // Sort all living fish by energy
      const sortedFish = livingFish.sort((a, b) => b.energy - a.energy);
      
      // Take top 50% of original population size or all living fish if less than that
      const breedingPool = sortedFish.slice(0, Math.min(numToBreed, sortedFish.length));
      
      console.log(`Breeding pool size: ${breedingPool.length} from ${livingFish.length} living fish (initial pop: ${initialPopSize})`);

      if (breedingPool.length === 0) {
          console.error('No fish available for breeding - population extinct');
          this.isBreeding = false;
          this.setSpeed(previousSpeed);
          return;
      }

      // Prepare fish data for breeding
      const fishData = breedingPool.map(fish => ({
          genome: {
              color: fish.genome.color,
              speed: fish.genome.speed,
              size: fish.genome.size
          },
          energy: fish.energy
      }));

      // Send breeding request to server
      fetch('/breed', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              fish_data: fishData,
              target_population: this.params.populationSize // Send target population size
          })
      })
      .then(response => {
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
      })
      .then(newFishData => {
          this.handleBreedingResponse(newFishData, previousSpeed);
      })
      .catch(error => {
          console.error('Breeding error:', error);
          this.isBreeding = false;
          this.setSpeed(previousSpeed);
      });
  }

handleBreedingResponse(newFishData, previousSpeed) {
    // Clear existing fish and food
    this.fishes = [];
    this.foodItems = [];
    
    // Create new fish from breeding data
    newFishData.forEach(fishData => {
        const fish = new Fish(
            Math.random() * this.canvas.width,
            Math.random() * this.canvas.height,
            fishData.genome,
            this.params.waterTemperature
        );
        this.fishes.push(fish);
    });

    // Increment generation properly
    this.generation++;
    this.stats.setGeneration(this.generation); // Use setGeneration instead of incrementGeneration
    
    // Update displays
    if (this.generationDisplay) {
        this.generationDisplay.textContent = this.generation.toString();
    }
    
    // Reset generation timer
    this.generationStartTime = this.simulationTime;
    
    // Update stats immediately with new population
    this.stats.update(this.fishes);
    this.updateOverallStats();

    this.isBreeding = false;
    this.setSpeed(previousSpeed);
}

}
