import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { Formatting } from '../../../../shared/utils/formatting.js';

export class LevelUpRenderer {
    constructor(ctx, config, loader) {
        this.ctx = ctx;
        this.config = config;
        this.loader = loader;
        this.ui = new CanvasUI(ctx);
        this.hitboxes = [];

        this.layout = {
            p: 48, startY: 48, titleOffsetY: 64, contentOffsetY: 72,
            portraitSize: 250, attrRowHeight: 50, attrBlockWidth: 624,
            btnWidth: 216, btnHeight: 84, btnSpacing: 36
        };
    }

    render(state) {
        this.hitboxes = [];
        const { member, availablePoints, pendingAllocations, currentStats, previewStats, hoveredElement, selectedElementId } = state;

        if (!member) return;

        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;
        this.ui.clearScreen(w, h);
        // The one lit element: the controller gives the mouse hover in mouse mode and the keyboard cursor in keyboard mode,
        // so only one of them is ever set
        const hoveredId = (hoveredElement ? hoveredElement.id : null) || selectedElementId || null;

        const { p, startY } = this.layout;
        const panelHeight = h - startY - 144;   // the bottom-left corner under the panels belongs to the Back button
        const halfW = Math.floor(w / 2);
        const colW = halfW - (p * 1.5);
        const leftColX = p;
        const rightColX = halfW + (p * 0.5);

        this.ui.drawPanel(leftColX, startY, colW, panelHeight, UITheme.colors.bgScale[0]);
        this.ui.drawPanel(rightColX, startY, colW, panelHeight, UITheme.colors.bgScale[1]);

        this._renderCharacterColumn(
            member, availablePoints, pendingAllocations, hoveredId, selectedElementId, leftColX, startY, colW, panelHeight
        );
        this._renderStatsColumn(
            currentStats, previewStats, rightColX, startY, colW, panelHeight
        );
        this._drawActionButtons(
            availablePoints, pendingAllocations, hoveredId, selectedElementId, leftColX, startY + panelHeight, colW
        );

        if (state.onLayoutUpdate) {
            state.onLayoutUpdate(this.hitboxes);
        }
    }

    _renderCharacterColumn(member, availablePoints, pendingAllocations, hoveredId, selectedId, x, y, w, h) {
        const TITLE_Y = y + this.layout.titleOffsetY;
        const CONTENT_START_Y = TITLE_Y + this.layout.contentOffsetY;
        const centerX = x + (w / 2);

        const titleStr = member.name || "Level Up";
        this.ctx.font = UITheme.text.columnLabel.font;
        const titleWidth = this.ctx.measureText(titleStr).width;

        this.ui.drawStyled('columnLabel', titleStr, centerX, TITLE_Y);
        const lvlText = `Level ${member.level || 1} ${member.class || ''}`;
        this.ui.drawStyled('columnLabel', lvlText, centerX + (titleWidth / 2) + 20, TITLE_Y, { align: 'left', upper: false });
        this.ui.drawLineWithGothicFlourish(centerX - 120, TITLE_Y + 29, 240, UITheme.colors.borderHighlight);

        let currentY = CONTENT_START_Y;

        const pointsColor = availablePoints > 0 ? UITheme.colors.success : UITheme.colors.textMuted;
        this.ui.drawStyled('heading', `Unspent Points: ${availablePoints}`, centerX, currentY, { color: pointsColor, align: 'center' });
        currentY += 40;

        const pSize = this.layout.portraitSize;
        const portraitX = Math.floor(centerX - (pSize / 2));
        const img = this.loader.get(member.spritePortrait);

        this.ui.drawLancetArchedPanel(portraitX, currentY, pSize, pSize * 1.25, UITheme.colors.bgScale[2], UITheme.colors.borderHighlight);

        if (img) {
            const scaledSize = 128 * 2;
            const centeredX = portraitX + (pSize / 2) - (scaledSize / 2);
            const centeredY = currentY + ((pSize * 1.25) / 2) - (scaledSize / 2);
            this.ui.drawSprite(img, 0, 0, 128, 128, centeredX, centeredY, scaledSize, scaledSize);
        } else {
            this.ui.drawText("?", centerX, currentY + (pSize * 0.7), UITheme.fonts.header, UITheme.colors.textMuted, "center");
        }

        currentY += (pSize * 1.25) + 36;

        const attributes = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];
        const startX = centerX - (this.layout.attrBlockWidth / 2);

