export class Input {
    /**
     * @param {HTMLCanvasElement} canvas - Required to calculate mouse coordinates
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.heldKeys = new Set();
        this.lastClick = null; // Stores {x, y} of the most recent click
        
        // --- KEYBOARD LISTENERS ---
        window.addEventListener("keydown", (e) => {
            this.heldKeys.add(e.code);
        });

        window.addEventListener("keyup", (e) => {
            this.heldKeys.delete(e.code);
        });

        // --- MOUSE LISTENER ---
        // We listen on the canvas specifically, not the window
        if (this.canvas) {
            this.canvas.addEventListener("mousedown", (e) => {
                const rect = this.canvas.getBoundingClientRect();
                
                // Calculate Scale (handles if canvas is resized via CSS)
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;

                // Store the Click Position relative to the game world
                this.lastClick = {
                    x: (e.clientX - rect.left) * scaleX,
                    y: (e.clientY - rect.top) * scaleY
                };
            });
        }
    }

    // --- MOUSE API ---

    /**
     * Returns the last click position and clears it.
     * Call this in your Game Loop's update function.
     * @returns {Object|null} {x, y} or null if no click
     */
    getAndResetClick() {
        if (!this.lastClick) return null;
        
        const click = { ...this.lastClick };
        this.lastClick = null; // Reset so we don't process it twice
        return click;
    }

    // --- KEYBOARD API ---

    get direction() {
        const keys = Array.from(this.heldKeys);
        // We iterate backwards to get the most recently pressed key
        for (let i = keys.length - 1; i >= 0; i--) {
            const key = keys[i];
            if (key === "ArrowUp" || key === "KeyW") return "UP";
            if (key === "ArrowDown" || key === "KeyS") return "DOWN";
            if (key === "ArrowLeft" || key === "KeyA") return "LEFT";
            if (key === "ArrowRight" || key === "KeyD") return "RIGHT";
        }
        return null;
    }
}