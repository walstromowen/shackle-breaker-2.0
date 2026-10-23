import { UITheme } from '../../../ui/UITheme.js';
import { ItemDefinitions } from '../../../../../shared/items/itemDefinitions.js';
import { gameState } from '../../../../../shared/core/gameState.js';

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
    this.SCROLLBAR_WIDTH = UITheme.scrollbar.width;

    // Hotbar block under the grid (two rows of five; the slot order is the key order 1 2 3 4 5 / 6 7 8 9 0)
    this.HOTBAR_COLS = 5;
    this.HOTBAR_GAP = 10;
    this.HOTBAR_MAX_SLOT = 80;
    this.HOTBAR_TOP = 56;       // room for the title above the slots
    this.HOTBAR_BOTTOM = 24;
    this.HOTBAR_KEY_FONT = '500 21px "Barlow", system-ui, sans-serif';   // the key number and the stack count inside a slot

    this.totalContentHeight = 0;
  }

  _hotbarMetrics(w, count) {
    const cols = this.HOTBAR_COLS;
    const gap = this.HOTBAR_GAP;
    const slot = Math.min(this.HOTBAR_MAX_SLOT, Math.floor((w - (cols - 1) * gap) / cols));
    const rows = Math.ceil(count / cols);
    const height = this.HOTBAR_TOP + rows * slot + (rows - 1) * gap + this.HOTBAR_BOTTOM;
    return { cols, gap, slot, rows, height };
  }

  render(inventory, inventoryIndex, isChoosingItem, x, y, w, h, state, hitboxes) {
    const centerX = Math.floor(x + (w / 2));

    // --- 1. Draw Fixed Header ---
    this.ui.drawStyled('title', 'Inventory', centerX, y + 68);

    // --- Currency Label ---
    const currencyAmount = gameState.party.currency || 0;
    this.ui.drawStyled('subtitle', `Currency: ${currencyAmount}`, centerX, y + 122);

    const dividerY = y + this.HEADER_HEIGHT - 24;
    const flourishW = w * 0.8;
    this.ui.drawLineWithGothicFlourish(x + (w - flourishW) / 2, dividerY, flourishW, UITheme.colors.borderHighlight);

    // --- 2. Calculate Viewport Metrics ---
    const listY = y + this.HEADER_HEIGHT;
    const hotbar = state.hotbar || null;   // null in a battle / read-only: no hotbar block, the grid keeps the whole column
    const bar = hotbar && hotbar.length ? this._hotbarMetrics(w, hotbar.length) : null;
    const listH = h - this.HEADER_HEIGHT - (bar ? bar.height : 0);

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
      this.ui.drawStyled('empty', 'Empty', centerX, listY + 72);
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

        // highlighted = the focused slot (mouse hover or keyboard cursor). While a menu is open the menu owns the focus and
        // the slot it was opened on stays "selected".
        const id = `INV_ITEM_${index}`;
        const menuOpen = !!state.contextMenu;
        const isCursor = state.hoveredHitboxId === id;
        const flags = this.ui.flags(id, menuOpen ? null : state.hoveredHitboxId, { selected: menuOpen && isCursor });

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
        this.ui.drawPanel(itemX, itemY, this.SLOT_SIZE, this.SLOT_SIZE, UITheme.colors.bgScale[1]);
        this.ui.drawStateBox(itemX, itemY, this.SLOT_SIZE, this.SLOT_SIZE, flags);

        if (!isHeld) {
          const iconOffset = (this.SLOT_SIZE - 64) / 2;
          this._drawIcon(def, itemX + iconOffset, itemY + iconOffset);

          // Count
          if (item.qty > 1) {
            this.ui.drawText(`${item.qty}`, itemX + this.SLOT_SIZE - 5, itemY + this.SLOT_SIZE - 5, UITheme.fonts.small, UITheme.colors.textHighlight, "right");
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
      this.drawScrollBar(scrollX, listY, listH, this.totalContentHeight, renderScroll, hitboxes, state.hoveredHitboxId);
    }

    // --- 6. Hotbar (drag a consumable here; drag a slot to move it or off the bar to clear it) ---
    if (bar) {
      this._drawHotbar(hotbar, bar, state, x, listY + listH, w, hitboxes);
    }
  }

  _drawHotbar(slots, bar, state, x, y, w, hitboxes) {
    const centerX = Math.floor(x + (w / 2));

    // cover the few pixels of the grid that bleed below its clip
    this.ui.drawRect(x - 12, y, w + 48, bar.height + 60, UITheme.colors.bgScale[0]);

    this.ui.drawLineWithGothicFlourish(x + (w - w * 0.8) / 2, y + 6, w * 0.8, UITheme.colors.borderHighlight);
    this.ui.drawStyled('heading', 'Hotbar', centerX, y + 40, { align: 'center' });

    const gridW = bar.cols * bar.slot + (bar.cols - 1) * bar.gap;
    const startX = x + Math.floor((w - gridW) / 2);
    const startY = y + this.HOTBAR_TOP;
    const held = state.heldItem;
    const dragging = !!held;

    slots.forEach((entry, i) => {
      const col = i % bar.cols;
      const row = Math.floor(i / bar.cols);
      const sx = startX + col * (bar.slot + bar.gap);
      const sy = startY + row * (bar.slot + bar.gap);

      const id = `HOTBAR_${i}`;
      const flags = this.ui.flags(id, state.hoveredHitboxId);
      const isOrigin = !!(held && held.source === 'hotbar' && held.originSlot === i);
      const canDrop = dragging && state.heldHotbarOk;

      hitboxes.push({
        id, x: sx, y: sy, w: bar.slot, h: bar.slot,
        type: 'hotbar', index: i, defId: entry.defId
      });

      this.ui.drawPanel(sx, sy, bar.slot, bar.slot, UITheme.colors.bgScale[1]);

      // While something is carried every slot that would take it is marked; the one under the mouse that would NOT take it shows red
      if (canDrop) this.ui.drawDropTarget(sx, sy, bar.slot, bar.slot, true);
      else if (dragging && flags.highlighted) this.ui.drawDropTarget(sx, sy, bar.slot, bar.slot, false);

      // The slots sit close together, so the brackets are drawn inside
      this.ui.drawStateBox(sx, sy, bar.slot, bar.slot, flags, { inset: true });

      // key label, top left: small enough (and set in from the cut corner) that it sits wholly inside the box
      this.ui.drawText(entry.key, sx + 14, sy + 26, this.HOTBAR_KEY_FONT, UITheme.colors.textMuted, "left");

      if (entry.defId && !isOrigin) {
        const def = ItemDefinitions[entry.defId];
        const out = entry.qty <= 0;
        const offset = Math.floor((bar.slot - 64) / 2);
        if (def) {
          this.ui.ctx.save();
          this.ui.ctx.globalAlpha = out ? 0.3 : 1;
          this.ui.drawItemIcon(this.loader, def, sx + offset, sy + offset, 64, 64);
          this.ui.ctx.restore();
        }
        this.ui.drawText(
          `${entry.qty}`, sx + bar.slot - 12, sy + bar.slot - 11, this.HOTBAR_KEY_FONT,
          out ? UITheme.colors.failure : UITheme.colors.textHighlight, "right"
        );
      }
    });
  }

  drawScrollBar(x, y, viewportH, contentH, scrollOffset, hitboxes, focusId = null) {
    const thumb = this.ui.drawScrollbar(x, y, this.SCROLLBAR_WIDTH, viewportH, scrollOffset, contentH - viewportH, viewportH,
      this.ui.flags('INV_SCROLLBAR_THUMB', focusId));

    if (hitboxes && thumb) {
      hitboxes.push({
        id: 'INV_SCROLLBAR_THUMB',
        type: 'ui',
        x: x - 10,
        y: thumb.y,
        w: this.SCROLLBAR_WIDTH + 19,
        h: thumb.h
      });
    }
  }

  _drawIcon(def, x, y) {
    if (!def) return;

    // Picks the right sprite sheet for the item's category - see CanvasUI.drawItemIcon
    const ICON_SIZE = 64; // Sprite sheet cell size (upgraded from 32)
    this.ui.drawItemIcon(this.loader, def, x, y, 64, ICON_SIZE);
  }
}