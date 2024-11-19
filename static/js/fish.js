class ConstrainedPoint {
    constructor(x, y, constraintRadius, speed, isHead = false) {
        this.x = x;
        this.y = y;
        this.constraintRadius = constraintRadius;
        this.previousPoint = null;
        this.nextPoint = null;
        this.isHead = isHead;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = speed;
        this.turnRate = 0.2 + (Math.random() * 0.2); // Random turn rate between 0.2 and 0.4
        this.waveAngle = 0.4;
    }

    move(canvas) {
        if (this.isHead) {
            this.waveAngle += 0.1;
            const waveOffset = Math.sin(this.waveAngle) * 0.3;
            
            this.x += Math.cos(this.angle + waveOffset) * this.speed;
            this.y += Math.sin(this.angle + waveOffset) * this.speed;

            const margin = 30;

            if (this.x < margin) this.angle = 0;
            if (this.x > canvas.width - margin) this.angle = Math.PI;
            if (this.y < margin) this.angle = Math.PI / 2;
            if (this.y > canvas.height - margin) this.angle = -Math.PI / 2;

            this.x = Math.max(5, Math.min(canvas.width - 5, this.x));
            this.y = Math.max(5, Math.min(canvas.height - 5, this.y));

            if (Math.random() < 0.02) {
                this.angle += (Math.random() - 0.5) * Math.PI / 4;
            }
        }
    }

    constrain() {
        if (this.previousPoint) {
            const dx = this.x - this.previousPoint.x;
            const dy = this.y - this.previousPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > this.constraintRadius) {
                const angle = Math.atan2(dy, dx);
                this.x = this.previousPoint.x + Math.cos(angle) * this.constraintRadius;
                this.y = this.previousPoint.y + Math.sin(angle) * this.constraintRadius;
            }
        }
    }
}

class Fish {
constructor(x, y, genome, water_temperature, logger) {
    this.genome = genome;
    this.color = this.getColorFromGenome();
    this.speed = this.getSpeedFromGenome();
    this.size = this.getSizeFromGenome();
    this.logger = logger;
    
    // Initialize neural network weights from genome if available
    if (genome.neural_weights) {
        this.wih = genome.neural_weights.wih;
        this.who = genome.neural_weights.who;
    } else {
        this.wih = this.initializeMatrix(1, 5); // Input -> Hidden
        this.who = this.initializeMatrix(2, 5); // Hidden -> Output
    }

        
        // Physical properties adjusted for more realistic fish shape
        this.constraintRadius = 3 * this.size; // Reduced for sleeker shape
        this.numSegments = 8; // Increased segments for smoother movement
        this.energy = 100;
        this.metabolism = this.calculateMetabolism(water_temperature);
        
        // Body shape parameters
        this.bodySizes = Array.from({ length: this.numSegments }, (_, i) => {
            if (i === 0) return 4 * this.size; // Head slightly smaller
            const t = i / (this.numSegments - 1);
            return 3.5 * this.size * (1 - Math.pow(t, 0.8)); // More gradual taper
        });
        
        // Initialize points for fish body
        this.points = Array.from({ length: this.numSegments }, (_, i) =>
            new ConstrainedPoint(x + i * this.constraintRadius, y, this.constraintRadius, this.speed, i === 0)
        );
        
        // Connect points
        for (let i = 1; i < this.points.length; i++) {
            this.points[i].previousPoint = this.points[i - 1];
            this.points[i - 1].nextPoint = this.points[i];
        }

        // Convert genome size (0-1) to realistic fish mass in grams
        // Small fish ~1g to large fish ~1000g using exponential scaling
        this.massInGrams = Math.exp(genome.size * Math.log(1000)); // 1g to 1000g
        
        // Scale visual size based on mass (cube root for linear dimensions)
        this.visualScale = Math.pow(this.massInGrams / 1000, 1/3) * 3; // Scale 3 is max visual size
        
        this.constraintRadius = 3 * this.visualScale;
        this.numSegments = 8;
        this.predatorRange = 100; // Detection range for predators/prey
        this.canEatRatio = 1/4;  // Can eat fish 1/5 or smaller

        // Initialize neural network
        this.network = {
            forward: function(inputs) {
                const hidden = new Array(5).fill(0);
                // Process input layer to hidden layer
                for (let i = 0; i < hidden.length; i++) {
                    for (let j = 0; j < inputs.length; j++) {
                        hidden[i] += (this.wih[i] || [])[j] || 0 * inputs[j];
                    }
                    hidden[i] = Math.tanh(hidden[i]);
                }

                // Process hidden layer to output layer
                const outputs = new Array(2).fill(0);
                for (let i = 0; i < outputs.length; i++) {
                    for (let j = 0; j < hidden.length; j++) {
                        outputs[i] += (this.who[i] || [])[j] || 0 * hidden[j];
                    }
                    outputs[i] = Math.tanh(outputs[i]);
                }
                return outputs;
            },
            wih: genome.neural_weights?.wih || this.initializeMatrix(5, 6),  // 6 inputs, 5 hidden
            who: genome.neural_weights?.who || this.initializeMatrix(2, 5)   // 5 hidden, 2 outputs
        };
    }

