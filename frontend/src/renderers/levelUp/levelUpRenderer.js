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
        
        // Centralized Layout & Style configuration
        this.layout = {
            padding: 20,
            headerY: 40,
            portraitSize: 128,
            attrRowHeight: 28,
            attrBlockWidth: 260,
            btnWidth: 90,
            btnHeight: 40,
            btnSpacing: 15
        };
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
        this.ui.drawLine(halfW, 0, halfW, h, UITheme.colors.border);

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
        let currentY = y + this.layout.headerY;

        // Header
        this.ui.drawText("PROJECTED STATS", centerX, currentY, UITheme.fonts.header, UITheme.colors.textMuted, "center");
        currentY += 40;

        const startX = x + this.layout.padding;
        const colW = w - (this.layout.padding * 2);

        // ==========================================
        // 1. CORE VITALS
        // ==========================================
        this.ui.drawText("Vitals", startX, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 5;
        this.ui.drawLineWithGothicFlourish(startX, currentY, colW, UITheme.colors.borderHighlight);
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
        this.ui.drawLineWithGothicFlourish(startX, currentY, colW, UITheme.colors.borderHighlight);
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
                if (pVal < cVal) arrowColor = UITheme.colors.failure;

                this.ctx.font = UITheme.fonts.mono;
                const cWidth = this.ctx.measureText(cStr).width;
                const arrowX = itemX + 60 + cWidth + 6;
                
                this.ui.drawArrow(arrowX, itemY - 4, 3, 'right', arrowColor);
                this.ui.drawText(pStr, arrowX + 8, itemY, UITheme.fonts.mono, arrowColor, "left");
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
        this.ui.drawText(curr.toString(), valX, y, UITheme.fonts.mono, UITheme.colors.textMain, "right");

        let arrowColor = UITheme.colors.textMain;
        if (prev > curr) arrowColor = UITheme.colors.success;
        if (prev < curr) arrowColor = UITheme.colors.failure;

        const arrowX = valX + 12;
        this.ui.drawArrow(arrowX, y - 4, 4, 'right', arrowColor);
        this.ui.drawText(prev.toString(), arrowX + 10, y, UITheme.fonts.mono, arrowColor, "left");
        
        return y + 20;
    }

    _drawProjectedResistanceTable(cStats, pStats, x, y, w) {
        let currentY = y;
        
        const colType = x;
        const colAtk = x + (w * 0.35);
        const colDef = x + (w * 0.60);
        const colRes = x + (w * 0.85);

        // Standardized table header font fallback
        const headerFont = UITheme.fonts.cardTitle || "bold 12px sans-serif";
        
        this.ui.drawText("TYPE", colType, currentY, headerFont, UITheme.colors.textMuted, "left");
        this.ui.drawText("ATK", colAtk, currentY, headerFont, UITheme.colors.attack, "center");
        this.ui.drawText("DEF", colDef, currentY, headerFont, UITheme.colors.defense, "center");
        this.ui.drawText("RES", colRes, currentY, headerFont, UITheme.colors.resistance, "center");
        
        currentY += 5;
        this.ui.drawLineWithGothicFlourish(x, currentY, w, UITheme.colors.border);
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
                    if (prev < curr) arrowColor = UITheme.colors.failure;

                    this.ctx.font = UITheme.fonts.mono;
                    const cWidth = this.ctx.measureText(cStr).width;
                    const pWidth = this.ctx.measureText(pStr).width;
                    
                    const arrowSize = 3;
                    const space = 4;
                    const totalWidth = cWidth + space + (arrowSize * 2) + space + pWidth;
                    
                    const startX = xPos - (totalWidth / 2);
                    
                    this.ui.drawText(cStr, startX, currentY, UITheme.fonts.mono, UITheme.colors.textMain, "left");
                    
                    const arrowX = startX + cWidth + space + arrowSize;
                    this.ui.drawArrow(arrowX, currentY - 4, arrowSize, 'right', arrowColor);
                    
                    this.ui.drawText(pStr, arrowX + arrowSize + space, currentY, UITheme.fonts.mono, arrowColor, "left");
                }
            };

            drawCell(cAtk, pAtk, colAtk, UITheme.colors.attack);
            drawCell(cDef, pDef, colDef, UITheme.colors.defense);
            drawCell(cRes, pRes, colRes, UITheme.colors.resistance, true);

            currentY += 14;
        });
    }

    _renderCharacterColumn(member, availablePoints, pendingAllocations, x, y, w, h) {
        const centerX = x + (w / 2);
        let currentY = y + this.layout.headerY; 
        
        // Font styles mapped to UITheme with sensible fallbacks
        const titleFont = UITheme.fonts.title || "bold 24px sans-serif";
        const highlightFont = UITheme.fonts.bold || "bold 14px sans-serif";
        const giantFont = UITheme.fonts.header || "bold 30px sans-serif";

        // 1. Name
        this.ui.drawText(member.name, centerX, currentY, titleFont, UITheme.colors.textMain, "center");
        currentY += 22; 

        // 2. Level & Unspent Points
        const lvlText = `Level ${member.level || 1} ${member.class || ''}`;
        const pointsColor = availablePoints > 0 ? UITheme.colors.success : UITheme.colors.textMuted;
        
        this.ui.drawText(lvlText, centerX - 10, currentY, UITheme.fonts.body, UITheme.colors.textMuted, "right");
        this.ui.drawText("|", centerX, currentY, UITheme.fonts.body, UITheme.colors.border, "center");
        this.ui.drawText(`Unspent Points: ${availablePoints}`, centerX + 10, currentY, highlightFont, pointsColor, "left");
        currentY += 12; 

        // 3. Portrait framed with Lancet Arch
        const pSize = this.layout.portraitSize;
        const portraitX = Math.floor(centerX - (pSize / 2));
        const img = this.loader.get(member.spritePortrait);

        // Frame
        this.ui.drawLancetArchedPanel(portraitX, currentY, pSize, pSize * 1.25, UITheme.colors.bgScale[2], UITheme.colors.borderHighlight);

        if (img) {
            this.ui.drawSprite(img, 0, 0, pSize, pSize, portraitX, currentY + (pSize * 0.15), pSize, pSize);
        } else {
            this.ui.drawText("?", centerX, currentY + (pSize * 0.7), giantFont, UITheme.colors.textMuted, "center");
        }
        currentY += (pSize * 1.25) + 15;

        // 4. Attributes Listing
        const attributes = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];
        const startX = centerX - (this.layout.attrBlockWidth / 2);

        attributes.forEach((attr, index) => {
            const rowY = currentY + (index * this.layout.attrRowHeight);
            const textY = rowY + 16; // Vertically centered

            this.ui.drawText(Formatting.capitalize(attr), startX, textY, UITheme.fonts.body, UITheme.colors.textMain, "left");

            const currentVal = member.attributes?.[attr] || 0;
            const pendingVal = pendingAllocations[attr];
            
            this.ui.drawText(currentVal.toString(), startX + 110, textY, UITheme.fonts.mono, UITheme.colors.textMain, "center");

            if (pendingVal > 0) {
                this.ui.drawText(`+${pendingVal}`, startX + 130, textY, UITheme.fonts.mono, UITheme.colors.success, "left");
            }

            // Sub (-) Button
            const canSub = pendingVal > 0;
            const subColor = canSub ? UITheme.colors.failure : UITheme.colors.textMuted;
            const subBorder = canSub ? UITheme.colors.failure : UITheme.colors.border;
            
            this.ui.drawRect(startX + 190, rowY + 2, 24, 24, UITheme.colors.bgScale[0], true);
            this.ui.drawRect(startX + 190, rowY + 2, 24, 24, subBorder, false);
            this.ui.drawText("-", startX + 202, rowY + 18, UITheme.fonts.bold, subColor, "center");
            this.hitboxes.push({ id: `SUB_${attr.toUpperCase()}`, x: startX + 190, y: rowY + 2, w: 24, h: 24 });

            // Add (+) Button
            const canAdd = availablePoints > 0;
            const addColor = canAdd ? UITheme.colors.success : UITheme.colors.textMuted;
            const addBorder = canAdd ? UITheme.colors.success : UITheme.colors.border;
            
            this.ui.drawRect(startX + 225, rowY + 2, 24, 24, UITheme.colors.bgScale[0], true);
            this.ui.drawRect(startX + 225, rowY + 2, 24, 24, addBorder, false);
            this.ui.drawText("+", startX + 237, rowY + 18, UITheme.fonts.bold, addColor, "center");
            this.hitboxes.push({ id: `ADD_${attr.toUpperCase()}`, x: startX + 225, y: rowY + 2, w: 24, h: 24 });
        });
    }

    _drawActionButtons(availablePoints, pendingAllocations, x, h, w) {
        const btnY = h - 70; 
        const centerX = x + (w / 2);
        const hasPending = Object.values(pendingAllocations).some(v => v > 0);

        const btnW = this.layout.btnWidth;
        const btnH = this.layout.btnHeight;
        const spacing = this.layout.btnSpacing;
        const startX = centerX - (btnW * 1.5) - spacing; 
        
        const baseBg = UITheme.colors.bgScale[2];

        // Cancel
        const cancelX = startX;
        this.ui.drawPanel(cancelX, btnY, btnW, btnH, baseBg);
        this.ui.drawText("Cancel", cancelX + (btnW/2), btnY + 26, UITheme.fonts.body, UITheme.colors.textMain, "center");
        this.hitboxes.push({ id: 'BTN_CANCEL', x: cancelX, y: btnY, w: btnW, h: btnH });

        // Reset
        const resetX = cancelX + btnW + spacing;
        const resetColor = hasPending ? UITheme.colors.failure : UITheme.colors.textMuted;
        
        this.ui.drawPanel(resetX, btnY, btnW, btnH, baseBg);
        this.ui.drawText("Reset", resetX + (btnW/2), btnY + 26, UITheme.fonts.body, resetColor, "center");
        
        if (hasPending) {
            this.ui.drawSelectionBrackets(resetX, btnY, btnW, btnH, 2, UITheme.colors.failure);
            this.hitboxes.push({ id: 'BTN_RESET', x: resetX, y: btnY, w: btnW, h: btnH });
        }

        // Confirm
        const confirmX = resetX + btnW + spacing;
        const confirmColor = hasPending ? UITheme.colors.success : UITheme.colors.textMuted;
        
        this.ui.drawPanel(confirmX, btnY, btnW, btnH, baseBg);
        this.ui.drawText("Confirm", confirmX + (btnW/2), btnY + 26, UITheme.fonts.body, confirmColor, "center");
        
        if (hasPending) {
            this.ui.drawSelectionBrackets(confirmX, btnY, btnW, btnH, 2, UITheme.colors.success);
            this.hitboxes.push({ id: 'BTN_CONFIRM', x: confirmX, y: btnY, w: btnW, h: btnH });
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