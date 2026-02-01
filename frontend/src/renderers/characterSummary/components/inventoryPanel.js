import { UITheme } from '../../../ui/UITheme.js';

export class InventoryPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        this.RENDER_SIZE = 32;
        this.ROW_HEIGHT = 40; // Increased slightly for better readability
    }

    render(inventory, inventoryIndex, isChoosingItem, x, y, w, hitboxes) {
        const centerX = Math.floor(x + (w / 2));
        let currentY = y + 10;

        // 1. Header
        this.ui.drawText("Inventory", centerX, currentY + 15, UITheme.fonts.header, UITheme.colors.textMain, "center");
        
        currentY += 35;
        this.ui.drawRect(x + 10, currentY, w - 20, 1, UITheme.colors.border);
        currentY += 15;

        // 2. Empty State
        if (!inventory || inventory.length === 0) {
            this.ui.drawText("- Empty -", centerX, currentY + 20, "italic 12px sans-serif", UITheme.colors.textMuted, "center");
            return;
        }

        // 3. List Items
        // Note: In a full implementation, you might want a scrollOffset here
        inventory.forEach((item, index) => {
            const isSelected = (index === inventoryIndex);
            
            // Determine highlighting colors based on state
            const bgAlpha = isSelected ? (isChoosingItem ? 0.15 : 0.05) : 0;
            const bgColor = isSelected ? "255, 215, 0" : "255, 255, 255"; // Gold or White base
            
            // Hitbox
            hitboxes.push({
                id: `INV_ITEM_${index}`,
                x: x,
                y: currentY,
                w: w,
                h: this.ROW_HEIGHT,
                type: 'inventory',
                index: index
            });

            // Draw Selection Background
            if (isSelected) {
                this.ui.drawRect(x, currentY, w, this.ROW_HEIGHT, `rgba(${bgColor}, ${bgAlpha})`);
                // Draw a small selection indicator on the left
                this.ui.drawRect(x, currentY, 4, this.ROW_HEIGHT, isChoosingItem ? UITheme.colors.accent : UITheme.colors.textHighlight);
            }

            // Draw Icon
            const iconX = x + 15;
            const iconY = currentY + 4;
            this._drawIcon(item, iconX, iconY);

            // Draw Text
            const textX = iconX + this.RENDER_SIZE + 12;
            const textY = currentY + 14;
            
            const name = item.name || item.definition?.name || "Unknown Item";
            const nameColor = isSelected ? "#fff" : UITheme.colors.textMain;
            
            this.ui.drawText(name, textX, textY, UITheme.fonts.body, nameColor, "left");

            // Subtext (Type or Slot)
            const def = item.definition || item;
            const subText = (def.slot || def.type || "").toUpperCase();
            this.ui.drawText(subText, textX, textY + 14, "10px monospace", UITheme.colors.textMuted, "left");

            // Count
            if (item.count > 1) {
                this.ui.drawText(`x${item.count}`, x + w - 15, currentY + (this.ROW_HEIGHT/2) + 4, UITheme.fonts.bold, UITheme.colors.accent, "right");
            }

            currentY += this.ROW_HEIGHT + 2; // Add a tiny gap between rows
        });
    }

    _drawIcon(item, x, y) {
        if (!item) return;
        const sheet = this.loader.get('items');
        if (!sheet) return;

        const iconData = item.icon || item.definition?.icon || { col: 0, row: 0 };
        const ICON_SIZE = 32; // Source spritesheet tile size
        
        const srcX = (iconData.col * ICON_SIZE);
        const srcY = (iconData.row * ICON_SIZE);

        // Draw shadow/backing for icon to make it pop
        this.ui.drawRect(x, y, this.RENDER_SIZE, this.RENDER_SIZE, "rgba(0,0,0,0.3)");
        
        this.ui.drawSprite(sheet, srcX, srcY, ICON_SIZE, ICON_SIZE, x, y, this.RENDER_SIZE, this.RENDER_SIZE);
    }
}