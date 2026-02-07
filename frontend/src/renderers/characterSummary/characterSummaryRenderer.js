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
        
        this.ui.drawLine(leftW, 0, leftW, h, UITheme.colors.border);
        this.ui.drawLine(leftW + centerW, 0, leftW + centerW, h, UITheme.colors.border);

        if (!member) return;

        // Ensure stats are calculated once per frame
        const stats = derivedStats || StatCalculator.calculate(member);

        // --- 4. Render Components ---

        // A. Left Column (Tabbed: Stats / Item Detail)
        this.renderLeftColumn(state, leftW, h, member, stats);

        // B. Center Column (Equipment & Vitals)
        // We pass 'heldItem' so the panel can highlight valid slots!
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
        const invH = h; 

        this.invPanel.render(
            state.filteredInventory, 
            state.inventoryIndex,    
            state.isChoosingItem,    
            invX,                    
            invY,                    
            invW,                    
            invH,                    
            state,                   
            this.hitboxes            
        );

        // --- 5. Report Hitboxes to Controller (Critical for Drop Detection) ---
        // This closes the loop so the controller knows where items are, 
        // even if the mouse is blocked by a dragged icon.
        if (state.onLayoutUpdate) {
            state.onLayoutUpdate(this.hitboxes);
        }

        // D. Tooltips (Overlay)
        // We only draw tooltips if we are NOT dragging an item AND not in a menu
        if (!state.heldItem && !state.contextMenu) {
            this.tooltipSystem.render(state, this.hitboxes);
        }

        // E. Held Item (Floating Cursor)
        if (state.heldItem) {
            this._drawHeldItem(state);
        }

        // F. Context Menu (Right-Click Menu) - Always Draw Last (Topmost)
        if (state.contextMenu) {
            this._drawContextMenu(state.contextMenu);
        }
    }

    renderLeftColumn(state, w, h, member, stats) {
        const { viewMode, focusedItem } = state;
        const x = this.padding;
        const y = this.padding;
        const contentW = w - (this.padding * 2);

        // --- Tabs Drawing Logic ---
        const tabH = 28;
        const tabW = contentW / 2;
        
        const drawTab = (label, tx, isActive, id) => {
            const bg = isActive ? UITheme.colors.bgScale[2] : UITheme.colors.bgScale[0];
            const border = isActive ? UITheme.colors.borderHighlight : UITheme.colors.border;
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

    /**
     * Draws the item currently being dragged attached to the mouse cursor.
     */
    _drawHeldItem(state) {
        const { heldItem, mouse } = state;
        if (!heldItem || !heldItem.item) return;

        const item = heldItem.item;
        
        // --- CONFIGURATION ---
        const iconSheet = this.loader.get('icons'); 
        
        const iconSize = 32; // Source tile size
        const drawSize = 32; // On-screen size
        
        // Center the icon on the mouse cursor
        const x = mouse.x - (drawSize / 2);
        const y = mouse.y - (drawSize / 2);

        this.ctx.save();

        // 1. Draw Drop Shadow (gives it "lift")
        this.ctx.fillStyle = "rgba(0,0,0,0.5)";
        this.ctx.fillRect(x + 4, y + 4, drawSize, drawSize);

        // 2. Draw Icon
        if (iconSheet && item.icon) {
            const sx = item.icon.col * iconSize;
            const sy = item.icon.row * iconSize;
            
            this.ctx.drawImage(
                iconSheet, 
                sx, sy, iconSize, iconSize, 
                x, y, drawSize, drawSize
            );
        } else {
            // Fallback if image missing
            this.ctx.fillStyle = '#a83232'; // Red placeholder
            this.ctx.fillRect(x, y, drawSize, drawSize);
        }

        // 3. Draw "Holding" Border (Gold/White)
        this.ui.drawRect(x, y, drawSize, drawSize, '#ffffff', false, 2);

        this.ctx.restore();
    }

    /**
     * Draws the Context Menu (Drop, Drop All, etc)
     * Matches the IDs generated in Controller (CTX_OPT_0, etc)
     */
    _drawContextMenu(menu) {
        if (!menu || !menu.options) return;

        const optionH = 32;
        const menuW = 120;
        const menuH = menu.options.length * optionH;
        
        const x = menu.x;
        const y = menu.y;

        // Background
        this.ui.drawRect(x, y, menuW, menuH, UITheme.colors.bgScale[3]); // Dark background
        this.ui.drawRect(x, y, menuW, menuH, UITheme.colors.borderHighlight, false); // Light border

        // Draw Options
        menu.options.forEach((opt, index) => {
            const optY = y + (index * optionH);
            
            // Highlight on hover (handled generically or simple rect check here if needed)
            // For now, clean simple list
            
            this.ui.drawText(
                opt.label, 
                x + 10, 
                optY + (optionH/2) + 5, 
                UITheme.fonts.body, 
                UITheme.colors.textMain
            );

            // Divider line (except for last)
            if (index < menu.options.length - 1) {
                this.ui.drawLine(x, optY + optionH, x + menuW, optY + optionH, UITheme.colors.bgScale[1]);
            }

            // Important: Register Hitbox so Controller detects click
            this.hitboxes.push({
                id: `CTX_OPT_${index}`,
                type: 'context_opt',
                x: x,
                y: optY,
                w: menuW,
                h: optionH
            });
        });
    }

    /**
     * Used by SceneManager to determine what was clicked (Left or Right click).
     * Returns the string ID of the UI element (e.g. 'INV_ITEM_1', 'SLOT_head').
     */
    getHitZone(x, y) {
        // Iterate backwards to prioritize elements drawn on top (Z-order)
        for (let i = this.hitboxes.length - 1; i >= 0; i--) {
            const box = this.hitboxes[i];
            if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
                // Ensure we return the ID string to the controller
                if (box.id) return box.id;
            }
        }
        return null;
    }
}