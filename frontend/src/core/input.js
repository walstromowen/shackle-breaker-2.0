export class Input {
    /**
     * @param {HTMLCanvasElement} canvas - Required to calculate mouse coordinates
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.heldKeys = new Set();
        this.lastClick = null; 
        this.scrollDelta = 0; // [NEW] Track scroll amount

        // --- KEYBOARD LISTENERS ---
        window.addEventListener("keydown", (e) => {
            this.heldKeys.add(e.code);
        });

        window.addEventListener("keyup", (e) => {
            this.heldKeys.delete(e.code);
        });

        // --- MOUSE LISTENERS ---
        if (this.canvas) {
            this.canvas.addEventListener("mousedown", (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;

                this.lastClick = {
                    x: (e.clientX - rect.left) * scaleX,
                    y: (e.clientY - rect.top) * scaleY
                };
            });

            // [NEW] Wheel Listener
            this.canvas.addEventListener("wheel", (e) => {
                // Prevent browser zooming/scrolling while over canvas
                e.preventDefault(); 
                this.scrollDelta += e.deltaY;
            }, { passive: false });
        }
    }

    // --- MOUSE API ---

    getAndResetClick() {
        if (!this.lastClick) return null;
        const click = { ...this.lastClick };
        this.lastClick = null; 
        return click;
    }

    // [NEW] Get scroll amount and reset
    getAndResetScroll() {
        const val = this.scrollDelta;
        this.scrollDelta = 0;
        return val;
    }

    // --- KEYBOARD API ---
    get direction() {
        const keys = Array.from(this.heldKeys);
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