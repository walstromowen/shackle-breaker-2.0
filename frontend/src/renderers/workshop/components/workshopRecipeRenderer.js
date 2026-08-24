import { WorkshopBaseRenderer } from './workshopBaseRenderer.js';
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';
import { UITheme } from '../../../ui/UITheme.js';

export class WorkshopRecipeRenderer extends WorkshopBaseRenderer {
    render(state, x, w, h, hitboxes) {
        const centerX = x + (w / 2);
        let listY = this.padding;

        // --- UPDATED: Use the dynamic station title from state ---
        const displayTitle = state.stationTitle || "Workshop";
        
        this.ui.drawText(displayTitle, centerX, listY + 24, UITheme.fonts.header, UITheme.colors.textMain, "center");
        listY += 48;

        const flourishW = w * 0.8;
        this.ui.drawLineWithGothicFlourish(centerX - (flourishW / 2), listY, flourishW, UITheme.colors.borderHighlight);
        listY += 32;

        state.availableRecipes.forEach((recipe) => {
            const outDef = ItemDefinitions[recipe.outputItemId];
            if (!outDef) return;

            const isSelected = !state.selectedUpgradeItem && state.selectedRecipe && state.selectedRecipe.id === recipe.id;
            const hitboxId = `RECIPE_${recipe.id}`;
            const isHovered = state.hoveredHitboxId === hitboxId;

            const rowH = 88;
            let bgColor = null;
            let textColor = UITheme.colors.textMuted;
            let drawBrackets = false;

            if (isSelected) {
                bgColor = UITheme.colors.states.focusBg;
                textColor = UITheme.colors.states.focusText;
                drawBrackets = true;
            } else if (isHovered) {
                bgColor = UITheme.colors.states.hoverBg;
                textColor = UITheme.colors.states.hoverText;
            }

            if (bgColor) this.ui.drawRect(x + 12, listY, w - 24, rowH, bgColor, true);
            if (drawBrackets) this.ui.drawSelectionBrackets(x + 12, listY, w - 24, rowH, 5, UITheme.colors.borderHighlight);

            this.drawIcon(outDef, x + 24, listY + 12, 64);
            const color = this.getRarityColor(outDef.rarity);
            this.ui.drawText(outDef.name, x + 104, listY + (rowH / 2) + 8, UITheme.fonts.body, color, "left");

            hitboxes.push({
                id: hitboxId,
                x: x + 12,
                y: listY,
                w: w - 24,
                h: rowH,
                type: 'recipe',
                hoverSfx: 'hoverTick',
                clickSfx: 'cinematicBoom'
            });

            listY += rowH + 8;
        });
    }
}