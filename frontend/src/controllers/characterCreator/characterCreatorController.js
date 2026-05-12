import { BaseController } from '../core/baseController.js';
import { CharacterCreatorLogic, CREATION_DATA } from './characterCreatorLogic.js';
import { ScrollManager } from '../../ui/scrollManager.js';

// --- STANDARDIZED INPUT BINDINGS ---
const KEY_BINDINGS = {
    'ArrowUp': 'UP', 'KeyW': 'UP',
    'ArrowDown': 'DOWN', 'KeyS': 'DOWN',
    'ArrowLeft': 'LEFT', 'KeyA': 'LEFT',
    'ArrowRight': 'RIGHT', 'KeyD': 'RIGHT',
    'Enter': 'CONFIRM', 'Space': 'CONFIRM',
    'Escape': 'CANCEL', 'Backspace': 'CANCEL', 'Tab': 'CANCEL'
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
            isEditingSeed: this.logic.isEditingSeed, // NEW: Export to renderer
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
        if (!this.logic.isEditingName && !this.logic.isEditingSeed && this.hoveredHitboxId && this.hoveredHitboxId !== prevHoverId) {
            this._syncFocusWithHover(this.hoveredHitboxId);
        }
    }

    _syncFocusWithHover(hitboxId) {
        if (hitboxId === 'INPUT_NAME') {
            this.logic.setRowByStep('name');
        } else if (hitboxId === 'INPUT_SEED') { // NEW
            this.logic.setRowByStep('seed');
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
        // --- CHANGED: Check each input's focus state individually ---
        if (this.logic.isEditingName && hitboxId !== 'INPUT_NAME') {
            this.logic.validateActiveInput();
        }
        if (this.logic.isEditingSeed && hitboxId !== 'INPUT_SEED') {
            this.logic.validateActiveInput();
        }

        if (!hitboxId) return;

        if (hitboxId === 'INPUT_NAME') {
            this.logic.setRowByStep('name');
            this.logic.isEditingName = true;
        } else if (hitboxId === 'INPUT_SEED') {
            this.logic.setRowByStep('seed');
            this.logic.isEditingSeed = true;
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
        if (this.logic.isEditingName || this.logic.isEditingSeed) {
            this.logic.validateActiveInput();
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
        // Intercept typing for either the name or the seed
        if (this.logic.isEditingName || this.logic.isEditingSeed) {
            if (e.code === "Enter" || e.code === "Escape") {
                this.logic.validateActiveInput();
                this.playConfirmSound();
            } else {
                if (this.logic.isEditingName) {
                    this.logic.nameInput.handleEvent(e);
                    this.logic.state.name = this.logic.nameInput.value;
                } else if (this.logic.isEditingSeed) {
                    this.logic.seedInput.handleEvent(e);
                    this.logic.state.seed = this.logic.seedInput.value;
                }
            }
            return;
        }

        const intent = (e && KEY_BINDINGS[e.code]);
        if (!intent) return;

        // Track state to see if a sound should fire
        const prevRow = this.logic.currentRow;
        const prevSelections = JSON.stringify(this.logic.state);

        if (intent === 'UP') {
            this.logic.moveRow(-1);
            if (this.logic.currentRow !== prevRow) this.playNavSound();
        } else if (intent === 'DOWN') {
            this.logic.moveRow(1);
            if (this.logic.currentRow !== prevRow) this.playNavSound();
        } else if (intent === 'LEFT') {
            if (this.logic.modifyValue(-1)) {
                this.scrollManager.resetAllScrolls();
                this.playNavSound();
            }
        } else if (intent === 'RIGHT') {
            if (this.logic.modifyValue(1)) {
                this.scrollManager.resetAllScrolls();
                this.playNavSound();
            }
        } else if (intent === 'CONFIRM') {
            this.logic.handleAction();
            this.playConfirmSound();
        } else if (intent === 'CANCEL') {
            this.playCancelSound();
            if (this.scrollManager.isDragging) this.scrollManager.handleDragEnd();
        }
    }
}