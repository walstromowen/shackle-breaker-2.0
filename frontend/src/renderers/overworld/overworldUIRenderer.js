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

    drawQuestTracker(ctx, ui, quests) {
        const padding = 24; // Screen edge padding
        const trackerWidth = 380; // Reduced width for smaller text
        const startX = ctx.canvas.width - trackerWidth - padding;
        
        // Formatting constants for smaller text layout
        const innerPadding = 16;
        const titleHeight = 32;
        const lineHeight = 26; 
        const questGap = 20;

        // 1. Calculate total panel height first
        let totalHeight = innerPadding;
        for (const quest of quests) {
            totalHeight += titleHeight;
            if (quest.objectives) {
                totalHeight += quest.objectives.length * lineHeight;
            }
            totalHeight += questGap;
        }

        // 2. Draw the single unified background panel
        ui.drawPanel(startX, padding, trackerWidth, totalHeight, "rgba(25, 23, 20, 0.6)");

        // 3. Render the text over the panel
        let currentY = padding + innerPadding;

        for (const quest of quests) {
            // Draw Quest Title 
            ui.drawText(
                quest.title || "Unknown Quest",
                startX + 16,
                currentY + (titleHeight / 2),
                UITheme.fonts.body, // Swapped to a smaller font (e.g., body)
                UITheme.colors.states.hoverText || "#FFD700",
                "left",
                "middle"
            );

            currentY += titleHeight;

            // Draw Objectives
            if (quest.objectives) {
                for (const obj of quest.objectives) {
                    const progressText = `${obj.current}/${obj.required}`;
                    const isComplete = obj.current >= obj.required;
                    const textColor = isComplete ? UITheme.colors.success : UITheme.colors.textMain;

                    // Objective Description
                    ui.drawText(
                        `- ${obj.description}`,
                        startX + 24, // Indented slightly
                        currentY + (lineHeight / 2),
                        UITheme.fonts.cardSmall, // Using the 16px card font
                        textColor,
                        "left",
                        "middle"
                    );

                    // Objective Progress Numbers (Aligned to the right)
                    ui.drawText(
                        progressText,
                        startX + trackerWidth - 16,
                        currentY + (lineHeight / 2),
                        UITheme.fonts.cardSmall,
                        textColor,
                        "right",
                        "middle"
                    );

                    currentY += lineHeight;
                }
            }

            // Gap before the next quest in the list
            currentY += questGap;
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

        // Draw destination label below the icon
        const textY = drawY + btn.h - 18;
        ui.drawText(
            btn.label,
            centerX,
            textY,
            UITheme.fonts.cardSmall,
            textColor,
            "center",
            "middle"
        );
    }
}