import { BaseController } from '../core/baseController.js';
import { CharacterCreatorLogic, CREATION_DATA } from './characterCreatorLogic.js';
import { ScrollManager } from '../../ui/scrollManager.js';

// --- STANDARDIZED INPUT BINDINGS ---
const KEY_BINDINGS = {
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

export class CharacterCreatorController extends BaseController {
    constructor(input) {
        super(input);
        this.logic = new CharacterCreatorLogic();
        this.scrollManager = new ScrollManager();

        // Register potential scroll zones early so the thumbs are recognized
        this.scrollManager.registerZone('preview_panel', { thumbIds: ['SCROLL_THUMB_PREVIEW'] });
        this.scrollManager.registerZone('stats_panel', { thumbIds: ['SCROLL_THUMB_STATS'] });
    }

    // ========================================================
    // LIFECYCLE
    // ========================================================
    update(dt) {
        if (super.update) super.update(dt);
        this.scrollManager.update(dt);
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
            hoveredElement: this.hoveredHitboxId ? { id: this.hoveredHitboxId } : null,
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

    // ========================================================
    // STANDARDIZED INPUT HANDLING (Overrides BaseController)
    // ========================================================
    handleMouseMove(x, y, isMouseDown, renderer) {
        const prevHoverId = this.hoveredHitboxId;
        super.handleMouseMove(x, y, isMouseDown, renderer);

        // --- SYNC KEYBOARD LOGIC WITH MOUSE HOVER ---
        if (!this.logic.isEditingName && this.hoveredHitboxId && this.hoveredHitboxId !== prevHoverId) {
            this._syncFocusWithHover(this.hoveredHitboxId);
        }
    }

    _syncFocusWithHover(hitboxId) {
        if (hitboxId === 'INPUT_NAME') {
            this.logic.setRowByStep('name');
        } else if (hitboxId === 'BTN_START') {
            this.logic.setRowByStep('start');
        } else if (hitboxId.startsWith('ROW_')) {
            this.logic.setRowByStep(hitboxId.replace('ROW_', ''));
        } else if (hitboxId.startsWith('BTN_PREV_')) {
            this.logic.setRowByStep(hitboxId.replace('BTN_PREV_', ''));
        } else if (hitboxId.startsWith('BTN_NEXT_')) {
            this.logic.setRowByStep(hitboxId.replace('BTN_NEXT_', ''));
        }
    }

    onClick(hitboxId, fromKeyboard = false) {
        if (this.logic.isEditingName && hitboxId !== 'INPUT_NAME') {
            this.logic.validateName();
        }

        if (!hitboxId) return;

        if (hitboxId === 'INPUT_NAME') {
            this.logic.setRowByStep('name');
            this.logic.isEditingName = true;
        } else if (hitboxId === 'BTN_START') {
            this.logic.finalizeCharacter();
        } else if (hitboxId.startsWith('BTN_NEXT_')) {
            this.logic.setRowByStep(hitboxId.replace('BTN_NEXT_', ''));
            if (this.logic.modifyValue(1)) this.scrollManager.resetAllScrolls();
        } else if (hitboxId.startsWith('BTN_PREV_')) {
            this.logic.setRowByStep(hitboxId.replace('BTN_PREV_', ''));
            if (this.logic.modifyValue(-1)) this.scrollManager.resetAllScrolls();
        } else if (hitboxId.startsWith('ROW_')) {
            this.logic.setRowByStep(hitboxId.replace('ROW_', ''));
        }
    }

    onRightClick(hitboxId) {
        if (this.logic.isEditingName) {
            this.logic.validateName();
        } else if (this.scrollManager.isDragging) {
            this.scrollManager.handleDragEnd();
        }
    }

    // ========================================================
    // STANDARD DRAG AND DROP CALLBACKS
    // ========================================================
    onDragStart(hitboxId) {
        if (hitboxId === 'SCROLL_THUMB_PREVIEW' || hitboxId === 'SCROLL_THUMB_STATS') {
            this.scrollManager.handleDragStart(hitboxId, this.mouse.y);
        }
    }

    onDragMove(x, y) {
        if (this.scrollManager.isDragging) {
            this.scrollManager.handleDragMove(y);
        }
    }

    onDrop(sourceHitboxId, targetHitboxId) {
        if (this.scrollManager.isDragging) {
            this.scrollManager.handleDragEnd();
        }
    }

    handleScroll(delta) {
        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta * 40);
    }

    handleKeyDown(keyCode, e) {
        if (this.logic.isEditingName) {
            if (e.code === "Enter" || e.code === "Escape") {
                this.logic.validateName();
            } else {
                this.logic.nameInput.handleEvent(e);
                this.logic.state.name = this.logic.nameInput.value;
            }
            return;
        }

        // 1. Try explicit bindings first, fallback to BaseController's mapper
        const intent = (e && KEY_BINDINGS[e.code]) || 
                       (typeof this._mapKeyCodeToIntent === 'function' ? this._mapKeyCodeToIntent(keyCode) : null);

        if (!intent) return;

        if (intent === 'UP') {
            this.logic.moveRow(-1);
        } else if (intent === 'DOWN') {
            this.logic.moveRow(1);
        } else if (intent === 'LEFT') {
            if (this.logic.modifyValue(-1)) this.scrollManager.resetAllScrolls();
        } else if (intent === 'RIGHT') {
            if (this.logic.modifyValue(1)) this.scrollManager.resetAllScrolls();
        } else if (intent === 'CONFIRM') {
            this.logic.handleAction();
        } else if (intent === 'CANCEL') {
            // Cancel any active drag/scroll operations
            if (this.scrollManager.isDragging) {
                this.scrollManager.handleDragEnd();
            }
        }
    }
}