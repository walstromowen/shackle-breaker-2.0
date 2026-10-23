import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { UI_SFX } from '../../ui/uiSfx.js';
import { drawEmbers } from '../../ui/embers.js';
import { drawStatTooltip } from '../../ui/statTooltip.js';

/* The LOOK preview next to the portrait plays the character's South-facing animation from the overworld sprite sheet.
   The sheet layout is the one MapRenderer uses: frames of CONFIG.CHARACTER_FRAME (w x h) in a row of 8, and rows in three sets of four
   (idle 0-3, walk 4-7, run 8-11), each set in the order South, East, North, West.
   state  which set to play: 'walk', 'idle' or 'run'
   fps    frames per second: 10 plays a walk cycle in 0.8 s, the same pace as walking in the overworld (use about 6 for 'idle')
   scale  whole-number zoom of the frame; 2 matches the portrait (128 -> 256) so the pixels of both stay the same size */
const PREVIEW_ANIM = { state: 'walk', fps: 10, scale: 2 };

export class CharacterCreatorRenderer {
    constructor(config, assetLoader) {
        this.config = config;
        this.loader = assetLoader;
        this.hotspots = [];

        const frame = config.CHARACTER_FRAME || {};
        const ca = config.CHARACTER_ANIM || {}; // optional overrides, read the same way MapRenderer reads them
        const firstRow = { idle: 0, walk: 4, run: 8, ...(ca.firstRow || {}) };
        const south = Math.max(0, (ca.directionOrder || ['DOWN', 'RIGHT', 'UP', 'LEFT']).indexOf('DOWN'));
        this.sprite = {
            frameW: frame.w || config.TILE_SIZE || 32,
            frameH: frame.h || config.TILE_SIZE || 32,
            frames: ca.frames || 8,
            row: (firstRow[PREVIEW_ANIM.state] ?? 0) + south,
            fps: PREVIEW_ANIM.fps,
            scale: PREVIEW_ANIM.scale,
        };
    }

    render(ctx, controllerState) {
        this.hotspots = [];
        if (!controllerState || !controllerState.data || !controllerState.selections) return;

        const ui = new CanvasUI(ctx);
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;
        const { selections, data, currentStep, isEditingName, isEditingSeed, previewStats, hoveredElement } = controllerState;

        ui.clearScreen(CANVAS_WIDTH, CANVAS_HEIGHT);

        // The one lit element: what the mouse is over, or the keyboard cursor (the controller reports a single focus id)
        const focusId = hoveredElement ? hoveredElement.id : null;

        // --- GLOBAL LAYOUT (Scaled 2.4x for 1920x1080) ---
        const p = 48;
        const startY = 48;
        const panelHeight = CANVAS_HEIGHT - startY - 144;   // the bottom-left corner under the panels belongs to the Back button

        const colW = CANVAS_WIDTH * 0.3;
        const midW = CANVAS_WIDTH - (colW * 2) - (p * 4);

        const TITLE_OFFSET_Y = 50;
        const TITLE_Y = startY + TITLE_OFFSET_Y;
        const CONTENT_START_Y = TITLE_Y + 74;

        // ========================================================
        // 1. LEFT COLUMN (Identity & Stats)
        // ========================================================
        ui.drawPanel(p, startY, colW, panelHeight, UITheme.colors.bgScale[0]);

        const leftCenterX = p + colW / 2;
        let curY = CONTENT_START_Y;

        // A. Title & Flourish
        ui.drawStyled('columnLabel', 'Identity', leftCenterX, TITLE_Y);
        ui.drawLineWithGothicFlourish(leftCenterX - 120, TITLE_Y + 29, 240, UITheme.colors.borderHighlight);

        // B. Identity Input (Name only)
        const inputW = colW - 96;
        const inputX = p + 48;
        const inputH = 77;

        // --- NAME INPUT ---
        this.hotspots.push({
            id: "INPUT_NAME", x: inputX, y: curY, w: inputW, h: inputH
        });

        // A box being typed into stays lit even if the mouse wanders off it
        const nameBg = isEditingName ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.4)";
        ui.drawPanel(inputX, curY, inputW, inputH, nameBg);
        ui.drawStateBox(inputX, curY, inputW, inputH, ui.flags("INPUT_NAME", isEditingName ? "INPUT_NAME" : focusId));

