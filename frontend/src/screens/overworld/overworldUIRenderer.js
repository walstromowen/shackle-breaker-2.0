import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { ItemDefinitions } from '../../../../shared/items/itemDefinitions.js';
import { ENTITY_DEFINITIONS } from '../../../../shared/characters/entityDefinitions.js';
import { MinimapRenderer } from '../../ui/minimapRenderer.js';
import { WorldStatusPlaque, plaqueRect } from './worldStatusPlaque.js';
import { gameState } from '../../../../shared/core/gameState.js';
import { DEV_FLAGS } from '../../../../shared/core/devCommands.js';
import { PARTY_PULL_RADIUS } from '../../../../shared/core/multiplayerParty.js';
import { multiplayerSocial } from '../../engine/multiplayerSocial.js';

// The hotbar: slot size, gap and the margin under it (the status plaque sits to its right, on the same line)
const HOTBAR = { SIZE: 104, GAP: 8, MARGIN: 24 };

export class OverworldUIRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;

        // Source cell size (px) of the item icon sheets used by pickup toasts
        this.ICON_SRC_SIZE = 64;

        // Minimap in the bottom-left corner (settings: CONFIG.MINIMAP)
        this.minimap = new MinimapRenderer(config);

        // Biome, day, clock and weather, top centre
        this.statusPlaque = new WorldStatusPlaque();
    }

    render(ctx, state) {
        // --- NEW: Added harvest variables to destructuring ---
        const { 
            hoveredHitboxId, isMenuOpen, menuToggleHitbox, dropdownHitboxes, 
            trackedQuests, toasts, facedObject, camera,
            isHarvesting, harvestTimer, harvestDuration, harvestTarget,
            hotbar, notice, skillPointReady, questReady, worldInfo
        } = state || {};

        const ui = new CanvasUI(ctx);

        // the dev console's /radius: the party pull radius round the player (a party member inside it is pulled into a fight or encounter I start)
        if (DEV_FLAGS.showPullRadius && camera) this.drawPullRadius(ctx, ui, camera);

        // --- Minimap (bottom-left). Needs state.worldManager and state.camera from the controller ---
        if (state && state.worldManager) {
            this.minimap.render(ctx, ui, state);
        }

        // The menu button stays "selected" (bar) while its dropdown is open; the one under the mouse is "highlighted"
        if (menuToggleHitbox) {
            // The Party and Journal buttons are hidden while the dropdown is closed, so their badge (a skill point to spend, a finished quest to collect) also sits on the menu button then
            this.drawSquareButton(ctx, ui, menuToggleHitbox, ui.flags(menuToggleHitbox.id, hoveredHitboxId, { selected: !!isMenuOpen }), (!!skillPointReady || !!questReady) && !isMenuOpen);
        }

        if (isMenuOpen && dropdownHitboxes) {
            for (const btn of dropdownHitboxes) {
                this.drawSquareButton(ctx, ui, btn, ui.flags(btn.id, hoveredHitboxId), (!!skillPointReady && btn.id === 'btn_party') || (!!questReady && btn.id === 'btn_journal'));
            }
        }

        if (trackedQuests && trackedQuests.length > 0) {
            this.drawQuestTracker(ctx, ui, trackedQuests);
        }

        // --- NEW: Draw Harvest Progress Bar OR Interaction Brackets ---
        if (isHarvesting && harvestTarget && camera) {
            // If actively harvesting, show the progress bar instead of standard interaction brackets
            this.drawHarvestProgressBar(ctx, ui, harvestTarget, harvestTimer, harvestDuration, camera);
        }

        // the status plaque (biome, day, clock, weather), bottom right beside the hotbar; the key prompt sits on it and the item toasts rise above both
        const plaque = worldInfo ? this.statusPlaqueRect(ctx.canvas, hotbar) : null;
        if (plaque) this.statusPlaque.render(ctx, ui, worldInfo, plaque);
        let floor = plaque ? plaque.y - 14 : ctx.canvas.height - HOTBAR.MARGIN;
        if (!(isHarvesting && harvestTarget) && facedObject && camera) {
            // what is in front of the player: an outline around it, and the key that uses it
            this.drawInteractionBrackets(ctx, ui, facedObject, camera);
            floor = this.drawInteractionTooltip(ctx, ui, ctx.canvas, facedObject, plaque ? plaque.y - 12 : null) - 12;
        }

        if (toasts && toasts.length > 0) {
            this.drawToasts(ctx, ui, toasts, floor);
        }

        if (hotbar && hotbar.length > 0) {
            this.drawHotbar(ctx, ui, hotbar, hoveredHitboxId, notice);
        }

        if (state && state.mpMessages && state.mpMessages.length) this.drawMultiplayerMessages(ctx, ui, state.mpMessages);
        if (state && state.mpParty) {
            const p = state.mpParty;
            ui.drawPanel(p.x, p.y, p.w, p.h, 'rgba(10, 11, 14, 0.85)');
            ui.drawStateBox(p.x, p.y, p.w, p.h, ui.flags(p.id, hoveredHitboxId), { inset: true });
            ui.drawText(p.text, p.x + p.w / 2, p.y + 31, UITheme.fonts.small, UITheme.colors.textHighlight, 'center', 'alphabetic', p.w - 30);
        }
        if (state && state.mpPrompt) this.drawMultiplayerPrompt(ctx, ui, state.mpPrompt);
    }

    /* Multiplayer: another player's request (Accept / Decline), or what to do with the player in front of you. */
    drawMultiplayerPrompt(ctx, ui, p) {
        ui.drawRect(0, 0, ctx.canvas.width, ctx.canvas.height, 'rgba(4, 4, 7, 0.45)', true);
        ui.drawPanel(p.x, p.y, p.w, p.h, UITheme.colors.bgScale[0]);
        ui.drawText(p.title, p.x + p.w / 2, p.y + 70, UITheme.fonts.sectionHeading, UITheme.colors.textHighlight, 'center', 'alphabetic', p.w - 60);
        ui.drawText(p.text, p.x + p.w / 2, p.y + 118, UITheme.fonts.small, UITheme.colors.textMain, 'center', 'alphabetic', p.w - 60);
        for (const o of p.options) ui.drawButton(o.x, o.y, o.w, o.h, o.label, ui.flags(o.hitId, p.focusId), { font: UITheme.fonts.medium });
    }

    /* Multiplayer: "Ann joined the world." and the like, top centre, fading out after a few seconds (engine/multiplayerSession.js). */
    drawMultiplayerMessages(ctx, ui, messages) {
        const cx = ctx.canvas.width / 2;
        let y = 76;   // under the party plaque
        ctx.save();
        for (const m of messages) {
            ctx.globalAlpha = Math.max(0, Math.min(1, m.alpha));
            ctx.font = UITheme.fonts.body;
            const w = ctx.measureText(m.text).width + 48;
            ui.drawPanel(cx - w / 2, y, w, 48, 'rgba(10, 11, 14, 0.85)');
            ui.drawText(m.text, cx, y + 33, UITheme.fonts.body, UITheme.colors.textHighlight, 'center');
            y += 58;
        }
        ctx.restore();
    }

    /* Where the status plaque is: bottom right, to the right of the hotbar (its right edge is worked out from the same numbers the hotbar uses). */
    statusPlaqueRect(canvas, hotbar) {
        let hotbarRight = 0;
        if (hotbar && hotbar.length > 0) {
            const total = hotbar.length * HOTBAR.SIZE + (hotbar.length - 1) * HOTBAR.GAP;
            hotbarRight = Math.round((canvas.width - total) / 2) + total;
        }
        return plaqueRect(canvas.width, canvas.height, hotbarRight);
    }

    // --- HOTBAR: a row of slots at the bottom centre of the screen (keys 1-9 and 0, or click) ---
    // The slots' hitboxes belong to the controller; they are placed here, from the real canvas size, every frame, so what is drawn is what is clicked.
    drawHotbar(ctx, ui, slots, hoveredId, notice) {
        // The item sheets are 64 px cells, so the icon is drawn 1:1 (ICON = 64) on whole pixels, centred in a slot with a margin round it.
        // (It used to be squeezed into 44 px, which made it soft, and the key / count text was larger than the boxes it sat in.)
        const { SIZE, GAP, MARGIN } = HOTBAR, ICON = 64;
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
                const ix = x + Math.floor((SIZE - ICON) / 2), iy = y + Math.floor((SIZE - ICON) / 2);
                const found = ui.resolveItemSheet(this.loader, slot.icon.sheet || 'items');
                if (found) {
                    const src = found.cell || this.ICON_SRC_SIZE;
                    ctx.globalAlpha = out ? 0.3 : 1;
                    ctx.imageSmoothingEnabled = false;   // 64 -> 64: a straight copy of the cell, crisp
                    ctx.drawImage(found.sheet, slot.icon.col * src, slot.icon.row * src, src, src, ix, iy, ICON, ICON);
                    ctx.globalAlpha = 1;
                }

                // the count, bottom right, with a dark edge so it reads on top of any icon
                ctx.font = UITheme.fonts.small;
                ctx.textAlign = "right";
                ctx.textBaseline = "alphabetic";
                ctx.lineJoin = "round";
                ctx.lineWidth = 5;
                ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
                ctx.strokeText(String(slot.qty), x + SIZE - 8, y + SIZE - 8);
                ctx.fillStyle = out ? UITheme.colors.error : UITheme.colors.textHighlight;
                ctx.fillText(String(slot.qty), x + SIZE - 8, y + SIZE - 8);
            }

            // key badge, top left
            const badge = 28;   // big enough for the 24 px key font (it was 18, smaller than its own text)
            ui.drawPanel(x + 3, y + 3, badge, badge, "rgba(0, 0, 0, 0.7)");
            ui.drawStyled('badge', slot.key, x + 3 + badge / 2, y + 3 + badge / 2 + 1);

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
        // (each plate sits on the one below it, with the same gap: drawMessageBox returns where it was drawn)
        const cx = ctx.canvas.width / 2;
        let stackY = baseY - 14;
        if (notice) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, notice.left / 400));
            const box = ui.drawMessageBox(notice.text, cx, stackY, { kind: notice.ok ? undefined : 'error', bottom: true, maxWidth: ctx.canvas.width - 200 });
            ctx.restore();
            stackY = box.y - UITheme.messageBox.gap;
        }
        if (hovered && hovered.defId) {
            ui.drawMessageBox(hovered.name, cx, stackY, { kind: 'info', bottom: true, maxWidth: ctx.canvas.width - 200 });
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
        // the map renderer measured what it drew (MapRenderer.screenRectOf): the outline follows the art itself, not its tiles or hitbox
        if (facedObject._screenRect) return this._drawOutline(ctx, facedObject._screenRect);
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
        // A soft brass outline that breathes (the corner brackets are retired everywhere in the UI)
        ctx.strokeStyle = UITheme.colors.borderHighlight || "#C2A14F";
        ctx.lineWidth = 2;
        ctx.shadowColor = UITheme.colors.borderHighlight || "#C2A14F";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.roundRect(screenX - padding, drawY - padding, drawW + (padding * 2), drawH + (padding * 2), 8);
        ctx.stroke();
        ctx.restore();
    }

    /* The breathing brass outline around a box on screen (x, y, w, h in canvas pixels). */
    _drawOutline(ctx, r) {
        const wave = (Math.sin(performance.now() / 350) + 1) / 2;
        const pad = 6 + wave * 6;
        ctx.save();
        ctx.globalAlpha = 0.6 + (1 - wave) * 0.4;
        ctx.strokeStyle = UITheme.colors.borderHighlight || "#C2A14F";
        ctx.lineWidth = 2;
        ctx.shadowColor = UITheme.colors.borderHighlight || "#C2A14F";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.roundRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2, 8);
        ctx.stroke();
        ctx.restore();
    }

    /* /radius: a square of PARTY_PULL_RADIUS tiles each way round the player's tile (the same test as multiplayerSocial.nearbyParty), and who of
       the party is inside it now. */
    drawPullRadius(ctx, ui, camera) {
        const { GAME_SCALE, TILE_SIZE: T } = this.config;
        const scale = GAME_SCALE * (ctx.canvas.width / 800);
        const W = ctx.canvas.width, H = ctx.canvas.height;
        const col = gameState.player.col, row = gameState.player.row, R = PARTY_PULL_RADIUS;
        const sx = (c) => (c * T - camera.x) * scale + W / 2 - T * scale / 2;
        const sy = (r) => (r * T - camera.y) * scale + H / 2 - T * scale / 2;
        const x0 = sx(col - R), y0 = sy(row - R), x1 = sx(col + R + 1), y1 = sy(row + R + 1);
        const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.004);
        ctx.save();
        ctx.fillStyle = 'rgba(89, 212, 255, 0.07)';
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.strokeStyle = `rgba(89, 212, 255, ${0.5 + 0.4 * pulse})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([14, 8]);
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
        ctx.restore();
        const near = multiplayerSocial.nearbyParty().map(id => multiplayerSocial.nameOf(id));
        const all = multiplayerSocial.partyPlayers().length;
        const text = `Party pull radius: ${R} tiles  ·  ${all ? (near.length ? `pulled in: ${near.join(', ')}` : 'no party member inside') : 'not in a party'}`;
        // below the party plaque (top centre) when the square reaches past the top of the screen
        const ly = Math.max(118, y0 - 14);
        const tw = Math.min(W - 40, ctx.measureText ? (ctx.font = UITheme.fonts.bold, ctx.measureText(text).width + 40) : 900);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(W / 2 - tw / 2, ly - 30, tw, 42);
        ui.drawText(text, W / 2, ly, UITheme.fonts.bold, '#9fe6ff', 'center');
    }

    /* The key prompt ("SPACE  Enter"), bottom right; `bottom` is where its lower edge goes (on top of the status plaque). Returns its top edge. */
    drawInteractionTooltip(ctx, ui, canvas, facedObject, bottom = null) {
    if (!facedObject) return bottom ?? canvas.height;

    // --- NEW: Dynamic Interaction Text ---
    let text = "Interact"; // Default fallback
    if (facedObject.interaction && facedObject.interaction.type) {
      switch (facedObject.interaction.type.toUpperCase()) {
        case 'PICKUP': text = "Pick Up"; break;
        case 'HARVEST': text = "Harvest"; break;
        case 'WARP': text = "Enter"; break;
        case 'GRAVE': text = "Dig Up"; break;
        case 'PLAYER': text = "Trade, Party, Duel"; break;
        case 'CRAFTING_STATION':
        case 'WORKSHOP': text = "Craft"; break;
        default:
          text = facedObject.interaction.type.charAt(0).toUpperCase() + facedObject.interaction.type.slice(1).toLowerCase();
          break;
      }
    }

    const shortcut = "SPACE";
    const margin = 24;
    const height = 60;
    const badgeHeight = 34;
    const padding = 16;

    ctx.save();
    // 1. Measure the shortcut text to dynamically size the black box
    ctx.font = UITheme.text.badge.font;
    const shortcutWidth = ctx.measureText(shortcut).width;
    const badgeWidth = Math.max(52, shortcutWidth + 16); // at least 52px wide, plus 8px padding on each side

    // 2. Measure the main text
    ctx.font = UITheme.text.body.font;
    const textWidth = ctx.measureText(text).width;

    const gap = 16;
    const width = padding + badgeWidth + gap + textWidth + padding + 8;
    const startX = canvas.width - width - margin;
    const startY = (bottom ?? canvas.height - margin) - height;

    const bgColor = UITheme.messageBox.bg;
    ui.drawPanel(startX, startY, width, height, bgColor);

    const badgeX = startX + padding;
    const badgeY = startY + (height / 2) - (badgeHeight / 2);
    ui.drawPanel(badgeX, badgeY, badgeWidth, badgeHeight, "rgba(0, 0, 0, 0.7)");

    ui.drawStyled('badge', shortcut, badgeX + (badgeWidth / 2), badgeY + (badgeHeight / 2) + 1,   // +1 minor adjustment to visually center text
      { color: UITheme.colors.textMuted });

    const textX = badgeX + badgeWidth + gap;
    ui.drawStyled('body', text, textX, startY + (height / 2), { baseline: 'middle' });

    ctx.restore();
    return startY;
  }

    /* `floor` is the y the lowest toast's bottom edge starts from (just above the status plaque), and they float up from there. */
    drawToasts(ctx, ui, toasts, floor = ctx.canvas.height - 24) {
        const now = performance.now();
        // Icon is drawn 1:1 with the 64px source cells; the panel grows around it
        const iconSize = 64;
        const padX = 16;
        const padY = 12;
        const iconGap = 18;
        const toastHeight = iconSize + (padY * 2);
        const baseY = floor - toastHeight;

        for (let i = toasts.length - 1; i >= 0; i--) {
            const toast = toasts[i];
            const elapsed = now - toast.createdAt;
            if (elapsed > toast.duration) continue;

            const progress = elapsed / toast.duration;
            const activeIndex = toasts.length - 1 - i;
            const floatY = baseY - (progress * 40) - (activeIndex * (toastHeight + 12));

            let alpha = 1;
            if (progress < 0.1) alpha = progress / 0.1;
            else if (progress > 0.8) alpha = 1 - ((progress - 0.8) / 0.2);

            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            ctx.font = UITheme.text.cardTitle.font;
            const textString = `+${toast.amount}`;
            const textWidth = ctx.measureText(textString).width;

            const toastWidth = padX + iconSize + iconGap + textWidth + padX + 8;
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

            ui.drawStyled('cardTitle', textString, startX + padX + iconSize + iconGap, floatY + (toastHeight / 2),
                { color: UITheme.colors.success, baseline: 'middle' });
            ctx.globalAlpha = 1.0;
        }
    }

    /* The words of one objective: its own description, or "Defeat Wolf" / "Collect Bone" worked out from its type and target. */
    questObjectiveText(obj) {
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
        return descText || "Objective";
    }

    /* The quest tracker. A quest name or an objective that is too long for the box wraps onto more lines (the box grows to hold them) instead of running
       out of it; an objective's count (2/3) stays on its first line, and its words wrap before they reach it. */
    layoutQuestTracker(ui, quests, trackerWidth, innerPadding) {
        const ctx = ui.ctx;
        const titleFont = UITheme.text.heading.font, labelFont = UITheme.text.cardLabel.font;
        const inner = trackerWidth - innerPadding * 2;
        return quests.map(quest => {
            const name = quest.name || quest.title || "Unknown Quest";
            const titleLines = ui.getWrappedLines(name, inner, titleFont);
            const objectives = (quest.objectives || []).map(obj => {
                const progressText = `${obj.current}/${obj.required}`;
                ctx.save();
                ctx.font = labelFont;
                const progressW = ctx.measureText(progressText).width;
                ctx.restore();
                const textX = 8, room = inner - textX - progressW - 16;
                return { obj, progressText, lines: ui.getWrappedLines(`- ${this.questObjectiveText(obj)}`.replace(/\n/g, ' '), room, labelFont) };
            });
            return { titleLines, objectives };
        });
    }

    drawQuestTracker(ctx, ui, quests) {
        const padding = 24;
        const trackerWidth = 420;
        const startX = ctx.canvas.width - trackerWidth - padding;
        const innerPadding = 20;
        const titleHeight = 40;
        const titleExtra = 38;   // each further line of a wrapped quest name
        const lineHeight = 32;
        const lineExtra = 26;    // each further line of a wrapped objective
        const questGap = 22;
        const layout = this.layoutQuestTracker(ui, quests, trackerWidth, innerPadding);
        let totalHeight = innerPadding;
        for (const q of layout) {
            totalHeight += titleHeight + (q.titleLines.length - 1) * titleExtra;
            for (const o of q.objectives) totalHeight += lineHeight + (o.lines.length - 1) * lineExtra;
            totalHeight += questGap;
        }

        ui.drawPanel(startX, padding, trackerWidth, totalHeight, "rgba(15, 15, 18, 0.88)");
        let currentY = padding + innerPadding;

        for (const q of layout) {
            q.titleLines.forEach((line, i) => {
                ui.drawStyled('heading', line, startX + innerPadding, currentY + (titleHeight / 2) - 2 + i * titleExtra, { baseline: 'middle' });
            });
            currentY += titleHeight + (q.titleLines.length - 1) * titleExtra;
            // a hairline under each quest's name, so the objectives read as that quest's
            ctx.save();
            ctx.strokeStyle = UITheme.colors.borderHighlight;
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.moveTo(startX + innerPadding, Math.round(currentY - 6) + 0.5);
            ctx.lineTo(startX + trackerWidth - innerPadding, Math.round(currentY - 6) + 0.5);
            ctx.stroke();
            ctx.restore();

            for (const { obj, progressText, lines } of q.objectives) {
                const isComplete = obj.current >= obj.required;
                const textColor = isComplete ? UITheme.colors.success : UITheme.colors.textMain;
                lines.forEach((line, i) => {
                    // the continuation lines sit under the words, not under the dash
                    ui.drawStyled('cardLabel', i === 0 ? line : `  ${line}`, startX + innerPadding + 8, currentY + (lineHeight / 2) + i * lineExtra,
                        { color: textColor, baseline: 'middle' });
                });
                ui.drawStyled('cardLabel', progressText, startX + trackerWidth - innerPadding, currentY + (lineHeight / 2),
                    { color: textColor, align: 'right', baseline: 'middle' });
                currentY += lineHeight + (lines.length - 1) * lineExtra;
            }
            currentY += questGap;
        }
    }

    // flags from ui.flags(): highlighted = under the mouse, selected = its dropdown is open
    // badge: a pulsing gold star in the corner (a skill point is waiting on the Party screen, or a finished quest in the Journal)
    drawSquareButton(ctx, ui, btn, flags = {}, badge = false) {
        const textColor = ui.stateTextColor(flags, UITheme.colors.textMain);
        const drawY = btn.y;

        ui.drawPanel(btn.x, drawY, btn.w, btn.h, "rgba(25, 23, 20, 0.4)");
        ui.drawStateBox(btn.x, drawY, btn.w, btn.h, flags, { inset: true });

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
        ui.drawStyled('badge', btn.label, centerX, textY, { color: textColor });

        // the key's badge goes on last, over the icon (the wide "Esc" one reaches into it)
        if (btn.shortcut) {
            const badgeSize = 22;
            const badgeW = btn.shortcut.length > 1 ? 46 : badgeSize;   // "Esc" is wider than a letter
            const bX = btn.x + 4;
            const bY = drawY + 4;
            ui.drawPanel(bX, bY, badgeW, badgeSize, "rgba(0, 0, 0, 0.7)");
            ui.drawStyled('badge', btn.shortcut, bX + (badgeW / 2), bY + (badgeSize / 2), { color: UITheme.colors.textMuted });
        }

        if (badge) this.drawSkillPointBadge(ctx, btn.x + btn.w - 14, drawY + 14);
    }

    /** A small pulsing gold disc with a star, centred on (cx, cy). */
    drawSkillPointBadge(ctx, cx, cy) {
        const pulse = (Math.sin(performance.now() * 0.006) + 1) / 2;   // 0..1
        const r = 17 + pulse * 2;
        ctx.save();
        ctx.shadowColor = `rgba(255, 210, 90, ${0.45 + pulse * 0.4})`;
        ctx.shadowBlur = 14 + pulse * 8;
        ctx.fillStyle = '#e6b93c';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#1a1710';
        ctx.stroke();
        ctx.fillStyle = '#1a1710';
        ctx.font = 'bold 24px "Georgia", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2605', cx, cy + 1);
        ctx.restore();
    }
}