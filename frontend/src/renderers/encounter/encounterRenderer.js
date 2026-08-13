// ui/overworld/encounter/encounterRenderer.js
import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { gameState } from "../../../../shared/state/gameState.js";
import { DIFFICULTY_MODIFIERS } from '../../../../shared/data/constants.js';

export class EncounterRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
        this.hotspots = [];
    }

    // Helper to inject alpha into hex/rgb strings so UI components that reset globalAlpha will still fade
    getAlphaColor(color, alpha) {
        if (!color || typeof color !== 'string') return color;
        const c = color.trim().toLowerCase();

        // Handle Hex colors (including 8-digit #RRGGBBAA and 4-digit #RGBA formats)
        if (c.startsWith('#')) {
            let r = 0, g = 0, b = 0;
            if (c.length === 4 || c.length === 5) {
                r = parseInt(c[1] + c[1], 16);
                g = parseInt(c[2] + c[2], 16);
                b = parseInt(c[3] + c[3], 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            } else if (c.length === 7 || c.length === 9) {
                r = parseInt(c.substring(1, 3), 16);
                g = parseInt(c.substring(3, 5), 16);
                b = parseInt(c.substring(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            return color;
        }

        // Robust RGB/RGBA parsing
        if (c.startsWith('rgb')) {
            const nums = c.match(/\d+(\.\d+)?/g);
            if (nums && nums.length >= 3) {
                return `rgba(${nums[0]}, ${nums[1]}, ${nums[2]}, ${alpha})`;
            }
        }

        // Handle common named colors often used in UI themes
        const namedColors = {
            'white': '255, 255, 255',
            'black': '0, 0, 0',
            'red': '255, 0, 0',
            'green': '0, 128, 0',
            'blue': '0, 0, 255',
            'yellow': '255, 255, 0',
            'gray': '128, 128, 128',
            'grey': '128, 128, 128',
            'transparent': '0, 0, 0' // Alpha controls visibility entirely
        };

        if (namedColors[c]) {
            return `rgba(${namedColors[c]}, ${alpha})`;
        }
        return color;
    }

    drawCenteredWrappedText(ctx, ui, text, x, y, maxWidth, lineHeight, font, color, useShadow = false) {
        if (!text) return;
        if (useShadow) {
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 5;
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
        this.hotspots = [];
        let scrollBounds = {};
        if (!state || !state.text) return;

        const {
            imageInfo, transition, text, title, stageName, encounter, decisions,
            rewards, ui: uiState, party = [], currency = 0, skipMessageAnimation,
            textTimer = 0, actionPhase, rollData, hoveredElement, scrollOffsets, onLayoutUpdate
        } = state;

        const selectedIndex = uiState.selectedDecisionIndex || 0;
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;
        const ui = new CanvasUI(ctx);

        const leftW = Math.floor(CANVAS_WIDTH * 0.24);
        const centerW = Math.floor(CANVAS_WIDTH * 0.52);
        const rightW = CANVAS_WIDTH - leftW - centerW;
        const h = CANVAS_HEIGHT;
        const centerX = leftW;

        // ========================================================
        // TIMING & INTRO SEQUENCE CALCULATIONS
        // ========================================================
        const timeElapsed = textTimer;
        let titleAlpha = 0, colsAlpha = 0, decisionsAlpha = 0;
        let isTyping = false;
        let showDecisions = false;

        const charsPerSecond = 25;
        const secondsPerChar = 1 / charsPerSecond;
        const totalTypingTime = text.length * secondsPerChar;
        const charFadeDuration = 0.3;

        const PHASE_BLACK_DUR = 0.0;
        const PHASE_TITLE_FADE = 2.5;
        const PHASE_TITLE_PAUSE = 0.5;
        const PHASE_COLS_FADE = 2.5;
        const PHASE_COLS_PAUSE = 0.5;
        const PHASE_DEC_FADE = 3.0;

        const T_TITLE_START = PHASE_BLACK_DUR;
        const T_COLS_START = T_TITLE_START + PHASE_TITLE_FADE + PHASE_TITLE_PAUSE;
        const T_TEXT_START = T_COLS_START + PHASE_COLS_FADE + PHASE_COLS_PAUSE;
        const T_TEXT_END = T_TEXT_START + totalTypingTime;
        const T_DEC_START = T_TEXT_END + 0.5;

        // Apply a smoothstep curve so fading out of pure black is gradual instead of sudden
        const ease = p => p * p * (3 - 2 * p);

        if (skipMessageAnimation) {
            titleAlpha = 1.0;
            colsAlpha = 1.0;
            decisionsAlpha = 1.0;
            isTyping = false;
            showDecisions = true;
        } else {
            const rawTitleAlpha = Math.max(0, Math.min(1, (timeElapsed - T_TITLE_START) / PHASE_TITLE_FADE));
            const rawColsAlpha = Math.max(0, Math.min(1, (timeElapsed - T_COLS_START) / PHASE_COLS_FADE));
            const rawDecisionsAlpha = Math.max(0, Math.min(1, (timeElapsed - T_DEC_START) / PHASE_DEC_FADE));

            titleAlpha = ease(rawTitleAlpha);
            colsAlpha = ease(rawColsAlpha);
            decisionsAlpha = ease(rawDecisionsAlpha);
            isTyping = (timeElapsed >= T_TEXT_START) && (timeElapsed < T_TEXT_END + charFadeDuration);
            showDecisions = (timeElapsed >= T_DEC_START);
        }

        ui.clearScreen(CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // ========================================================
        // BACKGROUND COLUMNS
        // ========================================================
        if (colsAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = colsAlpha;

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

            // Pass alpha-adjusted colors to ensure lines fade even if CanvasUI overrides globalAlpha internally
            ui.drawLine(leftW, 0, leftW, h, this.getAlphaColor(UITheme.colors.border, colsAlpha), 2);
            ui.drawLine(leftW + centerW, 0, leftW + centerW, h, this.getAlphaColor(UITheme.colors.border, colsAlpha), 2);

            ctx.restore();
        }

        // ========================================================
        // TITLE RENDERING
        // ========================================================
        if (titleAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = titleAlpha;
            const encounterTitle = title || (encounter && encounter.title) || "Unknown Encounter";
            this.drawCenteredWrappedText(
                ctx, ui, encounterTitle,
                centerX + (centerW / 2), 96,
                centerW - 96, 67,
                UITheme.fonts.header, UITheme.colors.textMain, true
            );
            ctx.restore();
        }

        // ========================================================
        // LEFT & RIGHT COLUMNS: PARTY & IMAGES
        // ========================================================
        if (colsAlpha > 0) {
            const imageY = 210;
            let currentY = imageY;
            const targetAreaSize = 256;

            // Party Members
            party.slice(0, 3).forEach((member, index) => {
                const nameY = currentY - 108;
                this.drawPartyMember(ctx, ui, member, 0, currentY, leftW, nameY, UITheme.fonts.body, targetAreaSize, index === 0 ? transition : null, colsAlpha);
                currentY += 768;

                if (index < party.length - 1 && index < 2) {
                    ctx.save();
                    ctx.globalAlpha = colsAlpha;
                    ui.drawLineWithGothicFlourish(leftW * 0.2, currentY - 84, leftW * 0.6, this.getAlphaColor(UITheme.colors.borderHighlight, colsAlpha));
                    ctx.restore();
                }
            });

            ctx.save();
            ctx.globalAlpha = colsAlpha;
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 10;
            ui.drawText(`Currency: ${currency}`, leftW / 2, currentY, UITheme.fonts.mono, UITheme.colors.textHighlight, "center", "middle");

            const rightColX = leftW + centerW;
            const displayStageName = stageName || "Unknown Stage";
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            this.drawCenteredWrappedText(ctx, ui, displayStageName, rightColX + (rightW / 2), 96, rightW - 96, 67, UITheme.fonts.header, UITheme.colors.textMuted, true);

            const panelX = rightColX + (rightW / 2) - (targetAreaSize / 2);

            // Safely patch UITheme colors so CanvasUI border drawing inherits the fade
            const fadeBorder = this.getAlphaColor(UITheme.colors.border, colsAlpha);
            const fadeHighlight = this.getAlphaColor(UITheme.colors.borderHighlight, colsAlpha);

            const oldBorder = UITheme.colors.border;
            const oldHighlight = UITheme.colors.borderHighlight;
            UITheme.colors.border = fadeBorder;
            UITheme.colors.borderHighlight = fadeHighlight;

            ui.drawPanel(panelX - 4, imageY - 4, targetAreaSize + 8, targetAreaSize + 8, this.getAlphaColor('#000000', colsAlpha), fadeBorder);

            // Restore theme
            UITheme.colors.border = oldBorder;
            UITheme.colors.borderHighlight = oldHighlight;

            ctx.fillStyle = this.getAlphaColor('#050505', colsAlpha);
            ctx.fillRect(panelX, imageY, targetAreaSize, targetAreaSize);
            ctx.restore();

            const drawImageDef = (info, alpha) => {
                if (!info || !info.sheet || !this.loader) return;
                const sheetImg = this.loader.get(info.sheet);
                if (!sheetImg) return;

                const nativeRes = 128;
                const imgScale = 2;
                const drawSize = nativeRes * imgScale;
                const imgX = rightColX + (rightW / 2) - (drawSize / 2);
                const imgY = imageY + (targetAreaSize / 2) - (drawSize / 2);

                ctx.save();
                ctx.globalAlpha = alpha * colsAlpha;
                ctx.imageSmoothingEnabled = false;
                ui.drawSprite(sheetImg, info.col * nativeRes, info.row * nativeRes, nativeRes, nativeRes, imgX, imgY, drawSize, drawSize);
                ctx.imageSmoothingEnabled = true;
                ctx.restore();
            };

            const isSameImage = (img1, img2) => {
                if (!img1 && !img2) return true;
                if (!img1 || !img2) return false;
                return img1.sheet === img2.sheet && img1.col === img2.col && img1.row === img2.row;
            };

            const transActive = transition && transition.active;
            const imageChanged = !isSameImage(imageInfo, transition?.previousImageInfo);

            if (transActive && transition.previousImageInfo && imageChanged) {
                const p = transition.progress;
                const smoothP = p * p * (3 - 2 * p);
                drawImageDef(transition.previousImageInfo, 1.0 - smoothP);
                drawImageDef(imageInfo, smoothP);
            } else if (imageInfo && imageInfo.sheet) {
                drawImageDef(imageInfo, 1.0);
            } else {
                ctx.save();
                ctx.globalAlpha = colsAlpha;
                ui.drawText("No Image defined", rightColX + (rightW / 2), imageY + (targetAreaSize / 2) + 20, UITheme.fonts.italic, UITheme.colors.textMuted, "center", "middle");
                ctx.restore();
            }
        }

        // ========================================================
        // TEXT MESSAGES (CENTER COLUMN)
        // ========================================================
        const textViewportY = 170;
        const textViewportH = Math.floor(CANVAS_HEIGHT * 0.35);
        const dividerY = textViewportY + textViewportH + 32;
        const decisionViewportY = dividerY + 48;
        const attributeBarHeight = 120;
        const attributeBarY = CANVAS_HEIGHT - attributeBarHeight;
        const decisionViewportH = attributeBarY - decisionViewportY - 24;

        const skipPromptX = CANVAS_WIDTH - 48;
        const skipPromptY = CANVAS_HEIGHT - 48;

        if (timeElapsed >= T_TEXT_START || skipMessageAnimation) {
            const textLineHeight = 62;
            const textLines = ui.getWrappedLines(text, centerW - 192, UITheme.fonts.body);
            const totalTextHeight = textLines.length * textLineHeight;
            const textMaxScroll = Math.max(0, totalTextHeight - textViewportH);
            const textScrollOffset = Math.max(0, Math.min(scrollOffsets?.text || 0, textMaxScroll));

            scrollBounds.text = {
                bounds: { x: centerX + 64, y: textViewportY, w: centerW - 128, h: textViewportH },
                maxScroll: textMaxScroll,
                viewportH: textViewportH
            };

            ui.startClip(centerX + 64, textViewportY, centerW - 128, textViewportH);
            ctx.font = UITheme.fonts.body;
            let globalCharIndex = 0;
            let renderY = textViewportY - textScrollOffset;

            textLines.forEach((line) => {
                if (renderY + textLineHeight > textViewportY && renderY < textViewportY + textViewportH) {
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        const charStartTime = T_TEXT_START + globalCharIndex * secondsPerChar;
                        if (timeElapsed >= charStartTime || skipMessageAnimation) {
                            let alpha = skipMessageAnimation ? 1.0 : (timeElapsed - charStartTime) / charFadeDuration;
                            alpha = Math.max(0, Math.min(1, alpha));
                            if (alpha > 0) {
                                ctx.save();
                                ctx.globalAlpha = alpha;
                                const prefixWidth = ctx.measureText(line.substring(0, i)).width;
                                ui.drawText(char, centerX + 96 + prefixWidth, renderY, UITheme.fonts.body, UITheme.colors.textMain, "left", "top");
                                ctx.restore();
                            }
                        }
                        globalCharIndex++;
                    }
                } else {
                    globalCharIndex += line.length;
                }
                globalCharIndex++;
                renderY += textLineHeight;
            });
            ui.endClip();

            if (textMaxScroll > 0) {
                const trackW = 8;
                const trackX = centerX + centerW - 16;
                const trackH = textViewportH;
                const thumbH = Math.max(40, (textViewportH / totalTextHeight) * trackH);
                const scrollRatio = textScrollOffset / textMaxScroll;
                const thumbY = textViewportY + (scrollRatio * (trackH - thumbH));

                // Track needs alpha applied manually to prevent instantly appearing
                const scrollAlpha = skipMessageAnimation ? 1.0 : Math.max(0, Math.min(1, (timeElapsed - T_TEXT_START) / 0.5));
                if (scrollAlpha > 0) {
                    ctx.save();
                    ctx.globalAlpha = scrollAlpha;
                    ui.drawRect(trackX, textViewportY, trackW, trackH, this.getAlphaColor(UITheme.colors.scrollTrack, scrollAlpha));
                    ui.drawRect(trackX, thumbY, trackW, thumbH, this.getAlphaColor(UITheme.colors.scrollThumb, scrollAlpha));
                    ctx.restore();

                    this.hotspots.push({
                        id: 'SCROLL_THUMB_TEXT',
                        x: trackX - 10, y: thumbY, w: trackW + 20, h: thumbH,
                        zIndex: 10
                    });
                }
            }
        }

        if (isTyping) {
            ctx.save();
            const alpha = (Math.sin(Date.now() / 150) + 1) / 2;
            ctx.globalAlpha = 0.4 + (alpha * 0.6);
            ctx.fillStyle = UITheme.colors.textHighlight;
            ctx.font = UITheme.fonts.italic;
            ctx.textAlign = "right";
            ctx.fillText("[Left Click / Enter] to Skip", skipPromptX, skipPromptY);
            ctx.restore();
        }

        // ========================================================
        // DECISIONS (CENTER COLUMN, BOTTOM)
        // ========================================================
        const hasDecisionContent = (decisions && decisions.length > 0) || rewards;
        if (decisionsAlpha > 0 && hasDecisionContent) {
            ctx.save();
            ctx.globalAlpha = decisionsAlpha;

            ui.drawLineWithGothicFlourish(centerX + (centerW * 0.1), dividerY, centerW * 0.8, this.getAlphaColor(UITheme.colors.borderHighlight, decisionsAlpha));

            if (rewards) {
                this.drawRewards(ctx, ui, rewards, centerX + 120, decisionViewportY);
                const alpha = (Math.sin(Date.now() / 150) + 1) / 2;
                ctx.globalAlpha = decisionsAlpha * (0.4 + (alpha * 0.6));
                ctx.fillStyle = UITheme.colors.textHighlight;
                ctx.font = UITheme.fonts.italic;
                ctx.textAlign = "right";
                ctx.fillText("[Left Click / Enter] to Continue", skipPromptX, skipPromptY);
                ctx.globalAlpha = decisionsAlpha;
            } else if (decisions && decisions.length > 0) {
                const btnX = centerX + 144;
                const btnW = centerW - 288;
                const lineHeight = 50;

                let totalHeight = 0;
                const decisionLayoutData = decisions.map((opt) => {
                    const lines = ui.getWrappedLines(opt.text, btnW, UITheme.fonts.body);
                    const dh = lines.length * lineHeight;
                    const blockHeight = dh + 24;
                    totalHeight += blockHeight;
                    return { lines, decisionHeight: dh, blockHeight };
                });

                const maxScroll = Math.max(0, totalHeight - decisionViewportH);
                const scrollOffset = Math.max(0, Math.min(scrollOffsets?.decisions || 0, maxScroll));
                const safeSelectedIndex = Math.max(0, Math.min(selectedIndex, decisions.length - 1));

                scrollBounds.decisions = {
                    bounds: { x: btnX - 48, y: decisionViewportY, w: btnW + 96, h: decisionViewportH },
                    maxScroll: maxScroll,
                    viewportH: decisionViewportH
                };

                ui.startClip(btnX - 60, decisionViewportY - 24, btnW + 120, decisionViewportH + 48);
                let renderY = decisionViewportY - scrollOffset;

                decisions.forEach((opt, index) => {
                    const isSelected = (index === safeSelectedIndex);
                    const hitId = `DECISION_${index}`;
                    const { decisionHeight, blockHeight } = decisionLayoutData[index];

                    if (renderY + blockHeight > decisionViewportY && renderY < decisionViewportY + decisionViewportH) {
                        if (decisionsAlpha > 0.8 || skipMessageAnimation) {
                            this.hotspots.push({
                                id: hitId,
                                x: btnX - 36, y: renderY - 8,
                                w: btnW + 72, h: decisionHeight + 16,
                                hoverSfx: 'hoverTick', clickSfx: 'hoverTick'
                            });
                        }
                    }

                    if (isSelected && typeof ui.drawSelectionBrackets === 'function') {
                        ui.drawSelectionBrackets(btnX - 36, renderY - 8, btnW + 72, decisionHeight + 16, 10, this.getAlphaColor(UITheme.colors.selectedWhite || '#ffffff', decisionsAlpha));
                    }

                    const textColor = isSelected ? (UITheme.colors.selectedWhite || '#ffffff') : UITheme.colors.textMuted;
                    ui.drawWrappedText(opt.text, btnX, renderY, btnW, lineHeight, UITheme.fonts.body, textColor);

                    renderY += blockHeight;
                });
                ui.endClip();

                if (maxScroll > 0) {
                    const trackW = 8;
                    const trackX = centerX + centerW - 16;
                    const trackH = decisionViewportH;
                    const thumbH = Math.max(40, (decisionViewportH / totalHeight) * trackH);
                    const scrollRatio = scrollOffset / maxScroll;
                    const thumbY = decisionViewportY + (scrollRatio * (trackH - thumbH));

                    ui.drawRect(trackX, decisionViewportY, trackW, trackH, this.getAlphaColor(UITheme.colors.scrollTrack, decisionsAlpha));
                    ui.drawRect(trackX, thumbY, trackW, thumbH, this.getAlphaColor(UITheme.colors.scrollThumb, decisionsAlpha));

                    if (decisionsAlpha > 0.8 || skipMessageAnimation) {
                        this.hotspots.push({
                            id: 'SCROLL_THUMB_DECISIONS',
                            x: trackX - 10, y: thumbY, w: trackW + 20, h: thumbH,
                            zIndex: 10
                        });
                    }
                }
            }
            ctx.restore();
        }

        // ========================================================
        // BOTTOM ATTRIBUTES
        // ========================================================
        if (colsAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = colsAlpha;

            if (party && party.length > 0) {
                const getModStr = (val) => {
                    const difficulty = gameState.difficulty || 'normal';
                    const globalConfig = DIFFICULTY_MODIFIERS[difficulty] || { rollBonus: 0 };
                    const difficultyRollMod = globalConfig.rollBonus || 0;
                    const attributeBonus = Math.floor((val - 10) / 3);
                    let appliedAttributeBonus = attributeBonus;

                    if (difficulty === 'easy' || difficulty === 'normal') {
                        appliedAttributeBonus = Math.max(0, attributeBonus);
                    }

                    const finalAppliedMod = appliedAttributeBonus + difficultyRollMod;
                    let finalizedNightmareMod = finalAppliedMod;

                    if (difficulty === 'nightmare' && finalAppliedMod > 0) {
                        finalizedNightmareMod = Math.floor(finalAppliedMod / 2);
                    }

                    return finalizedNightmareMod >= 0 ? `(+${finalizedNightmareMod})` : `(${finalizedNightmareMod})`;
                };

                const member = party[0];
                const attrs = member.attributes || {};
                const stats = [
                    { label: 'VIG', val: attrs.vigor || 0 },
                    { label: 'STR', val: attrs.strength || 0 },
                    { label: 'DEX', val: attrs.dexterity || 0 },
                    { label: 'INT', val: attrs.intelligence || 0 },
                    { label: 'ATN', val: attrs.attunement || 0 }
                ];
                const sectionW = centerW / stats.length;

                ui.drawLineWithGothicFlourish(centerX + (centerW * 0.1), attributeBarY, centerW * 0.8, this.getAlphaColor(UITheme.colors.borderHighlight, colsAlpha));

                stats.forEach((stat, i) => {
                    const topText = `${stat.label}: ${stat.val}`;
                    const bottomText = getModStr(stat.val);
                    const posX = centerX + (i * sectionW) + (sectionW / 2);

                    ui.drawText(topText, posX, attributeBarY + 44, UITheme.fonts.mono, UITheme.colors.textMuted, "center", "middle");
                    ui.drawText(bottomText, posX, attributeBarY + 74, UITheme.fonts.mono, UITheme.colors.textMuted, "center", "middle");

                    if (i < stats.length - 1) {
                        const sepX = centerX + ((i + 1) * sectionW);
                        ui.drawLine(sepX, attributeBarY + 34, sepX, attributeBarY + 84, this.getAlphaColor(UITheme.colors.borderHighlight, colsAlpha), 1);
                    }
                });
            } else {
                ui.drawLineWithGothicFlourish(centerX + (centerW * 0.2), attributeBarY, centerW * 0.6, this.getAlphaColor(UITheme.colors.borderHighlight, colsAlpha));
            }

            ctx.restore();
        }

        // ========================================================
        // SKILL CHECK OVERLAY
        // ========================================================
        const popupPhases = ['wait_for_roll', 'rolling', 'hold_base', 'apply_mod', 'result'];
        if (popupPhases.includes(actionPhase)) {
            const { displayVal, mod, dc, isSuccess } = rollData;
            ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            const popupW = 960;
            const popupH = 672;
            const popupX = (CANVAS_WIDTH / 2) - (popupW / 2);
            const popupY = (CANVAS_HEIGHT / 2) - (popupH / 2);

            const popupGrad = ctx.createLinearGradient(popupX, popupY, popupX, popupY + popupH);
            popupGrad.addColorStop(0, UITheme.colors.bgScale[2] || '#1a1a1a');
            popupGrad.addColorStop(1, '#050505');

            ctx.fillStyle = popupGrad;
            ctx.fillRect(popupX, popupY, popupW, popupH);
            ui.drawPanel(popupX, popupY, popupW, popupH, "transparent");

            ctx.shadowColor = '#000';
            ctx.shadowBlur = 14;
            ctx.shadowOffsetY = 5;
            ui.drawText("Skill Check", CANVAS_WIDTH / 2, popupY + 96, UITheme.fonts.header, UITheme.colors.textHighlight, "center");
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            ui.drawLineWithGothicFlourish(popupX + 96, popupY + 144, popupW - 192, UITheme.colors.borderHighlight);

            const isNeutralPhase = ['wait_for_roll', 'rolling', 'hold_base', 'apply_mod'].includes(actionPhase);
            const diceColor = isNeutralPhase ? UITheme.colors.textHighlight : (isSuccess ? UITheme.colors.success : UITheme.colors.failure);
            const diceAreaY = popupY + 336;
            const diceCenterX = CANVAS_WIDTH / 2;
            const leftModX = diceCenterX - 264;
            const rightThreshX = diceCenterX + 264;

            let modPulseScale = 1.0;
            let rollerPulseScale = 1.0;
            let resultPulseScale = 1.0;
            let modGlowIntensity = 0;
            let rollerGlowIntensity = 0;
            let resultGlowIntensity = 0; // Tracking pulse glow intensity
            let renderedRollerVal = displayVal;

        if (actionPhase === 'apply_mod') {
            // Increased duration from 1.5 to 2.5 for a slower, more deliberate modifier pop
            const phaseDuration = 2.5;
            let progress = 1.0 - (state.rollTimer / phaseDuration);
            progress = Math.min(Math.max(progress, 0), 1);

            let modProgress = Math.min(progress / 0.5, 1.0);
            modPulseScale = 1.0 + Math.sin(modProgress * Math.PI) * 0.2;
            modGlowIntensity = Math.sin(modProgress * Math.PI);

            renderedRollerVal = (modProgress < 1.0) ? rollData.d20 : rollData.total;

            if (progress > 0.5) {
                let rollerProgress = Math.min((progress - 0.5) / 0.5, 1.0);
                rollerPulseScale = 1.0 + Math.sin(rollerProgress * Math.PI) * 0.2;
                rollerGlowIntensity = Math.sin(rollerProgress * Math.PI);
            }
        } else if (actionPhase === 'result') {
            // Increased duration from 2.0 to 3.5 to keep the results on screen longer
            const phaseDuration = 3.5;
            let progress = 1.0 - (state.rollTimer / phaseDuration);
            progress = Math.min(Math.max(progress, 0), 1);

            // Change multiplier from 2.0 to 1.25. 
            // This spreads the 3 pulses out over 80% of the phase duration instead of rushing them in 50%
            let p2 = Math.min(progress * 1.25, 1.0);

            // Decay lowers the intensity of each consecutive pulse (1.0 -> 0)
            let decay = 1.0 - p2;

            // Math.PI * 3 creates exactly 3 arching pulses when run through Math.abs()
            let pulseWave = Math.abs(Math.sin(p2 * Math.PI * 3));

            // First pulse is ~25% larger, second is ~12%, third is ~4%
            resultPulseScale = 1.0 + (pulseWave * 0.25 * decay);
            resultGlowIntensity = pulseWave * decay;
            renderedRollerVal = rollData.total;
        }

            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
            const activeModColor = mod >= 0 ? (UITheme.colors.success || '#00ff00') : (UITheme.colors.failure || '#ff0000');

            // --- 1. MODIFIER (Left side) ---
            ctx.save();
            ctx.translate(leftModX, diceAreaY);
            if (actionPhase === 'apply_mod') ctx.scale(modPulseScale, modPulseScale);

            ui.drawText("Modifier", 0, -72, UITheme.fonts.small || "34px sans-serif", UITheme.colors.textMuted, "center", "middle");

            if (actionPhase === 'apply_mod' && modGlowIntensity > 0) {
                ctx.shadowColor = activeModColor;
                ctx.shadowBlur = 36 * modGlowIntensity;
            }

            const finalModColor = actionPhase === 'apply_mod' ? activeModColor : UITheme.colors.textMain;
            ui.drawText(modStr, 0, 24, UITheme.fonts.title, finalModColor, "center", "middle");
            ctx.restore();

            // --- 2. ROLLER / DICE (Center side) ---
            ctx.save();
            ctx.translate(diceCenterX, diceAreaY);

            if (actionPhase === 'apply_mod') ctx.scale(rollerPulseScale, rollerPulseScale);
            else if (actionPhase === 'result') ctx.scale(resultPulseScale, resultPulseScale);

            const diamondSize = 108;

            if (actionPhase === 'result') {
                ctx.shadowColor = isSuccess ? (UITheme.colors.success || '#00ff00') : (UITheme.colors.failure || '#ff0000');
                // Base glow of 30, spiking up to 80 on the impacts
                ctx.shadowBlur = 30 + (50 * resultGlowIntensity);
            } else if (actionPhase === 'apply_mod' && rollerGlowIntensity > 0) {
                ctx.shadowColor = isSuccess ? (UITheme.colors.success || '#00ff00') : (UITheme.colors.failure || '#ff0000');
                ctx.shadowBlur = 60 * rollerGlowIntensity;
            }

            ctx.fillStyle = '#0a0a0a';
            ctx.beginPath();
            ctx.moveTo(0, -diamondSize);
            ctx.lineTo(diamondSize, 0);
            ctx.lineTo(0, diamondSize);
            ctx.lineTo(-diamondSize, 0);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = diceColor;
            ctx.lineWidth = 5;
            ctx.stroke();

            ctx.strokeStyle = "rgba(255,255,255,0.15)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -diamondSize + 14);
            ctx.lineTo(diamondSize - 14, 0);
            ctx.lineTo(0, diamondSize - 14);
            ctx.lineTo(-diamondSize + 14, 0);
            ctx.closePath();
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.font = "bold 96px monospace";
            ctx.fillStyle = diceColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(renderedRollerVal.toString(), 0, 0);
            ctx.restore();

            // --- 3. THRESHOLD (Right side) ---
            ctx.save();
            ctx.translate(rightThreshX, diceAreaY);
            ui.drawText("Threshold", 0, -72, UITheme.fonts.small || "34px sans-serif", UITheme.colors.textMuted, "center", "middle");
            ui.drawText(dc.toString(), 0, 24, UITheme.fonts.title, UITheme.colors.textMain, "center", "middle");
            ctx.restore();

            if (actionPhase === 'wait_for_roll') {
                const btnW = 384;
                const btnH = 96;
                const btnX = (CANVAS_WIDTH / 2) - (btnW / 2);
                const btnY = popupY + 528;
                const rollId = "BTN_ROLL";
                const isRollHovered = hoveredElement && hoveredElement.id === rollId;

                this.hotspots.push({ id: rollId, x: btnX, y: btnY, w: btnW, h: btnH, hoverSfx: 'hoverTick', clickSfx: 'cinematicBoom' });
                ui.drawPanel(btnX, btnY, btnW, btnH, isRollHovered ? "rgba(255,255,255,0.1)" : UITheme.colors.bgScale[3]);

                const alpha = (Math.sin(Date.now() / 200) + 1) / 2;
                ctx.globalAlpha = 0.6 + (alpha * 0.4);
                ctx.shadowColor = UITheme.colors.textHighlight;
                ctx.shadowBlur = isRollHovered ? 30 : 19;
                ui.drawText("ROLL", CANVAS_WIDTH / 2, btnY + 62, UITheme.fonts.bold, UITheme.colors.textHighlight, "center");
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;
            } else if (actionPhase === 'result') {
                const resultText = isSuccess ? "SUCCESS!" : "FAILED";
                ctx.shadowColor = diceColor;
                
                // Pulse the text shadow
                ctx.shadowBlur = 24 + (24 * resultGlowIntensity);
                
                // Slightly bump the text scale to match the impact
                ctx.save();
                ctx.translate(CANVAS_WIDTH / 2, popupY + 588);
                const textBump = 1.0 + (resultGlowIntensity * 0.08); // 8% text size bump
                ctx.scale(textBump, textBump);
                ui.drawText(resultText, 0, 0, UITheme.fonts.header, diceColor, "center");
                ctx.restore();
                
                ctx.shadowBlur = 0;
            } else if (['rolling', 'hold_base', 'apply_mod'].includes(actionPhase)) {
                const alpha = (Math.sin(Date.now() / 150) + 1) / 2;
                ctx.globalAlpha = 0.4 + (alpha * 0.6);
                ui.drawText("[Left Click / Enter] to Skip", CANVAS_WIDTH / 2, popupY + 588, UITheme.fonts.italic, UITheme.colors.textHighlight, "center");
                ctx.globalAlpha = 1.0;
            }
        }

        ctx.restore();

        if (onLayoutUpdate) {
            onLayoutUpdate(this.hotspots, scrollBounds);
        }
    }

    drawRewards(ctx, ui, rewards, x, y) {
        let currentY = y;
        const lineHeight = 67;

        ctx.shadowColor = '#000';
        ctx.shadowBlur = 10;
        ui.drawText("Rewards Found", x, currentY, UITheme.fonts.header, UITheme.colors.textHighlight);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        currentY += lineHeight + 12;

        if (rewards.xp) {
            ui.drawText(`+ ${rewards.xp} XP`, x + 36, currentY, UITheme.fonts.body, UITheme.colors.success || UITheme.colors.textMain);
            currentY += lineHeight;
        }
        if (rewards.currency) {
            ui.drawText(`+ ${rewards.currency} Currency`, x + 36, currentY, UITheme.fonts.body, UITheme.colors.textHighlight);
            currentY += lineHeight;
        }
        if (rewards.items && rewards.items.length > 0) {
            currentY += 24;
            ui.drawText("Items Acquired:", x + 36, currentY, UITheme.fonts.body, UITheme.colors.textMain);
            currentY += lineHeight;
            rewards.items.forEach(item => {
                const qtyStr = item.quantity && item.quantity > 1 ? ` (x${item.quantity})` : "";
                ui.drawText(`- ${item.name}${qtyStr}`, x + 84, currentY, UITheme.fonts.body, UITheme.colors.textMuted);
                currentY += lineHeight;
            });
        }
    }

    drawPartyMember(ctx, ui, member, x, y, colWidth, nameY, font, targetAreaSize, transition = null, baseAlpha = 1.0) {
        const nativeRes = 128;
        const imgScale = 2;
        const drawSize = nativeRes * imgScale;

        const pX = x + (colWidth / 2) - (targetAreaSize / 2);
        const pY = y;

        const transActive = transition && transition.active;
        const prevMember = transActive ? transition.previousPartyMember : null;
        const isDying = prevMember && prevMember.hp > 0 && member.hp <= 0;
        const characterChanged = prevMember && (prevMember.name !== member.name || isDying);
        const displayName = (characterChanged && transition.progress < 0.5) ? prevMember.name : member.name;
        const displayColor = (characterChanged && transition.progress < 0.5) ?
            (prevMember.hp <= 0 ? UITheme.colors.hp : UITheme.colors.textMain) :
            (member.hp <= 0 ? UITheme.colors.hp : UITheme.colors.textMain);

        ctx.save();
        ctx.globalAlpha = baseAlpha;

        this.drawCenteredWrappedText(ctx, ui, displayName, x + (colWidth / 2), nameY, colWidth - 48, 58, UITheme.fonts.header, displayColor, true);

        ctx.fillStyle = '#050505';
        ctx.fillRect(pX, pY, targetAreaSize, targetAreaSize);

        // Safely patch UITheme colors so CanvasUI border drawing inherits the fade
        const fadeBorder = this.getAlphaColor(UITheme.colors.border, baseAlpha);
        const fadeHighlight = this.getAlphaColor(UITheme.colors.borderHighlight, baseAlpha);
        const oldBorder = UITheme.colors.border;
        const oldHighlight = UITheme.colors.borderHighlight;
        UITheme.colors.border = fadeBorder;
        UITheme.colors.borderHighlight = fadeHighlight;

        ui.drawPanel(pX - 4, pY - 4, targetAreaSize + 8, targetAreaSize + 8, "transparent", fadeBorder);

        // Restore theme
        UITheme.colors.border = oldBorder;
        UITheme.colors.borderHighlight = oldHighlight;
        ctx.restore();

        const drawCharSprite = (charData, alpha) => {
            if (!charData || !this.loader) return;
            const sheet = this.loader.get(charData.spritePortrait);
            if (!sheet) return;

            const imgX = x + (colWidth / 2) - (drawSize / 2);
            const imgY = pY + (targetAreaSize / 2) - (drawSize / 2);

            ctx.save();
            ctx.globalAlpha = alpha * baseAlpha;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sheet, 0, 0, nativeRes, nativeRes, imgX, imgY, drawSize, drawSize);
            ctx.imageSmoothingEnabled = true;
            ctx.restore();
        };

        if (transActive && characterChanged) {
            const p = transition.progress;
            const smoothP = p * p * (3 - 2 * p);

            drawCharSprite(prevMember, 1.0 - smoothP);
            if (prevMember.hp <= 0) {
                ctx.save();
                ctx.globalAlpha = (1.0 - smoothP) * baseAlpha;
                ctx.fillStyle = "rgba(100, 0, 0, 0.6)";
                ctx.fillRect(pX, pY, targetAreaSize, targetAreaSize);
                ctx.restore();
            }

            drawCharSprite(member, smoothP);
            if (member.hp <= 0) {
                ctx.save();
                ctx.globalAlpha = smoothP * baseAlpha;
                ctx.fillStyle = "rgba(100, 0, 0, 0.6)";
                ctx.fillRect(pX, pY, targetAreaSize, targetAreaSize);
                ctx.restore();
            }
        } else {
            drawCharSprite(member, 1.0);
            if (member.hp <= 0) {
                ctx.save();
                ctx.globalAlpha = baseAlpha;
                ctx.fillStyle = "rgba(100, 0, 0, 0.6)";
                ctx.fillRect(pX, pY, targetAreaSize, targetAreaSize);
                ctx.restore();
            }
        }
    }
}