        let nameStr = selections.name;
        let nameColor = UITheme.colors.textMain;
        if (isEditingName) {
            if (Math.floor(Date.now() / 500) % 2 === 0) nameStr += "|";
        } else if (!nameStr) {
            nameStr = "Enter Name...";
            nameColor = UITheme.colors.textMuted;
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(inputX, curY, inputW, inputH);
        ctx.clip();
        ui.drawText(nameStr, inputX + (inputW / 2), curY + 50, UITheme.fonts.body, nameColor, "center");
        ctx.restore();

        curY += inputH;
        const identityBottomY = curY;

        // --- C. VISUALS ---
        // The bounding box size for the UI element
        const portraitSize = 256;
        // The sprite box holds exactly one frame of the character sheet (e.g. 64 x 64) at a whole-number zoom, so it is 128 x 128 for 64 px frames
        const { frameW, frameH, frames: spriteFrames, row: spriteRow, fps: spriteFps, scale: spriteScale } = this.sprite;
        const spriteBoxW = frameW * spriteScale;
        const spriteBoxH = frameH * spriteScale;

        const visualGap = 48;
        const totalVisualWidth = portraitSize + visualGap + spriteBoxW;
        const startVisualX = p + (colW - totalVisualWidth) / 2;

        // The portrait and the sprite are centred on one line, and the divider under them is placed from the bottom of the taller of the two, so it can
        // never cross the picture (it used to sit at a fixed distance that was shorter than the portrait)
        const VISUAL_TOP_GAP = 24;
        const visualH = Math.max(portraitSize, spriteBoxH);
        const visualCenterY = identityBottomY + VISUAL_TOP_GAP + (visualH / 2);
        const DIVIDER_Y = identityBottomY + VISUAL_TOP_GAP + visualH + 32;
        const VITALS_START_Y = DIVIDER_Y + 48;

        const portraitY = visualCenterY - (portraitSize / 2);
        const spriteY = visualCenterY - (spriteBoxH / 2);

        const appIdx = selections.appearanceIdx || 0;
        const appData = data.APPEARANCES ? data.APPEARANCES[appIdx] : null;

        if (appData) {
            ctx.save();
            const masterSheet = this.loader.get(appData.spritePortrait);
            const overworldSheet = this.loader.get(appData.spriteOverworld);
            const spriteX = startVisualX + portraitSize + visualGap;

            ui.drawRect(startVisualX, portraitY, portraitSize, portraitSize, "rgba(0,0,0,0.6)", true);
            ui.drawRect(spriteX, spriteY, spriteBoxW, spriteBoxH, "rgba(0,0,0,0.6)", true);

            if (masterSheet) {
                const srcW = 128;
                const srcH = 128;
                const srcRatio = srcW / srcH;
                let drawW = portraitSize;
                let drawH = portraitSize;
                if (srcRatio > 1) {
                    drawH = portraitSize / srcRatio;
                } else if (srcRatio < 1) {
                    drawW = portraitSize * srcRatio;
                }
                // Center the image inside the bounding box
                const drawX = startVisualX + (portraitSize - drawW) / 2;
                const drawY = portraitY + (portraitSize - drawH) / 2;

                ctx.imageSmoothingEnabled = false; // Keeps pixel art crisp when scaled
                ctx.drawImage(masterSheet, 0, 0, srcW, srcH, drawX, drawY, drawW, drawH);
            }

            if (overworldSheet) {
                // South-facing animation: the frame follows the clock, and the whole frame is drawn into the box
                const spriteFrame = Math.floor((Date.now() / 1000) * spriteFps) % spriteFrames;
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(overworldSheet, spriteFrame * frameW, spriteRow * frameH, frameW, frameH, spriteX, spriteY, spriteBoxW, spriteBoxH);
            }

            ui.drawRect(startVisualX, portraitY, portraitSize, portraitSize, UITheme.colors.border, false);
            ui.drawRect(spriteX, spriteY, spriteBoxW, spriteBoxH, UITheme.colors.border, false);

            ctx.restore();
        }

        // --- D. STATS TABLE ---
        const attrRects = {}; // each attribute's row, so hovering it can say what it does (drawn last, below)
        curY = VITALS_START_Y;
        ui.drawLineWithGothicFlourish(leftCenterX - 192, DIVIDER_Y, 384, UITheme.colors.borderHighlight);

        if (previewStats) {
            const innerMargin = 48;
            const fullW = colW - (innerMargin * 2);
            const thirdW = fullW / 3;
            const vX = p + innerMargin;

            const drawStatBlock = (label, valueOrObj, slotIndex, colorLabel) => {
                if (valueOrObj === undefined || valueOrObj === null) return;
                let total = typeof valueOrObj === 'object' ? (valueOrObj.total || 0) : valueOrObj;
                let bonus = typeof valueOrObj === 'object' ? (valueOrObj.bonus || 0) : 0;

                const slotCenterX = vX + (slotIndex * thirdW) + (thirdW / 2);
                ui.drawStyled('label', label, slotCenterX - 14, curY, { color: colorLabel, align: 'right' });
                ui.drawText(`${total}`, slotCenterX + 14, curY, UITheme.fonts.bold, UITheme.colors.textMain, "left");

                if (bonus > 0) {
                    ui.drawText(`(+${bonus})`, slotCenterX + 14, curY + 29, UITheme.fonts.small, UITheme.colors.success, "left");
                }
            };

            drawStatBlock("HP", previewStats.maxHp || previewStats.hp, 0, UITheme.colors.hp);
            drawStatBlock("STM", previewStats.maxStamina || previewStats.stamina, 1, UITheme.colors.stm);
            drawStatBlock("INS", previewStats.maxInsight || previewStats.insight, 2, UITheme.colors.ins);

            curY += 78;

            // E. Attributes
            const attrSource = previewStats.attributes || previewStats;
            const attrs = [
                { label: "Vigor", val: attrSource.vigor },
                { label: "Strength", val: attrSource.strength },
                { label: "Dexterity", val: attrSource.dexterity },
                { label: "Intelligence", val: attrSource.intelligence },
                { label: "Attunement", val: attrSource.attunement }
            ];

            const ROW_HEIGHT = 52;

            attrs.forEach((attr, idx) => {
                const rowY = curY + (idx * ROW_HEIGHT);
                const leftX = p + 72;
                const rightX = p + colW - 72;
                attrRects[attr.label.toLowerCase()] = { x: p + 24, y: rowY - 34, w: colW - 48, h: ROW_HEIGHT };

                if (idx % 2 === 0) {
                    ui.drawRect(p + 24, rowY - 34, colW - 48, ROW_HEIGHT, "rgba(255, 255, 255, 0.02)", true);
                }

                ui.drawStyled('label', attr.label, leftX, rowY);
                ui.drawStyled('value', attr.val || 0, rightX, rowY, { align: 'right' });
            });
        }

        // ========================================================
        // 2. CENTER COLUMN: MENU
        // ========================================================
        const menuStartX = p + colW + p;
        let menuY = CONTENT_START_Y;
        const centerColX = menuStartX + (midW / 2);

        ui.drawPanel(menuStartX, startY, midW, panelHeight, UITheme.colors.bgScale[1]);
        ui.drawStyled('columnLabel', 'Customize', centerColX, TITLE_Y);
        ui.drawLineWithGothicFlourish(centerColX - 144, TITLE_Y + 29, 288, UITheme.colors.borderHighlight);

        const labels = {
            background: "BACKGROUND",
            origin: "ORIGIN",
            appearance: "LOOK",
            keepsake: "KEEPSAKE",
            companion: "COMPANION",
            trait: "TRAIT",
            difficulty: "DIFFICULTY",
            seed: "WORLD SEED"
        };

        const MENU_ITEM_HEIGHT = 68;
        const ROW_GAP = 4;
        const menuSteps = ['background', 'origin', 'appearance', 'keepsake', 'companion', 'trait', 'difficulty', 'seed', 'start'];

        menuSteps.forEach((key) => {
            const rowId = key === 'seed' ? "INPUT_SEED" : `ROW_${key}`;
            const prevId = `BTN_PREV_${key}`;
            const nextId = `BTN_NEXT_${key}`;
            // The row is lit when it, or one of its arrows, is the focus
            const rowFocus = (focusId === prevId || focusId === nextId) ? rowId : focusId;
            const rowFlags = ui.flags(rowId, rowFocus);

            if (key === 'start') {
                const btnId = "BTN_START";
                const btnY = menuY + 24;

                this.hotspots.push({
                    id: btnId, x: menuStartX + 96, y: btnY, w: midW - 192, h: MENU_ITEM_HEIGHT + 20
                });

                ui.drawButton(menuStartX + 96, btnY, midW - 192, MENU_ITEM_HEIGHT + 20, "Start", ui.flags(btnId, focusId), { font: UITheme.fonts.medium });
                return;
            }

            let currentItemHeight = MENU_ITEM_HEIGHT;
            let seedBoxY = 0;
            const seedBoxH = 77; // Exactly match the identity name input height

            if (key === 'seed') {
                seedBoxY = menuY + 30; // Push box down to leave room for the label
                currentItemHeight = 30 + seedBoxH; // Increase total row height allocation

                this.hotspots.push({
                    id: rowId, x: menuStartX + 24, y: seedBoxY, w: midW - 48, h: seedBoxH
                });

                const seedBg = isEditingSeed ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.4)";
                ui.drawPanel(menuStartX + 24, seedBoxY, midW - 48, seedBoxH, seedBg);

                // A box being typed into stays lit even if the mouse wanders off it. Rows below it are close by: brackets inside.
                ui.drawStateBox(menuStartX + 24, seedBoxY, midW - 48, seedBoxH,
                    ui.flags(rowId, isEditingSeed ? rowId : focusId), { inset: true });

                // Draw label above the actual input box
                ui.drawStyled('cardLabel', labels[key], centerColX, menuY + 22, { align: 'center' });
            } else {
                this.hotspots.push({
                    id: rowId, x: menuStartX + 24, y: menuY, w: midW - 48, h: MENU_ITEM_HEIGHT
                });

                // Stacked rows: the shared state look, brackets inside so they stay clear of the neighbours
                ui.drawStateBox(menuStartX + 24, menuY, midW - 48, MENU_ITEM_HEIGHT, rowFlags, { inset: true });

                // Draw normal label
                const labelY = menuY + 22;
                ui.drawStyled('cardLabel', labels[key], centerColX, labelY, { align: 'center' });
            }

            let valStr = "";
            let valColor = ui.stateTextColor(rowFlags, UITheme.colors.textMain);

            if (key === 'background') valStr = data.BACKGROUNDS?.[selections.backgroundIdx]?.label;
            else if (key === 'origin') valStr = data.ORIGINS?.[selections.originIdx]?.label;
            else if (key === 'appearance') valStr = data.APPEARANCES?.[selections.appearanceIdx]?.label;
            else if (key === 'keepsake') valStr = data.KEEPSAKES?.[selections.keepsakeIdx]?.label;
            else if (key === 'companion') valStr = data.COMPANIONS?.[selections.companionIdx]?.label;
            else if (key === 'trait') valStr = data.TRAITS?.[selections.traitIdx]?.label;
            else if (key === 'difficulty') {
                const d = data.DIFFICULTIES?.[selections.difficultyIdx];
                valStr = d?.label;
            } else if (key === 'seed') {
                valStr = selections.seed;
                if (isEditingSeed) {
                    if (Math.floor(Date.now() / 500) % 2 === 0) valStr += "|";
                } else if (!valStr) {
                    valStr = "World Seed...";
                    valColor = UITheme.colors.textMuted;
                }
            }

            if (valStr) {
                if (key === 'seed') {
                    // Match relative text alignment of the Name input (boxY + 50)
                    const valY = seedBoxY + 50; 
                    const textMaxWidth = midW - 96;
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(menuStartX + 24, seedBoxY, midW - 48, seedBoxH);
                    ctx.clip();
                    ui.drawText(valStr, centerColX, valY, UITheme.fonts.body, valColor, "center", "alphabetic", textMaxWidth);
                    ctx.restore();
                } else {
                    const valY = menuY + 56;
                    const textMaxWidth = midW - 336;
                    const leftArrowX = menuStartX + 72;
                    const rightArrowX = menuStartX + midW - 72;
                    const arrowSize = 12;

                    const arrowColorPrev = ui.stateTextColor(ui.flags(prevId, focusId), UITheme.colors.textMuted);
                    const arrowColorNext = ui.stateTextColor(ui.flags(nextId, focusId), UITheme.colors.textMuted);

                    ui.drawArrow(leftArrowX, valY - 10, arrowSize, 'left', arrowColorPrev);
                    ui.drawArrow(rightArrowX, valY - 10, arrowSize, 'right', arrowColorNext);

                    this.hotspots.push({ id: prevId, x: leftArrowX - 48, y: valY - 48, w: 96, h: 96, zIndex: 10, clickSfx: UI_SFX.step });
                    this.hotspots.push({ id: nextId, x: rightArrowX - 48, y: valY - 48, w: 96, h: 96, zIndex: 10, clickSfx: UI_SFX.step });

                    ui.drawText(valStr, centerColX, valY, UITheme.fonts.body, valColor, "center", "alphabetic", textMaxWidth);
                }
            }

            menuY += currentItemHeight + ROW_GAP;
        });

