import { UITheme } from '../../../ui/UITheme.js';
import { TRAIT_DEFINITIONS } from '../../../../../shared/data/traitDefinitions.js';
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';

export class EquipmentPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        this.SLOT_HEIGHT = 115;
        this.PORTRAIT_SIZE = 307;
        this.RENDER_SIZE = 77;
    }

    _getVal(v) {
        return (v && typeof v === 'object') ? (v.total || v.value || 0) : (Number(v) || 0);
    }

    render(member, stats, activeSlots, selectedIndex, isChoosingItem, x, y, w, h, hitboxes, heldItem) {
        const centerX = Math.floor(x + (w / 2));
        let headerY = y + 24;

        const actualLevel = this._getVal(stats.level) || this._getVal(member.level) || 1;

        this.ui.drawText(member.name, centerX, headerY + 36, UITheme.fonts.header, UITheme.colors.textMain, "center");
        this.ui.drawText(`Level ${actualLevel}`, centerX, headerY + 86, UITheme.fonts.body, UITheme.colors.textHighlight, "center");

        this._drawVitals(member, stats, centerX, headerY + 139, x, w);

        const equipStartY = y + 228; 
        this._drawEquipmentLayout(member, activeSlots, selectedIndex, isChoosingItem, centerX, equipStartY, w, hitboxes, heldItem);

        const traitsStartY = equipStartY + Math.max(this.PORTRAIT_SIZE, activeSlots.length/2 * 125) + 60;
        this._drawTraitBadges(member, x, traitsStartY, w, hitboxes);
    }

    _drawVitals(member, stats, centerX, y, fullX, fullW) {
        const totalMaxHp = this._getVal(stats.maxHp) || this._getVal(member.maxHp);
        const totalMaxStm = this._getVal(stats.maxStamina) || this._getVal(member.maxStamina);
        const totalMaxIns = this._getVal(stats.maxInsight) || this._getVal(member.maxInsight);
        
        const currentXp = this._getVal(stats.xp) || this._getVal(member.xp);
        const nextXp = this._getVal(stats.xpToNext) || this._getVal(member.xpToNext) || this._getVal(stats.maxXp) || this._getVal(member.maxXp) || 100;

        const hpText = `HP ${this._getVal(member.hp)}/${totalMaxHp}`;
        const stmText = `STM ${this._getVal(member.stamina)}/${totalMaxStm}`;
        const insText = `INS ${this._getVal(member.insight)}/${totalMaxIns}`;
        const xpText = `XP ${currentXp}/${nextXp}`;

        this.ui.ctx.font = UITheme.fonts.mono;
        const gap = 36;
        const totalW = this.ui.ctx.measureText(hpText + stmText + insText + xpText).width + (gap * 3);
        let startX = centerX - (totalW / 2);

        const drawVital = (txt, color) => {
            const width = this.ui.ctx.measureText(txt).width;
            this.ui.drawText(txt, startX + width/2, y, UITheme.fonts.mono, color, "center");
            startX += width + gap;
        };

        drawVital(hpText, UITheme.colors.hp);
        drawVital(stmText, UITheme.colors.stm);
        drawVital(insText, UITheme.colors.ins); 
        drawVital(xpText, UITheme.colors.xp); 

        // Gothic flourish instead of basic line divider
        this.ui.drawLineWithGothicFlourish(fullX + 96, y + 36, fullW - 192, UITheme.colors.border);
    }

    _drawEquipmentLayout(member, activeSlots, selectedIndex, isChoosingItem, centerX, startY, w, hitboxes, heldItem) {
        const equipData = (member.state && member.state.equipment) ? member.state.equipment : (member.equipment || {});
        const splitIndex = Math.ceil(activeSlots.length / 2);
        
        // --- Check if Mainhand holds a Two-Handed Weapon ---
        let isOffhandBlocked = false;
        const mhKey = Object.keys(equipData).find(k => k.toLowerCase() === 'mainhand');
        if (mhKey && equipData[mhKey]) {
            const mhDef = ItemDefinitions[equipData[mhKey].defId];
            if (mhDef) {
                const mhSlot = (mhDef.slot || mhDef.type || '').toLowerCase().replace(/[\s-]/g, '');
                if (mhSlot.includes('twohand')) {
                    isOffhandBlocked = true;
                }
            }
        }

        const pX = Math.floor(centerX - (this.PORTRAIT_SIZE / 2));
        const pY = startY + 24;

        // Elegant portrait background
        this.ui.drawPanel(pX, pY, this.PORTRAIT_SIZE, this.PORTRAIT_SIZE, UITheme.colors.bgScale[0]);

        let assetKey = member.spritePortrait;
        const img = this.loader.get(assetKey);

        if(img) {
            this.ui.drawSprite(img, 0, 0, 128, 128, pX, pY, this.PORTRAIT_SIZE, this.PORTRAIT_SIZE);
        }

        this._drawStatusEffects(member, pX, pY, this.PORTRAIT_SIZE);
        
        const drawSlot = (slotName, index, isLeft) => {
            const globalIndex = isLeft ? index : splitIndex + index;
            const isSelected = (globalIndex === selectedIndex);
            
            const slotW = Math.floor((w - this.PORTRAIT_SIZE - 62) / 2);
            const slotX = isLeft ? (centerX - (this.PORTRAIT_SIZE/2) - slotW - 19) : (centerX + (this.PORTRAIT_SIZE/2) + 19);
            const slotY = startY + (index * (this.SLOT_HEIGHT + 10));

            // --- Determine if this specific slot is blocked ---
            const isOffhandSlot = slotName.toLowerCase().replace(/\s/g, '') === 'offhand';
            const isBlocked = isOffhandSlot && isOffhandBlocked;

            // --- Updated Drop Compatibility Logic ---
            let isValidDrop = false;
            if (heldItem) {
                const item = heldItem.item;
                const def = ItemDefinitions[item.defId];
                
                if (def) {
                    const iSlot = (def.slot || def.type || '').toLowerCase().replace(/[\s-]/g, '');
                    const sSlot = slotName.toLowerCase().replace(/\s/g, '');

                    isValidDrop = (iSlot === sSlot) ||
                                  // Mainhand accepts generic weapons/tools, two-handed, AND one-handed
                                  (sSlot === 'mainhand' && (iSlot === 'weapon' || iSlot === 'tool' || iSlot === 'onehand' || iSlot.includes('twohand'))) ||
                                  // Offhand accepts shields, generic weapons, AND one-handed, but explicitly rejects two-handed
                                  (sSlot === 'offhand' && (iSlot === 'shield' || iSlot === 'weapon' || iSlot === 'onehand') && !iSlot.includes('twohand'));
                }
            }

            // --- DYNAMIC STYLING ---
            let boxColor = UITheme.colors.panelBg; 

            // Highlight backgrounds based on drop validity
            if (isValidDrop && !isBlocked) {
                boxColor = "rgba(201, 180, 117, 0.15)"; // Estus Gold Tint
            } else if (isBlocked) {
                boxColor = "rgba(140, 28, 28, 0.15)"; // Dark Crimson Tint
            }

            hitboxes.push({ id: `SLOT_${slotName}`, x: slotX, y: slotY, w: slotW, h: this.SLOT_HEIGHT, type: 'slot', slotId: slotName });

            // Draw Base Slot Panel
            this.ui.drawPanel(slotX, slotY, slotW, this.SLOT_HEIGHT, boxColor);

            // Draw Drop Status Brackets (Overrides standard highlight)
            if (isValidDrop && !isBlocked) {
                this.ui.drawSelectionBrackets(slotX, slotY, slotW, this.SLOT_HEIGHT, 5, UITheme.colors.success);
            } else if (isBlocked) {
                this.ui.drawSelectionBrackets(slotX, slotY, slotW, this.SLOT_HEIGHT, 5, UITheme.colors.failure);
            }

            // Draw User Selection Brackets
            if (isSelected) {
                const pulseDist = 10 + Math.sin(Date.now() / 150) * 5;
                this.ui.drawSelectionBrackets(slotX, slotY, slotW, this.SLOT_HEIGHT, pulseDist, UITheme.colors.borderHighlight);
            }

            let item = equipData[slotName];
            if (heldItem && heldItem.source === 'equipment' && heldItem.originSlot === slotName) {
                item = null; 
            }

            let def = null;
            if (item && item.defId) {
                def = ItemDefinitions[item.defId];
            }

            // --- Override Text & Icon if Blocked ---
            let itemName = "Empty";
            if (isBlocked) {
                itemName = "Blocked";
                item = null; 
                def = null;  
            } else if (item && def) {
                itemName = def.name;
                if (item.level && item.level > 1) {
                    itemName += ` Lv.${item.level}`; 
                }
            }
            
            const iconX = isLeft ? (slotX + slotW - 82) : (slotX + 5);
            const textX = isLeft ? (slotX + slotW - 91) : (slotX + 86);
            const textW = slotW - 96; 
            const align = isLeft ? "right" : "left";

            if (def) this._drawIcon(def, iconX, slotY + 19);

            this.ui.drawText(slotName.toUpperCase(), textX, slotY + 29, UITheme.fonts.cardMono, UITheme.colors.textMuted, align);

            const nameLines = this.ui.getWrappedLines(itemName, textW, UITheme.fonts.cardSmall);
            let nameY = slotY + 58;
            if (nameLines.length === 1) nameY += 10; 

            nameLines.forEach((line, i) => {
                if (i < 2) {
                    let color = UITheme.colors.textMuted;
                    if (isBlocked) {
                        color = UITheme.colors.failure;
                    } else if (item) {
                        color = UITheme.colors.textMain;
                    }
                    this.ui.drawText(line, textX, nameY + (i * 29), UITheme.fonts.cardSmall, color, align);
                }
            });
        };

        activeSlots.slice(0, splitIndex).forEach((s, i) => drawSlot(s, i, true));
        activeSlots.slice(splitIndex).forEach((s, i) => drawSlot(s, i, false));
    }

    _drawTraitBadges(member, x, y, w, hitboxes) {
        const centerX = x + (w / 2);
        this.ui.drawText("Traits", centerX, y, UITheme.fonts.bold, UITheme.colors.textMuted, "center");
        this.ui.drawLineWithGothicFlourish(centerX - 120, y + 19, 240, UITheme.colors.border);
        
        let currentX = x + 72;
        let currentY = y + 60;
        const traits = member.traits || [];

        if (traits.length === 0) {
            this.ui.drawText("None", centerX, currentY + 29, UITheme.fonts.cardItalic, UITheme.colors.textMuted, "center");
            return;
        }

        traits.forEach(traitId => {
            const def = TRAIT_DEFINITIONS[traitId] || { name: traitId };
            const width = this.ui.ctx.measureText(def.name).width + 48;
            
            if (currentX + width > x + w - 72) {
                currentX = x + 72;
                currentY += 72;
            }

            hitboxes.push({ id: traitId, x: currentX, y: currentY, w: width, h: 53, type: 'trait' });

            this.ui.drawPanel(currentX, currentY, width, 53, UITheme.colors.bgScale[1]);
            this.ui.drawText(def.name, currentX + width/2, currentY + 34, UITheme.fonts.cardSmall, UITheme.colors.textMain, "center", "middle");
            currentX += width + 19;
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
        this.ui.drawSprite(sheet, iconData.col*32, iconData.row*32, 32, 32, x, y, 77, 77);
    }

    _drawStatusEffects(member, pX, pY, pSize) {
        if (!member.statusEffects || member.statusEffects.length === 0) return;

        const sheetKey = 'statusEffects'; 
        const srcSize = 32;  
        const drawSize = 38; 
        const spacing = 5; 

        const sheet = this.loader.get ? this.loader.get(sheetKey) : this.loader.getAsset(sheetKey);
        
        let drawX = pX + 5; 
        let drawY = pY + pSize - drawSize - 5;

        member.statusEffects.forEach(effect => {
            this.ui.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            this.ui.ctx.fillRect(drawX, drawY, drawSize, drawSize);

            if (sheet && effect.icon) {
                this.ui.ctx.drawImage(
                    sheet, 
                    effect.icon.col * srcSize, effect.icon.row * srcSize, srcSize, srcSize, 
                    drawX, drawY, drawSize, drawSize 
                );
            } else {
                this.ui.drawText(effect.name.charAt(0), drawX + (drawSize/2), drawY + (drawSize/2), UITheme.fonts.cardSmall, "white", "center", "middle");
            }

            this.ui.ctx.strokeStyle = UITheme.colors.border;
            this.ui.ctx.strokeRect(drawX, drawY, drawSize, drawSize);

            if (effect.stacks && effect.stacks > 1) {
                this.ui.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                this.ui.ctx.beginPath();
                this.ui.ctx.arc(drawX + drawSize, drawY + drawSize, 14, 0, Math.PI * 2);
                this.ui.ctx.fill();
                
                this.ui.drawText(effect.stacks.toString(), drawX + drawSize, drawY + drawSize, UITheme.fonts.cardSmall, "white", "center", "middle");
            }

            drawX += (drawSize + spacing);
            
            if (drawX + drawSize > pX + pSize) return;
        });
    }
}