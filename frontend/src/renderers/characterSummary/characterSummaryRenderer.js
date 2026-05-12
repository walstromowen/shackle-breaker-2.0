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
        this.tooltipSystem = new TooltipSystem(this.ui);

        this.hitboxes = [];
        this.padding = 36; // Scaled 15 * 2.4
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
            member, stats, state.slots, state.selectedSlotIndex, state.isChoosingItem,
            leftW, 0, centerW, h, this.hitboxes, state.heldItem, state.hoveredHitboxId,
            isEditingName // <--- Pass the flag down
        );

        // --- ADD NAME EDITING OVERLAY ---
        if (isEditingName) {
            const centerX = leftW + Math.floor(centerW / 2);
            const nameY = 24 + 36; 

            this.ctx.font = UITheme.fonts.header;
            const textWidth = this.ctx.measureText(nameInputValue).width;
            const boxW = Math.max(250, textWidth + 80); 
            
            // INCREASED PADDING: Shifted up to -48, Height increased to 72
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

        // D. Held Item (Floating Cursor)
        if (state.heldItem) {
            this._drawHeldItem(state);
        }

        // E. Context Menu
        if (state.contextMenu) {
            this._drawContextMenu(state.contextMenu, state.contextMenu.selectedIndex, state.hoveredHitboxId);
        }

        // F. Tooltips
        if (!state.heldItem && !state.contextMenu) {
            this.tooltipSystem.render(state, this.hitboxes);
        }

        // G. Input Prompts
        this._drawInputPrompts(state, leftW, centerW, h);

        // --- 5. Report Hitboxes ---
        if (state.onLayoutUpdate) {
            // Pass a reversed copy so top-layer UI (like context menus) are checked first
            state.onLayoutUpdate([...this.hitboxes].reverse());
        }
    }

    renderLeftColumn(state, w, h, member, stats) {
        const { viewMode, focusedItem, hoveredHitboxId } = state;
        const x = this.padding;
        const y = this.padding;
        const contentW = w - (this.padding * 2);

        // --- Tabs ---
        const tabH = 67; // Scaled 28 * 2.4
        const tabW = contentW / 3;

        const drawTab = (label, tx, isActive, id) => {
            const isHovered = hoveredHitboxId === id;
            
            // Default styling
            let bgColor = "rgba(0,0,0,0.5)";
            let textCol = UITheme.colors.textMuted;
            let drawBrackets = false;
            let strokeColor = UITheme.colors.border;

            // Resolve states mapping to PartyRenderer logic
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

            // Render backgrounds
            this.ui.drawPanel(tx, y, tabW, tabH, bgColor);
            if (strokeColor) {
                this.ui.drawRect(tx, y, tabW, tabH, strokeColor, false);
            }
            if (drawBrackets) {
                this.ui.drawSelectionBrackets(tx, y, tabW, tabH, 5, UITheme.colors.borderHighlight);
            }

            this.ui.drawText(
                label,
                tx + tabW / 2,
                y + (tabH / 2) + 10, // Scaled 4 * 2.4
                UITheme.fonts.small,
                textCol,
                "center",
                "middle"
            );

            // --- DELECTARIVE AUDIO ADDED HERE ---
            this.hitboxes.push({ id, x: tx, y, w: tabW, h: tabH, type: 'tab', hoverSfx: 'hoverTick', clickSfx: 'cinematicBoom' });
        };

        drawTab("STATS", x, viewMode === 'STATS', 'TAB_STATS');
        drawTab("ITEM", x + tabW, viewMode === 'ITEM', 'TAB_ITEM');
        drawTab("SKILLS", x + (tabW * 2), viewMode === 'ABILITIES', 'TAB_ABILITIES');

        // --- Panel Content ---
        const contentY = y + tabH + 48; // Scaled 20 * 2.4
        const contentH = h - contentY - 48; // Scaled 20 * 2.4

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
        const drawSize = 77; // Scaled 32 * 2.4
        const x = mouse.x - (drawSize / 2);
        const y = mouse.y - (drawSize / 2);

        this.ctx.save();
        // Sync with PartyRenderer: Use global alpha and flat border instead of pulsing brackets
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

        // Clean static border
        this.ui.drawRect(x, y, drawSize, drawSize, UITheme.colors.borderHighlight, false);
        this.ctx.restore();
    }

    _drawContextMenu(menu, selectedIndex = 0, hoveredHitboxId = null) {
        if (!menu || !menu.options) return;

        const btnHeight = 77;  // Scaled 32 * 2.4
        const padding = 14;    // Scaled ~6 * 2.4
        const menuW = 312;     // Scaled 130 * 2.4
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
        this.ui.drawContextMenu(menuConfig, layout, menuHitboxes, menuHoverId);

        menuHitboxes.forEach(box => {
            if (box.id && box.id.startsWith('MENU_OPT_')) {
                box.id = box.id.replace('MENU_OPT_', 'CTX_OPT_');
            }
        });

        this.hitboxes.push(...menuHitboxes.reverse());
    }

    _drawInputPrompts(state, leftW, centerW, h) {
        let lines = [];

        if (state.contextMenu) {
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
                lineText,
                centerX,
                startY + (index * 32),
                UITheme.fonts.small,
                UITheme.colors.textMuted,
                "center"
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