import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { drawStatTooltip, statAt } from '../../ui/statTooltip.js';
import { Formatting } from '../../../../shared/core/formatting.js';
import { isCursed, drawCursedPortrait } from '../../ui/curseOverlay.js';
import { CorruptionSystem } from '../../../../shared/characters/corruptionSystem.js';

export class LevelUpRenderer {
    constructor(ctx, config, loader) {
        this.ctx = ctx;
        this.config = config;
        this.loader = loader;
        this.ui = new CanvasUI(ctx);
        this.hitboxes = [];

        this.layout = {
            p: 48, startY: 48, titleOffsetY: 64, contentOffsetY: 72,
            portraitSize: 224, attrRowHeight: 50, attrBlockWidth: 624,
            btnWidth: 216, btnHeight: 76, btnSpacing: 36
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
            availablePoints, pendingAllocations, hoveredId, selectedElementId, leftColX, startY + panelHeight, colW, this._attrRowsEndY
        );

        this._drawStatHelp(state, hoveredId);

        if (state.onLayoutUpdate) {
            state.onLayoutUpdate(this.hitboxes);
        }
    }

    // The card that says what the attribute under the mouse / the keyboard cursor does. The ADD_/SUB_ buttons name their attribute;
    // the rest of a row is found with the mouse position (keyboard mode has no mouse hover, so a stale pointer is ignored).
    _drawStatHelp(state, focusId) {
        let attr = null;
        const m = /^(?:ADD|SUB)_([A-Z]+)$/.exec(focusId || '');
        if (m) {
            attr = m[1].toLowerCase();
        } else if (!state.selectedElementId && state.mouse) {
            attr = Object.keys(this._attrRects || {}).find(k => {
                const r = this._attrRects[k];
                return state.mouse.x >= r.x && state.mouse.x <= r.x + r.w && state.mouse.y >= r.y && state.mouse.y <= r.y + r.h;
            }) || null;
        }
        const rect = attr && this._attrRects ? this._attrRects[attr] : null;
        if (!rect) {
            // not an attribute: one of the projected stats on the right (the card goes to its left, over the character column)
            const stat = !state.selectedElementId ? statAt(this._statRects, state.mouse) : null;
            if (stat) drawStatTooltip(this.ui, stat, this._statRects[stat], { placement: 'left', multipliers: state.member?.statMultipliers || state.member?.state?.statMultipliers });
            return;
        }
        drawStatTooltip(this.ui, attr, this._attrBlock, { placement: 'above', gap: 2, width: 800, multipliers: state.member?.statMultipliers || state.member?.state?.statMultipliers });
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
            if (isCursed(member)) drawCursedPortrait(this.ui.ctx, img, 0, 0, 128, 128, centeredX, centeredY, scaledSize, scaledSize);
            else this.ui.drawSprite(img, 0, 0, 128, 128, centeredX, centeredY, scaledSize, scaledSize);
        } else {
            this.ui.drawText("?", centerX, currentY + (pSize * 0.7), UITheme.fonts.header, UITheme.colors.textMuted, "center");
        }

        currentY += (pSize * 1.25) + 36;

