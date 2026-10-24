// ui/overworld/encounter/encounterRenderer.js
import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { UI_SFX } from '../../ui/uiSfx.js';
import { gameState } from "../../../../shared/core/gameState.js";
import { DIFFICULTY_MODIFIERS } from '../../../../shared/core/constants.js';
import { drawItemChips } from '../../ui/itemChips.js';
import { drawEmbers } from '../../ui/particles/embers.js';
import { drawSmoke } from '../../ui/particles/smoke.js';
import { drawStatTooltip } from '../../ui/statTooltip.js';
import { isCursed, drawCursedPortrait } from '../../ui/curseOverlay.js';
import { TONES, fxShake, fxFlash } from '../../ui/encounterFx.js';
import { NARRATION, STAGE_START_TIMER, narrationPlan, textEndTimer, decisionAlpha } from '../../ui/narration.js';

const BONE = [226, 218, 200];        // UITheme.colors.textMain
const NARRATION_SIZES = [44, 40, 36, 32];   // largest first: the text takes the biggest one that fits the viewport

export class EncounterRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
        this.hotspots = [];
        // Store displayed values for smooth vital bar animations
        this.animatedVitals = {};
    }

    // Smooth linear interpolation (Lerp) helper for numeric vitals
    getAnimatedValue(key, targetValue, speed = 8.0) {
        if (this.animatedVitals[key] === undefined) {
            this.animatedVitals[key] = targetValue;
            return targetValue;
        }

        const current = this.animatedVitals[key];
        const diff = targetValue - current;

        // Snap to target value if difference is negligible
        if (Math.abs(diff) < 0.05) {
            this.animatedVitals[key] = targetValue;
            return targetValue;
        }

        // Smooth step frame-by-frame toward target
        const step = diff * (speed * 0.016);
        this.animatedVitals[key] += step;
        return this.animatedVitals[key];
    }

    // Helper to inject alpha into hex/rgb strings so UI components that reset globalAlpha will still fade
    getAlphaColor(color, alpha) {
        if (!color || typeof color !== 'string') return color;
        const c = color.trim().toLowerCase();

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

        if (c.startsWith('rgb')) {
            const nums = c.match(/\d+(\.\d+)?/g);
            if (nums && nums.length >= 3) {
                return `rgba(${nums[0]}, ${nums[1]}, ${nums[2]}, ${alpha})`;
            }
        }

        const namedColors = {
            'white': '255, 255, 255', 'black': '0, 0, 0', 'red': '255, 0, 0',
            'green': '0, 128, 0', 'blue': '0, 0, 255', 'yellow': '255, 255, 0',
            'gray': '128, 128, 128', 'grey': '128, 128, 128', 'transparent': '0, 0, 0'
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
        const attrCells = {}; // attribute -> its cell in the bar at the bottom, so hovering it can say what it does (drawn last)

        if (!state || !state.text) return;

        const {
            imageInfo, transition, text, title, stageName, encounter, decisions,
            rewards, rewardItems, ui: uiState, party = [], currency = 0, skipMessageAnimation,
            textTimer = 0, stageTone = null, stageEffect = null, hasDoneIntro = false, canSkip = false, holdProgress = 0, hintPulse = 0, actionPhase, rollData, hoveredElement, scrollOffsets, onLayoutUpdate
        } = state;

        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;
        const ui = new CanvasUI(ctx);

        // The one lit element: what the mouse is over, or the keyboard cursor (DECISION_n / BTN_ROLL)
        const focusId = hoveredElement ? hoveredElement.id : null;

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

        const PHASE_TITLE_FADE = 2.0;
        const PHASE_COLS_FADE = 1.8;
        const T_TITLE_START = 0;
        const T_COLS_START = 0.6;                            // the side pictures fade in under the title; the words begin as they finish (T_COLS_START + PHASE_COLS_FADE <= TEXT_START)
        const T_TEXT_START = NARRATION.TEXT_START;          // same clock as the controller (ui/narration.js)
        const T_TEXT_END = textEndTimer(text);

        const ease = p => p * p * (3 - 2 * p);

        if (skipMessageAnimation || hasDoneIntro) {
            // Only the very first screen of an encounter plays the title / columns intro; later stages start in the dark
            titleAlpha = 1.0;
            colsAlpha = 1.0;
        } else {
            titleAlpha = ease(Math.max(0, Math.min(1, (timeElapsed - T_TITLE_START) / PHASE_TITLE_FADE)));
            colsAlpha = ease(Math.max(0, Math.min(1, (timeElapsed - T_COLS_START) / PHASE_COLS_FADE)));
        }
        // The first choice's fade also gates the divider and the reward block
        decisionsAlpha = skipMessageAnimation ? 1.0 : decisionAlpha(timeElapsed, text, 0);

        ui.clearScreen(CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // A stage's tone colors its fresh words and the embers; a stage's effect plays as it opens (stage fields: see story/encounters/story/prologue.js)
        const tone = TONES[stageTone] || TONES.warm;
        const tint = tone.word;
        const stageAge = textTimer - STAGE_START_TIMER;
        ctx.save();
        if (stageEffect) {
            const jolt = fxShake(stageEffect, stageAge);
            if (jolt.x || jolt.y) ctx.translate(jolt.x, jolt.y);
        }

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

            ui.drawLine(leftW, 0, leftW, h, this.getAlphaColor(UITheme.colors.border, colsAlpha), 2);
            ui.drawLine(leftW + centerW, 0, leftW + centerW, h, this.getAlphaColor(UITheme.colors.border, colsAlpha), 2);
            ctx.restore();

            // Smoke drifts over the columns, behind the picture and the words
            drawSmoke(ctx, Date.now() / 1000, CANVAS_WIDTH, CANVAS_HEIGHT, 0.85 * colsAlpha, true);
        }

        // ========================================================
        // TITLE RENDERING
        // ========================================================
        if (titleAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = titleAlpha;
            const encounterTitle = title || (encounter && encounter.title) || "Unknown Encounter";
            this.drawCenteredWrappedText(
                ctx, ui, encounterTitle, centerX + (centerW / 2), 96,
                centerW - 96, 67, UITheme.fonts.header, UITheme.colors.textMain, true
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

            // The right column is the picture only: the name of each stage ("The Hollow", "Warm Iron", "Victory") used to be written above it and changed with every
            // stage, which was too harsh. The stages still have their displayText in the data; it is just not shown.
            const rightColX = leftW + centerW;
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            const panelX = rightColX + (rightW / 2) - (targetAreaSize / 2);
            const fadeBorder = this.getAlphaColor(UITheme.colors.border, colsAlpha);
            const fadeHighlight = this.getAlphaColor(UITheme.colors.borderHighlight, colsAlpha);
            const oldBorder = UITheme.colors.border;
            const oldHighlight = UITheme.colors.borderHighlight;

            UITheme.colors.border = fadeBorder;
            UITheme.colors.borderHighlight = fadeHighlight;

            ui.drawPanel(panelX - 4, imageY - 4, targetAreaSize + 8, targetAreaSize + 8, this.getAlphaColor('#000000', colsAlpha), fadeBorder);
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

        // The vignette closes in around the words, and breathes
        if (colsAlpha > 0) {
            const now = Date.now() / 1000;
            const breath = 0.5 + 0.5 * Math.sin(now * 0.7);
            const vx = centerX + centerW / 2, vy = textViewportY + textViewportH / 2;
            const vig = ctx.createRadialGradient(vx, vy, 260, vx, vy, 1180);
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, `rgba(0,0,0,${(0.5 + 0.12 * breath).toFixed(3)})`);
            ctx.save();
            ctx.globalAlpha = colsAlpha;
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.restore();
        }

        // Embers fill the whole screen, rising through the party and image columns as well as the text. They are there from the first frame of the scene.
        {
            const emberAlpha = (skipMessageAnimation || hasDoneIntro) ? 1 : ease(Math.max(0, Math.min(1, timeElapsed / 0.35)));
            if (emberAlpha > 0) this.drawEmbers(ctx, Date.now() / 1000, 0, CANVAS_WIDTH, CANVAS_HEIGHT, emberAlpha, tone.ember);
        }

        if (timeElapsed >= T_TEXT_START || skipMessageAnimation) {
            const narrationLayout = this.layoutNarration(ctx, text, centerW - 192, textViewportH);
            const { lines, lineHeight, totalHeight, font } = narrationLayout;
            const textMaxScroll = Math.max(0, totalHeight - textViewportH);
            const textScrollOffset = Math.max(0, Math.min(scrollOffsets?.text || 0, textMaxScroll));

            scrollBounds.text = {
                bounds: { x: centerX + 64, y: textViewportY, w: centerW - 128, h: textViewportH },
                maxScroll: textMaxScroll,
                viewportH: textViewportH
            };

            const plan = narrationPlan(text);
            const wordT = timeElapsed - T_TEXT_START;
            const now = Date.now() / 1000;
            const textLeftX = centerX + 96;                  // the narration is left-aligned, matching layoutNarration's width of centerW - 192
            // A short text sits in the middle of the viewport, like the opening of a story; a long one starts at the top and scrolls
            const startY = textViewportY + Math.max(0, (textViewportH - totalHeight) / 2) - textScrollOffset;

            ui.startClip(centerX + 64, textViewportY - 16, centerW - 128, textViewportH + 32);
            ctx.font = font;
            ctx.textBaseline = 'top';
            ctx.textAlign = 'left';

            lines.forEach((line) => {
                const y = startY + line.y;
                if (y + lineHeight < textViewportY - 16 || y > textViewportY + textViewportH + 16) return;
                let x = textLeftX;
                line.words.forEach((w) => {
                    const a = skipMessageAnimation ? 1 : Math.max(0, Math.min(1, (wordT - plan.starts[w.index]) / NARRATION.WORD_FADE));
                    if (a > 0) {
                        const e = ease(a);
                        // ember glow: a word is warm as it arrives and cools to bone
                        const glow = skipMessageAnimation ? 0 : Math.max(0, 1 - (wordT - plan.starts[w.index]) / NARRATION.EMBER_GLOW);
                        const g = glow * glow;
                        const r = Math.round(BONE[0] + (tint[0] - BONE[0]) * g);
                        const gr = Math.round(BONE[1] + (tint[1] - BONE[1]) * g);
                        const b = Math.round(BONE[2] + (tint[2] - BONE[2]) * g);
                        ctx.save();
                        ctx.globalAlpha = e;
                        ctx.shadowColor = g > 0.02 ? `rgba(${tint[0]},${tint[1]},${tint[2]},${(0.85 * g).toFixed(3)})` : 'rgba(0,0,0,0.9)';
                        ctx.shadowBlur = g > 0.02 ? 6 + 20 * g : 8;
                        ctx.fillStyle = `rgb(${r},${gr},${b})`;
                        ctx.fillText(w.text, x, y + (1 - e) * NARRATION.WORD_RISE);
                        ctx.restore();
                    }
                    x += w.width + line.spaceW;
                });
            });
            ui.endClip();

            if (textMaxScroll > 0) {
                const trackW = UITheme.scrollbar.width;
                const trackX = centerX + centerW - 8 - trackW;
                const scrollAlpha = skipMessageAnimation ? 1.0 : Math.max(0, Math.min(1, (timeElapsed - T_TEXT_START) / 0.5));
                if (scrollAlpha > 0) {
                    ctx.save();
                    ctx.globalAlpha = scrollAlpha;
                    const thumb = ui.drawScrollbar(trackX, textViewportY, trackW, textViewportH, textScrollOffset, textMaxScroll, textViewportH,
                        ui.flags('SCROLL_THUMB_TEXT', focusId));
                    ctx.restore();

                    if (thumb) {
                        this.hotspots.push({
                            id: 'SCROLL_THUMB_TEXT',
                            x: trackX - 10, y: thumb.y, w: trackW + 20, h: thumb.h,
                            zIndex: 10
                        });
                    }
                }
            }
        }

        // Skipping is a deliberate act: hold the button / Enter / Space. (The skill-check popup has its own prompt.)
        if (canSkip && !['rolling', 'hold_base', 'apply_mod', 'wait_for_roll', 'result'].includes(actionPhase)) {
            this.drawHoldPrompt(ctx, skipPromptX, skipPromptY, 'right', holdProgress, hintPulse, 1);
        }

        // ========================================================
        // REWARD ITEMS (CENTER COLUMN, BOTTOM): the pictures of the items a reward message lists, on the same plates the
        // overworld pickup toast uses. They fade in as soon as the message has finished typing.
        // ========================================================
        if (rewardItems && rewardItems.length > 0) {
            const itemsAlpha = skipMessageAnimation ? 1.0 : ease(Math.max(0, Math.min(1, (timeElapsed - T_TEXT_END) / 0.6)));
            if (itemsAlpha > 0) {
                ctx.save();
                ctx.globalAlpha = itemsAlpha;
                ui.drawLineWithGothicFlourish(centerX + (centerW * 0.1), dividerY, centerW * 0.8, this.getAlphaColor(UITheme.colors.borderHighlight, itemsAlpha));
                drawItemChips(ui, ctx, this.loader, rewardItems, centerX + centerW / 2, decisionViewportY + 8, { maxWidth: centerW - 192 });
                ctx.restore();
            }
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

                scrollBounds.decisions = {
                    bounds: { x: btnX - 48, y: decisionViewportY, w: btnW + 96, h: decisionViewportH },
                    maxScroll: maxScroll,
                    viewportH: decisionViewportH
                };

                ui.startClip(btnX - 60, decisionViewportY - 24, btnW + 120, decisionViewportH + 48);

                let renderY = decisionViewportY - scrollOffset;
                decisions.forEach((opt, index) => {
                    const hitId = `DECISION_${index}`;
                    const { decisionHeight, blockHeight } = decisionLayoutData[index];

                    // The choices surface one after another; one can be picked only once it is clearly there
                    const optAlpha = skipMessageAnimation ? 1.0 : decisionAlpha(timeElapsed, text, index);
                    const optRise = (1 - optAlpha) * 14;

                    if (renderY + blockHeight > decisionViewportY && renderY < decisionViewportY + decisionViewportH) {
                        if (optAlpha >= NARRATION.DECISION_READY) {
                            this.hotspots.push({
                                id: hitId,
                                x: btnX - 36,
                                y: renderY - 8,
                                w: btnW + 72,
                                h: decisionHeight + 16,

                                clickSfx: UI_SFX.step
                            });
                        }
                    }

                    if (optAlpha > 0) {
                        ctx.save();
                        ctx.globalAlpha = optAlpha;
                        ctx.translate(0, optRise);
                        // The shared state look (gold wash + brackets, inside because the options sit close together)
                        const flags = optAlpha >= NARRATION.DECISION_READY ? ui.flags(hitId, focusId) : ui.flags(hitId, null);
                        ui.drawStateBox(btnX - 36, renderY - 8, btnW + 72, decisionHeight + 16, flags, { inset: true });

                        const textColor = ui.stateTextColor(flags, UITheme.colors.textMuted);
                        ui.drawWrappedText(opt.text, btnX, renderY, btnW, lineHeight, UITheme.fonts.body, textColor);
                        ctx.restore();
                    }

                    renderY += blockHeight;
                });
                ui.endClip();

                if (maxScroll > 0) {
                    const trackW = UITheme.scrollbar.width;
                    const trackX = centerX + centerW - 8 - trackW;

                    const thumb = ui.drawScrollbar(trackX, decisionViewportY, trackW, decisionViewportH, scrollOffset, maxScroll, decisionViewportH,
                        ui.flags('SCROLL_THUMB_DECISIONS', focusId));

                    if (thumb && (decisionsAlpha > 0.8 || skipMessageAnimation)) {
                        this.hotspots.push({
                            id: 'SCROLL_THUMB_DECISIONS',
                            x: trackX - 10, y: thumb.y, w: trackW + 20, h: thumb.h,
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
                    attrCells[['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'][i]] = { x: centerX + (i * sectionW), y: attributeBarY + 24, w: sectionW, h: 72 };

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
            let resultGlowIntensity = 0;

            let renderedRollerVal = displayVal;

            if (actionPhase === 'apply_mod') {
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
                const phaseDuration = 3.5;
                let progress = 1.0 - (state.rollTimer / phaseDuration);
                progress = Math.min(Math.max(progress, 0), 1);
                let p2 = Math.min(progress * 1.25, 1.0);
                let decay = 1.0 - p2;
                let pulseWave = Math.abs(Math.sin(p2 * Math.PI * 3));
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
                const rollFlags = ui.flags(rollId, focusId);

                this.hotspots.push({
                    id: rollId, x: btnX, y: btnY, w: btnW, h: btnH
                });

                ui.drawPanel(btnX, btnY, btnW, btnH, UITheme.colors.bgScale[3]);
                ui.drawStateBox(btnX, btnY, btnW, btnH, rollFlags);

                const alpha = (Math.sin(Date.now() / 200) + 1) / 2;
                ctx.globalAlpha = 0.6 + (alpha * 0.4);
                ctx.shadowColor = UITheme.colors.textHighlight;
                ctx.shadowBlur = rollFlags.highlighted ? 30 : 19;
                ui.drawText("ROLL", CANVAS_WIDTH / 2, btnY + 62, UITheme.fonts.bold, UITheme.colors.textHighlight, "center");
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;
            } else if (actionPhase === 'result') {
                const resultText = isSuccess ? "SUCCESS!" : "FAILED";
                ctx.shadowColor = diceColor;
                ctx.shadowBlur = 24 + (24 * resultGlowIntensity);
                ctx.save();
                ctx.translate(CANVAS_WIDTH / 2, popupY + 588);
                const textBump = 1.0 + (resultGlowIntensity * 0.08);
                ctx.scale(textBump, textBump);
                ui.drawText(resultText, 0, 0, UITheme.fonts.header, diceColor, "center");
                ctx.restore();
                ctx.shadowBlur = 0;
            } else if (['rolling', 'hold_base', 'apply_mod'].includes(actionPhase)) {
                this.drawHoldPrompt(ctx, CANVAS_WIDTH / 2, popupY + 588, 'center', holdProgress, hintPulse, 1);
            }
        }
        ctx.restore();

        // the colour wash of the stage's effect (a flash, a blast, a glow)
        const wash = stageEffect ? fxFlash(stageEffect, stageAge) : null;
        if (wash) {
            ctx.fillStyle = `rgba(${wash.rgb[0]},${wash.rgb[1]},${wash.rgb[2]},${wash.alpha.toFixed(3)})`;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        ctx.restore();   // (the stage's jolt)

        // What the attribute under the mouse does (the bar is passive, so the keyboard has nothing to select here)
        if (colsAlpha > 0.9 && !popupPhases.includes(actionPhase) && state.mouse && !state.isUsingKeyboard) {
            const hit = Object.keys(attrCells).find(k => {
                const r = attrCells[k];
                return state.mouse.x >= r.x && state.mouse.x <= r.x + r.w && state.mouse.y >= r.y && state.mouse.y <= r.y + r.h;
            });
            if (hit) drawStatTooltip(ui, hit, attrCells[hit], { placement: 'above', skillChecks: true, multipliers: party[0]?.statMultipliers || party[0]?.state?.statMultipliers });
        }

        if (onLayoutUpdate) {
            onLayoutUpdate(this.hotspots, scrollBounds);
        }
    }

    /**
     * Lays the narration out for left-aligned, word-by-word drawing. Paragraphs split at "\n" and words at spaces, exactly as
     * narrationPlan() counts them, so `index` is the word's place in the reveal schedule. Picks the largest size that fits.
     */
    layoutNarration(ctx, text, maxWidth, viewportH) {
        const key = `${text}|${maxWidth}|${viewportH}`;
        if (this._layoutKey === key && this._layout) return this._layout;

        const paragraphs = String(text || '').split('\n');
        let best = null;
        for (let k = 0; k < NARRATION_SIZES.length; k++) {
            const size = NARRATION_SIZES[k];
            const font = `500 ${size}px "Cormorant Garamond", Georgia, serif`;
            const lineHeight = Math.round(size * 1.42);
            ctx.save();
            ctx.font = font;
            const spaceW = ctx.measureText(' ').width;
            const lines = [];
            let index = 0, y = 0;
            paragraphs.forEach((paragraph, p) => {
                const words = paragraph.split(' ').filter(Boolean);
                if (words.length === 0) { if (p > 0) y += lineHeight * 0.4; return; }
                if (p > 0 && lines.length) y += lineHeight * 0.45;           // a breath between paragraphs
                let cur = { words: [], width: 0, y, spaceW };
                words.forEach((word) => {
                    const w = ctx.measureText(word).width;
                    const add = cur.words.length ? spaceW + w : w;
                    if (cur.words.length && cur.width + add > maxWidth) {
                        lines.push(cur);
                        y += lineHeight;
                        cur = { words: [], width: 0, y, spaceW };
                    }
                    cur.width += cur.words.length ? spaceW + w : w;
                    cur.words.push({ text: word, width: w, index: index++ });
                });
                lines.push(cur);
                y += lineHeight;
            });
            ctx.restore();
            best = { lines, lineHeight, totalHeight: y, font };
            if (y <= viewportH) break;     // fits at this size
        }
        this._layoutKey = key;
        this._layout = best;
        return best;
    }

    /** Embers over the whole screen (shared with the title screen and the character creator: ui/particles/embers.js). */
    drawEmbers(ctx, now, x0, width, height, alpha, tint) {
        drawEmbers(ctx, now, x0, width, height, alpha, tint);
    }

    /** "Hold to skip" with a ring that fills while the button is held. Faint at rest; a click that did nothing makes it flare. */
    drawHoldPrompt(ctx, x, y, align, progress, pulse, alpha) {
        const label = 'Hold to skip';
        const strength = Math.max(0.35 + 0.15 * (0.5 + 0.5 * Math.sin(Date.now() / 600)), pulse, progress > 0 ? 1 : 0);
        ctx.save();
        ctx.globalAlpha = alpha * Math.min(1, strength);
        ctx.font = UITheme.fonts.italic;
        ctx.textBaseline = 'alphabetic';
        const tw = ctx.measureText(label).width;
        const ringR = 15, gap = 14;
        const totalW = ringR * 2 + gap + tw;
        const left = align === 'right' ? x - totalW : align === 'center' ? x - totalW / 2 : x;
        const cx = left + ringR, cy = y - 10;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(201,166,79,0.28)';
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
        if (progress > 0) {
            ctx.strokeStyle = UITheme.colors.textHighlight;
            ctx.shadowColor = UITheme.colors.textHighlight;
            ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(cx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke();
            ctx.shadowBlur = 0;
        }
        ctx.fillStyle = UITheme.colors.textHighlight;
        ctx.textAlign = 'left';
        ctx.fillText(label, left + ringR * 2 + gap, y);
        ctx.restore();
    }

    drawStatRow(ctx, ui, label, current, max, x, y, barW, h, numW, labelW, color, dimColor, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const fadedTextMuted = this.getAlphaColor(UITheme.colors.textMuted, alpha);
    const fadedColor = this.getAlphaColor(color, alpha);
    const fadedDimColor = this.getAlphaColor(dimColor, alpha);

    ui.drawText(label, x, y + 12, UITheme.fonts.cardMono || UITheme.fonts.mono, fadedTextMuted);
    // TEMPORARY OVERRIDE: Inject alpha into the global border color so the hardcoded
    // globalAlpha inside CanvasUI.drawBar doesn't prevent the border from fading out.
    const oldBorder = UITheme.colors.border;
    UITheme.colors.border = this.getAlphaColor(oldBorder, alpha);
    ui.drawBar(x + labelW, y, barW, h, current, max, fadedColor, fadedDimColor);
    // Restore original border color
    UITheme.colors.border = oldBorder;
    ui.drawFraction(current, max, x + labelW + barW + numW, y + 12, numW, UITheme.fonts.cardMono || UITheme.fonts.mono, fadedTextMuted, "right");
    ctx.restore();
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

    drawStatusEffects(ctx, ui, member, pX, pY, pSize, alpha) {
        if (!member.statusEffects || member.statusEffects.length === 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        const sheetKey = 'statusEffects';
        const srcSize = 64;   // one cell of the status_effects sheet (the same value the Party and Summary screens use)
        const drawSize = 32;
        const spacing = 5;
        const sheet = this.loader.get ? this.loader.get(sheetKey) : (this.loader.getAsset ? this.loader.getAsset(sheetKey) : null);
        let drawX = pX + 5;
        let drawY = pY + pSize - drawSize - 5;

        member.statusEffects.forEach(effect => {
            // Background Box
            ctx.fillStyle = this.getAlphaColor('rgba(0, 0, 0, 0.8)', alpha);
            ctx.fillRect(drawX, drawY, drawSize, drawSize);
            // Border Box
            ui.drawRect(drawX, drawY, drawSize, drawSize, this.getAlphaColor(UITheme.colors.border, alpha), false);

            if (sheet && effect.icon && effect.icon.col !== undefined) {
                ctx.drawImage(
                    sheet,
                    effect.icon.col * srcSize,
                    effect.icon.row * srcSize,
                    srcSize,
                    srcSize,
                    drawX,
                    drawY,
                    drawSize,
                    drawSize
                );
            } else {
                // Fallback text if no sheet/icon mapped
                const char = effect.name ? effect.name.charAt(0) : '?';
                ui.drawText(char, drawX + (drawSize / 2), drawY + (drawSize / 2) + 2, UITheme.fonts.cardSmall || UITheme.fonts.small || "12px sans-serif", this.getAlphaColor(UITheme.colors.textMain, alpha), "center", "middle");
            }

            // Stack Counter
            if (effect.stacks && effect.stacks > 1) {
                ctx.fillStyle = this.getAlphaColor('rgba(0, 0, 0, 0.9)', alpha);
                ctx.beginPath();
                ctx.arc(drawX + drawSize, drawY + drawSize, 14, 0, Math.PI * 2);
                ctx.fill();
                ui.drawText(effect.stacks.toString(), drawX + drawSize, drawY + drawSize + 2, UITheme.fonts.cardMono || UITheme.fonts.mono, this.getAlphaColor("white", alpha), "center", "middle");
            }

            drawX += (drawSize + spacing);
            // Protect against drawing outside portrait bounds
            if (drawX + drawSize > pX + pSize) return;
        });
        ctx.restore();
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
        const displayColor = (characterChanged && transition.progress < 0.5) ? (prevMember.hp <= 0 ? UITheme.colors.hp : UITheme.colors.textMain) : (member.hp <= 0 ? UITheme.colors.hp : UITheme.colors.textMain);

        ctx.save();
        ctx.globalAlpha = baseAlpha;
        this.drawCenteredWrappedText(ctx, ui, displayName, x + (colWidth / 2), nameY, colWidth - 48, 58, UITheme.fonts.header, displayColor, true);

        ctx.fillStyle = '#050505';
        ctx.fillRect(pX, pY, targetAreaSize, targetAreaSize);

        const fadeBorder = this.getAlphaColor(UITheme.colors.border, baseAlpha);
        const fadeHighlight = this.getAlphaColor(UITheme.colors.borderHighlight, baseAlpha);
        const oldBorder = UITheme.colors.border;
        const oldHighlight = UITheme.colors.borderHighlight;

        UITheme.colors.border = fadeBorder;
        UITheme.colors.borderHighlight = fadeHighlight;

        ui.drawPanel(pX - 4, pY - 4, targetAreaSize + 8, targetAreaSize + 8, "transparent", fadeBorder);

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
            if (isCursed(charData)) drawCursedPortrait(ctx, sheet, 0, 0, nativeRes, nativeRes, imgX, imgY, drawSize, drawSize, alpha * baseAlpha);
            else ctx.drawImage(sheet, 0, 0, nativeRes, nativeRes, imgX, imgY, drawSize, drawSize);
            ctx.imageSmoothingEnabled = true;
            ctx.restore();

            // Render Status Effects directly overlaid onto the portrait
            this.drawStatusEffects(ctx, ui, charData, imgX, imgY, drawSize, alpha * baseAlpha);
        };

        // Helper to draw all three vitals beneath the portrait with smooth interpolation animations
    const drawVitals = (charData, alpha) => {
      if (!charData) return;

      const vitalsY = pY + targetAreaSize + 32;
      const totalW = colWidth * 0.75;
      const labelW = 48;
      const numW = 85;
      const barW = totalW - labelW - numW;
      const vX = x + (colWidth / 2) - (totalW / 2);

      let currentY = vitalsY;
      const rowH = 10;
      const rowSpacing = 29;

      const charKey = charData.name || "active_char";

      // Animate HP, Stamina, and Insight from previous to target values
      const animatedHp = this.getAnimatedValue(`${charKey}_hp`, charData.hp);
      const animatedStamina = this.getAnimatedValue(`${charKey}_stamina`, charData.stamina);
      const animatedInsight = this.getAnimatedValue(`${charKey}_insight`, charData.insight || 0);

      this.drawStatRow(
        ctx, ui, "HP", animatedHp, charData.maxHp,
        vX, currentY, barW, rowH, numW, labelW,
        UITheme.colors.hp, UITheme.colors.hpDim, alpha * baseAlpha
      );
      currentY += rowSpacing;

      this.drawStatRow(
        ctx, ui, "STM", animatedStamina, charData.maxStamina,
        vX, currentY, barW, rowH, numW, labelW,
        UITheme.colors.stm, UITheme.colors.stmDim, alpha * baseAlpha
      );
      currentY += rowSpacing;

      this.drawStatRow(
        ctx, ui, "INS", animatedInsight, charData.maxInsight || 100,
        vX, currentY, barW, rowH, numW, labelW,
        UITheme.colors.ins, UITheme.colors.insDim, alpha * baseAlpha
      );
    };

    if (transActive && prevMember && characterChanged) {
      const p = transition.progress;
      const smoothP = p * p * (3 - 2 * p);

      drawCharSprite(prevMember, 1.0 - smoothP);
      drawCharSprite(member, smoothP);

      drawVitals(p < 0.5 ? prevMember : member, 1.0);
    } else {
      drawCharSprite(member, 1.0);
      drawVitals(member, 1.0);
    }
    }
}
