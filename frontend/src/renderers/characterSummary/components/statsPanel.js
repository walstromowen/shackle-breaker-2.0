import { UITheme } from '../../../ui/UITheme.js';
import { Formatting } from '../../../../../shared/utils/formatting.js';

export class StatsPanel {
    constructor(ui) {
        this.ui = ui;
    }

    render(member, stats, x, y, w) {
        let currentY = y;
        const rowHeight = 16;

        // ==========================================
        // 1. ATTRIBUTES SECTION
        // ==========================================
        this.ui.drawText("Attributes", x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        
        // --- Underline Header ---
        currentY += 5; 
        this.ui.drawRect(x, currentY, w, 1, UITheme.colors.border); 
        currentY += 15; // Space between line and content

        const attrs = member.attributes || {};
        const attrKeys = Object.keys(attrs);

        if (attrKeys.length > 0) {
            const colWidth = w / 2;
            const numRows = Math.ceil(attrKeys.length / 2);

            attrKeys.forEach((key, i) => {
                const col = i % 2;
                const row = Math.floor(i / 2);
                
                const itemX = x + (col * colWidth);
                const itemY = currentY + (row * rowHeight);
                
                const baseVal = attrs[key];      
                const finalVal = stats[key];     
                
                const displayVal = (finalVal !== undefined) ? finalVal : baseVal;
                const isBuffed = displayVal > baseVal;
                const isDebuffed = displayVal < baseVal;
                
                let valColor = UITheme.colors.textMain;
                if (isBuffed) valColor = UITheme.colors.accent; 
                if (isDebuffed) valColor = UITheme.colors.danger; 

                const label = Formatting.getAbbreviation(key);
                
                this.ui.drawText(label, itemX, itemY, UITheme.fonts.small, UITheme.colors.textMuted, "left");
                this.ui.drawText(displayVal.toString(), itemX + 30, itemY, UITheme.fonts.mono, valColor, "left");
            });

            currentY += (numRows * rowHeight);
        } else {
            this.ui.drawText("None", x, currentY, "italic 11px sans-serif", UITheme.colors.textMuted, "left");
            currentY += rowHeight;
        }

        currentY += 20;

        // ==========================================
        // 2. COMBAT STATS SECTION
        // ==========================================
        this.ui.drawText("Combat Stats", x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");

        currentY += 5; 
        this.ui.drawRect(x, currentY, w, 1, UITheme.colors.border);
        currentY += 15; 

        const drawRow = (label, val, color) => {
            this.ui.drawText(label, x, currentY, UITheme.fonts.mono, UITheme.colors.textMuted, "left");
            this.ui.drawText(val, x + 70, currentY, UITheme.fonts.mono, color, "left");
            currentY += rowHeight; 
        };

        const speed = stats.speed || member.attributes?.speed || 0;
        drawRow("SPD", `${speed}`, UITheme.colors.textMain);

        const critChance = (stats.critChance || 0) * 100;
        // CHANGED: Use textMain (Default) instead of insight color
        drawRow("CRT %", `${critChance.toFixed(0)}%`, UITheme.colors.textMain);

        const critMult = (stats.critMultiplier !== undefined) ? stats.critMultiplier : 1.5;
        // CHANGED: Use textMain (Default) instead of custom gold
        drawRow("CRT Dmg", `x${critMult}`, UITheme.colors.textMain);

        currentY += 20;

        // ==========================================
        // 3. RESISTANCE TABLE
        // ==========================================
        this._drawResistanceTable(stats, x, currentY, w);
    }

    _drawResistanceTable(stats, x, y, w) {
        let currentY = y;
        
        const colType = x;
        const colAtk = x + (w * 0.45);
        const colDef = x + (w * 0.65);
        const colRes = x + (w * 0.85);

        const headerFont = "bold 10px sans-serif";
        this.ui.drawText("TYPE", colType, currentY, headerFont, UITheme.colors.textMuted, "left");
        this.ui.drawText("ATK", colAtk, currentY, headerFont, UITheme.colors.danger, "center");
        this.ui.drawText("DEF", colDef, currentY, headerFont, UITheme.colors.magic, "center");
        // CHANGED: Header for RES is now textMuted (default gray) to match the request for "default color"
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
            const atk = (stats.attack || {})[type] || 0;
            const defense = (stats.defense || {})[type] || 0;
            const res = (stats.resistance || {})[type] || 0;
            
            if (atk === 0 && defense === 0 && res === 0) return;

            const label = Formatting.getAbbreviation(type);
            
            this.ui.drawText(label, colType, currentY, UITheme.fonts.mono, UITheme.colors.textMuted, "left");
            
            const formatVal = (val, color) => {
                 const display = val > 0 ? `${val}` : "-";
                 const displayColor = val > 0 ? color : UITheme.colors.textMuted;
                 return { text: display, color: displayColor };
            };

            // ATK (Danger/Red)
            const atkData = formatVal(atk, UITheme.colors.danger);
            this.ui.drawText(atkData.text, colAtk, currentY, UITheme.fonts.mono, atkData.color, "center");
            
            // DEF (Magic/Blue)
            const defData = formatVal(defense, UITheme.colors.magic);
            this.ui.drawText(defData.text, colDef, currentY, UITheme.fonts.mono, defData.color, "center");
            
            // RES (Default/White)
            // CHANGED: Use textMain instead of insight color for value
            const resData = (res !== 0) 
                ? { text: `${res}%`, color: UITheme.colors.textMain } 
                : { text: "-", color: UITheme.colors.textMuted };
                
            this.ui.drawText(resData.text, colRes, currentY, UITheme.fonts.mono, resData.color, "center");

            currentY += 14; 
        });
    }
}