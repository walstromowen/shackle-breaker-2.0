/**
 * frontend/src/engine/baseController.js
 *
 * ============================================================================
 * INPUT HANDLING PIPELINE & ARCHITECTURE
 * ============================================================================
 * We are using an Input Handling Pipeline for this game engine. The architecture
 * follows a strict flow:
 * Input.js (raw events) → SceneManager.js (mediator/router) →
 * UIInteractionManager.js (semantic translator) → BaseController.js (logic consumer).
 *
 * Core Architectural Rules:
 * 1. Encapsulation: Interaction logic (like drag vs. click math) must be encapsulated
 *    within the UIInteractionManager to prevent 'input bleed.'
 * 2. Consumption: If the UI captures an interaction, it returns a handled flag,
 *    and the SceneManager must discard that input for the rest of the game world.
 * 3. The Interaction Standard: Left-click is for Selecting/Advancing; Right-click
 *    is the Universal Back/Cancel button. This is routed through the UIInteractionManager
 *    and consumed globally.
 * 4. Semantic Translation: Raw mouse coordinates and button states are translated
 *    into high-level events (onDragStart, onDragMove, onDrop, onHover, onClick)
 *    before reaching the controllers.
 * 5. Polymorphic Routing: The SceneManager routes these events to the activeController
 *    based on the current scene state.
 *
 * ============================================================================
 * THE UI STANDARD (what every screen follows)
 * ============================================================================
 * KEYS      resolveIntent(code, e) turns a key into UP / DOWN / LEFT / RIGHT / CONFIRM / CANCEL. WASD and arrows move, Enter and
 *           Space confirm, Escape / Backspace / Tab cancel. A screen adds its own keys with this.extraBindings (e.g. { KeyQ: 'PREV_CHAR' }).
 *           Holding Enter / Escape does not repeat (moving still does).
 * MODE      There is exactly one input mode at a time: 'mouse' or 'keyboard'. A navigation key switches to keyboard; a mouse move of
 *           more than a few pixels, a click or the wheel switches back. The mode decides what is highlighted:
 *             mouse mode     -> the element under the mouse (getFocusId() = hoveredHitboxId)
 *             keyboard mode  -> the keyboard cursor        (getFocusId() = getKeyboardFocusId())
 *           so two things are never lit at once. In mouse mode the screen's cursor follows the hover (setFocusFromPointer), and when the
 *           keyboard takes over it carries on from where the mouse was.
 * SOUND     Four sounds (ui/uiSfx.js): hover, confirm, cancel, error. Use playNavSound / playConfirmSound / playCancelSound /
 *           playErrorSound (or playSfx for a one-off like "coinsJingle"). UIInteractionManager adds a default sound for a mouse
 *           action ONLY when the controller played none while handling it, so an action makes exactly one sound whether it came from the
 *           mouse or the keyboard. If an action should be silent, call claimSfx().
 *             - a confirm when something is chosen / advanced
 *             - a cancel ONLY when something actually closes or goes back (never when there is nothing to go back to)
 *             - an error when the action is refused
 * BACK      Right-click, Escape, Backspace and Tab all mean "back". A screen with nothing to go back to (title, overworld, an
 *           encounter) sets cancelSfxOnRightClick = false so the right mouse button stays silent there.
 * ============================================================================
 */
import { events } from '../../../shared/core/eventBus.js';
import { UI_SFX, UI_SFX_VOLUME, uiPitch } from '../ui/uiSfx.js';

/* The keys every screen understands. */
export const INTENT_BINDINGS = {
    'ArrowUp': 'UP',
    'KeyW': 'UP',
    'ArrowDown': 'DOWN',
    'KeyS': 'DOWN',
    'ArrowLeft': 'LEFT',
    'KeyA': 'LEFT',
    'ArrowRight': 'RIGHT',
    'KeyD': 'RIGHT',
    'Enter': 'CONFIRM',
    'Space': 'CONFIRM',
    'Escape': 'CANCEL',
    'Backspace': 'CANCEL',
    'Tab': 'CANCEL'
};

/* How far (in canvas pixels) the mouse has to travel from where it was when the keyboard took over before the mouse takes back control. */
const MOUSE_WAKE_DISTANCE = 4;

