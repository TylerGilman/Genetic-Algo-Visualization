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
    constructor(x, y, genome) {
        this.genome = genome;
        this.color = this.getColorFromGenome();
        this.speed = this.getSpeedFromGenome();
        this.constraintRadius = 4;
        this.numSegments = 6;
        this.bodySizes = Array.from({ length: this.numSegments }, (_, i) => {
            if (i === 0) return 6;
            const t = i / (this.numSegments - 1);
            return 6 * (1 - Math.pow(t, 1.1));
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

    update(canvas) {
        this.points[0].move(canvas);
        for (const point of this.points) {
            point.constrain();
        }

        for (let i = 0; i < this.points.length - 2; i++) {
            this.limitJointAngle(this.points[i], this.points[i + 1], this.points[i + 2]);
        }
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
