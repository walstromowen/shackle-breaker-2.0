export class ContextMenuManager {
    constructor(config = {}) {
        /**
         * Expected config shape:
         * {
         * onAction: (actionId, payload) => {} // Global fallback callback
         * }
         */
        this.config = config;
        this.menu = null; 
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

        this.menu = {
            x,
            y,
            options,
            payload,
            selectedIndex: 0
        };
    }

    close() {
        this.menu = null;
    }

    /**
     * Handles keyboard or gamepad directional input for the menu.
     */
    handleNavigation(intent) {
        if (!this.menu) return;

        const len = this.menu.options.length;
        
        if (intent === 'CANCEL') {
            this.close();
        } else if (intent === 'UP') {
            this.menu.selectedIndex = (this.menu.selectedIndex - 1 + len) % len;
        } else if (intent === 'DOWN') {
            this.menu.selectedIndex = (this.menu.selectedIndex + 1) % len;
        } else if (intent === 'CONFIRM') {
            this.executeAction(this.menu.selectedIndex);
        }
    }

    /**
     * Executes the action at the specified index. Can be triggered by mouse click or CONFIRM intent.
     */
    executeAction(index) {
        if (!this.menu) return;
        
        const option = this.menu.options[index];
        if (!option) {
            this.close();
            return;
        }

        const payload = this.menu.payload;

        // If the option has a specific callback, use it. Otherwise, use the global handler.
        if (typeof option.callback === 'function') {
            option.callback(payload);
        } else if (typeof this.config.onAction === 'function') {
            this.config.onAction(option.actionId, payload);
        }

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