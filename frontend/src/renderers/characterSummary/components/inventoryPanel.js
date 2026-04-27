import { UITheme } from '../../../ui/UITheme.js';
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';
import { gameState } from '../../../../../shared/state/gameState.js';

export class InventoryPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        
        // --- Grid Constants ---
        this.COLS = 4;
        this.SLOT_SIZE = 96;
        this.SLOT_PADDING = 19;
        
        // Layout Constants
        this.HEADER_HEIGHT = 180;
        this.SCROLLBAR_WIDTH = 10;
        this.totalContentHeight = 0;
    }

    render(inventory, inventoryIndex, isChoosingItem, x, y, w, h, state, hitboxes) {
        const centerX = Math.floor(x + (w / 2));
        
        // --- 1. Draw Fixed Header ---
        this.ui.drawText("Inventory", centerX, y + 48, UITheme.fonts.header, UITheme.colors.textMain, "center");
        
        // --- Currency Label ---
        const currencyAmount = gameState.party.currency || 0;
        this.ui.drawText(`Currency: ${currencyAmount}`, centerX, y + 108, UITheme.fonts.cardMono, UITheme.colors.textHighlight, "center");
        
        const dividerY = y + this.HEADER_HEIGHT - 24;
        const flourishW = w * 0.8;
        this.ui.drawLineWithGothicFlourish(x + (w - flourishW)/2, dividerY, flourishW, UITheme.colors.borderHighlight);
        
        // --- 2. Calculate Viewport Metrics ---
        const listY = y + this.HEADER_HEIGHT;
        const listH = h - this.HEADER_HEIGHT;
        
        // --- CENTER THE GRID ---
        const totalGridW = (this.COLS * this.SLOT_SIZE) + ((this.COLS - 1) * this.SLOT_PADDING);
        let startX = x + Math.floor((w - totalGridW) / 2);
        if (startX < x + 5) startX = x + 5;
        
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
        this.ui.startClip(x, listY - 24, w + 36, listH + 48);
        
        if (!inventory || inventory.length === 0) {
            this.ui.drawText("- Empty -", centerX, listY + 72, UITheme.fonts.cardItalic, UITheme.colors.textMuted, "center");
        } else {
            inventory.forEach((item, index) => {
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
                const isHovered = state.hoveredHitboxId === `INV_ITEM_${index}`;
                
                let bgFill = UITheme.colors.bgScale[1];
                let drawBrackets = false;
                
                // Apply states mapping
                if (isSelected) {
                    bgFill = UITheme.colors.states.focusBg;
                    drawBrackets = true;
                } else if (isHovered) {
                    bgFill = UITheme.colors.states.hoverBg;
                }
                
                // Hitbox Registration
                if (itemY + this.SLOT_SIZE >= listY && itemY <= listY + listH) {
                    hitboxes.push({ 
                        id: `INV_ITEM_${index}`, 
                        x: itemX, 
                        y: itemY, 
                        w: this.SLOT_SIZE, 
                        h: this.SLOT_SIZE, 
                        type: 'inventory', 
                        index: index,
                        hoverSfx: 'hoverTick',
                        clickSfx: 'cinematicBoom'
                    });
                }
                
                // --- DRAW SLOT ---
                this.ui.drawPanel(itemX, itemY, this.SLOT_SIZE, this.SLOT_SIZE, bgFill);
                
                if (!isHeld) {
                    // Calculate perfectly centered offset for the new 64px icon size
                    const iconOffset = (this.SLOT_SIZE - 64) / 2;
                    this._drawIcon(def, itemX + iconOffset, itemY + iconOffset);
                    
                    // Count
                    if (item.qty > 1) {
                        this.ui.drawText(`${item.qty}`, itemX + this.SLOT_SIZE - 5, itemY + this.SLOT_SIZE - 5, UITheme.fonts.small, UITheme.colors.textHighlight, "right");
                    }
                    
                    // DRAW SELECTION BRACKETS
                    if (drawBrackets) {
                        this.ui.drawSelectionBrackets(itemX, itemY, this.SLOT_SIZE, this.SLOT_SIZE, 5, UITheme.colors.borderHighlight);
                    }
                }
            });
        }
        
        this.totalContentHeight = currentContentHeight;
        this.ui.endClip();
        this.ui.ctx.restore();
        
        // --- 5. Draw Scrollbar ---
        if (this.totalContentHeight > listH) {
            const scrollX = x + w + 5;
            this.drawScrollBar(scrollX, listY, listH, this.totalContentHeight, renderScroll, hitboxes);
        }
    }

    drawScrollBar(x, y, viewportH, contentH, scrollOffset, hitboxes) {
        this.ui.drawRect(x, y, this.SCROLLBAR_WIDTH, viewportH, UITheme.colors.scrollTrack || UITheme.colors.bgScale[0]);
        
        const viewRatio = viewportH / contentH;
        let thumbH = Math.max(48, viewportH * viewRatio);
        
        const maxScroll = contentH - viewportH;
        const scrollRatio = maxScroll > 0 ? (scrollOffset / maxScroll) : 0;
        const trackSpace = viewportH - thumbH;
        const thumbY = y + (scrollRatio * trackSpace);
        
        this.ui.drawRect(x, thumbY, this.SCROLLBAR_WIDTH, thumbH, UITheme.colors.scrollThumb || UITheme.colors.borderHighlight);
        
        if (hitboxes) {
            hitboxes.push({ 
                id: 'INV_SCROLLBAR_THUMB', 
                type: 'ui', 
                x: x - 10, 
                y: thumbY, 
                w: this.SCROLLBAR_WIDTH + 19, 
                h: thumbH,
                hoverSfx: 'hoverTick'
            });
        }
    }

    _drawIcon(def, x, y) {
        if (!def) return;
        
        let sheetName = 'items';
        const type = (def.type || '').toLowerCase();
        const slot = (def.slot || '').toLowerCase();
        
        if (slot === 'mainhand' || slot === 'offhand' || type === 'weapon' || type === 'shield' || type === 'tool') {
            sheetName = 'weapons';
        } else if (type === 'armor' || ['head', 'body', 'legs', 'feet', 'hands', 'accessory'].includes(slot)) {
            sheetName = 'armor';
        } else if (type === 'consumable') {
            sheetName = 'consumables';
        } else if (type === 'material') {
            sheetName = 'materials';
        }
        
        const sheet = this.loader.get(sheetName) || this.loader.get('items') || this.loader.get('icons');
        if (!sheet) return;
        
        const iconData = def.icon || { col: 0, row: 0 };
        const ICON_SIZE = 32;
        const srcX = (iconData.col * ICON_SIZE);
        const srcY = (iconData.row * ICON_SIZE);
        
        // Render perfectly snapped at 64x64 (2x of 32x32)
        this.ui.drawSprite(sheet, srcX, srcY, ICON_SIZE, ICON_SIZE, x, y, 64, 64);
    }
}