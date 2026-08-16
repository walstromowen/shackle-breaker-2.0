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

        // Track selected index for keyboard navigation (defaults to first item)
        this.selectedIndex = 0;
    }

    // Pass necessary data to the renderer
    getState() {
        return {
            menuItems: this.menuItems,
            // Fall back to keyboard-focused item ID if no mouse hover is active
            hoveredId: this.hoveredHitboxId || this.menuItems[this.selectedIndex]?.id
        };
    }

    // ======================================================== //
    // STANDARDIZED INPUT HANDLING                             //
    // ======================================================== //

    handleMouseMove(x, y, isMouseDown, renderer) {
        const prevHoverId = this.hoveredHitboxId;
        super.handleMouseMove(x, y, isMouseDown, renderer);

        // Sync keyboard selection index with mouse hover
        if (this.hoveredHitboxId && this.hoveredHitboxId !== prevHoverId) {
            const index = this.menuItems.findIndex(item => item.id === this.hoveredHitboxId);
            if (index !== -1) {
                this.selectedIndex = index;
            }
        }
    }

    handleKeyDown(keyCode, e) {
        const intent = KEY_BINDINGS[e.code];
        if (!intent) return;

        const prevIndex = this.selectedIndex;

        if (intent === 'UP') {
            this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
            if (this.selectedIndex !== prevIndex) {
                events.emit('PLAY_SFX', { id: 'uiNav', volume: 0.5 });
            }
        } else if (intent === 'DOWN') {
            this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
            if (this.selectedIndex !== prevIndex) {
                events.emit('PLAY_SFX', { id: 'uiNav', volume: 0.5 });
            }
        } else if (intent === 'CONFIRM') {
            const selectedItem = this.menuItems[this.selectedIndex];
            if (selectedItem) {
                events.emit('PLAY_SFX', { id: 'uiConfirm', volume: 0.8 });
                this.onClick(selectedItem.id);
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
        // Since we are at the root menu, 'Back' might just cancel an active prompt
        // or trigger an exit confirmation. For now, we capture it to prevent bleed.
        console.log('[TitleController] Universal Back triggered at root menu.');
    }
}