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

        // --- 1. GLOBAL LAYOUT: 20px PADDING ---
        const p = 20; 
        const startY = 20; 
        const panelHeight = CANVAS_HEIGHT - (startY * 2); 
        
        const colW = CANVAS_WIDTH * 0.3; 
        const midW = CANVAS_WIDTH - (colW * 2) - (p * 4);
        
        const TITLE_OFFSET_Y = 25; 
        const TITLE_Y = startY + TITLE_OFFSET_Y;
        const CONTENT_START_Y = TITLE_Y + 25; 
        
        // ========================================================
        // 1. LEFT COLUMN (Identity & Stats)
        // Background: Darkest (bgScale[0])
        // ========================================================
        ui.drawPanel(p, startY, colW, panelHeight, UITheme.colors.bgScale[0]);
        
        const leftCenterX = p + colW / 2;
        let curY = CONTENT_START_Y;

        // A. Title
        ui.drawText("IDENTITY", leftCenterX, TITLE_Y, UITheme.fonts.body, UITheme.colors.textMuted, "center");

        // B. Name Input
        const nameInputW = colW - 40;
        const nameInputX = p + 20;
        const nameInputH = 32;
        const inputId = "INPUT_NAME";

        this.hotspots.push({ id: inputId, x: nameInputX, y: curY, w: nameInputW, h: nameInputH });

        const isNameHovered = hoveredElement && hoveredElement.id === inputId;
        const isNameSelected = (currentStep === 'name');
        
        ctx.fillStyle = isNameSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)';
        if (isEditingName) ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; 
        ctx.fillRect(nameInputX, curY, nameInputW, nameInputH);
        
        ctx.strokeStyle = (isNameSelected || isEditingName || isNameHovered) ? UITheme.colors.textMain : UITheme.colors.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(nameInputX, curY, nameInputW, nameInputH);

        let valStr = selections.name;
        let nameColor = UITheme.colors.textMain;

        if (isEditingName) {
            nameColor = UITheme.colors.textMain; 
            if (Math.floor(Date.now() / 500) % 2 === 0) valStr += "|"; 
        } else if (!valStr) {
            valStr = "Enter Name..."; 
            nameColor = UITheme.colors.textMuted;
        }

        ctx.save(); 
        ctx.beginPath(); ctx.rect(nameInputX, curY, nameInputW, nameInputH); ctx.clip(); 
        ui.drawText(valStr, nameInputX + (nameInputW/2), curY + 22, UITheme.fonts.header, nameColor, "center");
        ctx.restore();

        const nameBottomY = curY + nameInputH;

        // --- C. VISUALS (Balanced Spacing) ---
        const VITALS_OFFSET = 180; 
        const VITALS_START_Y = nameBottomY + VITALS_OFFSET; 

        // Dimensions
        const portraitSize = 128;
        const spriteDisplaySize = 64; 
        const visualGap = 20;
        
        const totalVisualWidth = portraitSize + visualGap + spriteDisplaySize;
        const startVisualX = p + (colW - totalVisualWidth) / 2;

        // Vertical centering
        const portraitY = nameBottomY + (VITALS_OFFSET / 2) - (portraitSize / 2);
        const spriteY = nameBottomY + (VITALS_OFFSET / 2) - (spriteDisplaySize / 2);

        const appIdx = selections.appearanceIdx || 0;
        const appData = data.APPEARANCES ? data.APPEARANCES[appIdx] : null;

        if (appData) {
            ctx.save();
            
          
   
            const masterSheet = this.loader.get(appData.spritePortrait);
            
            if (masterSheet) {
                // SRC: x=0, y=0, w=128, h=128 (Top-Left Face)
                // DST: startVisualX, portraitY, size, size
                ctx.drawImage(
                    masterSheet, 
                    0, 0, 128, 128, 
                    startVisualX, portraitY, portraitSize, portraitSize
                );
                
                ctx.strokeStyle = UITheme.colors.border;
                ctx.lineWidth = 2;
                ctx.strokeRect(startVisualX, portraitY, portraitSize, portraitSize);
            } else {
                // Fallback placeholder
                ctx.fillStyle = "rgba(0,0,0,0.2)";
                ctx.fillRect(startVisualX, portraitY, portraitSize, portraitSize);
                ctx.strokeStyle = UITheme.colors.border;
                ctx.strokeRect(startVisualX, portraitY, portraitSize, portraitSize);
            }

            // 2. Draw Sprite (FROM OVERWORLD SHEET)
            const spriteX = startVisualX + portraitSize + visualGap;
            const overworldSheet = this.loader.get(appData.spriteOverworld);
            
            // Background box for sprite
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fillRect(spriteX, spriteY, spriteDisplaySize, spriteDisplaySize);
            
            if (overworldSheet) {
                ctx.imageSmoothingEnabled = false; 
                // SRC: x=0, y=0, w=32, h=32 (Frame 1)
                // DST: Scaled up to 64x64
                ctx.drawImage(
                    overworldSheet, 
                    0, 0, 32, 32, 
                    spriteX, spriteY, spriteDisplaySize, spriteDisplaySize
                );
            }
            
            ctx.strokeStyle = UITheme.colors.border;
            ctx.lineWidth = 1;
            ctx.strokeRect(spriteX, spriteY, spriteDisplaySize, spriteDisplaySize);

            ctx.restore();
        }
        
        // --- D. STATS TABLE ---
        curY = VITALS_START_Y;

        if (previewStats) {
            const innerMargin = 20;
            const fullW = colW - (innerMargin * 2);
            const thirdW = fullW / 3;
            const vX = p + innerMargin;
            const RES_FONT = UITheme.fonts.small; 

            const drawStatBlock = (label, valueOrObj, slotIndex, colorLabel) => {
                if (valueOrObj === undefined || valueOrObj === null) return;
                
                let total = typeof valueOrObj === 'object' ? (valueOrObj.total || 0) : valueOrObj;
                let bonus = typeof valueOrObj === 'object' ? (valueOrObj.bonus || 0) : 0;
                
                const slotCenterX = vX + (slotIndex * thirdW) + (thirdW / 2);
                
                // 1. Label
                ui.drawText(label, slotCenterX - 6, curY, RES_FONT, colorLabel, "right");
                
                // 2. Main Value
                ui.drawText(`${total}`, slotCenterX + 6, curY, UITheme.fonts.bold, UITheme.colors.textMain, "left");
                
                // 3. Bonus (Below Main Value)
                if (bonus > 0) {
                    ui.drawText(`(+${bonus})`, slotCenterX + 6, curY + 12, UITheme.fonts.small, UITheme.colors.success, "left");
                }
            };

            drawStatBlock("HP", previewStats.maxHp || previewStats.hp, 0, UITheme.colors.hp);
            drawStatBlock("STM", previewStats.maxStamina || previewStats.stamina, 1, UITheme.colors.stm);
            drawStatBlock("INS", previewStats.maxInsight || previewStats.insight, 2, UITheme.colors.ins);

            curY += 35; 

            // E. Attributes
            const attrSource = previewStats.attributes || previewStats;
            const attrs = [
                { label: "Vigor", val: attrSource.vigor },
                { label: "Strength", val: attrSource.strength },
                { label: "Dexterity", val: attrSource.dexterity },
                { label: "Intelligence", val: attrSource.intelligence },
                { label: "Attunement", val: attrSource.attunement }
            ];

            const ROW_HEIGHT = 24; 
            const ATTR_FONT = UITheme.fonts.small; 

            attrs.forEach((attr, idx) => {
                const rowY = curY + (idx * ROW_HEIGHT);
                const leftX = p + 30;     
                const rightX = p + colW - 30;

                if (idx % 2 === 0) {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
                    ctx.fillRect(p + 10, rowY - 14, colW - 20, ROW_HEIGHT);
                }

                ui.drawText(attr.label, leftX, rowY, ATTR_FONT, UITheme.colors.textMuted, "left");
                ui.drawText(attr.val || 0, rightX, rowY, ATTR_FONT, UITheme.colors.textMain, "right");
            });
        }

        // ========================================================
        // 2. CENTER COLUMN: MENU
        // Background: Lighter (bgScale[1])
        // ========================================================
        const menuStartX = p + colW + p;
        let menuY = CONTENT_START_Y;

        ui.drawPanel(menuStartX, startY, midW, panelHeight, UITheme.colors.bgScale[1]);
        ui.drawText("CUSTOMIZE", menuStartX + midW/2, TITLE_Y, UITheme.fonts.body, UITheme.colors.textMuted, "center");

        const labels = {
            background: "BACKGROUND", origin: "ORIGIN", appearance: "LOOK",
            keepsake: "KEEPSAKE", companion: "COMPANION", trait: "TRAIT", difficulty: "DIFFICULTY"
        };
        
        const MENU_ITEM_HEIGHT = 35; 
        const ROW_GAP = 2;           
        const menuSteps = ['background', 'origin', 'appearance', 'keepsake', 'companion', 'trait', 'difficulty', 'start'];

        menuSteps.forEach((key) => {
            const isSelected = (key === currentStep);
            const rowId = `ROW_${key}`;
            const isRowHovered = hoveredElement && hoveredElement.id === rowId;
            const centerColX = menuStartX + (midW / 2);

            if (key === 'start') {
                const btnId = "BTN_START";
                const isBtnHovered = hoveredElement && hoveredElement.id === btnId;
                const btnY = menuY + 5; 

                this.hotspots.push({ id: btnId, x: menuStartX + 40, y: btnY, w: midW - 80, h: MENU_ITEM_HEIGHT });

                const btnColor = (isSelected || isBtnHovered) ? UITheme.colors.textMain : UITheme.colors.textMuted;
                
                ctx.fillStyle = (isSelected || isBtnHovered) ? "rgba(255, 255, 255, 0.1)" : "rgba(0,0,0,0.5)";
                ctx.fillRect(menuStartX + 40, btnY, midW - 80, MENU_ITEM_HEIGHT);
                
                ctx.strokeStyle = btnColor;
                ctx.strokeRect(menuStartX + 40, btnY, midW - 80, MENU_ITEM_HEIGHT);

                ui.drawText("START", centerColX, btnY + (MENU_ITEM_HEIGHT/2) + 1, UITheme.fonts.body, btnColor, "center", "middle");
                return; 
            }

            this.hotspots.push({ id: rowId, x: menuStartX + 10, y: menuY, w: midW - 20, h: MENU_ITEM_HEIGHT });

            if (isSelected || isRowHovered) {
                ctx.fillStyle = isSelected ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)";
                ctx.fillRect(menuStartX + 10, menuY, midW - 20, MENU_ITEM_HEIGHT);

                if (isSelected) {
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(menuStartX + 10, menuY, midW - 20, MENU_ITEM_HEIGHT);
                }
            }

            const labelY = menuY + 10;
            ui.drawText(labels[key], centerColX, labelY, "9px serif", UITheme.colors.textMuted, "center");

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
                const valY = menuY + 26; 

                const prevId = `BTN_PREV_${key}`;
                const nextId = `BTN_NEXT_${key}`;
                const isPrevHover = hoveredElement && hoveredElement.id === prevId;
                const isNextHover = hoveredElement && hoveredElement.id === nextId;

                const leftArrowX = menuStartX + 30; 
                const rightArrowX = menuStartX + midW - 30;
                const textMaxWidth = midW - 140; 
                const arrowSize = 5; 

                const arrowColorPrev = isPrevHover ? UITheme.colors.textMain : UITheme.colors.textMuted;
                const arrowColorNext = isNextHover ? UITheme.colors.textMain : UITheme.colors.textMuted;

                ui.drawArrow(leftArrowX, valY - 4, arrowSize, 'left', arrowColorPrev);
                ui.drawArrow(rightArrowX, valY - 4, arrowSize, 'right', arrowColorNext);

                this.hotspots.push({ id: prevId, x: leftArrowX - 20, y: valY - 20, w: 40, h: 40 });
                this.hotspots.push({ id: nextId, x: rightArrowX - 20, y: valY - 20, w: 40, h: 40 });

                ui.drawText(valStr, centerColX, valY, UITheme.fonts.body, valColor, "center", "alphabetic", textMaxWidth);
            }
            
            menuY += MENU_ITEM_HEIGHT + ROW_GAP; 
        });

        // ========================================================
        // 3. RIGHT COLUMN (Details)
        // Background: Darkest (bgScale[0])
        // ========================================================
        const rightColX = CANVAS_WIDTH - colW - p;
        ui.drawPanel(rightColX, startY, colW, panelHeight, UITheme.colors.bgScale[0]);
        ui.drawText("DETAILS", rightColX + colW/2, TITLE_Y, UITheme.fonts.body, UITheme.colors.textMuted, "center");

        const desc = this.getDescription(controllerState);
        if (desc) {
            ui.drawWrappedText(desc, rightColX + 20, CONTENT_START_Y, colW - 40, 28, UITheme.fonts.body, UITheme.colors.textMain);
        }

        if (controllerState.onLayoutUpdate) {
            controllerState.onLayoutUpdate(this.hotspots);
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