import { UITheme } from '../../../ui/UITheme.js';
import { TRAIT_DEFINITIONS } from '../../../../../shared/data/traitDefinitions.js';
import { Formatting } from '../../../../../shared/utils/formatting.js';
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';
import { AbilityDefinitions } from '../../../../../shared/data/abilityDefinitions.js';

export class TooltipSystem {
    constructor(ui, loader = null) {
        this.ui = ui;
        this.loader = loader;
        this.WIDTH = 528;
        this.PADDING = 29;
    }

    render(state, hitboxes) {
        if (state && state.loader) {
            this.loader = state.loader;
        }

        let hovered = null;

        // 1. PRIORITIZE KEYBOARD STATE: Grab the actively focused hitbox ID from the controller
        if (state && state.hoveredHitboxId) {
            hovered = hitboxes.find(b => b.id === state.hoveredHitboxId);
        }

        // 2. FALLBACK TO MOUSE: If no active ID, check physical mouse collision
        if (!hovered && state.mouse) {
            const mx = state.mouse.x;
            const my = state.mouse.y;
            for (let i = hitboxes.length - 1; i >= 0; i--) {
                const b = hitboxes[i];
                if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
                    hovered = b;
                    break;
                }
            }
        }

        if (!hovered) return;

        let content = null;
        if (hovered.type === 'trait') {
            content = this._getTraitContent(hovered.id);
        } else if (hovered.type === 'inventory') {
            const item = state.filteredInventory[hovered.index];
            if (item) content = this._getItemContent(item);
        } else if (hovered.type === 'slot') {
            const equip = (state.member.state && state.member.state.equipment) ? state.member.state.equipment : state.member.equipment;
            const item = equip ? equip[hovered.slotId] : null;
            content = this._getItemContent(item, hovered.slotId);
        }