    // Neural network initialization
    initializeMatrix(rows, cols) {
        return Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => (Math.random() * 2) - 1)
        );
    }


    isDead() {
      return this.energy <= 0;
  }

    get finalEnergy() {
        return this._finalEnergy || this.energy;
    }

    set finalEnergy(value) {
        this._finalEnergy = value;
    }

    // Neural network forward pass
    think(nearestFood, otherFish) {
        const dx = nearestFood.x - this.points[0].x;
        const dy = nearestFood.y - this.points[0].y;
        const foodDistance = Math.hypot(dx, dy);
        const foodAngle = Math.atan2(dy, dx);
        
        // Find nearest predator and prey
        let nearestPredator = null;
        let nearestPrey = null;
        let minPredatorDist = this.predatorRange;
        let minPreyDist = this.predatorRange;

        otherFish.forEach(other => {
            if (other === this) return;
            
            const fishDx = other.points[0].x - this.points[0].x;
            const fishDy = other.points[0].y - this.points[0].y;
            const distance = Math.hypot(fishDx, fishDy);
            
            if (distance > this.predatorRange) return;

            // Check if other fish can eat us
            if (this.size <= other.size * other.canEatRatio) {
                if (distance < minPredatorDist) {
                    minPredatorDist = distance;
                    nearestPredator = other;
                }
            }
            
            // Check if we can eat other fish
            if (other.size <= this.size * this.canEatRatio) {
                if (distance < minPreyDist) {
                    minPreyDist = distance;
                    nearestPrey = other;
                }
            }
        });

        // Calculate normalized inputs for neural network
        const currentAngle = Math.atan2(
            this.points[1].y - this.points[0].y,
            this.points[1].x - this.points[0].x
        );

        // Prepare inputs
        const inputs = [
            // Food angle [-1, 1]
            ((foodAngle - currentAngle + Math.PI) % (2 * Math.PI) - Math.PI) / Math.PI,
            // Food distance [0, 1]
            Math.min(1, foodDistance / this.predatorRange),
        ];

        if (nearestPredator) {
            const predatorDx = nearestPredator.points[0].x - this.points[0].x;
            const predatorDy = nearestPredator.points[0].y - this.points[0].y;
            const predatorAngle = Math.atan2(predatorDy, predatorDx);
            
            inputs.push(
                // Predator angle [-1, 1]
                ((predatorAngle - currentAngle + Math.PI) % (2 * Math.PI) - Math.PI) / Math.PI,
                // Predator distance [0, 1]
                Math.min(1, minPredatorDist / this.predatorRange)
            );
        } else {
            inputs.push(0, 1); // No predator
        }

        if (nearestPrey) {
            const preyDx = nearestPrey.points[0].x - this.points[0].x;
            const preyDy = nearestPrey.points[0].y - this.points[0].y;
            const preyAngle = Math.atan2(preyDy, preyDx);
            
            inputs.push(
                // Prey angle [-1, 1]
                ((preyAngle - currentAngle + Math.PI) % (2 * Math.PI) - Math.PI) / Math.PI,
                // Prey distance [0, 1]
                Math.min(1, minPreyDist / this.predatorRange)
            );
        } else {
            inputs.push(0, 1); // No prey
        }

        // Get neural network response
        const output = this.network.forward(inputs);
        
        return {
            turn: output[0],
            speed: output[1]
        };
    }

