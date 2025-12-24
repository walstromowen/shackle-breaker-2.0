export class Input {
    constructor() {
        this.heldKeys = new Set();
        this.callbacks = {}; // Storage for event listeners

        // Setup listeners
        window.addEventListener("keydown", (e) => {
            // 1. Movement Polling
            if (this.isValidKey(e.code)) {
                this.heldKeys.add(e.code);
            }

            // 2. Single-Press Events
            // This "shouts" to the SceneManager that a key was tapped
            this.emit('keyPressed', e.code);
        });

        window.addEventListener("keyup", (e) => {
            this.heldKeys.delete(e.code);
        });
    }

    /**
     * Event System: Subscriber
     * Allows SceneManager to say: input.on('keyPressed', ...)
     */
    on(event, callback) {
        this.callbacks[event] = callback;
    }

    /**
     * Event System: Publisher
     * Internal use: Triggers the subscribed functions
     */
    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }

    isValidKey(code) {
        return [
            "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
            "KeyW", "KeyS", "KeyA", "KeyD"
        ].includes(code);
    }

    /**
     * Helper to get the primary direction being pressed for Movement
     */
    get direction() {
        const keys = Array.from(this.heldKeys);
        const lastKey = keys[keys.length - 1];

        if (lastKey === "ArrowUp" || lastKey === "KeyW") return "UP";
        if (lastKey === "ArrowDown" || lastKey === "KeyS") return "DOWN";
        if (lastKey === "ArrowLeft" || lastKey === "KeyA") return "LEFT";
        if (lastKey === "ArrowRight" || lastKey === "KeyD") return "RIGHT";

        return null;
    }

    isPressed(code) {
        return this.heldKeys.has(code);
    }
}