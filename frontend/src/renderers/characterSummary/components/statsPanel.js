import { UITheme } from '../../../ui/UITheme.js';

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
        this.ui.drawRect(x, currentY, w, 1, "#333"); 
        currentY += 15; // Space between line and content

        const attrs = member.attributes || {};
        const attrKeys = Object.keys(attrs);

        if (attrKeys.length > 0) {
            const colWidth = w / 2;
            const numRows = Math.ceil(attrKeys.length / 2);

            attrKeys.forEach((key, i) => {
                const rowIndex = Math.floor(i / 2);
                const itemY = currentY + (rowIndex * rowHeight);
                
                const baseVal = attrs[key];      
                const finalVal = stats[key];     
                const displayVal = (finalVal !== undefined) ? finalVal : baseVal;
                const isBuffed = displayVal > baseVal;
                const valColor = isBuffed ? UITheme.colors.accent : "#fff"; 
                const label = this._getAbbreviation(key);
                
                const colX = (i % 2 === 0) ? x : x + colWidth;
                
                this.ui.drawText(label, colX, itemY, UITheme.fonts.small, "#aaa", "left");
                this.ui.drawText(displayVal.toString(), colX + 30, itemY, UITheme.fonts.mono, valColor, "left");
            });

            currentY += (numRows * rowHeight);
        } else {
            this.ui.drawText("None", x, currentY, "italic 11px sans-serif", "#555", "left");
            currentY += rowHeight;
        }

        // Add padding before next section starts
        currentY += 20;


        // ==========================================
        // 2. COMBAT STATS SECTION
        // ==========================================
        this.ui.drawText("Combat Stats", x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");

        // --- Underline Header ---
        currentY += 5; 
        this.ui.drawRect(x, currentY, w, 1, "#333");
        currentY += 15; // Space between line and content

        const drawRow = (label, val, color) => {
            this.ui.drawText(label, x, currentY, UITheme.fonts.mono, "#bbb", "left");
            this.ui.drawText(val, x + 70, currentY, UITheme.fonts.mono, color, "left");
            currentY += rowHeight; 
        };

        const speed = stats.speed || member.attributes?.speed || 0;
        drawRow("SPD", `${speed}`, UITheme.colors.accent);

        const critChance = (stats.critChance || 0) * 100;
        drawRow("CRT %", `${critChance.toFixed(0)}%`, UITheme.colors.insight);

        const critMult = (stats.critMultiplier !== undefined) ? stats.critMultiplier : 1.5;
        drawRow("CRT Dmg", `x${critMult}`, "#aa7");

        // Add padding before next section starts
        currentY += 20;


        // ==========================================
        // 3. RESISTANCE TABLE
        // ==========================================
        this._drawResistanceTable(stats, x, currentY, w);
    }

    _drawResistanceTable(stats, x, y, w) {
        let currentY = y;
        const colType = x;
        const colAtk = x + 70;
        const colDef = x + 105;
        const colRes = x + 140;

        const headerFont = "bold 10px sans-serif";
        this.ui.drawText("TYPE", colType, currentY, headerFont, "#666", "left");
        this.ui.drawText("ATK", colAtk, currentY, headerFont, UITheme.colors.danger, "center");
        this.ui.drawText("DEF", colDef, currentY, headerFont, UITheme.colors.magic, "center");
        this.ui.drawText("RES", colRes, currentY, headerFont, UITheme.colors.insight, "center");
        
        // Underline for Table Header
        currentY += 5;
        this.ui.drawRect(x, currentY, w - 5, 1, "#444");
        currentY += 15;

        const types = [
            "blunt", "slash", "pierce", 
            "fire", "ice", "lightning", "water", "earth", "wind", 
            "light", "dark", "arcane"
        ];
        
        types.forEach((type) => {
            const atk = (stats.attack || {})[type] || 0;
            const defense = stats.defense[type] || 0;
            const res = stats.resistance[type] || 0;
            
            if (atk === 0 && defense === 0 && res === 0) return;

            const label = this._getAbbreviation(type);
            this.ui.drawText(label, colType, currentY, UITheme.fonts.mono, "#bbb", "left");
            this.ui.drawText(`${atk}`, colAtk, currentY, UITheme.fonts.mono, atk > 0 ? "#f88" : "#444", "center");
            this.ui.drawText(`${defense}`, colDef, currentY, UITheme.fonts.mono, defense > 0 ? "#aaf" : "#444", "center");
            this.ui.drawText(`${res}%`, colRes, currentY, UITheme.fonts.mono, res > 0 ? "#fea" : "#444", "center");
            currentY += 14; 
        });
    }

    _getAbbreviation(text) {
        if (!text) return "";
        const map = {
            strength: "STR", dexterity: "DEX", intelligence: "INT", vigor: "VGR", attunement: "ATN",
            blunt: "BNT", slash: "SLS", pierce: "PRC", fire: "FIR", ice: "ICE", 
            lightning: "LIG", water: "WAT", earth: "ERT", wind: "WND", light: "LGT", dark: "DRK", arcane: "ARC"
        };
        return map[text.toLowerCase()] || text.substring(0, 3).toUpperCase();
    }
}