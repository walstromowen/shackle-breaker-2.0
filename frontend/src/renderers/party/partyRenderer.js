import { UITheme } from '../../ui/UITheme.js'; 
import { CanvasUI } from '../../ui/canvasUI.js';

export class PartyRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader; 
        this.ui = new CanvasUI(ctx);
        
        this.layout = {
            cardW: 230,
            cardH: 140,     
            gapX: 15,       
            gapY: 20,   
            startY: 90      
        };

        // --- NEW: SHARED MENU CONFIG ---
        this.menuConfig = {
            width: 120,
            btnHeight: 35,
            padding: 10
        };
    }

    render(state) {
        const { members, selectedIndex, swappingIdx, menuOpen, menuOptions, menuIndex } = state; 
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;

        this.ui.clearScreen(width, height);
        this.ui.drawText("Party Members", width / 2, 50, UITheme.fonts.header, UITheme.colors.textMain, "center");

        members.forEach((member, index) => {
            if (index >= 6) return; 
            const pos = this.getCardPosition(index, width);
            const isCursor = (index === selectedIndex);
            const isBeingMoved = (index === swappingIdx);
            this.drawCard(member, pos.x, pos.y, isCursor, isBeingMoved);
        });

        // 4. Context Menu (Using centralized UI)
        if (menuOpen) {
            this.drawContextMenu(selectedIndex, menuOptions, menuIndex, width);
        }

        let guide = menuOpen ? "[UP/DOWN] Choose   [ENT/CLICK] Select   [ESC] Cancel" :
                    (swappingIdx !== null) ? "[ARROWS] Move to Slot   [ENT/CLICK] Place   [ESC] Cancel" :
                    "[ARROWS] Navigate   [ENT/CLICK] Menu   [ESC] Back";
        
        this.ui.drawText(guide, width / 2, height - 30, UITheme.fonts.mono, UITheme.colors.textMuted, "center");
    }

    // --- SHARED HELPER FOR MENU POSITIONING ---
    getMenuLayout(cardIndex, canvasWidth) {
        const cardPos = this.getCardPosition(cardIndex, canvasWidth);
        const { width, btnHeight, padding } = this.menuConfig;
        const totalH = (3 * btnHeight) + (padding * 2); // Assuming 3 options

        return {
            x: cardPos.x + (this.layout.cardW / 2) - (width / 2),
            y: cardPos.y + (this.layout.cardH / 2) - (totalH / 2),
            w: width,
            h: totalH
        };
    }

    drawContextMenu(cardIndex, options, highlightIndex, canvasWidth) {
        const layout = this.getMenuLayout(cardIndex, canvasWidth);
        
        // 1. Draw Menu Panel Background
        this.ui.drawPanel(layout.x, layout.y, layout.w, layout.h);

        // 2. Draw Buttons using CanvasUI
        options.forEach((opt, i) => {
            const isHovered = (i === highlightIndex);
            const btnY = layout.y + this.menuConfig.padding + (i * this.menuConfig.btnHeight);
            
            this.ui.drawButton(
                opt, 
                layout.x + 5, 
                btnY, 
                layout.w - 10, 
                this.menuConfig.btnHeight - 4, 
                isHovered
            );
        });
    }

    // --- UPDATED HIT DETECTION ---
    getMenuHit(mouseX, mouseY, cardIndex) {
        const width = this.ctx.canvas.width;
        const layout = this.getMenuLayout(cardIndex, width);

        // First check if click is inside the menu panel at all
        if (!CanvasUI.isPointInRect(mouseX, mouseY, layout)) return -1;

        // Calculate which button was hit relative to the top of the list
        const relY = mouseY - (layout.y + this.menuConfig.padding);
        const index = Math.floor(relY / this.menuConfig.btnHeight);

        if (index >= 0 && index < 3) return index;
        return -1;
    }

    getHitIndex(mouseX, mouseY) {
        const width = this.ctx.canvas.width;
        for (let i = 0; i < 6; i++) {
            const pos = this.getCardPosition(i, width);
            const rect = { x: pos.x, y: pos.y, w: this.layout.cardW, h: this.layout.cardH };
            if (CanvasUI.isPointInRect(mouseX, mouseY, rect)) return i;
        }
        return -1;
    }

    getCardPosition(index, canvasWidth) {
        const COLS = 3;
        const { cardW, cardH, gapX, gapY, startY } = this.layout;
        const totalGridWidth = (COLS * cardW) + ((COLS - 1) * gapX);
        const startX = (canvasWidth - totalGridWidth) / 2;
        const col = index % 3;            
        const row = Math.floor(index / 3); 
        return {
            x: startX + (col * (cardW + gapX)),
            y: startY + (row * (cardH + gapY))
        };
    }

    drawCard(member, x, y, isCursor, isBeingMoved) {
        const ctx = this.ctx;
        const { cardW, cardH } = this.layout;

        ctx.save();
        if (isBeingMoved) {
            ctx.fillStyle = "#1a3a1a"; 
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 2;
        } else if (isCursor) {
            ctx.fillStyle = "#2a2a2a";
            ctx.strokeStyle = UITheme.colors.textHighlight;
            ctx.lineWidth = 2;
        } else {
            ctx.fillStyle = UITheme.colors.panelBg;
            ctx.strokeStyle = UITheme.colors.border;
            ctx.lineWidth = 1;
        }
        ctx.fillRect(x, y, cardW, cardH);
        ctx.strokeRect(x, y, cardW, cardH);
        ctx.restore();

        const pSize = 64; 
        const pX = x + 10;
        const pY = y + 20; 
        const portraitImg = this.loader ? this.loader.get(member.portrait) : null;

        if (portraitImg) {
            ctx.drawImage(portraitImg, pX, pY, pSize, pSize);
        } else {
            ctx.fillStyle = "#111";
            ctx.fillRect(pX, pY, pSize, pSize);
        }
        ctx.strokeStyle = UITheme.colors.border;
        ctx.strokeRect(pX, pY, pSize, pSize);

        const infoX = pX + pSize + 12; 
        const numberWidth = 45;
        const barW = cardW - (pSize + 25) - 25 - numberWidth;

        this.ui.drawText(member.name, infoX, y + 25, UITheme.fonts.bold, UITheme.colors.textMain);
        this.ui.drawText(`Lvl ${member.level} ${member.speciesId || ''}`, infoX, y + 42, UITheme.fonts.small, UITheme.colors.textMuted);

        // XP Bar
        const xpY = y + 47; 
        this.ui.drawText("XP", infoX, xpY + 5, "9px monospace", UITheme.colors.textMuted);
        this.ui.drawBar(infoX + 22, xpY, barW, 4, member.xp, member.maxXp, "#9370DB");

        // Stat Rows
        let currentY = y + 60;
        this.drawStatRow("HP", member.hp, member.maxHp, infoX, currentY, barW, 4, numberWidth, UITheme.colors.danger);
        currentY += 12;
        this.drawStatRow("STM", member.stamina, member.maxStamina, infoX, currentY, barW, 4, numberWidth, "#fbc02d");
        currentY += 12;
        this.drawStatRow("INS", member.insight, member.maxInsight, infoX, currentY, barW, 4, numberWidth, UITheme.colors.magic);
    }

    drawStatRow(label, current, max, x, y, barW, h, numW, color) {
        this.ui.drawText(label, x, y + 5, "9px monospace", UITheme.colors.textMuted);
        this.ui.drawBar(x + 22, y, barW, h, current, max, color);
        
        this.ctx.save();
        this.ctx.textAlign = "right";
        this.ctx.fillStyle = UITheme.colors.textMuted;
        this.ctx.font = "9px monospace";
        this.ctx.fillText(`${Math.floor(current)}/${max}`, x + 22 + barW + numW, y + 5);
        this.ctx.restore();
    }
}