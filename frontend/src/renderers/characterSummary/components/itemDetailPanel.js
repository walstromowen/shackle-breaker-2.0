import { UITheme } from '../../../ui/UITheme.js';
import { Formatting } from '../../../../../shared/utils/formatting.js';
import { AbilityDefinitions } from '../../../../../shared/data/abilityDefinitions.js';
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';

export class ItemDetailPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;

        // --- Strict Integer Scaling & Layout Constants ---
        this.ICON_SIZE = 160;          // Main icon snapped to 160x160 (32 * 5)
        this.ABILITY_ICON_SIZE = 64;   // List icons snapped to 64x64 (32 * 2)
        this.MATERIAL_ICON_SIZE = 24;  // Material icons snapped to 24x24
        this.SCROLLBAR_WIDTH = 10;

        // --- Vertical Rhythm & Spacing ---
        this.layout = {
            padding: 24,         // Outer padding for panels
            innerPadding: 16,    // Inner padding for nested cards
            sectionGap: 36,      // Space between major sections
            lineHeight: 28,      // Standard text line height
            headerHeight: 44,    // Header text line height
            titleHeight: 36,     // Subtitle/Title line height
            dividerGap: 24       // Space around dividers
        };

        this.lastItemId = null;
        this.totalContentHeight = 0;
    }

    render(item, x, y, w, h, state, hitboxes) {
        if (!item) {
            this.ui.drawText("No item selected", x + w / 2, y + h / 2, UITheme.fonts.cardItalic, UITheme.colors.textMuted, "center");
            return;
        }

        let def = this._resolveDefinition(item);
        const isAbility = !!(item.abilityId || AbilityDefinitions[item.id] || (def && def.type === 'ability'));

        if (!def) {
            this.ui.drawText("Unknown Definition", x + w / 2, y + h / 2, UITheme.fonts.cardItalic, UITheme.colors.textMuted, "center");
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
            state.layout.detailBounds = { x, y, w: w + 48, h };
            state.layout.detailMaxScroll = maxScroll;
            state.layout.detailViewportH = h;
        }

        state.scrollOffset = Math.max(0, Math.min(state.scrollOffset, maxScroll));

        this.ui.ctx.save();
        this.ui.startClip(x, y, w + 24, h);
        const initialDrawY = y - state.scrollOffset;
        let currentY = initialDrawY;

        // Content Area Bounds (used for inner content padding)
        const contentX = x + this.layout.padding;
        const contentW = w - (this.layout.padding * 2);

        // --- Render Sections ---
        currentY = this._drawHeader(item, def, x, currentY, w, isAbility);
        currentY += this.layout.innerPadding;

        // Main Icon & Text Info Layout
        currentY = this._drawMainInfo(def, contentX, currentY, contentW, isAbility);

        if (!isAbility) {
            currentY = this._drawStatsGrid(item, def, contentX, currentY, contentW);
            currentY = this._drawUpgradeCosts(item, def, contentX, currentY, contentW);
            currentY = this._drawAbilities(def, contentX, currentY, contentW);
        } else {
            currentY = this._drawAbilities({ grantedAbilities: [def.id] }, contentX, currentY, contentW);
        }

        this.totalContentHeight = currentY - initialDrawY + this.layout.padding;
        this.ui.endClip();
        this.ui.ctx.restore();

        if (this.totalContentHeight > h) {
            this.drawScrollBar(x + w + 14, y, h, this.totalContentHeight, state.scrollOffset, hitboxes, state);
        }
    }

    _resolveDefinition(item) {
        if (item.defId) return ItemDefinitions[item.defId];
        if (item.abilityId) return AbilityDefinitions[item.abilityId];
        if (AbilityDefinitions[item.id]) return AbilityDefinitions[item.id];
        if (item.definition) return item.definition;
        return item;
    }

    drawScrollBar(x, y, viewportH, contentH, scrollOffset, hitboxes, state) {
        this.ui.drawRect(x, y, this.SCROLLBAR_WIDTH, viewportH, UITheme.colors.scrollTrack || UITheme.colors.bgScale[0]);
        const viewRatio = viewportH / contentH;
        const thumbH = Math.max(48, viewportH * viewRatio);
        const maxScroll = contentH - viewportH;
        const scrollRatio = maxScroll > 0 ? (scrollOffset / maxScroll) : 0;
        const thumbY = y + (scrollRatio * (viewportH - thumbH));

        const isHovered = state && state.hoveredHitboxId === 'SCROLLBAR_THUMB';
        const thumbColor = isHovered ? UITheme.colors.states.hoverText : (UITheme.colors.scrollThumb || UITheme.colors.borderHighlight);

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

    _formatValue(val, forceSign = false) {
        if (typeof val !== 'number') return val;
        let isDecimal = val % 1 !== 0;
        let displayVal = isDecimal ? +(val * 100).toFixed(1) : val;
        let str = '';
        if (forceSign && displayVal > 0) str += '+';
        str += displayVal;
        if (isDecimal) str += '%';
        return str;
    }

    _getStatColor(rawKey) {
        if (!rawKey) return UITheme.colors.textMain;
        const k = rawKey.toLowerCase();
        if (UITheme.colors[k]) return UITheme.colors[k];
        if (UITheme.colors.types && UITheme.colors.types[k]) return UITheme.colors.types[k];
        if (k.includes('hp') || k.includes('health')) return UITheme.colors.hp || "#8c1c1c";
        if (k.includes('stm') || k.includes('stamina')) return UITheme.colors.stm || "#4a5d4e";
        if (k.includes('ins') || k.includes('insight')) return UITheme.colors.ins || "#4a5b70";
        if (k.includes('atk') || k.includes('attack') || k.includes('damage')) return UITheme.colors.attack || "#9e1a1a";
        if (k.includes('def') || k.includes('block')) return UITheme.colors.defense || "#4a5b70";
        if (k.includes('res')) return UITheme.colors.resistance || "#8a8578";
        return UITheme.colors.textMain;
    }

    _getRarityColor(rarity) {
        switch ((rarity || "").toLowerCase()) {
            case 'common':    return "#ffffff";
            case 'uncommon':  return "#1eff00";
            case 'rare':      return "#0070dd";
            case 'epic':      return "#a335ee";
            case 'legendary': return "#ff8000";
            default:          return UITheme.colors.textMuted;
        }
    }

    _drawHeader(item, def, x, y, w, isAbility) {
        let currentY = y;
        const color = this._getRarityColor(def.rarity);
        const title = item.name || def.name || "Unknown";
        const itemLevel = item.level || def.level || def.itemLevel;
        const weight = item.weight !== undefined ? item.weight : def.weight;
        const value = item.value !== undefined ? item.value : def.value;

        let typeText = isAbility ? "SKILL / ABILITY" : `${(def.type || "Item").toUpperCase()}`;
        if (def.slot && !isAbility) {
            typeText += ` - ${def.slot.toUpperCase()}`;
        }

        // Background Banner
        this.ui.ctx.save();
        this.ui.ctx.fillStyle = color;
        this.ui.ctx.globalAlpha = 0.12;
        this.ui.ctx.fillRect(x, currentY, w, 85);
        this.ui.ctx.restore();

        const headerFont = UITheme.fonts.cardTitle || UITheme.fonts.header;
        const typeFont   = UITheme.fonts.cardItalic || UITheme.fonts.italic;
        const bodyFont   = UITheme.fonts.cardSmall || UITheme.fonts.body;

        // Header Text
        this.ui.drawText(title, x + this.layout.padding, currentY + 40, headerFont, color, "left");
        if (itemLevel !== undefined) {
            this.ui.drawText(`Lv. ${itemLevel}`, x + w - this.layout.padding, currentY + 40, headerFont, UITheme.colors.textHighlight, "right");
        }

        this.ui.drawText(typeText, x + this.layout.padding, currentY + 74, typeFont, UITheme.colors.textMuted, "left");

        if (weight !== undefined || value !== undefined) {
            const rightMeta = [];
            if (weight !== undefined) rightMeta.push(`Wt: ${weight}`);
            if (value !== undefined) rightMeta.push(`Val: ${value}g`);
            this.ui.drawText(rightMeta.join("   "), x + w - this.layout.padding, currentY + 74, bodyFont, UITheme.colors.textMuted, "right");
        }

        // Banner Border
        this.ui.ctx.save();
        this.ui.ctx.strokeStyle = color;
        this.ui.ctx.globalAlpha = 0.6;
        this.ui.ctx.beginPath();
        this.ui.ctx.moveTo(x, currentY + 85);
        this.ui.ctx.lineTo(x + w, currentY + 85);
        this.ui.ctx.stroke();
        this.ui.ctx.restore();

        return currentY + 85 + this.layout.padding;
    }

    _drawMainInfo(def, x, y, w, isAbility) {
        let textY = y;
        const iconSize = this.ICON_SIZE;

        // Draw Main Icon (Left Aligned)
        this.ui.drawPanel(x, y, iconSize, iconSize, UITheme.colors.bgScale[2]);
        this.ui.drawRect(x, y, iconSize, iconSize, UITheme.colors.border, false);
        this._drawMainIcon(def, x, y, isAbility);

        // Calculate Text Bounds (Right of Image)
        const textX = x + iconSize + this.layout.innerPadding;
        const textW = w - iconSize - this.layout.innerPadding;

        let hasContent = false;
        if (def.effectDescription) {
            const lines = this.ui.getWrappedLines(def.effectDescription, textW, UITheme.fonts.body);
            lines.forEach(line => {
                this.ui.drawText(line, textX, textY, UITheme.fonts.body, UITheme.colors.textMain, "left");
                textY += this.layout.lineHeight;
            });
            hasContent = true;
        }

        if (def.description) {
            if (hasContent) textY += this.layout.innerPadding;
            const lines = this.ui.getWrappedLines(`"${def.description}"`, textW, UITheme.fonts.cardItalic);
            lines.forEach(line => {
                this.ui.drawText(line, textX, textY, UITheme.fonts.cardItalic, UITheme.colors.textMuted, "left");
                textY += this.layout.lineHeight;
            });
            hasContent = true;
        }

        // Return whichever is taller: the icon or the description text block
        return Math.max(y + iconSize, textY) + (this.layout.sectionGap / 2);
    }

    _drawMainIcon(def, x, y, isAbility) {
        if (!this.loader) return;
        let sheetName = isAbility ? 'abilities' : 'items';
        const type = (def.type || '').toLowerCase();
        const slot = (def.slot || '').toLowerCase();

        if (!isAbility) {
            if (['mainhand', 'offhand'].includes(slot) || ['weapon', 'shield', 'tool'].includes(type)) {
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
            this.ui.drawSprite(sheet, iconData.col * 32, iconData.row * 32, 32, 32, x, y, this.ICON_SIZE, this.ICON_SIZE);
        }
    }

    _drawStatsGrid(item, def, x, y, w) {
        let currentY = y;
        const statItems = [];

        const getStatVal = (key) => {
            if (item.stats && item.stats[key] !== undefined) return item.stats[key];
            if (item[key] !== undefined) return item[key];
            if (def.stats && def.stats[key] !== undefined) return def.stats[key];
            if (def[key] !== undefined) return def[key];
            return undefined;
        };

        const primaryStats = [
            { key: 'damage', label: 'ATTACK' },
            { key: 'attack', label: 'ATTACK' },
            { key: 'defense', label: 'DEFENSE' },
            { key: 'block', label: 'BLOCK' }
        ];

        primaryStats.forEach(stat => {
            const val = getStatVal(stat.key);
            if (val === undefined || val === null) return;
            if (typeof val === 'object' && typeof val.min === 'undefined') return;
            let valStr = val;
            if (typeof val === 'object' && val.min !== undefined) {
                valStr = `${this._formatValue(val.min)}-${this._formatValue(val.max)}`;
            } else {
                valStr = this._formatValue(val);
            }
            statItems.push({ label: stat.label, val: valStr, color: this._getStatColor(stat.key) });
        });

        ['attack', 'defense', 'resistance'].forEach(category => {
            const catObj = getStatVal(category);
            if (!catObj || typeof catObj !== 'object') return;
            Object.keys(catObj).forEach(k => {
                if (k === 'min' || k === 'max' || catObj[k] === 0) return;
                const typeAbbr = (Formatting.getAbbreviation ? Formatting.getAbbreviation(k) : k.substring(0, 3)).toUpperCase();
                const catAbbr = category === 'resistance' ? 'RES' : (category === 'defense' ? 'DEF' : 'ATK');
                statItems.push({ label: `${typeAbbr} ${catAbbr}`, val: this._formatValue(catObj[k]), color: this._getStatColor(k) });
            });
        });

        const baseAttrs = def.attributes || (def.stats ? def.stats.attributes : {}) || {};
        const itemAttrs = item.attributes || (item.stats ? item.stats.attributes : {}) || {};
        const attributes = { ...baseAttrs, ...itemAttrs };

        const baseRes = def.resources || {};
        const itemRes = item.resources || {};
        const resources = { ...baseRes, ...itemRes };

        Object.keys(attributes).forEach(key => {
            const val = attributes[key];
            if (val === 0) return;
            const label = (Formatting.getAbbreviation ? Formatting.getAbbreviation(key) : key.substring(0, 3)).toUpperCase();
            statItems.push({ label: label, val: this._formatValue(val, true), color: this._getStatColor(key) });
        });

        Object.keys(resources).forEach(key => {
            const val = resources[key];
            if (val === 0) return;
            let label = key.toUpperCase();
            if (key === 'maxHp') label = "MAX HP";
            else if (key === 'maxStamina') label = "MAX STM";
            else if (key === 'maxInsight') label = "MAX INS";
            statItems.push({ label: label, val: this._formatValue(val, true), color: this._getStatColor(key) });
        });

        if (statItems.length === 0) return currentY;

        const numCols = 2;
        const colWidth = w / numCols;
        const bodyFont = UITheme.fonts.cardSmall || UITheme.fonts.body;
        currentY += this.layout.innerPadding;

        for (let i = 0; i < statItems.length; i++) {
            const col = i % numCols;
            const row = Math.floor(i / numCols);
            const itemX = x + (col * colWidth);
            const itemY = currentY + (row * (this.layout.lineHeight + 4));

            let labelColor = UITheme.colors.textMuted;
            const l = statItems[i].label.toLowerCase();
            if (l.includes('atk') || l.includes('attack') || l.includes('damage') || l.includes('def') || l.includes('defense') || l.includes('block') || l.includes('res') || l.includes('resistance')) {
                labelColor = statItems[i].color;
            }

            this.ui.drawText(statItems[i].label, itemX, itemY, bodyFont, labelColor, "left");
            this.ui.drawText(String(statItems[i].val), itemX + colWidth - this.layout.innerPadding, itemY, bodyFont, statItems[i].color, "right");
        }

        const totalRows = Math.ceil(statItems.length / numCols);
        return currentY + (totalRows * (this.layout.lineHeight + 4)) + this.layout.sectionGap;
    }

    _drawUpgradeCosts(item, def, x, y, w) {
        if (!def.upgradeCosts) return y;
        const currentLevel = item.level || def.level || 1;
        const nextLevel = currentLevel + 1;
        const cost = def.upgradeCosts[nextLevel];
        if (!cost) return y;

        let currentY = y;
        const titleFont = UITheme.fonts.cardTitle || UITheme.fonts.header;
        const bodyFont = UITheme.fonts.cardSmall || UITheme.fonts.body;

        this.ui.drawText(`UPGRADE TO LV. ${nextLevel}`, x, currentY, titleFont, UITheme.colors.textHighlight, "left");
        currentY += this.layout.lineHeight;

        if (cost.currency !== undefined) {
            this.ui.drawText(`Gold: ${cost.currency}g`, x, currentY, bodyFont, UITheme.colors.textMain, "left");
            currentY += this.layout.lineHeight;
        }

        if (cost.materials && Object.keys(cost.materials).length > 0) {
            this.ui.drawText("Materials Required:", x, currentY, bodyFont, UITheme.colors.textMuted, "left");
            currentY += this.layout.lineHeight;
            const materialsSheet = this.loader ? (this.loader.get('materials') || this.loader.get('items') || this.loader.get('icons')) : null;

            Object.entries(cost.materials).forEach(([matId, count]) => {
                const matDef = ItemDefinitions[matId] || {};
                const matName = matDef.name || matId;
                const iconSize = this.MATERIAL_ICON_SIZE * 2; // Doubled Size

                if (materialsSheet && matDef.icon) {
                    this.ui.drawSprite(
                        materialsSheet,
                        matDef.icon.col * 32, matDef.icon.row * 32,
                        32, 32,
                        x, currentY - (iconSize / 2) + 6,
                        iconSize, iconSize
                    );
                    this.ui.drawText(`- ${matName}: x${count}`, x + iconSize + 8, currentY, bodyFont, UITheme.colors.textMain, "left");
                } else {
                    this.ui.drawText(`- ${matName}: x${count}`, x + 12, currentY, bodyFont, UITheme.colors.textMain, "left");
                }
                currentY += Math.max(this.layout.lineHeight, iconSize + 4);
            });
        }
        return currentY + this.layout.sectionGap;
    }

    _drawAbilities(def, x, y, w) {
        const granted = def.grantedAbilities || [];
        if (granted.length === 0) return y;

        let currentY = y;
        const titleFont = UITheme.fonts.cardTitle || UITheme.fonts.header;

        if (def.name) {
            this.ui.drawText("GRANTED ABILITIES", x, currentY, titleFont, UITheme.colors.textHighlight, "left");
            currentY += this.layout.lineHeight + 8;
        }

        granted.forEach(abilityId => {
            const ability = AbilityDefinitions[abilityId] || { name: abilityId, description: "" };
            const abilityObj = { id: abilityId, source: def.name || 'Innate', isEquipment: !!def.name };
            currentY = this._drawAbilityCard(ability, abilityObj, x, currentY, w);
        });

        return currentY + (def.name ? this.layout.sectionGap : 0);
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

        const hasStats = ab.effects || ab.accuracy || ab.speed;
        const infoBlockHeight = hasStats ? 160 : 136;
        const dividerHeight = descLines.length > 0 ? 40 : 0;
        const descTextHeight = descLines.length > 0 ? (descLines.length * 24) : 0;
        const cardHeight = cardPadding + infoBlockHeight + dividerHeight + descTextHeight + cardPadding;

        // --- 3. Draw Thematic Background Panel & Border ---
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

        // MATCH: Draw card outer border to match ability damage color
        this.ui.ctx.strokeStyle = themeColor;
        this.ui.ctx.lineWidth = 1;
        this.ui.ctx.strokeRect(x, y, w, cardHeight);

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
        let currentTextY = iconY + 12;

        // Row 1: Title & Cost
        const abilityName = ab.name || abilityObj.name || abilityObj.id;
        this.ui.ctx.textAlign = 'left';
        this.ui.ctx.textBaseline = 'middle';
        this.ui.ctx.font = UITheme.fonts.cardTitle;
        // MATCH: Apply damage color to the ability title text
        this.ui.ctx.fillStyle = themeColor; 
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
            this.ui.ctx.fillStyle = themeColor;
            this.ui.ctx.fillText("Free", x + w - cardPadding, currentTextY);
        }
        currentTextY += 32;

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
        currentTextY += 30;

        // Row 3: Target
        this.ui.ctx.font = UITheme.fonts.cardItalic;
        const targetLabel = "Target: ";
        const sourceLabel = "Source: ";
        const labelColumnW = Math.max(
            this.ui.ctx.measureText(targetLabel).width,
            this.ui.ctx.measureText(sourceLabel).width
        );

        const targetText = this._formatTargetingText(ab.targeting);
        this.ui.ctx.fillStyle = UITheme.colors.textMuted;
        this.ui.ctx.fillText(targetLabel, contentX, currentTextY);
        // MATCH: Change targeting value to damage color
        this.ui.ctx.fillStyle = themeColor;
        this.ui.ctx.fillText(targetText, contentX + labelColumnW, currentTextY);
        currentTextY += 24;

        // Row 4: Source
        const sourceText = isEquip ? abilityObj.source : 'Innate';
        this.ui.ctx.fillStyle = UITheme.colors.textMuted;
        this.ui.ctx.fillText(sourceLabel, contentX, currentTextY);
        // MATCH: Change source value to damage color
        this.ui.ctx.fillStyle = themeColor;
        this.ui.ctx.fillText(sourceText, contentX + labelColumnW, currentTextY);
        currentTextY += 26;

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
            // MATCH: Changed from UITheme.colors.textMain to themeColor for stat values
            if (ab.accuracy) drawStat("Acc:", `${Math.floor(ab.accuracy*100)}%`, themeColor);
            if (ab.speed) drawStat("Spd:", ab.speed, themeColor);
        }

        // --- 7. Render Divider & Description (BOTTOM) ---
        this.ui.ctx.textBaseline = 'top';
        let cursorY = infoY + infoBlockHeight;

        if (descLines.length > 0) {
            const flourishW = w * 0.6;
            if (this.ui.drawLineWithGothicFlourish) {
                this.ui.drawLineWithGothicFlourish(x + (w - flourishW)/2, cursorY, flourishW, themeColor);
            } else {
                this.ui.ctx.fillStyle = themeColor;
                this.ui.ctx.fillRect(x + (w - flourishW)/2, cursorY + 12, flourishW, 1);
            }
            cursorY += 24;

            this.ui.ctx.textAlign = 'center';
            // MATCH: Changed description text to the themeColor
            this.ui.ctx.fillStyle = themeColor;
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
                iconData.col * 32, iconData.row * 32,
                32, 32, x, y,
                this.ABILITY_ICON_SIZE, this.ABILITY_ICON_SIZE
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

        const hasStats = ab.effects || ab.accuracy || ab.speed;
        const infoBlockHeight = hasStats ? 160 : 136;
        const dividerHeight = descLines.length > 0 ? 40 : 0;
        const descTextHeight = descLines.length > 0 ? (descLines.length * 24) : 0;
        const cardHeight = cardPadding + infoBlockHeight + dividerHeight + descTextHeight + cardPadding;

        // --- 3. Draw Thematic Background Panel & Border ---
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

        // MATCH: Draw card outer border to match ability damage color
        this.ui.ctx.strokeStyle = themeColor;
        this.ui.ctx.lineWidth = 1;
        this.ui.ctx.strokeRect(x, y, w, cardHeight);

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
        let currentTextY = iconY + 12;

        // Row 1: Title & Cost
        const abilityName = ab.name || abilityObj.name || abilityObj.id;
        this.ui.ctx.textAlign = 'left';
        this.ui.ctx.textBaseline = 'middle';
        this.ui.ctx.font = UITheme.fonts.cardTitle;
        // MATCH: Apply damage color to the ability title text
        this.ui.ctx.fillStyle = themeColor;
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
            this.ui.ctx.fillStyle = themeColor;
            this.ui.ctx.fillText("Free", x + w - cardPadding, currentTextY);
        }
        currentTextY += 32;

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
        currentTextY += 30;

        // Row 3: Target
        this.ui.ctx.font = UITheme.fonts.cardItalic;
        const targetLabel = "Target: ";
        const sourceLabel = "Source: ";
        const labelColumnW = Math.max(
            this.ui.ctx.measureText(targetLabel).width,
            this.ui.ctx.measureText(sourceLabel).width
        );

        const targetText = this._formatTargetingText(ab.targeting);
        this.ui.ctx.fillStyle = UITheme.colors.textMuted;
        this.ui.ctx.fillText(targetLabel, contentX, currentTextY);
        // MATCH: Change targeting value to damage color
        this.ui.ctx.fillStyle = themeColor;
        this.ui.ctx.fillText(targetText, contentX + labelColumnW, currentTextY);
        currentTextY += 24;

        // Row 4: Source
        const sourceText = isEquip ? abilityObj.source : 'Innate';
        this.ui.ctx.fillStyle = UITheme.colors.textMuted;
        this.ui.ctx.fillText(sourceLabel, contentX, currentTextY);
        // MATCH: Change source value to damage color
        this.ui.ctx.fillStyle = themeColor;
        this.ui.ctx.fillText(sourceText, contentX + labelColumnW, currentTextY);
        currentTextY += 26;

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
            // MATCH: Changed from UITheme.colors.textMain to themeColor for stat values
            if (ab.accuracy) drawStat("Acc:", `${Math.floor(ab.accuracy*100)}%`, themeColor);
            if (ab.speed) drawStat("Spd:", ab.speed, themeColor);
        }

        // --- 7. Render Divider & Description (BOTTOM) ---
        this.ui.ctx.textBaseline = 'top';
        let cursorY = infoY + infoBlockHeight;

        if (descLines.length > 0) {
            const flourishW = w * 0.6;
            if (this.ui.drawLineWithGothicFlourish) {
                this.ui.drawLineWithGothicFlourish(x + (w - flourishW)/2, cursorY, flourishW, themeColor);
            } else {
                this.ui.ctx.fillStyle = themeColor;
                this.ui.ctx.fillRect(x + (w - flourishW)/2, cursorY + 12, flourishW, 1);
            }
            cursorY += 24;

            this.ui.ctx.textAlign = 'center';
            // MATCH: Changed description text to the themeColor
            this.ui.ctx.fillStyle = themeColor; 
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
                iconData.col * 32, iconData.row * 32,
                32, 32, x, y,
                this.ABILITY_ICON_SIZE, this.ABILITY_ICON_SIZE
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