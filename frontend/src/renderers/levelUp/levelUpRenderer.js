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
        this.padding = 20;
    }

    render(state) {
        this.hitboxes = [];
        const { member, availablePoints, pendingAllocations, currentStats, previewStats } = state;
        if (!member) return;

        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;
        this.ui.clearScreen(w, h);

        // --- 1. Layout Calculations (Two-Column Layout) ---
        const halfW = Math.floor(w / 2);

        // --- 2. Draw Global Backgrounds & Borders ---
        this.ui.drawRect(0, 0, halfW, h, UITheme.colors.bgScale[0]);
        this.ui.drawRect(halfW, 0, halfW, h, UITheme.colors.bgScale[1]);
        this.ui.drawLine(halfW, 0, halfW, h, UITheme.colors.selectedWhite);

        // --- 3. Render Columns (SWAPPED) ---
        // Left Side: Character Info & Level Up Allocation (x = 0)
        this._renderCharacterColumn(member, availablePoints, pendingAllocations, 0, 0, halfW, h);
        
        // Right Side: Projected Stats (x = halfW)
        this._renderStatsColumn(currentStats, previewStats, halfW, 0, halfW, h);

        // --- 4. Draw Actions (Cancel / Reset / Confirm) ---
        this._drawActionButtons(availablePoints, pendingAllocations, 0, h, halfW);
        
        // --- 5. Report Hitboxes ---
        if (state.onLayoutUpdate) {
            state.onLayoutUpdate(this.hitboxes);
        }
    }

    _renderStatsColumn(currentStats, previewStats, x, y, w, h) {
        if (!currentStats || !previewStats) return;
        
        const centerX = x + (w / 2);
        let currentY = y + 40;

        // Header
        this.ui.drawText("PROJECTED STATS", centerX, currentY, UITheme.fonts.header, UITheme.colors.textMuted, "center");
        currentY += 40;

        const startX = x + this.padding;
        const colW = w - (this.padding * 2);

        // ==========================================
        // 1. CORE VITALS
        // ==========================================
        this.ui.drawText("Vitals", startX, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 5;
        this.ui.drawRect(startX, currentY, colW, 1, UITheme.colors.border);
        currentY += 15;

        currentY = this._drawStatDiffRow("Max HP", currentStats.maxHp?.total, previewStats.maxHp?.total, startX, currentY, colW);
        currentY = this._drawStatDiffRow("Max SP", currentStats.maxStamina?.total, previewStats.maxStamina?.total, startX, currentY, colW);
        currentY = this._drawStatDiffRow("Max INS", currentStats.maxInsight?.total, previewStats.maxInsight?.total, startX, currentY, colW);
        currentY += 10;

        // ==========================================
        // 2. COMBAT STATS
        // ==========================================
        this.ui.drawText("Combat Stats", startX, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 5;
        this.ui.drawRect(startX, currentY, colW, 1, UITheme.colors.border);
        currentY += 15;

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
        const numRows = Math.ceil(combatStats.length / 2);
        
        combatStats.forEach((stat, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const itemX = startX + (col * cColW);
            const itemY = currentY + (row * 16);
            
            let cStr = stat.c !== undefined ? stat.c : 0;
            let pStr = stat.p !== undefined ? stat.p : 0;
            
            if (stat.isPct) { 
                cStr = cStr.toFixed(0) + "%"; 
                pStr = pStr.toFixed(0) + "%"; 
            } else {
                cStr = cStr.toString();
                pStr = pStr.toString();
            }

            // Green (Success theme) if greater, Red if lower
            let arrowColor = UITheme.colors.textMain;
            if (stat.p > stat.c) arrowColor = UITheme.colors.success;
            if (stat.p < stat.c) arrowColor = UITheme.colors.danger;

            this.ui.drawText(stat.label, itemX, itemY, UITheme.fonts.small, UITheme.colors.textMuted, "left");
            
            // Measure the current stat text so we can perfectly position the arrow right next to it
            this.ctx.font = UITheme.fonts.mono;
            const cWidth = this.ctx.measureText(cStr).width;
            
            this.ui.drawText(cStr, itemX + 60, itemY, UITheme.fonts.mono, UITheme.colors.textMain, "left");
            this.ui.drawText(` -> ${pStr}`, itemX + 60 + cWidth, itemY, UITheme.fonts.mono, arrowColor, "left");
        });

        currentY += (numRows * 16) + 15;

        // ==========================================
        // 3. RESISTANCE TABLE
        // ==========================================
        this._drawProjectedResistanceTable(currentStats, previewStats, startX, currentY, colW);
    }

    _drawStatDiffRow(label, curr = 0, prev = 0, x, y, w) {
        this.ui.drawText(label, x, y, UITheme.fonts.small, UITheme.colors.textMuted, "left");
        
        const valX = x + (w * 0.4);
        const prevX = valX + 35;
        
        this.ui.drawText(curr.toString(), valX, y, UITheme.fonts.mono, UITheme.colors.textMain, "right");

        // Green if greater, Red if lower
        let arrowColor = UITheme.colors.textMain;
        if (prev > curr) arrowColor = UITheme.colors.success;
        if (prev < curr) arrowColor = UITheme.colors.danger;

        this.ui.drawText(`-> ${prev}`, prevX, y, UITheme.fonts.mono, arrowColor, "left");
        
        return y + 20;
    }

    _drawProjectedResistanceTable(cStats, pStats, x, y, w) {
        let currentY = y;
        
        const colType = x;
        const colAtk = x + (w * 0.35);
        const colDef = x + (w * 0.60);
        const colRes = x + (w * 0.85);

        const headerFont = "bold 10px sans-serif";
        this.ui.drawText("TYPE", colType, currentY, headerFont, UITheme.colors.textMuted, "left");
        this.ui.drawText("ATK", colAtk, currentY, headerFont, UITheme.colors.danger, "center");
        this.ui.drawText("DEF", colDef, currentY, headerFont, UITheme.colors.magic, "center");
        this.ui.drawText("RES", colRes, currentY, headerFont, UITheme.colors.textMuted, "center");
        
        currentY += 5;
        this.ui.drawRect(x, currentY, w, 1, UITheme.colors.border);
        currentY += 15;

        const types = [
            "blunt", "slash", "pierce", 
            "fire", "ice", "lightning", "water", "earth", "wind", 
            "light", "dark", "arcane"
        ];
        
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
                    // No change, draw normal centered text
                    this.ui.drawText(cStr, xPos, currentY, UITheme.fonts.mono, defaultColor, "center");
                } else {
                    // Stat is changing, draw current -> projected
                    let arrowColor = defaultColor;
                    if (prev > curr) arrowColor = UITheme.colors.success;
                    if (prev < curr) arrowColor = UITheme.colors.danger;

                    this.ctx.font = UITheme.fonts.mono;
                    const cWidth = this.ctx.measureText(cStr).width;
                    const arrowStr = `->${pStr}`; // Tighter spacing for tables
                    const arrowWidth = this.ctx.measureText(arrowStr).width;
                    const space = 2;
                    const totalWidth = cWidth + space + arrowWidth;
                    
                    const startX = xPos - (totalWidth / 2);
                    
                    this.ui.drawText(cStr, startX, currentY, UITheme.fonts.mono, UITheme.colors.textMain, "left");
                    this.ui.drawText(arrowStr, startX + cWidth + space, currentY, UITheme.fonts.mono, arrowColor, "left");
                }
            };

            drawCell(cAtk, pAtk, colAtk, UITheme.colors.danger);
            drawCell(cDef, pDef, colDef, UITheme.colors.magic);
            drawCell(cRes, pRes, colRes, UITheme.colors.textMain, true);

            currentY += 14;
        });
    }

    _renderCharacterColumn(member, availablePoints, pendingAllocations, x, y, w, h) {
        const centerX = x + (w / 2);
        let currentY = y + 20;

        // Portrait
        const portraitSize = 100;
        const portraitX = Math.floor(centerX - (portraitSize / 2));
        let assetKey = member.spritePortrait;
        const img = this.loader.get(assetKey);

        if (img) {
            this.ui.drawSprite(img, 0, 0, 128, 128, portraitX, currentY, portraitSize, portraitSize);
        } else {
            this.ui.drawRect(portraitX, currentY, portraitSize, portraitSize, UITheme.colors.bgScale[2]);
            this.ui.drawRect(portraitX, currentY, portraitSize, portraitSize, UITheme.colors.border, false);
            this.ui.drawText("?", centerX, currentY + (portraitSize/2) + 10, "bold 30px sans-serif", UITheme.colors.textMuted, "center");
        }
        
        currentY += portraitSize + 15;

        // Name & Level
        this.ui.drawText(member.name, centerX, currentY, "bold 24px sans-serif", UITheme.colors.textMain, "center");
        currentY += 25;
        this.ui.drawText(`Level ${member.level || 1} ${member.class || ''}`, centerX, currentY, UITheme.fonts.body, UITheme.colors.textMuted, "center");
        currentY += 20;

        // Unspent Points
        const pointsColor = availablePoints > 0 ? UITheme.colors.success : UITheme.colors.textMuted;
        this.ui.drawText(`Unspent Points: ${availablePoints}`, centerX, currentY, "bold 16px sans-serif", pointsColor, "center");
        currentY += 25;

        // Attributes Listing
        const attributes = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];
        const rowHeight = 32; 
        const blockW = 260; 
        const startX = centerX - (blockW / 2);

        attributes.forEach((attr, index) => {
            const rowY = currentY + (index * rowHeight);
            
            this.ui.drawText(Formatting.capitalize(attr), startX, rowY + 16, UITheme.fonts.body, UITheme.colors.textMain, "left");

            const currentVal = member.attributes?.[attr] || 0;
            const pendingVal = pendingAllocations[attr];
            
            this.ui.drawText(currentVal.toString(), startX + 110, rowY + 16, UITheme.fonts.mono, UITheme.colors.textMain, "center");

            if (pendingVal > 0) {
                this.ui.drawText(`+${pendingVal}`, startX + 140, rowY + 16, UITheme.fonts.mono, UITheme.colors.success, "left");
            }

            // Sub (-) Button
            const subColor = pendingVal > 0 ? UITheme.colors.danger : UITheme.colors.bgScale[0];
            this.ui.drawRect(startX + 190, rowY, 24, 24, subColor);
            this.ui.drawRect(startX + 190, rowY, 24, 24, UITheme.colors.border, false);
            this.ui.drawText("-", startX + 202, rowY + 18, UITheme.fonts.bold, UITheme.colors.selectedWhite, "center");
            this.hitboxes.push({ id: `SUB_${attr.toUpperCase()}`, x: startX + 190, y: rowY, w: 24, h: 24 });

            // Add (+) Button
            const addColor = availablePoints > 0 ? UITheme.colors.success : UITheme.colors.bgScale[0];
            this.ui.drawRect(startX + 225, rowY, 24, 24, addColor);
            this.ui.drawRect(startX + 225, rowY, 24, 24, UITheme.colors.border, false);
            this.ui.drawText("+", startX + 237, rowY + 18, UITheme.fonts.bold, UITheme.colors.selectedWhite, "center");
            this.hitboxes.push({ id: `ADD_${attr.toUpperCase()}`, x: startX + 225, y: rowY, w: 24, h: 24 });
        });
    }

    _drawActionButtons(availablePoints, pendingAllocations, x, h, w) {
        const btnY = h - 70; 
        const centerX = x + (w / 2);
        const hasPending = Object.values(pendingAllocations).some(v => v > 0);

        const btnWidth = 90;
        const spacing = 15;
        const startX = centerX - (btnWidth * 1.5) - spacing; 

        // Cancel
        const cancelX = startX;
        this.ui.drawRect(cancelX, btnY, btnWidth, 40, UITheme.colors.bgScale[2]);
        this.ui.drawRect(cancelX, btnY, btnWidth, 40, UITheme.colors.border, false);
        this.ui.drawText("Cancel", cancelX + (btnWidth/2), btnY + 26, UITheme.fonts.body, UITheme.colors.textMain, "center");
        this.hitboxes.push({ id: 'BTN_CANCEL', x: cancelX, y: btnY, w: btnWidth, h: 40 });

        // Reset
        const resetX = cancelX + btnWidth + spacing;
        const resetColor = hasPending ? UITheme.colors.danger : UITheme.colors.bgScale[0];
        const resetText = hasPending ? UITheme.colors.selectedWhite : UITheme.colors.textMuted;
        this.ui.drawRect(resetX, btnY, btnWidth, 40, resetColor);
        this.ui.drawRect(resetX, btnY, btnWidth, 40, UITheme.colors.border, false);
        this.ui.drawText("Reset", resetX + (btnWidth/2), btnY + 26, UITheme.fonts.body, resetText, "center");
        if (hasPending) {
            this.hitboxes.push({ id: 'BTN_RESET', x: resetX, y: btnY, w: btnWidth, h: 40 });
        }

        // Confirm
        const confirmX = resetX + btnWidth + spacing;
        const confirmColor = hasPending ? UITheme.colors.success : UITheme.colors.bgScale[0];
        const confirmText = hasPending ? UITheme.colors.selectedWhite : UITheme.colors.textMuted;
        this.ui.drawRect(confirmX, btnY, btnWidth, 40, confirmColor);
        this.ui.drawRect(confirmX, btnY, btnWidth, 40, UITheme.colors.border, false);
        this.ui.drawText("Confirm", confirmX + (btnWidth/2), btnY + 26, UITheme.fonts.body, confirmText, "center");
        if (hasPending) {
            this.hitboxes.push({ id: 'BTN_CONFIRM', x: confirmX, y: btnY, w: btnWidth, h: 40 });
        }
    }

    getHitZone(x, y) {
        for (let i = this.hitboxes.length - 1; i >= 0; i--) {
            const box = this.hitboxes[i];
            if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
                return box.id;
            }
        }
        return null;
    }
}