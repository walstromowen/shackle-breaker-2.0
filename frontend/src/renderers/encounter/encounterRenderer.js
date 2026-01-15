export class EncounterRenderer {
    constructor(config) {
        this.config = config;
    }

    /**
     * Renders the Encounter UI Overlay
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} state - The global game state
     */
    render(ctx, state) {
        // 1. Safety Check
        if (!state.encounter?.activeData) return;

        const { activeData, currentStageId } = state.encounter;
        const currentStage = activeData.stages[currentStageId];
        const selectedIndex = state.ui.selectedDecisionIndex || 0;

        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;

        ctx.save();
        
        // --- BACKGROUND ---
        ctx.fillStyle = "#111111"; 
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // --- GRID CONFIGURATION ---
        const padding = 20; 
        const columnWidth = CANVAS_WIDTH * 0.14; 
        
        // Portrait Setup
        const portraitHeight = columnWidth * 1.6; 
        const nameplateHeight = 30; 
        
        // Vitals Config
        const symbolRadius = 18;
        const vOffset = 10; 

        // --- VERTICAL CALCULATIONS ---
        const portraitTopY = padding + (nameplateHeight / 2);
        const portraitCenterY = portraitTopY + (portraitHeight / 2);
        const lowestVitalPoint = portraitCenterY + (portraitHeight / 2) + vOffset + symbolRadius;
        const panelY = lowestVitalPoint + 20; 
        const bottomBaseline = CANVAS_HEIGHT - 40; 
        const panelHeight = bottomBaseline - panelY;

        // --- CENTER COLUMN CALCULATIONS ---
        const narrativeWidth = CANVAS_WIDTH - (columnWidth * 2) - (padding * 6); 
        const headerWidth = CANVAS_WIDTH * 0.35;
        const headerHeight = 40;
        const narrativeHeight = CANVAS_HEIGHT * 0.18; 
        const narrativeY = padding + headerHeight + 80; 

        // Decision Box
        const decisionY = narrativeY + narrativeHeight + 20;
        const decisionHeight = bottomBaseline - decisionY; 

        // --- DRAWING SETTINGS ---
        ctx.strokeStyle = "white"; 
        ctx.lineWidth = 2;

        // --- HELPER: DRAW PORTRAIT STACK ---
        const drawPortraitStack = (centerX, label) => {
            ctx.beginPath();
            ctx.ellipse(centerX, portraitCenterY, columnWidth / 2, portraitHeight / 2, 0, 0, Math.PI * 2);
            ctx.stroke();

            const nameplateWidth = columnWidth * 0.9; 
            const nameplateY = portraitTopY - (nameplateHeight / 2);
            const nameplateX = centerX - (nameplateWidth / 2);

            ctx.fillStyle = "#111111"; 
            ctx.fillRect(nameplateX, nameplateY, nameplateWidth, nameplateHeight);
            ctx.strokeRect(nameplateX, nameplateY, nameplateWidth, nameplateHeight);
            
            ctx.fillStyle = "white";
            ctx.font = "12px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, centerX, nameplateY + (nameplateHeight/2));
        };

        // --- HELPER: DRAW VITALS ---
        const drawVitals = (centerX) => {
            const vitals = [
                { x: centerX - (columnWidth / 2.5), y: portraitCenterY + (portraitHeight / 2.5) }, 
                { x: centerX, y: portraitCenterY + (portraitHeight / 2) + vOffset },            
                { x: centerX + (columnWidth / 2.5), y: portraitCenterY + (portraitHeight / 2.5) }  
            ];

            vitals.forEach(v => {
                ctx.fillStyle = "#111111"; 
                ctx.beginPath();
                ctx.arc(v.x, v.y, symbolRadius, 0, Math.PI * 2);
                ctx.fill(); 
                ctx.stroke();
                ctx.strokeRect(v.x - 10, v.y - 10, 20, 20);
            });
        };

        // 1. LEFT COLUMN (PLAYER)
        const playerCenterX = padding + (columnWidth / 2);
        drawPortraitStack(playerCenterX, "Player");
        drawVitals(playerCenterX);
        ctx.strokeRect(padding, panelY, columnWidth, panelHeight); 

        // 2. RIGHT COLUMN (ENEMY/TARGET)
        const rightColX = CANVAS_WIDTH - columnWidth - padding;
        const enemyCenterX = rightColX + (columnWidth / 2);
        drawPortraitStack(enemyCenterX, "Target");
        ctx.strokeRect(rightColX, panelY, columnWidth, panelHeight); 

        // 3. CENTER COLUMN (FRAMES)
        const headerX = (CANVAS_WIDTH - headerWidth) / 2;
        ctx.strokeRect(headerX, padding, headerWidth, headerHeight); 
        
        // Header Text
        ctx.fillStyle = "white";
        ctx.font = "20px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; // Center vertically in header
        ctx.fillText(activeData.title, CANVAS_WIDTH / 2, padding + (headerHeight/2));

        const narrativeX = (CANVAS_WIDTH - narrativeWidth) / 2;
        ctx.strokeRect(narrativeX, narrativeY, narrativeWidth, narrativeHeight); 
        ctx.strokeRect(narrativeX, decisionY, narrativeWidth, decisionHeight);     

        // ============================================================
        // 4. DRAW CONTENT: NARRATIVE TEXT
        // ============================================================
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#dddddd";
        
        // Add internal padding so text doesn't touch the border
        this.drawWrappedText(ctx, currentStage.narrative, narrativeX + 20, narrativeY + 20, narrativeWidth - 40, 24);

        // ============================================================
        // 5. DRAW CONTENT: DECISIONS
        // ============================================================
        const decisions = currentStage.decisions;
        const btnHeight = 40; 
        const btnStartY = decisionY + 30; // 30px padding from top of decision box

        decisions.forEach((opt, index) => {
            const btnY = btnStartY + (index * btnHeight);

            if (index === selectedIndex) {
                // Highlight Box
                ctx.fillStyle = "#ffffff"; 
                ctx.fillRect(narrativeX + 20, btnY, narrativeWidth - 40, 30);
                
                // Text (Black because background is white)
                ctx.fillStyle = "#000000";
                ctx.font = "bold 16px sans-serif";
                ctx.fillText(`> ${opt.text}`, narrativeX + 30, btnY + 5);
            } else {
                // Normal Text
                ctx.fillStyle = "#888888";
                ctx.font = "16px sans-serif";
                ctx.fillText(`  ${opt.text}`, narrativeX + 30, btnY + 5);
            }
        });

        ctx.restore();
    }

    /**
     * Helper to wrap text within a specific width
     */
    drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
        if (!text) return;
        const words = text.split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    }
}