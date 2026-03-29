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
        const { member, availablePoints, pendingAllocations, currentStats, previewStats, hoverId } = state;
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

        // --- 3. Render Columns ---
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

        // --- 6. Draw Selection/Hover Brackets ---
        if (hoverId) {
            const hoveredBox = this.hitboxes.find(b => b.id === hoverId);
            if (hoveredBox) {
                // Using a distance of 4px for the padding/breathing space around the button
                this.ui.drawSelectionBrackets(hoveredBox.x, hoveredBox.y, hoveredBox.w, hoveredBox.h, 4);
            }
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
            
            let cVal = stat.c !== undefined ? stat.c : 0;
            let pVal = stat.p !== undefined ? stat.p : 0;
            
            let cStr = stat.isPct ? `${cVal.toFixed(0)}%` : cVal.toString();
            let pStr = stat.isPct ? `${pVal.toFixed(0)}%` : pVal.toString();

            // Always draw the label and the current value
            this.ui.drawText(stat.label, itemX, itemY, UITheme.fonts.small, UITheme.colors.textMuted, "left");
            this.ui.drawText(cStr, itemX + 60, itemY, UITheme.fonts.mono, UITheme.colors.textMain, "left");

            // Only draw the arrow and projection if the stat actually changed
            if (cVal !== pVal) {
                let arrowColor = UITheme.colors.textMain;
                if (pVal > cVal) arrowColor = UITheme.colors.success;
                if (pVal < cVal) arrowColor = UITheme.colors.danger;

                this.ctx.font = UITheme.fonts.mono;
                const cWidth = this.ctx.measureText(cStr).width;
                
                this.ui.drawText(` -> ${pStr}`, itemX + 60 + cWidth, itemY, UITheme.fonts.mono, arrowColor, "left");
            }
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
        
        // If there is no change, just draw the current value
        if (curr === prev) {
            this.ui.drawText(curr.toString(), valX, y, UITheme.fonts.mono, UITheme.colors.textMain, "right");
            return y + 20;
        }

        // Otherwise, draw the projection
        const prevX = valX + 35;
        this.ui.drawText(curr.toString(), valX, y, UITheme.fonts.mono, UITheme.colors.textMain, "right");

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
                    this.ui.drawText(cStr, xPos, currentY, UITheme.fonts.mono, defaultColor, "center");
                } else {
                    let arrowColor = defaultColor;
                    if (prev > curr) arrowColor = UITheme.colors.success;
                    if (prev < curr) arrowColor = UITheme.colors.danger;

                    this.ctx.font = UITheme.fonts.mono;
                    const cWidth = this.ctx.measureText(cStr).width;
                    const arrowStr = `->${pStr}`;
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
        
        // Match the 'Projected Stats' header height
        let currentY = y + 40; 

        // 1. Name
        this.ui.drawText(member.name, centerX, currentY, "bold 24px sans-serif", UITheme.colors.textMain, "center");
        
        // Reduced gap: Name to Level/Points
        currentY += 22; 

        // 2. Level & Unspent Points
        const lvlText = `Level ${member.level || 1} ${member.class || ''}`;
        const pointsColor = availablePoints > 0 ? UITheme.colors.success : UITheme.colors.textMuted;
        
        this.ui.drawText(lvlText, centerX - 10, currentY, UITheme.fonts.body, UITheme.colors.textMuted, "right");
        this.ui.drawText("|", centerX, currentY, UITheme.fonts.body, UITheme.colors.border, "center");
        this.ui.drawText(`Unspent Points: ${availablePoints}`, centerX + 10, currentY, "bold 14px sans-serif", pointsColor, "left");
        
        // Reduced gap: Level to Portrait
        currentY += 12; 

        // 3. Portrait
        const portraitSize = 128;
        const portraitX = Math.floor(centerX - (portraitSize / 2));
        const img = this.loader.get(member.spritePortrait);

        if (img) {
            this.ui.drawSprite(img, 0, 0, 128, 128, portraitX, currentY, portraitSize, portraitSize);
        } else {
            this.ui.drawRect(portraitX, currentY, portraitSize, portraitSize, UITheme.colors.bgScale[2]);
            this.ui.drawRect(portraitX, currentY, portraitSize, portraitSize, UITheme.colors.border, false);
            this.ui.drawText("?", centerX, currentY + (portraitSize/2) + 10, "bold 30px sans-serif", UITheme.colors.textMuted, "center");
        }
        
        // Reduced gap: Portrait to Attributes
        currentY += portraitSize + 15;

        // 4. Attributes Listing (Row height reduced to 28px)
        const attributes = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];
        const rowHeight = 28; 
        const blockW = 260; 
        const startX = centerX - (blockW / 2);

        attributes.forEach((attr, index) => {
            const rowY = currentY + (index * rowHeight);
            
            // Vertically centered text for the 28px row
            const textY = rowY + 16;

            this.ui.drawText(Formatting.capitalize(attr), startX, textY, UITheme.fonts.body, UITheme.colors.textMain, "left");

            const currentVal = member.attributes?.[attr] || 0;
            const pendingVal = pendingAllocations[attr];
            
            this.ui.drawText(currentVal.toString(), startX + 110, textY, UITheme.fonts.mono, UITheme.colors.textMain, "center");

            if (pendingVal > 0) {
                this.ui.drawText(`+${pendingVal}`, startX + 130, textY, UITheme.fonts.mono, UITheme.colors.success, "left");
            }

            // Sub (-) Button
            const canSub = pendingVal > 0;
            const subColor = canSub ? UITheme.colors.danger : UITheme.colors.textMuted;
            const subBorder = canSub ? UITheme.colors.danger : UITheme.colors.border;
            
            this.ui.drawRect(startX + 190, rowY + 2, 24, 24, UITheme.colors.bgScale[0]);
            this.ui.drawRect(startX + 190, rowY + 2, 24, 24, subBorder, false);
            this.ui.drawText("-", startX + 202, rowY + 18, UITheme.fonts.bold, subColor, "center");
            this.hitboxes.push({ id: `SUB_${attr.toUpperCase()}`, x: startX + 190, y: rowY + 2, w: 24, h: 24 });

            // Add (+) Button
            const canAdd = availablePoints > 0;
            const addColor = canAdd ? UITheme.colors.success : UITheme.colors.textMuted;
            const addBorder = canAdd ? UITheme.colors.success : UITheme.colors.border;
            
            this.ui.drawRect(startX + 225, rowY + 2, 24, 24, UITheme.colors.bgScale[0]);
            this.ui.drawRect(startX + 225, rowY + 2, 24, 24, addBorder, false);
            this.ui.drawText("+", startX + 237, rowY + 18, UITheme.fonts.bold, addColor, "center");
            this.hitboxes.push({ id: `ADD_${attr.toUpperCase()}`, x: startX + 225, y: rowY + 2, w: 24, h: 24 });
        });
    }

    _drawActionButtons(availablePoints, pendingAllocations, x, h, w) {
        const btnY = h - 70; 
        const centerX = x + (w / 2);
        const hasPending = Object.values(pendingAllocations).some(v => v > 0);

        const btnWidth = 90;
        const spacing = 15;
        const startX = centerX - (btnWidth * 1.5) - spacing; 
        
        const baseBg = UITheme.colors.bgScale[2];

        // Cancel
        const cancelX = startX;
        this.ui.drawRect(cancelX, btnY, btnWidth, 40, baseBg);
        this.ui.drawRect(cancelX, btnY, btnWidth, 40, UITheme.colors.border, false);
        this.ui.drawText("Cancel", cancelX + (btnWidth/2), btnY + 26, UITheme.fonts.body, UITheme.colors.textMain, "center");
        this.hitboxes.push({ id: 'BTN_CANCEL', x: cancelX, y: btnY, w: btnWidth, h: 40 });

        // Reset
        const resetX = cancelX + btnWidth + spacing;
        const resetColor = hasPending ? UITheme.colors.danger : UITheme.colors.textMuted;
        const resetBorder = hasPending ? UITheme.colors.danger : UITheme.colors.border;
        
        this.ui.drawRect(resetX, btnY, btnWidth, 40, baseBg);
        this.ui.drawRect(resetX, btnY, btnWidth, 40, resetBorder, false);
        this.ui.drawText("Reset", resetX + (btnWidth/2), btnY + 26, UITheme.fonts.body, resetColor, "center");
        if (hasPending) {
            this.hitboxes.push({ id: 'BTN_RESET', x: resetX, y: btnY, w: btnWidth, h: 40 });
        }

        // Confirm
        const confirmX = resetX + btnWidth + spacing;
        const confirmColor = hasPending ? UITheme.colors.success : UITheme.colors.textMuted;
        const confirmBorder = hasPending ? UITheme.colors.success : UITheme.colors.border;
        
        this.ui.drawRect(confirmX, btnY, btnWidth, 40, baseBg);
        this.ui.drawRect(confirmX, btnY, btnWidth, 40, confirmBorder, false);
        this.ui.drawText("Confirm", confirmX + (btnWidth/2), btnY + 26, UITheme.fonts.body, confirmColor, "center");
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