import { UITheme } from '../../../ui/UITheme.js';
import { TRAIT_DEFINITIONS } from '../../../../../shared/data/traitDefinitions.js';
// NEW IMPORT
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';

export class EquipmentPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        this.SLOT_HEIGHT = 48;
        this.PORTRAIT_SIZE = 112;
        this.RENDER_SIZE = 32;
    }

    render(member, stats, activeSlots, selectedIndex, isChoosingItem, x, y, w, h, hitboxes, heldItem) {
        const centerX = Math.floor(x + (w / 2));
        let headerY = y + 10;

        // 1. Name & Level
        this.ui.drawText(member.name, centerX, headerY + 15, UITheme.fonts.header, UITheme.colors.textMain, "center");
        this.ui.drawText(`Level ${member.level}`, centerX, headerY + 36, UITheme.fonts.body, UITheme.colors.accent, "center");

        // 2. Vitals
        this._drawVitals(member, stats, centerX, headerY + 58, x, w);

        // 3. Equipment Slots & Portrait
        const equipStartY = y + 95; 
        this._drawEquipmentLayout(member, activeSlots, selectedIndex, isChoosingItem, centerX, equipStartY, w, hitboxes, heldItem);

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

    _drawEquipmentLayout(member, activeSlots, selectedIndex, isChoosingItem, centerX, startY, w, hitboxes, heldItem) {
        const equipData = (member.state && member.state.equipment) ? member.state.equipment : (member.equipment || {});
        const splitIndex = Math.ceil(activeSlots.length / 2);
        
        // Portrait
        const pX = Math.floor(centerX - (this.PORTRAIT_SIZE / 2));
        const pY = startY + 10;
        
        this.ui.drawRect(pX, pY, this.PORTRAIT_SIZE, this.PORTRAIT_SIZE, UITheme.colors.border, false);
        
        let assetKey = member.portrait || member.sprite || 'hero';
        const img = this.loader.get(assetKey) || this.loader.get('spritesheet');
        if(img) {
            this.ui.drawSprite(img, 0, 0, img.width, img.height, pX, pY, this.PORTRAIT_SIZE, this.PORTRAIT_SIZE);
        }

        // --- SLOT DRAWING HELPER ---
        const drawSlot = (slotName, index, isLeft) => {
            const globalIndex = isLeft ? index : splitIndex + index;
            const isSelected = (globalIndex === selectedIndex);
            
            const slotW = Math.floor((w - this.PORTRAIT_SIZE - 40) / 2);
            const slotX = isLeft ? (centerX - (this.PORTRAIT_SIZE/2) - slotW - 10) : (centerX + (this.PORTRAIT_SIZE/2) + 10);
            const slotY = startY + (index * (this.SLOT_HEIGHT + 4));

            // --- DROP COMPATIBILITY CHECK ---
            let isValidDrop = false;
            if (heldItem) {
                const item = heldItem.item;
                // CHANGED: Look up definition for held item
                const def = ItemDefinitions[item.defId];
                
                if (def) {
                    // Normalization
                    const iSlot = (def.slot || def.type || '').toLowerCase().replace(/\s/g, '');
                    const sSlot = slotName.toLowerCase().replace(/\s/g, '');

                    // Validation logic
                    isValidDrop = (iSlot === sSlot) ||
                                  (sSlot === 'mainhand' && (iSlot === 'weapon' || iSlot === 'tool')) ||
                                  (sSlot === 'offhand' && (iSlot === 'shield' || iSlot === 'weapon'));
                }
            }

            // --- DYNAMIC STYLING ---
            let borderColor = "#333";
            let boxColor = "rgba(0,0,0,0.3)";
            let lineWidth = 1;

            if (isValidDrop) {
                // Highlighting for valid drag target
                borderColor = UITheme.colors.success; 
                boxColor = "rgba(46, 204, 113, 0.15)"; 
                lineWidth = 2;
            } else if (isSelected) {
                // Normal selection
                borderColor = isChoosingItem ? UITheme.colors.accent : UITheme.colors.textHighlight;
                boxColor = "rgba(255, 255, 255, 0.1)";
                lineWidth = 2;
            }

            // Register Hitbox
            hitboxes.push({ id: `SLOT_${slotName}`, x: slotX, y: slotY, w: slotW, h: this.SLOT_HEIGHT, type: 'slot', slotId: slotName });

            // Draw Box
            this.ui.drawRect(slotX, slotY, slotW, this.SLOT_HEIGHT, boxColor);
            this.ui.ctx.lineWidth = lineWidth;
            this.ui.drawRect(slotX, slotY, slotW, this.SLOT_HEIGHT, borderColor, false);
            this.ui.ctx.lineWidth = 1;

            // --- GHOSTING LOGIC ---
            // If dragging FROM this slot, hide the item visually
            let item = equipData[slotName];
            if (heldItem && heldItem.source === 'equipment' && heldItem.originSlot === slotName) {
                item = null; 
            }

            // CHANGED: Look up Definition
            let def = null;
            if (item && item.defId) {
                def = ItemDefinitions[item.defId];
            }

            const itemName = def ? def.name : "Empty";
            
            const iconX = isLeft ? (slotX + slotW - 36) : (slotX + 4);
            const textX = isLeft ? (slotX + slotW - 42) : (slotX + 42);
            const textW = slotW - 48;
            const align = isLeft ? "right" : "left";

            // CHANGED: Pass definition to drawIcon
            if (def) this._drawIcon(def, iconX, slotY + 8);

            // Draw Label
            this.ui.drawText(slotName.toUpperCase(), textX, slotY + 10, "bold 8px monospace", "#666", align);

            // Draw Item Name
            const nameFont = "11px sans-serif";
            const nameLines = this.ui.getWrappedLines(itemName, textW, nameFont);
            let nameY = slotY + 22;
            if (nameLines.length === 1) nameY += 4; 

            nameLines.forEach((line, i) => {
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

            hitboxes.push({ id: traitId, x: currentX, y: currentY, w: width, h: 22, type: 'trait' });

            this.ui.drawRect(currentX, currentY, width, 22, "rgba(255,255,255,0.1)");
            this.ui.drawText(def.name, currentX + width/2, currentY + 15, "11px sans-serif", "#ccc", "center");
            currentX += width + 8;
        });
    }

    _drawIcon(def, x, y) {
        if (!def) return;
        const sheet = this.loader.get('icons') || this.loader.get('items'); 
        if (!sheet) return;
        
        // CHANGED: Use def.icon directly
        const iconData = def.icon || {col:0, row:0};
        
        this.ui.drawSprite(sheet, iconData.col*32, iconData.row*32, 32, 32, x, y, 32, 32);
    }
}