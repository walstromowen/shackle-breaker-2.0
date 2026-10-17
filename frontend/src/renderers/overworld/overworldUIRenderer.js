import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';
import { ENTITY_DEFINITIONS } from '../../../../shared/data/entityDefinitions.js';
import { MinimapRenderer } from './minimapRenderer.js';

export class OverworldUIRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;

        // Source cell size (px) of the item icon sheets used by pickup toasts
        this.ICON_SRC_SIZE = 64;

        // Minimap in the bottom-left corner (settings: CONFIG.MINIMAP)
        this.minimap = new MinimapRenderer(config);
    }

    render(ctx, state) {
        // --- NEW: Added harvest variables to destructuring ---
        const { 
            hoveredHitboxId, isMenuOpen, menuToggleHitbox, dropdownHitboxes, 
            trackedQuests, toasts, facedObject, camera,
            isHarvesting, harvestTimer, harvestDuration, harvestTarget,
            hotbar, notice
        } = state || {};

        const ui = new CanvasUI(ctx);

        // --- Minimap (bottom-left). Needs state.worldManager and state.camera from the controller ---
        if (state && state.worldManager) {
            this.minimap.render(ctx, ui, state);
        }

        // The menu button stays "selected" (bar) while its dropdown is open; the one under the mouse is "highlighted"
        if (menuToggleHitbox) {
            this.drawSquareButton(ctx, ui, menuToggleHitbox, ui.flags(menuToggleHitbox.id, hoveredHitboxId, { selected: !!isMenuOpen }));
        }

        if (isMenuOpen && dropdownHitboxes) {
            for (const btn of dropdownHitboxes) {
                this.drawSquareButton(ctx, ui, btn, ui.flags(btn.id, hoveredHitboxId));
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

        if (hotbar && hotbar.length > 0) {
            this.drawHotbar(ctx, ui, hotbar, hoveredHitboxId, notice);
        }
    }

    // --- HOTBAR: a row of slots at the bottom centre of the screen (keys 1-9 and 0, or click) ---
    // The slots' hitboxes belong to the controller; they are placed here, from the real canvas size, every frame, so what is drawn is what is clicked.
    drawHotbar(ctx, ui, slots, hoveredId, notice) {
        const SIZE = 68, GAP = 6, MARGIN = 24, ICON = 44;
        const total = slots.length * SIZE + (slots.length - 1) * GAP;
        const startX = Math.round((ctx.canvas.width - total) / 2);
        const baseY = ctx.canvas.height - MARGIN - SIZE;
        let hovered = null;

        ctx.save();
        for (const slot of slots) {
            const x = startX + slot.index * (SIZE + GAP);
            const flags = slot.hitbox ? ui.flags(slot.hitbox.id, hoveredId) : {};
            if (slot.hitbox) { slot.hitbox.x = x; slot.hitbox.y = baseY; slot.hitbox.w = SIZE; slot.hitbox.h = SIZE; }
            if (flags.highlighted) hovered = slot;

            const y = baseY;
            const out = slot.defId && slot.qty <= 0;
            ui.drawPanel(x, y, SIZE, SIZE, slot.defId ? "rgba(25, 23, 20, 0.6)" : "rgba(25, 23, 20, 0.35)");
            // The shared state look (slots sit close together, so the brackets are drawn inside)
            ui.drawStateBox(x, y, SIZE, SIZE, flags, { inset: true });

            if (slot.icon) {
                const found = ui.resolveItemSheet(this.loader, slot.icon.sheet || 'items');
                if (found) {
                    const src = found.cell || this.ICON_SRC_SIZE;
                    ctx.globalAlpha = out ? 0.3 : 1;
                    ctx.drawImage(found.sheet, slot.icon.col * src, slot.icon.row * src, src, src, x + (SIZE - ICON) / 2, y + (SIZE - ICON) / 2, ICON, ICON);
                    ctx.globalAlpha = 1;
                }
                ui.drawText(
                    String(slot.qty), x + SIZE - 6, y + SIZE - 12,
                    UITheme.fonts.cardSmall, out ? (UITheme.colors.error || "#e57373") : UITheme.colors.textMain, "right", "middle"
                );
            }

            // key badge, top left
            const badge = 18;
            ui.drawPanel(x + 4, y + 4, badge, badge, "rgba(0, 0, 0, 0.7)");
            ui.drawText(slot.key, x + 4 + badge / 2, y + 4 + badge / 2 + 1, UITheme.fonts.cardSmall, UITheme.colors.textMuted || "#AAAAAA", "center", "middle");

            // a short flash when the slot was just used (gold: it worked, red: it did not)
            if (slot.flash > 0) {
                ctx.globalAlpha = slot.flash * 0.45;
                ctx.fillStyle = slot.flashOk ? "#FFD700" : "#d9534f";
                ctx.fillRect(x, y, SIZE, SIZE);
                ctx.globalAlpha = 1;
            }
        }
        ctx.restore();

        // the name of the hovered item, and the last line of feedback, above the row
        let lineY = baseY - 18;
        if (notice) {
            let alpha = Math.min(1, notice.left / 400);
            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.font = UITheme.fonts.body || "16px sans-serif";
            const w = ctx.measureText(notice.text).width + 32;
            ui.drawPanel(Math.round((ctx.canvas.width - w) / 2), lineY - 18, w, 36, "rgba(25, 23, 20, 0.8)");
            ui.drawText(notice.text, ctx.canvas.width / 2, lineY, UITheme.fonts.body || "16px sans-serif",
                notice.ok ? UITheme.colors.textMain : (UITheme.colors.error || "#e57373"), "center", "middle");
            ctx.restore();
            lineY -= 44;
        }
        if (hovered && hovered.defId) {
            ctx.save();
            ctx.font = UITheme.fonts.body || "16px sans-serif";
            const label = hovered.name;
            const w = ctx.measureText(label).width + 32;
            ui.drawPanel(Math.round((ctx.canvas.width - w) / 2), lineY - 18, w, 36, "rgba(65, 58, 50, 0.85)");
            ui.drawText(label, ctx.canvas.width / 2, lineY, UITheme.fonts.body || "16px sans-serif", UITheme.colors.states.highlightText, "center", "middle");
            ctx.restore();
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

        // Fill (Success color)
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
        case 'PICKUP': text = "Pick Up"; break;
        case 'HARVEST': text = "Harvest"; break;
        case 'WARP': text = "Enter"; break;
        case 'CRAFTING_STATION':
        case 'WORKSHOP': text = "Craft"; break;
        default:
          text = facedObject.interaction.type.charAt(0).toUpperCase() + facedObject.interaction.type.slice(1).toLowerCase();
          break;
      }
    }

    const shortcut = "SPACE";
    const margin = 24;
    const height = 44;
    const badgeHeight = 26; 
    const padding = 12;

    ctx.save();
    // 1. Measure the shortcut text to dynamically size the black box
    ctx.font = UITheme.fonts.cardSmall || "12px sans-serif";
    const shortcutWidth = ctx.measureText(shortcut).width;
    const badgeWidth = Math.max(52, shortcutWidth + 16); // at least 52px wide, plus 8px padding on each side

    // 2. Measure the main text
    ctx.font = UITheme.fonts.body || "16px sans-serif";
    const textWidth = ctx.measureText(text).width;

    const gap = 10;
    const width = padding + badgeWidth + gap + textWidth + padding;
    const startX = canvas.width - width - margin;
    const startY = canvas.height - height - margin;

    const bgColor = "rgba(65, 58, 50, 0.8)";
    ui.drawPanel(startX, startY, width, height, bgColor);

    const badgeX = startX + padding;
    const badgeY = startY + (height / 2) - (badgeHeight / 2);
    ui.drawPanel(badgeX, badgeY, badgeWidth, badgeHeight, "rgba(0, 0, 0, 0.7)");

    ui.drawText(
      shortcut,
      badgeX + (badgeWidth / 2),
      badgeY + (badgeHeight / 2) + 1, // +1 minor adjustment to visually center text
      UITheme.fonts.cardSmall || "12px sans-serif",
      UITheme.colors.textMuted || "#AAAAAA",
      "center",
      "middle"
    );

    const textX = badgeX + badgeWidth + gap;
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
        // Icon is drawn 1:1 with the 64px source cells; the panel grows around it
        const iconSize = 64;
        const padX = 12;
        const padY = 8;
        const iconGap = 14;
        const toastHeight = iconSize + (padY * 2);
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

            const toastWidth = padX + iconSize + iconGap + textWidth + 16;
            const startX = ctx.canvas.width - toastWidth - 24;

            ui.drawPanel(startX, floatY, toastWidth, toastHeight, "rgba(25, 23, 20, 0.8)");

            // toast.iconSheet names a sheet (e.g. 'consumables'); resolve it the same way every
            // other item icon is resolved so alternate sheet keys still work
            const found = ui.resolveItemSheet(this.loader, toast.iconSheet || 'items');
            if (found) {
                const srcSize = found.cell || this.ICON_SRC_SIZE;
                const srcX = toast.iconCol * srcSize;
                const srcY = toast.iconRow * srcSize;

                ctx.drawImage(
                    found.sheet,
                    srcX, srcY, srcSize, srcSize,
                    startX + padX,
                    floatY + padY,
                    iconSize, iconSize
                );
            }

            ui.drawText(
                textString,
                startX + padX + iconSize + iconGap,
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
            const questDisplayName = quest.name || quest.title || "Unknown Quest";

            ui.drawText(
                questDisplayName, 
                startX + 16, 
                currentY + (titleHeight / 2), 
                UITheme.fonts.body, 
                UITheme.colors.textHighlight, 
                "left", 
                "middle"
            );
            currentY += titleHeight;

            if (quest.objectives) {
                for (const obj of quest.objectives) {
                    const progressText = `${obj.current}/${obj.required}`;
                    const isComplete = obj.current >= obj.required;
                    const textColor = isComplete ? UITheme.colors.success : UITheme.colors.textMain;
                    let descText = obj.description;

                    // Dynamically resolve target names if there is no hardcoded description
                    if (!descText && obj.type) {
                        let actionText = "Objective";
                        let targetText = obj.targetId;

                        if (obj.type === 'kill_enemy') {
                            actionText = "Defeat";
                            const entityDef = ENTITY_DEFINITIONS ? (ENTITY_DEFINITIONS[obj.targetId] || ENTITY_DEFINITIONS[String(obj.targetId).toUpperCase()]) : null;
                            targetText = entityDef?.name || targetText;
                        } else if (obj.type === 'obtain_item') {
                            actionText = "Collect";
                            const itemDef = ItemDefinitions ? (ItemDefinitions[obj.targetId] || ItemDefinitions[String(obj.targetId).toUpperCase()]) : null;
                            targetText = itemDef?.name || targetText;
                        } else if (obj.type === 'craft') {
                            actionText = "Craft";
                            const itemDef = ItemDefinitions ? (ItemDefinitions[obj.targetId] || ItemDefinitions[String(obj.targetId).toUpperCase()]) : null;
                            targetText = itemDef?.name || targetText;
                        } else if (obj.type === 'party_level') {
                            actionText = "Reach Level";
                            targetText = obj.targetLevel;
                        }

                        // Fallback formatting if definitions fail to load
                        if (typeof targetText === 'string' && targetText === obj.targetId) {
                            targetText = targetText.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                        }

                        descText = `${actionText} ${targetText}`;
                    }

                    ui.drawText(
                        `- ${descText || "Objective"}`, 
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

    // flags from ui.flags(): highlighted = under the mouse, selected = its dropdown is open
    drawSquareButton(ctx, ui, btn, flags = {}) {
        const textColor = ui.stateTextColor(flags, UITheme.colors.textMain);
        const drawY = btn.y;

        ui.drawPanel(btn.x, drawY, btn.w, btn.h, "rgba(25, 23, 20, 0.4)");
        ui.drawStateBox(btn.x, drawY, btn.w, btn.h, flags, { inset: true });

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
