import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class EncounterRenderer {
    constructor(config) {
        this.config = config;
    }

    render(ctx, state) {
        // 1. Safety Check & Data Destructuring
        // We expect the structure returned by EncounterController.getState()
        if (!state || !state.data) return;

        const { data, currentStage, ui: uiState } = state;
        const selectedIndex = uiState.selectedDecisionIndex || 0;
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;

        // 2. Initialize UI Helper
        const ui = new CanvasUI(ctx);
        
        // --- OVERLAY BACKGROUND ---
        // Instead of clearing the screen (which removes the game world), 
        // we draw a semi-transparent black layer to dim the Overworld.
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const p = UITheme.layout.padding;

        // --- LAYOUT CALCULATIONS ---
        const columnWidth = CANVAS_WIDTH * 0.14; 
        const centerWidth = CANVAS_WIDTH - (columnWidth * 2) - (p * 4);
        const centerX = columnWidth + (p * 2);

        const headerHeight = UITheme.layout.headerHeight;
        const startY = p + headerHeight + p; 

        const narrativeHeight = CANVAS_HEIGHT * 0.20;
        const decisionY = startY + narrativeHeight + p;
        const decisionHeight = CANVAS_HEIGHT - decisionY - p;

        ctx.save();

        // --- SECTION 1: HEADER ---
        const headerW = CANVAS_WIDTH * 0.4;
        const headerX = (CANVAS_WIDTH / 2) - (headerW / 2);
        
        ui.drawPanel(headerX, p, headerW, headerHeight);
        ui.drawText(
            data.title, 
            CANVAS_WIDTH / 2, 
            p + (headerHeight/2), 
            UITheme.fonts.header, 
            UITheme.colors.textMain, 
            "center",
            "middle"
        );

        // --- SECTION 2: LEFT COLUMN (PLAYER) ---
        ui.drawPanel(p, startY, columnWidth, CANVAS_HEIGHT - startY - p);
        this.drawPortraitStack(ctx, p + (columnWidth/2), startY + 60, columnWidth, "Player");
        this.drawVitals(ctx, p + (columnWidth/2), startY + 140);

        // --- SECTION 3: RIGHT COLUMN (TARGET) ---
        const rightColX = CANVAS_WIDTH - columnWidth - p;
        ui.drawPanel(rightColX, startY, columnWidth, CANVAS_HEIGHT - startY - p);
        this.drawPortraitStack(ctx, rightColX + (columnWidth/2), startY + 60, columnWidth, "Target");

        // --- SECTION 4: CENTER (NARRATIVE) ---
        ui.drawPanel(centerX, startY, centerWidth, narrativeHeight);
        
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
                // --- SELECTED STATE ---
                // FIX: Use native ctx.fillRect since drawFilledPanel is missing
                ctx.fillStyle = UITheme.colors.borderHighlight; // Active Highlight Color
                ctx.fillRect(btnX, btnY, btnW, btnHeight);
                
                // Optional: Add a border around the selection for pop
                ctx.strokeStyle = UITheme.colors.textHighlight;
                ctx.lineWidth = 1;
                ctx.strokeRect(btnX, btnY, btnW, btnHeight);

                // Text (High Contrast)
                ui.drawText(
                    `> ${opt.text}`, 
                    btnX + 15, 
                    btnY + (btnHeight/2), 
                    UITheme.fonts.bold, 
                    UITheme.colors.textHighlight, 
                    "left",
                    "middle"
                );
            } else {
                // --- UNSELECTED STATE ---
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

    // --- HELPER METHODS ---

    drawPortraitStack(ctx, centerX, centerY, width, label) {
        const radiusX = width / 2.5;
        const radiusY = width / 2; 

        ctx.strokeStyle = UITheme.colors.border;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();

        const plateW = width * 0.9;
        const plateH = 24;
        const plateX = centerX - (plateW / 2);
        const plateY = centerY - radiusY - (plateH / 2);

        ctx.fillStyle = UITheme.colors.panelBg;
        ctx.fillRect(plateX, plateY, plateW, plateH);
        ctx.strokeRect(plateX, plateY, plateW, plateH);

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
            { x: centerX - spacing, y: startY, color: UITheme.colors.danger },  
            { x: centerX,           y: startY + 10, color: UITheme.colors.success }, 
            { x: centerX + spacing, y: startY, color: UITheme.colors.magic }   
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