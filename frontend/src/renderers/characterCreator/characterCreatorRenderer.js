import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class CharacterCreatorRenderer {
    /**
     * @param {Object} config - Contains global config like CANVAS_WIDTH/HEIGHT
     * @param {Object} assetLoader - The shared AssetLoader instance
     */
    constructor(config, assetLoader) {
        this.config = config;
        this.loader = assetLoader;
    }

    render(ctx, state) {
        // 1. Initialize UI Helper
        const ui = new CanvasUI(ctx);
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;

        // 2. Clear Screen (Black background)
        ui.clearScreen(CANVAS_WIDTH, CANVAS_HEIGHT);

        // 3. Layout Calculations
        // We use percentages so it scales if you change resolution later
        const p = UITheme.layout.padding;
        const colW = CANVAS_WIDTH * 0.25; // 25% width for side columns
        const centerW = CANVAS_WIDTH - (colW * 2) - (p * 4); // Remaining space
        
        const headerH = UITheme.layout.headerHeight;
        const startY = p + headerH + 20; // Top margin for content
        const panelH = CANVAS_HEIGHT - 40 - startY; // Height of main panels

        // --- SECTION 1: HEADER ---
        const headerWidth = 300;
        const headerX = (CANVAS_WIDTH / 2) - (headerWidth / 2);
        
        ui.drawPanel(headerX, p, headerWidth, headerH);
        ui.drawText("CHARACTER CREATION", CANVAS_WIDTH / 2, p + (headerH/2), UITheme.fonts.header, UITheme.colors.textMain, "center");

        // --- SECTION 2: LEFT COLUMN (PREVIEW) ---
        ui.drawPanel(p, startY, colW, panelH);
        ui.drawText("PREVIEW", p + (colW/2), startY + 30, UITheme.fonts.body, UITheme.colors.textMain, "center");

        // Draw the Sprite Preview
        // Note: The X position is center of the column
        this.drawSpritePreview(ctx, state, p + (colW/2), startY + 80);

        // Draw Name (Centered under sprite)
        ui.drawText(state.name, p + (colW/2), startY + 160, UITheme.fonts.small, UITheme.colors.textMuted, "center");


        // --- SECTION 3: CENTER COLUMN (MENU OPTIONS) ---
        const midX = p + colW + p;
        ui.drawPanel(midX, startY, centerW, panelH);
        ui.drawText("CONFIGURATION", midX + (centerW/2), startY + 30, UITheme.fonts.body, UITheme.colors.textMain, "center");

        // Render Options List
        state.options.forEach((opt, index) => {
            const btnY = startY + 70 + (index * 60); // Spacing between buttons
            const btnX = midX + 20;
            const btnW = centerW - 40;
            
            if (index === state.currentRow) {
                // -- SELECTED STATE --
                // 1. Highlight Box
                ui.drawFilledPanel(btnX, btnY, btnW, 40);
                
                // 2. Label (Black Text)
                let label = `> ${opt.label}`;
                if (opt.type === 'cycle') label += ` <`; // Add arrows visual
                ui.drawText(label, btnX + 15, btnY + 20, UITheme.fonts.bold, UITheme.colors.textHighlight);

                // 3. Value (Black Text, Right Aligned)
                if (opt.type === 'cycle') {
                    const val = this.getOptionValue(opt, state);
                    ui.drawText(val, btnX + btnW - 15, btnY + 20, UITheme.fonts.bold, UITheme.colors.textHighlight, "right");
                }

            } else {
                // -- UNSELECTED STATE --
                // 1. Label (Gray Text)
                ui.drawText(opt.label, btnX + 15, btnY + 20, UITheme.fonts.body, UITheme.colors.textMuted);

                // 2. Value (Gray Text, Right Aligned)
                if (opt.type === 'cycle') {
                    const val = this.getOptionValue(opt, state);
                    ui.drawText(val, btnX + btnW - 15, btnY + 20, UITheme.fonts.body, UITheme.colors.textMuted, "right");
                }
            }
        });


        // --- SECTION 4: RIGHT COLUMN (DETAILS) ---
        const rightX = midX + centerW + p;
        ui.drawPanel(rightX, startY, colW, panelH);
        ui.drawText("DETAILS", rightX + (colW/2), startY + 30, UITheme.fonts.body, UITheme.colors.textMain, "center");

        // Draw Description Text (Wrapped)
        const desc = this.getDescription(state);
        ui.drawWrappedText(desc, rightX + 20, startY + 70, colW - 40);

        ctx.restore();
    }

    // --- HELPER METHODS ---

    /**
     * Draws the specific sprite from the loaded spritesheet.
     */
    drawSpritePreview(ctx, state, x, y) {
        const spriteSheet = this.loader.get('spritesheet'); // Key must match main.js loader
        const renderSize = 64; // Draw it 2x larger (32x32 -> 64x64)
        const drawX = x - (renderSize/2); // Center horizontally
        
        if (spriteSheet) {
            const frameSize = 32;
            
            // Logic: Assuming the spritesheet is vertical 4-dir format.
            // 0 = char1, 1 = char2, etc.
            // Each character takes up 4 rows (Down, Left, Right, Up).
            // So we multiply index by (frameSize * 4) to jump to the next character block.
            const charOffsetY = state.spriteIndex * (frameSize * 4); 

            // Draw the "Down/Idle" frame (usually the first one)
            ctx.drawImage(
                spriteSheet,
                0, charOffsetY, frameSize, frameSize, // Source X, Y, W, H
                drawX, y, renderSize, renderSize      // Dest X, Y, W, H
            );
        } else {
            // Fallback: Blue box if asset fails
            ctx.fillStyle = UITheme.colors.accent;
            ctx.fillRect(drawX, y, renderSize, renderSize);
        }
    }

    /**
     * Helper to get the display string for the option value
     */
    getOptionValue(opt, state) {
        if (opt.label === "Appearance") return `Style ${state.spriteIndex + 1}`;
        if (opt.label === "Class") return opt.values[state.classIndex];
        return "";
    }

    /**
     * Helper to get the description text based on selection
     */
    getDescription(state) {
        const currentOption = state.options[state.currentRow];
        
        if (currentOption.label === "Name") {
            return "Choose the name of your legend. Use Left/Right to cycle options.";
        }

        if (currentOption.label === "Appearance") {
            return "Select your hero's look. This determines how you appear in the world.";
        } 
        
        if (currentOption.label === "Class") {
            const cName = currentOption.values[state.classIndex];
            if (cName === "Warrior") return "A strong fighter. \n\nStats: High HP, Medium Strength.";
            if (cName === "Mage") return "Master of arcane arts. \n\nStats: High Insight, Low HP.";
            if (cName === "Rogue") return "Swift and deadly. \n\nStats: High Speed, High Critical.";
        } 
        
        if (currentOption.label === "Start Game") {
            return "Begin your journey into the Shackle-breaker world.";
        }
        
        return "";
    }
}