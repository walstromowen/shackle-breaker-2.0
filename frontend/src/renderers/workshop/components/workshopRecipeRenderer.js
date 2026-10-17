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

            const rowH = 88;

            // The chosen recipe is "selected" (bar); the row under the mouse / keyboard cursor is "highlighted".
            // The name keeps its rarity color.
            this.ui.drawStateBox(x + 12, listY, w - 24, rowH,
                this.ui.flags(hitboxId, state.hoveredHitboxId, { selected: !!isSelected }),
                { inset: true });

            this.drawIcon(outDef, x + 24, listY + 12, 64);
            const color = this.getRarityColor(outDef.rarity);
            this.ui.drawText(outDef.name, x + 104, listY + (rowH / 2) + 8, UITheme.fonts.body, color, "left");

            hitboxes.push({
                id: hitboxId,
                x: x + 12,
                y: listY,
                w: w - 24,
                h: rowH,
                type: 'recipe'


            });

            listY += rowH + 8;
        });
    }
}
