import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';
import { TooltipSystem } from '../../renderers/characterSummary/components/tooltipSystem.js';

export class ShopRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader;
        this.ui = new CanvasUI(ctx);
        // Inherit the exact TooltipSystem used in CharacterSummary
        this.tooltipSystem = new TooltipSystem(this.ui, loader);
        this.hitboxes = [];
        this.padding = 36;
    }

    render(state) {
        this.hitboxes = [];
        if (!state) return;

        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;
        const halfW = Math.floor(w / 2);

        this.ui.clearScreen(w, h);

        // --- NEW: Register global panel hitboxes so drag-and-drop ALWAYS catches empty space drops! ---
        this.hitboxes.push({ id: 'PANEL_VENDOR', x: 0, y: 0, w: halfW, h: h, type: 'panel' });
        this.hitboxes.push({ id: 'PANEL_PARTY', x: halfW, y: 0, w: halfW, h: h, type: 'panel' });
        // ---------------------------------------------------------------------------------------------

        // 2. Draw Global Backgrounds & Borders
        this.ui.drawRect(0, 0, halfW, h, UITheme.colors.bgScale[0]);
        // ... rest of render stays exactly the same
        this.ui.drawRect(halfW, 0, halfW, h, UITheme.colors.bgScale[1]);
        
        // Center divider
        this.ui.drawLine(halfW, 0, halfW, h, UITheme.colors.border, 1);

        // 3. Render Shop Panes
        
        // A. Left Column (Vendor Wares)
        this._drawShopPanel(
            state.vendorWares || [], // FIX: safely default to empty array
            "Merchant's Wares",
            null, 
            'VENDOR',
            state,
            0, 0, halfW, h
        );

        // B. Right Column (Party Inventory & Currency)
        this._drawShopPanel(
            state.partyInventory || [], // FIX: safely default to empty array
            "Party Inventory",
            state.partyCurrency,
            'PARTY',
            state,
            halfW, 0, halfW, h
        );

        // 4. Render Overlay Components (Strict Z-Index Order)
        
        // A. Input Prompts (Background layer)
        this._drawInputPrompts(state, w, h);

        // B. Held Item (Floating Cursor)
        if (state.heldItem) {
            this._drawHeldItem(state);
        }

        // C. Context Menu (Over background, under tooltips)
        if (state.contextMenu) {
            this._drawContextMenu(
                state.contextMenu,
                state.contextMenu.selectedIndex,
                state.hoveredHitboxId
            );
        }

        // D. Tooltips (Highest Z-Index)
        if (!state.heldItem && !state.contextMenu && state.hoveredHitboxId) {
            // Trick the existing TooltipSystem by mapping the active pane to 'filteredInventory'
            if (state.hoveredHitboxId.startsWith('VENDOR_ITEM_')) {
                state.filteredInventory = state.vendorWares || []; 
            } else if (state.hoveredHitboxId.startsWith('PARTY_ITEM_')) {
                state.filteredInventory = state.partyInventory || [];
            }
            this.tooltipSystem.render(state, this.hitboxes);
        }

        // 5. Report Hitboxes to Controller
        if (state.onLayoutUpdate) {
            state.onLayoutUpdate([...this.hitboxes].reverse());
        }
    }

    _drawShopPanel(inventory, title, currency, prefix, state, x, y, w, h) {
    const centerX = Math.floor(x + (w / 2));
    const HEADER_HEIGHT = 180;
    const COLS = 4;
    const SLOT_SIZE = 96;
    const SLOT_PADDING = 19;
    const SCROLLBAR_WIDTH = 10;

    // Header
    this.ui.drawText(title, centerX, y + 48, UITheme.fonts.header, UITheme.colors.textMain, "center");
    if (currency !== null && currency !== undefined) {
        this.ui.drawText(`Currency: ${currency}c`, centerX, y + 108, UITheme.fonts.cardMono, UITheme.colors.textHighlight, "center");
    } else {
        this.ui.drawText("Prices Fixed", centerX, y + 108, UITheme.fonts.cardMono, UITheme.colors.textMuted, "center");
    }

    const dividerY = y + HEADER_HEIGHT - 24;
    const flourishW = w * 0.8;
    this.ui.drawLineWithGothicFlourish(x + (w - flourishW)/2, dividerY, flourishW, UITheme.colors.borderHighlight);

    // Viewport Metrics
    const listY = y + HEADER_HEIGHT;
    const listH = h - HEADER_HEIGHT - 120;

    // --- ALIGNED GRID CALCULATION (Matches InventoryPanel) ---
    const totalGridW = (COLS * SLOT_SIZE) + ((COLS - 1) * SLOT_PADDING);
    
    // Position startX using padding relative to the panel edge (or left-aligned relative to bounds)
    const padding = 36;
    let startX = x + padding;
    
    // Safety check: Fallback to centered if the screen panel is narrower than the grid width
    if (w < totalGridW + (padding * 2)) {
        startX = x + Math.floor((w - totalGridW) / 2);
        if (startX < x + 5) startX = x + 5;
    }

    // Scroll Calculations
    const itemCount = inventory ? inventory.length : 0;
    const rowCount = Math.ceil(itemCount / COLS);
    const currentContentHeight = rowCount * (SLOT_SIZE + SLOT_PADDING);
    const scrollOffset = prefix === 'VENDOR' ? (state.vendorScrollOffset || 0) : (state.partyScrollOffset || 0);
    const maxScroll = Math.max(0, currentContentHeight - listH);

    if (state.layout) {
        if (prefix === 'VENDOR') {
            state.layout.vendorBounds = { x, y, w, h };
            state.layout.vendorMaxScroll = maxScroll;
        } else {
            state.layout.partyBounds = { x, y, w, h };
            state.layout.partyMaxScroll = maxScroll;
        }
        state.layout.cols = COLS;
        state.layout.itemHeight = SLOT_SIZE + SLOT_PADDING;
    }

    let renderScroll = scrollOffset;
    if (renderScroll > maxScroll) renderScroll = maxScroll;
    if (renderScroll < 0) renderScroll = 0;

    // Render Grid Content
    this.ui.ctx.save();
    this.ui.startClip(x, listY - 24, w, listH + 48);

    if (!inventory || inventory.length === 0) {
        this.ui.drawText("- Empty -", centerX, listY + 72, UITheme.fonts.cardItalic, UITheme.colors.textMuted, "center");
    } else {
        inventory.forEach((item, index) => {
            if (!item) return;

            const itemId = item.defId || item.id;
            const def = ItemDefinitions[itemId];
            const col = index % COLS;
            const row = Math.floor(index / COLS);
            const itemX = startX + (col * (SLOT_SIZE + SLOT_PADDING));
            const itemY = listY + (row * (SLOT_SIZE + SLOT_PADDING)) - renderScroll;

            if (itemY > listY + listH) return;
            if (itemY + SLOT_SIZE < listY) return;

            const isHeld = state.heldItem && state.heldItem.item === item;
            const isActivePane = state.activePanel === prefix.toLowerCase();
            const isSelected = isActivePane && (index === state.vendorIndex || index === state.partyIndex);
            const isHovered = state.hoveredHitboxId === `${prefix}_ITEM_${index}`;

            let bgFill = UITheme.colors.bgScale[1];
            let drawBrackets = false;

            if (isSelected) {
                bgFill = UITheme.colors.states.focusBg;
                drawBrackets = true;
            } else if (isHovered) {
                bgFill = UITheme.colors.states.hoverBg;
            }

            this.hitboxes.push({
                id: `${prefix}_ITEM_${index}`,
                x: itemX,
                y: itemY,
                w: SLOT_SIZE,
                h: SLOT_SIZE,
                type: 'inventory',
                index: index,
                hoverSfx: 'hoverTick',
                clickSfx: 'cinematicBoom'
            });

            this.ui.drawPanel(itemX, itemY, SLOT_SIZE, SLOT_SIZE, bgFill);

            if (!def) {
                this.ui.drawText("?", itemX + (SLOT_SIZE / 2), itemY + (SLOT_SIZE / 2) + 10, UITheme.fonts.header, UITheme.colors.textMuted, "center");
                return;
            }

            if (!isHeld) {
                const iconOffset = (SLOT_SIZE - 64) / 2;
                this._drawIcon(def, itemX + iconOffset, itemY + iconOffset);

                if (item.qty > 1) {
                    this.ui.drawText(`${item.qty}`, itemX + SLOT_SIZE - 5, itemY + SLOT_SIZE - 5, UITheme.fonts.small, UITheme.colors.textHighlight, "right");
                }

                const basePrice = def.cost || def.value || 10;
                const priceStr = prefix === 'VENDOR' ? `${basePrice}` : `${Math.floor(basePrice / 2)}`;
                this.ui.drawText(priceStr, itemX + 5, itemY + SLOT_SIZE - 5, UITheme.fonts.small, UITheme.colors.textMuted, "left");

                if (drawBrackets) {
                    this.ui.drawSelectionBrackets(itemX, itemY, SLOT_SIZE, SLOT_SIZE, 5, UITheme.colors.borderHighlight);
                }
            }
        });
    }

    this.ui.endClip();
    this.ui.ctx.restore();

    // Scrollbar
    if (currentContentHeight > listH) {
        const scrollX = x + w - SCROLLBAR_WIDTH - 5;
        this._drawScrollBar(scrollX, listY, listH, currentContentHeight, renderScroll, prefix);
    }
}

    _drawScrollBar(x, y, viewportH, contentH, scrollOffset, prefix) {
        const SCROLLBAR_WIDTH = 10;
        
        this.ui.drawRect(x, y, SCROLLBAR_WIDTH, viewportH, UITheme.colors.scrollTrack || UITheme.colors.bgScale[0]);
        
        const viewRatio = viewportH / contentH;
        let thumbH = Math.max(20, viewportH * viewRatio);
        const scrollRatio = scrollOffset / (contentH - viewportH);
        const thumbY = y + (scrollRatio * (viewportH - thumbH));

        this.ui.drawRect(x, thumbY, SCROLLBAR_WIDTH, thumbH, UITheme.colors.borderHighlight);

        this.hitboxes.push({
            id: `SCROLLBAR_THUMB_${prefix}`,
            x: x - 5,
            y: thumbY,
            w: SCROLLBAR_WIDTH + 10,
            h: thumbH,
            type: 'scrollbar_thumb'
        });
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

        this.ui.drawSprite(sheet, srcX, srcY, ICON_SIZE, ICON_SIZE, x, y, 64, 64);
    }

    _drawHeldItem(state) {
        const { heldItem, mouse } = state;
        if (!heldItem || !heldItem.item) return;

        const item = heldItem.item;
        // FIX: Ensure we find the definition regardless of how the ware was authored
        const def = ItemDefinitions[item.defId || item.id]; 
        
        if (!def) return;

        const drawSize = 77;
        const x = mouse.x - (drawSize / 2);
        // ... rest stays exactly the same
        const y = mouse.y - (drawSize / 2);

        this.ctx.save();
        this.ctx.globalAlpha = 0.85;
        this.ui.drawRect(x, y, drawSize, drawSize, "rgba(0,0,0,0.6)", true);
        
        this._drawIcon(def, x + 6, y + 6); 
        
        this.ui.drawRect(x, y, drawSize, drawSize, UITheme.colors.borderHighlight, false);
        this.ctx.restore();
    }

    _drawContextMenu(menu, selectedIndex = 0, hoveredHitboxId = null) {
        if (!menu || !menu.options) return;

        const btnHeight = 77;
        const padding = 14;
        const menuW = 312;
        const menuH = (menu.options.length * btnHeight) + (padding * 2);
        const screenW = this.ctx.canvas.width;
        const screenH = this.ctx.canvas.height;

        let x = menu.x;
        let y = menu.y;

        if (x + menuW > screenW) x = screenW - menuW - 12;
        if (y + menuH > screenH) y = screenH - menuH - 12;
        if (x < 12) x = 12;
        if (y < 12) y = 12;

        const layout = { x, y, w: menuW, h: menuH };
        const menuConfig = {
            ...menu,
            selectedIndex: selectedIndex,
            btnHeight: btnHeight,
            padding: padding
        };

        let menuHoverId = null;
        if (hoveredHitboxId && hoveredHitboxId.startsWith('CTX_OPT_')) {
            menuHoverId = hoveredHitboxId.replace('CTX_OPT_', 'MENU_OPT_');
        } else if (hoveredHitboxId === 'MENU_BG') {
            menuHoverId = 'MENU_BG';
        }

        const menuHitboxes = [];
        this.ui.drawContextMenu(menuConfig, layout, menuHitboxes, menuHoverId, this.loader);

        menuHitboxes.forEach(box => {
            if (box.id && box.id.startsWith('MENU_OPT_')) {
                box.id = box.id.replace('MENU_OPT_', 'CTX_OPT_');
            }
        });
        
        this.hitboxes.push(...menuHitboxes.reverse());
    }

    _drawInputPrompts(state, w, h) {
        let lines = [];
        if (state.contextMenu) {
            lines.push("[L-Click/SPC] Select      [R-Click/ESC] Close");
        } else if (state.heldItem) {
            lines.push("[L-Click] Place      [R-Click/ESC] Cancel");
        } else {
            lines.push("[L-Click/WASD] Select      [SPC] Action      [TAB] Switch Pane      [R-Click/ESC] Exit Shop");
        }

        const centerX = Math.floor(w / 2);
        const flourishW = Math.min(720, w - 64);
        
        this.ui.drawLineWithGothicFlourish(centerX - (flourishW / 2), h - 104, flourishW, UITheme.colors.borderHighlight);

        const startY = h - 64;
        lines.forEach((lineText, index) => {
            this.ui.drawText(
                lineText,
                centerX,
                startY + (index * 32),
                UITheme.fonts.small,
                UITheme.colors.textMuted,
                "center"
            );
        });
    }
}