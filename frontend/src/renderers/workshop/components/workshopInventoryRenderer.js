import { WorkshopBaseRenderer } from './workshopBaseRenderer.js';
import { UITheme } from '../../../ui/UITheme.js';
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';
import { gameState } from '../../../../../shared/state/gameState.js';

export class WorkshopInventoryRenderer extends WorkshopBaseRenderer {

    render(state, x, w, h, hitboxes) {
        const centerX = Math.floor(x + (w / 2));
        const HEADER_HEIGHT = 180;

        // --- 1. Draw Fixed Header ---
        this.ui.drawStyled('title', 'Inventory', centerX, 72);

        // --- Currency Label ---
        const currencyAmount = gameState.party ? (gameState.party.currency || 0) : (state.partyCurrency || 0);
        this.ui.drawStyled('subtitle', `Currency: ${currencyAmount}`, centerX, 124);

        const dividerY = HEADER_HEIGHT - 24;
        const flourishW = w * 0.8;
        this.ui.drawLineWithGothicFlourish(x + (w - flourishW) / 2, dividerY, flourishW, UITheme.colors.borderHighlight);

        // --- 2. Calculate Viewport Metrics ---
        const listY = HEADER_HEIGHT;
        const listH = h - HEADER_HEIGHT;
        const inv = state.partyInventory || [];

        const COLS = 4;
        const SLOT_SIZE = 96;
        const SLOT_PADDING = 19;
        const totalGridW = (COLS * SLOT_SIZE) + ((COLS - 1) * SLOT_PADDING);

        let startX = x + Math.floor((w - totalGridW) / 2);
        if (startX < x + 5) startX = x + 5;

        const rowCount = Math.ceil(inv.length / COLS);
        const currentContentHeight = rowCount * (SLOT_SIZE + SLOT_PADDING);
        const scrollOffset = state.partyScrollOffset || 0;
        const maxScroll = Math.max(0, currentContentHeight - listH);

        if (state.layout) {
            state.layout.partyBounds = { x, y: listY, w, h: listH };
            state.layout.partyMaxScroll = maxScroll;
            state.layout.cols = COLS;
            state.layout.itemHeight = SLOT_SIZE + SLOT_PADDING;
        }

        let renderScroll = scrollOffset;
        if (renderScroll > maxScroll) renderScroll = maxScroll;
        if (renderScroll < 0) renderScroll = 0;

        this.ui.ctx.save();
        this.ui.startClip(x, listY - 24, w, listH + 48);

        if (inv.length === 0) {
            this.ui.drawStyled('empty', 'Empty', centerX, listY + 72);
        } else {
            inv.forEach((item, index) => {
                const def = ItemDefinitions[item.defId || item.id];
                if (!def) return;

                const col = index % COLS;
                const row = Math.floor(index / COLS);
                const itemX = startX + (col * (SLOT_SIZE + SLOT_PADDING));
                const itemY = listY + (row * (SLOT_SIZE + SLOT_PADDING)) - renderScroll;

                if (itemY > listY + listH) return;
                if (itemY + SLOT_SIZE < listY) return;

                // Gear entries point at the live item (_ref), so two identical swords - one in the
                // bag and one equipped - never highlight together. Stacked materials fall back to id.
                const selectedItem = state.selectedUpgradeItem;
                const isSelected = !!selectedItem && (item._ref
                    ? item._ref === selectedItem
                    : (selectedItem.id === item.id && selectedItem.instanceId === item.instanceId));

                // The item chosen for upgrading is "selected" (bar); the slot under the mouse / keyboard cursor is "highlighted"
                const flags = this.ui.flags(`PARTY_ITEM_${index}`, state.hoveredHitboxId, { selected: isSelected });

                hitboxes.push({ id: `PARTY_ITEM_${index}`, x: itemX, y: itemY, w: SLOT_SIZE, h: SLOT_SIZE, type: 'inventory', index: index, clickSfx: 'uiClick' });

                this.ui.drawPanel(itemX, itemY, SLOT_SIZE, SLOT_SIZE, UITheme.colors.bgScale[1]);
                this.ui.drawStateBox(itemX, itemY, SLOT_SIZE, SLOT_SIZE, flags);

                const iconOffset = (SLOT_SIZE - 64) / 2;
                // Uses inherited drawIcon
                this.drawIcon(def, itemX + iconOffset, itemY + iconOffset, 64);

                // Equipped gear: badge in the corner shows which party member is holding it
                if (item.equippedBy) {
                    this.drawHolderBadge(itemX + 3, itemY + 3, 28, item.equippedBy, item.equippedByIndex);
                }

                if (item.qty > 1) {
                    this.ui.drawText(`${item.qty}`, itemX + SLOT_SIZE - 5, itemY + SLOT_SIZE - 5, UITheme.fonts.small, UITheme.colors.textHighlight, "right");
                }
            });
        }

        this.ui.endClip();
        this.ui.ctx.restore();

        if (currentContentHeight > listH) {
            const scrollX = x + w - UITheme.scrollbar.width - 5;
            this.drawListScrollbar(scrollX, listY, listH, currentContentHeight, renderScroll, 'PARTY', hitboxes, state.hoveredHitboxId);
        }
    }

    drawInputPrompts(state, leftW, centerW, h, hitboxes) {
        let lines = [];
        if (state.hoveredHitboxId === 'BTN_CRAFT') {
            lines.push("[L-Click/SPC] Craft Item      [R-Click/ESC] Close");
        } else if (state.hoveredHitboxId === 'BTN_UPGRADE') {
            lines.push("[L-Click/SPC] Upgrade Item      [R-Click/ESC] Close");
        } else {
            lines.push("[L-Click/WASD] Select Recipe/Item      [R-Click/ESC] Close");
        }
        const centerX = leftW + Math.floor(centerW / 2);
        const flourishW = Math.min(720, centerW - 64);
        this.ui.drawLineWithGothicFlourish(centerX - (flourishW / 2), h - 104, flourishW, UITheme.colors.borderHighlight);
        const startY = h - 64;
        lines.forEach((lineText, index) => {
            this.ui.drawStyled('hint', lineText, centerX, startY + (index * 32));
        });
    }
}
