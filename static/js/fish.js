class ConstrainedPoint {
    constructor(x, y, constraintRadius, speed, isHead = false) {
        this.x = x;
        this.y = y;
        this.constraintRadius = constraintRadius;
        this.previousPoint = null;
        this.nextPoint = null;
        this.isHead = isHead;
        this.angle = Math.random() * Math.PI * 2;
        
        // Speed parameters
        this.baseSpeed = speed;
        this.currentSpeed = speed;
        this.minSpeed = speed * 0.7;
        
        // Swimming parameters
        this.waveAmplitude = 0.15;
        this.waveFrequency = 0.1;
        this.waveAngle = Math.random() * Math.PI * 2;
        
        // Turn control
        this.maxTurnRate = Math.PI / 16;
    }

    move(canvas, neuralOutput = null) {
        if (this.isHead) {
            // Head movement with neural control
            if (neuralOutput) {
                const turnAmount = Math.max(-this.maxTurnRate, 
                    Math.min(this.maxTurnRate, neuralOutput.turn * this.maxTurnRate));
                this.angle += turnAmount;
                
                this.currentSpeed = Math.max(
                    this.minSpeed,
                    this.baseSpeed * (0.7 + neuralOutput.speed * 0.3)
                );
            }
            
            // Swimming motion
            this.waveAngle += this.waveFrequency;
            const waveOffset = Math.sin(this.waveAngle) * this.waveAmplitude;
            const moveAngle = this.angle + waveOffset;
            
            // Apply movement
            this.x += Math.cos(moveAngle) * this.currentSpeed;
            this.y += Math.sin(moveAngle) * this.currentSpeed;
            
            // Boundary handling
            const margin = 50;
            if (this.x < margin || this.x > canvas.width - margin ||
                this.y < margin || this.y > canvas.height - margin) {
                
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                this.angle = Math.atan2(centerY - this.y, centerX - this.x);
                
                this.x = Math.max(margin, Math.min(canvas.width - margin, this.x));
                this.y = Math.max(margin, Math.min(canvas.height - margin, this.y));
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
                const targetDist = this.constraintRadius * 0.95; // Slightly shorter to prevent stretching
                this.x = this.previousPoint.x + Math.cos(angle) * targetDist;
                this.y = this.previousPoint.y + Math.sin(angle) * targetDist;
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

        // Physical properties
        this.massInGrams = Math.exp(genome.size * Math.log(1000));
        this.visualScale = Math.pow(this.massInGrams / 1000, 1/3) * 3;
        this.constraintRadius = 3 * this.visualScale;
        this.numSegments = 8;
        this.energy = 100;
        this.metabolism = this.calculateMetabolism(water_temperature);
        this.canEatRatio = 1/4;

        // Enhanced traits
        this.traits = {
            aggressiveness: Math.random(),
            cautiousness: Math.random(),
            foodMotivation: Math.random(),
            energyEfficiency: Math.random(),
            learningRate: Math.random(),
            adaptability: Math.random()
        };

        // Neural network
        this.brain = this.initializeBrain();

        // Initialize segments with sizes
        this.bodySizes = new Float32Array(this.numSegments);
        for(let i = 0; i < this.numSegments; i++) {
            this.bodySizes[i] = i === 0 ? 
                4 * this.visualScale : 
                3.5 * this.visualScale * (1 - Math.pow(i / (this.numSegments - 1), 0.8));
        }

        // Points initialization
        this.points = [];
        let prevPoint = null;
        for(let i = 0; i < this.numSegments; i++) {
            const point = new ConstrainedPoint(
                x + i * this.constraintRadius,
                y,
                this.constraintRadius,
                this.speed,
                i === 0
            );
            if(prevPoint) {
                point.previousPoint = prevPoint;
                prevPoint.nextPoint = point;
            }
            this.points.push(point);
            prevPoint = point;
        }

        if(this.logger) {
            this.logger.log('spawn', `Fish spawned (${this.massInGrams.toFixed(1)}g)`);
        }
        this.hasLoggedDeath = false; // Log death once
    }

    initializeBrain() {
        return {
            inputSize: 10,
            hiddenSize: 12,
            outputSize: 2,
            weights: {
                hidden: new Float32Array(10 * 12).map(() => 
                    (Math.random() * 2 - 1) * this.traits.cautiousness
                ),
                output: new Float32Array(12 * 2).map(() => 
                    (Math.random() * 2 - 1) * this.traits.aggressiveness
                )
            },
            bias: {
                hidden: new Float32Array(12).fill(0).map(() => 
                    this.traits.adaptability - 0.5
                ),
                output: new Float32Array(2).fill(0).map(() => 
                    this.traits.foodMotivation - 0.5
                )
            }
        };
    }

    think(foodItems, otherFish, canvas) {
        const head = this.points[0];
        const inputs = new Float32Array(10);
        
        // Environment inputs
        const [nearestFood, foodDist] = this.findNearest(head, foodItems);
        const [nearestFish, fishDist, isPredator] = this.findNearestFish(head, otherFish);
        
        if (nearestFood) {
            inputs[0] = this.getAngleDiff(head, nearestFood) / Math.PI;
            inputs[1] = Math.min(1, foodDist / 100);
        }
        
        if (nearestFish) {
            inputs[2] = this.getAngleDiff(head, nearestFish.points[0]) / Math.PI;
            inputs[3] = Math.min(1, fishDist / 100);
            inputs[4] = isPredator ? 1 : -1;
        }
        
        // State inputs
        inputs[5] = this.energy / 100;
        inputs[6] = head.currentSpeed / this.speed;
        
        // Trait inputs
        inputs[7] = this.traits.aggressiveness;
        inputs[8] = this.traits.cautiousness;
        inputs[9] = this.traits.foodMotivation;

        return this.neuralForward(inputs);
    }

    eat(foodItems, otherFish) {
        const head = this.points[0];
        const eatDistance = 5 * this.visualScale;
        
        // Try to eat other fish
        for (let i = otherFish.length - 1; i >= 0; i--) {
            const prey = otherFish[i];
            if (prey === this || !this.canEat(prey)) continue;
            
            const dist = Math.hypot(
                prey.points[0].x - head.x,
                prey.points[0].y - head.y
            );
            
            if (dist < eatDistance) {
                const energyGain = 50 * (prey.massInGrams / this.massInGrams);
                this.energy = Math.min(this.energy + energyGain, 100);
                
                // Set prey's energy to 0 to ensure it's not selected for breeding
                prey.energy = 0;
                prey.hasLoggedDeath = true; // Prevent death message from appearing again
                
                if (this.logger) {
                    this.logger.log('eat', 
                        `Fish (${this.massInGrams.toFixed(1)}g) ate fish (${prey.massInGrams.toFixed(1)}g)`
                    );
                }
                return true;
            }
        }
        
        // Try to eat food
        for (let i = foodItems.length - 1; i >= 0; i--) {
            const food = foodItems[i];
            const dist = Math.hypot(food.x - head.x, food.y - head.y);
            
            if (dist < eatDistance) {
                const energyGain = 30 / (this.massInGrams / 100);
                this.energy = Math.min(this.energy + energyGain, 100);
                foodItems.splice(i, 1);
                
                if (this.logger) {
                    this.logger.log('eat', 
                        `Fish (${this.massInGrams.toFixed(1)}g) ate food`
                    );
                }
                return true;
            }
        }
        return false;
    }

    isDead() {
        if (this.energy <= 0 && !this.hasLoggedDeath) {
            this.hasLoggedDeath = true;
            if (this.logger) {
              this.logger.log('death', 
                  `Fish (${this.massInGrams.toFixed(1)}g) died`
              );
            }
        }
        return this.energy <= 0;
    }

    neuralForward(inputs) {
        const hidden = new Float32Array(12);
        const output = new Float32Array(2);
        
        // Hidden layer with SIMD-like batching
        for(let i = 0; i < 12; i += 4) {
            for(let j = 0; j < 7; j++) {
                const input = inputs[j];
                hidden[i] += input * this.brain.weights.hidden[i * 7 + j];
                hidden[i+1] += input * this.brain.weights.hidden[(i+1) * 7 + j];
                hidden[i+2] += input * this.brain.weights.hidden[(i+2) * 7 + j];
                hidden[i+3] += input * this.brain.weights.hidden[(i+3) * 7 + j];
            }
        }
        
        // Activation
        for(let i = 0; i < 12; i++) {
            hidden[i] = Math.tanh(hidden[i]);
        }
        
        // Output layer
        for(let i = 0; i < 2; i++) {
            for(let j = 0; j < 12; j++) {
                output[i] += hidden[j] * this.brain.weights.output[i * 12 + j];
            }
            output[i] = Math.tanh(output[i]);
        }
        
        return {
            turn: output[0],
            speed: (output[1] + 1) / 2
        };
    }

    update(canvas, foodItems, otherFish, water_temperature) {
        const now = performance.now();
        if (now - this.lastUpdate < this.updateInterval || this.isDead()) return;
        this.lastUpdate = now;

        // Movement validation
        if (now - this.lastPositionCheck > this.positionCheckInterval) {
            this.validateMovement();
            this.lastPositionCheck = now;
        }

        const decision = this.think(foodItems, otherFish, canvas);
        
        // Update all points
        for (const point of this.points) {
            if (point.isHead) {
                point.move(canvas, decision);
            }
            point.constrain();
        }

        // Apply metabolic effects
        this.metabolism = this.calculateMetabolism(water_temperature) * 
                         (1 - this.traits.energyEfficiency * 0.2);
        this.energy = Math.max(-100, this.energy - this.metabolism);
        
        this.eat(foodItems, otherFish);
    }

    validateMovement() {
        const head = this.points[0];
        this.lastPositions[this.positionIndex] = head.x;
        this.lastPositions[this.positionIndex + 1] = head.y;
        this.positionIndex = (this.positionIndex + 2) % 6;

        if (this.positionIndex === 0) {
            let totalDist = 0;
            for(let i = 2; i < 6; i += 2) {
                const dx = this.lastPositions[i] - this.lastPositions[i-2];
                const dy = this.lastPositions[i+1] - this.lastPositions[i-1];
                totalDist += Math.hypot(dx, dy);
            }

            if (totalDist < this.minMoveDist) {
                head.x += Math.cos(head.angle) * this.speed;
                head.y += Math.sin(head.angle) * this.speed;
                this.energy -= 5;
            }
        }
    }


    canEat(otherFish) {
        return otherFish.massInGrams <= this.massInGrams * this.canEatRatio;
    }

    calculateMetabolism(water_temperature) {
        const temp = Math.max(-2, Math.min(35, water_temperature));
        
        // Base metabolic rate using mass
        const basalRate = 0.14 * Math.pow(this.massInGrams/1000, 0.75);
        
        // Activity cost with size compensation
        const speedMultiplier = 1 + (0.5 * Math.pow(this.speed/5, 2) * Math.pow(this.size, -0.2));
        
        // Temperature effects
        const Q10 = 2.3;
        const optimalTemp = 15 + (1 - this.size) * 8;
        const thermalWindow = 10 + (this.size * 2);
        const tempDiff = Math.abs(temp - optimalTemp);
        
        let tempEffect;
        if (tempDiff <= thermalWindow / 2) {
            tempEffect = Math.pow(Q10, (temp - optimalTemp) / 10);
        } else {
            const outsideRange = tempDiff - (thermalWindow / 2);
            const efficiencyLoss = Math.exp(-outsideRange / (5 + this.size * 2));
            tempEffect = Math.pow(Q10, (temp - optimalTemp) / 10) * efficiencyLoss;
        }
        
        // Combine all effects
        let metabolism = basalRate * speedMultiplier * tempEffect * Math.pow(this.size, -0.15);
        
        // Size-based efficiency bonus
        const efficiencyBonus = 1 - (this.size * 0.2);
        metabolism *= efficiencyBonus;
        
        // Ensure minimum metabolism
        const minMetabolism = basalRate * (0.1 - this.size * 0.02);
        
        return Number(Math.max(metabolism, minMetabolism).toFixed(4));
    }

    getColorFromGenome() {
        return `hsl(${this.genome.color * 360}, 80%, 50%)`;
    }

    getSpeedFromGenome() {
        return this.genome.speed * 5;
    }

    getSizeFromGenome() {
        return this.genome.size * 2 + 1;
    }

    calculateFitness() {
        const energyFitness = this.energy;
        const efficiencyFitness = (this.energy / this.metabolism) * 10;
        return Number((energyFitness + efficiencyFitness) / 2);
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

    findNearest(head, items) {
        let minDist = Infinity;
        let nearest = null;
        
        for(const item of items) {
            const dist = Math.hypot(item.x - head.x, item.y - head.y);
            if(dist < minDist) {
                minDist = dist;
                nearest = item;
            }
        }
        
        return [nearest, minDist];
    }

    findNearestFish(head, otherFish) {
        let minDist = Infinity;
        let nearest = null;
        let isPredator = false;
        
        for(const fish of otherFish) {
            if(fish === this) continue;
            
            const dist = Math.hypot(
                fish.points[0].x - head.x,
                fish.points[0].y - head.y
            );
            
            if(dist < minDist) {
                minDist = dist;
                nearest = fish;
                isPredator = fish.massInGrams > this.massInGrams / this.canEatRatio;
            }
        }
        
        return [nearest, minDist, isPredator];
    }

    getAngleDiff(head, target) {
        const targetX = target.x || target.points[0].x;
        const targetY = target.y || target.points[0].y;
        const angle = Math.atan2(targetY - head.y, targetX - head.x);
        return ((angle - head.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
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
        const finLength = 6 * this.visualScale;
        const finWidth = 1.5 * this.visualScale;
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

        // Draw right fin
        finPath.moveTo(rightFinBase.x, rightFinBase.y);
        for (let t = 0; t <= 1; t += 0.1) {
            const point = finShape(t, rightFoldFactor);
            const rotatedX = point.x * Math.cos(bodyAngle + finAngle) - point.y * Math.sin(bodyAngle + finAngle);
            const rotatedY = point.x * Math.sin(bodyAngle + finAngle) + point.y * Math.cos(bodyAngle + finAngle);
            finPath.lineTo(rightFinBase.x + rotatedX, rightFinBase.y + rotatedY);
        }
        finPath.lineTo(rightFinBase.x, rightFinBase.y);

        // Draw left fin
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
