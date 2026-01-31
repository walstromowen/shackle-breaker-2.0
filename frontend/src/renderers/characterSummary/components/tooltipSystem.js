import { UITheme } from '../../../ui/UITheme.js';
import { TRAIT_DEFINITIONS } from '../../../../../shared/data/traitDefinitions.js';
import { Formatting } from '../../../../../shared/utils/formatting.js';

export class TooltipSystem {
    constructor(ui) {
        this.ui = ui;
        this.WIDTH = 240;
        this.PADDING = 12;
    }

    render(state, hitboxes) {
        const { input, member, filteredInventory } = state;
        
        // 1. Basic Validation
        if (!input || !input.mouse) return;
        const mx = input.mouse.x;
        const my = input.mouse.y;

        // 2. Find Hovered Hitbox (LIFO - Last rendered is on top)
        let hovered = null;
        for (let i = hitboxes.length - 1; i >= 0; i--) {
            const b = hitboxes[i];
            if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
                hovered = b;
                break;
            }
        }

        if (!hovered) return;

        // 3. Determine Content based on Type
        let content = null;

        if (hovered.type === 'trait') {
            content = this._getTraitContent(hovered.id);
        } else if (hovered.type === 'inventory') {
            const item = filteredInventory[hovered.index]; // index stored in hitbox
            if (item) content = this._getItemContent(item);
        } else if (hovered.type === 'slot') {
            // Find item in equipment
            const equip = (member.state && member.state.equipment) ? member.state.equipment : member.equipment;
            const item = equip ? equip[hovered.slotId] : null; // slotId stored in hitbox
            content = this._getItemContent(item, hovered.slotId);
        }

        // 4. Draw Tooltip
        if (content) {
            this._drawTooltip(content, mx, my);
        }
    }

    _getTraitContent(traitId) {
        const def = TRAIT_DEFINITIONS[traitId] || { name: traitId, description: "Unknown trait." };
        return {
            title: def.name,
            type: "Trait",
            color: UITheme.colors.accent,
            lines: [def.description]
        };
    }

    _getItemContent(item, slotName) {
        if (!item) {
            // Empty Slot Case
            if (slotName) {
                return {
                    title: "Empty Slot",
                    type: slotName.toUpperCase(),
                    color: "#666",
                    lines: ["No item equipped."]
                };
            }
            return null;
        }

        const def = item.definition || item;
        const lines = [];

        // Stats summary
        if (def.stats) {
            if (def.stats.damage) lines.push(`DMG: ${def.stats.damage}`);
            if (def.stats.defense) lines.push(`DEF: ${def.stats.defense.physical || def.stats.defense}`);
            
            // Add attribute bonuses
            if (def.stats.attributes) {
                const attrs = [];
                for (const [key, val] of Object.entries(def.stats.attributes)) {
                    if (val !== 0) attrs.push(`${Formatting.getAbbreviation(key)} ${Formatting.formatSigned(val)}`);
                }
                if (attrs.length > 0) lines.push(attrs.join(", "));
            }
        }

        // Description
        if (def.description) {
            lines.push("---"); // Separator
            lines.push(def.description);
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
        
        // Calculate Height dynamically
        this.ui.ctx.font = UITheme.fonts.body;
        const lineHeight = 16;
        let contentHeight = 40; // Title + Type padding

        const wrappedLines = [];
        
        lines.forEach(rawLine => {
            if (rawLine === "---") {
                contentHeight += 10;
                wrappedLines.push({ text: "---", isSeparator: true });
            } else {
                const wLines = this.ui.getWrappedLines(rawLine, this.WIDTH - (this.PADDING * 2), UITheme.fonts.body);
                wLines.forEach(l => {
                    wrappedLines.push({ text: l, isSeparator: false });
                    contentHeight += lineHeight;
                });
            }
        });

        // Smart Positioning (Clamp to screen)
        const screenW = this.ui.ctx.canvas.width;
        const screenH = this.ui.ctx.canvas.height;
        
        let tx = mx + 15;
        let ty = my + 15;

        // Flip left if too far right
        if (tx + this.WIDTH > screenW) tx = mx - this.WIDTH - 15;
        // Flip up if too far down
        if (ty + contentHeight > screenH) ty = screenH - contentHeight - 10;

        // Draw Background
        this.ui.drawRect(tx, ty, this.WIDTH, contentHeight, "rgba(10, 12, 16, 0.95)");
        this.ui.drawRect(tx, ty, this.WIDTH, contentHeight, UITheme.colors.border, false); // Stroke

        // Draw Header
        this.ui.drawText(title, tx + this.PADDING, ty + 20, "bold 13px sans-serif", color, "left");
        this.ui.drawText(type, tx + this.WIDTH - this.PADDING, ty + 20, "10px monospace", "#666", "right");

        this.ui.drawRect(tx + this.PADDING, ty + 28, this.WIDTH - (this.PADDING * 2), 1, "#333");

        // Draw Body
        let curY = ty + 42;
        wrappedLines.forEach(lineObj => {
            if (lineObj.isSeparator) {
                this.ui.drawRect(tx + this.PADDING + 10, curY - 4, this.WIDTH - (this.PADDING * 2) - 20, 1, "#222");
                curY += 8;
            } else {
                this.ui.drawText(lineObj.text, tx + this.PADDING, curY, UITheme.fonts.body, "#ccc", "left");
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