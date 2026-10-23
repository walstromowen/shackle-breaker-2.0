import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { ItemDefinitions } from '../../../../shared/items/itemDefinitions.js';
import { TooltipSystem } from '../../ui/tooltipSystem.js';

export class ShopRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader;
        this.ui = new CanvasUI(ctx);
        this.tooltipSystem = new TooltipSystem(this.ui, loader);
        this.hitboxes = [];
        this.padding = 36;

        // Source cell size (px) of the item icon sheets
        this.ICON_SRC_SIZE = 64;
    }

    render(state) {
        this.hitboxes = [];
        if (!state) return;

        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;
        const halfW = Math.floor(w / 2);

        this.ui.clearScreen(w, h);

        this.hitboxes.push({ id: 'PANEL_VENDOR', x: 0, y: 0, w: halfW, h: h, type: 'panel' });
        this.hitboxes.push({ id: 'PANEL_PARTY', x: halfW, y: 0, w: halfW, h: h, type: 'panel' });

        this.ui.drawRect(0, 0, halfW, h, UITheme.colors.bgScale[0]);
        this.ui.drawRect(halfW, 0, halfW, h, UITheme.colors.bgScale[1]);
        this.ui.drawLine(halfW, 0, halfW, h, UITheme.colors.border, 1);

        this._drawShopPanel(
            state.vendorWares || [],
            "Merchant's Wares",
            null,
            'VENDOR',
            state,
            0, 0, halfW, h
        );

        this._drawShopPanel(
            state.partyInventory || [],
            "Party Inventory",
            state.partyCurrency,
            'PARTY',
            state,
            halfW, 0, halfW, h
        );

        this._drawInputPrompts(state, w, h);

        if (state.heldItem) {
            this._drawHeldItem(state);
        }

        if (state.contextMenu) {
            this._drawContextMenu(
                state.contextMenu,
                state.contextMenu.selectedIndex,
                state.hoveredHitboxId
            );
        }

        // Report the hitboxes first: the tooltip below can return early (hovering the empty part of a panel, a scrollbar ...),
        // and the controller must still get this frame's layout.
        if (state.onLayoutUpdate) {
            state.onLayoutUpdate([...this.hitboxes].reverse());
        }

        if (!state.heldItem && !state.contextMenu && state.hoveredHitboxId) {
            const tooltipState = { ...state };

            if (state.hoveredHitboxId.startsWith('VENDOR_ITEM_')) {
                tooltipState.filteredInventory = state.vendorWares || [];
            } else if (state.hoveredHitboxId.startsWith('PARTY_ITEM_')) {
                tooltipState.filteredInventory = state.partyInventory || [];
            } else {
                return;
            }

            if (!tooltipState.member) {
                tooltipState.member = { equipment: {}, stats: {} };
            }

            const activeHitbox = this.hitboxes.find(h => h.id === state.hoveredHitboxId);

            if (activeHitbox) {
                const mx = tooltipState.mouse?.x || 0;
                const my = tooltipState.mouse?.y || 0;
                const isMouseInBox = mx >= activeHitbox.x && mx <= activeHitbox.x + activeHitbox.w &&
                                     my >= activeHitbox.y && my <= activeHitbox.y + activeHitbox.h;

                if (!isMouseInBox) {
                    tooltipState.mouse = {
                        x: Math.floor(activeHitbox.x + (activeHitbox.w / 2)),
                        y: Math.floor(activeHitbox.y + (activeHitbox.h / 2))
                    };
                }
            } else {
                return;
            }

            this.tooltipSystem.render(tooltipState, this.hitboxes);
        }
    }

    _drawShopPanel(inventory, title, currency, prefix, state, x, y, w, h) {
        const centerX = Math.floor(x + (w / 2));
        const HEADER_HEIGHT = 180;
        const COLS = 4;
        const SLOT_SIZE = 96;
        const SLOT_PADDING = 19;

        this.ui.drawStyled('title', title, centerX, y + 68);

        if (currency !== null && currency !== undefined) {
            this.ui.drawStyled('subtitle', `Currency: ${currency}`, centerX, y + 122);
        } else {
            this.ui.drawStyled('subtitle', 'Prices Fixed', centerX, y + 122, { color: UITheme.colors.textMuted });
        }

        const dividerY = y + HEADER_HEIGHT - 24;
        const flourishW = w * 0.8;
        this.ui.drawLineWithGothicFlourish(x + (w - flourishW) / 2, dividerY, flourishW, UITheme.colors.borderHighlight);

        const listY = y + HEADER_HEIGHT;
        const listH = h - HEADER_HEIGHT - 120;

        const totalGridW = (COLS * SLOT_SIZE) + ((COLS - 1) * SLOT_PADDING);
        const padding = 36;
        let startX = x + padding;

        if (w < totalGridW + (padding * 2)) {
            startX = x + Math.floor((w - totalGridW) / 2);
            if (startX < x + 5) startX = x + 5;
        }

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

        this.ui.ctx.save();
        this.ui.startClip(x, listY - 24, w, listH + 48);

        if (!inventory || inventory.length === 0) {
            this.ui.drawStyled('empty', 'Empty', centerX, listY + 72);
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
                const isCursorSlot = isActivePane && (index === state.vendorIndex || index === state.partyIndex);

                // highlighted = the focused slot (mouse hover or keyboard cursor). While a menu is open or an item is being
                // carried the focus belongs to the menu / the drop target, so no slot is highlighted; the slot the menu was
                // opened on stays "selected".
                const slotFocus = (state.contextMenu || state.heldItem) ? null : state.hoveredHitboxId;
                const flags = this.ui.flags(`${prefix}_ITEM_${index}`, slotFocus, {
                    selected: !!state.contextMenu && isCursorSlot
                });

                this.hitboxes.push({
                    id: `${prefix}_ITEM_${index}`,
                    x: itemX,
                    y: itemY,
                    w: SLOT_SIZE,
                    h: SLOT_SIZE,
                    type: 'inventory',
                    index: index


                });

                this.ui.drawPanel(itemX, itemY, SLOT_SIZE, SLOT_SIZE, UITheme.colors.bgScale[1]);
                this.ui.drawStateBox(itemX, itemY, SLOT_SIZE, SLOT_SIZE, flags);

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
                    this.ui.drawStyled('label', priceStr, itemX + 5, itemY + SLOT_SIZE - 5);
                }
            });
        }

        this.ui.endClip();
        this.ui.ctx.restore();

        // A carried item is bought / sold by dropping it on the OTHER side: mark that whole side as the landing spot
        if (state.heldItem && state.dropTarget && state.heldItem.source !== prefix.toLowerCase()
            && String(state.dropTarget).includes(prefix)) {
            this.ui.drawDropTarget(x + 8, listY - 12, w - 16, listH + 24, true);
        }

        if (currentContentHeight > listH) {
            const scrollX = x + w - UITheme.scrollbar.width - 5;
            this._drawScrollBar(scrollX, listY, listH, currentContentHeight, renderScroll, prefix, state.hoveredHitboxId);
        }
    }

    _drawScrollBar(x, y, viewportH, contentH, scrollOffset, prefix, focusId = null) {
        const width = UITheme.scrollbar.width;
        const id = `SCROLLBAR_THUMB_${prefix}`;

        const thumb = this.ui.drawScrollbar(x, y, width, viewportH, scrollOffset, contentH - viewportH, viewportH,
            this.ui.flags(id, focusId));
        if (!thumb) return;

        this.hitboxes.push({
            id,
            x: x - 5,
            y: thumb.y,
            w: width + 10,
            h: thumb.h,
            type: 'scrollbar_thumb'
        });
    }

    _drawIcon(def, x, y) {
        if (!def) return;

        // Picks the right sprite sheet for the item's category (weapons, armor, consumables,
        // materials ...) - see CanvasUI.drawItemIcon. 64x64 source drawn at 64x64 (exact 1x).
        this.ui.drawItemIcon(this.loader, def, x, y, 64, this.ICON_SRC_SIZE);
    }

    _drawHeldItem(state) {
        const { heldItem, mouse } = state;
        if (!heldItem || !heldItem.item) return;

        const item = heldItem.item;
        const def = ItemDefinitions[item.defId || item.id];
        if (!def) return;

        const drawSize = 77;
        const x = mouse.x - (drawSize / 2);
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
            // Note: Changed "Action" to "Options"
            lines.push("[L-Click/WASD] Select      [SPC] Options      [R-Click/ESC] Exit Shop");
        }

        const centerX = Math.floor(w / 2);
        const flourishW = Math.min(720, w - 64);
        this.ui.drawLineWithGothicFlourish(centerX - (flourishW / 2), h - 104, flourishW, UITheme.colors.borderHighlight);

        const startY = h - 64;

        lines.forEach((lineText, index) => {
            this.ui.drawStyled('hint', lineText, centerX, startY + (index * 32));
        });
    }
}
