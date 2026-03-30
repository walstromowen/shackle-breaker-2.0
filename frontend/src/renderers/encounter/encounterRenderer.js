import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class EncounterRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader; 
    }

    render(ctx, state) {
        if (!state || !state.text) return;

        const { imageId, text, decisions, ui: uiState, party = [] } = state;
        const selectedIndex = uiState.selectedDecisionIndex || 0;
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;

        const ui = new CanvasUI(ctx);
        
        // --- OVERLAY BACKGROUND ---
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; 
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const p = UITheme.layout.padding;

        // --- LAYOUT CALCULATIONS ---
        const columnWidth = CANVAS_WIDTH * 0.16; 
        const centerWidth = CANVAS_WIDTH - (columnWidth * 2) - (p * 4);
        const centerX = columnWidth + (p * 2);

        const headerHeight = UITheme.layout.headerHeight;
        const startY = p + headerHeight + p; 

        const narrativeHeight = CANVAS_HEIGHT * 0.35; 
        const decisionY = startY + narrativeHeight + p;
        const decisionHeight = CANVAS_HEIGHT - decisionY - p;

        ctx.save();

        // --- SECTION 1: HEADER ---
        const headerW = CANVAS_WIDTH * 0.4;
        const headerX = (CANVAS_WIDTH / 2) - (headerW / 2);
        
        ui.drawPanel(headerX, p, headerW, headerHeight);
        ui.drawText(
            "Event Encounter", 
            CANVAS_WIDTH / 2, 
            p + (headerHeight/2), 
            UITheme.fonts.header, 
            UITheme.colors.textMain, 
            "center",
            "middle"
        );

        // --- SECTION 2: LEFT COLUMN (PARTY MEMBERS) ---
        ui.drawPanel(p, startY, columnWidth, CANVAS_HEIGHT - startY - p);
        
        let currentY = startY + 15;
        party.slice(0, 3).forEach(member => {
            this.drawPartyMember(ctx, ui, member, p, currentY, columnWidth);
            currentY += 190; 
        });

        // --- SECTION 3: RIGHT COLUMN (ENCOUNTER ART) ---
        const rightColX = CANVAS_WIDTH - columnWidth - p;
        const rightColH = CANVAS_HEIGHT - startY - p;
        ui.drawPanel(rightColX, startY, columnWidth, rightColH);
        
        if (imageId && this.loader) {
            // FIXED: Changed from .getImage() to .get()
            const img = this.loader.get(imageId);
            if (img) {
                const imgP = 10;
                ui.drawSprite(
                    img, 
                    0, 0, img.width, img.height, 
                    rightColX + imgP, startY + imgP, 
                    columnWidth - (imgP * 2), rightColH - (imgP * 2)
                );
            } else {
                ui.drawText("Image Missing", rightColX + (columnWidth/2), startY + (rightColH/2), UITheme.fonts.italic, UITheme.colors.textMuted, "center", "middle");
            }
        }

        // --- SECTION 4: CENTER (NARRATIVE) ---
        ui.drawPanel(centerX, startY, centerWidth, narrativeHeight);
        
        ui.drawWrappedText(
            text, 
            centerX + 30, 
            startY + 30, 
            centerWidth - 60,
            26, 
            UITheme.fonts.body,
            UITheme.colors.textMain
        );

        // --- SECTION 5: CENTER (DECISIONS) ---
        ui.drawPanel(centerX, decisionY, centerWidth, decisionHeight);

        const btnHeight = 45;
        const btnStartY = decisionY + 30;

        decisions.forEach((opt, index) => {
            const btnY = btnStartY + (index * 60); 
            const btnX = centerX + 40;
            const btnW = centerWidth - 80;

            if (index === selectedIndex) {
                // SELECTED STATE
                ctx.fillStyle = "rgba(184, 153, 71, 0.08)"; 
                ctx.fillRect(btnX, btnY, btnW, btnHeight);
                ui.drawSelectionBrackets(btnX, btnY, btnW, btnHeight, 6, UITheme.colors.borderHighlight);

                ui.drawText(
                    `> ${opt.text}`, 
                    btnX + 15, 
                    btnY + (btnHeight/2), 
                    UITheme.fonts.bold, 
                    UITheme.colors.textHighlight, 
                    "left",
                    "middle"
                );
            } else {
                // UNSELECTED STATE
                ui.drawText(
                    opt.text, 
                    btnX + 15, 
                    btnY + (btnHeight/2), 
                    UITheme.fonts.body, 
                    UITheme.colors.textMuted,
                    "left",
                    "middle"
                );
            }
        });

        ctx.restore();
    }

    // --- HELPER METHODS ---

    drawPartyMember(ctx, ui, member, x, y, colWidth) {
        const pSize = 128;
        const pX = x + (colWidth / 2) - (pSize / 2);
        const pY = y;

        // 1. Draw 128x128 Portrait
        // FIXED: Exclusively using .get() now
        const masterSheet = this.loader.get(member.spritePortrait);
        
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(pX, pY, pSize, pSize);
        if (masterSheet) {
            ctx.drawImage(masterSheet, 0, 0, 128, 128, pX, pY, pSize, pSize);
        }
        
        if (member.hp <= 0) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
            ctx.fillRect(pX, pY, pSize, pSize);
        }
        
        ctx.strokeStyle = UITheme.colors.border;
        ctx.strokeRect(pX, pY, pSize, pSize);

        // 2. NEW: Draw Status Effects Over Portrait
        this.drawStatusEffects(ctx, ui, member, pX, pY, pSize);

        // 3. Draw Name
        const nameColor = member.hp <= 0 ? "red" : UITheme.colors.textMain;
        ui.drawText(member.name, x + (colWidth / 2), pY + pSize + 15, "bold 13px sans-serif", nameColor, "center");

        // 4. Draw Vitals
        let statY = pY + pSize + 28;
        const labelW = 25;
        const numW = 35;
        const barW = colWidth - labelW - numW - 20; 
        const startX = x + 10;

        this.drawStatRow(ui, "HP", member.hp, member.maxHp, startX, statY, barW, 4, numW, labelW, UITheme.colors.hp, UITheme.colors.hpDim);
        statY += 14;
        this.drawStatRow(ui, "STM", member.stamina, member.maxStamina, startX, statY, barW, 4, numW, labelW, UITheme.colors.stm, UITheme.colors.stmDim);
        statY += 14;
        this.drawStatRow(ui, "INS", member.insight, member.maxInsight, startX, statY, barW, 4, numW, labelW, UITheme.colors.ins, UITheme.colors.insDim);
    }

    drawStatRow(ui, label, current, max, x, y, barW, h, numW, labelW, color, dimColor) {
        ui.drawText(label, x, y + 5, "9px monospace", UITheme.colors.textMuted);
        ui.drawBar(x + labelW, y, barW, h, current, max, color, dimColor);
        ui.drawText(`${Math.floor(current)}/${max}`, x + labelW + barW + numW, y + 5, "9px monospace", UITheme.colors.textMuted, "right");
    }

    drawStatusEffects(ctx, ui, member, pX, pY, pSize) {
        if (!member.statusEffects || member.statusEffects.length === 0) return;

        const sheetKey = 'statusEffects'; 
        const srcSize = 32;  
        const drawSize = 16; 
        const spacing = 2; 

        // FIXED: Exclusively using .get() now
        const sheet = this.loader.get(sheetKey);
        
        let drawX = pX + 2; 
        let drawY = pY + pSize - drawSize - 2;

        member.statusEffects.forEach(effect => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(drawX, drawY, drawSize, drawSize);

            if (sheet && effect.icon) {
                ctx.drawImage(
                    sheet, 
                    effect.icon.col * srcSize, effect.icon.row * srcSize, srcSize, srcSize, 
                    drawX, drawY, drawSize, drawSize 
                );
            } else {
                ui.drawText(effect.name.charAt(0), drawX + (drawSize/2), drawY + (drawSize/2) + 3, "bold 10px sans-serif", "white", "center");
            }

            ctx.strokeStyle = UITheme.colors.border;
            ctx.strokeRect(drawX, drawY, drawSize, drawSize);

            if (effect.stacks && effect.stacks > 1) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.beginPath();
                ctx.arc(drawX + drawSize, drawY + drawSize, 6, 0, Math.PI * 2);
                ctx.fill();
                
                ui.drawText(effect.stacks.toString(), drawX + drawSize, drawY + drawSize + 3, "bold 9px sans-serif", "white", "center");
            }

            drawX += (drawSize + spacing);
            
            if (drawX + drawSize > pX + pSize) return;
        });
    }
}