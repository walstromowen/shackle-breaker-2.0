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
        const { member, derivedStats } = state;

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
            member, 
            stats, 
            state.slots, 
            state.selectedSlotIndex, 
            state.isChoosingItem, 
            leftW, 0, centerW, h, 
            this.hitboxes,
            state.heldItem 
        );

        // C. Right Column (Inventory Grid)
        const invX = leftW + centerW + this.padding;
        const invY = 0; 
        const invW = rightW - (this.padding * 2);

        this.invPanel.render(
            state.filteredInventory, 
            state.inventoryIndex,    
            state.isChoosingItem,    
            invX,                    
            invY,                    
            invW,                    
            h,                    
            state,                   
            this.hitboxes            
        );

        // D. Held Item (Floating Cursor)
        if (state.heldItem) {
            this._drawHeldItem(state);
        }

        // E. Context Menu
        if (state.contextMenu) {
            this._drawContextMenu(state.contextMenu, state.contextMenu.selectedIndex);
        }

        // F. Tooltips
        if (!state.heldItem && !state.contextMenu) {
            this.tooltipSystem.render(state, this.hitboxes);
        }

        // G. Input Prompts
        this._drawInputPrompts(state, leftW, centerW, h);

        // --- 5. Report Hitboxes ---
        if (state.onLayoutUpdate) {
            state.onLayoutUpdate(this.hitboxes);
        }
    }

    renderLeftColumn(state, w, h, member, stats) {
        const { viewMode, focusedItem } = state;
        const x = this.padding;
        const y = this.padding;
        const contentW = w - (this.padding * 2);

        // --- Tabs ---
        const tabH = 67; // Scaled 28 * 2.4
        const tabW = contentW / 3; 
        
        const drawTab = (label, tx, isActive, id) => {
            if (isActive) {
                // Active Tab: Gothic Panel with Gold Brackets
                this.ui.drawPanel(tx, y, tabW, tabH, UITheme.colors.panelBg);
                this.ui.drawSelectionBrackets(tx, y, tabW, tabH, 5, UITheme.colors.borderHighlight); // Scaled 2 * 2.4
            } else {
                // Inactive Tab: Dimmed, basic border
                this.ui.drawRect(tx, y, tabW, tabH, "rgba(0,0,0,0.5)");
                this.ui.drawRect(tx, y, tabW, tabH, UITheme.colors.border, false); 
            }
            
            const textCol = isActive ? UITheme.colors.textHighlight : UITheme.colors.textMuted;
            this.ui.drawText(
                label, 
                tx + tabW/2, 
                y + (tabH/2) + 10, // Scaled 4 * 2.4
                UITheme.fonts.small, 
                textCol, 
                "center", 
                "middle"
            );

            this.hitboxes.push({ id, x: tx, y, w: tabW, h: tabH, type: 'tab' });
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
        
        // Gothic background for dragged item
        this.ui.drawPanel(x, y, drawSize, drawSize, "rgba(0,0,0,0.85)");

        if (iconSheet && def.icon) {
            const sx = def.icon.col * iconSize;
            const sy = def.icon.row * iconSize;
            this.ctx.drawImage(iconSheet, sx, sy, iconSize, iconSize, x, y, drawSize, drawSize);
        } else {
            this.ctx.fillStyle = UITheme.colors.failure; 
            this.ctx.fillRect(x + 10, y + 10, drawSize - 19, drawSize - 19); // Scaled
        }

        // Tarnished gold highlight brackets to signify holding
        // Automatically pulses in sync with the inventory!
        this.ui.drawSelectionBrackets(x, y, drawSize, drawSize); 
        
        this.ctx.restore()
    }

    _drawContextMenu(menu, selectedIndex = 0) {
        if (!menu || !menu.options) return;

        const optionH = 77;  // Scaled 32 * 2.4
        const menuW = 288;   // Scaled 120 * 2.4
        const menuH = menu.options.length * optionH;
        const screenW = this.ctx.canvas.width;
        const screenH = this.ctx.canvas.height;

        let x = menu.x;
        let y = menu.y;

        // Clamp to screen (Scaled padding of 5 to 12)
        if (x + menuW > screenW) x = screenW - menuW - 12;
        if (y + menuH > screenH) y = screenH - menuH - 12; 
        if (x < 12) x = 12;
        if (y < 12) y = 12;

        // Draw Elegant Gothic Menu Background
        this.ui.drawPanel(x, y, menuW, menuH, UITheme.colors.panelBg); 

        menu.options.forEach((opt, index) => {
            const optY = y + (index * optionH);
            const isSelected = (index === selectedIndex);
            
            // Draw Selection Highlight (Inset slightly to clear the gothic border)
            if (isSelected) {
                this.ui.drawRect(x + 12, optY, menuW - 24, optionH, "rgba(184, 153, 71, 0.15)");
                this.ui.drawText(">", x + 29, optY + (optionH/2) + 10, UITheme.fonts.small, UITheme.colors.textHighlight);
            }

            // Draw Option Label
            this.ui.drawText(
                opt.label, 
                x + 67, 
                optY + (optionH/2) + 12, 
                UITheme.fonts.body, 
                isSelected ? UITheme.colors.textHighlight : UITheme.colors.textMain
            );

            // Draw Delicate Separator
            if (index < menu.options.length - 1) {
                this.ui.drawLine(x + 24, optY + optionH, x + menuW - 24, optY + optionH, UITheme.colors.border);
            }

            // Register Hitbox
            this.hitboxes.push({
                id: `CTX_OPT_${index}`,
                type: 'context_opt',
                x: x, y: optY, w: menuW, h: optionH
            });
        });
    }

    _drawInputPrompts(state, leftW, centerW, h) {
        let prompts = "";

        if (state.contextMenu) {
            prompts = "[W/S] Nav  [SPC] Select  [ESC] Close";
        } 
        else if (state.heldItem) {
            prompts = "[MOUSE] Place  [ESC] Cancel";
        } 
        else if (state.isChoosingItem) {
            prompts = "[WASD] Grid  [SHFT] View  [SPC] Menu  [ESC] Back";
        } 
        else {
            const slotName = (state.slots && state.slots[state.selectedSlotIndex]) || null;
            const hasSlotItem = slotName && state.member.equipment[slotName];
            
            const hasInvItems = state.filteredInventory && state.filteredInventory.length > 0;

            let parts = ["[WASD] Slot", "[Q/E] Char", "[SHFT] View"];

            if (hasSlotItem) {
                parts.push("[SPC] Menu");
            } else if (hasInvItems) {
                parts.push("[SPC] Equip");
            }

            parts.push("[ESC] Back");
            prompts = parts.join("  ");
        }

        const centerX = leftW + Math.floor(centerW / 2);

        // Add a thematic flourish line above the controls
        this.ui.drawLineWithGothicFlourish(centerX - 360, h - 84, 720, UITheme.colors.border); // Scaled

        this.ui.drawText(
            prompts, 
            centerX,        
            h - 36,        // Scaled
            UITheme.fonts.small, 
            UITheme.colors.textMuted, 
            "center"      
        );
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