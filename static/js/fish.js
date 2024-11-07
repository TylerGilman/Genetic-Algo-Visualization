<!-- Fish -->
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
    constructor(x, y, genome, waterTemperature) {
        this.genome = genome;
        this.color = this.getColorFromGenome();
        this.speed = this.getSpeedFromGenome();
        this.size = this.getSizeFromGenome();
        this.constraintRadius = 4 * this.size;
        this.numSegments = 6;
        this.energy = 100;
        this.metabolism = this.calculateMetabolism(waterTemperature);
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

    getColorFromGenome() {
        return `hsl(${this.genome.color * 360}, 80%, 50%)`;
    }

    getSpeedFromGenome() {
        return this.genome.speed * 5;
    }

    getSizeFromGenome() {
        return this.genome.size * 0.5 + 0.5; // Size between 0.5 and 1
    }

calculateFitness() {
    // Simply use energy level as fitness
    return this.energy;
}

    calculateMetabolism(waterTemperature) {
        // Ensure temperature is within the -2°C to 30°C range
        const temp = Math.max(-2, Math.min(30, waterTemperature));

        // Base metabolic rate (BMR) calculation
        // We'll use a simplified allometric equation: BMR = a * M^b
        // where M is mass (we'll use size as a proxy), and a and b are constants
        const a = 0.14; // Coefficient (adjust as needed)
        const b = -0.25; // Exponent (typically between -0.2 and -0.3 for fish)
        const basalMetabolicRate = a * Math.pow(this.size, b);

        // Temperature effect using a modified Q10 principle
        // We'll use a more complex curve that peaks around 20°C and drops off at higher temps
        const Q10 = 2.5; // Typical Q10 value for biological systems
        const optimalTemp = 20; // Temperature of peak metabolism
        const tempEffect = Math.pow(Q10, (temp - optimalTemp) / 10) * 
                           (1 - 0.05 * Math.abs(temp - optimalTemp));

        // Combine basal metabolic rate and temperature effect
        let metabolism = basalMetabolicRate * tempEffect;

        // Adjust for extreme temperatures
        if (temp < 0) {
            metabolism *= 0.2 + 0.8 * (temp + 2) / 2; // Gradual reduction from 0°C to -2°C
        } else if (temp > 25) {
            metabolism *= 0.5 + 0.5 * (30 - temp) / 5; // Gradual reduction from 25°C to 30°C
        }

        // Ensure a minimum metabolism (e.g., 10% of basal rate)
        const minMetabolism = basalMetabolicRate * 0.1;
        return Math.max(metabolism, minMetabolism);
    }

    update(canvas, foodItems, waterTemperature) {
        this.points[0].move(canvas);
        for (const point of this.points) {
            point.constrain();
        }

        for (let i = 0; i < this.points.length - 2; i++) {
            this.limitJointAngle(this.points[i], this.points[i + 1], this.points[i + 2]);
        }

        // Check for nearby food and eat it
        this.eat(foodItems);

        // Lose energy based on metabolism
        this.energy -= this.metabolism;

        // Update metabolism based on current water temperature
        this.metabolism = this.calculateMetabolism(waterTemperature);
    }

    eat(foodItems) {
        const headX = this.points[0].x;
        const headY = this.points[0].y;
        const eatDistance = 10 * this.size;

        for (let i = foodItems.length - 1; i >= 0; i--) {
            const food = foodItems[i];
            const distance = Math.sqrt((food.x - headX) ** 2 + (food.y - headY) ** 2);
            if (distance < eatDistance) {
                this.energy = Math.min(this.energy + 25, 100);
                foodItems.splice(i, 1);
                break;
            }
        }
    }

    isDead() {
        return this.energy <= 0;
    }

    getStats() {
        return {
            color: this.color,
            speed: this.speed.toFixed(2),
            size: this.size.toFixed(2),
            energy: this.energy.toFixed(2),         // Make sure we're returning the actual energy value
            metabolism: this.metabolism.toFixed(4)
        };
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
