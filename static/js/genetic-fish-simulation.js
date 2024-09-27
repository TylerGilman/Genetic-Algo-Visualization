class GeneticFishSimulation {
    constructor(canvasId, params) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.params = params;
        this.fishes = [];
        this.isRunning = false;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight / 2;
        
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
                speed: Math.random()
            };
            this.fishes.push(new Fish(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                genome
            ));
        }
    }

    start() {
        this.isRunning = true;
        this.initializeFishes();
        this.animate();
    }

    animate() {
        if (!this.isRunning) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const fish of this.fishes) {
            fish.update(this.canvas);
            fish.draw(this.ctx);
        }

        requestAnimationFrame(() => this.animate());
    }

    updateParameters(newParams) {
        this.params = { ...this.params, ...newParams };
    }
}
