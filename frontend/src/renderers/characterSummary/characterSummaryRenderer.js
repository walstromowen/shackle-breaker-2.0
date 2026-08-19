import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { StatCalculator } from '../../../../shared/systems/statCalculator.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';

// Sub-Components
import { ItemDetailPanel } from './components/itemDetailPanel.js';
import { StatsPanel } from './components/statsPanel.js';
import { EquipmentPanel } from './components/equipmentPanel.js';
import { InventoryPanel } from './components/inventoryPanel.js';
import { TooltipSystem } from './components/tooltipSystem.js';
import { AbilitiesPanel } from './components/abilitiesPanel.js';

export class CharacterSummaryRenderer {
  constructor(ctx, loader) {
    this.ctx = ctx;
    this.loader = loader;
    this.ui = new CanvasUI(ctx);

    // --- Component Initialization ---
    this.itemPanel = new ItemDetailPanel(this.ui, loader);
    this.statsPanel = new StatsPanel(this.ui);
    this.abilitiesPanel = new AbilitiesPanel(this.ui, loader);
    this.equipPanel = new EquipmentPanel(this.ui, loader);
    this.invPanel   = new InventoryPanel(this.ui, loader);
    this.tooltipSystem = new TooltipSystem(this.ui, loader);

    this.hitboxes = [];
    this.padding = 36;
  }

  render(state) {
    // 1. Reset Frame State
    this.hitboxes = [];

    // --- DESTRUCTURE NAME EDITING STATE HERE ---
    const { member, derivedStats, isEditingName, nameInputValue } = state;
    const w = this.ctx.canvas.width;
    const h = this.ctx.canvas.height;

    this.ui.clearScreen(w, h);

    // 2. Layout Calculations (3-Column Grid)
    const leftW = Math.floor(w * 0.28);
    const centerW = Math.floor(w * 0.44);
    const rightW = w - leftW - centerW;

    // 3. Draw Global Backgrounds & Borders
    this.ui.drawRect(0, 0, leftW, h, UITheme.colors.bgScale[0]);
    this.ui.drawRect(leftW, 0, centerW, h, UITheme.colors.bgScale[1]);
    this.ui.drawRect(leftW + centerW, 0, rightW, h, UITheme.colors.bgScale[0]);

    // Delicate column dividers
    this.ui.drawLine(leftW, 0, leftW, h, UITheme.colors.border, 1);
    this.ui.drawLine(leftW + centerW, 0, leftW + centerW, h, UITheme.colors.border, 1);

    if (!member) return;
    const stats = derivedStats || StatCalculator.calculate(member);

    // --- 4. Render Components ---

    // A. Left Column (Tabbed: Stats / Item Detail / Skills)
    this.renderLeftColumn(state, leftW, h, member, stats);

    // B. Center Column (Equipment & Vitals)
    this.equipPanel.render(
      member, stats, state.slots, state.selectedSlotIndex, 
      state.isChoosingItem, leftW, 0, centerW, h, 
      this.hitboxes, state.heldItem, state.hoveredHitboxId, isEditingName
    );

    // --- ADD NAME EDITING OVERLAY ---
    if (isEditingName) {
      const centerX = leftW + Math.floor(centerW / 2);
      const nameY = 24 + 36;
      
      this.ctx.font = UITheme.fonts.header;
      const textWidth = this.ctx.measureText(nameInputValue).width;
      const boxW = Math.max(250, textWidth + 80); 
      
      this.ui.drawRect(centerX - boxW/2, nameY - 48, boxW, 72, "#080808", true);
      this.ui.drawRect(centerX - boxW/2, nameY - 48, boxW, 72, UITheme.colors.borderHighlight, false);

      const cursor = (Math.floor(Date.now() / 500) % 2 === 0) ? "|" : "";
      this.ui.drawText(nameInputValue + cursor, centerX, nameY, UITheme.fonts.header, UITheme.colors.textHighlight, "center");
    }

    // C. Right Column (Inventory Grid)
    const invX = leftW + centerW + this.padding;
    const invY = 0;
    const invW = rightW - (this.padding * 2);

    this.invPanel.render(
      state.filteredInventory, state.inventoryIndex, state.isChoosingItem,
      invX, invY, invW, h, state, this.hitboxes
    );

    // ==========================================
    // REORDERED RENDER CALLS 
    // ==========================================

    // D. Input Prompts
    this._drawInputPrompts(state, leftW, centerW, h);

    // E. Held Item (Floating Cursor)
    if (state.heldItem) {
      this._drawHeldItem(state);
    }

    // F. Context Menu 
    if (state.contextMenu) {
      this._drawContextMenu(state.contextMenu, state.contextMenu.selectedIndex, state.hoveredHitboxId);
    }

    // G. Tooltips (Highest Z-Index)
    if (!state.heldItem && !state.contextMenu) {
      let activeTooltipId = state.hoveredHitboxId;
      
      // 1. Fallback to keyboard focus if no mouse hover exists
      if (!activeTooltipId) {
        if (state.isChoosingItem && state.inventoryIndex !== undefined && state.inventoryIndex !== null) {
          activeTooltipId = `INV_ITEM_${state.inventoryIndex}`;
        } else if (!state.isChoosingItem && state.slots && state.selectedSlotIndex !== undefined && state.selectedSlotIndex !== null) {
          const slotName = state.slots[state.selectedSlotIndex];
          if (slotName) activeTooltipId = `SLOT_${slotName}`;
        }
      }

      if (activeTooltipId) {
        const tooltipState = { ...state, hoveredHitboxId: activeTooltipId };
        const activeHitbox = this.hitboxes.find(h => h.id === activeTooltipId);
        
        if (activeHitbox) {
          const mx = tooltipState.mouse?.x || 0;
          const my = tooltipState.mouse?.y || 0;
          const isMouseInBox = mx >= activeHitbox.x && mx <= activeHitbox.x + activeHitbox.w && 
                               my >= activeHitbox.y && my <= activeHitbox.y + activeHitbox.h;
          
          // 2. Snap tooltip anchor to the center of the item if using keyboard
          if (!isMouseInBox) {
            tooltipState.mouse = {
              x: Math.floor(activeHitbox.x + (activeHitbox.w / 2)),
              y: Math.floor(activeHitbox.y + (activeHitbox.h / 2))
            };
          }
          this.tooltipSystem.render(tooltipState, this.hitboxes);
        }
      }
    }

    // --- 5. Report Hitboxes ---
    if (state.onLayoutUpdate) {
      state.onLayoutUpdate([...this.hitboxes].reverse());
    }
  }

