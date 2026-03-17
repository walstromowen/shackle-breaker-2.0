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

        // --- 1. Gather Abilities from ALL Sources ---
        const abilitySet = new Set();

        // Source A: Innate / Learned abilities on the character
        if (member.abilities && Array.isArray(member.abilities)) {
            member.abilities.forEach(id => abilitySet.add(id));
        }
        // (Optional) If your data uses "skills" instead of "abilities", add this:
        if (member.skills && Array.isArray(member.skills)) {
            member.skills.forEach(id => abilitySet.add(id));
        }

        // Source B: Equipment abilities
        if (member.equipment) {
            Object.values(member.equipment).forEach(item => {
                if (!item) return;
                
                // Look for 'grantedAbilities' instead of 'abilities'
                if (item.grantedAbilities && Array.isArray(item.grantedAbilities)) {
                    item.grantedAbilities.forEach(id => abilitySet.add(id));
                }
            });
        }

        // Convert the Set back to an array so we can loop over it
        const abilityList = Array.from(abilitySet);

        // --- 2. Render Empty State ---
        if (abilityList.length === 0) {
            this.ui.drawText("No abilities learned.", x + w / 2, y + 50, UITheme.fonts.body, UITheme.colors.textMuted, "center");
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

        // IMPORTANT: Change this from member.abilities.forEach to abilityList.forEach
        abilityList.forEach((abilityId, index) => {
            const def = AbilityDefinitions[abilityId];
            if (!def) return;
            
            currentY = this._drawAbilityCard(def, abilityId, x, currentY, w);
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
        this.ui.drawRect(x, y, this.SCROLLBAR_WIDTH, viewportH, UITheme.colors.bgScale[0]); 
        
        const viewRatio = viewportH / contentH;
        let thumbH = Math.max(20, viewportH * viewRatio);
        
        const maxScroll = contentH - viewportH;
        const scrollRatio = maxScroll > 0 ? (scrollOffset / maxScroll) : 0;
        const trackSpace = viewportH - thumbH;
        const thumbY = y + (scrollRatio * trackSpace);

        const thumbColor = UITheme.colors.scrollThumb || "#666666";
        this.ui.drawRect(x, thumbY, this.SCROLLBAR_WIDTH, thumbH, thumbColor);

        if (hitboxes) {
            hitboxes.push({
                id: 'SCROLLBAR_THUMB', // <-- CHANGE THIS LINE
                type: 'ui',
                x: x - 4, 
                y: y, 
                w: this.SCROLLBAR_WIDTH + 8, 
                h: viewportH 
            });
        }
    }

    _drawAbilityCard(ab, abilityId, x, y, w) {
        const cardPadding = 8;
        const iconSize = this.ABILITY_ICON_SIZE;
        const gap = 10;
        
        const iconX = x + cardPadding;
        const contentX = iconX + iconSize + gap;
        const contentW = w - (cardPadding * 2) - iconSize - gap; 

        const descFont = "italic 11px sans-serif";
        const descLines = ab.description 
            ? this.ui.getWrappedLines(ab.description, contentW, descFont) 
            : [];
        
        const headerHeight = 14; 
        const statsHeight = 14; 
        const dividerHeight = 6;
        const descTextHeight = descLines.length > 0 ? (descLines.length * 13) : 0;
        const contentHeight = headerHeight + 4 + statsHeight + dividerHeight + descTextHeight;
        
        const cardHeight = Math.max(contentHeight, iconSize) + (cardPadding * 2);

        this.ui.drawRect(x, y, w, cardHeight, UITheme.colors.bgScale[0]); 
        this.ui.drawRect(x, y, w, cardHeight, UITheme.colors.border, false);

        const iconY = y + cardPadding;
        this.ui.drawRect(iconX, iconY, iconSize, iconSize, "rgba(0,0,0,0.5)");
        this._drawAbilityIcon(ab, iconX, iconY);
        this.ui.drawRect(iconX, iconY, iconSize, iconSize, UITheme.colors.border, false);

        let cursorY = y + cardPadding + 10; 

        this.ui.drawText(ab.name || abilityId, contentX, cursorY, "bold 12px sans-serif", UITheme.colors.textMain, "left");
        
        // Cost
        if (ab.cost) {
            let costStr = "";
            let costCol = UITheme.colors.textMuted;
            
            if (ab.cost.mana) { 
                costStr = `${ab.cost.mana} MP`; 
                costCol = UITheme.colors.defense; 
            }
            else if (ab.cost.stamina) { 
                costStr = `${ab.cost.stamina} SP`; 
                costCol = UITheme.colors.stm; 
            }
            else if (ab.cost.insight) { 
                costStr = `${ab.cost.insight} INS`; 
                costCol = UITheme.colors.ins; 
            }
            this.ui.drawText(costStr, x + w - cardPadding, cursorY, "bold 10px monospace", costCol, "right");
        }
        cursorY += 16;

        // Stats
        let statX = contentX;
        const drawStat = (label, value, color) => {
            const txt = `${label} ${value}`;
            this.ui.drawText(txt, statX, cursorY, "10px monospace", color, "left");
            statX += (txt.length * 6) + 10;
        };

        if (ab.effects) {
            const dmg = ab.effects.find(e => e.type === 'damage' || e.type === 'heal');
            if (dmg) drawStat("Pwr:", `${dmg.power}x`, UITheme.colors.textHighlight);
        }
        if (ab.accuracy) drawStat("Acc:", `${Math.floor(ab.accuracy*100)}%`, UITheme.colors.textMuted);
        if (ab.speed) drawStat("Spd:", ab.speed, UITheme.colors.textMuted);

        cursorY += 6; 

        // Description
        if (descLines.length > 0) {
            this.ui.drawRect(contentX, cursorY, contentW, 1, UITheme.colors.bgScale[2]);
            cursorY += 12;

            descLines.forEach(line => {
                this.ui.drawText(line, contentX, cursorY, descFont, UITheme.colors.textMuted, "left");
                cursorY += 13;
            });
        }

        return y + cardHeight + 8; // Return the bottom Y for the next card
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
            this.ui.drawRect(x, y, this.ABILITY_ICON_SIZE, this.ABILITY_ICON_SIZE, UITheme.colors.bgScale[1]); 
        }
    }
}