update(canvas, foodItems, otherFish, water_temperature, logger) {
    if (this.isDead()) {
        this.metabolism = this.calculateMetabolism(water_temperature);
        this.energy -= this.metabolism;
        return;
    }

    let nearestFood = null;
    let minDist = Infinity;
    
    for (const food of foodItems) {
        const dist = Math.hypot(food.x - this.points[0].x, food.y - this.points[0].y);
        if (dist < minDist) {
            minDist = dist;
            nearestFood = food;
        }
    }
    
    if (nearestFood) {
        const response = this.think(nearestFood, otherFish);
        
        if (this.points[0].isHead) {
            this.points[0].angle += response.turn * 0.1;
            this.points[0].speed = Math.max(0.1, Math.min(this.speed, 
                this.points[0].speed + response.speed * 0.1));
        }
        
        this.eat(foodItems, otherFish);
    }

    this.metabolism = this.calculateMetabolism(water_temperature)
    const energyLoss = this.metabolism * (0.5 + this.points[0].speed / this.speed);
    // Penalty for not moving.
    this.energy = Math.max(-100, this.energy - energyLoss);
    
    for (const point of this.points) {
        point.move(canvas);
        point.constrain();
    }
}

    // Modified eat method to scale energy gain with size
eat(foodItems, otherFish) {
    const headX = this.points[0].x;
    const headY = this.points[0].y;
    const eatDistance = 10 * this.visualScale;

    // Try to eat other fish first
    for (let i = otherFish.length - 1; i >= 0; i--) {
        const prey = otherFish[i];
        if (prey === this) continue;
        
        // Check mass ratio for predation
        if (prey.massInGrams <= this.massInGrams * this.canEatRatio) {
            const distance = Math.sqrt(
                (prey.points[0].x - headX) ** 2 + 
                (prey.points[0].y - headY) ** 2
            );
            
            if (distance < eatDistance) {
                // Energy gain proportional to prey mass
                const energyGain = 50 * (prey.massInGrams / this.massInGrams);
                this.energy = Math.min(this.energy + energyGain, 100);
                prey.energy = -1;
                console.log("test")
                // Log the predation event
 
                this.logger.log('eat', 
                    `Fish (${this.massInGrams.toFixed(1)}g) ate fish (${prey.massInGrams.toFixed(1)}g)`
                );
                return true;
            }
        }
    }

    // Then try regular food
    for (let i = foodItems.length - 1; i >= 0; i--) {
        const food = foodItems[i];
        const distance = Math.sqrt((food.x - headX) ** 2 + (food.y - headY) ** 2);
        if (distance < eatDistance) {
            const energyGain = 30 / (this.massInGrams / 100);  // Scale energy gain inversely with mass
            this.energy = Math.min(this.energy + energyGain, 100);
            foodItems.splice(i, 1);
            
            this.logger.log('eat', 
                `Fish (${this.massInGrams.toFixed(1)}g) ate food`
            );
            return true;
        }
    }
    return false;
}

    canEat(otherFish) {
        return otherFish.massInGrams <= this.massInGrams * this.canEatRatio;
    }

