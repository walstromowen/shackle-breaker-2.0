import { events } from '../core/eventBus.js';
import { UI_SFX, UI_SFX_VOLUME, uiPitch } from './uiSfx.js';

export class ContextMenuManager {
    constructor(config = {}) {
        /**
         * Expected config shape:
         * {
         *   onAction: (actionId, payload) => {}, // Global fallback callback
         *   owner: controller                    // optional: the BaseController that owns this menu. With it, the menu plays its sounds
         *                                        // through the controller (so the controller's sound count stays right and nothing is
         *                                        // doubled); without it the sounds are played straight to the event bus.
         * }
         */
        this.config = config;
        this.menu = null; 
    }

    // ========================================================
    // SOUND (the same four sounds as the rest of the UI)
    // ========================================================
    _sfx(kind) {
        const owner = this.config.owner;
        if (owner) {
            if (kind === 'hover' && owner.playNavSound) return owner.playNavSound();
            if (kind === 'confirm' && owner.playConfirmSound) return owner.playConfirmSound();
            if (kind === 'cancel' && owner.playCancelSound) return owner.playCancelSound();
            if (kind === 'error' && owner.playErrorSound) return owner.playErrorSound();
        }
        events.emit('PLAY_SFX', { id: UI_SFX[kind], volume: UI_SFX_VOLUME[kind], pitch: uiPitch() });
    }

    /** Options the cursor may rest on (not dividers, info lines or disabled entries). */
    _isSelectable(option) {
        return !!option && !option.isDivider && !option.isInfo && !option.disabled;
    }

    /**
     * Opens the context menu.
     * @param {number} x - The screen X coordinate.
     * @param {number} y - The screen Y coordinate.
     * @param {Array} options - Array of { label: string, actionId: string, callback?: function }.
     * @param {any} payload - Whatever data the controller wants back when an action is selected (e.g., the item object).
     */
    open(x, y, options, payload = null) {
        if (!options || options.length === 0) return;

        const first = options.findIndex(o => this._isSelectable(o));

        this.menu = {
            x,
            y,
            options,
            payload,
            selectedIndex: first === -1 ? -1 : first
        };
    }

    close() {
        this.menu = null;
    }

    /**
     * Moves the keyboard cursor one selectable option up (-1) or down (+1), wrapping. From "nothing selected" (-1, how a menu
     * opened with the mouse starts) DOWN lands on the first option and UP on the last. Returns true if the cursor moved.
     */
    _step(direction) {
        const options = this.menu.options;
        const len = options.length;
        const from = this.menu.selectedIndex;

        let index = from;
        for (let n = 0; n < len; n++) {
            if (index === -1) index = direction > 0 ? -1 : 0; // start just outside the list so the first step lands on an end
            index = (index + direction + len) % len;
            if (this._isSelectable(options[index])) {
                this.menu.selectedIndex = index;
                return index !== from;
            }
        }
        return false;
    }

    /**
     * Handles keyboard or gamepad directional input for the menu.
     */
    handleNavigation(intent) {
        if (!this.menu) return;

        if (intent === 'CANCEL') {
            this.close();
            this._sfx('cancel');
        } else if (intent === 'UP') {
            if (this._step(-1)) this._sfx('hover');
        } else if (intent === 'DOWN') {
            if (this._step(1)) this._sfx('hover');
        } else if (intent === 'CONFIRM') {
            if (this._isSelectable(this.menu.options[this.menu.selectedIndex])) {
                this.executeAction(this.menu.selectedIndex);
            } else if (this._step(1)) {
                // Nothing was highlighted (a menu opened with the mouse): Enter just shows the cursor, like every other list
                this._sfx('hover');
            }
        }
    }

    /**
     * Executes the action at the specified index. Can be triggered by mouse click or CONFIRM intent.
     * Always makes exactly one sound: whatever the action itself plays, or the confirm sound if it played nothing.
     */
    executeAction(index) {
        if (!this.menu) return;
        
        const option = this.menu.options[index];
        if (!this._isSelectable(option)) {
            // A divider / info line / empty space was activated: nothing happens, the menu stays open
            if (!option) this.close();
            return;
        }

        const payload = this.menu.payload;
        const owner = this.config.owner;
        const before = owner && typeof owner.sfxCount === 'number' ? owner.sfxCount : null;

        // If the option has a specific callback, use it. Otherwise, use the global handler.
        if (typeof option.callback === 'function') {
            option.callback(payload);
        } else if (typeof this.config.onAction === 'function') {
            this.config.onAction(option.actionId, payload);
        }

        // The action was silent: say "chosen". (Without an owner we cannot tell, so the menu stays quiet and the caller decides.)
        if (before !== null && owner.sfxCount === before) this._sfx('confirm');

        this.close();
    }

    /**
     * Optional: Helper to check if a mouse click was inside the menu bounds (requires renderer to pass menu dimensions)
     */
    isClickInside(mouseX, mouseY, menuWidth, menuHeight) {
        if (!this.menu) return false;
        return mouseX >= this.menu.x && mouseX <= this.menu.x + menuWidth &&
               mouseY >= this.menu.y && mouseY <= this.menu.y + menuHeight;
    }
}