  renderLeftColumn(state, w, h, member, stats) {
    const { viewMode, focusedItem, hoveredHitboxId } = state;
    const x = this.padding;
    const y = this.padding;
    const contentW = w - (this.padding * 2);

    // --- Tabs ---
    const tabH = 67; 
    const tabW = contentW / 3;

    const drawTab = (label, tx, isActive, id) => {
      const isHovered = hoveredHitboxId === id;
      
      let bgColor = "rgba(0,0,0,0.5)";
      let textCol = UITheme.colors.textMuted;
      let drawBrackets = false;
      let strokeColor = UITheme.colors.border;

      if (isActive) {
        bgColor = UITheme.colors.states.focusBg;
        textCol = UITheme.colors.states.focusText;
        drawBrackets = true;
        strokeColor = null;
      } else if (isHovered) {
        bgColor = UITheme.colors.states.hoverBg;
        textCol = UITheme.colors.states.hoverText;
        strokeColor = null;
      }

      this.ui.drawPanel(tx, y, tabW, tabH, bgColor);
      if (strokeColor) {
        this.ui.drawRect(tx, y, tabW, tabH, strokeColor, false);
      }
      
      if (drawBrackets) {
        this.ui.drawSelectionBrackets(tx, y, tabW, tabH, 5, UITheme.colors.borderHighlight);
      }

      this.ui.drawText(
        label, tx + tabW / 2, y + (tabH / 2) + 10,
        UITheme.fonts.small, textCol, "center", "middle"
      );

      this.hitboxes.push({
        id, x: tx, y, w: tabW, h: tabH, type: 'tab',
        hoverSfx: 'hoverTick', clickSfx: 'cinematicBoom'
      });
    };

    drawTab("STATS", x, viewMode === 'STATS', 'TAB_STATS');
    drawTab("ITEM", x + tabW, viewMode === 'ITEM', 'TAB_ITEM');
    drawTab("SKILLS", x + (tabW * 2), viewMode === 'ABILITIES', 'TAB_ABILITIES');

    // --- Panel Content ---
    const contentY = y + tabH + 48;
    const contentH = h - contentY - 48;

    if (viewMode === 'STATS') {
      this.statsPanel.render(member, stats, x, contentY, contentW);
    } else if (viewMode === 'ITEM') {
      this.itemPanel.render(focusedItem, x, contentY, contentW, contentH, state, this.hitboxes);
    } else if (viewMode === 'ABILITIES') {
      this.abilitiesPanel.render(member, x, contentY, contentW, contentH, state, this.hitboxes);
    }
  }

