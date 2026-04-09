import { UITheme } from '../../../ui/UITheme.js';
import { AbilityDefinitions } from '../../../../../shared/data/abilityDefinitions.js';

export class AbilitiesPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        this.SCROLLBAR_WIDTH = 4;
        this.ABILITY_ICON_SIZE = 32;
        this.totalContentHeight = 0;
    }

    render(member, x, y, w, h, state, hitboxes) {
        if (!member) return;

        // --- 1. Retrieve Compiled Abilities from State ---
        const abilityList = state.abilities || [];

        // --- 2. Render Empty State ---
        if (abilityList.length === 0) {
            this.ui.drawText("No abilities learned.", x + w / 2, y + 50, UITheme.fonts.cardItalic, UITheme.colors.textMuted, "center");
            return;
        }

        // --- 3. Scroll Management ---
        const maxScroll = Math.max(0, this.totalContentHeight - h);
        
        if (state.layout) {
            state.layout.abilitiesBounds = { x: x, y: y, w: w + 20, h: h };
            state.layout.abilitiesMaxScroll = maxScroll;
            state.layout.abilitiesViewportH = h; 
        }

        if (state.scrollOffset > maxScroll) state.scrollOffset = maxScroll;
        if (state.scrollOffset < 0) state.scrollOffset = 0;

        // --- 4. Render with Clipping ---
        this.ui.ctx.save();
        this.ui.startClip(x, y, w + 10, h);

        let currentY = y - state.scrollOffset;
        const initialDrawY = currentY;

        abilityList.forEach((abilityObj, index) => {
            const def = AbilityDefinitions[abilityObj.id];
            if (!def) return;
            
            // Pass the state's abilityObj to render the source data
            currentY = this._drawAbilityCard(def, abilityObj, x, currentY, w);
        });

        this.totalContentHeight = currentY - initialDrawY;

        this.ui.endClip();
        this.ui.ctx.restore();

        // --- Draw Scrollbar ---
        if (this.totalContentHeight > h) {
            this.drawScrollBar(x + w + 6, y, h, this.totalContentHeight, state.scrollOffset, hitboxes);
        }
    }

    drawScrollBar(x, y, viewportH, contentH, scrollOffset, hitboxes) {
        // Kept as drawRect since 4px is too narrow for a full gothic panel border
        this.ui.drawRect(x, y, this.SCROLLBAR_WIDTH, viewportH, UITheme.colors.scrollTrack || "rgba(0,0,0,0.5)"); 
        
        const viewRatio = viewportH / contentH;
        let thumbH = Math.max(20, viewportH * viewRatio);
        
        const maxScroll = contentH - viewportH;
        const scrollRatio = maxScroll > 0 ? (scrollOffset / maxScroll) : 0;
        const trackSpace = viewportH - thumbH;
        const thumbY = y + (scrollRatio * trackSpace);

        this.ui.drawRect(x, thumbY, this.SCROLLBAR_WIDTH, thumbH, UITheme.colors.scrollThumb || UITheme.colors.borderHighlight);

        if (hitboxes) {
            hitboxes.push({
                id: 'SCROLLBAR_THUMB', 
                type: 'ui',
                x: x - 4, 
                y: y, 
                w: this.SCROLLBAR_WIDTH + 8, 
                h: viewportH 
            });
        }
    }

    _drawAbilityCard(ab, abilityObj, x, y, w) {
        const cardPadding = 12;
        const iconSize = this.ABILITY_ICON_SIZE;
        const gap = 12;
        
        // --- 1. Calculate Layout Heights ---
        const descW = w - (cardPadding * 2);
        const descLines = ab.description 
            ? this.ui.getWrappedLines(ab.description, descW, UITheme.fonts.cardItalic) 
            : [];
        
        const hasStats = ab.effects || ab.accuracy || ab.speed;
        
        // Expand the info block if we need a 3rd line for stats
        const infoBlockHeight = hasStats ? 54 : 38; 
        const dividerHeight = descLines.length > 0 ? 20 : 0;
        const descTextHeight = descLines.length > 0 ? (descLines.length * 12) : 0;
        
        const cardHeight = cardPadding + infoBlockHeight + dividerHeight + descTextHeight + cardPadding;

        // --- 2. Draw Thematic Background Panel ---
        const isEquip = abilityObj.isEquipment || (abilityObj.source && abilityObj.source !== 'Innate');
        // Visually distinguish innate vs equipped abilities using subtle background scale shifts
        const bgCol = isEquip ? UITheme.colors.panelBg : UITheme.colors.bgScale[0]; 

        // Replaced flat drawRect with stylized panel
        this.ui.drawPanel(x, y, w, cardHeight, bgCol);

        // --- 3. Render Info Block (TOP) ---
        const infoY = y + cardPadding;
        
        // Draw Icon Frame (Vertically centered relative to text block height)
        const iconX = x + cardPadding;
        const iconY = infoY + (infoBlockHeight - iconSize) / 2;
        
        // Replaced simple rect frame with a nested panel for the icon recess
        this.ui.drawPanel(iconX, iconY, iconSize, iconSize, UITheme.colors.bgScale[2]);
        this._drawAbilityIcon(ab, iconX, iconY);
        this.ui.drawRect(iconX, iconY, iconSize, iconSize, UITheme.colors.border, false); // Keep simple crisp outline for the icon itself

        const contentX = iconX + iconSize + gap;
        
        // Text Y-Anchors
        const titleY = infoY + 12;
        const sourceY = infoY + 28;
        const statsY = infoY + 44; 
        
        // Title
        const abilityName = ab.name || abilityObj.name || abilityObj.id;
        this.ui.drawText(abilityName, contentX, titleY, UITheme.fonts.cardTitle, UITheme.colors.textMain, "left");
        
        // Cost (Top Right)
        if (ab.cost) {
            let costStr = "";
            let costCol = UITheme.colors.textMuted;
            
            if (ab.cost.hp) { costStr = `${ab.cost.hp} HP`; costCol = UITheme.colors.hp; }
            else if (ab.cost.mana) { costStr = `${ab.cost.mana} MP`; costCol = UITheme.colors.ins; }
            else if (ab.cost.stamina) { costStr = `${ab.cost.stamina} SP`; costCol = UITheme.colors.stm; }
            else if (ab.cost.insight) { costStr = `${ab.cost.insight} INS`; costCol = UITheme.colors.ins; }
            
            this.ui.drawText(costStr, x + w - cardPadding, titleY, UITheme.fonts.cardMono, costCol, "right");
        }

        // Source Line
        const sourceText = isEquip ? `Source: ${abilityObj.source}` : `Innate`;
        const sourceColor = isEquip ? UITheme.colors.textHighlight : UITheme.colors.textMuted;
        this.ui.drawText(sourceText, contentX, sourceY, UITheme.fonts.cardSmall, sourceColor, "left");

        // Stats (Rendered on a dedicated 3rd line to guarantee they fit)
        if (hasStats) {
            let statX = contentX;
            this.ui.ctx.font = UITheme.fonts.cardMono; // Prep measureText

            const drawStat = (label, value, color) => {
                const txt = `${label} ${value}`;
                this.ui.drawText(txt, statX, statsY, UITheme.fonts.cardMono, color, "left");
                statX += (this.ui.ctx.measureText(txt).width) + 12; // 12px gap between stats
            };

            if (ab.effects) {
                const dmg = ab.effects.find(e => e.type === 'damage' || e.type === 'heal');
                if (dmg) drawStat("Pwr:", `${dmg.power}x`, UITheme.colors.textHighlight);
            }
            if (ab.accuracy) drawStat("Acc:", `${Math.floor(ab.accuracy*100)}%`, UITheme.colors.textMuted);
            if (ab.speed) drawStat("Spd:", ab.speed, UITheme.colors.textMuted);
        }

        // --- 4. Render Divider & Description (BOTTOM) ---
        let cursorY = infoY + infoBlockHeight;

        if (descLines.length > 0) {
            cursorY += 8; // Padding before divider
            
            // Render Gothic Flourish Divider
            const flourishW = w * 0.6;
            this.ui.drawLineWithGothicFlourish(x + (w - flourishW)/2, cursorY, flourishW, UITheme.colors.border);
            
            cursorY += 14; // Padding after divider

            // Render Description Text
            descLines.forEach(line => {
                this.ui.drawText(line, x + (w/2), cursorY, UITheme.fonts.cardItalic, UITheme.colors.textMuted, "center");
                cursorY += 12;
            });
        }

        return y + cardHeight + 8; // Margin bottom for next card
    }

    _drawAbilityIcon(ability, x, y) {
        if (!this.loader) return;
        const sheet = this.loader.get('abilities') || this.loader.get('items');
        if (sheet) {
            const iconData = ability.icon || { col: 0, row: 0 };
            this.ui.drawSprite(
                sheet, 
                iconData.col * 32, iconData.row * 32, 32, 32, 
                x, y, this.ABILITY_ICON_SIZE, this.ABILITY_ICON_SIZE
            );
        } else {
            // Fallback panel if icon doesn't load
            this.ui.drawPanel(x, y, this.ABILITY_ICON_SIZE, this.ABILITY_ICON_SIZE, UITheme.colors.bgScale[1]); 
        }
    }
}