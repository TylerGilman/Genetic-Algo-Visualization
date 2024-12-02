// utils.js
class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    clearAll() {
        this.listeners.clear();
    }
}

class ComponentRegistry {
    constructor() {
        this.components = new Map();
        this.eventBus = new EventBus();
    }

    register(name, component) {
        if (this.components.has(name)) {
            // Clean up existing component if it exists
            this.cleanup(name);
        }
        
        this.components.set(name, component);
        
        // If component has an onRegister method, call it
        if (component.onRegister) {
            component.onRegister(this.eventBus);
        }
    }

    get(name) {
        return this.components.get(name);
    }

    cleanup(name) {
        if (name) {
            const component = this.components.get(name);
            if (component && component.cleanup) {
                component.cleanup();
            }
            this.components.delete(name);
        } else {
            // Cleanup all components
            this.components.forEach((component, componentName) => {
                if (component.cleanup) {
                    try {
                        component.cleanup();
                    } catch (error) {
                        console.error(`Error cleaning up component ${componentName}:`, error);
                    }
                }
            });
            this.components.clear();
        }
    }

    getEventBus() {
        return this.eventBus;
    }
}

// Base component class
class SimulationComponent {
    constructor(name) {
        this.name = name;
        this.eventBus = null;
        this.subscriptions = new Set();
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
        this.initialize();
    }

    initialize() {}

    subscribe(event, callback) {
        if (this.eventBus) {
            const unsubscribe = this.eventBus.on(event, callback);
            this.subscriptions.add(unsubscribe);
            return unsubscribe;
        }
    }

    cleanup() {
        this.subscriptions.forEach(unsubscribe => unsubscribe());
        this.subscriptions.clear();
        this.eventBus = null;
    }
}

// Make classes available globally
window.EventBus = EventBus;
window.ComponentRegistry = ComponentRegistry;
window.SimulationComponent = SimulationComponent;
