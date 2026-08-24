import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class OverworldUIRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
    }

    render(ctx, state) {
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

        if (trackedQuests && trackedQuests.length > 0) {
            this.drawQuestTracker(ctx, ui, trackedQuests);
        }
    }

    drawQuestTracker(ctx, ui, quests) {
        const padding = 24; 
        const trackerWidth = 380; 
        const startX = ctx.canvas.width - trackerWidth - padding;

        const innerPadding = 16;
        const titleHeight = 32;
        const lineHeight = 26;
        const questGap = 20;

        let totalHeight = innerPadding;
        for (const quest of quests) {
            totalHeight += titleHeight;
            if (quest.objectives) {
                totalHeight += quest.objectives.length * lineHeight;
            }
            totalHeight += questGap;
        }

        ui.drawPanel(startX, padding, trackerWidth, totalHeight, "rgba(25, 23, 20, 0.6)");

        let currentY = padding + innerPadding;
        for (const quest of quests) {
            ui.drawText(
                quest.title || "Unknown Quest",
                startX + 16,
                currentY + (titleHeight / 2),
                UITheme.fonts.body, 
                UITheme.colors.states.hoverText || "#FFD700",
                "left",
                "middle"
            );
            currentY += titleHeight;

            if (quest.objectives) {
                for (const obj of quest.objectives) {
                    const progressText = `${obj.current}/${obj.required}`;
                    const isComplete = obj.current >= obj.required;
                    const textColor = isComplete ? UITheme.colors.success : UITheme.colors.textMain;

                    ui.drawText(
                        `- ${obj.description}`,
                        startX + 24, 
                        currentY + (lineHeight / 2),
                        UITheme.fonts.cardSmall, 
                        textColor,
                        "left",
                        "middle"
                    );

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
            currentY += questGap;
        }
    }

    drawSquareButton(ctx, ui, btn, isHovered, isActiveOverride = false) {
        const isActive = isHovered || isActiveOverride;

        const bgColor = isActive ? "rgba(65, 58, 50, 0.6)" : "rgba(25, 23, 20, 0.4)";
        const textColor = isActive ? UITheme.colors.states.hoverText : UITheme.colors.textMain;

        const yOffset = isHovered ? -3 : 0;
        const drawY = btn.y + yOffset;

        ui.drawPanel(btn.x, drawY, btn.w, btn.h, bgColor);

        if (isActive) {
            ui.drawSelectionBrackets(btn.x - 4, drawY - 4, btn.w + 8, btn.h + 8, 8, UITheme.colors.borderHighlight);
        }

        // --- NEW: Draw Shortcut Badge ---
        if (btn.shortcut) {
            const badgeSize = 22;
            const bX = btn.x + 4;
            const bY = drawY + 4;
            
            // Draw a dark mini-panel for the hotkey number
            ui.drawPanel(bX, bY, badgeSize, badgeSize, "rgba(0, 0, 0, 0.7)");
            ui.drawText(
                btn.shortcut, 
                bX + (badgeSize / 2), 
                bY + (badgeSize / 2), 
                UITheme.fonts.cardSmall, 
                UITheme.colors.textMuted, 
                "center", 
                "middle"
            );
        }

        const centerX = btn.x + (btn.w / 2);
        const uiSheet = this.loader.get('ui_icons');

        if (uiSheet && btn.spriteCol !== undefined && btn.spriteRow !== undefined) {
            const iconSize = 64;
            const dstX = centerX - (iconSize / 2); 
            const dstY = drawY + 8;
            const srcX = btn.spriteCol * iconSize;
            const srcY = btn.spriteRow * iconSize;

            ctx.drawImage(
                uiSheet,
                srcX, srcY,
                iconSize, iconSize,
                dstX, dstY,
                iconSize, iconSize
            );
        }

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