import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class CharacterCreatorRenderer {
    constructor(config, assetLoader) {
        this.config = config;
        this.loader = assetLoader; 
        this.hotspots = []; 
    }

    render(ctx, controllerState) {
        this.hotspots = [];
        if (!controllerState || !controllerState.data || !controllerState.selections) return;

        const ui = new CanvasUI(ctx);
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;
        const { selections, data, currentStep, isEditingName, previewStats, hoveredElement } = controllerState;

        ui.clearScreen(CANVAS_WIDTH, CANVAS_HEIGHT);

        // --- GLOBAL LAYOUT (Scaled 2.4x for 1920x1080) ---
        const p = 48; 
        const startY = 48; 
        const panelHeight = CANVAS_HEIGHT - (startY * 2); 
        
        const colW = CANVAS_WIDTH * 0.3; 
        const midW = CANVAS_WIDTH - (colW * 2) - (p * 4);
        
        const TITLE_OFFSET_Y = 60; 
        const TITLE_Y = startY + TITLE_OFFSET_Y;
        const CONTENT_START_Y = TITLE_Y + 84; 
        
        // ========================================================
        // 1. LEFT COLUMN (Identity & Stats)
        // ========================================================
        ui.drawPanel(p, startY, colW, panelHeight, UITheme.colors.bgScale[0]);
        
        const leftCenterX = p + colW / 2;
        let curY = CONTENT_START_Y;

        // A. Title & Flourish
        ui.drawText("IDENTITY", leftCenterX, TITLE_Y, UITheme.fonts.body, UITheme.colors.textMuted, "center");
        ui.drawLineWithGothicFlourish(leftCenterX - 120, TITLE_Y + 29, 240, UITheme.colors.borderHighlight);

        // B. Name Input
        const nameInputW = colW - 96;
        const nameInputX = p + 48;
        const nameInputH = 77;
        const inputId = "INPUT_NAME";

        this.hotspots.push({ id: inputId, x: nameInputX, y: curY, w: nameInputW, h: nameInputH });

        const isNameSelected = (currentStep === 'name');
        const nameBg = isEditingName ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.4)";
        
        ui.drawPanel(nameInputX, curY, nameInputW, nameInputH, nameBg);

        if (isNameSelected || isEditingName) {
            ui.drawSelectionBrackets(nameInputX, curY, nameInputW, nameInputH, 10);
        }

        let valStr = selections.name;
        let nameColor = UITheme.colors.textMain;

        if (isEditingName) {
            if (Math.floor(Date.now() / 500) % 2 === 0) valStr += "|"; 
        } else if (!valStr) {
            valStr = "Enter Name..."; 
            nameColor = UITheme.colors.textMuted;
        }

        ctx.save(); 
        ctx.beginPath(); ctx.rect(nameInputX, curY, nameInputW, nameInputH); ctx.clip(); 
        ui.drawText(valStr, nameInputX + (nameInputW/2), curY + 50, UITheme.fonts.body, nameColor, "center");
        ctx.restore();

        const nameBottomY = curY + nameInputH;

        // --- C. VISUALS ---
        const VITALS_OFFSET = 432; 
        const VITALS_START_Y = nameBottomY + VITALS_OFFSET; 

        const portraitSize = 307;
        const spriteDisplaySize = 77;
        const visualGap = 48;
        
        const totalVisualWidth = portraitSize + visualGap + spriteDisplaySize;
        const startVisualX = p + (colW - totalVisualWidth) / 2;

        const portraitY = nameBottomY + (VITALS_OFFSET / 2) - (portraitSize / 2);
        const spriteY = nameBottomY + (VITALS_OFFSET / 2) - (spriteDisplaySize / 2);

        const appIdx = selections.appearanceIdx || 0;
        const appData = data.APPEARANCES ? data.APPEARANCES[appIdx] : null;

        if (appData) {
            ctx.save();
            
            const masterSheet = this.loader.get(appData.spritePortrait);
            const overworldSheet = this.loader.get(appData.spriteOverworld);
            const spriteX = startVisualX + portraitSize + visualGap;
            
            ui.drawRect(startVisualX, portraitY, portraitSize, portraitSize, "rgba(0,0,0,0.6)", true);
            ui.drawRect(spriteX, spriteY, spriteDisplaySize, spriteDisplaySize, "rgba(0,0,0,0.6)", true);

            if (masterSheet) {
                ctx.drawImage(masterSheet, 0, 0, 128, 128, startVisualX, portraitY, portraitSize, portraitSize);
            }
            if (overworldSheet) {
                ctx.imageSmoothingEnabled = false; 
                ctx.drawImage(overworldSheet, 0, 0, 32, 32, spriteX, spriteY, spriteDisplaySize, spriteDisplaySize);
            }

            ui.drawRect(startVisualX, portraitY, portraitSize, portraitSize, UITheme.colors.border, false);
            ui.drawRect(spriteX, spriteY, spriteDisplaySize, spriteDisplaySize, UITheme.colors.border, false);

            ctx.restore();
        }
        
        // --- D. STATS TABLE ---
        curY = VITALS_START_Y;

        ui.drawLineWithGothicFlourish(leftCenterX - 192, curY - 48, 384, UITheme.colors.borderHighlight);

        if (previewStats) {
            const innerMargin = 48;
            const fullW = colW - (innerMargin * 2);
            const thirdW = fullW / 3;
            const vX = p + innerMargin;
            const RES_FONT = UITheme.fonts.small; 

            const drawStatBlock = (label, valueOrObj, slotIndex, colorLabel) => {
                if (valueOrObj === undefined || valueOrObj === null) return;
                
                let total = typeof valueOrObj === 'object' ? (valueOrObj.total || 0) : valueOrObj;
                let bonus = typeof valueOrObj === 'object' ? (valueOrObj.bonus || 0) : 0;
                
                const slotCenterX = vX + (slotIndex * thirdW) + (thirdW / 2);
                
                ui.drawText(label, slotCenterX - 14, curY, RES_FONT, colorLabel, "right");
                ui.drawText(`${total}`, slotCenterX + 14, curY, UITheme.fonts.bold, UITheme.colors.textMain, "left");
                
                if (bonus > 0) {
                    ui.drawText(`(+${bonus})`, slotCenterX + 14, curY + 29, UITheme.fonts.small, UITheme.colors.success, "left");
                }
            };

            drawStatBlock("HP", previewStats.maxHp || previewStats.hp, 0, UITheme.colors.hp);
            drawStatBlock("STM", previewStats.maxStamina || previewStats.stamina, 1, UITheme.colors.stm);
            drawStatBlock("INS", previewStats.maxInsight || previewStats.insight, 2, UITheme.colors.ins);

            curY += 84; 

            // E. Attributes
            const attrSource = previewStats.attributes || previewStats;
            const attrs = [
                { label: "Vigor", val: attrSource.vigor },
                { label: "Strength", val: attrSource.strength },
                { label: "Dexterity", val: attrSource.dexterity },
                { label: "Intelligence", val: attrSource.intelligence },
                { label: "Attunement", val: attrSource.attunement }
            ];

            const ROW_HEIGHT = 58; 
            const ATTR_FONT = UITheme.fonts.small; 

            attrs.forEach((attr, idx) => {
                const rowY = curY + (idx * ROW_HEIGHT);
                const leftX = p + 72;    
                const rightX = p + colW - 72;

                if (idx % 2 === 0) {
                    ui.drawRect(p + 24, rowY - 34, colW - 48, ROW_HEIGHT, "rgba(255, 255, 255, 0.02)", true);
                }

                ui.drawText(attr.label, leftX, rowY, ATTR_FONT, UITheme.colors.textMuted, "left");
                ui.drawText(attr.val || 0, rightX, rowY, ATTR_FONT, UITheme.colors.textMain, "right");
            });
        }

        // ========================================================
        // 2. CENTER COLUMN: MENU
        // ========================================================
        const menuStartX = p + colW + p;
        let menuY = CONTENT_START_Y;
        const centerColX = menuStartX + (midW / 2);

        ui.drawPanel(menuStartX, startY, midW, panelHeight, UITheme.colors.bgScale[1]);
        
        ui.drawText("CUSTOMIZE", centerColX, TITLE_Y, UITheme.fonts.body, UITheme.colors.textMuted, "center");
        ui.drawLineWithGothicFlourish(centerColX - 144, TITLE_Y + 29, 288, UITheme.colors.borderHighlight);

        const labels = {
            background: "BACKGROUND", origin: "ORIGIN", appearance: "LOOK",
            keepsake: "KEEPSAKE", companion: "COMPANION", trait: "TRAIT", difficulty: "DIFFICULTY"
        };
        
        const MENU_ITEM_HEIGHT = 84; 
        const ROW_GAP = 5;          
        const menuSteps = ['background', 'origin', 'appearance', 'keepsake', 'companion', 'trait', 'difficulty', 'start'];

        menuSteps.forEach((key) => {
            const isSelected = (key === currentStep);
            const rowId = `ROW_${key}`;
            const isHovered = (hoveredElement && hoveredElement.id === rowId);

            // --- START BUTTON REFACTOR ---
            if (key === 'start') {
                const btnId = "BTN_START";
                const btnY = menuY + 36; 
                const isBtnHovered = (hoveredElement && hoveredElement.id === btnId);

                this.hotspots.push({ id: btnId, x: menuStartX + 96, y: btnY, w: midW - 192, h: MENU_ITEM_HEIGHT + 24 });

                // Render the unified interactive component
                ui.drawInteractiveRow(menuStartX + 96, btnY, midW - 192, MENU_ITEM_HEIGHT + 24, "START", UITheme.fonts.body, "center", isSelected, isBtnHovered);
                return; 
            }

            // --- STANDARD ROWS REFACTOR ---
            this.hotspots.push({ id: rowId, x: menuStartX + 24, y: menuY, w: midW - 48, h: MENU_ITEM_HEIGHT });

            // 1. Draw the interactive background and focus brackets (Passing empty string so it doesn't draw text yet)
            ui.drawInteractiveRow(menuStartX + 24, menuY, midW - 48, MENU_ITEM_HEIGHT, "", UITheme.fonts.body, "center", isSelected, isHovered);

            // 2. Draw custom interior labels for this specific menu
            const labelY = menuY + 24;
            ui.drawText(labels[key], centerColX, labelY, UITheme.fonts.cardSmall, UITheme.colors.textMuted, "center");

            let valStr = "";
            let valColor = UITheme.colors.textMain;

            if (key === 'background') valStr = data.BACKGROUNDS?.[selections.backgroundIdx]?.label;
            else if (key === 'origin') valStr = data.ORIGINS?.[selections.originIdx]?.label;
            else if (key === 'appearance') valStr = data.APPEARANCES?.[selections.appearanceIdx]?.label;
            else if (key === 'keepsake') valStr = data.KEEPSAKES?.[selections.keepsakeIdx]?.label;
            else if (key === 'companion') valStr = data.COMPANIONS?.[selections.companionIdx]?.label;
            else if (key === 'trait') valStr = data.TRAITS?.[selections.traitIdx]?.label; 
            else if (key === 'difficulty') {
                const d = data.DIFFICULTIES?.[selections.difficultyIdx];
                valStr = d?.label;
            }

            if (valStr) {
                const valY = menuY + 62; 

                const prevId = `BTN_PREV_${key}`;
                const nextId = `BTN_NEXT_${key}`;
                
                const isPrevHover = hoveredElement && hoveredElement.id === prevId;
                const isNextHover = hoveredElement && hoveredElement.id === nextId;

                const leftArrowX = menuStartX + 72; 
                const rightArrowX = menuStartX + midW - 72;
                const textMaxWidth = midW - 336; 
                const arrowSize = 12; 

                const arrowColorPrev = isPrevHover ? UITheme.colors.borderHighlight : UITheme.colors.textMuted;
                const arrowColorNext = isNextHover ? UITheme.colors.borderHighlight : UITheme.colors.textMuted;

                ui.drawArrow(leftArrowX, valY - 10, arrowSize, 'left', arrowColorPrev);
                ui.drawArrow(rightArrowX, valY - 10, arrowSize, 'right', arrowColorNext);

                this.hotspots.push({ id: prevId, x: leftArrowX - 48, y: valY - 48, w: 96, h: 96, zIndex: 10 });
                this.hotspots.push({ id: nextId, x: rightArrowX - 48, y: valY - 48, w: 96, h: 96, zIndex: 10 });

                ui.drawText(valStr, centerColX, valY, UITheme.fonts.body, valColor, "center", "alphabetic", textMaxWidth);
            }
            
            menuY += MENU_ITEM_HEIGHT + ROW_GAP; 
        });

        // ========================================================
        // 3. RIGHT COLUMN (Details)
        // ========================================================
        const rightColX = CANVAS_WIDTH - colW - p;
        const rightCenterX = rightColX + colW / 2;

        ui.drawPanel(rightColX, startY, colW, panelHeight, UITheme.colors.bgScale[0]);
        
        ui.drawText("DETAILS", rightCenterX, TITLE_Y, UITheme.fonts.body, UITheme.colors.textMuted, "center");
        ui.drawLineWithGothicFlourish(rightCenterX - 96, TITLE_Y + 29, 192, UITheme.colors.borderHighlight);

        const desc = this.getDescription(controllerState);
        let scrollBounds = null; 

        if (desc) {
            const textX = rightColX + 48;
            const textY = CONTENT_START_Y;
            const textMaxWidth = colW - 96;
            const lineHeight = 67;
            const textViewportHeight = panelHeight - (CONTENT_START_Y - startY) - 48;

            const paragraphs = desc.split('\n');
            let totalLines = 0;
            paragraphs.forEach(p => {
                totalLines += ui.getWrappedLines(p, textMaxWidth, UITheme.fonts.body).length;
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
            ui.drawWrappedText(desc, textX, textY - previewOffset, textMaxWidth, lineHeight, UITheme.fonts.body, UITheme.colors.textMain);
            ui.endClip();

            if (maxScroll > 0) {
                const trackW = 8;
                const trackX = rightColX + colW - 24; 
                const trackH = textViewportHeight;
                
                const thumbH = Math.max(40, (textViewportHeight / totalTextHeight) * trackH);
                const scrollRatio = previewOffset / maxScroll;
                const thumbY = textY + (scrollRatio * (trackH - thumbH));

                ui.drawRect(trackX, textY, trackW, trackH, UITheme.colors.scrollTrack);
                ui.drawRect(trackX, thumbY, trackW, thumbH, UITheme.colors.scrollThumb);

                this.hotspots.push({ 
                    id: 'SCROLL_THUMB_PREVIEW', 
                    x: trackX - 10, 
                    y: thumbY, 
                    w: trackW + 20, 
                    h: thumbH,
                    zIndex: 10
                });
            }
        }

        // ========================================================
        // 4. FINALIZE & SEND DATA TO CONTROLLER
        // ========================================================
        if (controllerState.onLayoutUpdate) {
            controllerState.onLayoutUpdate(this.hotspots, scrollBounds);
        }
    }

    getDescription({ currentStep, selections, data, isEditingName }) {
        if (!data) return "";
        
        if (currentStep === 'name') return isEditingName ? "Type your name using the keyboard.\nPress Enter to confirm." : "Select to edit your character's name.";
        if (currentStep === 'start') return "Finalize your choices and venture forth into the unknown.";
        
        if (currentStep === 'background') return data.BACKGROUNDS?.[selections.backgroundIdx]?.desc;
        if (currentStep === 'origin') return data.ORIGINS?.[selections.originIdx]?.desc;
        if (currentStep === 'appearance') return "Choose the physical form you shall take in this realm.";
        if (currentStep === 'keepsake') return data.KEEPSAKES?.[selections.keepsakeIdx]?.desc;
        if (currentStep === 'companion') return data.COMPANIONS?.[selections.companionIdx]?.desc;
        if (currentStep === 'trait') return data.TRAITS?.[selections.traitIdx]?.desc; 
        if (currentStep === 'difficulty') return data.DIFFICULTIES?.[selections.difficultyIdx]?.desc;
        return "";
    }
}