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
            p: 48, startY: 48, titleOffsetY: 40, contentOffsetY: 60,
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
        const hoveredId = hoveredElement ? hoveredElement.id : null;

        const { p, startY } = this.layout;
        const panelHeight = h - (startY * 2);
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

        if (selectedElementId) {
            const activeBox = this.hitboxes.find(b => b.id === selectedElementId);
            if (activeBox) {
                this.ui.drawSelectionBrackets(activeBox.x, activeBox.y, activeBox.w, activeBox.h, 10);
            }
        }
    }

    _renderCharacterColumn(member, availablePoints, pendingAllocations, hoveredId, selectedId, x, y, w, h) {
        const TITLE_Y = y + this.layout.titleOffsetY;
        const CONTENT_START_Y = TITLE_Y + this.layout.contentOffsetY;
        const centerX = x + (w / 2);

        const titleStr = member.name ? member.name.toUpperCase() : "LEVEL UP";
        this.ctx.font = UITheme.fonts.body;
        const titleWidth = this.ctx.measureText(titleStr).width;

        this.ui.drawText(titleStr, centerX, TITLE_Y, UITheme.fonts.body, UITheme.colors.textMuted, "center");
        const lvlText = `Level ${member.level || 1} ${member.class || ''}`;
        this.ui.drawText(lvlText, centerX + (titleWidth / 2) + 20, TITLE_Y, UITheme.fonts.body, UITheme.colors.textMuted, "left");
        this.ui.drawLineWithGothicFlourish(centerX - 120, TITLE_Y + 29, 240, UITheme.colors.borderHighlight);

        let currentY = CONTENT_START_Y;
        const highlightFont = UITheme.fonts.bold || "bold 34px sans-serif";
        const giantFont = UITheme.fonts.header || "bold 72px sans-serif";

        const pointsColor = availablePoints > 0 ? UITheme.colors.success : UITheme.colors.textMuted;
        this.ui.drawText(`Unspent Points: ${availablePoints}`, centerX, currentY, highlightFont, pointsColor, "center");
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
            this.ui.drawText("?", centerX, currentY + (pSize * 0.7), giantFont, UITheme.colors.textMuted, "center");
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

            this.ui.drawText(Formatting.capitalize(attr), startX, textY, UITheme.fonts.body, UITheme.colors.textMain, "left");

            const currentVal = member.attributes?.[attr] || 0;
            const pendingVal = pendingAllocations[attr];

            this.ui.drawText(currentVal.toString(), startX + 264, textY, UITheme.fonts.mono, UITheme.colors.textMain, "center");

            if (pendingVal > 0) {
                this.ui.drawText(`+${pendingVal}`, startX + 312, textY, UITheme.fonts.mono, UITheme.colors.success, "left");
            }

            // --- SUB BUTTON (-) ---
            const canSub = pendingVal > 0;
            const subId = `SUB_${attr.toUpperCase()}`;
            const isHoveredSub = canSub && hoveredId === subId;
            const isFocusSub = canSub && (hoveredId === subId || selectedId === subId);

            let subBg = isHoveredSub ? UITheme.colors.states.focusBg : "rgba(0,0,0,0.4)";
            let subTextCol = canSub ? (isFocusSub ? UITheme.colors.states.focusText : UITheme.colors.textMain) : UITheme.colors.textMuted;
            let subBorder = canSub ? (isFocusSub ? UITheme.colors.states.focusText : UITheme.colors.border) : UITheme.colors.border;

            this.ui.drawRect(startX + 456, rowY + 5, 40, 40, subBg, true);
            this.ui.drawRect(startX + 456, rowY + 5, 40, 40, subBorder, false);
            this.ui.drawText("-", startX + 476, rowY + 34, UITheme.fonts.bold, subTextCol, "center");

            const subBox = { id: subId, x: startX + 456, y: rowY + 5, w: 40, h: 40 };
            if (canSub) subBox.hoverSfx = 'hoverTick'; // Only append hover if actionable
            this.hitboxes.push(subBox);

            // --- ADD BUTTON (+) ---
            const canAdd = availablePoints > 0;
            const addId = `ADD_${attr.toUpperCase()}`;
            const isHoveredAdd = canAdd && hoveredId === addId;
            const isFocusAdd = canAdd && (hoveredId === addId || selectedId === addId);

            let addBg = isHoveredAdd ? UITheme.colors.states.focusBg : "rgba(0,0,0,0.4)";
            let addTextCol = canAdd ? (isFocusAdd ? UITheme.colors.states.focusText : UITheme.colors.success) : UITheme.colors.textMuted;
            let addBorder = canAdd ? (isFocusAdd ? UITheme.colors.states.focusText : UITheme.colors.success) : UITheme.colors.border;

            this.ui.drawRect(startX + 540, rowY + 5, 40, 40, addBg, true);
            this.ui.drawRect(startX + 540, rowY + 5, 40, 40, addBorder, false);
            this.ui.drawText("+", startX + 560, rowY + 34, UITheme.fonts.bold, addTextCol, "center");

            const addBox = { id: addId, x: startX + 540, y: rowY + 5, w: 40, h: 40 };
            if (canAdd) addBox.hoverSfx = 'hoverTick'; // Only append hover if actionable
            this.hitboxes.push(addBox);
        });
    }

    _renderStatsColumn(currentStats, previewStats, x, y, w, h) {
        if (!currentStats || !previewStats) return;

        const TITLE_Y = y + this.layout.titleOffsetY;
        const CONTENT_START_Y = TITLE_Y + this.layout.contentOffsetY;
        const centerX = x + (w / 2);

        this.ui.drawText("PROJECTED STATS", centerX, TITLE_Y, UITheme.fonts.body, UITheme.colors.textMuted, "center");
        this.ui.drawLineWithGothicFlourish(centerX - 120, TITLE_Y + 29, 240, UITheme.colors.borderHighlight);

        let currentY = CONTENT_START_Y;
        const startX = x + this.layout.p;
        const colW = w - (this.layout.p * 2);

        this.ui.drawText("Vitals", startX, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 10;
        this.ui.drawLineWithGothicFlourish(startX, currentY, colW, UITheme.colors.borderHighlight);
        currentY += 32;

        currentY = this._drawStatDiffRow("Max HP", currentStats.maxHp?.total, previewStats.maxHp?.total, startX, currentY, colW, 42);
        currentY = this._drawStatDiffRow("Max STM", currentStats.maxStamina?.total, previewStats.maxStamina?.total, startX, currentY, colW, 42);
        currentY = this._drawStatDiffRow("Max INS", currentStats.maxInsight?.total, previewStats.maxInsight?.total, startX, currentY, colW, 42);
        currentY += 15;

        this.ui.drawText("Combat Stats", startX, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
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

            this.ui.drawText(stat.label, itemX, itemY, UITheme.fonts.small, UITheme.colors.textMuted, "left");
            this.ui.drawText(cStr, itemX + 145, itemY, UITheme.fonts.mono, UITheme.colors.textMain, "left");

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
        this.ui.drawText(label, x, y, UITheme.fonts.small, UITheme.colors.textMuted, "left");
        const valX = x + (w * 0.4);
        this.ui.drawText(curr.toString(), valX, y, UITheme.fonts.mono, UITheme.colors.textMain, "right");

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
        const headerFont = UITheme.fonts.cardTitle || "bold 28px sans-serif";

        this.ui.drawText("TYPE", colType, currentY, headerFont, UITheme.colors.textMuted, "left");
        this.ui.drawText("ATK", colAtk, currentY, headerFont, UITheme.colors.attack, "center");
        this.ui.drawText("DEF", colDef, currentY, headerFont, UITheme.colors.defense, "center");
        this.ui.drawText("RES", colRes, currentY, headerFont, UITheme.colors.resistance, "center");
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

                    this.ui.drawText(cStr, startX, currentY, UITheme.fonts.mono, UITheme.colors.textMain, "left");
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
        const startX = centerX - (btnW * 1.5) - spacing;

        const drawBtn = (id, label, btnX, isClickable, defaultCol) => {
            const isHovered = hoveredId === id;
            const isSelected = selectedId === id;
            const isFocus = isClickable && (isHovered || isSelected);

            // Change hover treatment slightly for disabled buttons
            let bg = "rgba(0,0,0,0.6)";
            if (isHovered) bg = isClickable ? UITheme.colors.states.focusBg : "rgba(0,0,0,0.7)";
            
            let textCol = isClickable 
                ? (isFocus ? UITheme.colors.states.focusText : defaultCol) 
                : UITheme.colors.textMuted;

            this.ui.drawPanel(btnX, btnY, btnW, btnH, bg);
            this.ui.drawText(label, btnX + (btnW/2), btnY + (btnH / 2) + 10, UITheme.fonts.body, textCol, "center");

            const box = { id, x: btnX, y: btnY, w: btnW, h: btnH };
            if (isClickable) box.hoverSfx = 'hoverTick'; // Only append hover if actionable
            this.hitboxes.push(box);
        };

        drawBtn('BTN_CANCEL', "Cancel", startX, true, UITheme.colors.textMain);
        drawBtn('BTN_RESET', "Reset", startX + btnW + spacing, hasPending, hasPending ? UITheme.colors.textMain : UITheme.colors.textMuted);
        drawBtn('BTN_CONFIRM', "Confirm", startX + (btnW * 2) + (spacing * 2), hasPending, hasPending ? UITheme.colors.success : UITheme.colors.textMuted);
    }
}