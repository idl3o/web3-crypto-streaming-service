const EventEmitter = require('events');

class WorkspaceManager extends EventEmitter {
    constructor() {
        super();
        this.workspace = new Map();
        this.connections = new Map();
        this.#tasks = new Map();
        this.#intervals = new Map();
    }

    setResource(key, value) {
        this.workspace.set(key, value);
        this.emit('resource:updated', { key, value });
    }

    getResource(key) {
        return this.workspace.get(key);
    }

    registerConnection(name, connection) {
        this.connections.set(name, connection);
    }

    getConnection(name) {
        return this.connections.get(name);
    }

    scheduleTask(name, task, interval) {
        this.#tasks.set(name, task);
        const intervalId = setInterval(async () => {
            try {
                await task();
                this.emit('task:success', { name });
            } catch (error) {
                this.emit('task:error', { name, error });
            }
        }, interval);
        this.#intervals.set(name, intervalId);
    }

    stopTask(name) {
        const intervalId = this.#intervals.get(name);
        if (intervalId) {
            clearInterval(intervalId);
            this.#intervals.delete(name);
            this.#tasks.delete(name);
        }
    }

    async autoRecover() {
        this.emit('recovery:start');
        for (const [name, connection] of this.connections) {
            try {
                if (!connection || !connection.healthy) {
                    await this.reconnect(name);
                }
            } catch (error) {
                this.emit('recovery:error', { name, error });
            }
        }
        this.emit('recovery:complete');
    }

    async reconnect(name) {
        const connection = this.connections.get(name);
        if (connection && connection.reconnect) {
            await connection.reconnect();
            this.emit('connection:restored', { name });
        }
    }
}

module.exports = new WorkspaceManager();
