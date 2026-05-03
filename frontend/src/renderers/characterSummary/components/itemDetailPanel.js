import { UITheme } from '../../../ui/UITheme.js';
import { Formatting } from '../../../../../shared/utils/formatting.js';
import { AbilityDefinitions } from '../../../../../shared/data/abilityDefinitions.js';
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';

export class ItemDetailPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;

        // --- Strict Integer Scaling ---
        // Main icon snapped to 160x160 (32 * 5)
        this.ICON_SIZE = 160;
        // List icons snapped to 64x64 (32 * 2)
        this.ABILITY_ICON_SIZE = 64;
        
        this.SCROLLBAR_WIDTH = 10;
        
        this.lastItemId = null;
        this.totalContentHeight = 0;
    }

    render(item, x, y, w, h, state, hitboxes) {
        if (!item) {
            this.ui.drawText("No item selected", x + w / 2, y + 120, UITheme.fonts.cardItalic, UITheme.colors.textMuted, "center");
            return;
        }

        let def = item;
        let isAbility = false;

        if (item.defId) {
            def = ItemDefinitions[item.defId];
        } else if (item.abilityId) {
            def = AbilityDefinitions[item.abilityId];
            isAbility = true;
        } else if (AbilityDefinitions[item.id]) {
            def = AbilityDefinitions[item.id];
            isAbility = true;
        } else if (item.definition) {
            def = item.definition;
        }

        if (!def) {
            this.ui.drawText("Unknown Definition", x + w / 2, y + 120, UITheme.fonts.cardItalic, UITheme.colors.textMuted, "center");
            return;
        }

        const itemId = def.id || "unknown";
        if (itemId !== this.lastItemId) {
            state.scrollOffset = 0;
            this.lastItemId = itemId;
            this.totalContentHeight = 0;
        }

        const maxScroll = Math.max(0, this.totalContentHeight - h);
        
        if (state.layout) {
            state.layout.detailBounds = { x: x, y: y, w: w + 48, h: h };
            state.layout.detailMaxScroll = maxScroll;
            state.layout.detailViewportH = h;
        }

        if (state.scrollOffset > maxScroll) state.scrollOffset = maxScroll;
        if (state.scrollOffset < 0) state.scrollOffset = 0;

        this.ui.ctx.save();
        this.ui.startClip(x, y, w + 24, h);

        let currentY = y - state.scrollOffset;
        const initialDrawY = currentY;
        const centerX = Math.floor(x + w / 2);

        currentY = this._drawHeader(item, def, centerX, currentY, w, isAbility);
        
        const flourishW = w * 0.7;
        this.ui.drawLineWithGothicFlourish(x + (w - flourishW)/2, currentY + 24, flourishW, UITheme.colors.borderHighlight);
        currentY += 72;
        
        currentY = this._drawDescription(def, x + 36, currentY, w - 72);
        currentY += 36;

        if (!isAbility) {
            currentY = this._drawMainStats(item, x + 48, currentY, w - 96);
            currentY = this._drawAttributeBonuses(item, x + 48, currentY, w - 96);
            currentY = this._drawUpgradeCosts(item, def, x + 36, currentY, w - 72);
            currentY = this._drawAbilities(def, x + 36, currentY, w - 72);
        } else {
            currentY = this._drawAbilities({ grantedAbilities: [def.id] }, x + 36, currentY, w - 72);
        }

        this.totalContentHeight = currentY - initialDrawY;

        this.ui.endClip();
        this.ui.ctx.restore();

        if (this.totalContentHeight > h) {
            this.drawScrollBar(x + w + 14, y, h, this.totalContentHeight, state.scrollOffset, hitboxes, state);
        }
    }

    drawScrollBar(x, y, viewportH, contentH, scrollOffset, hitboxes, state) {
        this.ui.drawRect(x, y, this.SCROLLBAR_WIDTH, viewportH, UITheme.colors.scrollTrack || UITheme.colors.bgScale[0]);
        
        const viewRatio = viewportH / contentH;
        let thumbH = Math.max(48, viewportH * viewRatio);
        
        const maxScroll = contentH - viewportH;
        const scrollRatio = maxScroll > 0 ? (scrollOffset / maxScroll) : 0;
        const trackSpace = viewportH - thumbH;
        const thumbY = y + (scrollRatio * trackSpace);
        
        const isHovered = state && state.hoveredHitboxId === 'SCROLLBAR_THUMB';
        const baseColor = UITheme.colors.scrollThumb || UITheme.colors.borderHighlight;
        const thumbColor = isHovered ? UITheme.colors.states.hoverText : baseColor;
        
        this.ui.drawRect(x, thumbY, this.SCROLLBAR_WIDTH, thumbH, thumbColor);
        
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

    _drawHeader(item, def, centerX, y, w, isAbility) {
        const iconX = centerX - (this.ICON_SIZE / 2);
        
        this.ui.drawPanel(iconX, y, this.ICON_SIZE, this.ICON_SIZE, UITheme.colors.bgScale[2]);
        this.ui.drawRect(iconX, y, this.ICON_SIZE, this.ICON_SIZE, UITheme.colors.border, false);

        if (this.loader) {
            let sheetName = isAbility ? 'abilities' : 'items';
            const type = (def.type || '').toLowerCase();
            const slot = (def.slot || '').toLowerCase();

            if (!isAbility) {
                if (slot === 'mainhand' || slot === 'offhand' || type === 'weapon' || type === 'shield' || type === 'tool') {
                    sheetName = 'weapons';
                } else if (type === 'armor' || ['head', 'body', 'legs', 'feet', 'hands', 'accessory'].includes(slot)) {
                    sheetName = 'armor';
                } else if (type === 'consumable') {
                    sheetName = 'consumables';
                } else if (type === 'material') {
                    sheetName = 'materials';
                }
            }

            const sheet = this.loader.get(sheetName) || this.loader.get('items') || this.loader.get('icons');
            if (sheet) {
                const iconData = def.icon || { col: 0, row: 0 };
                this.ui.drawSprite(
                    sheet, 
                    iconData.col * 32, 
                    iconData.row * 32, 
                    32, 32, 
                    iconX, y, 
                    this.ICON_SIZE, this.ICON_SIZE
                );
            }
        }

        let currentY = y + this.ICON_SIZE + 48;
        
        const maxTextWidth = w - 96;
        const nameLines = this.ui.getWrappedLines(item.name || def.name, maxTextWidth, UITheme.fonts.header);
        const rarityColor = this._getRarityColor(def.rarity);
        
        const lineHeight = 48;
        nameLines.forEach(line => {
            this.ui.drawText(line, centerX, currentY, UITheme.fonts.header, rarityColor, "center");
            currentY += lineHeight;
        });

        currentY += 10;
        
        let typeText = isAbility ? "SKILL / ABILITY" : `${(def.type || "Item").toUpperCase()}`;
        if (def.slot && !isAbility) {
            typeText += ` - ${def.slot.toUpperCase()}`;
        }
        
        const itemLevel = item.level || def.level || def.itemLevel;
        if (itemLevel !== undefined) {
            typeText += ` • Lv. ${itemLevel}`;
        }

        this.ui.drawText(typeText, centerX, currentY, UITheme.fonts.cardMono, UITheme.colors.textMuted, "center");
        currentY += 34;

        const itemValue = item.value || def.value;
        if (itemValue !== undefined && !isAbility) {
            this.ui.drawText(`Value: ${itemValue}`, centerX, currentY, UITheme.fonts.cardMono, UITheme.colors.textMain, "center");
            currentY += 29;
        }

        return currentY;
    }

    _drawDescription(def, x, y, w) {
        const padding = 24;
        const contentW = w - (padding * 2);
        const contentX = x + padding;
        const centerX = x + (w / 2);
        
        let currentY = y;
        let hasContent = false;

        if (def.effectDescription) {
            const lines = this.ui.getWrappedLines(def.effectDescription, contentW, UITheme.fonts.body);
            lines.forEach(line => {
                this.ui.drawText(line, contentX, currentY, UITheme.fonts.body, UITheme.colors.textMain, "left");
                currentY += 34;
            });
            hasContent = true;
        }

        if (def.description) {
            if (hasContent) currentY += 19;
            const lines = this.ui.getWrappedLines(def.description, contentW, UITheme.fonts.cardItalic);
            lines.forEach(line => {
                this.ui.drawText(line, centerX, currentY, UITheme.fonts.cardItalic, UITheme.colors.textMuted, "center");
                currentY += 34;
            });
        }

        return currentY;
    }

    _drawMainStats(item, x, y, w) {
        let currentY = y;
        const source = item.stats || item;
        
        const primaryStats = [
            { key: 'damage', label: 'ATK', color: UITheme.colors.attack },
            { key: 'attack', label: 'ATK', color: UITheme.colors.attack },
            { key: 'defense', label: 'DEF', color: UITheme.colors.defense },
            { key: 'block', label: 'BLK', color: UITheme.colors.resistance }
        ];

        let hasPrinted = false;

        primaryStats.forEach(stat => {
            const val = source[stat.key];
            if (val === undefined || val === null) return;
            if (typeof val === 'object' && typeof val.min === 'undefined') return;

            this.ui.drawText(stat.label, x, currentY, UITheme.fonts.cardTitle, stat.color, "left");
            
            let valStr = val;
            if (typeof val === 'object' && val.min !== undefined) {
                valStr = `${val.min}-${val.max}`;
            }
            
            this.ui.drawText(valStr.toString(), x + w, currentY, UITheme.fonts.mono, stat.color, "right");
            currentY += 38;
            hasPrinted = true;
        });

        ['attack', 'defense', 'resistance'].forEach(category => {
            if (!source[category]) return;
            const subStats = source[category];
            if (typeof subStats !== 'object') return;

            Object.keys(subStats).forEach(k => {
                if (k === 'min' || k === 'max') return;
                if (subStats[k] === 0) return;

                const typeAbbr = Formatting.getAbbreviation ? Formatting.getAbbreviation(k) : k.substring(0,3).toUpperCase();
                const catAbbr = category === 'resistance' ? 'RES' : (category === 'defense' ? 'DEF' : 'ATK');
                const label = `${typeAbbr} ${catAbbr}`;
                const color = category === 'attack' ? UITheme.colors.attack : (category === 'defense' ? UITheme.colors.defense : UITheme.colors.resistance);

                this.ui.drawText(label, x, currentY, UITheme.fonts.small, color, "left");
                this.ui.drawText(subStats[k].toString(), x + w, currentY, UITheme.fonts.mono, color, "right");
                currentY += 34;
                hasPrinted = true;
            });
        });

        return hasPrinted ? currentY + 19 : currentY;
    }

    _drawAttributeBonuses(item, x, y, w) {
        let currentY = y;
        
        const attributes = item.attributes || (item.stats ? item.stats.attributes : {}) || {};
        const attrKeys = Object.keys(attributes);
        const resources = item.resources || {};
        const resKeys = Object.keys(resources);
        
        if (attrKeys.length === 0 && resKeys.length === 0) return currentY;

        this.ui.drawText("Bonuses", x, currentY, UITheme.fonts.cardTitle, UITheme.colors.textMuted, "left");
        currentY += 34;

        attrKeys.forEach(key => {
            const val = attributes[key];
            if (val === 0) return;

            const label = Formatting.getAbbreviation ? Formatting.getAbbreviation(key) : key.substring(0,3).toUpperCase();
            const valStr = Formatting.formatSigned(val);

            this.ui.drawText(label, x + 24, currentY, UITheme.fonts.mono, UITheme.colors.textMain, "left");
            this.ui.drawText(valStr, x + w, currentY, UITheme.fonts.mono, UITheme.colors.textMain, "right");
            currentY += 34;
        });
        
        resKeys.forEach(key => {
            const val = resources[key];
            if (val === 0) return;

            let label = key;
            let color = UITheme.colors.textMain;
            if (key === 'maxHp') { label = "Max HP"; color = UITheme.colors.hp; }
            else if (key === 'maxStamina') { label = "Max STM"; color = UITheme.colors.stm; }
            else if (key === 'maxInsight') { label = "Max INS"; color = UITheme.colors.ins; }

            const valStr = Formatting.formatSigned(val);

            this.ui.drawText(label, x + 24, currentY, UITheme.fonts.mono, color, "left");
            this.ui.drawText(valStr, x + w, currentY, UITheme.fonts.mono, color, "right");
            currentY += 34;
        });

        return currentY + 19;
    }

    _drawUpgradeCosts(item, def, x, y, w) {
        let currentY = y;
        const isMax = item.isMaxLevel !== undefined ? item.isMaxLevel : (item.level >= def.maxLevel);
        
        if (isMax) {
            this.ui.drawText("Max Level Reached", x + w/2, currentY, UITheme.fonts.cardTitle, UITheme.colors.textMuted, "center");
            return currentY + 36;
        }

        const currentLevel = item.level || 1;
        const nextLevel = currentLevel + 1;
        const costs = item.nextUpgradeCost || (def.upgradeCosts ? def.upgradeCosts[nextLevel] : null);

        if (!costs) return currentY;

        this.ui.drawText(`Upgrade to Lv. ${nextLevel}`, x, currentY, UITheme.fonts.cardTitle, UITheme.colors.textMuted, "left");
        currentY += 19;
        this.ui.drawLineWithGothicFlourish(x + w * 0.1, currentY, w * 0.8, UITheme.colors.borderHighlight);
        currentY += 29;

        if (costs.currency) {
            this.ui.drawText("Currency", x + 24, currentY, UITheme.fonts.mono, UITheme.colors.textMain, "left");
            this.ui.drawText(costs.currency.toString(), x + w, currentY, UITheme.fonts.mono, UITheme.colors.textMain, "right");
            currentY += 34;
        }

        if (costs.materials) {
            Object.keys(costs.materials).forEach(matId => {
                const amount = costs.materials[matId];
                const label = matId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                this.ui.drawText(label, x + 24, currentY, UITheme.fonts.mono, UITheme.colors.textMain, "left");
                this.ui.drawText(amount.toString(), x + w, currentY, UITheme.fonts.mono, UITheme.colors.textMain, "right");
                currentY += 34;
            });
        }

        return currentY + 24;
    }

    _drawAbilities(def, x, y, w) {
        let currentY = y;
        const abilityList = def.grantedAbilities || (def.useAbility ? [def.useAbility] : []);
        
        if (abilityList.length > 0) {
            const label = def.useAbility ? "On Use" : "Details";
            this.ui.drawText(label, x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
            currentY += 19;
            this.ui.drawLineWithGothicFlourish(x + w * 0.1, currentY, w * 0.8, UITheme.colors.borderHighlight);
            currentY += 36;

            abilityList.forEach(abilityId => {
                const ab = AbilityDefinitions[abilityId];
                if (!ab) return;

                const cardPadding = 19;
                const iconSize = this.ABILITY_ICON_SIZE;
                const gap = 24;
                
                const iconX = x + cardPadding;
                const contentX = iconX + iconSize + gap;
                const contentW = w - (cardPadding * 2) - iconSize - gap;

                const descFont = UITheme.fonts.cardItalic;
                const descLines = ab.description ? this.ui.getWrappedLines(ab.description, contentW, descFont) : [];
                
                const headerHeight = 34;
                const statsHeight = 34;
                const dividerHeight = 14;
                const descTextHeight = descLines.length > 0 ? (descLines.length * 31) : 0;
                
                const contentHeight = headerHeight + 10 + statsHeight + dividerHeight + descTextHeight;
                // Ensure card is at least as tall as the icon + padding
                const cardHeight = Math.max(contentHeight, iconSize) + (cardPadding * 2);

                this.ui.drawPanel(x, currentY, w, cardHeight, UITheme.colors.bgScale[0]);
                
                // Center icon vertically within the card padding area
                const iconY = currentY + cardPadding + (cardHeight - iconSize - cardPadding * 2) / 2;
                
                this.ui.drawPanel(iconX, iconY, iconSize, iconSize, UITheme.colors.bgScale[2]);
                this._drawAbilityIcon(ab, iconX, iconY);
                this.ui.drawRect(iconX, iconY, iconSize, iconSize, UITheme.colors.border, false);

                let cursorY = currentY + cardPadding + 24;
                
                this.ui.drawText(ab.name || abilityId, contentX, cursorY, UITheme.fonts.cardTitle, UITheme.colors.textMain, "left");
                
                if (ab.cost) {
                    let costStr = "";
                    let costCol = UITheme.colors.textMuted;
                    if (ab.cost.mana) { costStr = `${ab.cost.mana} MP`; costCol = UITheme.colors.defense; }
                    else if (ab.cost.stamina) { costStr = `${ab.cost.stamina} STM`; costCol = UITheme.colors.stm; }
                    else if (ab.cost.insight) { costStr = `${ab.cost.insight} INS`; costCol = UITheme.colors.ins; }
                    
                    this.ui.drawText(costStr, x + w - cardPadding, cursorY, UITheme.fonts.cardMono, costCol, "right");
                }
                
                cursorY += 38;

                let statX = contentX;
                const drawStat = (label, value, color) => {
                    const txt = `${label} ${value}`;
                    this.ui.drawText(txt, statX, cursorY, UITheme.fonts.cardMono, color, "left");
                    // Utilizing ctx measure logic directly, just visually cleaned up
                    statX += (this.ui.ctx.measureText(txt).width) + 29; 
                };

                this.ui.ctx.font = UITheme.fonts.cardMono;
                
                if (ab.effects) {
                    const dmg = ab.effects.find(e => e.type === 'damage' || e.type === 'heal');
                    if (dmg) drawStat("Pwr:", `${dmg.power}x`, UITheme.colors.textHighlight);
                }
                if (ab.accuracy) drawStat("Acc:", `${Math.floor(ab.accuracy*100)}%`, UITheme.colors.textMuted);
                if (ab.speed) drawStat("Spd:", ab.speed, UITheme.colors.textMuted);
                
                cursorY += 24;

                if (descLines.length > 0) {
                    this.ui.drawLineWithGothicFlourish(contentX, cursorY, contentW * 0.8, UITheme.colors.borderHighlight);
                    cursorY += 34;
                    descLines.forEach(line => {
                        this.ui.drawText(line, contentX, cursorY, descFont, UITheme.colors.textMuted, "left");
                        cursorY += 31;
                    });
                }

                currentY += cardHeight + 19;
            });
        }
        
        return currentY + 12;
    }

    _drawAbilityIcon(ability, x, y) {
        if (!this.loader) return;
        const sheet = this.loader.get('abilities') || this.loader.get('items');
        
        if (sheet) {
            const iconData = ability.icon || { col: 0, row: 0 };
            // Reading source stays 32x32, rendering snaps to ABILITY_ICON_SIZE (64x64)
            this.ui.drawSprite(
                sheet, 
                iconData.col * 32, 
                iconData.row * 32, 
                32, 32, 
                x, y, 
                this.ABILITY_ICON_SIZE, this.ABILITY_ICON_SIZE
            );
        } else {
            this.ui.drawPanel(x, y, this.ABILITY_ICON_SIZE, this.ABILITY_ICON_SIZE, UITheme.colors.bgScale[1]);
        }
    }

    _getRarityColor(rarity) {
        switch ((rarity || "").toLowerCase()) {
            case 'common': return "#ffffff";
            case 'uncommon': return "#1eff00";
            case 'rare': return "#0070dd";
            case 'epic': return "#a335ee";
            case 'legendary': return "#ff8000";
            default: return UITheme.colors.textMuted;
        }
    }
}