export class BaseController {
    constructor(input) {
        this.input = input;

        // --- Shared Mouse State ---
        this.mouse = { x: 0, y: 0 };

        // --- Input Mode Tracking ---
        // 'mouse' | 'keyboard'. Prevents a resting or jittering mouse from overriding keyboard navigation (and the other way round).
        this.inputMode = 'mouse';
        this.lastMouse = { x: 0, y: 0 };
        this.mouseAnchor = { x: 0, y: 0 }; // where the mouse was when the keyboard took over
        this._kbAnchored = false;          // has mouseAnchor been set for the current keyboard session?

        // --- Keys ---
        this.extraBindings = null; // a screen's own keys, e.g. { KeyP: 'SWAP' }; they win over INTENT_BINDINGS

        // --- UI State ---
        this.lastRenderedHitboxes = [];
        this.hoveredHitboxId = null;

        // --- Sound bookkeeping (see UIInteractionManager) ---
        this.sfxCount = 0;                // goes up every time this controller plays (or claims) a UI sound
        this.cancelSfxOnRightClick = true; // false on a screen where right-click has nothing to cancel
    }

    // ========================================================
    // GLOBAL UI AUDIO HELPERS
    // ========================================================
    playSfx(id, volume = 0.5, pitch) {
        this.sfxCount++;
        events.emit('PLAY_SFX', { id, volume, pitch });
    }

    /* This interaction is deliberately silent: stops UIInteractionManager from adding its default sound. */
    claimSfx() {
        this.sfxCount++;
    }

    playNavSound(sfxId = UI_SFX.hover) {
        this.playSfx(sfxId, UI_SFX_VOLUME.hover, uiPitch());
    }

    playConfirmSound(sfxId = UI_SFX.confirm) {
        this.playSfx(sfxId, UI_SFX_VOLUME.confirm, uiPitch());
    }

    playCancelSound(sfxId = UI_SFX.cancel) {
        this.playSfx(sfxId, UI_SFX_VOLUME.cancel, uiPitch());
    }

    playErrorSound(sfxId = UI_SFX.error) {
        this.playSfx(sfxId, UI_SFX_VOLUME.error, uiPitch());
    }

    // ========================================================
    // KEYS -> INTENTS
    // ========================================================
    /**
     * The one way a key becomes an intent. Returns 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CONFIRM' | 'CANCEL' | one of the screen's own
     * (extraBindings) | null. A recognised key also hands control to the keyboard. Holding CONFIRM / CANCEL does not repeat.
     */
    resolveIntent(code, e) {
        const key = (e && e.code) || code;
        const intent = (this.extraBindings && this.extraBindings[key]) || INTENT_BINDINGS[key] || null;
        if (!intent) return null;

        if (key === 'Tab' && e && e.preventDefault) e.preventDefault(); // Tab must not move the browser's focus away from the game
        this.noteKeyboardInput();
        if (e && e.repeat && (intent === 'CONFIRM' || intent === 'CANCEL')) return null;
        return intent;
    }

    // ========================================================
    // INPUT MODE
    // ========================================================
    noteKeyboardInput() {
        if (this.inputMode === 'keyboard') return;
        this.inputMode = 'keyboard';
        this.mouseAnchor = { x: this.mouse.x, y: this.mouse.y };
        this._kbAnchored = true;
        // The keyboard carries on from whatever the mouse was pointing at.
        if (this.hoveredHitboxId) this.setFocusFromPointer(this.hoveredHitboxId, null);
    }

    notePointerInput() {
        this.inputMode = 'mouse';
        this._kbAnchored = false;
    }

    /* For a screen that opens with the keyboard cursor showing (the journal): keyboard mode without borrowing a stale hover. */
    startInKeyboardMode() {
        this.inputMode = 'keyboard';
        this.mouseAnchor = { x: this.mouse.x, y: this.mouse.y };
        this._kbAnchored = true;
        this.hoveredHitboxId = null;
    }

    /**
     * Override: the mouse moved onto hitboxId (mouse mode only), so move the screen's own cursor there. Play NO sound here:
     * UIInteractionManager adds the hover tick itself when the controller plays none. Return false for a hitbox that cannot be
     * picked right now (a dead target, a disabled panel): it is then silent too.
     */
    setFocusFromPointer(hitboxId, previousHitboxId) {}