        // ========================================================
        // 3. RIGHT COLUMN (Details)
        // ========================================================
        const rightColX = CANVAS_WIDTH - colW - p;
        const rightCenterX = rightColX + colW / 2;

        ui.drawPanel(rightColX, startY, colW, panelHeight, UITheme.colors.bgScale[0]);
        ui.drawStyled('columnLabel', 'Details', rightCenterX, TITLE_Y);
        ui.drawLineWithGothicFlourish(rightCenterX - 96, TITLE_Y + 29, 192, UITheme.colors.borderHighlight);

        const desc = this.getDescription(controllerState);
        let scrollBounds = null;

        if (desc) {
            const textX = rightColX + 48;
            const textY = CONTENT_START_Y;
            const textMaxWidth = colW - 96;
            const lineHeight = 48;
            const textViewportHeight = panelHeight - (CONTENT_START_Y - startY) - 48;

            const paragraphs = desc.split('\n');
            let totalLines = 0;
            paragraphs.forEach(p => {
                totalLines += ui.getWrappedLines(p, textMaxWidth, UITheme.text.description.font).length;
            });

            const totalTextHeight = totalLines * lineHeight;
            const maxScroll = Math.max(0, totalTextHeight - textViewportHeight);

            const previewOffset = controllerState.scrollOffsets?.preview || 0;
            scrollBounds = {
                preview: {
                    bounds: { x: textX, y: textY, w: textMaxWidth, h: textViewportHeight },
                    maxScroll: maxScroll,
                    viewportH: textViewportHeight
                }
            };

            ui.startClip(textX, textY, textMaxWidth, textViewportHeight);
            ui.drawStyledWrapped('description', desc, textX, textY - previewOffset, textMaxWidth, lineHeight);
            ui.endClip();

            if (maxScroll > 0) {
                const trackW = UITheme.scrollbar.width;
                const trackX = rightColX + colW - 16 - trackW;

                const thumb = ui.drawScrollbar(trackX, textY, trackW, textViewportHeight, previewOffset, maxScroll, textViewportHeight,
                    ui.flags('SCROLL_THUMB_PREVIEW', focusId));

                if (thumb) {
                    this.hotspots.push({
                        id: 'SCROLL_THUMB_PREVIEW',
                        x: thumb.x - 10, y: thumb.y, w: thumb.w + 20, h: thumb.h, zIndex: 10
                    });
                }
            }
        }

