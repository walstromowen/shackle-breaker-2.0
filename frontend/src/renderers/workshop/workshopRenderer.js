import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { TooltipSystem } from '../../renderers/characterSummary/components/tooltipSystem.js';
import { WorkshopRecipeRenderer } from './components/workshopRecipeRenderer.js';
import { WorkshopDetailsRenderer } from './components/workshopDetailsRenderer.js';
import { WorkshopInventoryRenderer } from './components/workshopInventoryRenderer.js';

export class WorkshopRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader;
        this.ui = new CanvasUI(ctx);
        this.tooltipSystem = new TooltipSystem(this.ui, loader);

        // Initialize column sub-renderers
        this.recipeRenderer = new WorkshopRecipeRenderer(this.ui, loader);
        this.detailsRenderer = new WorkshopDetailsRenderer(this.ui, loader);
        this.inventoryRenderer = new WorkshopInventoryRenderer(this.ui, loader);
    }

    render(state) {
        const hitboxes = [];
        if (!state) return hitboxes;

        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;

        this.ui.clearScreen(w, h);

        const leftW = Math.floor(w * 0.28);
        const centerW = Math.floor(w * 0.44);
        const rightW = w - leftW - centerW;

        this.ui.drawRect(0, 0, leftW, h, UITheme.colors.bgScale[0]);
        this.ui.drawRect(leftW, 0, centerW, h, UITheme.colors.bgScale[1]);
        this.ui.drawRect(leftW + centerW, 0, rightW, h, UITheme.colors.bgScale[0]);

        this.ui.drawLine(leftW, 0, leftW, h, UITheme.colors.border, 1);
        this.ui.drawLine(leftW + centerW, 0, leftW + centerW, h, UITheme.colors.border, 1);

        // 1. Render Left Column (Recipes & Dynamic Title)
        this.recipeRenderer.render(state, 0, leftW, h, hitboxes);

        // 2. Render Center Column (Crafting vs Upgrading)
        if (state.selectedUpgradeItem) {
            this.detailsRenderer.renderUpgradeDetails(state, leftW, centerW, h, hitboxes);
        } else {
            this.detailsRenderer.renderRecipeDetails(state, leftW, centerW, h, hitboxes);
        }

        // 3. Render Right Column
        this.inventoryRenderer.render(state, leftW + centerW, rightW, h, hitboxes);
        this.inventoryRenderer.drawInputPrompts(state, leftW, centerW, h, hitboxes);

        // --- Tooltip Rendering ---
        if (state.hoveredHitboxId && state.hoveredHitboxId.startsWith('PARTY_ITEM_')) {
            const tooltipState = { ...state };
            tooltipState.filteredInventory = state.partyInventory || [];
            
            if (!tooltipState.member) {
                tooltipState.member = { equipment: {}, stats: {} };
            }

            const activeHitbox = hitboxes.find(h => h.id === state.hoveredHitboxId);
            
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
                
                this.tooltipSystem.render(tooltipState, hitboxes);
            }
        }

        if (state.onLayoutUpdate) {
            state.onLayoutUpdate([...hitboxes].reverse());
        }

        return hitboxes;
    }
}