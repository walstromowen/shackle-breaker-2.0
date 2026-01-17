import { UITheme } from '../../../src/ui/UITheme.js';
import { CanvasUI } from '../../ui/canvasUI.js';

export class PartyRenderer {
    constructor(ctx) {
        this.ui = new CanvasUI(ctx);
        this.ctx = ctx;
    }

    render(state) {
        const { members } = state;
        
        // 1. Clear Screen
        this.ui.clearScreen(800, 600);

        // 2. Header
        this.ui.drawText("PARTY OVERVIEW", 20, 40, UITheme.fonts.header);
        this.ui.drawText("[TAB] RETURN TO WORLD", 780, 40, UITheme.fonts.small, UITheme.colors.textMuted, "right");

        // 3. Pokémon DS Layout
        // LEFT: The Leader (The one we just created)
        this.drawMemberCard(members[0], 20, 80, 300, 480, true);

        // RIGHT: The rest of the party (slots 2-6)
        for (let i = 1; i < 6; i++) {
            const y = 80 + (i - 1) * 95;
            this.drawMemberCard(members[i], 340, y, 440, 85, false);
        }
    }

    drawMemberCard(entity, x, y, w, h, isLarge) {
        this.ui.drawPanel(x, y, w, h);

        if (!entity) {
            this.ui.drawText("--- EMPTY SLOT ---", x + w/2, y + h/2, UITheme.fonts.small, UITheme.colors.textMuted, "center");
            return;
        }

        // --- Verification Data ---
        // Name and Class (Origin)
        this.ui.drawText(entity.name, x + 20, y + 30, UITheme.fonts.bold, UITheme.colors.textMain);
        this.ui.drawText(entity.origin, x + 20, y + 55, UITheme.fonts.small, UITheme.colors.accent);

        // HP Bar (Confirms the Model Math is working)
        const barW = w - 40;
        const barY = y + h - 40;
        this.drawBar(x + 20, barY, barW, 12, entity.hp, entity.maxHp, UITheme.colors.danger);
        
        // HP Numbers
        this.ui.drawText(`${Math.floor(entity.hp)} / ${entity.maxHp} HP`, x + 20, barY - 15, UITheme.fonts.small);

        // Large card shows extra stats for verification
        if (isLarge) {
            const stats = [
                `STR: ${entity.strength}`,
                `DEX: ${entity.dexterity}`,
                `VIT: ${entity.vigor}`,
                `INT: ${entity.intelligence}`
            ];
            stats.forEach((s, i) => {
                this.ui.drawText(s, x + 20, y + 100 + (i * 25), UITheme.fonts.small);
            });
        }
    }

    drawBar(x, y, w, h, current, max, color) {
        const fill = Math.max(0, current / max);
        this.ctx.fillStyle = "#222";
        this.ctx.fillRect(x, y, w, h);
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w * fill, h);
        this.ctx.strokeStyle = UITheme.colors.panelBorder;
        this.ctx.strokeRect(x, y, w, h);
    }
}