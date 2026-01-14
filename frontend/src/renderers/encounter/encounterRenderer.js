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
        // 1. Safety Check: Don't render if we aren't in an encounter
        // Adjust this check based on where you store the ID (e.g. state.encounter.activeData)
        if (!state.encounter?.activeData) return;

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
        const vOffset = 10; // Distance health orb hangs below portrait

        // --- VERTICAL CALCULATIONS ---
        
        // 1. Where does the portrait start? (Centered on nameplate)
        const portraitTopY = padding + (nameplateHeight / 2);
        const portraitCenterY = portraitTopY + (portraitHeight / 2);
        
        // 2. Where is the absolute bottom of the lowest vital symbol?
        // CenterY + HalfHeight + Offset + Radius + BorderThickness
        const lowestVitalPoint = portraitCenterY + (portraitHeight / 2) + vOffset + symbolRadius;

        // 3. Where should the Side Panels start?
        const panelY = lowestVitalPoint + 20; // 20px buffer below the health orb

        // 4. Where is the bottom baseline of the UI?
        const bottomBaseline = CANVAS_HEIGHT - 40; 
        const panelHeight = bottomBaseline - panelY;

        // --- CENTER COLUMN CALCULATIONS ---
        
        // Made narrower by adding extra padding (padding * 6 instead of 4)
        const narrativeWidth = CANVAS_WIDTH - (columnWidth * 2) - (padding * 6); 
        const headerWidth = CANVAS_WIDTH * 0.35;
        const headerHeight = 40;

        // Made Narrative shorter (0.18 instead of 0.22)
        const narrativeHeight = CANVAS_HEIGHT * 0.18; 
        const narrativeY = padding + headerHeight + 80; 

        // Decision Box
        const decisionY = narrativeY + narrativeHeight + 20;
        const decisionHeight = bottomBaseline - decisionY; // Aligns with side panels

        // --- DRAWING SETTINGS ---
        ctx.strokeStyle = "white"; 
        ctx.lineWidth = 2;

        // --- HELPER: DRAW PORTRAIT STACK ---
        // Defined here to access local scope variables (columnWidth, etc.)
        const drawPortraitStack = (centerX, label) => {
            // A. The Oval Portrait Frame
            ctx.beginPath();
            ctx.ellipse(centerX, portraitCenterY, columnWidth / 2, portraitHeight / 2, 0, 0, Math.PI * 2);
            ctx.stroke();

            // B. The Nameplate (Masked & Drawn)
            const nameplateWidth = columnWidth * 0.9; 
            const nameplateY = portraitTopY - (nameplateHeight / 2);
            const nameplateX = centerX - (nameplateWidth / 2);

            // Clear background for nameplate so it doesn't overlap the oval line
            ctx.fillStyle = "#111111"; 
            ctx.fillRect(nameplateX, nameplateY, nameplateWidth, nameplateHeight);
            ctx.strokeRect(nameplateX, nameplateY, nameplateWidth, nameplateHeight);
            
            // Temporary Label
            ctx.fillStyle = "white";
            ctx.font = "12px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, centerX, nameplateY + (nameplateHeight/2));
        };

        // --- HELPER: DRAW VITALS ---
        const drawVitals = (centerX) => {
            const vitals = [
                { x: centerX - (columnWidth / 2.5), y: portraitCenterY + (portraitHeight / 2.5) }, // Stamina
                { x: centerX, y: portraitCenterY + (portraitHeight / 2) + vOffset },            // Health
                { x: centerX + (columnWidth / 2.5), y: portraitCenterY + (portraitHeight / 2.5) }  // Insight
            ];

            vitals.forEach(v => {
                ctx.fillStyle = "#111111"; // Masking behind the circle
                ctx.beginPath();
                ctx.arc(v.x, v.y, symbolRadius, 0, Math.PI * 2);
                ctx.fill(); 
                ctx.stroke();
                
                // Small number box (placeholder)
                ctx.strokeRect(v.x - 10, v.y - 10, 20, 20);
            });
        };

        // 1. LEFT COLUMN (PLAYER)
        const playerCenterX = padding + (columnWidth / 2);
        drawPortraitStack(playerCenterX, "Player");
        drawVitals(playerCenterX);
        ctx.strokeRect(padding, panelY, columnWidth, panelHeight); // Attribute Panel

        // 2. RIGHT COLUMN (ENEMY)
        const rightColX = CANVAS_WIDTH - columnWidth - padding;
        const enemyCenterX = rightColX + (columnWidth / 2);
        drawPortraitStack(enemyCenterX, "Enemy");
        // (Optional: Draw Enemy Vitals here if desired)
        ctx.strokeRect(rightColX, panelY, columnWidth, panelHeight); // Meta Panel

        // 3. CENTER COLUMN (NARRATIVE)
        const headerX = (CANVAS_WIDTH - headerWidth) / 2;
        ctx.strokeRect(headerX, padding, headerWidth, headerHeight); // Header Frame
        
        // Draw Header Text
        if (state.encounter.activeData) {
            ctx.fillStyle = "white";
            ctx.font = "20px serif";
            ctx.textAlign = "center";
            ctx.fillText(state.encounter.activeData.title, CANVAS_WIDTH / 2, padding + 25);
        }

        const narrativeX = (CANVAS_WIDTH - narrativeWidth) / 2;
        ctx.strokeRect(narrativeX, narrativeY, narrativeWidth, narrativeHeight); // Narrative Frame
        ctx.strokeRect(narrativeX, decisionY, narrativeWidth, decisionHeight);     // Decisions Frame

        ctx.restore();
    }
}