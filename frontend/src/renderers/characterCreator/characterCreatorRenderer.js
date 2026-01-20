import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class CharacterCreatorRenderer {
    constructor(config, assetLoader) {
        this.config = config;
        this.loader = assetLoader; 
        
        // STORE HIT ZONES FOR MOUSE INTERACTION
        this.hotspots = []; 
    }

    // Helper to find what was clicked
    getHitZone(mouseX, mouseY) {
        // Iterate backwards (checks top-most elements first if overlaps exist)
        for (let i = this.hotspots.length - 1; i >= 0; i--) {
            const zone = this.hotspots[i];
            if (CanvasUI.isPointInRect(mouseX, mouseY, zone.rect)) {
                return zone.id;
            }
        }
        return null;
    }

    render(ctx, controllerState) {
        // RESET HOTSPOTS EVERY FRAME
        this.hotspots = [];

        const ui = new CanvasUI(ctx);
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;
        const { selections, data, currentStep, isEditingName } = controllerState;

        ui.clearScreen(CANVAS_WIDTH, CANVAS_HEIGHT);

        const p = 20;
        const colW = CANVAS_WIDTH * 0.3; 
        const midW = CANVAS_WIDTH - (colW * 2) - (p * 4);
        
        const startY = 40; 
        const panelHeight = CANVAS_HEIGHT - startY - 40;

        // --- 1. LEFT COLUMN (PREVIEW) ---
        ui.drawPanel(p, startY, colW, panelHeight);
        
        const appData = data.APPEARANCES[selections.appearanceIdx];
        const compData = data.COMPANIONS[selections.companionIdx];

        ui.drawText("IDENTITY", p + colW/2, startY + 30, UITheme.fonts.body, UITheme.colors.textMuted, "center");

        // Portrait
        const portraitImg = this.loader.get(appData.portrait);
        if (portraitImg) {
            const portW = 64; 
            const portH = 64;
            const portX = p + (colW - portW) / 2;
            const portY = startY + 60;
            ctx.drawImage(portraitImg, portX, portY, portW, portH);
            ctx.strokeStyle = UITheme.colors.accent;
            ctx.lineWidth = 1;
            ctx.strokeRect(portX, portY, portW, portH);
        }

        // Sprite
        const spriteImg = this.loader.get(appData.sprite);
        if (spriteImg) {
            const tileS = 32; 
            const scale = 2; 
            const drawSize = tileS * scale;
            const spriteY = startY + 140;
            ctx.imageSmoothingEnabled = false; 
            ctx.drawImage(
                spriteImg,
                0, 0, tileS, tileS,              
                p + (colW - drawSize) / 2,       
                spriteY,                    
                drawSize, drawSize               
            );
        } else {
            ui.drawText("[?]", p + colW/2, startY + 100, UITheme.fonts.header, UITheme.colors.textMuted, "center");
        }

        // Name Display in Preview
        const displayName = selections.name || "Unknown";
        ui.drawText(displayName, p + colW/2, startY + 220, UITheme.fonts.bold, UITheme.colors.textMain, "center");

        // Companion Display
        ui.drawText("COMPANION", p + colW/2, startY + 270, UITheme.fonts.body, UITheme.colors.textMuted, "center");
        ui.drawText(compData.label, p + colW/2, startY + 300, UITheme.fonts.bold, UITheme.colors.accent, "center");


        // --- 2. CENTER COLUMN (MENU) ---
        const menuStartX = p + colW + p;
        ui.drawPanel(menuStartX, startY, midW, panelHeight);
        ui.drawText("CUSTOMIZE", CANVAS_WIDTH/2, startY + 30, UITheme.fonts.body, UITheme.colors.textMuted, "center");

        const labels = {
            name: "Name",
            background: "Background",
            origin: "Origin",
            appearance: "Look",
            keepsake: "Keepsake",
            companion: "Partner",
            difficulty: "Difficulty",
            start: "Begin Journey"
        };

        let y = startY + 60;
        
        ['name', 'background', 'origin', 'appearance', 'keepsake', 'companion', 'difficulty', 'start'].forEach((key) => {
            const isSelected = (key === currentStep);
            let color = isSelected ? UITheme.colors.textHighlight : UITheme.colors.textMuted;
            const prefix = isSelected ? "> " : "  ";
            
            ui.drawText(prefix + labels[key], menuStartX + 20, y, UITheme.fonts.body, color);

            // --- SPECIAL RENDERING FOR NAME FIELD ---
            if (key === 'name') {
                const labelSpace = 120;
                const fieldX = menuStartX + labelSpace; 
                const maxFieldWidth = 220; 
                const availableWidth = midW - labelSpace - 20;
                const fieldW = Math.min(maxFieldWidth, availableWidth);
                const fieldH = 28;
                const fieldY = y - 20;

                // --- REGISTER HOTSPOT ---
                this.hotspots.push({
                    id: "NAME_INPUT",
                    rect: { x: fieldX, y: fieldY, w: fieldW, h: fieldH }
                });

                // 1. Draw Box Background & Border (Standard)
                ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)';
                if (isEditingName) ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; 
                ctx.fillRect(fieldX, fieldY, fieldW, fieldH);
                
                ctx.strokeStyle = (isSelected || isEditingName) ? UITheme.colors.accent : UITheme.colors.border;
                ctx.lineWidth = 1;
                ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);

                // 2. Prepare Text Content
                let valStr = selections.name;
                if (isEditingName) {
                    color = UITheme.colors.accent; 
                    if (Math.floor(Date.now() / 500) % 2 === 0) valStr += "|"; // Cursor
                } else if (!valStr) {
                    valStr = "Type Name..."; 
                    color = UITheme.colors.textMuted;
                }

                // 3. CLIPPING & SCROLLING LOGIC
                ctx.save(); // Save state before clipping
                
                // Define the clipping region (The inside of the box)
                ctx.beginPath();
                ctx.rect(fieldX, fieldY, fieldW, fieldH);
                ctx.clip(); // Nothing drawn after this leaves the box

                // Measure Text
                ctx.font = UITheme.fonts.body; // Ensure we measure with correct font
                const textWidth = ctx.measureText(valStr).width;
                const padding = 10;
                const visibleWidth = fieldW - (padding * 2);

                // Calculate X Position
                let drawX = fieldX + padding; // Default: Left aligned

                // If text is too long...
                if (textWidth > visibleWidth) {
                    if (isEditingName) {
                        // Align Right (Show end of string/cursor)
                        drawX = (fieldX + fieldW - padding) - textWidth;
                    } 
                    // If not editing, keep Left aligned (Show start of name)
                }

                // Draw the text (It will be clipped automatically)
                ui.drawText(valStr, drawX, y, UITheme.fonts.body, color, "left");

                ctx.restore(); // Remove clip so other UI elements draw normally
            } 
            // --- STANDARD RENDERING ---
            else {
                let valStr = "";
                if (key === 'background') valStr = data.BACKGROUNDS[selections.backgroundIdx].label;
                else if (key === 'origin') valStr = data.ORIGINS[selections.originIdx].label;
                else if (key === 'appearance') valStr = data.APPEARANCES[selections.appearanceIdx].label;
                else if (key === 'keepsake') valStr = data.KEEPSAKES[selections.keepsakeIdx].label;
                else if (key === 'companion') valStr = data.COMPANIONS[selections.companionIdx].label;
                else if (key === 'difficulty') {
                    const diffLabel = data.DIFFICULTIES[selections.difficultyIdx].label;
                    let diffColor = color;
                    if (diffLabel === "Easy") diffColor = UITheme.colors.success;
                    if (diffLabel === "Hard") diffColor = UITheme.colors.warning;
                    if (diffLabel === "Nightmare") diffColor = UITheme.colors.danger;
                    
                    ui.drawText(diffLabel, menuStartX + midW - 20, y, UITheme.fonts.body, diffColor, "right");
                    valStr = null; 
                }

                if (valStr) {
                    ui.drawText(valStr, menuStartX + midW - 20, y, UITheme.fonts.body, color, "right");
                }
            }

            y += 42;
        });


        // --- 3. RIGHT COLUMN (DETAILS) ---
        ui.drawPanel(CANVAS_WIDTH - colW - p, startY, colW, panelHeight);
        ui.drawText("DETAILS", CANVAS_WIDTH - colW/2 - p, startY + 30, UITheme.fonts.body, UITheme.colors.textMuted, "center");

        const desc = this.getDescription(controllerState);
        
        ui.drawWrappedText(
            desc, 
            CANVAS_WIDTH - colW - p + 20, 
            startY + 80,                  
            colW - 40,                    
            24,                           
            UITheme.fonts.body,           
            UITheme.colors.textMain       
        );
    }

    getDescription({ currentStep, selections, data, isEditingName }) {
        if (currentStep === 'name') {
            return isEditingName 
                ? "Type your name.\nPress Enter to confirm." 
                : "Press Enter to edit name.";
        }
        if (currentStep === 'start') return "Venture forth into the unknown.";
        
        if (currentStep === 'background') return data.BACKGROUNDS[selections.backgroundIdx].desc;
        if (currentStep === 'origin') return data.ORIGINS[selections.originIdx].desc;
        if (currentStep === 'appearance') return "Your physical form in this realm.";
        if (currentStep === 'keepsake') return data.KEEPSAKES[selections.keepsakeIdx].desc;
        if (currentStep === 'companion') return data.COMPANIONS[selections.companionIdx].desc;
        if (currentStep === 'difficulty') return data.DIFFICULTIES[selections.difficultyIdx].desc;
        
        return "";
    }
}