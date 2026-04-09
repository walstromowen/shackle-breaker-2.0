import { UITheme } from '../../../ui/UITheme.js';
import { TRAIT_DEFINITIONS } from '../../../../../shared/data/traitDefinitions.js';
import { Formatting } from '../../../../../shared/utils/formatting.js';
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';

export class TooltipSystem {
    constructor(ui) {
        this.ui = ui;
        this.WIDTH = 220;
        this.PADDING = 12; // Slightly wider padding to accommodate the inner panel borders
    }

    render(state, hitboxes) {
        const { mouse, member, filteredInventory } = state;
        
        if (!mouse) return;
        const mx = mouse.x;
        const my = mouse.y;

        // 1. Find Hovered Hitbox (LIFO)
        let hovered = null;
        for (let i = hitboxes.length - 1; i >= 0; i--) {
            const b = hitboxes[i];
            if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
                hovered = b;
                break;
            }
        }

        if (!hovered) return;

        // 2. Resolve Content based on Type
        let content = null;
        
        if (hovered.type === 'trait') {
            content = this._getTraitContent(hovered.id);
        } else if (hovered.type === 'inventory') {
            const item = filteredInventory[hovered.index];
            if (item) content = this._getItemContent(item);
        } else if (hovered.type === 'slot') {
            const equip = (member.state && member.state.equipment) ? member.state.equipment : member.equipment;
            const item = equip ? equip[hovered.slotId] : null; 
            content = this._getItemContent(item, hovered.slotId);
        }

