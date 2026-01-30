import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class CharacterCreatorRenderer {
    constructor(config, assetLoader) {
        this.config = config;
        this.loader = assetLoader; 
        this.hotspots = []; 
    }

    getHitZone(mouseX, mouseY) {
        for (let i = this.hotspots.length - 1; i >= 0; i--) {
            const zone = this.hotspots[i];
            if (CanvasUI.isPointInRect(mouseX, mouseY, zone.rect)) {
                return zone.id;
            }
        }
        return null;
    }

    render(ctx, controllerState) {
        this.hotspots = [];

        const ui = new CanvasUI(ctx);
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;
        const { selections, data, currentStep, isEditingName, previewStats } = controllerState;

        ui.clearScreen(CANVAS_WIDTH, CANVAS_HEIGHT);

        const p = 20; 
        const colW = CANVAS_WIDTH * 0.3; 
        const midW = CANVAS_WIDTH - (colW * 2) - (p * 4);
        const startY = 40; 
        const panelHeight = CANVAS_HEIGHT - startY - 40;
        
        const SPACING_LG = 30; 

        // --- 1. LEFT COLUMN ---
        ui.drawPanel(p, startY, colW, panelHeight);
        
        const appData = data.APPEARANCES[selections.appearanceIdx];
        const centerX = p + colW / 2;
        let curY = startY + 30;

        // Title & Name
        ui.drawText("IDENTITY", centerX, curY, UITheme.fonts.body, UITheme.colors.textMuted, "center");
        curY += SPACING_LG;
        const displayName = selections.name || "Unknown";
        ui.drawText(displayName, centerX, curY, UITheme.fonts.header, UITheme.colors.textHighlight, "center");
        curY += SPACING_LG;

        // Visuals
        const visualSize = 80;
        const visualGap = 20;
        const totalVisualWidth = (visualSize * 2) + visualGap;
        const startVisualX = p + (colW - totalVisualWidth) / 2;

        const portraitImg = this.loader.get(appData.portrait);
        if (portraitImg) {
            ctx.drawImage(portraitImg, startVisualX, curY, visualSize, visualSize);
            ctx.strokeStyle = UITheme.colors.border;
            ctx.lineWidth = 2;
            ctx.strokeRect(startVisualX, curY, visualSize, visualSize);
        }

        const spriteImg = this.loader.get(appData.sprite);
        if (spriteImg) {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(startVisualX + visualSize + visualGap, curY, visualSize, visualSize);
            ctx.imageSmoothingEnabled = false; 
            ctx.drawImage(spriteImg, 0, 0, 32, 32, startVisualX + visualSize + visualGap + 8, curY + 8, 64, 64);
            ctx.strokeStyle = UITheme.colors.border;
            ctx.strokeRect(startVisualX + visualSize + visualGap, curY, visualSize, visualSize);
        }
        
        curY += visualSize + SPACING_LG;

        // --- D. STATS TABLE (FIXED) ---
        if (previewStats) {
            const thirdW = (colW - 40) / 3;
            const vX = p + 20;
            const RES_FONT = UITheme.fonts.small; 

            // Helper to draw "Total (+Bonus)"
            const drawStatBlock = (label, dataObj, xOffset, colorLabel) => {
                // dataObj is { base, bonus, total }
                if (!dataObj) return;
                
                // Label (HP, STM, INS)
                ui.drawText(label, vX + xOffset, curY, RES_FONT, colorLabel, "left");
                
                // Draw Total
                const totalStr = `${dataObj.total}`;
                const totalX = vX + xOffset + thirdW - 10;
                ui.drawText(totalStr, totalX, curY, UITheme.fonts.bold, UITheme.colors.textMain, "right");
                
                // Draw Bonus if exists (e.g. "+2")
                if (dataObj.bonus > 0) {
                    const bonusStr = `(+${dataObj.bonus})`;
                    // Draw slightly above or below, or smaller next to it. 
                    // Let's draw it smaller below the main number
                    ui.drawText(bonusStr, totalX, curY + 14, "10px monospace", UITheme.colors.success, "right");
                }
            };

            drawStatBlock("HP", previewStats.hp, 0, UITheme.colors.danger);
            drawStatBlock("STM", previewStats.stamina, thirdW, UITheme.colors.success);
            drawStatBlock("INS", previewStats.insight, thirdW * 2, "#b19cd9");

            // Add extra spacing because of the bonus text below the numbers
            curY += SPACING_LG + 10; 

            // Attributes
            const attrSource = previewStats.attributes || {};
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

        // --- 2. CENTER COLUMN: MENU ---
        const menuStartX = p + colW + p;
        let menuY = startY + 30;

        ui.drawPanel(menuStartX, startY, midW, panelHeight);
        ui.drawText("CUSTOMIZE", CANVAS_WIDTH/2, menuY, UITheme.fonts.body, UITheme.colors.textMuted, "center");
        menuY += SPACING_LG; 

        const labels = {
            name: "Name", background: "Background", origin: "Origin", appearance: "Look",
            keepsake: "Keepsake", companion: "Companion", trait: "Trait", difficulty: "Difficulty", start: "Begin Journey"
        };
        
        const MENU_ITEM_HEIGHT = 35; 
        const menuSteps = ['name', 'background', 'origin', 'appearance', 'keepsake', 'companion', 'trait', 'difficulty', 'start'];

        menuSteps.forEach((key) => {
            const isSelected = (key === currentStep);
            let color = isSelected ? UITheme.colors.textHighlight : UITheme.colors.textMuted;
            const prefix = isSelected ? "> " : "  ";
            ui.drawText(prefix + labels[key], menuStartX + 20, menuY, UITheme.fonts.body, color);

            if (key === 'name') {
                const labelSpace = 120;
                const fieldX = menuStartX + labelSpace; 
                const fieldW = Math.min(220, midW - labelSpace - 20);
                const fieldH = 26; 
                const fieldY = menuY - 18; 

                this.hotspots.push({ id: "NAME_INPUT", rect: { x: fieldX, y: fieldY, w: fieldW, h: fieldH } });

                ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)';
                if (isEditingName) ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; 
                ctx.fillRect(fieldX, fieldY, fieldW, fieldH);
                ctx.strokeStyle = (isSelected || isEditingName) ? UITheme.colors.accent : UITheme.colors.border;
                ctx.lineWidth = 1;
                ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);

                let valStr = selections.name;
                if (isEditingName) {
                    color = UITheme.colors.accent; 
                    if (Math.floor(Date.now() / 500) % 2 === 0) valStr += "|"; 
                } else if (!valStr) {
                    valStr = "Type Name..."; 
                    color = UITheme.colors.textMuted;
                }

                ctx.save(); 
                ctx.beginPath(); ctx.rect(fieldX, fieldY, fieldW, fieldH); ctx.clip(); 
                ui.drawText(valStr, fieldX + 10, menuY, UITheme.fonts.body, color, "left");
                ctx.restore(); 
            } else {
                let valStr = "";
                if (key === 'background') valStr = data.BACKGROUNDS[selections.backgroundIdx].label;
                else if (key === 'origin') valStr = data.ORIGINS[selections.originIdx].label;
                else if (key === 'appearance') valStr = data.APPEARANCES[selections.appearanceIdx].label;
                else if (key === 'keepsake') valStr = data.KEEPSAKES[selections.keepsakeIdx].label;
                else if (key === 'companion') valStr = data.COMPANIONS[selections.companionIdx].label;
                else if (key === 'trait') valStr = data.TRAITS[selections.traitIdx].label; 
                else if (key === 'difficulty') {
                    const diffLabel = data.DIFFICULTIES[selections.difficultyIdx].label;
                    if (diffLabel === "Easy") ui.drawText(diffLabel, menuStartX + midW - 20, menuY, UITheme.fonts.body, UITheme.colors.success, "right");
                    else if (diffLabel === "Hard") ui.drawText(diffLabel, menuStartX + midW - 20, menuY, UITheme.fonts.body, UITheme.colors.warning, "right");
                    else if (diffLabel === "Nightmare") ui.drawText(diffLabel, menuStartX + midW - 20, menuY, UITheme.fonts.body, UITheme.colors.danger, "right");
                    else ui.drawText(diffLabel, menuStartX + midW - 20, menuY, UITheme.fonts.body, color, "right");
                }
                if (valStr) ui.drawText(valStr, menuStartX + midW - 20, menuY, UITheme.fonts.body, color, "right");
            }
            menuY += MENU_ITEM_HEIGHT;
        });

        // --- 3. RIGHT COLUMN ---
        const rightColX = CANVAS_WIDTH - colW - p;
        ui.drawPanel(rightColX, startY, colW, panelHeight);
        ui.drawText("DETAILS", rightColX + colW/2, startY + 30, UITheme.fonts.body, UITheme.colors.textMuted, "center");

        const desc = this.getDescription(controllerState);
        ui.drawWrappedText(desc, rightColX + 20, startY + 60, colW - 40, 28, UITheme.fonts.body, UITheme.colors.textMain);
    }

    getDescription({ currentStep, selections, data, isEditingName }) {
        if (currentStep === 'name') return isEditingName ? "Type your name using the keyboard.\nPress Enter to confirm." : "Select to edit your character's name.";
        if (currentStep === 'start') return "Finalize your choices and venture forth into the unknown.";
        if (currentStep === 'background') return data.BACKGROUNDS[selections.backgroundIdx].desc;
        if (currentStep === 'origin') return data.ORIGINS[selections.originIdx].desc;
        if (currentStep === 'appearance') return "Choose the physical form you shall take in this realm.";
        if (currentStep === 'keepsake') return data.KEEPSAKES[selections.keepsakeIdx].desc;
        if (currentStep === 'companion') return data.COMPANIONS[selections.companionIdx].desc;
        if (currentStep === 'trait') return data.TRAITS[selections.traitIdx].desc; 
        if (currentStep === 'difficulty') return data.DIFFICULTIES[selections.difficultyIdx].desc;
        return "";
    }
}