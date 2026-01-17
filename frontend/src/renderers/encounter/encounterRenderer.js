import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class EncounterRenderer {
    constructor(config) {
        this.config = config;
    }

    render(ctx, state) {
        // 1. Safety Check
        if (!state.encounter?.activeData) return;

        const { activeData, currentStageId } = state.encounter;
        const currentStage = activeData.stages[currentStageId];
        const selectedIndex = state.ui.selectedDecisionIndex || 0;
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;

        // 2. Initialize UI Helper
        const ui = new CanvasUI(ctx);
        ui.clearScreen(CANVAS_WIDTH, CANVAS_HEIGHT);

        const p = UITheme.layout.padding;

        // --- LAYOUT CALCULATIONS ---
        // Side Columns (Portraits)
        const columnWidth = CANVAS_WIDTH * 0.14; 
        
        // Center Area (Narrative + Decisions)
        const centerWidth = CANVAS_WIDTH - (columnWidth * 2) - (p * 4);
        const centerX = columnWidth + (p * 2);

        // Vertical Spacing
        const headerHeight = UITheme.layout.headerHeight;
        const startY = p + headerHeight + p; // Content starts below header

        // Narrative Box Height (approx 20% of screen)
        const narrativeHeight = CANVAS_HEIGHT * 0.20;
        
        // Decision Box (Remaining space minus bottom padding)
        const decisionY = startY + narrativeHeight + p;
        const decisionHeight = CANVAS_HEIGHT - decisionY - p;

        ctx.save();

        // --- SECTION 1: HEADER ---
        // Centered header panel
        const headerW = CANVAS_WIDTH * 0.4;
        const headerX = (CANVAS_WIDTH / 2) - (headerW / 2);
        
        ui.drawPanel(headerX, p, headerW, headerHeight);
        ui.drawText(
            activeData.title, 
            CANVAS_WIDTH / 2, 
            p + (headerHeight/2), 
            UITheme.fonts.header, 
            UITheme.colors.textMain, 
            "center",
            "middle"
        );

        // --- SECTION 2: LEFT COLUMN (PLAYER) ---
        // Draw Container Panel
        ui.drawPanel(p, startY, columnWidth, CANVAS_HEIGHT - startY - p);
        
        // Draw Custom Graphics (Portrait/Vitals)
        // Note: We still pass 'ctx' to these helpers for custom shape drawing, 
        // but we use UITheme colors inside them now.
        this.drawPortraitStack(ctx, p + (columnWidth/2), startY + 60, columnWidth, "Player");
        this.drawVitals(ctx, p + (columnWidth/2), startY + 140);

        // --- SECTION 3: RIGHT COLUMN (TARGET) ---
        const rightColX = CANVAS_WIDTH - columnWidth - p;
        // Draw Container Panel
        ui.drawPanel(rightColX, startY, columnWidth, CANVAS_HEIGHT - startY - p);
        // Draw Custom Graphics
        this.drawPortraitStack(ctx, rightColX + (columnWidth/2), startY + 60, columnWidth, "Target");

        // --- SECTION 4: CENTER (NARRATIVE) ---
        ui.drawPanel(centerX, startY, centerWidth, narrativeHeight);
        
        // Narrative Text (Wrapped)
        ui.drawWrappedText(
            currentStage.narrative, 
            centerX + 20, 
            startY + 20, 
            centerWidth - 40
        );

        // --- SECTION 5: CENTER (DECISIONS) ---
        ui.drawPanel(centerX, decisionY, centerWidth, decisionHeight);

        const btnHeight = 40;
        const btnStartY = decisionY + 30;

        currentStage.decisions.forEach((opt, index) => {
            const btnY = btnStartY + (index * 50); // 50px spacing
            const btnX = centerX + 20;
            const btnW = centerWidth - 40;

            if (index === selectedIndex) {
                // -- SELECTED --
                // Highlight Background
                ui.drawFilledPanel(btnX, btnY, btnW, btnHeight, UITheme.colors.borderHighlight);
                
                // Text (High Contrast/Highlight Color)
                ui.drawText(
                    `> ${opt.text}`, 
                    btnX + 15, 
                    btnY + (btnHeight/2), 
                    UITheme.fonts.bold, 
                    UITheme.colors.textHighlight, // Gold/Yellow
                    "left",
                    "middle"
                );
            } else {
                // -- UNSELECTED --
                // Text (Muted Color)
                ui.drawText(
                    opt.text, 
                    btnX + 15, 
                    btnY + (btnHeight/2), 
                    UITheme.fonts.body, 
                    UITheme.colors.textMuted,
                    "left",
                    "middle"
                );
            }
        });

        ctx.restore();
    }

    // --- HELPER METHODS (Custom Graphics) ---

    drawPortraitStack(ctx, centerX, centerY, width, label) {
        const radiusX = width / 2.5;
        const radiusY = width / 2; // Ellipse

        ctx.strokeStyle = UITheme.colors.border;
        ctx.lineWidth = 2;
        
        // Draw Ellipse Portrait
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Nameplate
        const plateW = width * 0.9;
        const plateH = 24;
        const plateX = centerX - (plateW / 2);
        const plateY = centerY - radiusY - (plateH / 2);

        // Use Theme Background
        ctx.fillStyle = UITheme.colors.panelBg;
        ctx.fillRect(plateX, plateY, plateW, plateH);
        ctx.strokeRect(plateX, plateY, plateW, plateH);

        // Name Text
        ctx.fillStyle = UITheme.colors.textMain;
        ctx.font = UITheme.fonts.small;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, centerX, plateY + (plateH/2));
    }

    drawVitals(ctx, centerX, startY) {
        const radius = 8;
        const spacing = 30;
        const vitals = [
            { x: centerX - spacing, y: startY, color: UITheme.colors.danger },  // HP
            { x: centerX,           y: startY + 10, color: UITheme.colors.success }, // Stamina
            { x: centerX + spacing, y: startY, color: UITheme.colors.magic }   // Mana
        ];

        vitals.forEach(v => {
            ctx.fillStyle = v.color;
            ctx.beginPath();
            ctx.arc(v.x, v.y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = UITheme.colors.border;
            ctx.stroke();
        });
    }
}