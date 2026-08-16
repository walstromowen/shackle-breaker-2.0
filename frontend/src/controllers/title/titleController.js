import { BaseController } from '../core/baseController.js';
import { events } from '../../core/eventBus.js';

// --- STANDARDIZED INPUT BINDINGS ---
const KEY_BINDINGS = {
    'ArrowUp': 'UP',
    'KeyW': 'UP',
    'ArrowDown': 'DOWN',
    'KeyS': 'DOWN',
    'Enter': 'CONFIRM',
    'Space': 'CONFIRM',
    'Escape': 'CANCEL',
    'Backspace': 'CANCEL'
};

export class TitleController extends BaseController {
    constructor(input) {
        super(input);
        
        // Define our semantic menu data
        this.menuItems = [
            { id: 'btn_new_game', text: 'New Game' },
            { id: 'btn_load_game', text: 'Load Game' },
            { id: 'btn_options', text: 'Settings' }
        ];
        
        // Start with -1 so no button is highlighted by default
        this.selectedIndex = -1;

        // Since the user already interacted with the Auth screen prior to this,
        // the browser's AudioContext is fully unlocked. This will play instantly!
        events.emit('PLAY_MUSIC', { id: 'shackle_breaker_theme_1', fadeTime: 2.0 });
    }

    // Pass necessary data to the renderer
    getState() {
        return {
            menuItems: this.menuItems,
            // Only fall back to keyboard index if it's a valid index (>= 0)
            hoveredId: this.hoveredHitboxId || (this.selectedIndex >= 0 ? this.menuItems[this.selectedIndex]?.id : null)
        };
    }

    // ======================================================== //
    //     STANDARDIZED INPUT HANDLING                          //
    // ======================================================== //

    handleMouseMove(x, y, isMouseDown, renderer) {
        const prevHoverId = this.hoveredHitboxId;
        super.handleMouseMove(x, y, isMouseDown, renderer);

        // Sync keyboard selection index with mouse hover
        if (this.hoveredHitboxId !== prevHoverId) {
            if (this.hoveredHitboxId) {
                this.selectedIndex = this.menuItems.findIndex(item => item.id === this.hoveredHitboxId);
            } else {
                // Clear selection when mouse leaves button
                this.selectedIndex = -1;
            }
        }
    }

    handleKeyDown(keyCode, e) {
        const intent = KEY_BINDINGS[e.code];
        if (!intent) return;

        const prevIndex = this.selectedIndex;

        if (intent === 'UP') {
            if (this.selectedIndex === -1) {
                this.selectedIndex = this.menuItems.length - 1; // Jump to bottom
            } else {
                this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
            }
            if (this.selectedIndex !== prevIndex) {
                events.emit('PLAY_SFX', { id: 'uiNav', volume: 0.5 });
            }
        } else if (intent === 'DOWN') {
            if (this.selectedIndex === -1) {
                this.selectedIndex = 0; // Jump to top
            } else {
                this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
            }
            if (this.selectedIndex !== prevIndex) {
                events.emit('PLAY_SFX', { id: 'uiNav', volume: 0.5 });
            }
        } else if (intent === 'CONFIRM') {
            if (this.selectedIndex >= 0) {
                const selectedItem = this.menuItems[this.selectedIndex];
                if (selectedItem) {
                    events.emit('PLAY_SFX', { id: 'uiConfirm', volume: 0.8 });
                    this.onClick(selectedItem.id);
                }
            }
        } else if (intent === 'CANCEL') {
            events.emit('PLAY_SFX', { id: 'uiCancel', volume: 0.5 });
            this.onRightClick(null);
        }
    }

    // --- SEMANTIC UI TRANSLATIONS ---

    // Left-Click / CONFIRM: Selecting/Advancing
    onClick(hitboxId) {
        if (!hitboxId) return;

        switch (hitboxId) {
            case 'btn_new_game':
                events.emit('CHANGE_SCENE', { scene: 'character-creator' });
                break;
            case 'btn_load_game':
                console.log('[TitleController] Load Game clicked - Not implemented');
                break;
            case 'btn_options':
                console.log('[TitleController] Options clicked - Not implemented');
                break;
        }
    }

    // Right-Click / CANCEL: Universal Back/Cancel
    onRightClick(hitboxId) {
        console.log('[TitleController] Universal Back triggered at root menu.');
    }
}