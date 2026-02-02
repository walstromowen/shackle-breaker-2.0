import { UITheme } from '../../../ui/UITheme.js';

export class InventoryPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        
        this.RENDER_SIZE = 32;
        this.ROW_HEIGHT = 40; 
        
        // Layout Constants
        this.HEADER_HEIGHT = 50; 
        this.SCROLLBAR_WIDTH = 4;
        
        // No internal gutter needed because we will push the scrollbar 
        // OUTSIDE the content width 'w', matching ItemDetailPanel.
        
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
        
        // CRITICAL CHANGE: The card width is now the FULL 'w'.
        // We do not subtract space for the scrollbar.
        const cardW = w; 

        // --- 3. Scroll Calculation ---
        const scrollOffset = state.inventoryScrollOffset || 0;
        const maxScroll = Math.max(0, this.totalContentHeight - listH);

        if (state.layout) {

            state.layout.inventoryBounds = { x: x, y: y, w: w + 20, h: h };
            
            state.layout.inventoryMaxScroll = maxScroll;
            state.layout.inventoryViewportH = listH; 
        }

        let renderScroll = scrollOffset;
        if (renderScroll > maxScroll) renderScroll = maxScroll;
        if (renderScroll < 0) renderScroll = 0;

        // --- 4. Draw Scrolling Content ---
        this.ui.ctx.save();
        
        // CRITICAL CHANGE: Clip OUTSIDE 'w' to allow the scrollbar to show.
        // ItemDetailPanel uses w + 10, so we match that here.
        this.ui.startClip(x, listY, w + 15, listH); 

        let currentY = listY - renderScroll;
        const initialDrawY = currentY;

        if (!inventory || inventory.length === 0) {
            this.ui.drawText("- Empty -", centerX, currentY + 30, "italic 12px sans-serif", UITheme.colors.textMuted, "center");
            currentY += 50; 
        } 
        else {
            inventory.forEach((item, index) => {
                // Optimization: Skip off-screen
                if (currentY > listY + listH) {
                    currentY += this.ROW_HEIGHT + 2;
                    return; 
                }
                if (currentY + this.ROW_HEIGHT < listY) {
                    currentY += this.ROW_HEIGHT + 2;
                    return;
                }

                const isSelected = (index === inventoryIndex);
                const bgAlpha = isSelected ? (isChoosingItem ? 0.15 : 0.05) : 0;
                const bgColor = isSelected ? "255, 215, 0" : "255, 255, 255"; 
                
                const isVisible = (currentY + this.ROW_HEIGHT >= listY) && (currentY <= listY + listH);
                if (isVisible) {
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

                // Draw Selection Background (Full Width)
                if (isSelected) {
                    this.ui.drawRect(x, currentY, cardW, this.ROW_HEIGHT, `rgba(${bgColor}, ${bgAlpha})`);
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
                
                // Text Clipping: Slightly padded from the full edge
                this.ui.ctx.save();
                this.ui.ctx.beginPath();
                this.ui.ctx.rect(x, currentY, cardW - 20, this.ROW_HEIGHT); 
                this.ui.ctx.clip();
                this.ui.drawText(name, textX, textY, UITheme.fonts.body, nameColor, "left");
                this.ui.ctx.restore();

                // Subtext
                const def = item.definition || item;
                const subText = (def.slot || def.type || "").toUpperCase();
                this.ui.drawText(subText, textX, textY + 14, "10px monospace", UITheme.colors.textMuted, "left");

                // Count
                if (item.count > 1) {
                    this.ui.drawText(`x${item.count}`, x + cardW - 10, currentY + (this.ROW_HEIGHT/2) + 4, UITheme.fonts.bold, UITheme.colors.accent, "right");
                }

                currentY += this.ROW_HEIGHT + 2; 
            });
        }

        this.totalContentHeight = currentY - initialDrawY; 

        this.ui.endClip();
        this.ui.ctx.restore();

        // --- 5. Draw Scrollbar ---
        // Only draw if we have overflow
        if (this.totalContentHeight > listH) {
            // CRITICAL CHANGE: Match ItemDetailPanel positioning.
            // x + w + 6 means 6px of "air" between the content edge and the scrollbar.
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
                y: y, 
                w: this.SCROLLBAR_WIDTH + 8, 
                h: viewportH 
            });
        }
    }

    _drawIcon(item, x, y) {
        if (!item) return;
        const sheet = this.loader.get('items');
        if (!sheet) return;

        const iconData = item.icon || item.definition?.icon || { col: 0, row: 0 };
        const ICON_SIZE = 32; 
        
        const srcX = (iconData.col * ICON_SIZE);
        const srcY = (iconData.row * ICON_SIZE);

        this.ui.drawRect(x, y, this.RENDER_SIZE, this.RENDER_SIZE, "rgba(0,0,0,0.3)");
        this.ui.drawSprite(sheet, srcX, srcY, ICON_SIZE, ICON_SIZE, x, y, this.RENDER_SIZE, this.RENDER_SIZE);
    }
}