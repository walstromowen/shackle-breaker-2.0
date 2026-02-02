/**
 * core/Input.js
 */
export class Input {
    /**
     * @param {HTMLCanvasElement} canvas 
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.heldKeys = new Set();
        this.lastClick = null; 
        
        // New: Track drag state
        this.isMouseDown = false; 

        this.scrollDelta = 0;
        this.mousePosition = { x: 0, y: 0 }; 

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this); // New
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onWheel = this._onWheel.bind(this);

        // --- ATTACH LISTENERS ---
        window.addEventListener("keydown", this._onKeyDown);
        window.addEventListener("keyup", this._onKeyUp);
        
        // Listen for mouseup on WINDOW so dragging doesn't get stuck 
        // if the user releases the mouse outside the canvas.
        window.addEventListener("mouseup", this._onMouseUp);

        if (this.canvas) {
            this.canvas.addEventListener("mousedown", this._onMouseDown);
            this.canvas.addEventListener("mousemove", this._onMouseMove);
            this.canvas.addEventListener("wheel", this._onWheel, { passive: false });
        }
    }

    // --- EVENT HANDLERS ---

    _onKeyDown(e) { this.heldKeys.add(e.code); }
    _onKeyUp(e) { this.heldKeys.delete(e.code); }

    _getMouseCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    _onMouseDown(e) {
        this.isMouseDown = true; // Start Dragging
        this.lastClick = this._getMouseCoords(e);
    }

    _onMouseUp(e) {
        this.isMouseDown = false; // Stop Dragging
    }

    _onMouseMove(e) {
        this.mousePosition = this._getMouseCoords(e);
    }

    _onWheel(e) {
        e.preventDefault(); 
        const delta = e.deltaY > 0 ? 1 : -1;
        this.scrollDelta += (delta * 30); 
        this.mousePosition = this._getMouseCoords(e);
    }

    // --- CLEANUP ---
    destroy() {
        window.removeEventListener("keydown", this._onKeyDown);
        window.removeEventListener("keyup", this._onKeyUp);
        window.removeEventListener("mouseup", this._onMouseUp); // Cleanup

        if (this.canvas) {
            this.canvas.removeEventListener("mousedown", this._onMouseDown);
            this.canvas.removeEventListener("mousemove", this._onMouseMove);
            this.canvas.removeEventListener("wheel", this._onWheel);
        }
    }

    // --- PUBLIC API ---

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

    getMousePosition() {
        return this.mousePosition;
    }

    // Expose this for the Controller
    getIsMouseDown() {
        return this.isMouseDown;
    }

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