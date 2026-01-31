import { UITheme } from '../../../ui/UITheme.js';
import { Formatting } from '../../../../../shared/utils/formatting.js';

export class StatsPanel {
    constructor(ui) {
        this.ui = ui;
    }

    render(member, stats, x, y, w) {
        let currentY = y;

        // 1. Attributes
        this.ui.drawText("Attributes", x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 15;

        const attrs = member.attributes || {};
        const attrKeys = Object.keys(attrs);
        
        if (attrKeys.length > 0) {
            const colWidth = w / 2;
            attrKeys.forEach((key, i) => {
                const baseVal = attrs[key];
                const finalVal = stats[key];
                const displayVal = (finalVal !== undefined) ? finalVal : baseVal;
                
                // Color green if buffed
                const valColor = (displayVal > baseVal) ? UITheme.colors.accent : "#fff";
                const label = Formatting.getAbbreviation(key);
                
                const colX = (i % 2 === 0) ? x : x + colWidth;
                
                this.ui.drawText(label, colX, currentY, UITheme.fonts.small, "#aaa", "left");
                this.ui.drawText(displayVal.toString(), colX + 30, currentY, UITheme.fonts.mono, valColor, "left");

                if (i % 2 !== 0) currentY += 14;
            });
            if (attrKeys.length % 2 !== 0) currentY += 14;
        }
        currentY += 15;

        // 2. Combat Stats
        this.ui.drawText("Stats", x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 15;

        const drawRow = (label, val, color) => {
            this.ui.drawText(label, x, currentY, UITheme.fonts.mono, "#bbb", "left");
            this.ui.drawText(val, x + 70, currentY, UITheme.fonts.mono, color, "left");
            currentY += 14;
        };

        const speed = stats.speed || member.attributes?.speed || 0;
        drawRow("SPD", `${speed}`, UITheme.colors.accent);

        const critChance = (stats.critChance || 0) * 100;
        drawRow("CRT %", `${critChance.toFixed(0)}%`, UITheme.colors.insight);

        const critMult = (stats.critMultiplier !== undefined) ? stats.critMultiplier : 1.5;
        drawRow("CRT Dmg", `x${critMult}`, "#aa7");

        currentY += 10;

        // 3. Resistances Table
        const colType = x;
        const colAtk = x + 70;
        const colDef = x + 105;
        const colRes = x + 140;

        this.ui.drawText("TYPE", colType, currentY, "bold 10px sans-serif", "#666", "left");
        this.ui.drawText("ATK", colAtk, currentY, "bold 10px sans-serif", UITheme.colors.danger, "center");
        this.ui.drawText("DEF", colDef, currentY, "bold 10px sans-serif", UITheme.colors.magic, "center");
        this.ui.drawText("RES", colRes, currentY, "bold 10px sans-serif", UITheme.colors.insight, "center");

        this.ui.drawRect(x, currentY + 4, w - 10, 1, "#333");
        currentY += 15;

        const types = ["blunt", "slash", "pierce", "fire", "ice", "lightning", "light", "dark"];
        
        types.forEach((type) => {
            const atk = (stats.attack || {})[type] || 0;
            const defense = (stats.defense || {})[type] || 0;
            const res = (stats.resistance || {})[type] || 0;

            if (atk === 0 && defense === 0 && res === 0) return;

            const label = Formatting.getAbbreviation(type);
            this.ui.drawText(label, colType, currentY, UITheme.fonts.mono, "#bbb", "left");
            this.ui.drawText(`${atk}`, colAtk, currentY, UITheme.fonts.mono, atk > 0 ? "#f88" : "#444", "center");
            this.ui.drawText(`${defense}`, colDef, currentY, UITheme.fonts.mono, defense > 0 ? "#aaf" : "#444", "center");
            this.ui.drawText(`${res}%`, colRes, currentY, UITheme.fonts.mono, res > 0 ? "#fea" : "#444", "center");
            currentY += 14;
        });
    }
}