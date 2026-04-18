import { CharacterCreatorLogic, CREATION_DATA } from './characterCreatorLogic.js';
import { ScrollManager } from '../../ui/scrollManager.js';

export class CharacterCreatorController {
    constructor() {
        this.logic = new CharacterCreatorLogic();
        this.scrollManager = new ScrollManager();

        // --- INTERACTION STATE ---
        this.mouse = { x: 0, y: 0 };
        this.isMouseDown = false;
        this.lastRenderedHitboxes = [];
        this.hoveredElement = null;
        
        // Register potential scroll zones early
        this.scrollManager.registerZone('preview_panel', { thumbIds: ['SCROLL_THUMB_PREVIEW'] });
        this.scrollManager.registerZone('stats_panel', { thumbIds: ['SCROLL_THUMB_STATS'] });
    }

    // ========================================================
    // STATE ACCESS FOR RENDERER
    // ========================================================

    getState() {
        return {
            currentRow: this.logic.currentRow,
            currentStep: this.logic.getCurrentStep(),
            isEditingName: this.logic.isEditingName, 
            data: CREATION_DATA,
            selections: this.logic.state,
            previewStats: this.logic.getPreviewStats(),
            mouse: this.mouse,
            hoveredElement: this.hoveredElement,
            scrollOffsets: {
                preview: this.scrollManager.getOffset('preview_panel'),
                stats: this.scrollManager.getOffset('stats_panel')
            },
            onLayoutUpdate: (hitboxes, scrollBounds) => {
                this.updateHitboxes(hitboxes);
                if (scrollBounds) {
                    if (scrollBounds.preview) this.scrollManager.registerZone('preview_panel', scrollBounds.preview);
                    if (scrollBounds.stats) this.scrollManager.registerZone('stats_panel', scrollBounds.stats);
                }
            }
        };
    }

    updateHitboxes(hitboxes) {
        this.lastRenderedHitboxes = hitboxes;
    }

    // ========================================================
    // INPUT HANDLING
    // ========================================================

    handleMouseMove(x, y) {
        this.mouse.x = x;
        this.mouse.y = y;

        this.scrollManager.handleMouseMove(y, this.isMouseDown);

        let found = null;
        for (let i = this.lastRenderedHitboxes.length - 1; i >= 0; i--) {
            const b = this.lastRenderedHitboxes[i];
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                found = b;
                break;
            }
        }
        this.hoveredElement = found;
    }

    handleMouseDown(x, y) {
        this.isMouseDown = true;

        if (this.logic.isEditingName && (!this.hoveredElement || this.hoveredElement.id !== 'INPUT_NAME')) {
            this.logic.validateName();
        }

        if (!this.hoveredElement) return;
        const id = this.hoveredElement.id;

        if (this.scrollManager.handleMouseDown(id, y)) {
            return;
        }

        if (id === 'INPUT_NAME') {
            this.logic.setRowByStep('name');
            this.logic.isEditingName = true;
        } else if (id === 'BTN_START') {
            this.logic.finalizeCharacter();
        } else if (id.startsWith('BTN_NEXT_')) {
            this.logic.setRowByStep(id.replace('BTN_NEXT_', ''));
            if (this.logic.modifyValue(1)) this.scrollManager.resetAllScrolls();
        } else if (id.startsWith('BTN_PREV_')) {
            this.logic.setRowByStep(id.replace('BTN_PREV_', ''));
            if (this.logic.modifyValue(-1)) this.scrollManager.resetAllScrolls();
        } else if (id.startsWith('ROW_')) {
            this.logic.setRowByStep(id.replace('ROW_', ''));
        }
    }

    handleMouseUp() {
        this.isMouseDown = false;
        this.scrollManager.handleMouseMove(this.mouse.y, false);
    }

    handleScrollWheel(x, y, delta) {
        this.scrollManager.handleScrollWheel(x, y, delta * 20); 
    }

    handleKeyDown(e) {
        const code = e.code;

        if (this.logic.isEditingName) {
            if (code === "Enter" || code === "Escape") {
                this.logic.validateName();
            } else {
                this.logic.nameInput.handleEvent(e); 
                this.logic.state.name = this.logic.nameInput.value; 
            }
            return; 
        }

        if (code === "ArrowUp" || code === "KeyW") this.logic.moveRow(-1);
        else if (code === "ArrowDown" || code === "KeyS") this.logic.moveRow(1);
        else if (code === "ArrowLeft" || code === "KeyA") {
            if (this.logic.modifyValue(-1)) this.scrollManager.resetAllScrolls();
        }
        else if (code === "ArrowRight" || code === "KeyD") {
            if (this.logic.modifyValue(1)) this.scrollManager.resetAllScrolls();
        }
        else if (code === "Enter" || code === "Space") this.logic.handleAction();
    }
}