        // 3. Draw
        if (content) {
            this._drawTooltip(content, mx, my);
        }
    }

    _getTraitContent(traitId) {
        const def = TRAIT_DEFINITIONS[traitId] || { name: traitId, description: "Unknown trait." };
        const lines = [];

        // A. Attributes
        if (def.attributes) {
            const attrParts = [];
            for (const [key, val] of Object.entries(def.attributes)) {
                attrParts.push(`${Formatting.getAbbreviation(key)} ${Formatting.formatSigned(val)}`);
            }
            if (attrParts.length > 0) lines.push(attrParts.join(", "));
        }

        // B. Stats
        if (def.stats) {
            const statParts = [];
            const categories = ['combat', 'resources', 'attack', 'defense'];
            
            categories.forEach(cat => {
                if (def.stats[cat]) {
                    for (const [key, val] of Object.entries(def.stats[cat])) {
                        if (typeof val === 'number' && val !== 0) {
                            let label = Formatting.getAbbreviation(key);
                            if (cat === 'attack') label = `${Formatting.capitalize(key)} Atk`;
                            if (cat === 'defense') label = `${Formatting.capitalize(key)} Def`;
                            
                            statParts.push(`${label} ${Formatting.formatSigned(val)}`);
                        }
                    }
                }
            });
            if (statParts.length > 0) lines.push(statParts.join(", "));
        }

        // C. Description
        if (def.description) {
            if (lines.length > 0) lines.push("---");
            lines.push(def.description);
        }

        // D. Triggers
        if (def.triggers) {
            lines.push("---");
            for (const [triggerName, effectObj] of Object.entries(def.triggers)) {
                const cleanTrigger = triggerName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                lines.push(`${cleanTrigger}: ${this._formatEffect(effectObj)}`);
            }
        }

        // E. Conditionals
        if (def.conditionalStats) {
            lines.push("---");
            const cond = def.conditionalStats.condition.replace(/_/g, ' '); 
            lines.push(`Condition: ${cond}`);
            if (def.conditionalStats.stats) {
                lines.push("(Active stats hidden)");
            }
        }

        return {
            title: def.name,
            type: "Trait",
            color: UITheme.colors.borderHighlight, // Tarnished gold for traits
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
        if (item.defId) {
            def = ItemDefinitions[item.defId];
        } else if (item.definition) {
            def = item.definition;
        }

        if (!def) return null;

        const lines = [];

        // 1. Basic Stats
        if (def.stats) {
            const statsArr = [];
            if (def.stats.damage) statsArr.push(`DMG ${def.stats.damage}`);
            if (def.stats.block)  statsArr.push(`BLK ${def.stats.block}`);

            if (def.stats.attributes) {
                for (const [key, val] of Object.entries(def.stats.attributes)) {
                     statsArr.push(`${Formatting.getAbbreviation(key)} ${Formatting.formatSigned(val)}`);
                }
            }
            if (statsArr.length > 0) lines.push(statsArr.join(", "));
        }

        // 2. Description
        if (def.description) {
            lines.push("---");
            lines.push(def.description);
        }
        
        // 3. Granted Abilities
        if (def.grantedAbilities || def.useAbility) {
            lines.push("---");
            const abilities = def.grantedAbilities || [def.useAbility];
            abilities.forEach(ab => {
                 lines.push(`Grants: ${ab}`);
            });
        }

        return {
            title: def.name,
            type: (def.type || "Item").toUpperCase(),
            color: this._getRarityColor(def.rarity),
            lines: lines
        };
    }

    _drawTooltip(content, mx, my) {
        const { title, type, color, lines } = content;
        
        // --- FONTS ---
        const headerFont = UITheme.fonts.cardTitle; 
        const typeFont   = UITheme.fonts.cardItalic;      
        const bodyFont   = UITheme.fonts.cardSmall;      
        const lineHeight = 14;
        
        this.ui.ctx.font = bodyFont;
        
        // 1. Calculate Height & Wrap Text
        let contentHeight = 38;
        const wrappedLines = [];
        
        lines.forEach(rawLine => {
            if (rawLine === "---") {
                contentHeight += 12; // More breathing room for flourishes
                wrappedLines.push({ text: "---", isSeparator: true });
            } else {
                const wLines = this.ui.getWrappedLines(rawLine, this.WIDTH - (this.PADDING * 2), bodyFont);
                wLines.forEach(l => {
                    wrappedLines.push({ text: l, isSeparator: false });
                    contentHeight += lineHeight;
                });
            }
        });

        // 2. Smart Positioning
        const screenW = this.ui.ctx.canvas.width;
        const screenH = this.ui.ctx.canvas.height;
        
        let tx = mx + 15;
        let ty = my + 15;

        if (tx + this.WIDTH > screenW) tx = mx - this.WIDTH - 15;
        if (ty + contentHeight > screenH) ty = screenH - contentHeight - 10;

        // 3. Draw Beautiful Gothic Panel with Drop Shadow
        this.ui.ctx.save();
        this.ui.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        this.ui.ctx.shadowBlur = 12;
        this.ui.ctx.shadowOffsetX = 4;
        this.ui.ctx.shadowOffsetY = 4;
        
        // Utilizing the new drawPanel method!
        this.ui.drawPanel(tx, ty, this.WIDTH, contentHeight, "rgba(15, 15, 18, 0.98)");
        this.ui.ctx.restore();

        // 4. Draw Header Banner Background (Inside the inset frame)
        const inset = 4; // Matching inset from drawPanel logic
        this.ui.ctx.save();
        this.ui.ctx.fillStyle = color;
        this.ui.ctx.globalAlpha = 0.12; 
        this.ui.ctx.fillRect(tx + inset + 1, ty + inset + 1, this.WIDTH - (inset * 2) - 2, 28);
        this.ui.ctx.restore();

        // 5. Draw Header Text
        this.ui.drawText(title, tx + this.PADDING, ty + 21, headerFont, color, "left");
        this.ui.drawText(type, tx + this.WIDTH - this.PADDING, ty + 21, typeFont, UITheme.colors.textMuted, "right");

        // Header Separator (Sharp Rarity Line, constrained within inner frame)
        this.ui.ctx.save();
        this.ui.ctx.strokeStyle = color;
        this.ui.ctx.globalAlpha = 0.6;
        this.ui.ctx.beginPath();
        this.ui.ctx.moveTo(tx + inset + 1, ty + 33);
        this.ui.ctx.lineTo(tx + this.WIDTH - inset - 1, ty + 33);
        this.ui.ctx.stroke();
        this.ui.ctx.restore();

        // 6. Draw Body Text & Gothic Separators
        let curY = ty + 46;
        wrappedLines.forEach(lineObj => {
            if (lineObj.isSeparator) {
                // Replacing gradient line with elegant Gothic flourish divider
                this.ui.drawLineWithGothicFlourish(tx + this.PADDING, curY - 4, this.WIDTH - (this.PADDING * 2), UITheme.colors.border);
                curY += 12;
            } else {
                this.ui.drawText(lineObj.text, tx + this.PADDING, curY, bodyFont, UITheme.colors.textMain, "left");
                curY += lineHeight;
            }
        });
    }

    _getRarityColor(rarity) {
        // Tuned slightly to fit the muted aesthetic while retaining meaning
        switch ((rarity || "").toLowerCase()) {
            case 'uncommon': return "#5c9e47"; // Muted green
            case 'rare': return "#4a709c";     // Muted blue
            case 'epic': return "#8359a3";     // Muted purple
            case 'legendary': return "#b89947"; // Tarnished gold (Theme highlight)
            default: return UITheme.colors.textMain;
        }
    }
}