import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class EncounterRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
    }

    // Helper for rendering wrapped/centered text in the columns
    drawCenteredWrappedText(ctx, ui, text, x, y, maxWidth, lineHeight, font, color) {
        if (!text) return;
        ctx.font = font;
        const words = text.split(' ');
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);

        let startY = y - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach(line => {
            ui.drawText(line, x, startY, font, color, "center", "middle");
            startY += lineHeight;
        });
    }

    render(ctx, state) {
        if (!state || !state.text) return;

        const { imageId, text, title, encounter, decisions, rewards, ui: uiState, party = [], currency = 0, skipMessageAnimation, textTimer, actionPhase, rollData } = state;
        const selectedIndex = uiState.selectedDecisionIndex || 0;
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;

        const ui = new CanvasUI(ctx);
        
        const leftW = Math.floor(CANVAS_WIDTH * 0.24);
        const centerW = Math.floor(CANVAS_WIDTH * 0.52);
        const rightW = CANVAS_WIDTH - leftW - centerW;
        const h = CANVAS_HEIGHT;
        const centerX = leftW;

        const bg0 = UITheme.colors.bgScale[0];
        const bg1 = UITheme.colors.bgScale[1];
        const borderColor = UITheme.colors.border;

        ctx.save();

        if (ui.drawRect && ui.drawLine) {
            ui.drawRect(0, 0, leftW, h, bg0);
            ui.drawRect(leftW, 0, centerW, h, bg1);
            ui.drawRect(leftW + centerW, 0, rightW, h, bg0);
            ui.drawLine(leftW, 0, leftW, h, borderColor);
            ui.drawLine(leftW + centerW, 0, leftW + centerW, h, borderColor);
        } else {
            ctx.fillStyle = bg0; ctx.fillRect(0, 0, leftW, h);
            ctx.fillStyle = bg1; ctx.fillRect(leftW, 0, centerW, h);
            ctx.fillStyle = bg0; ctx.fillRect(leftW + centerW, 0, rightW, h);
            
            ctx.strokeStyle = borderColor; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(leftW, 0); ctx.lineTo(leftW, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(leftW + centerW, 0); ctx.lineTo(leftW + centerW, h); ctx.stroke();
        }

        // Both Left Portrait and Right Encounter Image align at exactly imageY
        const imageY = 70; 

        // --- LEFT COLUMN: PARTY MEMBERS ---
        let currentY = imageY; 
        party.slice(0, 3).forEach(member => {
            const nameY = currentY - 20; 
            this.drawPartyMember(ctx, ui, member, 0, currentY, leftW, nameY, UITheme.fonts.body);
            currentY += 280; 
        });

        // --- PARTY CURRENCY ---
        ui.drawText(
            `Currency: ${currency}`, 
            leftW / 2, 
            currentY, 
            UITheme.fonts.mono, 
            UITheme.colors.textHighlight,
            "center", 
            "middle"
        );

        const rightColX = leftW + centerW;
        const encounterTitle = title || (encounter && encounter.title) || "Unknown Encounter";
        
        // --- CENTER COLUMN: ENCOUNTER TITLE & NARRATIVE ---
        this.drawCenteredWrappedText(
            ctx, ui, 
            encounterTitle, 
            centerX + (centerW / 2), 
            40,
            centerW - 40, 
            28, 
            UITheme.fonts.header, 
            UITheme.colors.textMain
        );

        // --- RIGHT COLUMN: ENCOUNTER IMAGE ---
        if (imageId && this.loader) {
            const img = this.loader.get(imageId);
            if (img) {
                const imgSize = 128;
                const imgX = rightColX + (rightW / 2) - (imgSize / 2);

                ui.drawSprite(
                    img, 
                    0, 0, img.width, img.height, 
                    imgX, imageY, 
                    imgSize, imgSize
                );
            } else {
                ui.drawText("Image Missing", rightColX + (rightW/2), imageY + 64, UITheme.fonts.italic, UITheme.colors.textMuted, "center", "middle");
            }
        }

        const narrativeHeight = h * 0.40; 
        const decisionY = narrativeHeight;
        
        const charsPerSecond = 45; 
        const secondsPerChar = 1 / charsPerSecond;
        const totalTypingTime = text.length * secondsPerChar;

        let charsToShow = text.length; 
        let showDecisions = true; 
        let isTyping = false; 

        if (!skipMessageAnimation) {
            charsToShow = Math.floor(textTimer / secondsPerChar) + 1;
            showDecisions = textTimer >= (totalTypingTime + 2.0);
            isTyping = textTimer < totalTypingTime;
        }

        const visibleText = text.substring(0, charsToShow);
        
        ui.drawWrappedText(
            visibleText, 
            centerX + 30, 
            90, 
            centerW - 60,
            26, 
            UITheme.fonts.body,
            UITheme.colors.textMain
        );

        const promptX = centerX + centerW - 25;
        const promptY = narrativeHeight - 20;

        if (isTyping) {
            const alpha = (Math.sin(Date.now() / 150) + 1) / 2; 
            ctx.globalAlpha = 0.4 + (alpha * 0.6);
            ctx.fillStyle = UITheme.colors.textHighlight;
            ctx.font = UITheme.fonts.italic;
            ctx.textAlign = "right";
            ctx.fillText("[Enter] to Skip", promptX, promptY);
            ctx.globalAlpha = 1.0;
        }

        if (showDecisions) {
            if (rewards) {
                this.drawRewards(ctx, ui, rewards, centerX + 40, decisionY + 30);
                
                const alpha = (Math.sin(Date.now() / 150) + 1) / 2; 
                ctx.globalAlpha = 0.4 + (alpha * 0.6);
                ctx.fillStyle = UITheme.colors.textHighlight;
                ctx.font = UITheme.fonts.italic;
                ctx.textAlign = "right";
                ctx.fillText("[Enter] to Continue", promptX, CANVAS_HEIGHT - 30);
                ctx.globalAlpha = 1.0;

            } else if (decisions && decisions.length > 0) {
                let btnY = decisionY + 30;
                const btnX = centerX + 50; 
                const btnW = centerW - 100; 
                const lineHeight = 24;

                decisions.forEach((opt, index) => {
                    const isSelected = (index === selectedIndex);
                    const textColor = isSelected ? UITheme.colors.selectedWhite : UITheme.colors.textMuted;

                    // Get precise height based on actual word-wrapping
                    const lines = ui.getWrappedLines(opt.text, btnW, UITheme.fonts.body);
                    const decisionHeight = lines.length * lineHeight;
                    
                    // Draw selection brackets with breathing animation
                    if (isSelected) {
                        const dist = 6 + Math.sin(Date.now() / 200) * 2;
                        ui.drawSelectionBrackets(
                            btnX - 15, 
                            btnY - 5, 
                            btnW + 30, 
                            decisionHeight, 
                            dist, 
                            UITheme.colors.borderHighlight
                        );
                    }

                    ui.drawWrappedText(
                        opt.text, 
                        btnX, 
                        btnY, 
                        btnW, 
                        lineHeight, 
                        UITheme.fonts.body, 
                        textColor
                    );

                    // Add a cleaner, consistent vertical gap
                    btnY += decisionHeight + 16; 
                });
            }
        }

        // --- GOTHIC DICE ROLL POPUP ---
        const popupPhases = ['wait_for_roll', 'rolling', 'hold_base', 'apply_mod', 'result'];
        
        if (popupPhases.includes(actionPhase)) {
            const { displayVal, mod, dc, isSuccess } = rollData;
            
            const popupW = 360; 
            const popupH = 240;
            const popupX = (CANVAS_WIDTH / 2) - (popupW / 2);
            const popupY = (CANVAS_HEIGHT / 2) - (popupH / 2);

            ctx.fillStyle = UITheme.colors.panelBg;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            if (ui.drawRect) {
                ui.drawRect(popupX, popupY, popupW, popupH, UITheme.colors.background);
                ui.drawRect(popupX + 4, popupY + 4, popupW - 8, popupH - 8, UITheme.colors.hp, false);
                ui.drawRect(popupX, popupY, popupW, popupH, UITheme.colors.hpDim, false); 
            } else {
                ctx.fillStyle = UITheme.colors.background; ctx.fillRect(popupX, popupY, popupW, popupH);
                ctx.strokeStyle = UITheme.colors.hp; ctx.strokeRect(popupX + 4, popupY + 4, popupW - 8, popupH - 8);
                ctx.strokeStyle = UITheme.colors.hpDim; ctx.strokeRect(popupX, popupY, popupW, popupH);
            }

            ui.drawText("Skill Check", CANVAS_WIDTH / 2, popupY + 35, UITheme.fonts.header, UITheme.colors.textHighlight, "center");

            const isNeutralPhase = ['wait_for_roll', 'rolling', 'hold_base', 'apply_mod'].includes(actionPhase);
            const diceColor = isNeutralPhase ? UITheme.colors.textHighlight : (isSuccess ? UITheme.colors.success : UITheme.colors.failure);
            
            const diceAreaY = popupY + 115;
            const diceCenterX = CANVAS_WIDTH / 2;
            const leftModX = diceCenterX - 90;
            const rightThreshX = diceCenterX + 90;

            let modPulseScale = 1.0;
            let rollerPulseScale = 1.0; 
            let resultPulseScale = 1.0;
            let modGlowIntensity = 0;   
            let rollerGlowIntensity = 0;

            let renderedRollerVal = displayVal; 

            if (actionPhase === 'apply_mod') {
                const phaseDuration = 2.0;
                let progress = 1.0 - (state.rollTimer / phaseDuration);
                progress = Math.min(Math.max(progress, 0), 1);
                
                let modProgress = Math.min(progress / 0.45, 1.0);
                modPulseScale = 1.0 + Math.sin(modProgress * Math.PI) * 0.3; 
                modGlowIntensity = Math.sin(modProgress * Math.PI); 

                renderedRollerVal = (modProgress < 1.0) ? rollData.d20 : rollData.total;

                if (progress > 0.45) {
                    let rollerProgress = Math.min((progress - 0.45) / 0.45, 1.0);
                    rollerPulseScale = 1.0 + Math.sin(rollerProgress * Math.PI) * 0.3;
                    rollerGlowIntensity = Math.sin(rollerProgress * Math.PI);
                }

            } else if (actionPhase === 'result') {
                const phaseDuration = 2.0;
                let progress = 1.0 - (state.rollTimer / phaseDuration);
                progress = Math.min(Math.max(progress, 0), 1);
                resultPulseScale = 1.0 + Math.sin(progress * Math.PI * 3) * 0.25 * (1 - progress); 
                renderedRollerVal = rollData.total; 
            }

            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
            const isPosMod = mod >= 0;
            const activeModColor = isPosMod ? (UITheme.colors.success || '#00ff00') : (UITheme.colors.failure || '#ff0000');

            ctx.save();
            ctx.translate(leftModX, diceAreaY);
            if (actionPhase === 'apply_mod') {
                ctx.scale(modPulseScale, modPulseScale);
            }
            ui.drawText("Modifier", 0, -20, UITheme.fonts.small || "14px sans-serif", UITheme.colors.textMuted, "center", "middle");
            
            if (actionPhase === 'apply_mod' && modGlowIntensity > 0) {
                ctx.shadowColor = activeModColor;
                ctx.shadowBlur = 15 * modGlowIntensity; 
            }
            const finalModColor = actionPhase === 'apply_mod' ? activeModColor : UITheme.colors.textMain;

            ui.drawText(modStr, 0, 10, UITheme.fonts.title, finalModColor, "center", "middle");
            ctx.restore();

            ctx.save();
            ctx.translate(diceCenterX, diceAreaY);
            
            if (actionPhase === 'apply_mod') {
                ctx.scale(rollerPulseScale, rollerPulseScale); 
            } else if (actionPhase === 'result') {
                ctx.scale(resultPulseScale, resultPulseScale);
            }
            
            const diamondSize = 35;
            ctx.strokeStyle = diceColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -diamondSize);
            ctx.lineTo(diamondSize, 0);
            ctx.lineTo(0, diamondSize);
            ctx.lineTo(-diamondSize, 0);
            ctx.closePath();
            
            ctx.fillStyle = UITheme.colors.background; 
            ctx.fill(); 
            ctx.stroke();

            if (actionPhase === 'result') {
                ctx.shadowColor = isSuccess ? (UITheme.colors.success || '#00ff00') : (UITheme.colors.failure || '#ff0000');
                ctx.shadowBlur = 15;
            } else if (actionPhase === 'apply_mod' && rollerGlowIntensity > 0) {
                ctx.shadowColor = isSuccess ? (UITheme.colors.success || '#00ff00') : (UITheme.colors.failure || '#ff0000');
                ctx.shadowBlur = 15 * rollerGlowIntensity;
            }

            ctx.font = "bold 36px monospace";
            ctx.fillStyle = diceColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(renderedRollerVal.toString(), 0, 0); 
            ctx.restore();

            ctx.save();
            ctx.translate(rightThreshX, diceAreaY);
            ui.drawText("Threshold", 0, -20, UITheme.fonts.small || "14px sans-serif", UITheme.colors.textMuted, "center", "middle");
            ui.drawText(dc.toString(), 0, 10, UITheme.fonts.title, UITheme.colors.textMain, "center", "middle");
            ctx.restore();

            if (actionPhase === 'wait_for_roll') {
                const btnW = 160;
                const btnH = 40;
                const btnX = (CANVAS_WIDTH / 2) - (btnW / 2);
                const btnY = popupY + 180;

                ctx.fillStyle = UITheme.colors.bgScale[3];
                ctx.fillRect(btnX, btnY, btnW, btnH);
                ctx.strokeStyle = UITheme.colors.hp;
                ctx.strokeRect(btnX, btnY, btnW, btnH);

                const alpha = (Math.sin(Date.now() / 200) + 1) / 2; 
                ctx.globalAlpha = 0.6 + (alpha * 0.4);
                ctx.fillStyle = UITheme.colors.textHighlight; 
                ctx.font = UITheme.fonts.bold;
                ctx.textAlign = "center";
                ctx.fillText("ROLL", CANVAS_WIDTH / 2, btnY + 25);
                ctx.globalAlpha = 1.0;
            } 
            else if (actionPhase === 'result') {
                const resultText = isSuccess ? "SUCCESS!" : "FAILED";
                ui.drawText(resultText, CANVAS_WIDTH / 2, popupY + 200, UITheme.fonts.header, diceColor, "center");
            } 
            else if (['rolling', 'hold_base', 'apply_mod'].includes(actionPhase)) {
                const alpha = (Math.sin(Date.now() / 150) + 1) / 2; 
                ctx.globalAlpha = 0.4 + (alpha * 0.6);
                ctx.fillStyle = UITheme.colors.textHighlight;
                ctx.font = UITheme.fonts.italic;
                ctx.textAlign = "center";
                ctx.fillText("[Enter] to Skip", CANVAS_WIDTH / 2, popupY + 200);
                ctx.globalAlpha = 1.0;
            }
        }
    }

    drawRewards(ctx, ui, rewards, x, y) {
        let currentY = y;
        const lineHeight = 28;

        ui.drawText("Rewards Found", x, currentY, UITheme.fonts.header, UITheme.colors.textHighlight);
        currentY += lineHeight + 5;

        if (rewards.xp) {
            ui.drawText(`+ ${rewards.xp} XP`, x + 15, currentY, UITheme.fonts.body, UITheme.colors.success || UITheme.colors.textMain);
            currentY += lineHeight;
        }

        if (rewards.currency) {
            ui.drawText(`+ ${rewards.currency} Currency`, x + 15, currentY, UITheme.fonts.body, UITheme.colors.textHighlight);
            currentY += lineHeight;
        }

        if (rewards.items && rewards.items.length > 0) {
            currentY += 10; 
            ui.drawText("Items Acquired:", x + 15, currentY, UITheme.fonts.body, UITheme.colors.textMain);
            currentY += lineHeight;

            rewards.items.forEach(item => {
                const qtyStr = item.quantity && item.quantity > 1 ? ` (x${item.quantity})` : "";
                ui.drawText(`- ${item.name}${qtyStr}`, x + 35, currentY, UITheme.fonts.body, UITheme.colors.textMuted);
                currentY += lineHeight;
            });
        }
    }

    drawPartyMember(ctx, ui, member, x, y, colWidth, nameY, font) {
        const pSize = 128;
        const pX = x + (colWidth / 2) - (pSize / 2);
        const pY = y;

        const nameColor = member.hp <= 0 ? UITheme.colors.hp : UITheme.colors.textMain;

        this.drawCenteredWrappedText(
            ctx, ui, 
            member.name, 
            x + (colWidth / 2), 
            nameY, 
            colWidth - 20, 
            24, 
            font, 
            nameColor
        );

        const masterSheet = this.loader.get(member.spritePortrait);
        ctx.fillStyle = UITheme.colors.scrollTrack;
        ctx.fillRect(pX, pY, pSize, pSize);
        if (masterSheet) {
            ctx.drawImage(masterSheet, 0, 0, 128, 128, pX, pY, pSize, pSize);
        }
        
        if (member.hp <= 0) {
            ctx.fillStyle = UITheme.colors.hpDim;
            ctx.fillRect(pX, pY, pSize, pSize);
        }
        
        ctx.strokeStyle = UITheme.colors.border;
        ctx.strokeRect(pX, pY, pSize, pSize);

        this.drawStatusEffects(ctx, ui, member, pX, pY, pSize);

        let statY = pY + pSize + 25;
        const labelW = 32;
        const numW = 45;
        const barW = colWidth - labelW - numW - 40; 
        const startX = x + 20;

        this.drawStatRow(ui, "HP", member.hp, member.maxHp, startX, statY, barW, 6, numW, labelW, UITheme.colors.hp, UITheme.colors.hpDim);
        statY += 20;
        this.drawStatRow(ui, "STM", member.stamina, member.maxStamina, startX, statY, barW, 6, numW, labelW, UITheme.colors.stm, UITheme.colors.stmDim);
        statY += 20;
        this.drawStatRow(ui, "INS", member.insight, member.maxInsight, startX, statY, barW, 6, numW, labelW, UITheme.colors.ins, UITheme.colors.insDim);
        
        statY += 24; 

        const attrs = member.attributes || {};
        const vig = attrs.vigor || 0;
        const str = attrs.strength || 0;
        const dex = attrs.dexterity || 0;
        const int = attrs.intelligence || 0;
        const atn = attrs.attunement || 0;

        const col1X = startX;
        const col2X = startX + (colWidth / 2) - 10;
        const attrFont = UITheme.fonts.mono;
        
        ui.drawText(`VIG: ${vig}`, col1X, statY, attrFont, UITheme.colors.textMuted);
        ui.drawText(`STR: ${str}`, col2X, statY, attrFont, UITheme.colors.textMuted);
        
        statY += 20;
        
        ui.drawText(`DEX: ${dex}`, col1X, statY, attrFont, UITheme.colors.textMuted);
        ui.drawText(`INT: ${int}`, col2X, statY, attrFont, UITheme.colors.textMuted);

        statY += 20;
        
        ui.drawText(`ATN: ${atn}`, col1X, statY, attrFont, UITheme.colors.textMuted);
    }

    drawStatRow(ui, label, current, max, x, y, barW, h, numW, labelW, color, dimColor) {
        ui.drawText(label, x, y + 6, UITheme.fonts.mono, UITheme.colors.textMuted);
        ui.drawBar(x + labelW, y, barW, h, current, max, color, dimColor);
        ui.drawText(`${Math.floor(current)}/${max}`, x + labelW + barW + numW, y + 6, UITheme.fonts.mono, UITheme.colors.textMuted, "right");
    }

    drawStatusEffects(ctx, ui, member, pX, pY, pSize) {
        if (!member.statusEffects || member.statusEffects.length === 0) return;

        const sheetKey = 'statusEffects'; 
        const srcSize = 32;  
        const drawSize = 16; 
        const spacing = 2; 

        const sheet = this.loader.get(sheetKey);
        
        let drawX = pX + 2; 
        let drawY = pY + pSize - drawSize - 2;

        member.statusEffects.forEach(effect => {
            ctx.fillStyle = UITheme.colors.scrollTrack;
            ctx.fillRect(drawX, drawY, drawSize, drawSize);

            if (sheet && effect.icon) {
                ctx.drawImage(
                    sheet, 
                    effect.icon.col * srcSize, effect.icon.row * srcSize, srcSize, srcSize, 
                    drawX, drawY, drawSize, drawSize 
                );
            } else {
                ui.drawText(effect.name.charAt(0), drawX + (drawSize/2), drawY + (drawSize/2) + 3, UITheme.fonts.small, UITheme.colors.textMain, "center");
            }

            ctx.strokeStyle = UITheme.colors.border;
            ctx.strokeRect(drawX, drawY, drawSize, drawSize);

            if (effect.stacks && effect.stacks > 1) {
                ctx.fillStyle = UITheme.colors.background;
                ctx.beginPath();
                ctx.arc(drawX + drawSize, drawY + drawSize, 6, 0, Math.PI * 2);
                ctx.fill();
                
                ui.drawText(effect.stacks.toString(), drawX + drawSize, drawY + drawSize + 3, UITheme.fonts.small, UITheme.colors.textMain, "center");
            }

            drawX += (drawSize + spacing);
            
            if (drawX + drawSize > pX + pSize) return;
        });
    }
}