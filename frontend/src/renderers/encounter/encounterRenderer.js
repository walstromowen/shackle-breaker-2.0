import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class EncounterRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
    }

    // Helper for rendering wrapped/centered text in the columns with optional shadow
    drawCenteredWrappedText(ctx, ui, text, x, y, maxWidth, lineHeight, font, color, useShadow = false) {
        if (!text) return;
        
        if (useShadow) {
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;
        }

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

        if (useShadow) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
        }
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

        ctx.save();

        // --- STYLIZED BACKGROUND GRADIENTS ---
        const createColumnGradient = (x, width, colorTop, colorBottom) => {
            const grad = ctx.createLinearGradient(x, 0, x, h);
            grad.addColorStop(0, colorTop);
            grad.addColorStop(1, colorBottom);
            return grad;
        };

        const bgLeftRight = createColumnGradient(0, leftW, UITheme.colors.bgScale[0], '#050505');
        const bgCenter = createColumnGradient(leftW, centerW, UITheme.colors.bgScale[1], '#0a0a0a');

        ctx.fillStyle = bgLeftRight; 
        ctx.fillRect(0, 0, leftW, h);
        
        ctx.fillStyle = bgCenter; 
        ctx.fillRect(leftW, 0, centerW, h);
        
        ctx.fillStyle = bgLeftRight; 
        ctx.fillRect(leftW + centerW, 0, rightW, h);
        
        // --- ORNATE COLUMN DIVIDERS ---
        ui.drawLine(leftW, 0, leftW, h, UITheme.colors.border, 2);
        ui.drawLine(leftW + centerW, 0, leftW + centerW, h, UITheme.colors.border, 2);

        // Standard alignment for images/portraits
        const imageY = 70; 

        // --- LEFT COLUMN: PARTY MEMBERS ---
        let currentY = imageY; 
        party.slice(0, 3).forEach((member, index) => {
            const nameY = currentY - 20; 
            this.drawPartyMember(ctx, ui, member, 0, currentY, leftW, nameY, UITheme.fonts.body);
            currentY += 320; // Increased spacing to accommodate taller arches and expanded stats
            
            // Add a gothic flourish between party members (tarnished gold)
            if (index < party.length - 1 && index < 2) {
                ui.drawLineWithGothicFlourish(leftW * 0.2, currentY - 35, leftW * 0.6, UITheme.colors.borderHighlight);
            }
        });

        // --- PARTY CURRENCY ---
        ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
        ui.drawText(
            `Currency: ${currency}`, 
            leftW / 2, 
            currentY, 
            UITheme.fonts.mono, 
            UITheme.colors.textHighlight,
            "center", 
            "middle"
        );
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

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
            UITheme.colors.textMain,
            true 
        );

        // Flourish under the title (tarnished gold)
        ui.drawLineWithGothicFlourish(centerX + (centerW * 0.2), 70, centerW * 0.6, UITheme.colors.borderHighlight);

        // --- RIGHT COLUMN: ENCOUNTER IMAGE ---
        if (imageId && this.loader) {
            const img = this.loader.get(imageId);
            if (img) {
                const imgSize = 128;
                const imgX = rightColX + (rightW / 2) - (imgSize / 2);

                // Frame the encounter image in a gothic lancet arch (tarnished gold)
                ui.drawLancetArchedPanel(imgX - 16, imageY - 32, imgSize + 32, imgSize + 64, '#000', UITheme.colors.borderHighlight);

                // Add a dark backdrop for the image itself
                ctx.fillStyle = '#050505';
                ctx.fillRect(imgX, imageY, imgSize, imgSize);

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

        const narrativeHeight = h * 0.45; 
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
            centerX + 40, 
            100, 
            centerW - 80,
            26, 
            UITheme.fonts.body,
            UITheme.colors.textMain
        );

        const promptX = centerX + centerW - 35;
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
            // Flourish above decisions/rewards (tarnished gold)
            ui.drawLineWithGothicFlourish(centerX + (centerW * 0.1), decisionY, centerW * 0.8, UITheme.colors.borderHighlight);

            if (rewards) {
                this.drawRewards(ctx, ui, rewards, centerX + 50, decisionY + 40);
                
                const alpha = (Math.sin(Date.now() / 150) + 1) / 2; 
                ctx.globalAlpha = 0.4 + (alpha * 0.6);
                ctx.fillStyle = UITheme.colors.textHighlight;
                ctx.font = UITheme.fonts.italic;
                ctx.textAlign = "right";
                ctx.fillText("[Enter] to Continue", promptX, CANVAS_HEIGHT - 30);
                ctx.globalAlpha = 1.0;

            } else if (decisions && decisions.length > 0) {
                let btnY = decisionY + 40;
                const btnX = centerX + 60; 
                const btnW = centerW - 120; 
                const lineHeight = 24;

                decisions.forEach((opt, index) => {
                    const isSelected = (index === selectedIndex);
                    const textColor = isSelected ? UITheme.colors.selectedWhite : UITheme.colors.textMuted;

                    const lines = ui.getWrappedLines(opt.text, btnW, UITheme.fonts.body);
                    const decisionHeight = lines.length * lineHeight;
                    
                    if (isSelected) {
                        const dist = 6 + Math.sin(Date.now() / 200) * 2;
                        
                        ctx.shadowColor = UITheme.colors.borderHighlight;
                        ctx.shadowBlur = 10;
                        ui.drawSelectionBrackets(
                            btnX - 15, 
                            btnY - 5, 
                            btnW + 30, 
                            decisionHeight, 
                            dist, 
                            UITheme.colors.borderHighlight
                        );
                        ctx.shadowBlur = 0;
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

                    btnY += decisionHeight + 20; 
                });
            }
        }

        // --- GOTHIC DICE ROLL POPUP ---
        const popupPhases = ['wait_for_roll', 'rolling', 'hold_base', 'apply_mod', 'result'];
        
        if (popupPhases.includes(actionPhase)) {
            const { displayVal, mod, dc, isSuccess } = rollData;
            
            ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            const popupW = 400; 
            const popupH = 280;
            const popupX = (CANVAS_WIDTH / 2) - (popupW / 2);
            const popupY = (CANVAS_HEIGHT / 2) - (popupH / 2);

            const popupGrad = ctx.createLinearGradient(popupX, popupY, popupX, popupY + popupH);
            popupGrad.addColorStop(0, UITheme.colors.bgScale[2] || '#1a1a1a');
            popupGrad.addColorStop(1, '#050505');

            ctx.fillStyle = popupGrad;
            ctx.fillRect(popupX, popupY, popupW, popupH);
            ui.drawPanel(popupX, popupY, popupW, popupH, "transparent"); 

            ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
            ui.drawText("Skill Check", CANVAS_WIDTH / 2, popupY + 40, UITheme.fonts.header, UITheme.colors.textHighlight, "center");
            ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
            
            // Flourish in dice roll (tarnished gold)
            ui.drawLineWithGothicFlourish(popupX + 40, popupY + 60, popupW - 80, UITheme.colors.borderHighlight);

            const isNeutralPhase = ['wait_for_roll', 'rolling', 'hold_base', 'apply_mod'].includes(actionPhase);
            const diceColor = isNeutralPhase ? UITheme.colors.textHighlight : (isSuccess ? UITheme.colors.success : UITheme.colors.failure);
            
            const diceAreaY = popupY + 140;
            const diceCenterX = CANVAS_WIDTH / 2;
            const leftModX = diceCenterX - 110;
            const rightThreshX = diceCenterX + 110;

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
            ui.drawText("Modifier", 0, -30, UITheme.fonts.small || "14px sans-serif", UITheme.colors.textMuted, "center", "middle");
            
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
            
            const diamondSize = 45;
            
            ctx.fillStyle = '#0a0a0a';
            ctx.beginPath();
            ctx.moveTo(0, -diamondSize);
            ctx.lineTo(diamondSize, 0);
            ctx.lineTo(0, diamondSize);
            ctx.lineTo(-diamondSize, 0);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = diceColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.strokeStyle = "rgba(255,255,255,0.15)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -diamondSize + 6);
            ctx.lineTo(diamondSize - 6, 0);
            ctx.lineTo(0, diamondSize - 6);
            ctx.lineTo(-diamondSize + 6, 0);
            ctx.closePath();
            ctx.stroke();

            if (actionPhase === 'result') {
                ctx.shadowColor = isSuccess ? (UITheme.colors.success || '#00ff00') : (UITheme.colors.failure || '#ff0000');
                ctx.shadowBlur = 25;
            } else if (actionPhase === 'apply_mod' && rollerGlowIntensity > 0) {
                ctx.shadowColor = isSuccess ? (UITheme.colors.success || '#00ff00') : (UITheme.colors.failure || '#ff0000');
                ctx.shadowBlur = 25 * rollerGlowIntensity;
            }

            ctx.font = "bold 40px monospace";
            ctx.fillStyle = diceColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(renderedRollerVal.toString(), 0, 0); 
            ctx.restore();

            ctx.save();
            ctx.translate(rightThreshX, diceAreaY);
            ui.drawText("Threshold", 0, -30, UITheme.fonts.small || "14px sans-serif", UITheme.colors.textMuted, "center", "middle");
            ui.drawText(dc.toString(), 0, 10, UITheme.fonts.title, UITheme.colors.textMain, "center", "middle");
            ctx.restore();

            if (actionPhase === 'wait_for_roll') {
                const btnW = 160;
                const btnH = 40;
                const btnX = (CANVAS_WIDTH / 2) - (btnW / 2);
                const btnY = popupY + 220;

                ui.drawPanel(btnX, btnY, btnW, btnH, UITheme.colors.bgScale[3]);

                const alpha = (Math.sin(Date.now() / 200) + 1) / 2; 
                ctx.globalAlpha = 0.6 + (alpha * 0.4);
                
                ctx.shadowColor = UITheme.colors.textHighlight;
                ctx.shadowBlur = 8;
                ui.drawText("ROLL", CANVAS_WIDTH / 2, btnY + 26, UITheme.fonts.bold, UITheme.colors.textHighlight, "center");
                
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;
            } 
            else if (actionPhase === 'result') {
                const resultText = isSuccess ? "SUCCESS!" : "FAILED";
                ctx.shadowColor = diceColor;
                ctx.shadowBlur = 10;
                ui.drawText(resultText, CANVAS_WIDTH / 2, popupY + 245, UITheme.fonts.header, diceColor, "center");
                ctx.shadowBlur = 0;
            } 
            else if (['rolling', 'hold_base', 'apply_mod'].includes(actionPhase)) {
                const alpha = (Math.sin(Date.now() / 150) + 1) / 2; 
                ctx.globalAlpha = 0.4 + (alpha * 0.6);
                ui.drawText("[Enter] to Skip", CANVAS_WIDTH / 2, popupY + 245, UITheme.fonts.italic, UITheme.colors.textHighlight, "center");
                ctx.globalAlpha = 1.0;
            }
        }
        ctx.restore();
    }

    drawRewards(ctx, ui, rewards, x, y) {
        let currentY = y;
        const lineHeight = 28;

        ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
        ui.drawText("Rewards Found", x, currentY, UITheme.fonts.header, UITheme.colors.textHighlight);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
        
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
            UITheme.fonts.header, 
            nameColor,
            true 
        );

        const masterSheet = this.loader.get(member.spritePortrait);
        
        // Portrait inner shadow/darkness
        ctx.fillStyle = '#050505';
        ctx.fillRect(pX, pY, pSize, pSize);
        
        if (masterSheet) {
            ctx.drawImage(masterSheet, 0, 0, 128, 128, pX, pY, pSize, pSize);
        }
        
        if (member.hp <= 0) {
            ctx.fillStyle = "rgba(100, 0, 0, 0.6)"; 
            ctx.fillRect(pX, pY, pSize, pSize);
        }
        
        // Match the left portrait arch EXACTLY to the right encounter image arch dimensions & tarnished gold
        ui.drawLancetArchedPanel(pX - 16, pY - 32, pSize + 32, pSize + 64, "transparent", UITheme.colors.borderHighlight);

        this.drawStatusEffects(ctx, ui, member, pX, pY, pSize);

        // Lowered statY to clear the new, taller gothic arch gracefully
        let statY = pY + pSize + 40;
        const labelW = 36;
        const numW = 45;
        const barW = colWidth - labelW - numW - 40; 
        const startX = x + 20;

        ctx.shadowColor = '#000'; ctx.shadowBlur = 2;
        this.drawStatRow(ui, "HP", member.hp, member.maxHp, startX, statY, barW, 6, numW, labelW, UITheme.colors.hp, UITheme.colors.hpDim);
        statY += 24; // Better spacing
        this.drawStatRow(ui, "STM", member.stamina, member.maxStamina, startX, statY, barW, 6, numW, labelW, UITheme.colors.stm, UITheme.colors.stmDim);
        statY += 24; // Better spacing
        this.drawStatRow(ui, "INS", member.insight, member.maxInsight, startX, statY, barW, 6, numW, labelW, UITheme.colors.ins, UITheme.colors.insDim);
        ctx.shadowBlur = 0;
        
        statY += 30; // Larger gap separating vitals from attributes

        const attrs = member.attributes || {};
        const vig = attrs.vigor || 0;
        const str = attrs.strength || 0;
        const dex = attrs.dexterity || 0;
        const int = attrs.intelligence || 0;
        const atn = attrs.attunement || 0;

        const col1X = startX + 10;
        const col2X = startX + (colWidth / 2) + 10;
        const attrFont = UITheme.fonts.mono;
        
        ui.drawText(`VIG: ${vig}`, col1X, statY, attrFont, UITheme.colors.textMuted);
        ui.drawText(`STR: ${str}`, col2X, statY, attrFont, UITheme.colors.textMuted);
        
        statY += 24; // Better spacing
        
        ui.drawText(`DEX: ${dex}`, col1X, statY, attrFont, UITheme.colors.textMuted);
        ui.drawText(`INT: ${int}`, col2X, statY, attrFont, UITheme.colors.textMuted);

        statY += 24; // Better spacing
        
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
        const drawSize = 18; 
        const spacing = 4; 

        const sheet = this.loader.get(sheetKey);
        
        let drawX = pX + 4; 
        let drawY = pY + pSize - drawSize - 4; 

        member.statusEffects.forEach(effect => {
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            
            ctx.fillStyle = '#111';
            ctx.fillRect(drawX, drawY, drawSize, drawSize);

            ctx.shadowBlur = 0; 

            if (sheet && effect.icon) {
                ctx.drawImage(
                    sheet, 
                    effect.icon.col * srcSize, effect.icon.row * srcSize, srcSize, srcSize, 
                    drawX, drawY, drawSize, drawSize 
                );
            } else {
                ui.drawText(effect.name.charAt(0), drawX + (drawSize/2), drawY + (drawSize/2) + 3, UITheme.fonts.small, UITheme.colors.textMain, "center");
            }

            ctx.strokeStyle = UITheme.colors.borderHighlight || '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(drawX + 0.5, drawY + 0.5, drawSize - 1, drawSize - 1);

            if (effect.stacks && effect.stacks > 1) {
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(drawX + drawSize, drawY + drawSize, 6, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = UITheme.colors.border;
                ctx.stroke();
                
                ui.drawText(effect.stacks.toString(), drawX + drawSize, drawY + drawSize + 3, UITheme.fonts.small, UITheme.colors.textMain, "center");
            }

            drawX += (drawSize + spacing);
            
            if (drawX + drawSize > pX + pSize) return;
        });
    }
}