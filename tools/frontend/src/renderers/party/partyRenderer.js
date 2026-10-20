import { UITheme } from '../../ui/UITheme.js';
import { CanvasUI } from '../../ui/canvasUI.js';

export class PartyRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader;
        this.ui = new CanvasUI(ctx);

        this.layout = {
            cardW: 600,
            cardH: 336,
            gapX: 24,
            gapY: 48,
            startY: 216
        };

        this.menuConfig = {
            btnHeight: 64,
            padding: 24
        };

        this.statusIconSheetPath = '/assets/ui/status_icons.png';
        // On-screen size of a status icon (draw size, not source size)
        this.statusIconSize = 32;

        // Source cell sizes (px) on the sprite sheets
        this.STATUS_ICON_SRC_SIZE = 64;
        this.PORTRAIT_SRC_SIZE = 128;
    }

    render(state) {
        const {
            members,
            selectedIndex,
            swappingIdx,
            menu,
            mode = 'DEFAULT',
            activeIndices = [],
            hoveredElement = null,
            dragState = null,
            exileConfirm = null,
            notice = null,
            onLayoutUpdate = null
        } = state;

        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;
        const hitboxes = [];

        this.ui.clearScreen(width, height);

        const headerText = mode === 'BATTLE_SELECT' ? "Select Reserve to Swap In" : "Party Members";
        this.ui.drawStyled('title', headerText, width / 2, 120);
        this.ui.drawLineWithGothicFlourish((width / 2) - 288, 156, 576, UITheme.colors.borderHighlight);

        members.forEach((member, index) => {
            if (index >= 6) return;
            const pos = this.getCardPosition(index, width);

            // --- SFX ACTIVATION ON HOTSPOTS ---
            hitboxes.push({
                id: `CARD_${index}`,
                x: pos.x,
                y: pos.y,
                w: this.layout.cardW,
                h: this.layout.cardH,
                cursor: 'pointer',
// Standard hover tick
   // Standard confirm boom
            });

            // Evaluates true whether moving via keyboard (swappingIdx) or mouse (dragState)
            const isBeingDragged = dragState?.active && dragState.payload === member;
            const isBeingMoved = (index === swappingIdx) || isBeingDragged;

            // highlighted = the one focused card (mouse hover or keyboard cursor, never both). While a context menu is open
            // the menu owns the focus, and the card it belongs to stays marked as selected.
            const flags = this.ui.flags(`CARD_${index}`, (menu || exileConfirm) ? null : hoveredElement?.id, {
                selected: isBeingMoved || (!!menu && index === selectedIndex)
            });
            const isHolding = swappingIdx !== null || !!dragState?.active;
            const isDropTarget = isHolding && flags.highlighted && !isBeingMoved;

            const isActive = activeIndices.includes(index);
            const isDead = member.hp <= 0;
            const isUnavailable = mode === 'BATTLE_SELECT' && (isActive || isDead);

            this.drawCard(member, pos.x, pos.y, flags, isBeingMoved, isDropTarget, isUnavailable, isActive, mode);
        });

        if (menu) {
            const layout = this.getMenuLayout(selectedIndex, width);
            menu.padding = this.menuConfig.padding;
            menu.btnHeight = this.menuConfig.btnHeight;
            this.ui.drawContextMenu(menu, layout, hitboxes, hoveredElement?.id);
        }

        let guide = "";
        if (mode === 'BATTLE_SELECT') {
            guide = "[ARROWS] Navigate   [ENT/CLICK] Select   [ESC/R-CLICK] Cancel";
        } else {
            guide = "[ARROWS] Navigate   [ENT/CLICK] Swap & Menu   [ESC/R-CLICK] Back";
            if (exileConfirm) {
                guide = "[ARROWS] Choose   [ENT/CLICK] Select   [ESC/R-CLICK] Cancel";
            } else if (menu) {
                guide = "[UP/DOWN] Choose   [ENT/CLICK] Select   [ESC/R-CLICK] Cancel";
            } else if (swappingIdx !== null || (dragState && dragState.active)) {
                guide = "[ARROWS] Move to Slot   [ENT/CLICK] Place   [ESC/R-CLICK] Cancel";
            }
        }

        this.ui.drawStyled('hint', guide, width / 2, height - 72);
        if (notice && !exileConfirm) this.ui.drawStyled('notice', notice, width / 2, height - 132, { kind: 'error', align: 'center' });

        // The exile prompt sits on top of everything; its hitboxes replace the screen's, so nothing underneath can be clicked
        if (exileConfirm) {
            hitboxes.length = 0;
            this._drawExileConfirm(exileConfirm, width, height, hitboxes, hoveredElement?.id);
        }

        // Fire hitboxes back up to controller before dragging renders
        if (onLayoutUpdate) {
            onLayoutUpdate(hitboxes);
        }

        // Draw the dragged card overlay on top of EVERYTHING
        this._renderDraggedItem(dragState);
    }

    _drawExileConfirm(confirm, width, height, hitboxes, focusId) {
        const ui = this.ui;
        const w = 960, h = 432;
        const x = Math.round((width - w) / 2), y = Math.round((height - h) / 2);

        ui.drawRect(0, 0, width, height, 'rgba(0, 0, 0, 0.72)', true);
        ui.drawPopupPanel(x, y, w, h);

        ui.drawStyled('title', 'Exile Party Member?', width / 2, y + 96);
        ui.drawLineWithGothicFlourish(width / 2 - 240, y + 126, 480, UITheme.colors.borderHighlight);

        ui.drawStyled('heading', confirm.name, width / 2, y + 190, { align: 'center' });
        ui.drawStyled('description', 'They will leave your party for good. This cannot be undone.', width / 2, y + 252, { align: 'center' });

        const btnW = 288, btnH = 80, gap = 48;
        const by = y + h - btnH - 48;
        const bx = Math.round(width / 2 - btnW - gap / 2);
        const buttons = [
            { id: 'EXILE_NO', label: 'Cancel', x: bx, color: undefined },
            { id: 'EXILE_YES', label: 'Exile', x: bx + btnW + gap, color: UITheme.colors.error }
        ];
        buttons.forEach(b => {
            hitboxes.push({ id: b.id, x: b.x, y: by, w: btnW, h: btnH, cursor: 'pointer' });
            ui.drawButton(b.x, by, btnW, btnH, b.label, ui.flags(b.id, focusId), { color: b.color });
        });
    }

    getMenuLayout(cardIndex, canvasWidth) {
        const cardPos = this.getCardPosition(cardIndex, canvasWidth);
        return {
            x: cardPos.x,
            y: cardPos.y,
            w: this.layout.cardW / 2,
            h: this.layout.cardH
        };
    }

    getCardPosition(index, canvasWidth) {
        const COLS = 3;
        const { cardW, cardH, gapX, gapY, startY } = this.layout;

        const totalGridWidth = (COLS * cardW) + ((COLS - 1) * gapX);
        const startX = (canvasWidth - totalGridWidth) / 2;

        const col = index % COLS;
        const row = Math.floor(index / COLS);

        return {
            x: startX + (col * (cardW + gapX)),
            y: startY + (row * (cardH + gapY))
        };
    }

    // flags: { highlighted, pressed, selected } from ui.flags()
    //   highlighted  the focused card (gold wash + brackets)
    //   selected     the card the open menu belongs to, or the card being moved (bar down the left edge)
    // isDropTarget: a card is being carried and this is where it would land
    drawCard(member, x, y, flags, isBeingMoved, isDropTarget, isUnavailable, isActive, mode) {
        const ctx = this.ctx;
        const { cardW, cardH } = this.layout;

        ctx.save();

        // --- 1. BACKGROUND, THEN THE SHARED STATE LOOK ---
        this.ui.drawPanel(x, y, cardW, cardH, UITheme.colors.panelBg);

        // A card that cannot be picked right now keeps its red wash and dimmed contents; it can still be focused
        if (isUnavailable) {
            this.ui.drawRect(x, y, cardW, cardH, 'rgba(100, 0, 0, 0.2)', true);
            this.ui.drawRect(x, y, cardW, cardH, 'rgba(0, 0, 0, 0.6)', true);
        }

        if (isDropTarget) {
            this.ui.drawDropTarget(x, y, cardW, cardH, !isUnavailable);
        } else {
            this.ui.drawStateBox(x, y, cardW, cardH, flags);
        }

        // The card being carried is drawn dim, so the gap it left (and the drop target) read clearly
        if (isBeingMoved) ctx.globalAlpha = 0.5;

        let nameColor = this.ui.stateTextColor(flags, UITheme.colors.textMain);
        if (isUnavailable) nameColor = UITheme.colors.textMuted;

        if (member.skillPoints && member.skillPoints > 0 && !isUnavailable) {
            const time = performance.now() * 0.005;
            const alpha = 0.5 + (Math.sin(time) + 1) * 0.25;
            const goldRgb = "184, 153, 71";
            this.ui.drawText("★ LVL UP", x + cardW - 19, y + cardH - 24, UITheme.fonts.cardTitle, `rgba(${goldRgb}, ${alpha})`, "right");
        }

        const pSize = 256;
        const pX = x + 10;
        const pY = y + 14;

        const masterSheet = this.loader.get(member.spritePortrait);

        this.ui.drawRect(pX, pY, pSize, pSize, "rgba(0,0,0,0.5)", true);

        if (masterSheet) {
            const src = this.PORTRAIT_SRC_SIZE;
            ctx.drawImage(masterSheet, 0, 0, src, src, pX, pY, pSize, pSize);
        }

        this.ui.drawRect(pX, pY, pSize, pSize, UITheme.colors.border, false);

        this.drawStatusEffects(member, pX, pY, pSize);

        // --- 3. DRAW TEXT WITH STATE COLORS ---
        const infoX = pX + pSize + 19;
        const numberWidth = 91;
        const labelWidth = 48;
        const barW = cardW - (pX - x) - pSize - 19 - labelWidth - numberWidth - 19;

        this.ui.drawStyled('cardTitle', member.name, infoX, y + 43, { color: nameColor });

        const levelText = `Lv.${member.level || 1}`;
        let statusPrefix = "";
        let statusColor = UITheme.colors.textMuted;

        if (isActive && mode === 'BATTLE_SELECT') {
            statusPrefix = "ACT - ";
            statusColor = UITheme.colors.hp;
        } else if (member.hp <= 0) {
            statusPrefix = "FNT - ";
            statusColor = UITheme.colors.failure;
        }

        this.ui.drawStyled('cardLabel', `${statusPrefix}${levelText}`, infoX, y + 77, { color: statusColor });

        const xpY = y + 113;
        this.ui.drawStyled('cardValue', 'XP', infoX, xpY + 12, { color: UITheme.colors.textMuted });
        this.ui.drawBar(infoX + labelWidth, xpY, barW, 10, member.xp || 0, member.maxXp || 1, UITheme.colors.xp, UITheme.colors.xpDim);
        this.ui.drawText(`${Math.floor(member.xp || 0)}/${member.maxXp || 1}`, infoX + labelWidth + barW + numberWidth, xpY + 12, UITheme.fonts.cardMono, UITheme.colors.textMuted, "right");

        let currentY = y + 144;
        this.drawStatRow("HP", member.hp, member.maxHp, infoX, currentY, barW, 10, numberWidth, labelWidth, UITheme.colors.hp, UITheme.colors.hpDim);
        currentY += 29;
        this.drawStatRow("STM", member.stamina, member.maxStamina, infoX, currentY, barW, 10, numberWidth, labelWidth, UITheme.colors.stm, UITheme.colors.stmDim);
        currentY += 29;
        this.drawStatRow("INS", member.insight, member.maxInsight, infoX, currentY, barW, 10, numberWidth, labelWidth, UITheme.colors.ins, UITheme.colors.insDim);

        ctx.restore();
    }

    drawStatRow(label, current, max, x, y, barW, h, numW, labelW, color, dimColor) {
        this.ui.drawStyled('cardValue', label, x, y + 12, { color: UITheme.colors.textMuted });
        this.ui.drawBar(x + labelW, y, barW, h, current, max, color, dimColor);
        this.ui.drawText(`${Math.floor(current)}/${max}`, x + labelW + barW + numW, y + 12, UITheme.fonts.cardMono, UITheme.colors.textMuted, "right");
    }

    drawStatusEffects(member, pX, pY, pSize) {
        if (!member.statusEffects || member.statusEffects.length === 0) return;

        const sheetKey = 'statusEffects';
        const srcSize = this.STATUS_ICON_SRC_SIZE; // Source cell size on the sheet (64x64)
        const drawSize = 32;                       // On-screen size
        const spacing = 5;

        const sheet = this.loader.get ? this.loader.get(sheetKey) : this.loader.getAsset(sheetKey);

        let drawX = pX + 5;
        let drawY = pY + pSize - drawSize - 5;

        member.statusEffects.forEach(effect => {
            this.ui.drawRect(drawX, drawY, drawSize, drawSize, 'rgba(0, 0, 0, 0.8)', true);
            this.ui.drawRect(drawX, drawY, drawSize, drawSize, UITheme.colors.border, false);

            if (sheet && effect.icon) {
                this.ctx.drawImage(
                    sheet,
                    effect.icon.col * srcSize, effect.icon.row * srcSize, srcSize, srcSize,
                    drawX, drawY, drawSize, drawSize
                );
            } else {
                this.ui.drawStyled('badge', effect.name.charAt(0), drawX + (drawSize / 2), drawY + (drawSize / 2) + 2);
            }

            if (effect.stacks && effect.stacks > 1) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                this.ctx.beginPath();
                this.ctx.arc(drawX + drawSize, drawY + drawSize, 14, 0, Math.PI * 2);
                this.ctx.fill();
                this.ui.drawStyled('badge', effect.stacks.toString(), drawX + drawSize, drawY + drawSize + 2, { font: UITheme.fonts.cardMono, color: UITheme.colors.textOnIcon });
            }

            drawX += (drawSize + spacing);
            if (drawX + drawSize > pX + pSize) return;
        });
    }

    _renderDraggedItem(dragState) {
        if (!dragState || !dragState.active || !dragState.payload) return;

        const { x, y, payload } = dragState;
        const ctx = this.ctx;

        // 128 draw size = exact 1x scaling of the 128px portrait
        const pSize = 128;

        ctx.save();
        ctx.globalAlpha = 0.85;

        const masterSheet = this.loader.get(payload.spritePortrait);

        const drawX = x - (pSize / 2);
        const drawY = y - (pSize / 2);

        this.ui.drawRect(drawX, drawY, pSize, pSize, "rgba(0,0,0,0.6)", true);

        if (masterSheet) {
            const src = this.PORTRAIT_SRC_SIZE;
            ctx.drawImage(masterSheet, 0, 0, src, src, drawX, drawY, pSize, pSize);
        }

        this.ui.drawRect(drawX, drawY, pSize, pSize, UITheme.colors.borderHighlight, false);

        ctx.restore();
    }
}
