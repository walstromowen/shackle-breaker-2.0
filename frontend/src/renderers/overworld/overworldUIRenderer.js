/**
 * frontend/src/renderers/overworld/overworldUIRenderer.js
 */
import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class OverworldUIRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
    }

    render(ctx, state) {
        // Destructure trackedQuests from state
        const { hoveredHitboxId, isMenuOpen, menuToggleHitbox, dropdownHitboxes, trackedQuests } = state || {};
        
        const ui = new CanvasUI(ctx);

        if (menuToggleHitbox) {
            const isMainHovered = hoveredHitboxId === menuToggleHitbox.id;
            this.drawSquareButton(ctx, ui, menuToggleHitbox, isMainHovered, isMenuOpen);
        }

        if (isMenuOpen && dropdownHitboxes) {
            for (const btn of dropdownHitboxes) {
                const isHovered = hoveredHitboxId === btn.id;
                this.drawSquareButton(ctx, ui, btn, isHovered, false);
            }
        }

        // Render the quest tracker if there are quests to show
        if (trackedQuests && trackedQuests.length > 0) {
            this.drawQuestTracker(ctx, ui, trackedQuests);
        }
    }

    // Add this new method to render the HUD tracker
    drawQuestTracker(ctx, ui, quests) {
        // SCALED UP DIMENSIONS
        const padding = 48; // Space from the edge of the screen
        const trackerWidth = 460; // Much wider to fit large text
        const startX = ctx.canvas.width - trackerWidth - padding;
        let currentY = padding;

        for (const quest of quests) {
            // SCALED UP SPACING
            const lineHeight = 38;
            const objectivesHeight = (quest.objectives ? quest.objectives.length : 0) * lineHeight;
            const panelHeight = 75 + objectivesHeight;

            // Draw a subtle background panel for the quest
            ui.drawPanel(startX, currentY, trackerWidth, panelHeight, "rgba(25, 23, 20, 0.6)");

            // Draw Quest Title using UITheme
            ui.drawText(
                quest.title || "Unknown Quest",
                startX + 24, 
                currentY + 40,
                UITheme.fonts.bold, // <-- Using the large bold font (34px)
                UITheme.colors.states.hoverText || "#FFD700",
                "left", 
                "middle"
            );

            // Draw Objectives
            let objY = currentY + 86; // Push down below the larger title

            if (quest.objectives) {
                for (const obj of quest.objectives) {
                    const progressText = `${obj.current}/${obj.required}`;
                    const isComplete = obj.current >= obj.required;
                    // Use UITheme's success color (Estus Gold) instead of generic green
                    const textColor = isComplete ? UITheme.colors.success : UITheme.colors.textMain;

                    // Objective Description
                    ui.drawText(
                        `- ${obj.description}`,
                        startX + 24, 
                        objY,
                        UITheme.fonts.small, // <-- Using the small theme font (29px)
                        textColor,
                        "left", 
                        "middle"
                    );

                    // Objective Progress Numbers (Aligned to the right)
                    ui.drawText(
                        progressText,
                        startX + trackerWidth - 24, 
                        objY,
                        UITheme.fonts.small, 
                        textColor,
                        "right", 
                        "middle"
                    );

                    objY += lineHeight;
                }
            }

            // Add a gap before the next tracked quest
            currentY += panelHeight + 16;
        }
    }

    drawSquareButton(ctx, ui, btn, isHovered, isActiveOverride = false) {
        const isActive = isHovered || isActiveOverride;

        // --- TRANSPARENT SQUARE BACKGROUNDS ---
        const bgColor = isActive ? "rgba(65, 58, 50, 0.6)" : "rgba(25, 23, 20, 0.4)";
        const textColor = isActive ? UITheme.colors.states.hoverText : UITheme.colors.textMain;

        // Slight hover bounce
        const yOffset = isHovered ? -3 : 0;
        const drawY = btn.y + yOffset;

        // Draw the square panel background
        ui.drawPanel(btn.x, drawY, btn.w, btn.h, bgColor);

        // Highlight brackets outside the panel
        if (isActive) {
            ui.drawSelectionBrackets(btn.x - 4, drawY - 4, btn.w + 8, btn.h + 8, 8, UITheme.colors.borderHighlight);
        }

        const centerX = btn.x + (btn.w / 2);
        const uiSheet = this.loader.get('ui_icons');

        // Draw the 64x64 icon from the spritesheet
        if (uiSheet && btn.spriteCol !== undefined && btn.spriteRow !== undefined) {
            const iconSize = 64;
            const dstX = centerX - (iconSize / 2);
            // Position the icon slightly near the top to leave room for text
            const dstY = drawY + 8;
            const srcX = btn.spriteCol * iconSize;
            const srcY = btn.spriteRow * iconSize;

            ctx.drawImage(
                uiSheet,
                srcX, srcY, iconSize, iconSize,
                dstX, dstY, iconSize, iconSize
            );
        }

        // Draw destination label below the icon (Updated to use UITheme)
        const textY = drawY + btn.h - 18;
        ui.drawText(
            btn.label,
            centerX,
            textY,
            UITheme.fonts.cardSmall, // <-- Replaced the hardcoded 16px font
            textColor,
            "center",
            "middle"
        );
    }
}