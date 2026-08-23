import { UITheme } from '../../../ui/UITheme.js';
import { AbilityDefinitions } from '../../../../../shared/data/abilityDefinitions.js';

export class AbilitiesPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        this.SCROLLBAR_WIDTH = 10; 
        this.ABILITY_ICON_SIZE = 64;
        this.totalContentHeight = 0;
    }

    render(member, x, y, w, h, state, hitboxes) {
        if (!member) return;

        // --- 1. Retrieve Compiled Abilities from State ---
        const abilityList = state.abilities || [];

        // --- 2. Render Empty State ---
        if (abilityList.length === 0) {
            this.ui.drawText("No abilities learned.", x + w / 2, y + 120, UITheme.fonts.cardItalic, UITheme.colors.textMuted, "center");
            return;
        }

        // --- 3. Scroll Management ---
        const maxScroll = Math.max(0, this.totalContentHeight - h);
        
        if (state.layout) {
            state.layout.abilitiesBounds = { x: x, y: y, w: w + 48, h: h };
            state.layout.abilitiesMaxScroll = maxScroll;
            state.layout.abilitiesViewportH = h;
        }

        if (state.scrollOffset > maxScroll) state.scrollOffset = maxScroll;
        if (state.scrollOffset < 0) state.scrollOffset = 0;

        // --- 4. Render with Clipping ---
        this.ui.ctx.save();
        this.ui.startClip(x, y, w + 24, h);

        let currentY = y - state.scrollOffset;
        const initialDrawY = currentY;

        abilityList.forEach((abilityObj, index) => {
            const def = AbilityDefinitions[abilityObj.id];
            if (!def) return;
            currentY = this._drawAbilityCard(def, abilityObj, x, currentY, w);
        });

        this.totalContentHeight = currentY - initialDrawY;

        this.ui.endClip();
        this.ui.ctx.restore();

        // --- Draw Scrollbar ---
        if (this.totalContentHeight > h) {
            this.drawScrollBar(x + w + 14, y, h, this.totalContentHeight, state.scrollOffset, hitboxes);
        }
    }

    drawScrollBar(x, y, viewportH, contentH, scrollOffset, hitboxes) {
        this.ui.drawRect(x, y, this.SCROLLBAR_WIDTH, viewportH, UITheme.colors.scrollTrack || "rgba(0,0,0,0.5)");

        const viewRatio = viewportH / contentH;
        let thumbH = Math.max(48, viewportH * viewRatio);
        const maxScroll = contentH - viewportH;
        const scrollRatio = maxScroll > 0 ? (scrollOffset / maxScroll) : 0;
        const trackSpace = viewportH - thumbH;
        const thumbY = y + (scrollRatio * trackSpace);

        this.ui.drawRect(x, thumbY, this.SCROLLBAR_WIDTH, thumbH, UITheme.colors.scrollThumb || UITheme.colors.borderHighlight);

        if (hitboxes) {
            hitboxes.push({
                id: 'SCROLLBAR_THUMB',
                type: 'ui',
                x: x - 10,
                y: y,
                w: this.SCROLLBAR_WIDTH + 19,
                h: viewportH,
                hoverSfx: 'hoverTick'
            });
        }
    }

    _drawAbilityCard(ab, abilityObj, x, y, w) {
        const cardPadding = 12; 
        const iconSize = 48;    
        const gap = 12;

        // --- 1. Damage Type Colors Configuration ---
        let rawType = ab.damageType || (ab.type ? ab.type.toLowerCase() : 'physical');
        if (!ab.damageType && ab.effects && ab.effects.length > 0) {
            const dmgEffect = ab.effects.find(e => e.type === 'damage');
            if (dmgEffect && dmgEffect.damageType) rawType = dmgEffect.damageType.toLowerCase();
        }
        const themeColor = (UITheme.colors.types && UITheme.colors.types[rawType]) || UITheme.colors.textMuted;
        const displayType = rawType.charAt(0).toUpperCase() + rawType.slice(1);

        // --- 2. Calculate Layout Heights (Relaxed Compact) ---
        const descW = w - (cardPadding * 2);
        const descLines = ab.description ? this.ui.getWrappedLines(ab.description, descW, UITheme.fonts.cardItalic) : [];
        const hasStats = ab.effects || ab.accuracy !== undefined || ab.speed !== undefined || ab.range !== undefined;
        
        // Increased heights to allow more breathing room between text lines
        const infoBlockHeight = hasStats ? 108 : 84; 
        const dividerHeight = descLines.length > 0 ? 24 : 0;
        const descTextHeight = descLines.length > 0 ? (descLines.length * 22) : 0; // 22px line height for description
        const cardHeight = cardPadding + infoBlockHeight + dividerHeight + descTextHeight + cardPadding;

        // --- 3. Draw Thematic Background Panel ---
        const isEquip = abilityObj.isEquipment || (abilityObj.source && abilityObj.source !== 'Innate');
        const bgCol = isEquip ? UITheme.colors.panelBg : UITheme.colors.bgScale[0];

        this.ui.drawPanel(x, y, w, cardHeight, bgCol);

        this.ui.ctx.save();
        const bgGrad = this.ui.ctx.createLinearGradient(x, y, x, y + cardHeight);
        bgGrad.addColorStop(0, `${themeColor}15`);
        bgGrad.addColorStop(0.4, 'rgba(0,0,0,0)');
        this.ui.ctx.fillStyle = bgGrad;
        this.ui.ctx.fillRect(x, y, w, cardHeight);
        this.ui.ctx.restore();

        this.ui.ctx.strokeStyle = themeColor;
        this.ui.ctx.lineWidth = 1;
        this.ui.ctx.strokeRect(x, y, w, cardHeight);

        // --- 4. Render Info Block (TOP) ---
        const infoY = y + cardPadding;
        const iconX = x + cardPadding;
        const iconY = infoY; 

        this.ui.ctx.fillStyle = UITheme.colors.bgScale?.[2] || 'rgba(255, 255, 255, 0.05)';
        this.ui.ctx.fillRect(iconX, iconY, iconSize, iconSize);
        
        const prevIconSize = this.ABILITY_ICON_SIZE;
        this.ABILITY_ICON_SIZE = iconSize;
        this._drawAbilityIcon(ab, iconX, iconY);
        this.ABILITY_ICON_SIZE = prevIconSize;

        this.ui.ctx.strokeStyle = themeColor;
        this.ui.ctx.lineWidth = 1;
        this.ui.ctx.strokeRect(iconX, iconY, iconSize, iconSize);

        const contentX = iconX + iconSize + gap;
        let currentTextY = infoY + 12; 

        // Row 1: Title & Cost
        const abilityName = ab.name || abilityObj.name || abilityObj.id;
        this.ui.ctx.textAlign = 'left';
        this.ui.ctx.textBaseline = 'middle';
        this.ui.ctx.font = UITheme.fonts.cardTitle;
        this.ui.ctx.fillStyle = UITheme.colors.textMain;
        this.ui.ctx.fillText(abilityName, contentX, currentTextY);

        this.ui.ctx.textAlign = 'right';
        this.ui.ctx.font = UITheme.fonts.cardMono;
        if (ab.cost) {
            let costStr = "Free";
            let costCol = UITheme.colors.textMuted;
            
            // Restored the spaces here (e.g. "15 STM")
            if (ab.cost.hp) { costStr = `${ab.cost.hp} HP`; costCol = UITheme.colors.hp; }
            else if (ab.cost.mana) { costStr = `${ab.cost.mana} MP`; costCol = UITheme.colors.ins; }
            else if (ab.cost.stamina) { costStr = `${ab.cost.stamina} STM`; costCol = UITheme.colors.stm; }
            else if (ab.cost.insight) { costStr = `${ab.cost.insight} INS`; costCol = UITheme.colors.ins; }
            
            this.ui.ctx.fillStyle = costCol;
            this.ui.ctx.fillText(costStr, x + w - cardPadding, currentTextY);
        } else {
            this.ui.ctx.fillStyle = UITheme.colors.textMuted;
            this.ui.ctx.fillText("Free", x + w - cardPadding, currentTextY);
        }
        // Increased space before the next line
        currentTextY += 28;

        // Row 2: Type Badge & Source
        this.ui.ctx.textAlign = 'left';
        this.ui.ctx.font = UITheme.fonts.cardItalic;
        const typeWidth = this.ui.ctx.measureText(displayType).width;
        const badgePadX = 6;
        const badgeH = 18;
        const badgeW = typeWidth + (badgePadX * 2);
        const badgeDrawY = currentTextY - (badgeH / 2);

        this.ui.ctx.fillStyle = `${themeColor}33`;
        this.ui.ctx.strokeStyle = themeColor;
        this.ui.ctx.lineWidth = 1;
        this.ui.ctx.beginPath();
        if (this.ui.ctx.roundRect) {
            this.ui.ctx.roundRect(contentX, badgeDrawY, badgeW, badgeH, badgeH / 2);
        } else {
            this.ui.ctx.rect(contentX, badgeDrawY, badgeW, badgeH);
        }
        this.ui.ctx.fill();
        this.ui.ctx.stroke();
        
        this.ui.ctx.fillStyle = themeColor;
        this.ui.ctx.fillText(displayType, contentX + badgePadX, currentTextY);

        const sourceText = isEquip ? (abilityObj.source || 'Equip') : 'Innate';
        this.ui.ctx.textAlign = 'right';
        this.ui.ctx.fillStyle = UITheme.colors.textMuted;
        this.ui.ctx.fillText(sourceText, x + w - cardPadding, currentTextY);
        
        // DROP DOWN BELOW ICON for full width, with a bit more padding
        currentTextY = infoY + iconSize + 16;
        const fullRowX = x + cardPadding;

        // Row 3: Target (Full Width)
        this.ui.ctx.textAlign = 'left';
        this.ui.ctx.font = UITheme.fonts.cardItalic;
        const targetText = this._formatTargetingText(ab.targeting);
        this.ui.ctx.fillStyle = UITheme.colors.textMuted;
        this.ui.ctx.fillText("Target: ", fullRowX, currentTextY);
        this.ui.ctx.fillStyle = UITheme.colors.textMain;
        this.ui.ctx.fillText(targetText, fullRowX + this.ui.ctx.measureText("Target: ").width, currentTextY);
        
        // Increased space before stats
        currentTextY += 24;

        // Row 4: Combat Stats Grid (Full Width)
        if (hasStats) {
            let statX = fullRowX;
            this.ui.ctx.font = UITheme.fonts.cardMono;
            
            const drawStat = (label, value, valueColor) => {
                this.ui.ctx.fillStyle = UITheme.colors.textMuted;
                this.ui.ctx.fillText(label, statX, currentTextY);
                statX += this.ui.ctx.measureText(label).width;
                this.ui.ctx.fillStyle = valueColor;
                this.ui.ctx.fillText(value, statX, currentTextY);
                statX += this.ui.ctx.measureText(value).width + 12; // Relaxed gap between stat blocks
            };

            if (ab.effects) {
                const dmg = ab.effects.find(e => e.type === 'damage' || e.type === 'heal');
                if (dmg) drawStat("Pwr:", `${dmg.power}x`, themeColor);
            }
            if (ab.accuracy !== undefined) drawStat("Acc:", `${Math.floor(ab.accuracy*100)}%`, UITheme.colors.textMain);
            if (ab.speed !== undefined) drawStat("Spd:", ab.speed.toString(), UITheme.colors.textMain);
            
            if (ab.range !== undefined) {
                let rangeStr = ab.range.toString();
                rangeStr = rangeStr.charAt(0).toUpperCase() + rangeStr.slice(1);
                drawStat("Rng:", rangeStr, UITheme.colors.textMain);
            }
        }

        // --- 5. Render Divider & Description (BOTTOM) ---
        this.ui.ctx.textBaseline = 'top';
        let cursorY = infoY + infoBlockHeight;

        if (descLines.length > 0) {
            const flourishW = w * 0.5;
            if (this.ui.drawLineWithGothicFlourish) {
                this.ui.drawLineWithGothicFlourish(x + (w - flourishW)/2, cursorY, flourishW, themeColor);
            } else {
                this.ui.ctx.fillStyle = themeColor;
                this.ui.ctx.fillRect(x + (w - flourishW)/2, cursorY + 12, flourishW, 1);
            }
            cursorY += 20; // Increased gap below divider

            this.ui.ctx.textAlign = 'center';
            this.ui.ctx.fillStyle = UITheme.colors.textMuted;
            this.ui.ctx.font = UITheme.fonts.cardItalic; 
            
            descLines.forEach(line => {
                this.ui.ctx.fillText(line, x + (w/2), cursorY);
                cursorY += 22; // Relaxed line height for description
            });
        }
        
        this.ui.ctx.textBaseline = 'alphabetic';
        return y + cardHeight + 12; // A bit more gap between separate ability cards
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
            this.ui.drawPanel(x, y, this.ABILITY_ICON_SIZE, this.ABILITY_ICON_SIZE, UITheme.colors.bgScale[1]);
        }
    }

    _formatTargetingText(targeting) {
        if (!targeting) return 'None';
        const scope = targeting.scope || 'enemy';
        const select = targeting.select || 'single';
        const count = targeting.count || 1;

        if (scope === 'self') return 'Self';
        if (scope === 'all_enemies') return 'All Enemies';
        if (scope === 'all_allies') return 'All Allies';
        if (scope === 'everyone') return 'Everyone';

        const scopeStr = scope.charAt(0).toUpperCase() + scope.slice(1);

        if (select === 'multiple') return `${count}x ${scopeStr}`;
        if (select === 'random') return `Random ${scopeStr}`;
        if (select === 'row') return `${scopeStr} Row`;
        return `Single ${scopeStr}`;
    }
}