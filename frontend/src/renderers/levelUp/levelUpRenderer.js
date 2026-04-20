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
            padding: 48,
            headerY: 70,              // Reduced from 96
            portraitSize: 307,
            attrRowHeight: 67,
            attrBlockWidth: 624,
            btnWidth: 216,
            btnHeight: 96,
            btnSpacing: 36
        };
    }

    render(state) {
        this.hitboxes = [];
        const { member, availablePoints, pendingAllocations, currentStats, previewStats, hoverId, focusId } = state;
        if (!member) return;

        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;
        this.ui.clearScreen(w, h);

        const halfW = Math.floor(w / 2);

        this.ui.drawRect(0, 0, halfW, h, UITheme.colors.bgScale[0]);
        this.ui.drawRect(halfW, 0, halfW, h, UITheme.colors.bgScale[1]);
        this.ui.drawLine(halfW, 0, halfW, h, UITheme.colors.border);

        this._renderCharacterColumn(member, availablePoints, pendingAllocations, hoverId, focusId, 0, 0, halfW, h);
        this._renderStatsColumn(currentStats, previewStats, halfW, 0, halfW, h);

        this._drawActionButtons(availablePoints, pendingAllocations, hoverId, focusId, 0, h, halfW);
        
        if (state.onLayoutUpdate) {
            state.onLayoutUpdate(this.hitboxes);
        }

        // Brackets exclusively track keyboard focus
        if (focusId) {
            const focusedBox = this.hitboxes.find(b => b.id === focusId);
            if (focusedBox) {
                this.ui.drawSelectionBrackets(focusedBox.x, focusedBox.y, focusedBox.w, focusedBox.h, 10);
            }
        }
    }

    _renderStatsColumn(currentStats, previewStats, x, y, w, h) {
        if (!currentStats || !previewStats) return;
        
        const centerX = x + (w / 2);
        let currentY = y + this.layout.headerY;

        // Header
        this.ui.drawText("PROJECTED STATS", centerX, currentY, UITheme.fonts.header, UITheme.colors.textMuted, "center");
        currentY += 70; // Tightened from 96

        const startX = x + this.layout.padding;
        const colW = w - (this.layout.padding * 2);

        // --- 1. VITALS (Tightened row height) ---
        this.ui.drawText("Vitals", startX, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 10;
        this.ui.drawLineWithGothicFlourish(startX, currentY, colW, UITheme.colors.borderHighlight);
        currentY += 32; // Tightened from 36

        // Vitals row height reduced to 42
        currentY = this._drawStatDiffRow("Max HP", currentStats.maxHp?.total, previewStats.maxHp?.total, startX, currentY, colW, 42);
        currentY = this._drawStatDiffRow("Max SP", currentStats.maxStamina?.total, previewStats.maxStamina?.total, startX, currentY, colW, 42);
        currentY = this._drawStatDiffRow("Max INS", currentStats.maxInsight?.total, previewStats.maxInsight?.total, startX, currentY, colW, 42);
        currentY += 15; // Tightened gap

        // --- 2. COMBAT STATS (Tightened row height) ---
        this.ui.drawText("Combat Stats", startX, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 10;
        this.ui.drawLineWithGothicFlourish(startX, currentY, colW, UITheme.colors.borderHighlight);
        currentY += 32;

        const combatStats = [
            { label: "SPD", c: currentStats.speed, p: previewStats.speed },
            { label: "CRT %", c: (currentStats.critChance || 0)*100, p: (previewStats.critChance || 0)*100, isPct: true },
            { label: "HP REC", c: currentStats.hpRecovery, p: previewStats.hpRecovery },
            { label: "CRT DMG", c: currentStats.critMultiplier, p: previewStats.critMultiplier },
            { label: "STA REC", c: currentStats.staminaRecovery, p: previewStats.staminaRecovery },
            { label: "ACC", c: currentStats.accuracy, p: previewStats.accuracy },
            { label: "INS REC", c: currentStats.insightRecovery, p: previewStats.insightRecovery },
            { label: "EVA", c: currentStats.evasion, p: previewStats.evasion },
            { label: "COR", c: currentStats.corruption, p: previewStats.corruption }
        ];

        const cColW = colW / 2;
        const rowH = 32; // Reduced from 38
        
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
            
            // INCREASED OFFSET: Changed itemX + 130 to itemX + 145 to fit 'CRT DMG'
            this.ui.drawText(cStr, itemX + 145, itemY, UITheme.fonts.mono, UITheme.colors.textMain, "left");

            if (cVal !== pVal) {
                let arrowColor = (pVal > cVal) ? UITheme.colors.success : UITheme.colors.failure;
                this.ctx.font = UITheme.fonts.mono;
                const cWidth = this.ctx.measureText(cStr).width;
                
                // INCREASED OFFSET: Updated math here as well
                const arrowX = itemX + 145 + cWidth + 12; 
                this.ui.drawArrow(arrowX, itemY - 8, 6, 'right', arrowColor);
                this.ui.drawText(pStr, arrowX + 15, itemY, UITheme.fonts.mono, arrowColor, "left");
            }
        });

        currentY += (Math.ceil(combatStats.length / 2) * rowH) + 24;

        // --- 3. RESISTANCE TABLE ---
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
        currentY += 30; // Reduced from 36

        const types = ["blunt", "slash", "pierce", "fire", "ice", "lightning", "water", "earth", "wind", "light", "dark", "arcane"];
        const rowH = 30; // Reduced from 34 to ensure all 12 fit
        
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

    _renderCharacterColumn(member, availablePoints, pendingAllocations, hoverId, focusId, x, y, w, h) {
        const centerX = x + (w / 2);
        let currentY = y + this.layout.headerY; 
        
        const titleFont = UITheme.fonts.title || "bold 58px sans-serif";
        const highlightFont = UITheme.fonts.bold || "bold 34px sans-serif";
        const giantFont = UITheme.fonts.header || "bold 72px sans-serif";

        this.ui.drawText(member.name, centerX, currentY, titleFont, UITheme.colors.textMain, "center");
        currentY += 53; 

        const lvlText = `Level ${member.level || 1} ${member.class || ''}`;
        const pointsColor = availablePoints > 0 ? UITheme.colors.success : UITheme.colors.textMuted;
        
        this.ui.drawText(lvlText, centerX - 24, currentY, UITheme.fonts.body, UITheme.colors.textMuted, "right");
        this.ui.drawText("|", centerX, currentY, UITheme.fonts.body, UITheme.colors.border, "center");
        this.ui.drawText(`Unspent Points: ${availablePoints}`, centerX + 24, currentY, highlightFont, pointsColor, "left");
        currentY += 29; 

        const pSize = this.layout.portraitSize;
        const portraitX = Math.floor(centerX - (pSize / 2));
        const img = this.loader.get(member.spritePortrait);

        this.ui.drawLancetArchedPanel(portraitX, currentY, pSize, pSize * 1.25, UITheme.colors.bgScale[2], UITheme.colors.borderHighlight);

        if (img) {
            this.ui.drawSprite(img, 0, 0, 128, 128, portraitX, currentY + (pSize * 0.15), pSize, pSize);
        } else {
            this.ui.drawText("?", centerX, currentY + (pSize * 0.7), giantFont, UITheme.colors.textMuted, "center");
        }
        currentY += (pSize * 1.25) + 36;

        const attributes = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];
        const startX = centerX - (this.layout.attrBlockWidth / 2);

        attributes.forEach((attr, index) => {
            const rowY = currentY + (index * this.layout.attrRowHeight);
            const textY = rowY + 34;
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
            let subBg = UITheme.colors.bgScale[0];
            let subTextCol = canSub ? UITheme.colors.failure : UITheme.colors.textMuted;
            let subBorder = canSub ? UITheme.colors.failure : UITheme.colors.border;

            if (canSub && focusId === subId) {
                subBg = UITheme.colors.states.focusBg;
                subTextCol = UITheme.colors.states.focusText;
                subBorder = UITheme.colors.states.focusText;
            } else if (canSub && hoverId === subId) {
                subBg = UITheme.colors.states.hoverBg;
                subTextCol = UITheme.colors.states.hoverText;
                subBorder = UITheme.colors.states.hoverText;
            }

            this.ui.drawRect(startX + 456, rowY + 5, 58, 58, subBg, true);
            this.ui.drawRect(startX + 456, rowY + 5, 58, 58, subBorder, false);
            this.ui.drawText("-", startX + 485, rowY + 43, UITheme.fonts.bold, subTextCol, "center");
            this.hitboxes.push({ id: subId, x: startX + 456, y: rowY + 5, w: 58, h: 58 });

            // --- ADD BUTTON (+) ---
            const canAdd = availablePoints > 0;
            const addId = `ADD_${attr.toUpperCase()}`;
            let addBg = UITheme.colors.bgScale[0];
            let addTextCol = canAdd ? UITheme.colors.success : UITheme.colors.textMuted;
            let addBorder = canAdd ? UITheme.colors.success : UITheme.colors.border;

            if (canAdd && focusId === addId) {
                addBg = UITheme.colors.states.focusBg;
                addTextCol = UITheme.colors.states.focusText;
                addBorder = UITheme.colors.states.focusText;
            } else if (canAdd && hoverId === addId) {
                addBg = UITheme.colors.states.hoverBg;
                addTextCol = UITheme.colors.states.hoverText;
                addBorder = UITheme.colors.states.hoverText;
            }

            this.ui.drawRect(startX + 540, rowY + 5, 58, 58, addBg, true);
            this.ui.drawRect(startX + 540, rowY + 5, 58, 58, addBorder, false);
            this.ui.drawText("+", startX + 569, rowY + 43, UITheme.fonts.bold, addTextCol, "center");
            this.hitboxes.push({ id: addId, x: startX + 540, y: rowY + 5, w: 58, h: 58 });
        });
    }

    _drawActionButtons(availablePoints, pendingAllocations, hoverId, focusId, x, h, w) {
        const btnY = h - 145; 
        const centerX = x + (w / 2);
        const hasPending = Object.values(pendingAllocations).some(v => v > 0);

        const btnW = this.layout.btnWidth;
        const btnH = this.layout.btnHeight;
        const spacing = this.layout.btnSpacing;
        const startX = centerX - (btnW * 1.5) - spacing; 

        const drawBtn = (id, label, btnX, isActive, defaultCol) => {
            let bg = UITheme.colors.bgScale[2];
            let textCol = defaultCol;

            if (isActive || id === 'BTN_CANCEL') {
                if (focusId === id) {
                    bg = UITheme.colors.states.focusBg;
                    textCol = UITheme.colors.states.focusText;
                } else if (hoverId === id) {
                    bg = UITheme.colors.states.hoverBg;
                    textCol = UITheme.colors.states.hoverText;
                }
            }

            this.ui.drawPanel(btnX, btnY, btnW, btnH, bg);
            this.ui.drawText(label, btnX + (btnW/2), btnY + 62, UITheme.fonts.body, textCol, "center");
            
            if (isActive || id === 'BTN_CANCEL') {
                this.hitboxes.push({ id, x: btnX, y: btnY, w: btnW, h: btnH });
            }
        };

        drawBtn('BTN_CANCEL', "Cancel", startX, true, UITheme.colors.textMain);
        drawBtn('BTN_RESET', "Reset", startX + btnW + spacing, hasPending, hasPending ? UITheme.colors.textMain : UITheme.colors.textMuted);
        drawBtn('BTN_CONFIRM', "Confirm", startX + (btnW * 2) + (spacing * 2), hasPending, hasPending ? UITheme.colors.success : UITheme.colors.textMuted);
    }

    
}