import { UITheme } from '../../ui/UITheme.js';
import { CanvasUI } from '../../ui/canvasUI.js';
import { CONFIG } from '../../../../shared/data/constants.js'; 
import { StatCalculator } from '../../../../shared/systems/statCalculator.js';

export class CharacterSummaryRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader; 
        this.ui = new CanvasUI(ctx);
        this.padding = 15; 
        
        this.ICON_SIZE = CONFIG.TILE_SIZE || 32; 
        this.ICON_PADDING = CONFIG.TILE_PADDING || 0; 
        this.RENDER_SIZE = 32; 
    }

    render(state) {
        const { member, slots, selectedSlotIndex, isChoosingItem, filteredInventory, inventoryIndex } = state;
        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;

        // 1. Force crisp pixels
        this.ctx.imageSmoothingEnabled = false;

        this.ui.clearScreen(w, h);

        // [NEW] Calculate fresh stats for this frame
        const derivedStats = StatCalculator.calculate(member);

        // Adjusted widths to fit the table in the left column
        const leftW = w * 0.32; 
        const centerW = w * 0.33;
        const rightW = w * 0.35;

        const col1X = 0;
        const col2X = Math.floor(leftW);
        const col3X = Math.floor(leftW + centerW);

        // Backgrounds
        this.ctx.fillStyle = "#111"; 
        this.ctx.fillRect(col1X, 0, Math.floor(leftW), h);
        this.ctx.fillRect(col3X, 0, Math.floor(rightW), h);
        
        // Separators
        this.ctx.strokeStyle = "#333";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(col2X + 0.5, 0); this.ctx.lineTo(col2X + 0.5, h);
        this.ctx.moveTo(col3X + 0.5, 0); this.ctx.lineTo(col3X + 0.5, h);
        this.ctx.stroke();

        if (member) {
            // [NEW] Pass derivedStats to left column
            this.drawLeftColumn(member, derivedStats, col1X + this.padding, this.padding, leftW - (this.padding*2));
            this.drawCenterColumn(member, slots, selectedSlotIndex, isChoosingItem, col2X, this.padding, centerW, h);
            this.drawRightColumn(filteredInventory, inventoryIndex, isChoosingItem, col3X + this.padding, this.padding, rightW - (this.padding*2));
        }

        this.drawFooter(w, h, isChoosingItem);
    }

    drawItemIcon(item, x, y) {
        if (!item) return;

        const sheet = this.loader.get('items');
        if (!sheet) return; 

        const iconData = item.icon || (item.definition ? item.definition.icon : { col: 0, row: 0 });
        
        const totalSize = this.ICON_SIZE + this.ICON_PADDING;
        const srcX = (iconData.col * totalSize) + this.ICON_PADDING; 
        const srcY = (iconData.row * totalSize) + this.ICON_PADDING; 

        this.ctx.drawImage(
            sheet,
            srcX, srcY, this.ICON_SIZE, this.ICON_SIZE, 
            Math.floor(x), Math.floor(y), this.RENDER_SIZE, this.RENDER_SIZE 
        );
    }

    // [NEW] Completely overhauled for Table View
    drawLeftColumn(member, stats, x, y, w) {
        let currentY = y + 20;

        // 1. Header (Name & Level)
        this.ui.drawText(member.name, x, currentY, "bold 18px sans-serif", UITheme.colors.textMain, "left");
        this.ui.drawText(`Lvl ${member.level}`, x + w, currentY, "14px sans-serif", UITheme.colors.accent, "right");
        currentY += 25;

        // 2. Vitals (HP / XP / STM)
        this.ui.drawText(`HP: ${member.hp}/${member.maxHp}`, x, currentY, "12px monospace", UITheme.colors.danger, "left");
        this.ui.drawText(`XP: ${member.xp}`, x + w, currentY, "12px monospace", "#9370DB", "right");
        currentY += 15;
        this.ui.drawText(`STM: ${member.stamina}/${member.maxStamina}`, x, currentY, "12px monospace", "#32CD32", "left");
        currentY += 25;

        // ---------------------------------------------------------
        // 3. [NEW] ATTRIBUTES GRID
        // ---------------------------------------------------------
        // We use a 2-column layout to save vertical space
        const attrs = member.attributes || {};
        const attrKeys = Object.keys(attrs);

        if (attrKeys.length > 0) {
            this.ui.drawText("Attributes", x, currentY, "bold 12px sans-serif", "#888", "left");
            currentY += 15;

            const colWidth = w / 2;
            
            attrKeys.forEach((key, i) => {
                const val = attrs[key];
                // Abbreviate to 3 chars (e.g., "Strength" -> "STR") for compact UI
                const label = key.substring(0, 3).toUpperCase();
                
                // Determine column (Left or Right)
                const colX = (i % 2 === 0) ? x : x + colWidth;
                
                this.ui.drawText(label, colX, currentY, "11px sans-serif", "#aaa", "left");
                this.ui.drawText(val.toString(), colX + 30, currentY, "11px monospace", "#fff", "left");

                // Only move down after the second column (Right side)
                if (i % 2 !== 0) currentY += 14;
            });
            
            // If we ended on an odd number (left column), push Y down to complete the row
            if (attrKeys.length % 2 !== 0) currentY += 14;
            currentY += 10; // Spacer before next section
        }

        // 4. "Other" Stats (Speed, Crit, Corruption)
        const rowY = currentY;
        this.ui.drawText("Spd:", x, rowY, "11px sans-serif", "#aaa", "left");
        this.ui.drawText(stats.other.speed.toString(), x + 25, rowY, "11px monospace", "#fff", "left");
        
        this.ui.drawText("Crit:", x + 55, rowY, "11px sans-serif", "#aaa", "left");
        this.ui.drawText(stats.other.critical + "%", x + 85, rowY, "11px monospace", "#fff", "left");
        
        this.ui.drawText("Corr:", x + 130, rowY, "11px sans-serif", "#aaa", "left");
        this.ui.drawText(stats.other.corruption.toString(), x + 160, rowY, "11px monospace", "#d00", "left");
        
        currentY += 25;

        // 5. THE STAT TABLE HEADER
        const col1 = x;       // Type Name
        const col2 = x + 70;  // Atk
        const col3 = x + 115; // Def
        const col4 = x + 160; // Res

        this.ctx.fillStyle = "#222";
        this.ctx.fillRect(x - 5, currentY - 12, w + 10, 16);
        
        this.ui.drawText("TYPE", col1, currentY, "bold 10px monospace", "#888", "left");
        this.ui.drawText("ATK", col2, currentY, "bold 10px monospace", "#e66", "left");
        this.ui.drawText("DEF", col3, currentY, "bold 10px monospace", "#66e", "left");
        this.ui.drawText("RES", col4, currentY, "bold 10px monospace", "#ea6", "left");
        
        currentY += 15;

        // 6. DRAW STAT ROWS
        const types = StatCalculator.DAMAGE_TYPES; 
        
        types.forEach((type, index) => {
            // Zebra Striping
            if (index % 2 === 0) {
                this.ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
                this.ctx.fillRect(x - 5, currentY - 10, w + 10, 14);
            }

            const label = type.charAt(0).toUpperCase() + type.slice(1);
            const atk = stats.attacks[type] || 0;
            const def = stats.defenses[type] || 0;
            const res = stats.resistances[type] || 0;

            // Grey out zeros for readability
            const cAtk = atk > 0 ? "#faa" : "#444";
            const cDef = def > 0 ? "#aaf" : "#444";
            const cRes = res > 0 ? "#fea" : "#444";

            this.ui.drawText(label, col1, currentY, "11px monospace", "#bbb", "left");
            this.ui.drawText(atk.toString(), col2, currentY, "11px monospace", cAtk, "left");
            this.ui.drawText(def.toString(), col3, currentY, "11px monospace", cDef, "left");
            this.ui.drawText(`${res}%`, col4, currentY, "11px monospace", cRes, "left");

            currentY += 14; 
        });
    }

    drawCenterColumn(member, defaultSlots, selectedIndex, isChoosingItem, x, y, w, h) {
        const centerX = Math.floor(x + (w / 2));
        let currentY = y + 10; 

        // 1. PORTRAIT
        const portraitSize = 128; 
        const pX = Math.floor(centerX - (portraitSize/2));

        this.ctx.strokeStyle = UITheme.colors.border;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pX, currentY, portraitSize, portraitSize);

        let assetKey = member.portrait || member.sprite || 'hero'; 
        if (!this.loader.get(assetKey)) assetKey = 'spritesheet';
        const img = this.loader.get(assetKey);

        if (img) {
            this.ctx.drawImage(
                img, 
                pX, currentY, 
                portraitSize, portraitSize
            );
        }
        
        currentY += portraitSize + 20;

        // 2. EQUIPMENT SLOTS
        const activeSlots = member.slots || defaultSlots;
        const equipData = (member.state && member.state.equipment) ? member.state.equipment : (member.equipment || {});

        activeSlots.forEach((slotName, index) => {
            const isSelected = (index === selectedIndex);
            
            const boxH = 34; 
            const boxW = Math.floor(w * 0.95); 
            const boxX = Math.floor(centerX - (boxW / 2));

            let borderColor = isSelected 
                ? (isChoosingItem ? UITheme.colors.primary : UITheme.colors.accent) 
                : "#333";
            let boxColor = isSelected 
                ? (isChoosingItem ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.1)") 
                : "transparent";

            this.ctx.fillStyle = boxColor;
            this.ctx.fillRect(boxX, currentY, boxW, boxH);
            this.ctx.strokeStyle = borderColor;
            this.ctx.lineWidth = isSelected ? 2 : 1;
            this.ctx.strokeRect(boxX, currentY, boxW, boxH);

            const textY = Math.floor(currentY + (boxH / 2) + 4);
            
            this.ui.drawText(slotName.toUpperCase(), boxX + 6, textY, "10px monospace", UITheme.colors.primary, "left");

            const item = equipData[slotName];
            if (item) {
                const iconX = Math.floor(boxX + boxW - 4 - this.RENDER_SIZE);
                const iconY = Math.floor(currentY + (boxH - this.RENDER_SIZE) / 2);
                this.drawItemIcon(item, iconX, iconY);
            } else {
                this.ui.drawText("---", boxX + boxW - 6, textY, "12px sans-serif", "#555", "right");
            }

            currentY += boxH + 4; 
        });
    }

    drawRightColumn(inventory, selectedIndex, isActive, x, y, w) {
        let currentY = y + 20;

        this.ui.drawText("Inventory", x, currentY, "bold 16px sans-serif", UITheme.colors.textHighlight, "left");
        currentY += 10;
        
        this.ctx.fillStyle = "#444";
        this.ctx.fillRect(Math.floor(x), currentY + 10, Math.floor(w), 2);
        currentY += 25;

        if (!inventory || inventory.length === 0) {
            this.ui.drawText("Empty", x, currentY, "13px sans-serif", "#555", "left");
            return;
        }

        inventory.forEach((item, index) => {
            const isSelected = (isActive && index === selectedIndex);
            const rowHeight = 34; 

            if (isSelected) {
                this.ctx.fillStyle = "rgba(255, 215, 0, 0.1)"; 
                this.ctx.fillRect(Math.floor(x - 5), Math.floor(currentY - 18), Math.floor(w + 10), rowHeight);
                this.ui.drawText(">", x - 12, currentY, "13px sans-serif", UITheme.colors.accent, "left");
            }

            const iconY = Math.floor(currentY - 16);
            this.drawItemIcon(item, Math.floor(x), iconY);

            const textX = Math.floor(x + this.RENDER_SIZE + 8);
            const color = isSelected ? "#ffffff" : "#aaaaaa";
            const name = item.name || (item.definition ? item.definition.name : "Unknown");
            
            this.ui.drawText(name, textX, currentY, "13px sans-serif", color, "left");
            
            if (isSelected) {
                const data = item.definition || item;
                // Simple summary of item stats
                let statText = "";
                if (data.damage) statText = `Atk ${Object.values(data.damage)[0] || 0}`;
                else if (data.defense) statText = `Def ${Object.values(data.defense)[0] || 0}`;
                
                if (statText) {
                    this.ui.drawText(statText, x + w, currentY, "11px monospace", "#888", "right");
                }
            }

            currentY += rowHeight;
        });
    }

    drawStatRow(label, value, x, y, valColor = "#ffffff") {
        this.ui.drawText(`${label}:`, x, y, "13px sans-serif", "#aaaaaa", "left");
        this.ui.drawText(value.toString(), x + 80, y, "13px sans-serif", valColor, "left");
    }

    drawFooter(w, h, isChoosingItem) {
        const y = h - 15;
        const text = isChoosingItem 
            ? "Navigate: [ARROWS]   Equip: [ENTER]   Cancel: [ESC]"
            : "Select: [W/S]   Bag: [ENTER]   Unequip: [X]   Next: [TAB]   Exit: [ESC]";
        this.ui.drawText(text, w / 2, y, "12px monospace", "#666", "center");
    }
}