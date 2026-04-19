import { UITheme } from '../../ui/UITheme.js'; 
import { CanvasUI } from '../../ui/canvasUI.js';

export class PartyRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader; 
        this.ui = new CanvasUI(ctx);
        
        // --- Scaled 2.4x for 1920x1080 ---
        this.layout = {
            cardW: 600, 
            cardH: 336,     
            gapX: 24,       
            gapY: 48,   
            startY: 216      
        };

        this.menuConfig = {
            // width is now handled dynamically in getMenuLayout, so we just need height/padding
            btnHeight: 64,  // Reduced from 84
            padding: 24     
        };

        // --- CONFIG FOR STATUS ICONS ---
        this.statusIconSheetPath = '/assets/ui/status_icons.png'; 
        this.statusIconSize = 38; // Scaled up from 16
    }

    render(state) {
        const { 
            members, 
            selectedIndex, 
            swappingIdx, 
            menu, // Replaces menuOpen, menuOptions, menuIndex
            mode = 'DEFAULT', 
            activeIndices = [],
            hoveredElement = null,   
            onLayoutUpdate = null    
        } = state; 

        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;
        const hitboxes = []; // Initialize hitboxes array for this frame

        this.ui.clearScreen(width, height);
        
        const headerText = mode === 'BATTLE_SELECT' ? "Select Reserve to Swap In" : "Party Members";
        this.ui.drawText(headerText, width / 2, 120, UITheme.fonts.header, UITheme.colors.textMain, "center");
        
        // --- Scaled Gothic Flourish ---
        this.ui.drawLineWithGothicFlourish((width / 2) - 288, 156, 576, UITheme.colors.borderHighlight);

        members.forEach((member, index) => {
            if (index >= 6) return; 
            const pos = this.getCardPosition(index, width);
            
            // 1. Register Card Hitbox 
            hitboxes.push({
                id: `CARD_${index}`,
                x: pos.x,
                y: pos.y,
                w: this.layout.cardW,
                h: this.layout.cardH,
                cursor: 'pointer'
            });

            // Visually highlight if selected via keyboard OR hovered via mouse
            const isHovered = hoveredElement?.id === `CARD_${index}`;
            const isCursor = (index === selectedIndex) || isHovered; 
            
            const isBeingMoved = (index === swappingIdx);
            const isActive = activeIndices.includes(index);
            const isDead = member.hp <= 0;
            const isUnavailable = mode === 'BATTLE_SELECT' && (isActive || isDead);

            this.drawCard(member, pos.x, pos.y, isCursor, isBeingMoved, isUnavailable, isActive, mode);
        });

        if (menu) {
            // Pass hitboxes array and hover state down to the menu builder
            this.drawContextMenu(selectedIndex, menu, width, hitboxes, hoveredElement);
        }

        let guide = "";
        if (mode === 'BATTLE_SELECT') {
             guide = "[ARROWS] Navigate   [ENT/CLICK] Select   [ESC/R-CLICK] Cancel";
        } else {
            guide = "[ARROWS] Navigate   [ENT/CLICK] Menu   [ESC/R-CLICK] Back";
            if (menu) {
                guide = "[UP/DOWN] Choose   [ENT/CLICK] Select   [ESC/R-CLICK] Cancel";
            } else if (swappingIdx !== null) {
                guide = "[ARROWS] Move to Slot   [ENT/CLICK] Place   [ESC/R-CLICK] Cancel";
            }
        }
        
        this.ui.drawText(guide, width / 2, height - 72, UITheme.fonts.mono, UITheme.colors.textMuted, "center");

        // 2. Send hitboxes back to the UI Interaction Manager via the controller
        if (onLayoutUpdate) {
            onLayoutUpdate(hitboxes);
        }
    }
    
    // Update layout to snap to the left side, half width, full height
    getMenuLayout(cardIndex, canvasWidth) {
        const cardPos = this.getCardPosition(cardIndex, canvasWidth);
        
        return { 
            x: cardPos.x,                     // Snapped to the left edge of the card
            y: cardPos.y,                     // Snapped to the top edge of the card
            w: this.layout.cardW / 2,         // Exactly half the card's width
            h: this.layout.cardH              // Exactly the card's full height
        };
    }
    
    drawContextMenu(cardIndex, menu, canvasWidth, hitboxes, hoveredElement) {
        const options = menu.options;
        const highlightIndex = menu.selectedIndex;
        const layout = this.getMenuLayout(cardIndex, canvasWidth); // Removed itemCount dependency

        this.ui.drawPanel(layout.x, layout.y, layout.w, layout.h, UITheme.colors.bgScale[1]);
        
        // Background blocker
        hitboxes.unshift({
            id: 'MENU_BG',
            x: layout.x,
            y: layout.y,
            w: layout.w,
            h: layout.h,
            cursor: 'default'
        });

        options.forEach((opt, i) => {
            const btnY = layout.y + this.menuConfig.padding + (i * this.menuConfig.btnHeight);
            
            // Unshift to prioritize menu hitboxes over the card
            hitboxes.unshift({
                id: `MENU_OPT_${i}`,
                x: layout.x,
                y: btnY,
                w: layout.w,
                h: this.menuConfig.btnHeight,
                cursor: 'pointer'
            });

            // Hover styling
            const isHovered = (i === highlightIndex) || (hoveredElement?.id === `MENU_OPT_${i}`);
            
            if (isHovered) {
                this.ui.drawRect(layout.x + 12, btnY, layout.w - 24, this.menuConfig.btnHeight, "rgba(255, 255, 255, 0.05)", true);
            }
            
            // Standardize the color for all options
            const color = UITheme.colors.textMain;
            
           this.ui.drawText(opt.label, layout.x + (layout.w/2), btnY + (this.menuConfig.btnHeight/2), UITheme.fonts.cardSmall, color, "center", "middle");
        });
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
        
        // 1. Background Frame
        let bgColor = UITheme.colors.panelBg;
        
        if (isBeingMoved) {
            bgColor = UITheme.colors.stmDim;
        } else if (isCursor) {
            bgColor = isUnavailable ? 'rgba(100, 0, 0, 0.2)' : UITheme.colors.bgScale[2];
        }

        this.ui.drawPanel(x, y, cardW, cardH, bgColor);

        if (isBeingMoved) {
            this.ui.drawRect(x, y, cardW, cardH, UITheme.colors.stm, false);
        }

        if (isCursor && !isBeingMoved) {
            const time = performance.now() * 0.004;
            const pulse = (Math.sin(time) + 1) / 2;
            const brktDist = 7 + (pulse * 10); // Scaled
            const bracketColor = isUnavailable ? UITheme.colors.failure : UITheme.colors.borderHighlight;
            this.ui.drawSelectionBrackets(x, y, cardW, cardH, brktDist, bracketColor);
        }

        if (isUnavailable) {
             this.ui.drawRect(x, y, cardW, cardH, 'rgba(0, 0, 0, 0.6)', true);
        }

        if (member.skillPoints && member.skillPoints > 0 && !isUnavailable) {
            const time = performance.now() * 0.005;
            const alpha = 0.5 + (Math.sin(time) + 1) * 0.25; 
            const goldRgb = "184, 153, 71"; 
            this.ui.drawText("★ LVL UP", x + cardW - 19, y + cardH - 24, UITheme.fonts.cardTitle, `rgba(${goldRgb}, ${alpha})`, "right");
        }

        // 2. Portrait (Scaled up from 128x128 to ~307x307)
        const pSize = 307; 
        const pX = x + 10; 
        const pY = y + 14;  
        const masterSheet = this.loader.get(member.spritePortrait);

        this.ui.drawRect(pX, pY, pSize, pSize, "rgba(0,0,0,0.5)", true);
        
        if (masterSheet) {
            // Read 128x128 from sheet, draw at 307x307
            ctx.drawImage(masterSheet, 0, 0, 128, 128, pX, pY, pSize, pSize);
        }

        this.ui.drawRect(pX, pY, pSize, pSize, UITheme.colors.border, false);

        this.drawStatusEffects(member, pX, pY, pSize);

        // 3. Info Column
        const infoX = pX + pSize + 19; 
        const numberWidth = 91;       
        const labelWidth = 48;        
        const barW = cardW - (pX - x) - pSize - 19 - labelWidth - numberWidth - 19;

        this.ui.drawText(member.name, infoX, y + 43, UITheme.fonts.cardTitle, UITheme.colors.textMain);

        const levelText = `Lv.${member.level || 1}`;
        let statusPrefix = "";
        let statusColor = UITheme.colors.textMuted;
        
        if (isActive && mode === 'BATTLE_SELECT') {
             statusPrefix = "ACT - ";
             statusColor = UITheme.colors.hp;
        } else if (member.hp <= 0) {
             statusPrefix = "FNT - ";
             statusColor = UITheme.colors.failure;
        }
        
        this.ui.drawText(`${statusPrefix}${levelText}`, infoX, y + 77, UITheme.fonts.cardSmall, statusColor);

        const xpY = y + 113; 
        this.ui.drawText("XP", infoX, xpY + 12, UITheme.fonts.cardMono, UITheme.colors.textMuted);
        this.ui.drawBar(infoX + labelWidth, xpY, barW, 10, member.xp || 0, member.maxXp || 1, UITheme.colors.xp, UITheme.colors.xpDim);
        this.ui.drawText(`${Math.floor(member.xp || 0)}/${member.maxXp || 1}`, infoX + labelWidth + barW + numberWidth, xpY + 12, UITheme.fonts.cardMono, UITheme.colors.textMuted, "right");

        let currentY = y + 144;
        this.drawStatRow("HP", member.hp, member.maxHp, infoX, currentY, barW, 10, numberWidth, labelWidth, UITheme.colors.hp, UITheme.colors.hpDim);
        currentY += 29;
        this.drawStatRow("STM", member.stamina, member.maxStamina, infoX, currentY, barW, 10, numberWidth, labelWidth, UITheme.colors.stm, UITheme.colors.stmDim);
        currentY += 29;
        this.drawStatRow("INS", member.insight, member.maxInsight, infoX, currentY, barW, 10, numberWidth, labelWidth, UITheme.colors.ins, UITheme.colors.insDim);
        
        ctx.restore();
    }

    drawStatRow(label, current, max, x, y, barW, h, numW, labelW, color, dimColor) {
        this.ui.drawText(label, x, y + 12, UITheme.fonts.cardMono, UITheme.colors.textMuted);
        this.ui.drawBar(x + labelW, y, barW, h, current, max, color, dimColor);
        this.ui.drawText(`${Math.floor(current)}/${max}`, x + labelW + barW + numW, y + 12, UITheme.fonts.cardMono, UITheme.colors.textMuted, "right");
    }

    drawStatusEffects(member, pX, pY, pSize) {
        if (!member.statusEffects || member.statusEffects.length === 0) return;

        const sheetKey = 'statusEffects'; 
        const srcSize = 32;  
        const drawSize = 38; // Scaled up
        const spacing = 5; 

        const sheet = this.loader.get ? this.loader.get(sheetKey) : this.loader.getAsset(sheetKey);
        
        let drawX = pX + 5; 
        let drawY = pY + pSize - drawSize - 5;

        member.statusEffects.forEach(effect => {
            this.ui.drawRect(drawX, drawY, drawSize, drawSize, 'rgba(0, 0, 0, 0.8)', true);
            this.ui.drawRect(drawX, drawY, drawSize, drawSize, UITheme.colors.border, false);

            if (sheet && effect.icon) {
                this.ctx.drawImage(
                    sheet, 
                    effect.icon.col * srcSize, effect.icon.row * srcSize, srcSize, srcSize, 
                    drawX, drawY, drawSize, drawSize 
                );
            } else {
                this.ui.drawText(effect.name.charAt(0), drawX + (drawSize/2), drawY + (drawSize/2) + 2, UITheme.fonts.cardSmall, UITheme.colors.textMain, "center", "middle");
            }

            if (effect.stacks && effect.stacks > 1) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                this.ctx.beginPath();
                this.ctx.arc(drawX + drawSize, drawY + drawSize, 14, 0, Math.PI * 2); // Scaled circle
                this.ctx.fill();
                
                this.ui.drawText(effect.stacks.toString(), drawX + drawSize, drawY + drawSize + 2, UITheme.fonts.cardMono, "white", "center", "middle");
            }

            drawX += (drawSize + spacing);
            if (drawX + drawSize > pX + pSize) return;
        });
    }
}