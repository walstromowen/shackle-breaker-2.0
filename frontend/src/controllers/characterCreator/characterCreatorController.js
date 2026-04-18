import { BaseController } from '../core/baseController.js'; 
import { CharacterCreatorLogic, CREATION_DATA } from './characterCreatorLogic.js';
import { ScrollManager } from '../../ui/scrollManager.js';

export class CharacterCreatorController extends BaseController {
    // Note: Passed input here in case BaseController expects it, 
    // though UIInteractionManager uses its proxy.
    constructor(input) {
        super(input); 
        
        this.logic = new CharacterCreatorLogic();
        this.scrollManager = new ScrollManager();
        
        // Register potential scroll zones early so the thumbs are recognized
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
            
            // FIXED: Map BaseController's string ID to the object the Renderer expects
            hoveredElement: this.hoveredHitboxId ? { id: this.hoveredHitboxId } : null, 
            
            scrollOffsets: {
                preview: this.scrollManager.getOffset('preview_panel'),
                stats: this.scrollManager.getOffset('stats_panel')
            },
            
            onLayoutUpdate: (hitboxes, scrollBounds) => {
                // FIXED: Use BaseController's method so UIInteractionManager can see them
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
        super.handleMouseMove(x, y, isMouseDown, renderer); 
        // Feed raw mouse updates to the scroll manager for smooth dragging
        this.scrollManager.handleMouseMove(y, isMouseDown);
    }

    onDragStart(hitboxId) {
        // Automatically called by UIInteractionManager if a drag threshold is met
        if (hitboxId === 'SCROLL_THUMB_PREVIEW' || hitboxId === 'SCROLL_THUMB_STATS') {
            this.scrollManager.handleMouseDown(hitboxId, this.mouse.y);
        }
    }

    onClick(hitboxId) {
        // Name validation catch
        if (this.logic.isEditingName && hitboxId !== 'INPUT_NAME') {
            this.logic.validateName();
        }

        if (!hitboxId) return;

        // Routing based on Hitbox ID
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

    handleScroll(delta) {
        // Pass scroll wheel events. Lowered multiplier to 8 for smoother reading.
        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta * 8); 
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

        // Note: Assuming `_mapKeyCodeToIntent` exists in your BaseController, 
        // otherwise default entirely to checking `e.code`.
        const intent = typeof this._mapKeyCodeToIntent === 'function' ? this._mapKeyCodeToIntent(keyCode) : null;

        if (intent === 'UP' || e.code === "ArrowUp" || e.code === "KeyW") {
            this.logic.moveRow(-1);
        } else if (intent === 'DOWN' || e.code === "ArrowDown" || e.code === "KeyS") {
            this.logic.moveRow(1);
        } else if (intent === 'LEFT' || e.code === "ArrowLeft" || e.code === "KeyA") {
            if (this.logic.modifyValue(-1)) this.scrollManager.resetAllScrolls();
        } else if (intent === 'RIGHT' || e.code === "ArrowRight" || e.code === "KeyD") {
            if (this.logic.modifyValue(1)) this.scrollManager.resetAllScrolls();
        } else if (intent === 'CONFIRM' || e.code === "Enter" || e.code === "Space") {
            this.logic.handleAction();
        }
    }
}