        // Embers rise over the whole screen, panels included (drawn last, so the opaque panels do not hide them)
        drawEmbers(ctx, Date.now() / 1000, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0.8, undefined, 80, 1.3);

        // What the attribute under the mouse does (the keyboard has no cursor on these rows, so a parked pointer is ignored then)
        const mouse = controllerState.mouse;
        if (mouse && controllerState.inputMode !== 'keyboard') {
            const hit = Object.keys(attrRects).find(k => {
                const r = attrRects[k];
                return mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h;
            });
            // The Details panel is empty-ish and the one thing nobody is aiming at, so the card goes there instead of over the menu
            if (hit) drawStatTooltip(ui, hit, attrRects[hit], { at: { x: CANVAS_WIDTH - colW - p + 24, y: CONTENT_START_Y }, width: colW - 48 });
        }

        // ========================================================
        // 4. FINALIZE & SEND DATA TO CONTROLLER
        // ========================================================
        if (controllerState.onLayoutUpdate) {
            controllerState.onLayoutUpdate(this.hotspots, scrollBounds);
        }
    }

    getDescription({ currentStep, selections, data, isEditingName, isEditingSeed }) {
        if (!data) return "";

        if (currentStep === 'name') return isEditingName ? "Type your name using the keyboard.\nPress Enter to confirm." : "Select to edit your character's name.";
        if (currentStep === 'seed') return isEditingSeed ? "Type a custom world seed.\nPress Enter to confirm." : "Leave blank to spawn in a completely random world, or set a seed to share layouts with friends.";
        if (currentStep === 'start') return "Finalize your choices and venture forth into the unknown.";

        if (currentStep === 'background') return data.BACKGROUNDS?.[selections.backgroundIdx]?.desc;
        if (currentStep === 'origin') return data.ORIGINS?.[selections.originIdx]?.label ? data.ORIGINS[selections.originIdx].desc : "";
        if (currentStep === 'appearance') return "Choose the physical form you shall take in this realm.";
        if (currentStep === 'keepsake') return data.KEEPSAKES?.[selections.keepsakeIdx]?.desc;
        if (currentStep === 'companion') return data.COMPANIONS?.[selections.companionIdx]?.desc;
        if (currentStep === 'trait') return data.TRAITS?.[selections.traitIdx]?.desc;
        if (currentStep === 'difficulty') return data.DIFFICULTIES?.[selections.difficultyIdx]?.desc;

        return "";
    }
}