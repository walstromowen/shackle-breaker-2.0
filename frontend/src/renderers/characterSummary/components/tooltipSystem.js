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
        
        // --- FONTS ---
        const headerFont = "bold 11px sans-serif"; 
        const typeFont   = "9px sans-serif";       
        const bodyFont   = "10px sans-serif";      
        const lineHeight = 14; // Bumped slightly for better readability
        
        this.ui.ctx.font = bodyFont;
        
        // 1. Calculate Height & Wrap Text
        let contentHeight = 38; // Adjusted base height for the new header styling
        const wrappedLines = [];
        
        lines.forEach(rawLine => {
            if (rawLine === "---") {
                contentHeight += 8; 
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

        // 3. Draw Background with Drop Shadow
        this.ui.ctx.save();
        this.ui.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        this.ui.ctx.shadowBlur = 12;
        this.ui.ctx.shadowOffsetX = 4;
        this.ui.ctx.shadowOffsetY = 4;
        this.ui.drawRect(tx, ty, this.WIDTH, contentHeight, "rgba(15, 15, 18, 0.96)");
        this.ui.ctx.restore();

        // 4. Draw Borders (Outer Frame + Faint Inner Rarity Accent)
        this.ui.ctx.save();
        this.ui.ctx.lineWidth = 1;
        this.ui.drawRect(tx, ty, this.WIDTH, contentHeight, UITheme.colors.border, false); // Outer
        
        this.ui.ctx.strokeStyle = color;
        this.ui.ctx.globalAlpha = 0.25; // Subtle inner glow effect
        this.ui.ctx.strokeRect(tx + 2, ty + 2, this.WIDTH - 4, contentHeight - 4); // Inner
        this.ui.ctx.restore();

        // 5. Draw Header Banner Background
        this.ui.ctx.save();
        this.ui.ctx.fillStyle = color;
        this.ui.ctx.globalAlpha = 0.12; // Just enough to tint the header box
        this.ui.ctx.fillRect(tx + 1, ty + 1, this.WIDTH - 2, 28);
        this.ui.ctx.restore();

        // 6. Draw Header Text
        this.ui.drawText(title, tx + this.PADDING, ty + 19, headerFont, color, "left");
        this.ui.drawText(type, tx + this.WIDTH - this.PADDING, ty + 19, typeFont, UITheme.colors.textMuted, "right");

        // Header Separator (Sharp Rarity Line)
        this.ui.ctx.save();
        this.ui.ctx.strokeStyle = color;
        this.ui.ctx.globalAlpha = 0.6;
        this.ui.ctx.beginPath();
        this.ui.ctx.moveTo(tx + 2, ty + 29);
        this.ui.ctx.lineTo(tx + this.WIDTH - 2, ty + 29);
        this.ui.ctx.stroke();
        this.ui.ctx.restore();

        // 7. Draw Body Text & Fading Separators
        let curY = ty + 42;
        wrappedLines.forEach(lineObj => {
            if (lineObj.isSeparator) {
                this.ui.ctx.save();
                // Create a sleek gradient that fades out at the edges
                const grad = this.ui.ctx.createLinearGradient(tx, 0, tx + this.WIDTH, 0);
                grad.addColorStop(0, "rgba(255, 255, 255, 0)");
                grad.addColorStop(0.5, "rgba(255, 255, 255, 0.15)");
                grad.addColorStop(1, "rgba(255, 255, 255, 0)");
                
                this.ui.ctx.fillStyle = grad;
                this.ui.ctx.fillRect(tx + this.PADDING, curY - 4, this.WIDTH - (this.PADDING * 2), 1);
                this.ui.ctx.restore();
                
                curY += 8;
            } else {
                this.ui.drawText(lineObj.text, tx + this.PADDING, curY, bodyFont, "#d4d4d8", "left");
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