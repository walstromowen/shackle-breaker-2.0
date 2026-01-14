/**
 * EventBus.js
 * A lightweight, global pub-sub system to decouple game systems.
 * * Usage:
 * import { events } from './eventBus.js';
 * events.emit('EVENT_NAME', data);
 * events.on('EVENT_NAME', (data) => { ... });
 */

class EventBus {
    constructor() {
        this.listeners = {};
    }

    /**
     * Subscribe to an event.
     * @param {string} event - The name of the event (e.g., 'INTERACT')
     * @param {function} callback - The function to run when event fires
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * Unsubscribe from an event.
     * Important for cleaning up when scenes are destroyed.
     * @param {string} event 
     * @param {function} callback 
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    /**
     * Broadcast an event to all listeners.
     * @param {string} event 
     * @param {any} data - The payload to send
     */
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => callback(data));
    }
}

// Export a single instance (Singleton) so the whole app shares the same bus.
export const events = new EventBus();