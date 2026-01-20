import { UITheme } from '../../ui/UITheme.js'; 
import { CanvasUI } from '../../ui/canvasUI.js';

export class PartyRenderer {
    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {AssetLoader} loader - REQUIRED for portraits
     */
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader; 
        this.ui = new CanvasUI(ctx);
        
        // --- LAYOUT CONFIG ---
        this.layout = {
            cardW: 340,
            cardH: 120,
            gapX: 20,
            gapY: 20,
            startX: 60,
            startY: 100
        };
    }

    render(state) {
        const { members, selectedIndex, gold } = state;
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;

        // 1. Background
        this.ui.clearScreen(width, height);

        // 2. Header
        this.ui.drawText("Party Members", 60, 60, UITheme.fonts.header, UITheme.colors.textMain);
        this.ui.drawText(`Gold: ${gold}g`, width - 150, 60, UITheme.fonts.header, UITheme.colors.textHighlight);

        // 3. Grid Render
        members.forEach((member, index) => {
            const col = index % 2; 
            const row = Math.floor(index / 2);

            const x = this.layout.startX + (col * (this.layout.cardW + this.layout.gapX));
            const y = this.layout.startY + (row * (this.layout.cardH + this.layout.gapY));
            
            this.drawCard(member, x, y, index === selectedIndex);
        });

        // 4. Footer Guide
        this.ui.drawText("[ARROWS] Navigate   [ENT] Select   [ESC] Back", 60, height - 30, UITheme.fonts.mono, UITheme.colors.textMuted);
    }

    drawCard(member, x, y, isSelected) {
        const ctx = this.ctx;
        const { cardW, cardH } = this.layout;

        // --- A. Card Background ---
        ctx.save();
        // If selected, use a slightly lighter background
        ctx.fillStyle = isSelected ? "#2a2a2a" : UITheme.colors.panelBg;
        ctx.fillRect(x, y, cardW, cardH);
        
        // Border: Gold/Green if selected, Dark Gray if not
        ctx.strokeStyle = isSelected ? UITheme.colors.textHighlight : UITheme.colors.border;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(x, y, cardW, cardH);
        ctx.restore();

        // --- B. Portrait ---
        // Retrieve image from AssetLoader using the key stored in entity state
        const portraitKey = member.state.portrait; 
        const portraitImg = this.loader ? this.loader.get(portraitKey) : null;
        
        const pSize = 90;
        const pX = x + 15;
        const pY = y + 15;

        if (portraitImg) {
            ctx.drawImage(portraitImg, pX, pY, pSize, pSize);
            ctx.strokeStyle = UITheme.colors.border;
            ctx.strokeRect(pX, pY, pSize, pSize);
        } else {
            // Fallback (Gray Box) if asset isn't loaded/found
            ctx.fillStyle = "#111";
            ctx.fillRect(pX, pY, pSize, pSize);
        }

        // --- C. Text Info ---
        const infoX = x + 120;
        this.ui.drawText(member.name, infoX, y + 30, UITheme.fonts.bold, UITheme.colors.textMain);
        
        // Optional Subtext (Class/Level)
        const subtext = `Lvl ${member.level || 1} ${member.state.class || 'Unknown'}`;
        this.ui.drawText(subtext, infoX, y + 50, UITheme.fonts.small, UITheme.colors.textMuted);

        // --- D. Stat Bars ---
        const barW = 180;
        const barH = 8;
        const spacing = 18;
        let currentY = y + 65;

        // HP (Red)
        this.drawStatRow("HP", member.hp, member.maxHp, infoX, currentY, barW, barH, UITheme.colors.danger);
        
        // Stamina (Gold/Yellow)
        currentY += spacing;
        this.drawStatRow("STM", member.stamina, member.maxStamina, infoX, currentY, barW, barH, "#fbc02d");

        // Insight (Magic Blue/Purple)
        currentY += spacing;
        this.drawStatRow("INS", member.insight, member.maxInsight, infoX, currentY, barW, barH, UITheme.colors.magic);
    }

    drawStatRow(label, current, max, x, y, w, h, color) {
        // Label
        this.ui.drawText(label, x, y + 7, "10px monospace", UITheme.colors.textMuted);
        
        // Bar (Offset to right of label)
        const barOffsetX = x + 30;
        const barActualWidth = w - 30;
        this.ui.drawBar(barOffsetX, y, barActualWidth, h, current, max, color);

        // Numeric Overlay
        // const valText = `${Math.floor(current)}/${Math.floor(max)}`;
        // this.ui.drawText(valText, barOffsetX + barActualWidth + 5, y + 7, "10px monospace", UITheme.colors.textMain);
    }
}