class GeneticFishSimulation {
    constructor(canvasId, params) {
        console.log("Initializing GeneticFishSimulation", canvasId, params);
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error("Canvas element not found:", canvasId);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.params = params;
        this.fishes = [];
        this.foodItems = [];
        this.isRunning = false;
        this.speedMultiplier = 1;
        this.lastFoodTime = 0;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        console.log("GeneticFishSimulation initialized");
    }

    resizeCanvas() {
        console.log("Resizing canvas");
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        console.log("Canvas resized to", this.canvas.width, "x", this.canvas.height);

        if (this.isRunning) {
            this.initializeFishes();
        }
    }

    initializeFishes() {
        console.log("Initializing fishes");
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
        console.log("Fishes initialized:", this.fishes.length);
    }

    start() {
        console.log("Starting simulation");
        this.isRunning = true;
        this.initializeFishes();
        this.animate();
        console.log("Simulation started");
    }

    animate(currentTime) {
        if (!this.isRunning) {
            console.log("Simulation stopped");
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (currentTime - this.lastFoodTime > 1000 / (this.params.foodAvailability * this.speedMultiplier)) {
            this.generateFood();
            this.lastFoodTime = currentTime;
        }

        this.drawFood();

        for (let i = 0; i < this.speedMultiplier; i++) {
            for (let j = this.fishes.length - 1; j >= 0; j--) {
                const fish = this.fishes[j];
                fish.update(this.canvas, this.foodItems, this.params.waterTemperature);
                
                if (fish.isDead()) {
                    this.fishes.splice(j, 1);
                }
            }
        }

        for (const fish of this.fishes) {
            fish.draw(this.ctx);
        }

        requestAnimationFrame((time) => this.animate(time));
    }

    setSpeed(speed) {
        this.speedMultiplier = speed;
    }

    generateFood() {
        const food = {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
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

    updateParameters(newParams) {
        this.params = { ...this.params, ...newParams };
        // Update fish metabolism when water temperature changes
        for (const fish of this.fishes) {
            fish.metabolism = fish.calculateMetabolism(this.params.waterTemperature);
        }
    }
}
