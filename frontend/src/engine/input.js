/**
 * core/Input.js
 */
const DIRECTION_KEYS = { ArrowUp: 'UP', KeyW: 'UP', ArrowDown: 'DOWN', KeyS: 'DOWN', ArrowLeft: 'LEFT', KeyA: 'LEFT', ArrowRight: 'RIGHT', KeyD: 'RIGHT' };
const QUEUE_MAX_AGE_MS = 350;   // a bit under one walking step (CONFIG.WALK_DURATION 0.4 s)

export class Input {
    /**
     * @param {HTMLCanvasElement} canvas 
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.heldKeys = new Set();
        this.queuedDirection = null;   // { dir, time }: the latest direction key pressed, kept briefly so a tap is never lost (see consumeDirection)
        this.lastClick = null; 
        
        this.lastRightClick = null; 
        this.isMouseDown = false; // true only while the LEFT button is held (that is the button that drags)
        this.downButton = null;   // the button that is currently held, whichever it is
        this.scrollDelta = 0;
        this.mousePosition = { x: 0, y: 0 }; 

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this); 
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onWheel = this._onWheel.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this);
        this._onBlur = this._onBlur.bind(this);

        // --- ATTACH LISTENERS ---
        window.addEventListener("keydown", this._onKeyDown);
        window.addEventListener("keyup", this._onKeyUp);
        // A key released while the window was not focused never sends its keyup, so it would stay "held" (and the player would keep walking / running)
        window.addEventListener("blur", this._onBlur);
        
        // Listen for mouseup on WINDOW so dragging doesn't get stuck 
        // if the user releases the mouse outside the canvas.
        window.addEventListener("mouseup", this._onMouseUp);

        // Prevent default browser context menu
        window.addEventListener("contextmenu", this._onContextMenu);

        if (this.canvas) {
            this.canvas.addEventListener("mousedown", this._onMouseDown);
            this.canvas.addEventListener("mousemove", this._onMouseMove);
            this.canvas.addEventListener("wheel", this._onWheel, { passive: false });
        }
    }

    // --- EVENT HANDLERS ---

    _onKeyDown(e) {
        this.heldKeys.add(e.code);
        // Remember the press itself (not the key repeating): a tap that is over before the next update, or while a step is still being walked, still counts
        const dir = DIRECTION_KEYS[e.code];
        if (dir && !e.repeat) this.queuedDirection = { dir, time: performance.now() };
        // Tab is the "back" key on every screen: it must never move the browser's focus away from the game.
        if (e.code === 'Tab') e.preventDefault();
    }
    _onKeyUp(e) { this.heldKeys.delete(e.code); }
    _onBlur() {
        this.heldKeys.clear();
        this.queuedDirection = null;
        // A button released outside the window never sends its mouseup, which would leave a drag stuck.
        this.isMouseDown = false;
        this.downButton = null;
    }
    _onContextMenu(e) { e.preventDefault(); }

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
        // Only the left button drags. A right press used to start a drag as well, so the "back" button could pick items up.
        this.downButton = e.button;
        this.isMouseDown = (e.button === 0);
        this.mousePosition = this._getMouseCoords(e); // a press without any movement (touch, a fast click) must still land where it happened
        // NOTE: Clicks are now strictly generated on mouseup to ensure 
        // the interaction manager can differentiate them from drags.
    }

    _onMouseUp(e) {
        if (this.downButton === null) return;
        this.downButton = null;
        this.isMouseDown = false; // Stop Dragging
        
        // Register click only if released over the actual canvas
        if (e.target === this.canvas) {
            if (e.button === 2) {
                this.lastRightClick = this._getMouseCoords(e);
            } else if (e.button === 0) {
                this.lastClick = this._getMouseCoords(e); // the middle button does nothing
            }
        }
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
        window.removeEventListener("blur", this._onBlur);
        window.removeEventListener("mouseup", this._onMouseUp); 
        window.removeEventListener("contextmenu", this._onContextMenu);

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

    getAndResetRightClick() {
        if (!this.lastRightClick) return null;
        const click = { ...this.lastRightClick };
        this.lastRightClick = null;
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

    getIsMouseDown() {
        return this.isMouseDown;
    }
    
    reset() {
        this.heldKeys.clear();
        this.queuedDirection = null;
        this.lastClick = null;
        this.lastRightClick = null;
        this.isMouseDown = false;
        this.downButton = null;
        this.scrollDelta = 0;
    }

    /* True while either shift key is down: the overworld runs while it is held. Like `direction`, it is matched on the physical key (e.code). */
    get run() {
        return this.heldKeys.has("ShiftLeft") || this.heldKeys.has("ShiftRight");
    }

    /** The direction for the next step: the latest press while it is fresh (even if the key is already up again), else whatever is held.
     *  Taking it uses the press up, so one tap is one step. `maxAgeMs` is about one step of walking: a tap made early in a step still happens right after it. */
    consumeDirection(maxAgeMs = QUEUE_MAX_AGE_MS) {
        const q = this.queuedDirection;
        this.queuedDirection = null;
        if (q && performance.now() - q.time <= maxAgeMs) return q.dir;
        return this.direction;
    }

    /** Whether a step is wanted next (a key held, or a fresh tap waiting), without using the tap up. */
    wantsToMove(maxAgeMs = QUEUE_MAX_AGE_MS) {
        const q = this.queuedDirection;
        return !!((q && performance.now() - q.time <= maxAgeMs) || this.direction);
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