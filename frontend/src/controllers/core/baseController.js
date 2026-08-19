/**
 * frontend/src/controllers/core/baseController.js
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
 * ============================================================================
 */
import { events } from '../../core/eventBus.js';

export class BaseController {
    constructor(input) {
        this.input = input;
        
        // --- Shared Mouse State ---
        this.mouse = { x: 0, y: 0 };
        
        // --- Input Mode Tracking ---
        // Prevents mouse sensor jitter from instantly overriding keyboard navigation
        this.inputMode = 'mouse'; // 'mouse' | 'keyboard'
        this.lastMouse = { x: 0, y: 0 };

        // --- UI State ---
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
        this.hoveredHitboxId = hitboxId;
    }
    
    onClick(hitboxId) {}
    onRightClick(hitboxId) {}
    onDragMove(x, y) {}
    onDragStart(hitboxId) {}
    onDrop(dragId, targetId) {}

    // --- Raw Input Fallbacks ---
    handleKeyDown(keyCode, e) {
        // Automatically register that the user is actively using the keyboard
        this.inputMode = 'keyboard';
    }
    
    handleScroll(delta) {}
    
    handleMouseMove(x, y, isMouseDown, renderer) {
        // Calculate how far the mouse actually moved
        const dx = Math.abs(x - this.lastMouse.x);
        const dy = Math.abs(y - this.lastMouse.y);

        // If the movement is greater than 2 pixels, it was intentional. Switch to mouse mode!
        if (dx > 2 || dy > 2) {
            this.inputMode = 'mouse';
        }

        // Update tracking coordinates
        this.lastMouse.x = x;
        this.lastMouse.y = y;

        // Expose to child controllers
        this.mouse.x = x;
        this.mouse.y = y;
    }
}