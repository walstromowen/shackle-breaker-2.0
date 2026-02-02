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
        // Pass the UI instance to share the context/theme wrappers
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
        // 
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

        // Ensure stats are calculated once per frame (or used from state)
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
            this.hitboxes
        );

        // C. Right Column (Inventory Grid)
        // --- FIXED CALL ---
        // We now pass 'h' (height) and 'state' (viewState)
        const invX = leftW + centerW + this.padding;
        const invY = 0;
        const invW = rightW - (this.padding * 2);
        const invH = h; // Use full height for scrolling calc

        this.invPanel.render(
            state.filteredInventory, // 1. inventory
            state.inventoryIndex,    // 2. index
            state.isChoosingItem,    // 3. choosing state
            invX,                    // 4. x
            invY,                    // 5. y
            invW,                    // 6. w
            invH,                    // 7. h (NEW)
            state,                   // 8. state (NEW - for scroll offset)
            this.hitboxes            // 9. hitboxes
        );

        // D. Tooltips (Overlay - Rendered Last)
        this.tooltipSystem.render(state, this.hitboxes);
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
            // Tab Background
            const bg = isActive ? UITheme.colors.bgScale[2] : UITheme.colors.bgScale[0];
            const border = isActive ? UITheme.colors.borderHighlight : UITheme.colors.border;
            const text = isActive ? UITheme.colors.textMain : UITheme.colors.textMuted;
            
            this.ui.drawRect(tx, y, tabW, tabH, bg);
            this.ui.drawRect(tx, y, tabW, tabH, border, false); // Stroke
            
            this.ui.drawText(
                label, 
                tx + tabW/2, 
                y + (tabH/2) + 4, 
                UITheme.fonts.small, 
                text, 
                "center", 
                "middle"
            );

            // Register Hitbox
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
            // Pass the specific item to focus on (either hovered or selected)
            // UPDATED: Added this.hitboxes as final argument
            this.itemPanel.render(focusedItem, x, contentY, contentW, contentH, state, this.hitboxes);
        }
    }

    /**
     * Determines which interactive element is under the mouse.
     * Uses LIFO (Last-In-First-Out) to prioritize elements drawn on top (like Tooltips).
     */
    getHitZone(x, y) {
        for (let i = this.hitboxes.length - 1; i >= 0; i--) {
            const box = this.hitboxes[i];
            if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
                // If it's a direct ID, return it. If it's an object (like inventory items), return the object
                return box.type === 'inventory' ? box.id : (box.id || box); 
            }
        }
        return null;
    }
}