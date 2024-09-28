class GeneticFishSimulation {
    constructor(canvasId, params) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.params = params;
        this.fishes = [];
        this.foodItems = [];
        this.isRunning = false;
        this.speedMultiplier = 1;
        this.simulationTime = 0;
        this.lastAnimationTime = 0;
        this.lastFoodTime = 0;
        this.timeData = [];
        this.fishData = [];
        this.isPaused = false;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.initializeFishes();
    }

    start() {
        this.isRunning = true;
        this.lastAnimationTime = performance.now();
        this.lastFoodTime = this.lastAnimationTime;
        this.animate(this.lastAnimationTime);
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


    reset(params) {
        this.params = params;
        this.fishes = [];
        this.foodItems = [];
        this.simulationTime = 0;
        this.lastAnimationTime = 0;
        this.lastFoodTime = 0;
        this.timeData = [];
        this.fishData = [];
        this.initializeFishes();
    }

    generateFood() {
        const food = {
            x: (Math.random() * (this.canvas.width - 100)) + 50,
            y: (Math.random() * (this.canvas.height - 100)) + 50,
            radius: 3,
            color: 'green'
        };
        this.foodItems.push(food);
    }

    drawFood() {
        for (const food of this.foodItems) {
            this.ctx.beginPath();
            this.ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = food.color;
            this.ctx.fill();
        }
    }

    drawTime() {
        const minutes = Math.floor(this.simulationTime / 60);
        const seconds = Math.floor(this.simulationTime % 60);
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`Time: ${timeString}`, 10, 20);
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
            meanValues.size += fish.size;
            meanValues.speed += fish.speed;
            meanValues.energy += fish.energy;
            meanValues.metabolism += fish.metabolism;
        });

        const fishCount = this.fishes.length;
        for (let key in meanValues) {
            meanValues[key] /= fishCount;
        }

        this.timeData.push(Math.floor(this.simulationTime));
        this.fishData.push(meanValues);
    }

    getGraphData() {
        const normalizedData = this.normalizeData(this.fishData);
        return {
            labels: this.timeData,
            datasets: [
                { label: 'Average Size', data: normalizedData.map(d => d.size) },
                { label: 'Average Speed', data: normalizedData.map(d => d.speed) },
                { label: 'Average Energy', data: normalizedData.map(d => d.energy) },
                { label: 'Average Metabolism', data: normalizedData.map(d => d.metabolism) }
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

    animate(currentTime) {
        if (!this.isRunning) return;

        if (this.isPaused) {
            requestAnimationFrame((time) => this.animate(time));
            return;
        }

        const deltaTime = (currentTime - this.lastAnimationTime) / 1000; // Convert to seconds
        this.simulationTime += deltaTime * this.speedMultiplier;

        // Generate food
        if (currentTime - this.lastFoodTime > this.foodGenerationInterval / this.speedMultiplier) {
            this.generateFood();
            this.lastFoodTime = currentTime;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw food
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

        // Collect data every second of simulation time
        if (Math.floor(this.simulationTime) > this.timeData.length) {
            this.collectData();
        }

        this.drawTime();

        this.lastAnimationTime = currentTime;
        requestAnimationFrame((time) => this.animate(time));
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
}