    /** Override: the id the keyboard cursor is on (or null). */
    getKeyboardFocusId() {
        return null;
    }

    /** The one element that is highlighted right now. */
    getFocusId() {
        return this.inputMode === 'keyboard' ? this.getKeyboardFocusId() : this.hoveredHitboxId;
    }

    /**
     * Keyboard navigation for screens that have no list model of their own: from the element currentId, the nearest candidate in the
     * given direction ('UP' | 'DOWN' | 'LEFT' | 'RIGHT'), judged by where the hitboxes are on screen. With no current element (or one
     * that is not on screen) it returns the top-left candidate. Returns null when nothing lies that way.
     * @param {Array} candidates hitboxes {id,x,y,w,h} the cursor may land on (default: every hitbox)
     */
    findSpatialNeighbor(direction, currentId, candidates = this.getHitboxes()) {
        if (!candidates || candidates.length === 0) return null;

        const cur = candidates.find(c => c.id === currentId);
        if (!cur) {
            return [...candidates].sort((a, b) => (a.y - b.y) || (a.x - b.x))[0].id;
        }

        const cx = cur.x + cur.w / 2;
        const cy = cur.y + cur.h / 2;
        let best = null;
        let bestScore = Infinity;

        for (const c of candidates) {
            if (c === cur || c.id === cur.id) continue;
            const dx = (c.x + c.w / 2) - cx;
            const dy = (c.y + c.h / 2) - cy;

            let along, across;
            if (direction === 'UP') { along = -dy; across = Math.abs(dx); }
            else if (direction === 'DOWN') { along = dy; across = Math.abs(dx); }
            else if (direction === 'LEFT') { along = -dx; across = Math.abs(dy); }
            else { along = dx; across = Math.abs(dy); }

            if (along <= 1) continue; // not in that direction
            const score = along + across * 2; // straight ahead beats diagonal
            if (score < bestScore) { bestScore = score; best = c; }
        }
        return best ? best.id : null;
    }

    // --- Core Architecture ---
    update(dt) {}

    getState() {
        return {};
    }

    getHitboxes() {
        return this.lastRenderedHitboxes;
    }

    updateHitboxes(hitboxes) {
        this.lastRenderedHitboxes = hitboxes;
    }

    // --- Standard UI Callbacks ---
    onHover(hitboxId) {
        const previous = this.hoveredHitboxId;
        this.hoveredHitboxId = hitboxId;
        if (hitboxId && hitboxId !== previous && this.inputMode === 'mouse') {
            // returning false means "this is not something you can pick": no hover tick for it
            if (this.setFocusFromPointer(hitboxId, previous) === false) this.claimSfx();
        }
    }

    onClick(hitboxId) {}
    onRightClick(hitboxId) {}
    onDragMove(x, y) {}
    onDragStart(hitboxId) {}
    onDrop(dragId, targetId) {}

    // --- Raw Input Fallbacks ---
    handleKeyDown(keyCode, e) {
        // Screens that read keys directly (not through resolveIntent) still tell us the keyboard is in use.
        this.noteKeyboardInput();
    }

    handleScroll(delta) {}

    handleMouseMove(x, y, isMouseDown, renderer) {
        const previousX = this.mouse.x;
        const previousY = this.mouse.y;
        this.mouse.x = x;
        this.mouse.y = y;

        // In keyboard mode the mouse has to travel a few pixels from where it was when the keyboard took over: a resting or
        // jittering mouse never steals control, but a slow deliberate move still does.
        if (this.inputMode === 'keyboard') {
            if (!this._kbAnchored) {
                // a screen that set inputMode = 'keyboard' by itself: anchor at the last known mouse position
                this.mouseAnchor = { x: previousX, y: previousY };
                this._kbAnchored = true;
            }
            const dx = Math.abs(x - this.mouseAnchor.x);
            const dy = Math.abs(y - this.mouseAnchor.y);
            if (dx > MOUSE_WAKE_DISTANCE || dy > MOUSE_WAKE_DISTANCE) this.notePointerInput();
        } else {
            this._kbAnchored = false;
        }

        this.lastMouse.x = x;
        this.lastMouse.y = y;
    }
}