calculateMetabolism(water_temperature) {
    // Temperature constraints
    const temp = Math.max(-2, Math.min(35, water_temperature));
    
    // Use actual mass for metabolic calculations
    // Standard metabolic rate in fish: ~0.14 * M^0.75 (watts)
    const basalMetabolicRate = 0.14 * Math.pow(this.massInGrams/1000, 0.75);
        // Modified activity cost to be less punishing for large fish
    const maxSpeedMultiplier = 1.5;
    const normalizedSpeed = this.speed / 5;
    // Add size compensation to speed cost
    const activityMultiplier = 1 + (maxSpeedMultiplier - 1) * Math.pow(normalizedSpeed, 2) * Math.pow(this.size, -0.2);

    // Temperature effects
    const Q10 = 2.3;
    // Adjusted optimal temperature range
    const optimalTemp = 15 + (1 - this.size) * 8;  // Reduced range from 10 to 8
    
    const thermalWindow = 10 + (this.size * 2);  // Larger fish have slightly wider thermal tolerance
    const tempDiff = Math.abs(temp - optimalTemp);
    let tempEffect;

    if (tempDiff <= thermalWindow / 2) {
        tempEffect = Math.pow(Q10, (temp - optimalTemp) / 10);
    } else {
        const outsideOptimalRange = tempDiff - (thermalWindow / 2);
        // Larger fish handle temperature stress better
        const efficiencyLoss = Math.exp(-outsideOptimalRange / (5 + this.size * 2));
        tempEffect = Math.pow(Q10, (temp - optimalTemp) / 10) * efficiencyLoss;
    }

    // Modified temperature stress effects
    if (temp < 0) {
        // Larger fish handle cold better
        const coldResistance = 0.2 + (this.size * 0.3);  // Added size benefit
        tempEffect *= coldResistance + (1 - coldResistance) * (temp + 2) / 2;
    } else if (temp > 30) {
        // Larger fish handle heat stress better too
        const heatResistance = Math.min(1, this.size * 0.5);
        const heatStress = ((temp - 30) / 5) * (1 - heatResistance);
        tempEffect *= Math.exp(-heatStress);
    }

    // Reduced surface area effect for better size scaling
    const surfaceAreaEffect = Math.pow(this.size, -0.15);  // Changed from -0.25 to -0.15

    // Combined metabolism with size-based efficiency bonus
    let metabolism = basalMetabolicRate * activityMultiplier * tempEffect * surfaceAreaEffect;
    
    // Size-based efficiency bonus
    const efficiencyBonus = 1 - (this.size * 0.2);  // Large fish are up to 20% more efficient
    metabolism *= efficiencyBonus;

    // Adjusted minimum metabolism
    const minMetabolism = basalMetabolicRate * (0.1 - this.size * 0.02);  // Larger fish have lower minimum
    
    return Number(Math.max(metabolism, minMetabolism).toFixed(4));
}

    getColorFromGenome() {
        return `hsl(${this.genome.color * 360}, 80%, 50%)`;
    }

    getSpeedFromGenome() {
        return this.genome.speed * 5;  // Speed 0-5
    }

    getSizeFromGenome() {
        return this.genome.size * 2 + 1;  // Size 1-3
    }


    getStats() {
        return {
            color: this.color,
            speed: Number(this.speed).toFixed(2),
            size: Number(this.size).toFixed(2),
            energy: Number(this.energy).toFixed(2),
            metabolism: Number(this.metabolism).toFixed(4)
        };
    }

    calculateFitness() {
        // Consider both current energy and efficiency
        const energyFitness = this.energy;
        const efficiencyFitness = (this.energy / this.metabolism) * 10;
        return Number((energyFitness + efficiencyFitness) / 2);
    }

    limitJointAngle(p1, p2, p3) {
        const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
        let angleDiff = (angle2 - angle1 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

        if (Math.abs(angleDiff) > this.maxBendAngle) {
            const newAngle = angle1 + this.maxBendAngle * Math.sign(angleDiff);
            p3.x = p2.x + Math.cos(newAngle) * this.constraintRadius;
            p3.y = p2.y + Math.sin(newAngle) * this.constraintRadius;
        }
    }

    draw(ctx) {
        const contourPath = this.getOuterContour();
        ctx.fillStyle = this.color;
        ctx.fill(contourPath);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke(contourPath);

        const finPath = this.drawFins(1);
        ctx.fillStyle = this.color;
        ctx.fill(finPath);
        ctx.stroke(finPath);
    }

    getOuterContour() {
        const path = new Path2D();
        const getOuterPoint = (t, side) => {
            const index = Math.min(Math.floor(t * (this.points.length - 1)), this.points.length - 2);
            const localT = (t * (this.points.length - 1)) % 1;
            const p1 = this.points[index];
            const p2 = this.points[index + 1];
            const size1 = this.bodySizes[index];
            const size2 = this.bodySizes[index + 1];

            const x = (1 - localT) * p1.x + localT * p2.x;
            const y = (1 - localT) * p1.y + localT * p2.y;
            const r = (1 - localT) * size1 + localT * size2;
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + (side * Math.PI / 2);

            return {
                x: x + r * Math.cos(angle),
                y: y + r * Math.sin(angle)
            };
        };

        const headCenter = this.points[0];
        const headRadius = this.bodySizes[0];
        const headAngle = Math.atan2(this.points[1].y - this.points[0].y, this.points[1].x - this.points[0].x);

        path.moveTo(headCenter.x + headRadius * Math.cos(headAngle + Math.PI/2), 
                    headCenter.y + headRadius * Math.sin(headAngle + Math.PI/2));

        path.arc(headCenter.x, headCenter.y, headRadius, headAngle + Math.PI/2, headAngle - Math.PI/2, false);

        for (let t = 0; t <= 1; t += 0.1) {
            const point = getOuterPoint(t, -1);
            path.lineTo(point.x, point.y);
        }

        for (let t = 1; t >= 0; t -= 0.1) {
            const point = getOuterPoint(t, 1);
            path.lineTo(point.x, point.y);
        }

        path.closePath();
        return path;
    }

    drawFins(finPointIndex) {
        const finPath = new Path2D();
        const finLength = 6;
        const finWidth = 1.5;
        const finAngle = Math.PI / 6;

        const finShape = (t, foldFactor) => {
            const x = t * finLength;
            const y = finWidth * Math.sin(t * Math.PI) * foldFactor + x * Math.tan(finAngle);
            return { x, y };
        };

        const p1 = this.points[finPointIndex];
        const p2 = this.points[finPointIndex + 1];
        const p0 = this.points[Math.max(0, finPointIndex - 1)];
        const bodyAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const prevBodyAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        const turnAngle = (bodyAngle - prevBodyAngle + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

        const size = this.bodySizes[finPointIndex];
        const rightFinBase = {
            x: p1.x + size * Math.cos(bodyAngle + Math.PI / 2),
            y: p1.y + size * Math.sin(bodyAngle + Math.PI / 2)
        };
        const leftFinBase = {
            x: p1.x + size * Math.cos(bodyAngle - Math.PI / 2),
            y: p1.y + size * Math.sin(bodyAngle - Math.PI / 2)
        };

        const rightFoldFactor = 1 - Math.max(0, Math.min(1, turnAngle / (Math.PI / 4)));
        const leftFoldFactor = 1 + Math.max(0, Math.min(1, turnAngle / (Math.PI / 4)));

        finPath.moveTo(rightFinBase.x, rightFinBase.y);
        for (let t = 0; t <= 1; t += 0.1) {
            const point = finShape(t, rightFoldFactor);
            const rotatedX = point.x * Math.cos(bodyAngle + finAngle) - point.y * Math.sin(bodyAngle + finAngle);
            const rotatedY = point.x * Math.sin(bodyAngle + finAngle) + point.y * Math.cos(bodyAngle + finAngle);
            finPath.lineTo(rightFinBase.x + rotatedX, rightFinBase.y + rotatedY);
        }
        finPath.lineTo(rightFinBase.x, rightFinBase.y);

        finPath.moveTo(leftFinBase.x, leftFinBase.y);
        for (let t = 0; t <= 1; t += 0.1) {
            const point = finShape(t, leftFoldFactor);
            const rotatedX = point.x * Math.cos(bodyAngle - finAngle) - (-point.y) * Math.sin(bodyAngle - finAngle);
            const rotatedY = point.x * Math.sin(bodyAngle - finAngle) + (-point.y) * Math.cos(bodyAngle - finAngle);
            finPath.lineTo(leftFinBase.x + rotatedX, leftFinBase.y + rotatedY);
        }
        finPath.lineTo(leftFinBase.x, leftFinBase.y);

        return finPath;
    }
}
