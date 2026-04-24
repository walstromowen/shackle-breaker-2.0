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
        // Changed to 32 for exact 1x scaling (was 38)
        this.statusIconSize = 32;
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
            onLayoutUpdate = null
        } = state;

        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;
        const hitboxes = [];

        this.ui.clearScreen(width, height);

        const headerText = mode === 'BATTLE_SELECT' ? "Select Reserve to Swap In" : "Party Members";
        this.ui.drawText(headerText, width / 2, 120, UITheme.fonts.header, UITheme.colors.textMain, "center");
        this.ui.drawLineWithGothicFlourish((width / 2) - 288, 156, 576, UITheme.colors.borderHighlight);

        members.forEach((member, index) => {
            if (index >= 6) return;

            const pos = this.getCardPosition(index, width);

            hitboxes.push({
                id: `CARD_${index}`,
                x: pos.x,
                y: pos.y,
                w: this.layout.cardW,
                h: this.layout.cardH,
                cursor: 'pointer'
            });

            const isHovered = hoveredElement?.id === `CARD_${index}`;
            const isSelected = (index === selectedIndex);

            // Evaluates true whether moving via keyboard (swappingIdx) or mouse (dragState)
            const isBeingDragged = dragState?.active && dragState.payload === member;
            const isBeingMoved = (index === swappingIdx) || isBeingDragged;

            const isActive = activeIndices.includes(index);
            const isDead = member.hp <= 0;
            const isUnavailable = mode === 'BATTLE_SELECT' && (isActive || isDead);

            this.drawCard(member, pos.x, pos.y, isSelected, isHovered, isBeingMoved, isUnavailable, isActive, mode);
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
            if (menu) {
                guide = "[UP/DOWN] Choose   [ENT/CLICK] Select   [ESC/R-CLICK] Cancel";
            } else if (swappingIdx !== null || (dragState && dragState.active)) {
                guide = "[ARROWS] Move to Slot   [ENT/CLICK] Place   [ESC/R-CLICK] Cancel";
            }
        }

        this.ui.drawText(guide, width / 2, height - 72, UITheme.fonts.mono, UITheme.colors.textMuted, "center");

        // Fire hitboxes back up to controller before dragging renders
        if (onLayoutUpdate) {
            onLayoutUpdate(hitboxes);
        }

        // Draw the dragged card overlay on top of EVERYTHING
        this._renderDraggedItem(dragState);
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

    drawCard(member, x, y, isSelected, isHovered, isBeingMoved, isUnavailable, isActive, mode) {
        const ctx = this.ctx;
        const { cardW, cardH } = this.layout;

        ctx.save();

        // --- 1. RESOLVE GLOBAL STATES ---
        let bgColor = UITheme.colors.panelBg;
        let nameColor = UITheme.colors.textMain;
        let drawBrackets = false;
        let bracketColor = UITheme.colors.borderHighlight;
        let strokeColor = null;

        if (isBeingMoved) {
            bgColor = UITheme.colors.stmDim;
            strokeColor = UITheme.colors.stm;
        } else if (isSelected) {
            bgColor = isUnavailable ? 'rgba(100, 0, 0, 0.2)' : UITheme.colors.states.focusBg;
            nameColor = isUnavailable ? UITheme.colors.textMuted : UITheme.colors.states.focusText;
            drawBrackets = true;
            bracketColor = isUnavailable ? UITheme.colors.failure : UITheme.colors.borderHighlight;
        } else if (isHovered) {
            bgColor = isUnavailable ? 'rgba(100, 0, 0, 0.2)' : UITheme.colors.states.hoverBg;
            nameColor = isUnavailable ? UITheme.colors.textMuted : UITheme.colors.states.hoverText;
        }

        // --- 2. DRAW BACKGROUNDS & BORDERS ---
        this.ui.drawPanel(x, y, cardW, cardH, bgColor);

        if (strokeColor) {
            this.ui.drawRect(x, y, cardW, cardH, strokeColor, false);
        }

        if (drawBrackets) {
            this.ui.drawSelectionBrackets(x, y, cardW, cardH, 10, bracketColor);
        }

        if (isUnavailable) {
            this.ui.drawRect(x, y, cardW, cardH, 'rgba(0, 0, 0, 0.6)', true);
        }

        if (member.skillPoints && member.skillPoints > 0 && !isUnavailable) {
            const time = performance.now() * 0.005;
            const alpha = 0.5 + (Math.sin(time) + 1) * 0.25;
            const goldRgb = "184, 153, 71";
            this.ui.drawText("★ LVL UP", x + cardW - 19, y + cardH - 24, UITheme.fonts.cardTitle, `rgba(${goldRgb}, ${alpha})`, "right");
        }

        // Changed to 256 for exact 2x scaling (was 307)
        const pSize = 256;
        const pX = x + 10;
        const pY = y + 14;

        const masterSheet = this.loader.get(member.spritePortrait);
        this.ui.drawRect(pX, pY, pSize, pSize, "rgba(0,0,0,0.5)", true);
        if (masterSheet) {
            ctx.drawImage(masterSheet, 0, 0, 128, 128, pX, pY, pSize, pSize);
        }
        this.ui.drawRect(pX, pY, pSize, pSize, UITheme.colors.border, false);

        this.drawStatusEffects(member, pX, pY, pSize);

        // --- 3. DRAW TEXT WITH STATE COLORS ---
        const infoX = pX + pSize + 19;
        const numberWidth = 91;
        const labelWidth = 48;
        const barW = cardW - (pX - x) - pSize - 19 - labelWidth - numberWidth - 19;

        this.ui.drawText(member.name, infoX, y + 43, UITheme.fonts.cardTitle, nameColor);

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

        this.ui.drawText(`${statusPrefix}${levelText}`, infoX, y + 77, UITheme.fonts.cardSmall, statusColor);

        const xpY = y + 113;
        this.ui.drawText("XP", infoX, xpY + 12, UITheme.fonts.cardMono, UITheme.colors.textMuted);
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
        this.ui.drawText(label, x, y + 12, UITheme.fonts.cardMono, UITheme.colors.textMuted);
        this.ui.drawBar(x + labelW, y, barW, h, current, max, color, dimColor);
        this.ui.drawText(`${Math.floor(current)}/${max}`, x + labelW + barW + numW, y + 12, UITheme.fonts.cardMono, UITheme.colors.textMuted, "right");
    }

    drawStatusEffects(member, pX, pY, pSize) {
        if (!member.statusEffects || member.statusEffects.length === 0) return;

        const sheetKey = 'statusEffects';
        const srcSize = 32; // Changed to 32 for exact 1x scaling (was 38)
        const drawSize = 32;
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
                    effect.icon.col * srcSize,
                    effect.icon.row * srcSize,
                    srcSize,
                    srcSize,
                    drawX,
                    drawY,
                    drawSize,
                    drawSize
                );
            } else {
                this.ui.drawText(effect.name.charAt(0), drawX + (drawSize / 2), drawY + (drawSize / 2) + 2, UITheme.fonts.cardSmall, UITheme.colors.textMain, "center", "middle");
            }

            if (effect.stacks && effect.stacks > 1) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                this.ctx.beginPath();
                this.ctx.arc(drawX + drawSize, drawY + drawSize, 14, 0, Math.PI * 2);
                this.ctx.fill();
                this.ui.drawText(effect.stacks.toString(), drawX + drawSize, drawY + drawSize + 2, UITheme.fonts.cardMono, "white", "center", "middle");
            }

            drawX += (drawSize + spacing);
            if (drawX + drawSize > pX + pSize) return;
        });
    }

    _renderDraggedItem(dragState) {
        if (!dragState || !dragState.active || !dragState.payload) return;

        const { x, y, payload } = dragState;
        const ctx = this.ctx;
        // Changed to 128 for exact 1x scaling (was 120)
        const pSize = 128;

        ctx.save();
        ctx.globalAlpha = 0.85;

        const masterSheet = this.loader.get(payload.spritePortrait);
        const drawX = x - (pSize / 2);
        const drawY = y - (pSize / 2);

        this.ui.drawRect(drawX, drawY, pSize, pSize, "rgba(0,0,0,0.6)", true);
        if (masterSheet) {
            ctx.drawImage(masterSheet, 0, 0, 128, 128, drawX, drawY, pSize, pSize);
        }
        this.ui.drawRect(drawX, drawY, pSize, pSize, UITheme.colors.borderHighlight, false);

        ctx.restore();
    }
}