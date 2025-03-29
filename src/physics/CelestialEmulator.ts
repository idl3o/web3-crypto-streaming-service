import { EventEmitter } from 'events';

interface CelestialBody {
    id: string;
    mass: number;
    position: Vector3;
    velocity: Vector3;
    radius: number;
    type: 'star' | 'planet' | 'satellite';
    metadata?: any;
}

interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export class CelestialEmulator extends EventEmitter {
    private bodies: Map<string, CelestialBody> = new Map();
    private readonly G = 6.67430e-11; // Gravitational constant
    private timeScale: number = 1;
    private running: boolean = false;
    private simulationInterval?: NodeJS.Timer;

    public addBody(body: CelestialBody): void {
        this.bodies.set(body.id, body);
        this.emit('bodyAdded', body);
    }

    public startSimulation(timestep: number = 1000): void {
        if (this.running) return;
        this.running = true;

        this.simulationInterval = setInterval(() => {
            this.updatePhysics(timestep * this.timeScale);
        }, timestep);
    }

    private updatePhysics(deltaTime: number): void {
        const secondsDelta = deltaTime / 1000;
        const bodies = Array.from(this.bodies.values());

        // Calculate gravitational forces
        bodies.forEach(body => {
            const force = this.calculateNetForce(body, bodies);
            this.updateBodyPhysics(body, force, secondsDelta);
        });

        this.emit('physicsUpdate', { bodies: this.bodies });
        this.checkCollisions();
    }

    private calculateNetForce(body: CelestialBody, allBodies: CelestialBody[]): Vector3 {
        const force: Vector3 = { x: 0, y: 0, z: 0 };

        allBodies.forEach(otherBody => {
            if (otherBody.id === body.id) return;

            const distance = this.calculateDistance(body.position, otherBody.position);
            const magnitude = (this.G * body.mass * otherBody.mass) / (distance * distance);

            // Calculate direction
            const direction = this.normalizeVector({
                x: otherBody.position.x - body.position.x,
                y: otherBody.position.y - body.position.y,
                z: otherBody.position.z - body.position.z
            });

            // Add to net force
            force.x += direction.x * magnitude;
            force.y += direction.y * magnitude;
            force.z += direction.z * magnitude;
        });

        return force;
    }

    private updateBodyPhysics(body: CelestialBody, force: Vector3, deltaTime: number): void {
        // F = ma -> a = F/m
        const acceleration = {
            x: force.x / body.mass,
            y: force.y / body.mass,
            z: force.z / body.mass
        };

        // Update velocity (v = v0 + at)
        body.velocity.x += acceleration.x * deltaTime;
        body.velocity.y += acceleration.y * deltaTime;
        body.velocity.z += acceleration.z * deltaTime;

        // Update position (p = p0 + vt)
        body.position.x += body.velocity.x * deltaTime;
        body.position.y += body.velocity.y * deltaTime;
        body.position.z += body.velocity.z * deltaTime;
    }

    private checkCollisions(): void {
        const bodies = Array.from(this.bodies.values());
        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                const body1 = bodies[i];
                const body2 = bodies[j];

                const distance = this.calculateDistance(body1.position, body2.position);
                if (distance < (body1.radius + body2.radius)) {
                    this.handleCollision(body1, body2);
                }
            }
        }
    }

    private handleCollision(body1: CelestialBody, body2: CelestialBody): void {
        // Elastic collision
        const totalMass = body1.mass + body2.mass;
        const newBody: CelestialBody = {
            id: `merged_${body1.id}_${body2.id}`,
            mass: totalMass,
            position: {
                x: (body1.position.x * body1.mass + body2.position.x * body2.mass) / totalMass,
                y: (body1.position.y * body1.mass + body2.position.y * body2.mass) / totalMass,
                z: (body1.position.z * body1.mass + body2.position.z * body2.mass) / totalMass
            },
            velocity: {
                x: (body1.velocity.x * body1.mass + body2.velocity.x * body2.mass) / totalMass,
                y: (body1.velocity.y * body1.mass + body2.velocity.y * body2.mass) / totalMass,
                z: (body1.velocity.z * body1.mass + body2.velocity.z * body2.mass) / totalMass
            },
            radius: Math.pow(Math.pow(body1.radius, 3) + Math.pow(body2.radius, 3), 1/3),
            type: 'planet'
        };

        this.bodies.delete(body1.id);
        this.bodies.delete(body2.id);
        this.bodies.set(newBody.id, newBody);
        this.emit('collision', { body1, body2, result: newBody });
    }

    private calculateDistance(pos1: Vector3, pos2: Vector3): number {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    private normalizeVector(vector: Vector3): Vector3 {
        const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
        return {
            x: vector.x / magnitude,
            y: vector.y / magnitude,
            z: vector.z / magnitude
        };
    }

    public setTimeScale(scale: number): void {
        this.timeScale = Math.max(0, scale);
    }

    public stop(): void {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }
        this.running = false;
    }

    public getSystemState(): Map<string, CelestialBody> {
        return new Map(this.bodies);
    }
}
