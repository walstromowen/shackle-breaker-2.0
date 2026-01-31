import { UITheme } from '../../../ui/UITheme.js';

export class InventoryPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        this.RENDER_SIZE = 32;
        this.ICON_PADDING = 0; // Adjust based on your spritesheet
    }

    render(inventory, inventoryIndex, isChoosingItem, x, y, w, hitboxes) {
        let currentY = y + 20;

        // Header
        this.ui.drawText("Inventory", x, currentY, UITheme.fonts.bold, UITheme.colors.textHighlight, "left");
        currentY += 10;
        this.ui.drawRect(x, currentY + 10, w, 2, "#444");
        currentY += 25;

        if (!inventory || inventory.length === 0) {
            this.ui.drawText("Empty", x, currentY, "13px sans-serif", "#555", "left");
            return;
        }

        // List Items
        inventory.forEach((item, index) => {
            const isSelected = (isChoosingItem && index === inventoryIndex);
            const rowHeight = 34;

            // Register Hitbox
            hitboxes.push({
                id: `INV_ITEM_${index}`,
                x: x - 5,
                y: currentY - 18,
                w: w + 10,
                h: rowHeight,
                type: 'inventory',
                index: index // Store index for easier lookup later
            });

            // Highlight
            if (isSelected) {
                this.ui.drawRect(x - 5, currentY - 18, w + 10, rowHeight, "rgba(255, 215, 0, 0.1)");
                this.ui.drawText(">", x - 12, currentY, "13px sans-serif", UITheme.colors.accent, "left");
            }

            // Draw Icon
            const iconY = Math.floor(currentY - 16);
            this._drawIcon(item, Math.floor(x), iconY);

            // Text Info
            const color = isSelected ? "#ffffff" : "#aaaaaa";
            const name = item.name || (item.definition ? item.definition.name : "Unknown");
            const nameX = Math.floor(x + this.RENDER_SIZE + 12);

            this.ui.drawText(name, nameX, currentY - 5, "13px sans-serif", color, "left");

            const def = item.definition || item;
            const subText = (def.slot || def.type || "").toUpperCase();
            this.ui.drawText(subText, nameX, currentY + 8, "10px monospace", "#666", "left");

            // Count
            if (item.count > 1) {
                this.ui.drawText(`x${item.count}`, x + w - 5, currentY, "12px sans-serif", "#888", "right");
            }

            currentY += rowHeight + 2;
        });
    }

    _drawIcon(item, x, y) {
        if (!item) return;
        const sheet = this.loader.get('items');
        if (!sheet) return;

        const iconData = item.icon || (item.definition ? item.definition.icon : { col: 0, row: 0 });
        const ICON_SIZE = 32; // Source size
        
        const srcX = (iconData.col * ICON_SIZE);
        const srcY = (iconData.row * ICON_SIZE);

        this.ui.drawSprite(sheet, srcX, srcY, ICON_SIZE, ICON_SIZE, x, y, this.RENDER_SIZE, this.RENDER_SIZE);
    }
}