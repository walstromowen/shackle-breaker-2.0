import { UITheme } from '../../ui/UITheme.js'; 
import { CanvasUI } from '../../ui/canvasUI.js';

export class PartyRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader; 
        this.ui = new CanvasUI(ctx);
        
        this.layout = {
            cardW: 250, 
            cardH: 140,     
            gapX: 10,       
            gapY: 20,   
            startY: 90      
        };

        this.menuConfig = {
            width: 120,
            btnHeight: 35,
            padding: 10
        };

        // --- CONFIG FOR STATUS ICONS ---
        // Change this path to wherever your status icon spritesheet is stored
        this.statusIconSheetPath = '/assets/ui/status_icons.png'; 
        this.statusIconSize = 16; 
    }

    render(state) {
        const { members, selectedIndex, swappingIdx, menuOpen, menuOptions, menuIndex, mode = 'DEFAULT', activeIndices = [] } = state; 
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;

        this.ui.clearScreen(width, height);
        
        const headerText = mode === 'BATTLE_SELECT' ? "Select Reserve to Swap In" : "Party Members";
        this.ui.drawText(headerText, width / 2, 50, UITheme.fonts.header, UITheme.colors.textMain, "center");

        members.forEach((member, index) => {
            if (index >= 6) return; 
            const pos = this.getCardPosition(index, width);
            
            const isCursor = (index === selectedIndex);
            const isBeingMoved = (index === swappingIdx);
            
            const isActive = activeIndices.includes(index);
            const isDead = member.hp <= 0;
            const isUnavailable = mode === 'BATTLE_SELECT' && (isActive || isDead);

            this.drawCard(member, pos.x, pos.y, isCursor, isBeingMoved, isUnavailable, isActive, mode);
        });

        if (menuOpen) {
            this.drawContextMenu(selectedIndex, menuOptions, menuIndex, width);
        }

        let guide = "";
        if (mode === 'BATTLE_SELECT') {
             guide = "[ARROWS] Navigate   [ENT/CLICK] Select   [ESC] Cancel";
        } else {
            guide = "[ARROWS] Navigate   [ENT/CLICK] Menu   [ESC] Back";
            if (menuOpen) {
                guide = "[UP/DOWN] Choose   [ENT/CLICK] Select   [ESC] Cancel";
            } else if (swappingIdx !== null) {
                guide = "[ARROWS] Move to Slot   [ENT/CLICK] Place   [ESC] Cancel";
            }
        }
        
        this.ui.drawText(guide, width / 2, height - 30, UITheme.fonts.mono, UITheme.colors.textMuted, "center");
    }

    // ... (keep isPointInRect, getMenuLayout, drawContextMenu, getMenuHit, getHitIndex, getCardPosition exactly as before) ...
    isPointInRect(x, y, rect) { return (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h); }
    getMenuLayout(cardIndex, canvasWidth, itemCount = 3) {
        const cardPos = this.getCardPosition(cardIndex, canvasWidth);
        const { width, btnHeight, padding } = this.menuConfig;
        const totalH = (itemCount * btnHeight) + (padding * 2); 
        return { x: cardPos.x + (this.layout.cardW / 2) - (width / 2), y: cardPos.y + (this.layout.cardH / 2) - (totalH / 2), w: width, h: totalH };
    }
    drawContextMenu(cardIndex, options, highlightIndex, canvasWidth) {
        const layout = this.getMenuLayout(cardIndex, canvasWidth, options.length);
        this.ui.drawPanel(layout.x, layout.y, layout.w, layout.h, UITheme.colors.bgScale[1]);
        options.forEach((opt, i) => {
            const isHovered = (i === highlightIndex);
            const btnY = layout.y + this.menuConfig.padding + (i * this.menuConfig.btnHeight);
            if (isHovered) this.ui.drawRect(layout.x + 5, btnY, layout.w - 10, this.menuConfig.btnHeight, "rgba(255, 255, 255, 0.1)", true);
            let color = UITheme.colors.textMain;
            if (opt === 'Level Up') color = UITheme.colors.gold || "rgb(255, 215, 0)"; 
            this.ui.drawText(opt, layout.x + (layout.w/2), btnY + (this.menuConfig.btnHeight/2), UITheme.fonts.body, color, "center", "middle");
        });
    }
    getMenuHit(mouseX, mouseY, cardIndex, itemCount = 3) {
        const width = this.ctx.canvas.width;
        const layout = this.getMenuLayout(cardIndex, width, itemCount);
        if (!this.isPointInRect(mouseX, mouseY, layout)) return -1;
        const relY = mouseY - (layout.y + this.menuConfig.padding);
        const index = Math.floor(relY / this.menuConfig.btnHeight);
        if (index >= 0 && index < itemCount) return index;
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
        return { x: startX + (col * (cardW + gapX)), y: startY + (row * (cardH + gapY)) };
    }

    drawCard(member, x, y, isCursor, isBeingMoved, isUnavailable, isActive, mode) {
        const ctx = this.ctx;
        const { cardW, cardH } = this.layout;

        ctx.save();
        
        // 1. Background & Brackets
        if (isBeingMoved) {
            ctx.fillStyle = UITheme.colors.stmDim; 
            ctx.strokeStyle = UITheme.colors.stm;
            ctx.lineWidth = 2;
        } else if (isCursor) {
            ctx.fillStyle = isUnavailable ? 'rgba(255, 0, 0, 0.2)' : UITheme.colors.bgScale[2];
            ctx.strokeStyle = 'transparent'; 
        } else {
            ctx.fillStyle = UITheme.colors.panelBg;
            ctx.strokeStyle = UITheme.colors.border;
            ctx.lineWidth = 1;
        }
        ctx.fillRect(x, y, cardW, cardH);
        if (ctx.strokeStyle !== 'transparent') ctx.strokeRect(x, y, cardW, cardH);

        if (isCursor && !isBeingMoved) {
            const time = performance.now() * 0.004;
            const pulse = (Math.sin(time) + 1) / 2;
            const brktDist = 3 + (pulse * 4); 
            const bracketColor = isUnavailable ? 'rgba(255, 0, 0, 0.8)' : (UITheme.colors.gold || "rgb(255, 215, 0)");
            this.ui.drawSelectionBrackets(x, y, cardW, cardH, brktDist, bracketColor);
        }

        if (isUnavailable) {
             ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
             ctx.fillRect(x, y, cardW, cardH);
        }

        // Level Up Indicator
        if (member.skillPoints && member.skillPoints > 0 && !isUnavailable) {
            const time = performance.now() * 0.005;
            const alpha = 0.5 + (Math.sin(time) + 1) * 0.25; 
            this.ui.drawText("★ LVL UP", x + cardW - 8, y + cardH - 10, "bold 11px monospace", `rgba(255, 215, 0, ${alpha})`, "right");
        }

        // 2. Portrait
        const pSize = 128; 
        const pX = x + 4; 
        const pY = y + 6;  
        const masterSheet = this.loader.get(member.spritePortrait);

        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(pX, pY, pSize, pSize);
        if (masterSheet) ctx.drawImage(masterSheet, 0, 0, 128, 128, pX, pY, pSize, pSize);
        ctx.strokeStyle = UITheme.colors.border;
        ctx.strokeRect(pX, pY, pSize, pSize);

        // --- NEW: Draw Status Effects Over Portrait ---
        this.drawStatusEffects(member, pX, pY, pSize);

        // 3. Info Column
        const infoX = pX + pSize + 8; 
        const numberWidth = 38;       
        const labelWidth = 20;        
        const barW = cardW - (pX - x) - pSize - 8 - labelWidth - numberWidth - 8;

        // Name & Level
        this.ui.drawText(member.name, infoX, y + 18, "bold 13px sans-serif", UITheme.colors.textMain);

        const levelText = `Lv.${member.level || 1}`;
        let statusPrefix = "";
        let statusColor = UITheme.colors.textMuted;
        if (isActive && mode === 'BATTLE_SELECT') {
             statusPrefix = "ACT - ";
             statusColor = UITheme.colors.hp;
        } else if (member.hp <= 0) {
             statusPrefix = "FNT - ";
             statusColor = "red";
        }
        this.ui.drawText(`${statusPrefix}${levelText}`, infoX, y + 32, "bold 11px sans-serif", statusColor);

        // XP Bar & Stats
        const xpY = y + 47; 
        this.ui.drawText("XP", infoX, xpY + 5, "9px monospace", UITheme.colors.textMuted);
        this.ui.drawBar(infoX + labelWidth, xpY, barW, 4, member.xp || 0, member.maxXp || 1, UITheme.colors.xp, UITheme.colors.xpDim);
        this.ui.drawText(`${Math.floor(member.xp || 0)}/${member.maxXp || 1}`, infoX + labelWidth + barW + numberWidth, xpY + 5, "9px monospace", UITheme.colors.textMuted, "right");

        let currentY = y + 60;
        this.drawStatRow("HP", member.hp, member.maxHp, infoX, currentY, barW, 4, numberWidth, labelWidth, UITheme.colors.hp, UITheme.colors.hpDim);
        currentY += 12;
        this.drawStatRow("STM", member.stamina, member.maxStamina, infoX, currentY, barW, 4, numberWidth, labelWidth, UITheme.colors.stm, UITheme.colors.stmDim);
        currentY += 12;
        this.drawStatRow("INS", member.insight, member.maxInsight, infoX, currentY, barW, 4, numberWidth, labelWidth, UITheme.colors.ins, UITheme.colors.insDim);
        
        ctx.restore();
    }

    drawStatRow(label, current, max, x, y, barW, h, numW, labelW, color, dimColor) {
        this.ui.drawText(label, x, y + 5, "9px monospace", UITheme.colors.textMuted);
        this.ui.drawBar(x + labelW, y, barW, h, current, max, color, dimColor);
        this.ui.drawText(`${Math.floor(current)}/${max}`, x + labelW + barW + numW, y + 5, "9px monospace", UITheme.colors.textMuted, "right");
    }

    drawStatusEffects(member, pX, pY, pSize) {
        if (!member.statusEffects || member.statusEffects.length === 0) return;

        // --- HARDCODED CONFIG ---
        // Placing these directly in the method guarantees they are never undefined
        const sheetKey = 'statusEffects'; 
        const srcSize = 32;  // The size of the icon on the sprite sheet (like the Battle HUD)
        const drawSize = 16; // The size we want to draw it on the portrait
        const spacing = 2; 

        // Fetch the spritesheet safely
        const sheet = this.loader.get ? this.loader.get(sheetKey) : this.loader.getAsset(sheetKey);
        
        // Start bottom left of the portrait
        let drawX = pX + 2; 
        let drawY = pY + pSize - drawSize - 2;

        member.statusEffects.forEach(effect => {
            // Draw dark background box
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.fillRect(drawX, drawY, drawSize, drawSize);

            if (sheet && effect.icon) {
                // Slice from 32x32 source, draw at 16x16
                this.ctx.drawImage(
                    sheet, 
                    effect.icon.col * srcSize, effect.icon.row * srcSize, srcSize, srcSize, 
                    drawX, drawY, drawSize, drawSize 
                );
            } else {
                // Fallback letter
                this.ui.drawText(effect.name.charAt(0), drawX + (drawSize/2), drawY + (drawSize/2) + 3, "bold 10px sans-serif", "white", "center");
            }

            // Draw border
            this.ctx.strokeStyle = UITheme.colors.border;
            this.ctx.strokeRect(drawX, drawY, drawSize, drawSize);

            // Draw stack badge if applicable
            if (effect.stacks && effect.stacks > 1) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(drawX + drawSize, drawY + drawSize, 6, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ui.drawText(effect.stacks.toString(), drawX + drawSize, drawY + drawSize + 3, "bold 9px sans-serif", "white", "center");
            }

            drawX += (drawSize + spacing);
            
            // Stop if we run out of room on the portrait
            if (drawX + drawSize > pX + pSize) return;
        });
    }
}