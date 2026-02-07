import { UITheme } from '../../../ui/UITheme.js';
// NEW IMPORT
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';

export class InventoryPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        
        // --- Grid Constants ---
        this.COLS = 4;            
        this.SLOT_SIZE = 40;      // Keeps the 40px size (fits icons well)
        this.SLOT_PADDING = 8;    // INCREASED: Was 4, now 8 (fills the side gaps)
        
        // Layout Constants
        this.HEADER_HEIGHT = 50; 
        this.SCROLLBAR_WIDTH = 4;
        
        this.totalContentHeight = 0;
    }

    render(inventory, inventoryIndex, isChoosingItem, x, y, w, h, state, hitboxes) {
        const centerX = Math.floor(x + (w / 2));

        // --- 1. Draw Fixed Header ---
        this.ui.drawText("Inventory", centerX, y + 20, UITheme.fonts.header, UITheme.colors.textMain, "center");
        
        const dividerY = y + this.HEADER_HEIGHT - 10;
        this.ui.drawRect(x + 10, dividerY, w - 20, 1, UITheme.colors.border);

        // --- 2. Calculate Viewport Metrics ---
        const listY = y + this.HEADER_HEIGHT;
        const listH = h - this.HEADER_HEIGHT;
        
        // --- CENTER THE GRID ---
        // New Width Calculation: (4 * 40) + (3 * 8) = 160 + 24 = 184px
        const totalGridW = (this.COLS * this.SLOT_SIZE) + ((this.COLS - 1) * this.SLOT_PADDING);
        
        // Calculate starting X. 
        // We clamp it so it never renders to the left of the container (x + 2)
        let startX = x + Math.floor((w - totalGridW) / 2);
        if (startX < x + 2) startX = x + 2; 

        // --- 3. Scroll Calculation ---
        const itemCount = inventory ? inventory.length : 0;
        const rowCount = Math.ceil(itemCount / this.COLS);
        const currentContentHeight = rowCount * (this.SLOT_SIZE + this.SLOT_PADDING);
        
        const scrollOffset = state.inventoryScrollOffset || 0;
        const maxScroll = Math.max(0, currentContentHeight - listH);

        // Update layout state for the Controller
        if (state.layout) {
            state.layout.inventoryBounds = { x: x, y: y, w: w, h: h };
            state.layout.inventoryMaxScroll = maxScroll;
            state.layout.inventoryViewportH = listH; 
            state.layout.isGrid = true; 
            state.layout.cols = this.COLS;
            state.layout.itemHeight = this.SLOT_SIZE + this.SLOT_PADDING;
        }

        // Clamp Scroll
        let renderScroll = scrollOffset;
        if (renderScroll > maxScroll) renderScroll = maxScroll;
        if (renderScroll < 0) renderScroll = 0;

        // --- 4. Draw Grid Content ---
        this.ui.ctx.save();
        this.ui.startClip(x, listY, w + 15, listH); 

        if (!inventory || inventory.length === 0) {
            this.ui.drawText("- Empty -", centerX, listY + 30, "italic 12px sans-serif", UITheme.colors.textMuted, "center");
        } 
        else {
            inventory.forEach((item, index) => {
                // CHANGED: Look up definition
                const def = ItemDefinitions[item.defId];

                const col = index % this.COLS;
                const row = Math.floor(index / this.COLS);

                const itemX = startX + (col * (this.SLOT_SIZE + this.SLOT_PADDING));
                const itemY = listY + (row * (this.SLOT_SIZE + this.SLOT_PADDING)) - renderScroll;

                // Optimization: Skip off-screen
                if (itemY > listY + listH) return; 
                if (itemY + this.SLOT_SIZE < listY) return;

                // --- STATE CHECK ---
                const isHeld = state.heldItem && state.heldItem.item === item;
                const isSelected = (index === inventoryIndex);
                
                // Colors
                const bgAlpha = isSelected ? (isChoosingItem ? 0.2 : 0.1) : 0.05;
                const bgColor = isSelected ? "255, 215, 0" : "0, 0, 0"; 
                const borderColor = isSelected 
                    ? (isChoosingItem ? UITheme.colors.accent : UITheme.colors.textHighlight) 
                    : "#333";

                // Hitbox Registration
                if (itemY + this.SLOT_SIZE >= listY && itemY <= listY + listH) {
                    hitboxes.push({
                        id: `INV_ITEM_${index}`,
                        x: itemX,
                        y: itemY,
                        w: this.SLOT_SIZE, 
                        h: this.SLOT_SIZE,
                        type: 'inventory',
                        index: index
                    });
                }

                // --- DRAW SLOT ---
                // Background
                this.ui.drawRect(itemX, itemY, this.SLOT_SIZE, this.SLOT_SIZE, `rgba(${bgColor}, ${bgAlpha})`);
                
                // Border (Fixed drawStrokeRect)
                if (this.ui.drawStrokeRect) {
                     this.ui.drawStrokeRect(itemX, itemY, this.SLOT_SIZE, this.SLOT_SIZE, borderColor, isSelected ? 2 : 1);
                } else {
                    this.ui.ctx.strokeStyle = borderColor;
                    this.ui.ctx.lineWidth = isSelected ? 2 : 1;
                    this.ui.ctx.strokeRect(itemX, itemY, this.SLOT_SIZE, this.SLOT_SIZE);
                }

                // Draw Icon
                // Center icon in slot
                const iconOffset = (this.SLOT_SIZE - 32) / 2;
                if (!isHeld) {
                    // CHANGED: Pass definition, not item
                    this._drawIcon(def, itemX + iconOffset, itemY + iconOffset);
                } else {
                    // Ghost if held
                    this.ui.drawRect(itemX + iconOffset, itemY + iconOffset, 32, 32, "rgba(0,0,0,0.1)");
                }

                // Count
                // CHANGED: Use item.qty instead of item.count
                if (item.qty > 1 && !isHeld) {
                    this.ui.drawText(`${item.qty}`, itemX + this.SLOT_SIZE - 2, itemY + this.SLOT_SIZE - 2, "10px sans-serif", UITheme.colors.accent, "right");
                }
            });
        }

        this.totalContentHeight = currentContentHeight; 

        this.ui.endClip();
        this.ui.ctx.restore();

        // --- 5. Draw Scrollbar ---
        if (this.totalContentHeight > listH) {
            const scrollX = x + w + 2; 
            this.drawScrollBar(scrollX, listY, listH, this.totalContentHeight, renderScroll, hitboxes);
        }
    }

    drawScrollBar(x, y, viewportH, contentH, scrollOffset, hitboxes) {
        this.ui.drawRect(x, y, this.SCROLLBAR_WIDTH, viewportH, "#222"); 
        
        const viewRatio = viewportH / contentH;
        let thumbH = Math.max(20, viewportH * viewRatio);
        const maxScroll = contentH - viewportH;
        const scrollRatio = maxScroll > 0 ? (scrollOffset / maxScroll) : 0;
        const trackSpace = viewportH - thumbH;
        const thumbY = y + (scrollRatio * trackSpace);

        this.ui.drawRect(x, thumbY, this.SCROLLBAR_WIDTH, thumbH, "#666");

        if (hitboxes) {
            hitboxes.push({
                id: 'INV_SCROLLBAR_THUMB', 
                type: 'ui',
                x: x - 4, 
                y: thumbY, 
                w: this.SCROLLBAR_WIDTH + 8, 
                h: thumbH 
            });
        }
    }

    _drawIcon(def, x, y) {
        if (!def) return;
        const sheet = this.loader.get('icons') || this.loader.get('items'); 
        if (!sheet) return;

        // CHANGED: Use def.icon directly
        const iconData = def.icon || { col: 0, row: 0 };
        const ICON_SIZE = 32; 
        
        const srcX = (iconData.col * ICON_SIZE);
        const srcY = (iconData.row * ICON_SIZE);

        this.ui.drawSprite(sheet, srcX, srcY, ICON_SIZE, ICON_SIZE, x, y, 32, 32);
    }
}