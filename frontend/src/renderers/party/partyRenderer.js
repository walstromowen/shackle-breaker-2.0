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

        // --- MENU CONFIG ---
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

        // 1. Draw Cards
        members.forEach((member, index) => {
            if (index >= 6) return; // Hard limit for visual grid
            const pos = this.getCardPosition(index, width);
            
            const isCursor = (index === selectedIndex);
            const isBeingMoved = (index === swappingIdx);
            
            this.drawCard(member, pos.x, pos.y, isCursor, isBeingMoved);
        });

        // 2. Context Menu (Draw on top)
        if (menuOpen) {
            this.drawContextMenu(selectedIndex, menuOptions, menuIndex, width);
        }

        // 3. Guide Text
        let guide = "[ARROWS] Navigate   [ENT/CLICK] Menu   [ESC] Back";
        if (menuOpen) {
            guide = "[UP/DOWN] Choose   [ENT/CLICK] Select   [ESC] Cancel";
        } else if (swappingIdx !== null) {
            guide = "[ARROWS] Move to Slot   [ENT/CLICK] Place   [ESC] Cancel";
        }
        
        this.ui.drawText(guide, width / 2, height - 30, UITheme.fonts.mono, UITheme.colors.textMuted, "center");
    }

    // --- HELPER: HIT DETECTION ---
    isPointInRect(x, y, rect) {
        return (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h);
    }

    // --- MENU LOGIC ---
    // Added 'itemCount' to calculate dynamic height
    getMenuLayout(cardIndex, canvasWidth, itemCount = 3) {
        const cardPos = this.getCardPosition(cardIndex, canvasWidth);
        const { width, btnHeight, padding } = this.menuConfig;
        
        const totalH = (itemCount * btnHeight) + (padding * 2); 

        return {
            x: cardPos.x + (this.layout.cardW / 2) - (width / 2),
            y: cardPos.y + (this.layout.cardH / 2) - (totalH / 2),
            w: width,
            h: totalH
        };
    }

    drawContextMenu(cardIndex, options, highlightIndex, canvasWidth) {
        // Pass options.length to ensure background box fits content
        const layout = this.getMenuLayout(cardIndex, canvasWidth, options.length);
        
        // 1. Draw Menu Panel Background
        this.ui.drawPanel(layout.x, layout.y, layout.w, layout.h, UITheme.colors.bgScale[1]);

        // 2. Draw Buttons
        options.forEach((opt, i) => {
            const isHovered = (i === highlightIndex);
            const btnY = layout.y + this.menuConfig.padding + (i * this.menuConfig.btnHeight);
            
            // Draw highlight if hovered
            if (isHovered) {
                this.ui.drawRect(layout.x + 5, btnY, layout.w - 10, this.menuConfig.btnHeight, "rgba(255, 255, 255, 0.1)", true);
            }

            const color = UITheme.colors.textMain;
            this.ui.drawText(opt, layout.x + (layout.w/2), btnY + (this.menuConfig.btnHeight/2), UITheme.fonts.body, color, "center", "middle");
        });
    }

    // --- HIT DETECTION ---
    getMenuHit(mouseX, mouseY, cardIndex) {
        const width = this.ctx.canvas.width;
        // Default to 3 items for hit testing if length isn't passed (standard case)
        const layout = this.getMenuLayout(cardIndex, width, 3);

        if (!this.isPointInRect(mouseX, mouseY, layout)) return -1;

        const relY = mouseY - (layout.y + this.menuConfig.padding);
        const index = Math.floor(relY / this.menuConfig.btnHeight);

        // Check against standard menu size (0-2)
        if (index >= 0 && index < 3) return index;
        return -1;
    }

    getHitIndex(mouseX, mouseY) {
        const width = this.ctx.canvas.width;
        for (let i = 0; i < 6; i++) {
            const pos = this.getCardPosition(i, width);
            const rect = { x: pos.x, y: pos.y, w: this.layout.cardW, h: this.layout.cardH };
            
            if (this.isPointInRect(mouseX, mouseY, rect)) return i;
        }
        return -1;
    }

    getCardPosition(index, canvasWidth) {
        const COLS = 3;
        const { cardW, cardH, gapX, gapY, startY } = this.layout;
        
        const totalGridWidth = (COLS * cardW) + ((COLS - 1) * gapX);
        const startX = (canvasWidth - totalGridWidth) / 2;
        
        const col = index % COLS;            
        const row = Math.floor(index / COLS); 
        
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
            ctx.fillStyle = UITheme.colors.stmDim; 
            ctx.strokeStyle = UITheme.colors.stm;
            ctx.lineWidth = 2;
        } else if (isCursor) {
            ctx.fillStyle = UITheme.colors.bgScale[2];
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; 
            ctx.lineWidth = 2;
        } else {
            ctx.fillStyle = UITheme.colors.panelBg;
            ctx.strokeStyle = UITheme.colors.border;
            ctx.lineWidth = 1;
        }
        
        ctx.fillRect(x, y, cardW, cardH);
        ctx.strokeRect(x, y, cardW, cardH);
        ctx.restore();

        // Portrait
        const pSize = 64; 
        const pX = x + 10;
        const pY = y + 20; 
        
        // Safety check for loader
        const portraitImg = (this.loader && member.portrait) ? this.loader.get(member.portrait) : null;

        if (portraitImg) {
            ctx.drawImage(portraitImg, pX, pY, pSize, pSize);
        } else {
            // Placeholder if image missing
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fillRect(pX, pY, pSize, pSize);
        }
        
        ctx.strokeStyle = UITheme.colors.border;
        ctx.strokeRect(pX, pY, pSize, pSize);

        // Info Column
        const infoX = pX + pSize + 12; 
        const numberWidth = 45;
        const barW = cardW - (pSize + 25) - 25 - numberWidth;

        this.ui.drawText(member.name, infoX, y + 25, UITheme.fonts.bold, UITheme.colors.textMain);
        this.ui.drawText(`Lvl ${member.level} ${member.speciesId || ''}`, infoX, y + 42, UITheme.fonts.small, UITheme.colors.textMuted);

        // XP Bar
        const xpY = y + 47; 
        this.ui.drawText("XP", infoX, xpY + 5, "9px monospace", UITheme.colors.textMuted);
        this.ui.drawBar(infoX + 22, xpY, barW, 4, member.xp, member.maxXp, UITheme.colors.xp, UITheme.colors.xpDim);

        // Stat Rows
        let currentY = y + 60;
        this.drawStatRow("HP", member.hp, member.maxHp, infoX, currentY, barW, 4, numberWidth, UITheme.colors.hp, UITheme.colors.hpDim);
        currentY += 12;
        this.drawStatRow("STM", member.stamina, member.maxStamina, infoX, currentY, barW, 4, numberWidth, UITheme.colors.stm, UITheme.colors.stmDim);
        currentY += 12;
        this.drawStatRow("INS", member.insight, member.maxInsight, infoX, currentY, barW, 4, numberWidth, UITheme.colors.ins, UITheme.colors.insDim);
    }

    drawStatRow(label, current, max, x, y, barW, h, numW, color, dimColor) {
        // Label
        this.ui.drawText(label, x, y + 5, "9px monospace", UITheme.colors.textMuted);
        
        // Bar
        this.ui.drawBar(x + 22, y, barW, h, current, max, color, dimColor);
        
        // Numbers (Right Aligned)
        this.ui.drawText(`${Math.floor(current)}/${max}`, x + 22 + barW + numW, y + 5, "9px monospace", UITheme.colors.textMuted, "right");
    }
}