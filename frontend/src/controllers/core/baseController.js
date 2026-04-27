/**
 * frontend/src/controllers/core/baseController.js
 */
import { events } from '../../core/eventBus.js';

export class BaseController {
    constructor(input) {
        this.input = input;
        this.mouse = { x: 0, y: 0 };
        this.lastRenderedHitboxes = [];
        this.hoveredHitboxId = null;
    }

    // ========================================================
    // GLOBAL UI AUDIO HELPERS
    // ========================================================
    playNavSound(sfxId = 'hoverTick') {
        events.emit('PLAY_SFX', { id: sfxId, volume: 0.4, pitch: 0.9 + Math.random() * 0.2 });
    }

    playConfirmSound(sfxId = 'cinematicBoom') {
        events.emit('PLAY_SFX', { id: sfxId, volume: 0.6, pitch: 0.9 + Math.random() * 0.2 });
    }

    playCancelSound(sfxId = 'cinematicBoomCancel') {
        events.emit('PLAY_SFX', { id: sfxId, volume: 0.5, pitch: 0.9 + Math.random() * 0.2 });
    }

    // --- Core Architecture ---
    update(dt) {}
    getState() { return {}; }
    getHitboxes() { return this.lastRenderedHitboxes; }
    updateHitboxes(hitboxes) { this.lastRenderedHitboxes = hitboxes; }

    // --- Standard UI Callbacks ---
    onHover(hitboxId) { this.hoveredHitboxId = hitboxId; }
    onClick(hitboxId) {}
    onRightClick(hitboxId) {}
    onDragMove(x, y) {}
    onDragStart(hitboxId) {}
    onDrop(dragId, targetId) {}

    // --- Raw Input Fallbacks ---
    handleKeyDown(keyCode, e) {}
    handleScroll(delta) { }
    handleMouseMove(x, y, isMouseDown, renderer) {
        this.mouse.x = x;
        this.mouse.y = y;
    }
}