export class Input {
    /**
     * @param {HTMLCanvasElement} canvas - Required to calculate mouse coordinates
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.heldKeys = new Set();
        this.lastClick = null; 
        this.scrollDelta = 0;
        this.mousePosition = { x: 0, y: 0 }; // [NEW] Track continuous mouse position

        // --- KEYBOARD LISTENERS ---
        window.addEventListener("keydown", (e) => {
            this.heldKeys.add(e.code);
        });

        window.addEventListener("keyup", (e) => {
            this.heldKeys.delete(e.code);
        });

        // --- MOUSE LISTENERS ---
        if (this.canvas) {
            // 1. Mouse Down (Clicks)
            this.canvas.addEventListener("mousedown", (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;

                this.lastClick = {
                    x: (e.clientX - rect.left) * scaleX,
                    y: (e.clientY - rect.top) * scaleY
                };
            });

            // 2. [NEW] Mouse Move (Hovering/Tooltips)
            this.canvas.addEventListener("mousemove", (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;

                this.mousePosition = {
                    x: (e.clientX - rect.left) * scaleX,
                    y: (e.clientY - rect.top) * scaleY
                };
            });

            // 3. Wheel Listener (Scrolling)
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

    getAndResetScroll() {
        const val = this.scrollDelta;
        this.scrollDelta = 0;
        return val;
    }

    // [NEW] Get current mouse coordinates
    getMousePosition() {
        return this.mousePosition;
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