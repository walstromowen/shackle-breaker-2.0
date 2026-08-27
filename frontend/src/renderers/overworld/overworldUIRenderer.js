import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class OverworldUIRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
    }

    render(ctx, state) {
        // --- NEW: Added harvest variables to destructuring ---
        const { 
            hoveredHitboxId, isMenuOpen, menuToggleHitbox, dropdownHitboxes, 
            trackedQuests, toasts, facedObject, camera,
            isHarvesting, harvestTimer, harvestDuration, harvestTarget 
        } = state || {};

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

        // --- NEW: Draw Harvest Progress Bar OR Interaction Brackets ---
        if (isHarvesting && harvestTarget && camera) {
            // If actively harvesting, show the progress bar instead of standard interaction brackets
            this.drawHarvestProgressBar(ctx, ui, harvestTarget, harvestTimer, harvestDuration, camera);
        } else if (facedObject && camera) {
            // Standard interaction prompts
            this.drawInteractionBrackets(ctx, ui, facedObject, camera);
            this.drawInteractionTooltip(ctx, ui, ctx.canvas, facedObject);
        }

        if (toasts && toasts.length > 0) {
            this.drawToasts(ctx, ui, toasts);
        }
    }

    // --- NEW: Draw a floating progress bar above the object being harvested ---
    drawHarvestProgressBar(ctx, ui, target, timer, duration, camera) {
        const { TILE_SIZE, GAME_SCALE, OBJECT_SIZE } = this.config;
        const objSize = OBJECT_SIZE || TILE_SIZE;

        // 1. Replicate MapRenderer's exact scaling logic
        const baseWidth = 800;
        const resScale = ctx.canvas.width / baseWidth;
        const scale = GAME_SCALE * resScale;

        // 2. Camera offset logic
        const centerOffsetX = (ctx.canvas.width / 2) / scale - (TILE_SIZE / 2);
        const centerOffsetY = (ctx.canvas.height / 2) / scale - (TILE_SIZE / 2);
        const renderCamX = camera.x - centerOffsetX;
        const renderCamY = camera.y - centerOffsetY;

        // 3. Get precise grid coordinates
        const col = target.col !== undefined ? target.col : Math.floor(target.x / TILE_SIZE);
        const row = target.row !== undefined ? target.row : Math.floor(target.y / TILE_SIZE);

        // 4. Translate world position to screen position
        const screenX = Math.floor((col * TILE_SIZE - renderCamX) * scale);
        const screenY = Math.floor((row * TILE_SIZE - renderCamY) * scale);

        // 5. Account for object sizing
        const wTiles = target.w || target.width || 1;
        const hTiles = target.h || target.height || 1;
        const drawW = Math.ceil(wTiles * objSize * scale);
        const drawH = Math.ceil(hTiles * objSize * scale);
        const drawY = Math.floor(screenY - ((hTiles - 1) * objSize * scale));

        // 6. Draw the Bar
        const barWidth = 60 * resScale;
        const barHeight = 8 * resScale;
        
        // Center it horizontally over the object, and float it just above the object
        const barX = screenX + (drawW / 2) - (barWidth / 2);
        const barY = drawY - barHeight - (10 * resScale);

        const progress = Math.min(1, Math.max(0, timer / duration));

        ctx.save();
        
        // Background (Dark)
        ctx.fillStyle = "rgba(25, 23, 20, 0.9)";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Fill (Gold/Success color)
        ctx.fillStyle = UITheme.colors.success || "#4CAF50";
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);

        // Border
        ctx.strokeStyle = UITheme.colors.borderHighlight || "#FFD700";
        ctx.lineWidth = 1.5 * resScale;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        ctx.restore();
    }

    drawInteractionBrackets(ctx, ui, facedObject, camera) {
        const { TILE_SIZE, GAME_SCALE, OBJECT_SIZE } = this.config;
        const objSize = OBJECT_SIZE || TILE_SIZE;

        const baseWidth = 800;
        const resScale = ctx.canvas.width / baseWidth;
        const scale = GAME_SCALE * resScale;

        const centerOffsetX = (ctx.canvas.width / 2) / scale - (TILE_SIZE / 2);
        const centerOffsetY = (ctx.canvas.height / 2) / scale - (TILE_SIZE / 2);
        const renderCamX = camera.x - centerOffsetX;
        const renderCamY = camera.y - centerOffsetY;

        const col = facedObject.col !== undefined ? facedObject.col : Math.floor(facedObject.x / TILE_SIZE);
        const row = facedObject.row !== undefined ? facedObject.row : Math.floor(facedObject.y / TILE_SIZE);

        const screenX = Math.floor((col * TILE_SIZE - renderCamX) * scale);
        const screenY = Math.floor((row * TILE_SIZE - renderCamY) * scale);

        const wTiles = facedObject.w || facedObject.width || 1;
        const hTiles = facedObject.h || facedObject.height || 1;
        const drawW = Math.ceil(wTiles * objSize * scale);
        const drawH = Math.ceil(hTiles * objSize * scale);
        const drawY = Math.floor(screenY - ((hTiles - 1) * objSize * scale));

        const now = performance.now();
        const pulseSpeed = 350;
        const wave = (Math.sin(now / pulseSpeed) + 1) / 2;
        const baseMaxPadding = 4;
        const padding = wave * baseMaxPadding * scale;
        const alpha = 0.5 + ((1 - wave) * 0.5);

        ctx.save();
        ctx.globalAlpha = alpha;
        ui.drawSelectionBrackets(
            screenX - padding,
            drawY - padding,
            drawW + (padding * 2),
            drawH + (padding * 2),
            12,
            UITheme.colors.borderHighlight || "#FFD700"
        );
        ctx.restore();
    }

    drawInteractionTooltip(ctx, ui, canvas, facedObject) {
        if (!facedObject) return;

        // --- NEW: Dynamic Interaction Text ---
        let text = "Interact"; // Default fallback
        
        if (facedObject.interaction && facedObject.interaction.type) {
            switch (facedObject.interaction.type.toUpperCase()) {
                case 'PICKUP': 
                    text = "Pick Up"; 
                    break;
                case 'HARVEST': 
                    text = "Harvest"; 
                    break;
                case 'WARP': 
                    text = "Enter"; 
                    break;
                case 'CRAFTING_STATION':
                case 'WORKSHOP': 
                    text = "Craft"; 
                    break;
                default:
                    // If it's something like 'TALK' or 'INSPECT', just title-case it:
                    text = facedObject.interaction.type.charAt(0).toUpperCase() + 
                           facedObject.interaction.type.slice(1).toLowerCase();
                    break;
            }
        }

        const shortcut = "I";
        const margin = 24;
        const height = 44;
        const badgeSize = 26;
        const padding = 12;

        ctx.save();
        ctx.font = UITheme.fonts.body || "16px sans-serif";
        const textWidth = ctx.measureText(text).width;

        const gap = 10;
        const width = padding + badgeSize + gap + textWidth + padding;

        const startX = canvas.width - width - margin;
        const startY = canvas.height - height - margin;

        const bgColor = "rgba(65, 58, 50, 0.8)";
        ui.drawPanel(startX, startY, width, height, bgColor);

        const badgeX = startX + padding;
        const badgeY = startY + (height / 2) - (badgeSize / 2);

        ui.drawPanel(badgeX, badgeY, badgeSize, badgeSize, "rgba(0, 0, 0, 0.7)");
        ui.drawText(
            shortcut,
            badgeX + (badgeSize / 2),
            badgeY + (badgeSize / 2),
            UITheme.fonts.cardSmall || "12px sans-serif",
            UITheme.colors.textMuted || "#AAAAAA",
            "center",
            "middle"
        );

        const textX = badgeX + badgeSize + gap;
        ui.drawText(
            text,
            textX,
            startY + (height / 2),
            UITheme.fonts.body || "16px sans-serif",
            UITheme.colors.textMain || "#FFFFFF",
            "left",
            "middle"
        );
        ctx.restore();
    }

    drawToasts(ctx, ui, toasts) {
        const now = performance.now();
        const toastHeight = 44;
        const baseY = ctx.canvas.height - 150;

        for (let i = toasts.length - 1; i >= 0; i--) {
            const toast = toasts[i];
            const elapsed = now - toast.createdAt;
            if (elapsed > toast.duration) continue;

            const progress = elapsed / toast.duration;
            const activeIndex = toasts.length - 1 - i;
            const floatY = baseY - (progress * 40) - (activeIndex * (toastHeight + 10));

            let alpha = 1;
            if (progress < 0.1) alpha = progress / 0.1;
            else if (progress > 0.8) alpha = 1 - ((progress - 0.8) / 0.2);

            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            
            ctx.font = UITheme.fonts.cardTitle || "16px sans-serif";
            const textString = `+${toast.amount}`;
            const textWidth = ctx.measureText(textString).width;

            const toastWidth = 12 + 28 + 10 + textWidth + 16;
            const startX = ctx.canvas.width - toastWidth - 24;

            ui.drawPanel(startX, floatY, toastWidth, toastHeight, "rgba(25, 23, 20, 0.8)");

            const iconSheet = this.loader.get(toast.iconSheet || 'items');
            if (iconSheet) {
                const srcSize = 32;
                const dstSize = 28;
                const srcX = toast.iconCol * srcSize;
                const srcY = toast.iconRow * srcSize;
                
                ctx.drawImage(
                    iconSheet,
                    srcX, srcY, srcSize, srcSize,
                    startX + 12,
                    floatY + (toastHeight / 2) - (dstSize / 2),
                    dstSize, dstSize
                );
            }

            ui.drawText(
                textString,
                startX + 50,
                floatY + (toastHeight / 2),
                UITheme.fonts.cardTitle,
                UITheme.colors.success || "#4CAF50",
                "left",
                "middle"
            );
            ctx.globalAlpha = 1.0;
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

        if (btn.shortcut) {
            const badgeSize = 22;
            const bX = btn.x + 4;
            const bY = drawY + 4;
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
                srcX, srcY, iconSize, iconSize,
                dstX, dstY, iconSize, iconSize
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