        attributes.forEach((attr, index) => {
            const rowY = currentY + (index * this.layout.attrRowHeight);
            const textY = rowY + 32;

            if (index % 2 === 0) {
                this.ui.drawRect(startX - 24, rowY, this.layout.attrBlockWidth + 48, this.layout.attrRowHeight, "rgba(255, 255, 255, 0.02)", true);
            }

            this.ui.drawStyled('body', Formatting.capitalize(attr), startX, textY);

            const currentVal = member.attributes?.[attr] || 0;
            const pendingVal = pendingAllocations[attr];

            this.ui.drawStyled('value', currentVal.toString(), startX + 264, textY, { align: 'center' });

            if (pendingVal > 0) {
                this.ui.drawText(`+${pendingVal}`, startX + 312, textY, UITheme.fonts.mono, UITheme.colors.success, "left");
            }

            // --- SUB BUTTON (-) ---
            const canSub = pendingVal > 0;
            const subId = `SUB_${attr.toUpperCase()}`;
            this.ui.drawButton(startX + 456, rowY + 5, 40, 40, "-",
                this.ui.flags(subId, hoveredId, { disabled: !canSub }),
                { font: UITheme.fonts.bold, bg: "rgba(0,0,0,0.4)", color: UITheme.colors.textMain, inset: true });

            const subBox = { id: subId, x: startX + 456, y: rowY + 5, w: 40, h: 40 };
            if (!canSub) subBox.hoverSfx = 'none'; // no hover sound when it can't be used
            this.hitboxes.push(subBox);

            // --- ADD BUTTON (+) ---
            const canAdd = availablePoints > 0;
            const addId = `ADD_${attr.toUpperCase()}`;
            this.ui.drawButton(startX + 540, rowY + 5, 40, 40, "+",
                this.ui.flags(addId, hoveredId, { disabled: !canAdd }),
                { font: UITheme.fonts.bold, bg: "rgba(0,0,0,0.4)", color: UITheme.colors.success, inset: true });

            const addBox = { id: addId, x: startX + 540, y: rowY + 5, w: 40, h: 40 };
            if (!canAdd) addBox.hoverSfx = 'none'; // no hover sound when it can't be used
            this.hitboxes.push(addBox);
        });
    }

    _renderStatsColumn(currentStats, previewStats, x, y, w, h) {
        if (!currentStats || !previewStats) return;

        const TITLE_Y = y + this.layout.titleOffsetY;
        const CONTENT_START_Y = TITLE_Y + this.layout.contentOffsetY;
        const centerX = x + (w / 2);

        this.ui.drawStyled('columnLabel', 'Projected Stats', centerX, TITLE_Y);
        this.ui.drawLineWithGothicFlourish(centerX - 120, TITLE_Y + 29, 240, UITheme.colors.borderHighlight);

        let currentY = CONTENT_START_Y;
        const startX = x + this.layout.p;
        const colW = w - (this.layout.p * 2);

        this.ui.drawStyled('heading', 'Vitals', startX, currentY);
        currentY += 10;
        this.ui.drawLineWithGothicFlourish(startX, currentY, colW, UITheme.colors.borderHighlight);
        currentY += 32;

        currentY = this._drawStatDiffRow("Max HP", currentStats.maxHp?.total, previewStats.maxHp?.total, startX, currentY, colW, 42);
        currentY = this._drawStatDiffRow("Max STM", currentStats.maxStamina?.total, previewStats.maxStamina?.total, startX, currentY, colW, 42);
        currentY = this._drawStatDiffRow("Max INS", currentStats.maxInsight?.total, previewStats.maxInsight?.total, startX, currentY, colW, 42);
        currentY += 15;

        this.ui.drawStyled('heading', 'Combat Stats', startX, currentY);
        currentY += 10;
        this.ui.drawLineWithGothicFlourish(startX, currentY, colW, UITheme.colors.borderHighlight);
        currentY += 32;

        const combatStats = [
            { label: "SPD", c: currentStats.speed, p: previewStats.speed },
            { label: "CRT %", c: (currentStats.critChance || 0)*100, p: (previewStats.critChance || 0)*100, isPct: true },
            { label: "HP REC", c: currentStats.hpRecovery, p: previewStats.hpRecovery },
            { label: "CRT DMG", c: currentStats.critMultiplier, p: previewStats.critMultiplier },
            { label: "STM REC", c: currentStats.staminaRecovery, p: previewStats.staminaRecovery },
            { label: "ACC", c: currentStats.accuracy, p: previewStats.accuracy },
            { label: "INS REC", c: currentStats.insightRecovery, p: previewStats.insightRecovery },
            { label: "EVA", c: currentStats.evasion, p: previewStats.evasion },
            { label: "COR", c: currentStats.corruption, p: previewStats.corruption }
        ];

        const cColW = colW / 2;
        const rowH = 32;
        combatStats.forEach((stat, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const itemX = startX + (col * cColW);
            const itemY = currentY + (row * rowH);

            let cVal = stat.c !== undefined ? stat.c : 0;
            let pVal = stat.p !== undefined ? stat.p : 0;
            let cStr = stat.isPct ? `${cVal.toFixed(0)}%` : cVal.toString();
            let pStr = stat.isPct ? `${pVal.toFixed(0)}%` : pVal.toString();

            this.ui.drawStyled('label', stat.label, itemX, itemY);
            this.ui.drawStyled('value', cStr, itemX + 145, itemY);

            if (cVal !== pVal) {
                let arrowColor = (pVal > cVal) ? UITheme.colors.success : UITheme.colors.failure;
                this.ctx.font = UITheme.fonts.mono;
                const cWidth = this.ctx.measureText(cStr).width;
                const arrowX = itemX + 145 + cWidth + 12;
                this.ui.drawArrow(arrowX, itemY - 8, 6, 'right', arrowColor);
                this.ui.drawText(pStr, arrowX + 15, itemY, UITheme.fonts.mono, arrowColor, "left");
            }
        });

        currentY += (Math.ceil(combatStats.length / 2) * rowH) + 24;
        this._drawProjectedResistanceTable(currentStats, previewStats, startX, currentY, colW);
    }

    _drawStatDiffRow(label, curr = 0, prev = 0, x, y, w, rowH = 48) {
        this.ui.drawStyled('label', label, x, y);
        const valX = x + (w * 0.4);
        this.ui.drawStyled('value', curr.toString(), valX, y, { align: 'right' });

        if (curr !== prev) {
            let arrowColor = (prev > curr) ? UITheme.colors.success : UITheme.colors.failure;
            const arrowX = valX + 25;
            this.ui.drawArrow(arrowX, y - 8, 8, 'right', arrowColor);
            this.ui.drawText(prev.toString(), arrowX + 20, y, UITheme.fonts.mono, arrowColor, "left");
        }
        return y + rowH;
    }

    _drawProjectedResistanceTable(cStats, pStats, x, y, w) {
        let currentY = y;
        const colType = x;
        const colAtk = x + (w * 0.35);
        const colDef = x + (w * 0.60);
        const colRes = x + (w * 0.85);

        this.ui.drawStyled('tableHeader', 'Type', colType, currentY);
        this.ui.drawStyled('tableHeader', 'Atk', colAtk, currentY, { color: UITheme.colors.attack, align: 'center' });
        this.ui.drawStyled('tableHeader', 'Def', colDef, currentY, { color: UITheme.colors.defense, align: 'center' });
        this.ui.drawStyled('tableHeader', 'Res', colRes, currentY, { color: UITheme.colors.resistance, align: 'center' });
        currentY += 10;
        this.ui.drawLineWithGothicFlourish(x, currentY, w, UITheme.colors.border);
        currentY += 30;

        const types = ["blunt", "slash", "pierce", "fire", "ice", "lightning", "water", "earth", "wind", "light", "dark", "arcane"];
        const rowH = 30;

        types.forEach((type) => {
            const cAtk = (cStats.attack || {})[type] || 0;
            const pAtk = (pStats.attack || {})[type] || 0;
            const cDef = (cStats.defense || {})[type] || 0;
            const pDef = (pStats.defense || {})[type] || 0;
            const cRes = (cStats.resistance || {})[type] || 0;
            const pRes = (pStats.resistance || {})[type] || 0;

            if (pAtk === 0 && pDef === 0 && pRes === 0 && cAtk === 0 && cDef === 0 && cRes === 0) return;

            const label = Formatting.getAbbreviation(type);
            this.ui.drawText(label, colType, currentY, UITheme.fonts.mono, UITheme.colors.textMuted, "left");

            const drawCell = (curr, prev, xPos, defaultColor, isPct = false) => {
                if (prev === 0 && curr === 0) {
                    this.ui.drawText("-", xPos, currentY, UITheme.fonts.mono, UITheme.colors.textMuted, "center");
                    return;
                }
                const cStr = isPct ? `${(curr * 100).toFixed(0)}%` : `${curr}`;
                const pStr = isPct ? `${(prev * 100).toFixed(0)}%` : `${prev}`;

                if (curr === prev) {
                    this.ui.drawText(cStr, xPos, currentY, UITheme.fonts.mono, defaultColor, "center");
                } else {
                    let arrowColor = (prev > curr) ? UITheme.colors.success : UITheme.colors.failure;
                    this.ctx.font = UITheme.fonts.mono;
                    const cWidth = this.ctx.measureText(cStr).width;
                    const pWidth = this.ctx.measureText(pStr).width;
                    const arrowSize = 6;
                    const space = 8;
                    const totalWidth = cWidth + space + (arrowSize * 2) + space + pWidth;
                    const startX = xPos - (totalWidth / 2);

                    this.ui.drawStyled('value', cStr, startX, currentY);
                    const arrowX = startX + cWidth + space + arrowSize;
                    this.ui.drawArrow(arrowX, currentY - 8, arrowSize, 'right', arrowColor);
                    this.ui.drawText(pStr, arrowX + arrowSize + space, currentY, UITheme.fonts.mono, arrowColor, "left");
                }
            };

            drawCell(cAtk, pAtk, colAtk, UITheme.colors.attack);
            drawCell(cDef, pDef, colDef, UITheme.colors.defense);
            drawCell(cRes, pRes, colRes, UITheme.colors.resistance, true);
            currentY += rowH;
        });
    }

    _drawActionButtons(availablePoints, pendingAllocations, hoveredId, selectedId, x, bottomY, w) {
        const btnW = this.layout.btnWidth;
        const btnH = this.layout.btnHeight;
        const spacing = this.layout.btnSpacing;
        const btnY = bottomY - btnH - this.layout.p;
        const centerX = x + (w / 2);

        const hasPending = Object.values(pendingAllocations).some(v => v > 0);
        const startX = centerX - btnW - (spacing / 2);

        const drawBtn = (id, label, btnX, isClickable, defaultCol) => {
            this.ui.drawButton(btnX, btnY, btnW, btnH, label,
                this.ui.flags(id, hoveredId, { disabled: !isClickable }),
                { bg: "rgba(0,0,0,0.6)", color: defaultCol });

            const box = { id, x: btnX, y: btnY, w: btnW, h: btnH };
            if (!isClickable) box.hoverSfx = 'none'; // no hover sound when it can't be used
            this.hitboxes.push(box);
        };

        drawBtn('BTN_RESET', "Reset", startX, hasPending, hasPending ? UITheme.colors.textMain : UITheme.colors.textMuted);
        drawBtn('BTN_CONFIRM', "Confirm", startX + btnW + spacing, hasPending, hasPending ? UITheme.colors.success : UITheme.colors.textMuted);

        // Back: the same button, in the same bottom-left corner, as every other screen (it is still the BTN_CANCEL hitbox)
        const bb = UITheme.backButtonBox();
        this.ui.drawBackButton(hoveredId, bb, 'BTN_CANCEL');
        this.hitboxes.push({ id: 'BTN_CANCEL', x: bb.x, y: bb.y, w: bb.w, h: bb.h });
    }
}