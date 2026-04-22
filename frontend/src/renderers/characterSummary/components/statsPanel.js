import { UITheme } from '../../../ui/UITheme.js';
import { Formatting } from '../../../../../shared/utils/formatting.js';

export class StatsPanel {
    constructor(ui) {
        this.ui = ui;
    }

    render(member, stats, x, y, w) {
        let currentY = y;
        const rowHeight = 38; // Scaled up 2.4x from 16

        // ==========================================
        // 1. ATTRIBUTES SECTION
        // ==========================================
        this.ui.drawText("Attributes", x, currentY, UITheme.fonts.bold, UITheme.colors.textMain, "left");
        
        // --- Gothic Flourish Header ---
        currentY += 19; 
        this.ui.drawLineWithGothicFlourish(x, currentY, w, UITheme.colors.borderHighlight); 
        currentY += 36; // Space between line and content

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
                if (isBuffed) valColor = UITheme.colors.success; // Estus Gold for buffs
                if (isDebuffed) valColor = UITheme.colors.failure; // Dark Crimson for debuffs

                const label = Formatting.getAbbreviation(key);
                
                this.ui.drawText(label, itemX, itemY, UITheme.fonts.small, UITheme.colors.textMuted, "left");
                this.ui.drawText(displayVal.toString(), itemX + 72, itemY, UITheme.fonts.mono, valColor, "left");
            });

            currentY += (numRows * rowHeight);
        } else {
            this.ui.drawText("None", x, currentY, UITheme.fonts.italic, UITheme.colors.textMuted, "left");
            currentY += rowHeight;
        }

        currentY += 48;

        // ==========================================
        // 2. COMBAT & RECOVERY STATS SECTION
        // ==========================================
        this.ui.drawText("Combat Stats", x, currentY, UITheme.fonts.bold, UITheme.colors.textMain, "left");

        currentY += 19; 
        this.ui.drawLineWithGothicFlourish(x, currentY, w, UITheme.colors.borderHighlight);
        currentY += 36; 

        const speed = stats.speed || member.attributes?.speed || 0;
        const critChance = (stats.critChance || 0) * 100;
        const critMult = (stats.critMultiplier !== undefined) ? stats.critMultiplier : 1.5;
        const accuracy = stats.accuracy !== undefined ? stats.accuracy : 100;
        const evasion = stats.evasion !== undefined ? stats.evasion : 100;
        const hpRec = stats.hpRecovery || 0;
        const staRec = stats.staminaRecovery || 0;
        const insRec = stats.insightRecovery || 0;
        const corruption = stats.corruption || 0;

        const combatStats = [
            { label: "SPD", val: `${speed}` },
            { label: "CRT %", val: `${critChance.toFixed(0)}%` },

            { label: "HP REC", val: hpRec > 0 ? `${hpRec}` : `${hpRec}` },
            { label: "CRT DMG", val: `${critMult}` },

            { label: "STA REC", val: staRec > 0 ? `${staRec}` : `${staRec}` },
            { label: "ACC", val: `${accuracy}` },

            { label: "INS REC", val: insRec > 0 ? `${insRec}` : `${insRec}` },
            { label: "EVA", val: `${evasion}` },

            { label: "COR", val: `${corruption}` }
        ];

        const colWidth = w / 2;
        const numRows = Math.ceil(combatStats.length / 2);

        combatStats.forEach((stat, i) => {
            if (!stat.label) return; 

            const col = i % 2;
            const row = Math.floor(i / 2);
            
            const itemX = x + (col * colWidth);
            const itemY = currentY + (row * rowHeight);
            
            this.ui.drawText(stat.label, itemX, itemY, UITheme.fonts.mono, UITheme.colors.textMuted, "left");
            this.ui.drawText(stat.val, itemX + 144, itemY, UITheme.fonts.mono, UITheme.colors.textMain, "left");
        });

        currentY += (numRows * rowHeight) + 24;

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

        const headerFont = UITheme.fonts.bold;
        this.ui.drawText("TYPE", colType, currentY, headerFont, UITheme.colors.textMuted, "left");
        this.ui.drawText("ATK", colAtk, currentY, headerFont, UITheme.colors.attack, "center");
        this.ui.drawText("DEF", colDef, currentY, headerFont, UITheme.colors.defense, "center");
        this.ui.drawText("RES", colRes, currentY, headerFont, UITheme.colors.resistance, "center");
        
        currentY += 19;
        this.ui.drawLineWithGothicFlourish(x, currentY, w, UITheme.colors.borderHighlight);
        currentY += 36;

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

            // ATK (Target Red)
            const atkData = formatVal(atk, UITheme.colors.attack);
            this.ui.drawText(atkData.text, colAtk, currentY, UITheme.fonts.mono, atkData.color, "center");
            
            // DEF (Insight Blue)
            const defData = formatVal(defense, UITheme.colors.defense);
            this.ui.drawText(defData.text, colDef, currentY, UITheme.fonts.mono, defData.color, "center");
            
            // RES (Text Main)
            const resData = (res !== 0) 
                ? { text: `${(res * 100).toFixed(0)}%`, color: UITheme.colors.textMain } 
                : { text: "-", color: UITheme.colors.textMuted };
                
            this.ui.drawText(resData.text, colRes, currentY, UITheme.fonts.mono, resData.color, "center");

            currentY += 34;
        });
    }
}