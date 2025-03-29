class StateManager {
    constructor() {
        this.state = new Proxy({}, {
            set: (target, property, value) => {
                target[property] = value;
                this.notify(property, value);
                return true;
            }
        });
        this.listeners = new Map();
    }

    subscribe(property, callback) {
        if (!this.listeners.has(property)) {
            this.listeners.set(property, new Set());
        }
        this.listeners.get(property).add(callback);
    }

    notify(property, value) {
        if (this.listeners.has(property)) {
            this.listeners.get(property).forEach(callback => callback(value));
        }
    }
}

export default new StateManager();