  _drawHeldItem(state) {
    const { heldItem, mouse } = state;
    if (!heldItem || !heldItem.item) return;

    const item = heldItem.item;
    const def = ItemDefinitions[item.defId];
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

    const iconSheet = this.loader.get(sheetName) || this.loader.get('items') || this.loader.get('icons');
    const iconSize = 32;
    const drawSize = 77; 
    const x = mouse.x - (drawSize / 2);
    const y = mouse.y - (drawSize / 2);

    this.ctx.save();
    this.ctx.globalAlpha = 0.85;
    
    this.ui.drawRect(x, y, drawSize, drawSize, "rgba(0,0,0,0.6)", true);

    if (iconSheet && def.icon) {
      const sx = def.icon.col * iconSize;
      const sy = def.icon.row * iconSize;
      this.ctx.drawImage(iconSheet, sx, sy, iconSize, iconSize, x, y, drawSize, drawSize);
    } else {
      this.ctx.fillStyle = UITheme.colors.failure;
      this.ctx.fillRect(x + 10, y + 10, drawSize - 19, drawSize - 19);
    }

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

    // Clamp to screen boundaries
    if (x + menuW > screenW) x = screenW - menuW - 12;
    if (y + menuH > screenH) y = screenH - menuH - 12;
    if (x < 12) x = 12;
    if (y < 12) y = 12;

    const layout = { x, y, w: menuW, h: menuH };
    const menuConfig = { ...menu, selectedIndex: selectedIndex, btnHeight: btnHeight, padding: padding };

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

  _drawInputPrompts(state, leftW, centerW, h) {
    let lines = [];

    if (state.isEditingName) {
      lines.push("[Enter] Confirm      [ESC] Cancel");
    } else if (state.contextMenu) {
      lines.push("[L-Click/SPC] Select      [R-Click/ESC] Close");
    } else if (state.heldItem) {
      lines.push("[L-Click] Place      [R-Click/ESC] Cancel");
    } else if (state.isChoosingItem) {
      lines.push("[L-Click/SPC] Menu      [Hover/V] View      [R-Click/ESC] Back");
    } else {
      const slotName = (state.slots && state.slots[state.selectedSlotIndex]) || null;
      const hasSlotItem = slotName && state.member.equipment[slotName];
      const hasInvItems = state.filteredInventory && state.filteredInventory.length > 0;

      let row1 = ["[L-Click/WASD] Select", "[Q/E] Char"];
      let row2 = ["[Hover/V] View"];

      if (hasSlotItem) {
        row1.push("[L-Click/SPC] Menu");
      } else if (hasInvItems) {
        row1.push("[L-Click/SPC] Equip");
      }
      
      row2.push("[R-Click/ESC] Back");

      lines.push(row1.join("      "));
      lines.push(row2.join("      "));
    }

    const centerX = leftW + Math.floor(centerW / 2);
    const flourishW = Math.min(720, centerW - 64);
    
    this.ui.drawLineWithGothicFlourish(centerX - (flourishW / 2), h - 104, flourishW, UITheme.colors.borderHighlight);

    const startY = h - (lines.length > 1 ? 64 : 44);
    lines.forEach((lineText, index) => {
      this.ui.drawText(
        lineText, centerX, startY + (index * 32), 
        UITheme.fonts.small, UITheme.colors.textMuted, "center"
      );
    });
  }

  getHitZone(x, y) {
    for (let i = this.hitboxes.length - 1; i >= 0; i--) {
      const box = this.hitboxes[i];
      if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
        if (box.id) return box.id;
      }
    }
    return null;
  }
}

