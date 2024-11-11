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
    constructor(x, y, genome, water_temperature) {
        this.genome = genome;
        this.color = this.getColorFromGenome();
        this.speed = this.getSpeedFromGenome();
        this.size = this.getSizeFromGenome();
        this.constraintRadius = 4 * this.size;
        this.numSegments = 6;
        this.energy = 100;  // Initialize energy
        this.metabolism = this.calculateMetabolism(water_temperature);  // Fix initial metabolism
        
        // Store current water temperature for updates
        this.current_temperature = water_temperature;
        this.bodySizes = Array.from({ length: this.numSegments }, (_, i) => {
            if (i === 0) return 6 * this.size;
            const t = i / (this.numSegments - 1);
            return 6 * this.size * (1 - Math.pow(t, 1.1));
        });
        this.maxBendAngle = Math.PI / 4;

        this.points = Array.from({ length: this.numSegments }, (_, i) =>
            new ConstrainedPoint(x + i * this.constraintRadius, y, this.constraintRadius, this.speed, i === 0)
        );

        for (let i = 1; i < this.points.length; i++) {
            this.points[i].previousPoint = this.points[i - 1];
            this.points[i - 1].nextPoint = this.points[i];
        }
    }


    calculateMetabolism(water_temperature) {
        // Fix temperature parameter name
        // Ensure temperature is within the -2°C to 30°C range
        const temp = Math.max(-2, Math.min(30, water_temperature));

        // Base metabolic rate affected by size and speed
        const basalMetabolicRate = 0.14 * Math.pow(this.size, -0.25);

        // Speed increases metabolism
        const speedEffect = 1 + (this.speed / 5) * 0.5;

        // Temperature effect (Q10 principle)
        const Q10 = 2.5;
        const optimalTemp = 20;
        const tempEffect = Math.pow(Q10, (temp - optimalTemp) / 10) * 
                          (1 - 0.05 * Math.abs(temp - optimalTemp));

        // Combine all effects
        let metabolism = basalMetabolicRate * speedEffect * tempEffect;

        // Adjust for extreme temperatures
        if (temp < 0) {
            metabolism *= 0.2 + 0.8 * (temp + 2) / 2;
        } else if (temp > 25) {
            metabolism *= 0.5 + 0.5 * (30 - temp) / 5;
        }

        // Ensure a minimum metabolism
        const minMetabolism = basalMetabolicRate * 0.1;
        
        // Return rate per second
        return Number(Math.max(metabolism, minMetabolism).toFixed(4));
    }

    update(canvas, foodItems, water_temperature) {
        // Store current temperature
        this.current_temperature = water_temperature;
        
        // Update movement
        this.points[0].move(canvas);
        for (const point of this.points) {
            point.constrain();
        }

        for (let i = 0; i < this.points.length - 2; i++) {
            this.limitJointAngle(this.points[i], this.points[i + 1], this.points[i + 2]);
        }

        // Check for nearby food and eat it
        this.eat(foodItems);

        // Update metabolism based on current temperature
        this.metabolism = this.calculateMetabolism(water_temperature);
        
        // Reduce energy based on metabolism (scale by speed multiplier if needed)
        const energyLoss = this.metabolism;
        this.energy = Math.max(0, this.energy - energyLoss);
    }

    getColorFromGenome() {
        return `hsl(${this.genome.color * 360}, 80%, 50%)`;
    }

    getSpeedFromGenome() {
        return this.genome.speed * 5;
    }

    getSizeFromGenome() {
        return this.genome.size * 0.5 + 0.5; // Size between 0.5 and 1
    }


    eat(foodItems) {
        const headX = this.points[0].x;
        const headY = this.points[0].y;
        const eatDistance = 10 * this.size;

        for (let i = foodItems.length - 1; i >= 0; i--) {
            const food = foodItems[i];
            const distance = Math.sqrt((food.x - headX) ** 2 + (food.y - headY) ** 2);
            if (distance < eatDistance) {
                // Energy gain is affected by size (bigger fish need more food)
                const energyGain = 25 / (0.5 + this.size * 0.5);
                this.energy = Math.min(this.energy + energyGain, 100);
                foodItems.splice(i, 1);
                break;
            }
        }
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

    isDead() {
        return this.energy <= 0;
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
