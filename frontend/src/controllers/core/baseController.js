/**
 * frontend/src/controllers/core/baseController.js
 */
export class BaseController {
    constructor(input) {
        this.input = input;

        // --- Shared State ---
        this.mouse = { x: 0, y: 0 };
        this.lastRenderedHitboxes = [];
        this.hoveredHitboxId = null; 
    }

    // --- Core Architecture ---
    update(dt) {}
    getState() { return {}; }

    // --- Standard UI Hitbox System ---
    
    // UIInteractionManager calls this to see what is clickable
    getHitboxes() { 
        return this.lastRenderedHitboxes; 
    }

    // Renderers (or controllers) call this to update the cache
    updateHitboxes(hitboxes) {
        this.lastRenderedHitboxes = hitboxes;
    }

    // --- Standard UI Callbacks ---
    // UIInteractionManager calls these automatically!
    
    onHover(hitboxId) {
        // Save the currently hovered ID so child controllers know what is highlighted
        this.hoveredHitboxId = hitboxId;
    }
    
    onClick(hitboxId) {}
    onRightClick(hitboxId) {}
    onDragStart(hitboxId) {}
    onDrop(dragId, targetId) {}


    // --- Raw Input Fallbacks ---
    // SceneManager calls these automatically for non-UI interactions

    handleKeyDown(keyCode, e) {}
    handleScroll(delta) {}
    
    handleMouseMove(x, y, isMouseDown, renderer) {
        // Automatically keep track of raw mouse coordinates for all controllers
        this.mouse.x = x;
        this.mouse.y = y;
    }
    
    handleMouseDown(x, y, renderer) {}
    handleRightClick(x, y) {}
}