        const attributes = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];
        const startX = centerX - (this.layout.attrBlockWidth / 2);
        this._attrRects = {};
        // all five rows as one block: the help card sits above it, over the portrait, so it never hides the Projected Stats next door
        this._attrBlock = { x: startX - 24, y: currentY, w: this.layout.attrBlockWidth + 48, h: attributes.length * this.layout.attrRowHeight };

        attributes.forEach((attr, index) => {
            const rowY = currentY + (index * this.layout.attrRowHeight);
            const textY = rowY + 32;
            // The whole row (name, number and both buttons) explains itself: see _drawStatHelp
            this._attrRects[attr] = { x: startX - 24, y: rowY, w: this.layout.attrBlockWidth + 48, h: this.layout.attrRowHeight };

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

        // where the attribute rows end: the Reset / Confirm buttons sit below this, inside the panel
        this._attrRowsEndY = currentY + attributes.length * this.layout.attrRowHeight;
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
        this._statRects = {}; // stat id -> rect, so hovering a projected stat can say what it is (see _drawStatHelp)

        this.ui.drawStyled('heading', 'Vitals', startX, currentY);
        currentY += 10;
        this.ui.drawLineWithGothicFlourish(startX, currentY, colW, UITheme.colors.borderHighlight);
        currentY += 30;

        currentY = this._drawStatDiffRow("Max HP", currentStats.maxHp?.total, previewStats.maxHp?.total, startX, currentY, colW, 36, 'maxHp');
        currentY = this._drawStatDiffRow("Max STM", currentStats.maxStamina?.total, previewStats.maxStamina?.total, startX, currentY, colW, 36, 'maxStamina');
        currentY = this._drawStatDiffRow("Max INS", currentStats.maxInsight?.total, previewStats.maxInsight?.total, startX, currentY, colW, 36, 'maxInsight');
        currentY += 10;

        this.ui.drawStyled('heading', 'Combat Stats', startX, currentY);
        currentY += 10;
        this.ui.drawLineWithGothicFlourish(startX, currentY, colW, UITheme.colors.borderHighlight);
        currentY += 30;

        const combatStats = [
            { id: "speed", label: "SPD", c: currentStats.speed, p: previewStats.speed },
            { id: "critChance", label: "CRT %", c: (currentStats.critChance || 0)*100, p: (previewStats.critChance || 0)*100, isPct: true },
            { id: "hpRecovery", label: "HP REC", c: currentStats.hpRecovery, p: previewStats.hpRecovery },
            { id: "critMultiplier", label: "CRT DMG", c: currentStats.critMultiplier, p: previewStats.critMultiplier },
            { id: "staminaRecovery", label: "STM REC", c: currentStats.staminaRecovery, p: previewStats.staminaRecovery },
            { id: "accuracy", label: "ACC", c: currentStats.accuracy, p: previewStats.accuracy },
            { id: "insightRecovery", label: "INS REC", c: currentStats.insightRecovery, p: previewStats.insightRecovery },
            { id: "evasion", label: "EVA", c: currentStats.evasion, p: previewStats.evasion },
            { id: "corruption", label: "COR", c: currentStats.corruption, p: previewStats.corruption, isPct: true }
        ].filter(stat => stat.id !== "corruption" || CorruptionSystem.isRevealed());   // corruption is a secret until act 2

        const cColW = colW / 2;
        const rowH = 32;
        combatStats.forEach((stat, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const itemX = startX + (col * cColW);
            const itemY = currentY + (row * rowH);
            this._statRects[stat.id] = { x: itemX - 12, y: itemY - 24, w: cColW - 12, h: rowH };

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

        currentY += (Math.ceil(combatStats.length / 2) * rowH) + 16;
        this._drawProjectedResistanceTable(currentStats, previewStats, startX, currentY, colW);
    }

    _drawStatDiffRow(label, curr = 0, prev = 0, x, y, w, rowH = 48, id = null) {
        if (id) this._statRects[id] = { x: x - 12, y: y - 26, w: w * 0.6, h: rowH };
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
        const rowH = 28;

        types.forEach((type) => {
            const cAtk = (cStats.attack || {})[type] || 0;
            const pAtk = (pStats.attack || {})[type] || 0;
            const cDef = (cStats.defense || {})[type] || 0;
            const pDef = (pStats.defense || {})[type] || 0;
            const cRes = (cStats.resistance || {})[type] || 0;
            const pRes = (pStats.resistance || {})[type] || 0;

            if (pAtk === 0 && pDef === 0 && pRes === 0 && cAtk === 0 && cDef === 0 && cRes === 0) return;

            // each figure explains itself: 'attack:fire', 'defense:fire', 'resistance:fire'
            const cellW = w * 0.25;
            this._statRects[`attack:${type}`] = { x: colAtk - cellW / 2, y: currentY - 22, w: cellW, h: rowH };
            this._statRects[`defense:${type}`] = { x: colDef - cellW / 2, y: currentY - 22, w: cellW, h: rowH };
            this._statRects[`resistance:${type}`] = { x: colRes - cellW / 2, y: currentY - 22, w: cellW, h: rowH };

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

    _drawActionButtons(availablePoints, pendingAllocations, hoveredId, selectedId, x, bottomY, w, rowsEndY) {
        const btnW = this.layout.btnWidth;
        const btnH = this.layout.btnHeight;
        const spacing = this.layout.btnSpacing;
        // below the attribute rows with a clear gap, and never closer than 28px to the panel's bottom edge
        const lowest = bottomY - btnH - 28;
        const btnY = Math.min(lowest, (rowsEndY || 0) + 36);
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