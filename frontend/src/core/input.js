export class Input {
    constructor() {
        this.heldKeys = new Set();
        
        // Setup listeners
        window.addEventListener("keydown", (e) => {
            if (this.isValidKey(e.code)) {
                this.heldKeys.add(e.code);
            }
        });

        window.addEventListener("keyup", (e) => {
            this.heldKeys.delete(e.code);
        });
    }

    isValidKey(code) {
        return [
            "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
            "KeyW", "KeyS", "KeyA", "KeyD"
        ].includes(code);
    }

    /**
     * Helper to get the primary direction being pressed
     */
    get direction() {
        // We take the last key added to the Set
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