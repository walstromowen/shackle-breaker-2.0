import { WorkshopBaseRenderer } from './workshopBaseRenderer.js';
import { ItemDefinitions } from '../../../../../shared/items/itemDefinitions.js';
import { UITheme } from '../../../ui/UITheme.js';

export class WorkshopRecipeRenderer extends WorkshopBaseRenderer {
    render(state, x, w, h, hitboxes) {
        const centerX = x + (w / 2);
        let listY = this.padding;

        // --- UPDATED: Use the dynamic station title from state ---
        const displayTitle = state.stationTitle || "Workshop";
        this.ui.drawStyled('title', displayTitle, centerX, listY + 44);
        listY += 60;

        const flourishW = w * 0.8;
        this.ui.drawLineWithGothicFlourish(centerX - (flourishW / 2), listY, flourishW, UITheme.colors.borderHighlight);
        listY += 32;

        // --- Scrolling list: the title above stays put, only the rows move ---
        // (the controller filters the recipes the same way when it scrolls the keyboard cursor into view)
        const recipes = (state.availableRecipes || []).filter(r => ItemDefinitions[r.outputItemId]);
        const ROW_H = 88;
        const GAP = 8;
        const STEP = ROW_H + GAP;

        const listTop = listY;
        const listH = Math.max(STEP, h - listTop - 16 - 136);   // the Back button sits under the list
        const contentH = Math.max(0, recipes.length * STEP - GAP);
        const maxScroll = Math.max(0, contentH - listH);
        const needsBar = maxScroll > 0;
        const scroll = Math.max(0, Math.min(maxScroll, state.recipeScrollOffset || 0));

        // Tell the controller where the list is (mouse wheel zone, max scroll, row height, viewport)
        if (state.layout) {
            state.layout.recipeBounds = { x, y: listTop, w, h: listH };
            state.layout.recipeMaxScroll = maxScroll;
            state.layout.recipeViewportH = listH;
            state.layout.recipeItemH = STEP;
        }

        // Rows give way to the scrollbar (which is wider than the usual side margin) when there is one
        const rowW = w - 24 - (needsBar ? UITheme.scrollbar.width + 6 : 0);

        this.ui.startClip(x, listTop, w, listH);

        recipes.forEach((recipe, i) => {
            const rowY = listTop + (i * STEP) - scroll;
            if (rowY + ROW_H < listTop || rowY > listTop + listH) return; // fully out of view

            const outDef = ItemDefinitions[recipe.outputItemId];
            const isSelected = !state.selectedUpgradeItem && state.selectedRecipe && state.selectedRecipe.id === recipe.id;
            const hitboxId = `RECIPE_${recipe.id}`;

            // The chosen recipe is "selected" (bar); the row under the mouse / keyboard cursor is "highlighted".
            // The name keeps its rarity color.
            this.ui.drawStateBox(x + 12, rowY, rowW, ROW_H,
                this.ui.flags(hitboxId, state.hoveredHitboxId, { selected: !!isSelected }),
                { inset: true });

            this.drawIcon(outDef, x + 24, rowY + 12, 64);
            const color = this.getRarityColor(outDef.rarity);
            this.ui.drawText(outDef.name, x + 104, rowY + (ROW_H / 2) + 8, UITheme.fonts.body, color, "left");

            // The clickable part is only the part of the row that is on screen
            const hitTop = Math.max(rowY, listTop);
            const hitBottom = Math.min(rowY + ROW_H, listTop + listH);
            hitboxes.push({
                id: hitboxId,
                x: x + 12,
                y: hitTop,
                w: rowW,
                h: hitBottom - hitTop,
                type: 'recipe'
            });
        });

        this.ui.endClip();

        if (needsBar) {
            const barX = x + w - UITheme.scrollbar.width - 6;
            this.drawListScrollbar(barX, listTop, listH, contentH, scroll, 'RECIPES', hitboxes, state.hoveredHitboxId);
        }
    }
}