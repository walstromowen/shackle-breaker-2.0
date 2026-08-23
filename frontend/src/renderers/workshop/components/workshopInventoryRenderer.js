import { WorkshopBaseRenderer } from './workshopBaseRenderer.js';
import { UITheme } from '../../../ui/UITheme.js';
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';
import { gameState } from '../../../../../shared/state/gameState.js';

export class WorkshopInventoryRenderer extends WorkshopBaseRenderer {

    render(state, x, w, h, hitboxes) {
        const centerX = Math.floor(x + (w / 2));
        const HEADER_HEIGHT = 180;

        // --- 1. Draw Fixed Header ---
        this.ui.drawText("Inventory", centerX, 48, UITheme.fonts.header, UITheme.colors.textMain, "center");

        // --- Currency Label ---
        const currencyAmount = gameState.party ? (gameState.party.currency || 0) : (state.partyCurrency || 0);
        this.ui.drawText(`Currency: ${currencyAmount}`, centerX, 108, UITheme.fonts.cardMono, UITheme.colors.textHighlight, "center");

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
        const SCROLLBAR_WIDTH = 10;
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
            this.ui.drawText("- Empty -", centerX, listY + 72, UITheme.fonts.italic, UITheme.colors.textMuted, "center");
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

                const isHovered = state.hoveredHitboxId === `PARTY_ITEM_${index}`;
                const isSelected = state.selectedUpgradeItem && state.selectedUpgradeItem.id === item.id && state.selectedUpgradeItem.instanceId === item.instanceId;

                let bgFill = UITheme.colors.bgScale[1];
                let drawBrackets = false;

                if (isSelected) {
                    bgFill = UITheme.colors.states.focusBg;
                    drawBrackets = true;
                } else if (isHovered) {
                    bgFill = UITheme.colors.states.hoverBg;
                    drawBrackets = true;
                }

                hitboxes.push({ id: `PARTY_ITEM_${index}`, x: itemX, y: itemY, w: SLOT_SIZE, h: SLOT_SIZE, type: 'inventory', index: index, hoverSfx: 'hoverTick', clickSfx: 'uiClick' });

                this.ui.drawPanel(itemX, itemY, SLOT_SIZE, SLOT_SIZE, bgFill);

                const iconOffset = (SLOT_SIZE - 64) / 2;
                
                // Uses inherited drawIcon
                this.drawIcon(def, itemX + iconOffset, itemY + iconOffset, 64);

                if (item.qty > 1) {
                    this.ui.drawText(`${item.qty}`, itemX + SLOT_SIZE - 5, itemY + SLOT_SIZE - 5, UITheme.fonts.small, UITheme.colors.textHighlight, "right");
                }
                if (drawBrackets) {
                    this.ui.drawSelectionBrackets(itemX, itemY, SLOT_SIZE, SLOT_SIZE, 5, UITheme.colors.borderHighlight);
                }
            });
        }

        this.ui.endClip();
        this.ui.ctx.restore();

        if (currentContentHeight > listH) {
            const scrollX = x + w - SCROLLBAR_WIDTH - 5;
            this.drawScrollBar(scrollX, listY, listH, currentContentHeight, renderScroll, 'PARTY', hitboxes);
        }
    }

    drawScrollBar(x, y, viewportH, contentH, scrollOffset, prefix, hitboxes) {
        const SCROLLBAR_WIDTH = 10;
        this.ui.drawRect(x, y, SCROLLBAR_WIDTH, viewportH, UITheme.colors.scrollTrack || UITheme.colors.bgScale[0]);
        
        const viewRatio = viewportH / contentH;
        let thumbH = Math.max(20, viewportH * viewRatio);
        
        const scrollRatio = scrollOffset / (contentH - viewportH);
        const thumbY = y + (scrollRatio * (viewportH - thumbH));
        
        this.ui.drawRect(x, thumbY, SCROLLBAR_WIDTH, thumbH, UITheme.colors.borderHighlight);
        
        hitboxes.push({ id: `SCROLLBAR_THUMB_${prefix}`, x: x - 5, y: thumbY, w: SCROLLBAR_WIDTH + 10, h: thumbH, type: 'scrollbar_thumb' });
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
}