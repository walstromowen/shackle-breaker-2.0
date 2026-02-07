import { UITheme } from '../../../ui/UITheme.js';

export class InventoryPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        
        this.RENDER_SIZE = 32;
        this.ROW_HEIGHT = 40; 
        this.ROW_PADDING = 2; // Extracted this to a constant for math consistency
        
        // Layout Constants
        this.HEADER_HEIGHT = 50; 
        this.SCROLLBAR_WIDTH = 4;
        
        // Scroll State
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
        const cardW = w; 

        // --- 3. Scroll Calculation (FIXED) ---
        // CRITICAL FIX: Calculate height NOW, based on the current list, 
        // not the stale value from the previous frame.
        const itemCount = inventory ? inventory.length : 0;
        const currentContentHeight = itemCount * (this.ROW_HEIGHT + this.ROW_PADDING);
        
        const scrollOffset = state.inventoryScrollOffset || 0;
        const maxScroll = Math.max(0, currentContentHeight - listH);

        // Update layout state immediately for the Controller to see next frame
        if (state.layout) {
            state.layout.inventoryBounds = { x: x, y: y, w: w + 20, h: h };
            state.layout.inventoryMaxScroll = maxScroll;
            state.layout.inventoryViewportH = listH; 
            state.layout.itemHeight = this.ROW_HEIGHT + this.ROW_PADDING; // Allow controller to know total item height
        }

        // Clamp using the FRESH maxScroll value
        let renderScroll = scrollOffset;
        if (renderScroll > maxScroll) renderScroll = maxScroll;
        if (renderScroll < 0) renderScroll = 0;

        // --- 4. Draw Scrolling Content ---
        this.ui.ctx.save();
        this.ui.startClip(x, listY, w + 15, listH); 

        let currentY = listY - renderScroll;
        // const initialDrawY = currentY; // No longer needed for height calc

        if (!inventory || inventory.length === 0) {
            this.ui.drawText("- Empty -", centerX, currentY + 30, "italic 12px sans-serif", UITheme.colors.textMuted, "center");
        } 
        else {
            inventory.forEach((item, index) => {
                // Optimization: Skip off-screen
                if (currentY > listY + listH) {
                    currentY += this.ROW_HEIGHT + this.ROW_PADDING;
                    return; 
                }
                if (currentY + this.ROW_HEIGHT < listY) {
                    currentY += this.ROW_HEIGHT + this.ROW_PADDING;
                    return;
                }

                // --- GHOSTING CHECK ---
                const isHeld = state.heldItem && state.heldItem.item === item;

                const isSelected = (index === inventoryIndex);
                const bgAlpha = isSelected ? (isChoosingItem ? 0.15 : 0.05) : 0;
                const bgColor = isSelected ? "255, 215, 0" : "255, 255, 255"; 
                
                // Hitbox Registration
                // Only register if actually visible in viewport
                if (currentY + this.ROW_HEIGHT >= listY && currentY <= listY + listH) {
                    hitboxes.push({
                        id: `INV_ITEM_${index}`,
                        x: x,
                        y: currentY,
                        w: cardW, 
                        h: this.ROW_HEIGHT,
                        type: 'inventory',
                        index: index
                    });
                }

                // Draw Selection Background
                if (isSelected) {
                    this.ui.drawRect(x, currentY, cardW, this.ROW_HEIGHT, `rgba(${bgColor}, ${bgAlpha})`);
                    this.ui.drawRect(x, currentY, 4, this.ROW_HEIGHT, isChoosingItem ? UITheme.colors.accent : UITheme.colors.textHighlight);
                }

                // Draw Icon
                const iconX = x + 15;
                const iconY = currentY + 4;
                
                if (!isHeld) {
                    this._drawIcon(item, iconX, iconY);
                } else {
                    this.ui.drawRect(iconX, iconY, this.RENDER_SIZE, this.RENDER_SIZE, "rgba(0,0,0,0.1)");
                }

                // Draw Text
                const textX = iconX + this.RENDER_SIZE + 12;
                const textY = currentY + 14;
                
                const name = item.name || item.definition?.name || "Unknown Item";
                let nameColor = isHeld ? "#444" : (isSelected ? "#fff" : UITheme.colors.textMain);

                this.ui.ctx.save();
                this.ui.ctx.beginPath();
                this.ui.ctx.rect(x, currentY, cardW - 20, this.ROW_HEIGHT); 
                this.ui.ctx.clip();
                this.ui.drawText(name, textX, textY, UITheme.fonts.body, nameColor, "left");
                this.ui.ctx.restore();

                // Subtext
                const def = item.definition || item;
                const subText = (def.slot || def.type || "").toUpperCase();
                const subTextColor = isHeld ? "rgba(0,0,0,0)" : UITheme.colors.textMuted;
                
                this.ui.drawText(subText, textX, textY + 14, "10px monospace", subTextColor, "left");

                // Count
                if (item.count > 1 && !isHeld) {
                    this.ui.drawText(`x${item.count}`, x + cardW - 10, currentY + (this.ROW_HEIGHT/2) + 4, UITheme.fonts.bold, UITheme.colors.accent, "right");
                }

                currentY += this.ROW_HEIGHT + this.ROW_PADDING; 
            });
        }

        // Store this for the scrollbar to use immediately below
        this.totalContentHeight = currentContentHeight; 

        this.ui.endClip();
        this.ui.ctx.restore();

        // --- 5. Draw Scrollbar ---
        if (this.totalContentHeight > listH) {
            const scrollX = x + w + 6; 
            this.drawScrollBar(scrollX, listY, listH, this.totalContentHeight, renderScroll, hitboxes);
        }
    }

    drawScrollBar(x, y, viewportH, contentH, scrollOffset, hitboxes) {
        // Track
        this.ui.drawRect(x, y, this.SCROLLBAR_WIDTH, viewportH, "#222"); 
        
        const viewRatio = viewportH / contentH;
        let thumbH = Math.max(20, viewportH * viewRatio);
        const maxScroll = contentH - viewportH;
        const scrollRatio = maxScroll > 0 ? (scrollOffset / maxScroll) : 0;
        const trackSpace = viewportH - thumbH;
        const thumbY = y + (scrollRatio * trackSpace);

        // Thumb
        this.ui.drawRect(x, thumbY, this.SCROLLBAR_WIDTH, thumbH, "#666");

        if (hitboxes) {
            hitboxes.push({
                id: 'INV_SCROLLBAR_THUMB', 
                type: 'ui',
                x: x - 4, 
                // BUG FIX: The hitbox Y and H should match the THUMB, not the whole track.
                // If you want the whole track to be clickable, use a separate 'INV_SCROLLBAR_TRACK' ID.
                y: thumbY, 
                w: this.SCROLLBAR_WIDTH + 8, 
                h: thumbH 
            });
        }
    }

    _drawIcon(item, x, y) {
        if (!item) return;
        const sheet = this.loader.get('icons') || this.loader.get('items'); 
        if (!sheet) return;

        const iconData = item.icon || item.definition?.icon || { col: 0, row: 0 };
        const ICON_SIZE = 32; 
        
        const srcX = (iconData.col * ICON_SIZE);
        const srcY = (iconData.row * ICON_SIZE);

        this.ui.drawRect(x, y, this.RENDER_SIZE, this.RENDER_SIZE, "rgba(0,0,0,0.3)");
        this.ui.drawSprite(sheet, srcX, srcY, ICON_SIZE, ICON_SIZE, x, y, this.RENDER_SIZE, this.RENDER_SIZE);
    }
}