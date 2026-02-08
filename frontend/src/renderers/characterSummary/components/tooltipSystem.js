import { UITheme } from '../../../ui/UITheme.js';
import { TRAIT_DEFINITIONS } from '../../../../../shared/data/traitDefinitions.js';
import { Formatting } from '../../../../../shared/utils/formatting.js';
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';

export class TooltipSystem {
    constructor(ui) {
        this.ui = ui;
        this.WIDTH = 220; // Reduced width slightly to match smaller text
        this.PADDING = 10;
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
            color: UITheme.colors.accent,
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

        // Resolve definition via defId if present
        let def = item;
        if (item.defId) {
            def = ItemDefinitions[item.defId];
        } else if (item.definition) {
            def = item.definition;
        }

        // Safety check if def isn't found
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
        
        // --- UPDATED FONTS FOR SMALLER SIZE ---
        const headerFont = "bold 11px sans-serif"; 
        const typeFont   = "9px sans-serif";       
        const bodyFont   = "10px sans-serif";      
        const lineHeight = 12;                     
        
        this.ui.ctx.font = bodyFont;
        
        // 1. Calculate Height & Wrap Text
        let contentHeight = 35; 
        const wrappedLines = [];
        
        lines.forEach(rawLine => {
            if (rawLine === "---") {
                contentHeight += 6; // Smaller gap for separator
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

        // 3. Draw Background
        this.ui.drawRect(tx, ty, this.WIDTH, contentHeight, "rgba(18, 18, 20, 0.98)");
        this.ui.drawRect(tx, ty, this.WIDTH, contentHeight, UITheme.colors.border, false);

        // 4. Draw Header
        this.ui.drawText(title, tx + this.PADDING, ty + 18, headerFont, color, "left");
        this.ui.drawText(type, tx + this.WIDTH - this.PADDING, ty + 18, typeFont, UITheme.colors.textMuted, "right");

        // Header Separator
        this.ui.drawRect(tx + this.PADDING, ty + 24, this.WIDTH - (this.PADDING * 2), 1, "#333");

        // 5. Draw Body
        let curY = ty + 36;
        wrappedLines.forEach(lineObj => {
            if (lineObj.isSeparator) {
                this.ui.drawRect(tx + this.PADDING + 10, curY - 3, this.WIDTH - (this.PADDING * 2) - 20, 1, "#222");
                curY += 6;
            } else {
                this.ui.drawText(lineObj.text, tx + this.PADDING, curY, bodyFont, "#ccc", "left");
                curY += lineHeight;
            }
        });
    }

    _getRarityColor(rarity) {
        switch ((rarity || "").toLowerCase()) {
            case 'uncommon': return "#1eff00";
            case 'rare': return "#0070dd";
            case 'epic': return "#a335ee";
            case 'legendary': return "#ff8000";
            default: return "#ffffff";
        }
    }
}