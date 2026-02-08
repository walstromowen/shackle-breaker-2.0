import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { StatCalculator } from '../../../../shared/systems/statCalculator.js';

// Sub-Components
import { ItemDetailPanel } from './components/itemDetailPanel.js';
import { StatsPanel } from './components/statsPanel.js';
import { EquipmentPanel } from './components/equipmentPanel.js';
import { InventoryPanel } from './components/inventoryPanel.js';
import { TooltipSystem } from './components/tooltipSystem.js';

export class CharacterSummaryRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader;
        this.ui = new CanvasUI(ctx);
        
        // --- Component Initialization ---
        this.itemPanel = new ItemDetailPanel(this.ui, loader);
        this.statsPanel = new StatsPanel(this.ui);
        this.equipPanel = new EquipmentPanel(this.ui, loader);
        this.invPanel   = new InventoryPanel(this.ui, loader);
        this.tooltipSystem = new TooltipSystem(this.ui);

        this.hitboxes = [];
        this.padding = 15;
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
        
        this.ui.drawLine(leftW, 0, leftW, h, UITheme.colors.selectedWhite);
        this.ui.drawLine(leftW + centerW, 0, leftW + centerW, h, UITheme.colors.selectedWhite);

        if (!member) return;

        const stats = derivedStats || StatCalculator.calculate(member);

        // --- 4. Render Components ---

        // A. Left Column (Tabbed: Stats / Item Detail)
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
        this._drawInputPrompts(state, w, h);

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
        const tabH = 28;
        const tabW = contentW / 2;
        
        const drawTab = (label, tx, isActive, id) => {
            const bg = isActive ? UITheme.colors.bgScale[2] : UITheme.colors.bgScale[0];
            const border = isActive ? UITheme.colors.selectedWhite : UITheme.colors.border;
            const text = isActive ? UITheme.colors.textMain : UITheme.colors.textMuted;
            
            this.ui.drawRect(tx, y, tabW, tabH, bg);
            this.ui.drawRect(tx, y, tabW, tabH, border, false); 
            
            this.ui.drawText(
                label, 
                tx + tabW/2, 
                y + (tabH/2) + 4, 
                UITheme.fonts.small, 
                text, 
                "center", 
                "middle"
            );

            this.hitboxes.push({ id, x: tx, y, w: tabW, h: tabH, type: 'tab' });
        };

        drawTab("STATS", x, viewMode === 'STATS', 'TAB_STATS');
        drawTab("ITEM", x + tabW, viewMode === 'ITEM', 'TAB_ITEM');

        // --- Panel Content ---
        const contentY = y + tabH + 20;
        const contentH = h - contentY - 20;

        if (viewMode === 'STATS') {
            this.statsPanel.render(member, stats, x, contentY, contentW);
        } else {
            this.itemPanel.render(focusedItem, x, contentY, contentW, contentH, state, this.hitboxes);
        }
    }

    _drawHeldItem(state) {
        const { heldItem, mouse } = state;
        if (!heldItem || !heldItem.item) return;

        const item = heldItem.item;
        const iconSheet = this.loader.get('icons'); 
        const iconSize = 32; 
        const drawSize = 32; 
        
        const x = mouse.x - (drawSize / 2);
        const y = mouse.y - (drawSize / 2);

        this.ctx.save();
        this.ctx.fillStyle = UITheme.colors.scrollTrack;
        this.ctx.fillRect(x + 4, y + 4, drawSize, drawSize);

        if (iconSheet && item.icon) {
            const sx = item.icon.col * iconSize;
            const sy = item.icon.row * iconSize;
            this.ctx.drawImage(iconSheet, sx, sy, iconSize, iconSize, x, y, drawSize, drawSize);
        } else {
            this.ctx.fillStyle = UITheme.colors.failure; 
            this.ctx.fillRect(x, y, drawSize, drawSize);
        }

        this.ui.drawRect(x, y, drawSize, drawSize, UITheme.colors.selectedWhite, false, 2);
        this.ctx.restore();
    }

    _drawContextMenu(menu, selectedIndex = 0) {
        if (!menu || !menu.options) return;

        const optionH = 32;
        const menuW = 120;
        const menuH = menu.options.length * optionH;
        const screenW = this.ctx.canvas.width;
        const screenH = this.ctx.canvas.height;

        let x = menu.x;
        let y = menu.y;

        if (x + menuW > screenW) x = screenW - menuW - 5;
        if (y + menuH > screenH) y = screenH - menuH - 5; 
        if (x < 5) x = 5;
        if (y < 5) y = 5;

        this.ui.drawRect(x, y, menuW, menuH, UITheme.colors.bgScale[2]); 
        this.ui.drawRect(x, y, menuW, menuH, UITheme.colors.selectedWhite, false);

        menu.options.forEach((opt, index) => {
            const optY = y + (index * optionH);
            const isSelected = (index === selectedIndex);
            
            if (isSelected) {
                this.ui.drawRect(x, optY, menuW, optionH, UITheme.colors.bgScale[1]);
                this.ui.drawText(">", x + 8, optY + (optionH/2) + 4, UITheme.fonts.small, UITheme.colors.selectedWhite);
            }

            this.ui.drawText(
                opt.label, 
                x + 25, 
                optY + (optionH/2) + 5, 
                UITheme.fonts.body, 
                isSelected ? UITheme.colors.selectedWhite : UITheme.colors.textMain
            );

            if (index < menu.options.length - 1) {
                this.ui.drawLine(x, optY + optionH, x + menuW, optY + optionH, UITheme.colors.border);
            }

            this.hitboxes.push({
                id: `CTX_OPT_${index}`,
                type: 'context_opt',
                x: x, y: optY, w: menuW, h: optionH
            });
        });
    }

    _drawInputPrompts(state, w, h) {
        let prompts = "";

        if (state.contextMenu) {
            prompts = "[W/S] Nav   [SPACE] Select   [ESC] Close";
        } 
        else if (state.heldItem) {
            prompts = "[MOUSE] Place   [ESC] Cancel";
        } 
        else if (state.isChoosingItem) {
            prompts = "[WASD] Grid   [SHIFT] View   [SPACE] Menu   [ESC] Back";
        } 
        else {
            // --- Equipment Slots active ---
            const slot = (state.slots && state.slots[state.selectedSlotIndex]) || null;
            const hasSlotItem = slot && slot.item;
            const hasInvItems = state.filteredInventory && state.filteredInventory.length > 0;

            let parts = ["[WASD] Slot", "[Q/E] Char", "[SHIFT] View"];

            // Logic: 
            // 1. If we have an item in the slot, SPACE opens the context menu (Unequip etc).
            // 2. If the slot is empty, SPACE jumps to Inventory (Equip). This is ONLY valid if inventory has items.
            if (hasSlotItem) {
                parts.push("[SPACE] Menu");
            } else if (hasInvItems) {
                parts.push("[SPACE] Equip");
            }

            parts.push("[ESC] Back");
            prompts = parts.join("   ");
        }

        this.ui.drawText(
            prompts, 
            w / 2,         
            h - 15,        
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