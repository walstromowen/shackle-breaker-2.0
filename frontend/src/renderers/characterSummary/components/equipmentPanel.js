import { UITheme } from '../../../ui/UITheme.js';
import { TRAIT_DEFINITIONS } from '../../../../../shared/data/traitDefinitions.js';

export class EquipmentPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        this.SLOT_HEIGHT = 48;
        this.PORTRAIT_SIZE = 112;
        this.RENDER_SIZE = 32;
    }

    render(member, stats, activeSlots, selectedIndex, isChoosingItem, x, y, w, h, hitboxes) {
        const centerX = Math.floor(x + (w / 2));
        let headerY = y + 10;

        // 1. Name & Level
        this.ui.drawText(member.name, centerX, headerY + 15, UITheme.fonts.header, UITheme.colors.textMain, "center");
        this.ui.drawText(`Level ${member.level}`, centerX, headerY + 36, UITheme.fonts.body, UITheme.colors.accent, "center");

        // 2. Vitals (HP/STM/INS/XP)
        this._drawVitals(member, stats, centerX, headerY + 58, x, w);

        // 3. Equipment Slots & Portrait
        const equipStartY = y + 95; // Adjusted offset
        this._drawEquipmentLayout(member, activeSlots, selectedIndex, isChoosingItem, centerX, equipStartY, w, hitboxes);

        // 4. Traits
        const traitsStartY = equipStartY + Math.max(this.PORTRAIT_SIZE, activeSlots.length/2 * 52) + 25;
        this._drawTraitBadges(member, x, traitsStartY, w, hitboxes);
    }

    _drawVitals(member, stats, centerX, y, fullX, fullW) {
        const getVal = (v) => (v && typeof v === 'object') ? (v.total || v.value || 0) : (Number(v) || 0);

        const totalMaxHp = getVal(stats.maxHp) || getVal(member.maxHp);
        const totalMaxStm = getVal(stats.maxStamina) || getVal(member.maxStamina);
        const totalMaxIns = getVal(stats.maxInsight) || getVal(member.maxInsight);

        const hpText = `HP ${member.hp}/${totalMaxHp}`;
        const stmText = `STM ${member.stamina}/${totalMaxStm}`;
        const insText = `INS ${member.insight || 0}/${totalMaxIns}`;
        const xpText = `XP ${member.xp}/${member.xpToNext || 100}`;

        // Simple centered layout with gaps
        this.ui.ctx.font = UITheme.fonts.mono;
        const gap = 15;
        const totalW = this.ui.ctx.measureText(hpText + stmText + insText + xpText).width + (gap * 3);
        let startX = centerX - (totalW / 2);

        const drawVital = (txt, color) => {
            const width = this.ui.ctx.measureText(txt).width;
            this.ui.drawText(txt, startX + width/2, y, UITheme.fonts.mono, color, "center");
            startX += width + gap;
        };

        drawVital(hpText, UITheme.colors.danger);
        drawVital(stmText, UITheme.colors.success);
        drawVital(insText, UITheme.colors.insight);
        drawVital(xpText, "#9370DB");

        this.ui.drawRect(fullX + 20, y + 15, fullW - 40, 1, "#333");
    }

    _drawEquipmentLayout(member, activeSlots, selectedIndex, isChoosingItem, centerX, startY, w, hitboxes) {
        const equipData = (member.state && member.state.equipment) ? member.state.equipment : (member.equipment || {});
        const splitIndex = Math.ceil(activeSlots.length / 2);
        
        // Portrait Rendering logic remains same...
        const pX = Math.floor(centerX - (this.PORTRAIT_SIZE / 2));
        const pY = startY + 10;
        this.ui.drawRect(pX, pY, this.PORTRAIT_SIZE, this.PORTRAIT_SIZE, UITheme.colors.border, false);
        let assetKey = member.portrait || member.sprite || 'hero';
        const img = this.loader.get(assetKey) || this.loader.get('spritesheet');
        if(img) this.ui.drawSprite(img, 0, 0, img.width, img.height, pX, pY, this.PORTRAIT_SIZE, this.PORTRAIT_SIZE);

        // Slots
        const drawSlot = (slotName, index, isLeft) => {
            const globalIndex = isLeft ? index : splitIndex + index;
            const isSelected = (globalIndex === selectedIndex);
            
            const slotW = Math.floor((w - this.PORTRAIT_SIZE - 40) / 2);
            const slotX = isLeft ? (centerX - (this.PORTRAIT_SIZE/2) - slotW - 10) : (centerX + (this.PORTRAIT_SIZE/2) + 10);
            const slotY = startY + (index * (this.SLOT_HEIGHT + 4));

            let borderColor = isSelected ? (isChoosingItem ? UITheme.colors.accent : UITheme.colors.textHighlight) : "#333";
            let boxColor = isSelected ? "rgba(255, 255, 255, 0.1)" : "rgba(0,0,0,0.3)";

            hitboxes.push({ id: `SLOT_${slotName}`, x: slotX, y: slotY, w: slotW, h: this.SLOT_HEIGHT, type: 'slot', slotId: slotName });

            this.ui.drawRect(slotX, slotY, slotW, this.SLOT_HEIGHT, boxColor);
            this.ui.ctx.lineWidth = isSelected ? 2 : 1;
            this.ui.drawRect(slotX, slotY, slotW, this.SLOT_HEIGHT, borderColor, false);
            this.ui.ctx.lineWidth = 1;

            const item = equipData[slotName];
            const itemName = item ? (item.name || item.definition?.name) : "Empty";
            
            // --- UPDATED WRAPPING LOGIC ---
            const iconX = isLeft ? (slotX + slotW - 36) : (slotX + 4);
            const textX = isLeft ? (slotX + slotW - 42) : (slotX + 42);
            const textW = slotW - 48; // Space available for text
            const align = isLeft ? "right" : "left";

            if (item) this._drawIcon(item, iconX, slotY + 8);

            // 1. Draw the Slot Label (e.g., "HEAD", "MAIN HAND")
            // We move this up slightly so it doesn't get hit by wrapped lines
            this.ui.drawText(slotName.toUpperCase(), textX, slotY + 10, "bold 8px monospace", "#666", align);

            // 2. Wrap and Draw Item Name
            const nameFont = "11px sans-serif";
            const nameLines = this.ui.getWrappedLines(itemName, textW, nameFont);
            
            let nameY = slotY + 22;
            // If it's only one line, we can center it slightly better vertically
            if (nameLines.length === 1) nameY += 4;

            nameLines.forEach((line, i) => {
                // Limit to 2 lines to prevent box overflow
                if (i < 2) {
                    this.ui.drawText(line, textX, nameY + (i * 12), nameFont, item ? "#fff" : "#444", align);
                }
            });
        };

        activeSlots.slice(0, splitIndex).forEach((s, i) => drawSlot(s, i, true));
        activeSlots.slice(splitIndex).forEach((s, i) => drawSlot(s, i, false));
    }

    _drawTraitBadges(member, x, y, w, hitboxes) {
        const centerX = x + (w / 2);
        this.ui.drawText("Traits", centerX, y, UITheme.fonts.bold, "#666", "center");
        
        let currentX = x + 30;
        let currentY = y + 20;
        const traits = member.traits || [];

        if (traits.length === 0) {
            this.ui.drawText("None", centerX, currentY, "italic 11px sans-serif", "#444", "center");
            return;
        }

        traits.forEach(traitId => {
            const def = TRAIT_DEFINITIONS[traitId] || { name: traitId };
            const width = this.ui.ctx.measureText(def.name).width + 20;
            
            if (currentX + width > x + w - 30) {
                currentX = x + 30;
                currentY += 30;
            }

            // Hitbox
            hitboxes.push({ id: traitId, x: currentX, y: currentY, w: width, h: 22, type: 'trait' });

            this.ui.drawRect(currentX, currentY, width, 22, "rgba(255,255,255,0.1)");
            this.ui.drawText(def.name, currentX + width/2, currentY + 15, "11px sans-serif", "#ccc", "center");
            currentX += width + 8;
        });
    }

    _drawIcon(item, x, y) {
        if (!item) return;
        const sheet = this.loader.get('items');
        if (!sheet) return;
        const iconData = item.icon || item.definition?.icon || {col:0, row:0};
        this.ui.drawSprite(sheet, iconData.col*32, iconData.row*32, 32, 32, x, y, 32, 32);
    }
}