/**
 * Canvas-based Interaction Menu
 * Displays a dropdown list of available actions for an object
 */
export class InteractionMenu {
    constructor(config) {
        this.config = config;
        this.isOpen = false;
        this.targetObject = null;
        this.selectedIndex = 0;
        this.actions = [];
        
        // Menu styling
        this.menuWidth = 200;
        this.itemHeight = 32;
        this.padding = 12;
        this.borderRadius = 8;
        
        // Colors
        this.bgColor = 'rgba(20, 20, 30, 0.95)';
        this.borderColor = 'rgba(100, 100, 120, 0.8)';
        this.textColor = '#FFFFFF';
        this.selectedColor = 'rgba(80, 120, 200, 0.6)';
        this.disabledColor = 'rgba(100, 100, 100, 0.5)';
        this.titleColor = '#FFD700';
    }

    open(object, screenX, screenY) {
        if (!object || !object.interaction) return false;
        
        this.isOpen = true;
        this.targetObject = object;
        this.actions = object.interaction.actions || [];
        this.selectedIndex = 0;
        
        // Find first enabled action
        for (let i = 0; i < this.actions.length; i++) {
            if (this.actions[i].enabled) {
                this.selectedIndex = i;
                break;
            }
        }
        
        // Calculate menu position (centered on object, but clamped to screen)
        this.menuX = screenX;
        this.menuY = screenY;
        
        return true;
    }

    close() {
        this.isOpen = false;
        this.targetObject = null;
        this.actions = [];
        this.selectedIndex = 0;
    }

    moveSelection(direction) {
        if (!this.isOpen || this.actions.length === 0) return;
        
        let newIndex = this.selectedIndex;
        
        if (direction === 'UP') {
            // Move up, skip disabled items
            do {
                newIndex--;
                if (newIndex < 0) newIndex = this.actions.length - 1;
            } while (!this.actions[newIndex].enabled && newIndex !== this.selectedIndex);
        } else if (direction === 'DOWN') {
            // Move down, skip disabled items
            do {
                newIndex++;
                if (newIndex >= this.actions.length) newIndex = 0;
            } while (!this.actions[newIndex].enabled && newIndex !== this.selectedIndex);
        }
        
        this.selectedIndex = newIndex;
    }

    getSelectedAction() {
        if (!this.isOpen || this.selectedIndex < 0 || this.selectedIndex >= this.actions.length) {
            return null;
        }
        const action = this.actions[this.selectedIndex];
        return action.enabled ? action : null;
    }

    render(ctx, camera) {
        if (!this.isOpen || !this.targetObject) return;
        
        const { TILE_SIZE, GAME_SCALE } = this.config;
        
        // Calculate menu position relative to object
        const objScreenX = Math.floor((this.targetObject.col * TILE_SIZE - camera.x) * GAME_SCALE);
        const objScreenY = Math.floor((this.targetObject.row * TILE_SIZE - camera.y) * GAME_SCALE);
        
        // Position menu to the right of the object
        let menuX = objScreenX + (TILE_SIZE * GAME_SCALE) + 10;
        let menuY = objScreenY;
        
        // Calculate menu height
        const titleHeight = 36;
        const menuHeight = titleHeight + (this.actions.length * this.itemHeight) + this.padding;
        
        // Clamp to screen bounds
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;
        
        if (menuX + this.menuWidth > canvasWidth - 10) {
            menuX = objScreenX - this.menuWidth - 10;
        }
        if (menuY + menuHeight > canvasHeight - 10) {
            menuY = canvasHeight - menuHeight - 10;
        }
        if (menuX < 10) menuX = 10;
        if (menuY < 10) menuY = 10;
        
        this.menuX = menuX;
        this.menuY = menuY;
        
        ctx.save();
        
        // Draw menu background with rounded corners
        this.drawRoundedRect(ctx, menuX, menuY, this.menuWidth, menuHeight, this.borderRadius);
        ctx.fillStyle = this.bgColor;
        ctx.fill();
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw object name (title)
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = this.titleColor;
        ctx.textAlign = 'center';
        ctx.fillText(
            this.targetObject.interaction.name,
            menuX + this.menuWidth / 2,
            menuY + 24
        );
        
        // Draw separator line
        ctx.strokeStyle = 'rgba(100, 100, 120, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(menuX + 10, menuY + titleHeight);
        ctx.lineTo(menuX + this.menuWidth - 10, menuY + titleHeight);
        ctx.stroke();
        
        // Draw actions
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        
        this.actions.forEach((action, index) => {
            const itemY = menuY + titleHeight + (index * this.itemHeight);
            
            // Highlight selected item
            if (index === this.selectedIndex && action.enabled) {
                ctx.fillStyle = this.selectedColor;
                this.drawRoundedRect(
                    ctx,
                    menuX + 8,
                    itemY + 4,
                    this.menuWidth - 16,
                    this.itemHeight - 8,
                    4
                );
                ctx.fill();
            }
            
            // Draw action text
            ctx.fillStyle = action.enabled ? this.textColor : this.disabledColor;
            ctx.fillText(
                action.label,
                menuX + 20,
                itemY + this.itemHeight / 2 + 5
            );
            
            // Draw selection indicator (arrow)
            if (index === this.selectedIndex && action.enabled) {
                ctx.fillStyle = this.titleColor;
                ctx.fillText('►', menuX + 8, itemY + this.itemHeight / 2 + 5);
            }
        });
        
        // Draw controls hint at bottom
        ctx.font = '11px monospace';
        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(
            '↑↓ Navigate  ⏎ Select  ESC Close',
            menuX + this.menuWidth / 2,
            menuY + menuHeight - 6
        );
        
        ctx.restore();
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}