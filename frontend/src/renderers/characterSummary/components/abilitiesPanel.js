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
    const cardPadding = 24;
    const iconSize = this.ABILITY_ICON_SIZE;
    const gap = 24;

    // --- 1. Damage Type Colors Configuration ---
    let rawType = ab.damageType || (ab.type ? ab.type.toLowerCase() : 'physical');
    if (!ab.damageType && ab.effects && ab.effects.length > 0) {
        const dmgEffect = ab.effects.find(e => e.type === 'damage');
        if (dmgEffect && dmgEffect.damageType) rawType = dmgEffect.damageType.toLowerCase();
    }
    
    const themeColor = (UITheme.colors.types && UITheme.colors.types[rawType]) || UITheme.colors.textMuted;
    const displayType = rawType.charAt(0).toUpperCase() + rawType.slice(1);

    // --- 2. Calculate Layout Heights ---
    const descW = w - (cardPadding * 2);
    const descLines = ab.description ? this.ui.getWrappedLines(ab.description, descW, UITheme.fonts.cardItalic) : [];

    // Expanded info block to accommodate 5 distinct rows of data
    const hasStats = ab.effects || ab.accuracy || ab.speed;
    const infoBlockHeight = hasStats ? 160 : 136; 
    const dividerHeight = descLines.length > 0 ? 40 : 0;
    const descTextHeight = descLines.length > 0 ? (descLines.length * 24) : 0;

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

    // --- 4. Render Info Block (TOP) ---
    const infoY = y + cardPadding;

    // Draw Icon Frame
    const iconX = x + cardPadding;
    const iconY = infoY + 16; 
    
    this.ui.ctx.fillStyle = UITheme.colors.bgScale?.[2] || 'rgba(255, 255, 255, 0.05)';
    this.ui.ctx.fillRect(iconX, iconY, iconSize, iconSize);
    this._drawAbilityIcon(ab, iconX, iconY);
    
    this.ui.ctx.strokeStyle = themeColor;
    this.ui.ctx.lineWidth = 1;
    this.ui.ctx.strokeRect(iconX, iconY, iconSize, iconSize);

    const contentX = iconX + iconSize + gap;
    let currentTextY = iconY + 12; // Start rendering text anchored to the top of the icon

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

    currentTextY += 32; // Step down to Badge Row

    // Row 2: Type Badge
    this.ui.ctx.textAlign = 'left';
    this.ui.ctx.font = UITheme.fonts.cardItalic;
    
    const typeWidth = this.ui.ctx.measureText(displayType).width;
    const badgePadX = 10;
    const badgeH = 24;
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

    currentTextY += 30; // Step down to Targeting Row

    // Calculate alignment offset so values form a neat column
    this.ui.ctx.font = UITheme.fonts.cardItalic; // or whatever small/body font you prefer
    const targetLabel = "Target: ";
    const sourceLabel = "Source: ";
    const labelColumnW = Math.max(
        this.ui.ctx.measureText(targetLabel).width, 
        this.ui.ctx.measureText(sourceLabel).width
    );

    // Row 3: Target
    const targetText = this._formatTargetingText(ab.targeting);
    this.ui.ctx.fillStyle = UITheme.colors.textMuted;
    this.ui.ctx.fillText(targetLabel, contentX, currentTextY);
    this.ui.ctx.fillStyle = UITheme.colors.textMain; // Highlight the actual value
    this.ui.ctx.fillText(targetText, contentX + labelColumnW, currentTextY);

    currentTextY += 24; // Step down to Source Row

    // Row 4: Source
    const sourceText = isEquip ? abilityObj.source : 'Innate';
    this.ui.ctx.fillStyle = UITheme.colors.textMuted;
    this.ui.ctx.fillText(sourceLabel, contentX, currentTextY);
    this.ui.ctx.fillStyle = UITheme.colors.textMain; 
    this.ui.ctx.fillText(sourceText, contentX + labelColumnW, currentTextY);

    currentTextY += 26; // Step down to Stats Row

    // Row 5: Combat Stats Grid
    if (hasStats) {
        let statX = contentX;
        this.ui.ctx.font = UITheme.fonts.cardMono;
        
        const drawStat = (label, value, valueColor) => {
            this.ui.ctx.fillStyle = UITheme.colors.textMuted;
            this.ui.ctx.fillText(`${label} `, statX, currentTextY);
            statX += this.ui.ctx.measureText(`${label} `).width;
            
            this.ui.ctx.fillStyle = valueColor;
            this.ui.ctx.fillText(value, statX, currentTextY);
            statX += this.ui.ctx.measureText(value).width + 24; 
        };

        if (ab.effects) {
            const dmg = ab.effects.find(e => e.type === 'damage' || e.type === 'heal');
            if (dmg) drawStat("Pwr:", `${dmg.power}x`, themeColor);
        }
        if (ab.accuracy) drawStat("Acc:", `${Math.floor(ab.accuracy*100)}%`, UITheme.colors.textMain);
        if (ab.speed) drawStat("Spd:", ab.speed, UITheme.colors.textMain);
    }

    // --- 7. Render Divider & Description (BOTTOM) ---
    this.ui.ctx.textBaseline = 'top'; 
    let cursorY = infoY + infoBlockHeight;

    if (descLines.length > 0) {
        // Render Gothic Flourish Divider
        const flourishW = w * 0.6;
        this.ui.drawLineWithGothicFlourish(x + (w - flourishW)/2, cursorY, flourishW, themeColor);
        
        cursorY += 24; 

        // Render Description Text
        this.ui.ctx.textAlign = 'center';
        this.ui.ctx.fillStyle = UITheme.colors.textMuted;
        this.ui.ctx.font = UITheme.fonts.cardItalic;
        
        descLines.forEach(line => {
            this.ui.ctx.fillText(line, x + (w/2), cursorY);
            cursorY += 24;
        });
    }

    this.ui.ctx.textBaseline = 'alphabetic'; 

    return y + cardHeight + 16;
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