        if (content) {
            // Anchor to the top-right corner of the actual slot
            const anchorX = hovered.x + hovered.w;
            const anchorY = hovered.y;
            this._drawTooltip(content, anchorX, anchorY, hovered);
        }
    }

    _chunkArray(arr, size) {
        const result = [];
        for (let i = 0; i < arr.length; i += size) {
            result.push(arr.slice(i, i + size));
        }
        return result;
    }

    // Helper: Formats numbers, adding + signs if requested, and converts decimals to percentages.
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

    // Helper: Gets color based on stat key/name
    _getStatColor(rawKey) {
        if (!rawKey) return UITheme.colors.textMain;
        const k = rawKey.toLowerCase();

        // Exact matches
        if (UITheme.colors[k]) return UITheme.colors[k];
        if (UITheme.colors.types && UITheme.colors.types[k]) return UITheme.colors.types[k];

        // Fuzzy matches for common attributes and resources
        if (k.includes('hp') || k.includes('health')) return UITheme.colors.hp || "#8c1c1c";
        if (k.includes('stm') || k.includes('stamina')) return UITheme.colors.stm || "#4a5d4e";
        if (k.includes('ins') || k.includes('insight')) return UITheme.colors.ins || "#4a5b70";
        if (k.includes('atk') || k.includes('attack') || k.includes('damage')) return UITheme.colors.attack || "#9e1a1a";
        if (k.includes('def') || k.includes('block')) return UITheme.colors.defense || "#4a5b70";
        if (k.includes('res')) return UITheme.colors.resistance || "#8a8578";

        return UITheme.colors.textMain;
    }

    _getTraitContent(traitId) {
        const def = TRAIT_DEFINITIONS[traitId] || { name: traitId, description: "Unknown trait." };
        const lines = [];
        const statItems = [];

        if (def.attributes) {
            for (const [key, val] of Object.entries(def.attributes)) {
                statItems.push({
                    label: Formatting.getAbbreviation(key).toUpperCase(),
                    val: this._formatValue(val, true),
                    color: this._getStatColor(key)
                });
            }
        }

        if (def.stats) {
            const categories = ['combat', 'resources', 'attack', 'defense'];
            categories.forEach(cat => {
                if (def.stats[cat]) {
                    for (const [key, val] of Object.entries(def.stats[cat])) {
                        if (typeof val === 'number' && val !== 0) {
                            let label = Formatting.getAbbreviation(key).toUpperCase();
                            if (cat === 'attack') label = `${label} ATK`;
                            if (cat === 'defense') label = `${label} DEF`;

                            statItems.push({
                                label: label,
                                val: this._formatValue(val, true),
                                color: this._getStatColor(key)
                            });
                        }
                    }
                }
            });
        }

        if (statItems.length > 0) {
            const chunks = this._chunkArray(statItems, 2);
            chunks.forEach(chunk => lines.push({ type: 'row', items: chunk }));
            lines.push({ type: 'spacer' });
        }

        if (def.description) {
            lines.push({ text: def.description, color: UITheme.colors.textMain });
        }

        if (def.triggers) {
            lines.push({ type: 'spacer' });
            for (const [triggerName, effectObj] of Object.entries(def.triggers)) {
                const cleanTrigger = triggerName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                lines.push({
                    type: 'row',
                    items: [{ label: cleanTrigger, val: this._formatEffect(effectObj) }]
                });
            }
        }

        if (def.conditionalStats) {
            lines.push({ type: 'spacer' });
            const cond = def.conditionalStats.condition.replace(/_/g, ' ');
            lines.push({ type: 'row', items: [{ label: 'Condition', val: cond }] });

            if (def.conditionalStats.stats) {
                lines.push({ text: "(Active stats hidden)", font: UITheme.fonts.cardItalic, color: UITheme.colors.textMuted });
            }
        }

        return {
            title: def.name,
            type: "Trait",
            color: UITheme.colors.borderHighlight,
            lines: lines
        };
    }

    _formatEffect(effectObj) {
        if (typeof effectObj === 'string') return effectObj;
        const name = effectObj.effect ? effectObj.effect.replace(/_/g, ' ') : 'Effect';
        const val = effectObj.value ? `(${effectObj.value})` : '';
        return `${name} ${val}`;
    }

    _getItemContent(item, slotName) {
        if (!item) {
            if (slotName) {
                return {
                    title: "Empty Slot",
                    type: slotName.toUpperCase(),
                    color: UITheme.colors.textMuted,
                    lines: ["No item equipped."]
                };
            }
            return null;
        }

        let def = item;
        if (item.defId) def = ItemDefinitions[item.defId];
        else if (item.definition) def = item.definition;
        if (!def) return null;

        const lines = [];

        // 1. Title Meta Parsing
        let typeText = (def.type || "Item").toUpperCase();
        if (def.slot) typeText += ` - ${def.slot.toUpperCase()}`;
        const itemLevel = item.level || def.level || def.itemLevel;

        // 2. Data Gathering (Stats)
        const statItems = [];

        const getStatVal = (key) => {
            if (typeof item[key] === 'function') return item[key];
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
            if (typeof val === 'object' && typeof val.min === 'undefined' && Object.keys(val).length === 0) return;

            if (typeof val === 'object' && val.min === undefined) {
                Object.keys(val).forEach(typeKey => {
                    const typeAbbr = (Formatting.getAbbreviation ? Formatting.getAbbreviation(typeKey) : typeKey.substring(0, 3)).toUpperCase();
                    statItems.push({
                        label: `${typeAbbr} ${stat.label}`,
                        val: this._formatValue(val[typeKey]),
                        color: this._getStatColor(typeKey)
                    });
                });
                return;
            }

            let valStr = val;
            if (typeof val === 'object' && val.min !== undefined) {
                valStr = `${this._formatValue(val.min)}-${this._formatValue(val.max)}`;
            } else {
                valStr = this._formatValue(val);
            }

            statItems.push({
                label: stat.label,
                val: valStr,
                color: this._getStatColor(stat.key)
            });
        });

        ['attack', 'defense', 'resistance'].forEach(category => {
            const catObj = getStatVal(category);
            if (!catObj || typeof catObj !== 'object') return;

            Object.keys(catObj).forEach(k => {
                if (k === 'min' || k === 'max' || catObj[k] === 0) return;
                const typeAbbr = (Formatting.getAbbreviation ? Formatting.getAbbreviation(k) : k.substring(0, 3)).toUpperCase();
                const catAbbr = category === 'resistance' ? 'RES' : (category === 'defense' ? 'DEF' : 'ATK');

                statItems.push({
                    label: `${typeAbbr} ${catAbbr}`,
                    val: this._formatValue(catObj[k]),
                    color: this._getStatColor(k)
                });
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
            statItems.push({
                label: label,
                val: this._formatValue(val, true),
                color: this._getStatColor(key)
            });
        });

        Object.keys(resources).forEach(key => {
            const val = resources[key];
            if (val === 0) return;
            let label = key.toUpperCase();
            if (key === 'maxHp') label = "MAX HP";
            else if (key === 'maxStamina') label = "MAX STM";
            else if (key === 'maxInsight') label = "MAX INS";

            statItems.push({
                label: label,
                val: this._formatValue(val, true),
                color: this._getStatColor(key)
            });
        });

        // ==========================================
        // Harvest Tool Extraction (harvestTool Array)
        // ==========================================
        const rawHarvestTools = item.harvestTool || def.harvestTool;
        if (rawHarvestTools && Array.isArray(rawHarvestTools) && rawHarvestTools.length > 0) {
            const formattedTools = rawHarvestTools
                .map(t => String(t).replace(/_/g, ' ').toUpperCase())
                .join(', ');

            statItems.push({
                label: 'TOOL',
                val: formattedTools,
                color: UITheme.colors.textHighlight || "#ffd700"
            });
        }

        // 3. Data Gathering (Abilities)
        const abilityLines = [];
        const rawAbilities = item.grantedAbilities || def.grantedAbilities || item.abilities || def.abilities || (def.useAbility ? [def.useAbility] : null);

        if (rawAbilities && rawAbilities.length > 0) {
            rawAbilities.forEach(ab => {
                let name = "";
                let icon = null;
                let abColor = UITheme.colors.textMain;
                let abDef = null;

                if (typeof ab === 'object' && ab !== null) {
                    name = ab.name || ab.id;
                    icon = ab.icon || null;
                    if (ab.id && AbilityDefinitions) abDef = AbilityDefinitions[ab.id];
                } else if (typeof ab === 'string') {
                    if (AbilityDefinitions) abDef = AbilityDefinitions[ab];
                    name = abDef?.name || ab;
                    icon = abDef?.icon || null;
                }

                let typeFound = null;
                const sources = [abDef, ab];
                for (const src of sources) {
                    if (!src) continue;
                    if (src.damageType) { typeFound = src.damageType; break; }
                    if (src.element) { typeFound = src.element; break; }
                    if (src.effects && Array.isArray(src.effects)) {
                        for (const eff of src.effects) {
                            if (eff.damageType) { typeFound = eff.damageType; break; }
                            if (eff.element) { typeFound = eff.element; break; }
                        }
                    }
                    if (typeFound) break;
                }

                if (!typeFound) {
                    for (const src of sources) {
                        if (src && src.type) { typeFound = src.type; break; }
                    }
                }

                if (typeFound && typeof typeFound === 'string') {
                    const key = typeFound.toLowerCase();
                    if (UITheme.colors.types && UITheme.colors.types[key]) {
                        abColor = UITheme.colors.types[key];
                    } else if (UITheme.colors.damageTypes && UITheme.colors.damageTypes[key]) {
                        abColor = UITheme.colors.damageTypes[key];
                    } else if (UITheme.colors[key]) {
                        abColor = UITheme.colors[key];
                    }
                }

                if (name) abilityLines.push({ name: name, icon: icon, color: abColor });
            });
        }

        // 4. Implement Stats (Left) / Abilities (Right) Split Grid
        if (statItems.length > 0 || abilityLines.length > 0) {
            lines.push({ type: 'split-grid', stats: statItems, abilities: abilityLines });
            lines.push({ type: 'spacer' });
        }

        // 5. Descriptions
        if (def.effectDescription) {
            lines.push({ text: def.effectDescription, color: UITheme.colors.textMain });
        }

        if (def.description) {
            lines.push({ text: `"${def.description}"`, font: UITheme.fonts.cardItalic, color: UITheme.colors.textMuted });
        }

        return {
            title: def.name || item.name,
            type: typeText,
            color: this._getRarityColor(def.rarity),
            weight: def.weight,
            value: item.value !== undefined ? item.value : def.value,
            level: itemLevel,
            lines: lines
        };
    }

    _drawTooltip(content, anchorX, anchorY, hoveredHitbox) {
        const { title, type, color, weight, value, level, lines } = content;
        const headerFont = UITheme.fonts.cardTitle;
        const typeFont   = UITheme.fonts.cardItalic;
        const bodyFont   = UITheme.fonts.cardSmall;
        const lineHeight = 28;

        this.ui.ctx.font = bodyFont;

        // 1. Calculate Height & Wrap Objects
        let contentHeight = 111;
        const wrappedLines = [];

        lines.forEach(rawLine => {
            if (rawLine.type === 'row') {
                wrappedLines.push({ ...rawLine, isRow: true });
                contentHeight += lineHeight;
            } else if (rawLine.type === 'split-grid') {
                const maxItems = Math.max(rawLine.abilities.length, rawLine.stats.length);
                let gridHeight = 0;
                if (maxItems > 0) {
                    gridHeight += lineHeight;
                    gridHeight += (maxItems * 32);
                }
                wrappedLines.push({ ...rawLine });
                contentHeight += gridHeight;
            } else if (rawLine.type === 'spacer') {
                contentHeight += 8;
            } else {
                let textStr = typeof rawLine === 'string' ? rawLine : rawLine.text;
                let f = (typeof rawLine === 'object' && rawLine.font) ? rawLine.font : bodyFont;
                let c = (typeof rawLine === 'object' && rawLine.color) ? rawLine.color : UITheme.colors.textMain;

                const wLines = this.ui.getWrappedLines(textStr, this.WIDTH - (this.PADDING * 2), f);
                wLines.forEach(l => {
                    wrappedLines.push({ text: l, font: f, color: c });
                    contentHeight += lineHeight;
                });
            }
        });

        // 2. Smart Dynamic Positioning
        const screenW = this.ui.ctx.canvas.width;
        const screenH = this.ui.ctx.canvas.height;
        const gap = 16; 
        
        let tx = anchorX + gap;
        let ty = anchorY;

        if (tx + this.WIDTH > screenW) {
            tx = hoveredHitbox.x - this.WIDTH - gap;
        }
        if (ty + contentHeight > screenH) {
            ty = screenH - contentHeight - 24;
        }
        if (ty < 24) ty = 24;

        // 3. Draw Gothic Panel
        this.ui.ctx.save();
        this.ui.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        this.ui.ctx.shadowBlur = 29;
        this.ui.ctx.shadowOffsetX = 10;
        this.ui.ctx.shadowOffsetY = 10;
        this.ui.drawPanel(tx, ty, this.WIDTH, contentHeight, "rgba(15, 15, 18, 0.98)");
        this.ui.ctx.restore();

        // 4. Draw Header Banner Background
        const inset = 10;
        this.ui.ctx.save();
        this.ui.ctx.fillStyle = color;
        this.ui.ctx.globalAlpha = 0.12;
        this.ui.ctx.fillRect(tx + inset + 2, ty + inset + 2, this.WIDTH - (inset * 2) - 4, 85);
        this.ui.ctx.restore();

        // 5. Draw Header Text
        this.ui.drawText(title, tx + this.PADDING, ty + 46, headerFont, color, "left");

        if (level !== undefined) {
            this.ui.drawText(`Lv. ${level}`, tx + this.WIDTH - this.PADDING, ty + 46, headerFont, UITheme.colors.textHighlight, "right");
        }

        this.ui.drawText(type, tx + this.PADDING, ty + 80, typeFont, UITheme.colors.textMuted, "left");

        if (weight !== undefined || value !== undefined) {
            const rightMeta = [];
            if (weight !== undefined) rightMeta.push(`Wt: ${weight}`);
            if (value !== undefined) rightMeta.push(`Val: ${value}g`);
            this.ui.drawText(rightMeta.join("   "), tx + this.WIDTH - this.PADDING, ty + 80, bodyFont, UITheme.colors.textMuted, "right");
        }

        // Header Bottom Border Line
        this.ui.ctx.save();
        this.ui.ctx.strokeStyle = color;
        this.ui.ctx.globalAlpha = 0.6;
        this.ui.ctx.beginPath();
        this.ui.ctx.moveTo(tx + inset + 2, ty + 97);
        this.ui.ctx.lineTo(tx + this.WIDTH - inset - 2, ty + 97);
        this.ui.ctx.stroke();
        this.ui.ctx.restore();

        // 6. Draw Body Text & Grid Layout
        let curY = ty + 128;

        wrappedLines.forEach(lineObj => {
            if (lineObj.isRow) {
                const numCols = 2;
                const colWidth = (this.WIDTH - (this.PADDING * 2)) / numCols;
                lineObj.items.forEach((item, idx) => {
                    const startX = tx + this.PADDING + (idx * colWidth);
                    let endX = startX + colWidth;
                    if (idx < numCols - 1) endX -= 24;

                    this.ui.drawText(item.label, startX, curY, bodyFont, item.color || UITheme.colors.textMuted, "left");
                    this.ui.drawText(item.val.toString(), endX, curY, bodyFont, item.color || UITheme.colors.textMain, "right");
                });
                curY += lineHeight;
            } else if (lineObj.type === 'split-grid') {
                const colWidth = (this.WIDTH - (this.PADDING * 2)) / 2;
                const leftStart = tx + this.PADDING;
                const rightStart = leftStart + colWidth;
                const leftEnd = rightStart - 24;

                if (lineObj.stats.length > 0 || lineObj.abilities.length > 0) {
                    if (lineObj.stats.length > 0) this.ui.drawText("Stats", leftStart, curY, typeFont, UITheme.colors.textMuted, "left");
                    if (lineObj.abilities.length > 0) this.ui.drawText("Abilities", rightStart, curY, typeFont, UITheme.colors.textMuted, "left");
                    curY += lineHeight;
                }

                const maxRows = Math.max(lineObj.stats.length, lineObj.abilities.length);
                const rowHeight = 32;

                for (let i = 0; i < maxRows; i++) {
                    const st = lineObj.stats[i];
                    const ab = lineObj.abilities[i];
                    const itemY = curY;

                    if (st) {
                        this.ui.drawText(st.label, leftStart, itemY, bodyFont, st.color || UITheme.colors.textMuted, "left");
                        this.ui.drawText(st.val.toString(), leftEnd, itemY, bodyFont, st.color || UITheme.colors.textMain, "right");
                    }

                    if (ab) {
                        let textX = rightStart;
                        const drawSize = 24;
                        if (ab.icon && this.loader) {
                            const iconSheet = this.loader.get('abilities') || this.loader.get('icons') || this.loader.get('items');
                            if (iconSheet && typeof ab.icon === 'object' && ab.icon.col !== undefined && ab.icon.row !== undefined) {
                                const sourceSize = 32;
                                const sx = ab.icon.col * sourceSize;
                                const sy = ab.icon.row * sourceSize;
                                this.ui.ctx.drawImage(iconSheet, sx, sy, sourceSize, sourceSize, textX, itemY - 20, drawSize, drawSize);
                            }
                            textX += drawSize + 8;
                        }
                        this.ui.drawText(ab.name, textX, itemY, bodyFont, ab.color, "left");
                    }
                    curY += rowHeight;
                }
            } else if (lineObj.text) {
                this.ui.ctx.font = lineObj.font || bodyFont;
                this.ui.drawText(lineObj.text, tx + this.PADDING, curY, lineObj.font || bodyFont, lineObj.color || UITheme.colors.textMain, "left");
                curY += lineHeight;
            }
        });
    }

    _getRarityColor(rarity) {
        switch ((rarity || "").toLowerCase()) {
            case 'common':   return "#ffffff";
            case 'uncommon': return "#1eff00";
            case 'rare':     return "#0070dd";
            case 'epic':     return "#a335ee";
            case 'legendary':return "#ff8000";
            default:         return UITheme.colors.textMuted;
        }
    }
}