import { UITheme } from '../../../ui/UITheme.js';
import { TRAIT_DEFINITIONS } from '../../../../../shared/data/traitDefinitions.js';
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';

export class EquipmentPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        this.SLOT_HEIGHT = 48;
        this.PORTRAIT_SIZE = 128;
        this.RENDER_SIZE = 32;
    }

    // Helper to extract the actual number whether it's an object or primitive
    _getVal(v) {
        return (v && typeof v === 'object') ? (v.total || v.value || 0) : (Number(v) || 0);
    }

    render(member, stats, activeSlots, selectedIndex, isChoosingItem, x, y, w, h, hitboxes, heldItem) {
        const centerX = Math.floor(x + (w / 2));
        let headerY = y + 10;

        // Extract the actual level number safely
        const actualLevel = this._getVal(stats.level) || this._getVal(member.level) || 1;

        // 1. Name & Level
        this.ui.drawText(member.name, centerX, headerY + 15, UITheme.fonts.header, UITheme.colors.textMain, "center");
        this.ui.drawText(`Level ${actualLevel}`, centerX, headerY + 36, UITheme.fonts.body, UITheme.colors.textHighlight, "center");

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
        const totalMaxHp = this._getVal(stats.maxHp) || this._getVal(member.maxHp);
        const totalMaxStm = this._getVal(stats.maxStamina) || this._getVal(member.maxStamina);
        const totalMaxIns = this._getVal(stats.maxInsight) || this._getVal(member.maxInsight);
        
        // Expanded checks for Max XP (handles xpToNext OR maxXp)
        const currentXp = this._getVal(stats.xp) || this._getVal(member.xp);
        const nextXp = this._getVal(stats.xpToNext) || this._getVal(member.xpToNext) || this._getVal(stats.maxXp) || this._getVal(member.maxXp) || 100;

        const hpText = `HP ${this._getVal(member.hp)}/${totalMaxHp}`;
        const stmText = `STM ${this._getVal(member.stamina)}/${totalMaxStm}`;
        const insText = `INS ${this._getVal(member.insight)}/${totalMaxIns}`;
        const xpText = `XP ${currentXp}/${nextXp}`;

        this.ui.ctx.font = UITheme.fonts.mono;
        const gap = 15;
        const totalW = this.ui.ctx.measureText(hpText + stmText + insText + xpText).width + (gap * 3);
        let startX = centerX - (totalW / 2);

        const drawVital = (txt, color) => {
            const width = this.ui.ctx.measureText(txt).width;
            this.ui.drawText(txt, startX + width/2, y, UITheme.fonts.mono, color, "center");
            startX += width + gap;
        };

        // Standardized Colors from UITheme
        drawVital(hpText, UITheme.colors.hp);
        drawVital(stmText, UITheme.colors.stm);
        drawVital(insText, UITheme.colors.ins); 
        drawVital(xpText, UITheme.colors.xp); 

        // Divider Line
        this.ui.drawRect(fullX + 20, y + 15, fullW - 40, 1, UITheme.colors.border);
    }

    _drawEquipmentLayout(member, activeSlots, selectedIndex, isChoosingItem, centerX, startY, w, hitboxes, heldItem) {
        const equipData = (member.state && member.state.equipment) ? member.state.equipment : (member.equipment || {});
        const splitIndex = Math.ceil(activeSlots.length / 2);
        
        // Portrait
        const pX = Math.floor(centerX - (this.PORTRAIT_SIZE / 2));
        const pY = startY + 10;

        this.ui.drawRect(pX, pY, this.PORTRAIT_SIZE, this.PORTRAIT_SIZE, UITheme.colors.border, false);

        let assetKey = member.spritePortrait;
        const img = this.loader.get(assetKey);

        if(img) {
            this.ui.drawSprite(
                img, 
                0, 0, 128, 128,                         // Source: Top-left 128px square
                pX, pY,                                 // Destination: Centered X, startY+10
                this.PORTRAIT_SIZE, this.PORTRAIT_SIZE  // Destination Size: Scaled down
            );
        }

        // --- ADD THIS LINE HERE ---
        this._drawStatusEffects(member, pX, pY, this.PORTRAIT_SIZE);
        
        // --- SLOT DRAWING HELPER ---
        const drawSlot = (slotName, index, isLeft) => {
            const globalIndex = isLeft ? index : splitIndex + index;
            const isSelected = (globalIndex === selectedIndex);
            
            const slotW = Math.floor((w - this.PORTRAIT_SIZE - 26) / 2);
            const slotX = isLeft ? (centerX - (this.PORTRAIT_SIZE/2) - slotW - 8) : (centerX + (this.PORTRAIT_SIZE/2) + 8);
            const slotY = startY + (index * (this.SLOT_HEIGHT + 4));

            // --- DROP COMPATIBILITY CHECK ---
            let isValidDrop = false;
            if (heldItem) {
                const item = heldItem.item;
                const def = ItemDefinitions[item.defId];
                
                if (def) {
                    const iSlot = (def.slot || def.type || '').toLowerCase().replace(/\s/g, '');
                    const sSlot = slotName.toLowerCase().replace(/\s/g, '');

                    isValidDrop = (iSlot === sSlot) ||
                                  (sSlot === 'mainhand' && (iSlot === 'weapon' || iSlot === 'tool')) ||
                                  (sSlot === 'offhand' && (iSlot === 'shield' || iSlot === 'weapon'));
                }
            }

           // --- DYNAMIC STYLING ---
            let borderColor = UITheme.colors.border;
            let boxColor = UITheme.colors.scrollTrack; 
            let lineWidth = 1;

            if (isValidDrop) {
                borderColor = UITheme.colors.success; 
                boxColor = "rgba(46, 204, 113, 0.15)"; 
                lineWidth = 2;
            }
            // Removed the `else if (isSelected)` background/border override here!

            hitboxes.push({ id: `SLOT_${slotName}`, x: slotX, y: slotY, w: slotW, h: this.SLOT_HEIGHT, type: 'slot', slotId: slotName });

            this.ui.drawRect(slotX, slotY, slotW, this.SLOT_HEIGHT, boxColor);
            this.ui.ctx.lineWidth = lineWidth;
            this.ui.drawRect(slotX, slotY, slotW, this.SLOT_HEIGHT, borderColor, false);
            this.ui.ctx.lineWidth = 1;

            // DRAW SELECTION BRACKETS
            if (isSelected) {
                const pulseDist = 2 + Math.abs(Math.sin(Date.now() / 300)) * 3; 
                this.ui.drawSelectionBrackets(slotX, slotY, slotW, this.SLOT_HEIGHT, pulseDist, UITheme.colors.selectedWhite);
            }

            // --- GHOSTING LOGIC ---
            let item = equipData[slotName];
            if (heldItem && heldItem.source === 'equipment' && heldItem.originSlot === slotName) {
                item = null; 
            }

            let def = null;
            if (item && item.defId) {
                def = ItemDefinitions[item.defId];
            }

           // --- NEW: Read level from the item instance! ---
            let itemName = "Empty";
            if (item && def) {
                itemName = def.name;
                // If the item instance has a level greater than 1, display it
                if (item.level && item.level > 1) {
                    itemName += ` Lv.${item.level}`; 
                }
            }
            
            const iconX = isLeft ? (slotX + slotW - 34) : (slotX + 2);
            const textX = isLeft ? (slotX + slotW - 38) : (slotX + 36);
            const textW = slotW - 40; 
            const align = isLeft ? "right" : "left";

            if (def) this._drawIcon(def, iconX, slotY + 8);

            this.ui.drawText(slotName.toUpperCase(), textX, slotY + 10, "bold 8px monospace", UITheme.colors.textMuted, align);

            const nameFont = "10px sans-serif";
            const nameLines = this.ui.getWrappedLines(itemName, textW, nameFont);
            let nameY = slotY + 22;
            if (nameLines.length === 1) nameY += 4; 

            nameLines.forEach((line, i) => {
                if (i < 2) {
                    const color = item ? UITheme.colors.textMain : UITheme.colors.textMuted;
                    this.ui.drawText(line, textX, nameY + (i * 12), nameFont, color, align);
                }
            });
        };

        activeSlots.slice(0, splitIndex).forEach((s, i) => drawSlot(s, i, true));
        activeSlots.slice(splitIndex).forEach((s, i) => drawSlot(s, i, false));
    }

    _drawTraitBadges(member, x, y, w, hitboxes) {
        const centerX = x + (w / 2);
        this.ui.drawText("Traits", centerX, y, UITheme.fonts.bold, UITheme.colors.textMuted, "center");
        
        let currentX = x + 30;
        let currentY = y + 20;
        const traits = member.traits || [];

        if (traits.length === 0) {
            this.ui.drawText("None", centerX, currentY, "italic 11px sans-serif", UITheme.colors.textMuted, "center");
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

            // Draw Background
            this.ui.drawRect(currentX, currentY, width, 22, UITheme.colors.bgScale[1]);
            
            // Box Border
            this.ui.drawRect(currentX, currentY, width, 22, UITheme.colors.border, false);

            this.ui.drawText(def.name, currentX + width/2, currentY + 15, "11px sans-serif", UITheme.colors.textMain, "center");
            currentX += width + 8;
        });
    }

    _drawIcon(def, x, y) {
        if (!def) return;
        
        let sheetName = 'items'; 
        const type = (def.type || '').toLowerCase();
        const slot = (def.slot || '').toLowerCase();
        
        if (slot === 'mainhand' || slot === 'offhand' || type === 'weapon' || type === 'shield' || type === 'tool') {
            sheetName = 'weapons';
        } else if (type === 'armor' || ['head', 'body', 'legs', 'feet', 'hands', 'accessory'].includes(slot)) {
            sheetName = 'armor';
        } else if (type === 'consumable') {
            sheetName = 'consumables';
        } else if (type === 'material') {
            sheetName = 'materials';
        }

        const sheet = this.loader.get(sheetName) || this.loader.get('items') || this.loader.get('icons'); 
        if (!sheet) return;
        
        const iconData = def.icon || {col:0, row:0};
        this.ui.drawSprite(sheet, iconData.col*32, iconData.row*32, 32, 32, x, y, 32, 32);
    }
    _drawStatusEffects(member, pX, pY, pSize) {
        if (!member.statusEffects || member.statusEffects.length === 0) return;

        // --- HARDCODED CONFIG ---
        const sheetKey = 'statusEffects'; 
        const srcSize = 32;  
        const drawSize = 16; 
        const spacing = 2; 

        const sheet = this.loader.get ? this.loader.get(sheetKey) : this.loader.getAsset(sheetKey);
        
        let drawX = pX + 2; 
        let drawY = pY + pSize - drawSize - 2;

        member.statusEffects.forEach(effect => {
            this.ui.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            this.ui.ctx.fillRect(drawX, drawY, drawSize, drawSize);

            if (sheet && effect.icon) {
                this.ui.ctx.drawImage(
                    sheet, 
                    effect.icon.col * srcSize, effect.icon.row * srcSize, srcSize, srcSize, 
                    drawX, drawY, drawSize, drawSize 
                );
            } else {
                // Notice we use this.ui.drawText here since EquipmentPanel routes through the UI manager
                this.ui.drawText(effect.name.charAt(0), drawX + (drawSize/2), drawY + (drawSize/2) + 3, "bold 10px sans-serif", "white", "center");
            }

            this.ui.ctx.strokeStyle = UITheme.colors.border;
            this.ui.ctx.strokeRect(drawX, drawY, drawSize, drawSize);

            if (effect.stacks && effect.stacks > 1) {
                this.ui.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                this.ui.ctx.beginPath();
                this.ui.ctx.arc(drawX + drawSize, drawY + drawSize, 6, 0, Math.PI * 2);
                this.ui.ctx.fill();
                
                this.ui.drawText(effect.stacks.toString(), drawX + drawSize, drawY + drawSize + 3, "bold 9px sans-serif", "white", "center");
            }

            drawX += (drawSize + spacing);
            
            if (drawX + drawSize > pX + pSize) return;
        });
    }
}