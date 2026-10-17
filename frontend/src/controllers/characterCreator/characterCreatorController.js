import { BaseController } from '../core/baseController.js';
import { CharacterCreatorLogic, CREATION_DATA } from './characterCreatorLogic.js';
import { ScrollManager } from '../../ui/scrollManager.js';
import { events } from '../../core/eventBus.js';

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
            isEditingSeed: this.logic.isEditingSeed,
            // NEW: Export to renderer
            data: CREATION_DATA,
            selections: this.logic.state,
            previewStats: this.logic.getPreviewStats(),
            mouse: this.mouse,
            // The one lit element: what the mouse is over, or the keyboard cursor
            hoveredElement: this.getFocusId() ? { id: this.getFocusId() } : null,
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
    // The keyboard cursor: the id of the current row's hitbox
    getKeyboardFocusId() {
        const step = this.logic.getCurrentStep();
        if (step === 'name') return 'INPUT_NAME';
        if (step === 'seed') return 'INPUT_SEED';
        if (step === 'start') return 'BTN_START';
        return step ? `ROW_${step}` : null;
    }

    // The mouse moved onto something: the current row follows it (silent; UIInteractionManager adds the hover tick)
    setFocusFromPointer(hitboxId) {
        if (this.logic.isEditingName || this.logic.isEditingSeed || !hitboxId) return;
        this._syncFocusWithHover(hitboxId);
    }

    _syncFocusWithHover(hitboxId) {
        if (hitboxId === 'INPUT_NAME') {
            this.logic.setRowByStep('name');
        } else if (hitboxId === 'INPUT_SEED') {
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
            return this._adjustValue(1);
        } else if (hitboxId.startsWith('BTN_PREV_')) {
            this.logic.setRowByStep(hitboxId.replace('BTN_PREV_', ''));
            return this._adjustValue(-1);
        } else if (hitboxId.startsWith('ROW_')) {
            this.logic.setRowByStep(hitboxId.replace('ROW_', ''));
        }
    }

    // Same change as the LEFT / RIGHT keys: one tick when the value really changed, silence when it could not.
    _adjustValue(direction) {
        if (!this.logic.modifyValue(direction)) return false;
        this.scrollManager.resetAllScrolls();
        this.playNavSound();
    }

    // Back, one layer at a time: finish typing -> let go of a dragged scrollbar -> leave for the title screen.
    _goBack() {
        if (this.logic.isEditingName || this.logic.isEditingSeed) {
            this.logic.validateActiveInput();
        } else if (this.scrollManager.isDragging) {
            this.scrollManager.handleDragEnd();
        } else {
            events.emit('CHANGE_SCENE', { scene: 'title' });
        }
        this.playCancelSound();
    }

    onRightClick(hitboxId) {
        this._goBack();
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
            if (e.code === "Enter") {
                this.logic.validateActiveInput();
                this.playConfirmSound();
            } else if (e.code === "Escape") {
                this.logic.validateActiveInput();
                this.playCancelSound();
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

        const intent = this.resolveIntent(keyCode, e);
        if (!intent) return;

        // Track state to see if a sound should fire
        const prevRow = this.logic.currentRow;
        
        if (intent === 'UP') {
            this.logic.moveRow(-1);
            if (this.logic.currentRow !== prevRow) this.playNavSound();
        } else if (intent === 'DOWN') {
            this.logic.moveRow(1);
            if (this.logic.currentRow !== prevRow) this.playNavSound();
        } else if (intent === 'LEFT') {
            this._adjustValue(-1);
        } else if (intent === 'RIGHT') {
            this._adjustValue(1);
        } else if (intent === 'CONFIRM') {
            this.logic.handleAction();
            this.playConfirmSound();
        } else if (intent === 'CANCEL') {
            this._goBack();
        }
    }
}