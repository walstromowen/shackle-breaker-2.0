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
        const { member, slots, selectedSlotIndex, isChoosingItem, filteredInventory, inventoryIndex, viewMode, focusedItem } = state;
        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;

        this.ctx.imageSmoothingEnabled = false;
        this.ui.clearScreen(w, h);

        const derivedStats = StatCalculator.calculate(member);

        // Columns: Left (28%), Center (44%), Right (28%)
        const leftW = Math.floor(w * 0.28); 
        const centerW = Math.floor(w * 0.44);
        const rightW = w - leftW - centerW;

        const col1X = 0;
        const col2X = leftW;
        const col3X = leftW + centerW;

        // Backgrounds
        this.ctx.fillStyle = "#111"; 
        this.ctx.fillRect(col1X, 0, leftW, h);
        this.ctx.fillRect(col3X, 0, rightW, h);
        
        // Separators
        this.ctx.strokeStyle = "#333";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(col2X + 0.5, 0); this.ctx.lineTo(col2X + 0.5, h);
        this.ctx.moveTo(col3X + 0.5, 0); this.ctx.lineTo(col3X + 0.5, h);
        this.ctx.stroke();

        if (member) {
            this.drawLeftColumn(member, derivedStats, viewMode, focusedItem, col1X + this.padding, this.padding, leftW - (this.padding*2));
            this.drawCenterColumn(member, slots, selectedSlotIndex, isChoosingItem, col2X, this.padding, centerW, h);
            this.drawRightColumn(filteredInventory, inventoryIndex, isChoosingItem, col3X + this.padding, this.padding, rightW - (this.padding*2));
        }

        this.drawFooter(w, h, isChoosingItem);
    }

    // ===========================================
    // HELPER METHODS
    // ===========================================

    drawItemIcon(item, x, y) {
        if (!item) return;
        const sheet = this.loader.get('items');
        if (!sheet) return; 
        const iconData = item.icon || (item.definition ? item.definition.icon : { col: 0, row: 0 });
        const totalSize = this.ICON_SIZE + this.ICON_PADDING;
        const srcX = (iconData.col * totalSize) + this.ICON_PADDING; 
        const srcY = (iconData.row * totalSize) + this.ICON_PADDING; 
        this.ctx.drawImage(sheet, srcX, srcY, this.ICON_SIZE, this.ICON_SIZE, Math.floor(x), Math.floor(y), this.RENDER_SIZE, this.RENDER_SIZE);
    }

    getWrappedLines(text, maxWidth, font) {
        if (!text) return [];
        this.ctx.font = font;
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = this.ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    // ===========================================
    // LEFT COLUMN (Stats/Items)
    // ===========================================

    drawLeftColumn(member, stats, viewMode, focusedItem, x, y, w) {
        let currentY = y + 10;

        // --- 1. DRAW TABS ---
        const tabW = w / 2;
        const tabH = 24;
        
        // Tab: STATS
        this.ctx.fillStyle = (viewMode === 'STATS') ? "#333" : "#111";
        this.ctx.fillRect(x, y, tabW, tabH);
        this.ctx.strokeStyle = (viewMode === 'STATS') ? "#666" : "#222";
        this.ctx.strokeRect(x, y, tabW, tabH);
        this.ui.drawText("STATS", x + tabW/2, y + 16, "bold 11px sans-serif", (viewMode === 'STATS' ? "#fff" : "#555"), "center");

        // Tab: ITEM
        this.ctx.fillStyle = (viewMode === 'ITEM') ? "#333" : "#111";
        this.ctx.fillRect(x + tabW, y, tabW, tabH);
        this.ctx.strokeStyle = (viewMode === 'ITEM') ? "#666" : "#222";
        this.ctx.strokeRect(x + tabW, y, tabW, tabH);
        this.ui.drawText("ITEM", x + tabW + tabW/2, y + 16, "bold 11px sans-serif", (viewMode === 'ITEM' ? "#fff" : "#555"), "center");

        currentY += tabH + 20;

        // --- 2. DRAW CONTENT ---
        if (viewMode === 'STATS') {
            this.drawStatsPanel(member, stats, x, currentY, w);
        } else {
            this.drawItemDetailPanel(focusedItem, x, currentY, w);
        }
    }

    drawStatsPanel(member, stats, x, startY, w) {
        let currentY = startY;

        // 1. Attributes
        const attrs = member.attributes || {};
        const attrKeys = Object.keys(attrs);
        
        this.ui.drawText("Attributes", x, currentY, "bold 12px sans-serif", "#888", "left");
        currentY += 15;

        if (attrKeys.length > 0) {
            const colWidth = w / 2;
            attrKeys.forEach((key, i) => {
                const val = attrs[key];
                const label = key.substring(0, 3).toUpperCase();
                const colX = (i % 2 === 0) ? x : x + colWidth;
                this.ui.drawText(label, colX, currentY, "11px sans-serif", "#aaa", "left");
                this.ui.drawText(val.toString(), colX + 30, currentY, "11px monospace", "#fff", "left");
                if (i % 2 !== 0) currentY += 14;
            });
            if (attrKeys.length % 2 !== 0) currentY += 14;
        } else {
            this.ui.drawText("None", x, currentY, "italic 11px sans-serif", "#555", "left");
            currentY += 14;
        }
        currentY += 15;

        // 2. Combat Properties
        this.ui.drawText("Combat Properties", x, currentY, "bold 12px sans-serif", "#888", "left");
        currentY += 15;

        // Speed
        const speed = stats.speed || member.attributes?.speed || 0;
        this.ui.drawText("Speed", x, currentY, "11px monospace", "#bbb", "left");
        this.ui.drawText(`${speed}`, x + 60, currentY, "11px monospace", "#0ff", "left");
        currentY += 14;

        // Critical
        const critChance = (stats.critChance || 0) * 100;
        const critMult = (stats.critMultiplier !== undefined) ? stats.critMultiplier : 1.5;
        this.ui.drawText("Crit Chance", x, currentY, "11px monospace", "#bbb", "left");
        this.ui.drawText(`${critChance.toFixed(0)}%`, x + 70, currentY, "11px monospace", "#fe0", "left");
        currentY += 14;
        
        this.ui.drawText("Crit Dmg", x, currentY, "11px monospace", "#bbb", "left");
        this.ui.drawText(`x${critMult}`, x + 70, currentY, "11px monospace", "#aa7", "left");
        currentY += 14;

        // Corruption
        const corruption = member.corruption || stats.corruption || 0;
        this.ui.drawText("Corruption", x, currentY, "11px monospace", "#bbb", "left");
        this.ui.drawText(`${corruption}`, x + 70, currentY, "11px monospace", "#b0f", "left");
        currentY += 25;

        // 3. Combined Table: Type | Atk | Def | Res
        const types = StatCalculator.DAMAGE_TYPES; 
        const attackStats = stats.attack || {};
        
        // Define Column X offsets
        const colType = x;
        const colAtk = x + 70;
        const colDef = x + 105;
        const colRes = x + 140;

        // Headers
        this.ctx.fillStyle = "#666";
        this.ui.drawText("TYPE", colType, currentY, "bold 10px sans-serif", "#666", "left");
        this.ui.drawText("ATK", colAtk, currentY, "bold 10px sans-serif", "#f66", "center");
        this.ui.drawText("DEF", colDef, currentY, "bold 10px sans-serif", "#66f", "center");
        this.ui.drawText("RES", colRes, currentY, "bold 10px sans-serif", "#fe6", "center");
        
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(x, currentY + 4, w - 10, 1);
        currentY += 15;

        // Rows
        types.forEach((type) => {
            const atk = attackStats[type] || 0;
            const def = stats.defenses[type] || 0;
            const res = stats.resistances[type] || 0;
            
            const label = type.charAt(0).toUpperCase() + type.slice(1);
            
            const isZeroRow = (atk === 0 && def === 0 && res === 0);
            const labelColor = isZeroRow ? "#444" : "#bbb";
            
            this.ui.drawText(label, colType, currentY, "11px monospace", labelColor, "left");
            this.ui.drawText(`${atk}`, colAtk, currentY, "11px monospace", atk > 0 ? "#f88" : "#444", "center");
            this.ui.drawText(`${def}`, colDef, currentY, "11px monospace", def > 0 ? "#aaf" : "#444", "center");
            this.ui.drawText(`${res}%`, colRes, currentY, "11px monospace", res > 0 ? "#fea" : "#444", "center");
            
            currentY += 14; 
        });
    }

    drawItemDetailPanel(item, x, startY, w) {
        if (!item) {
            this.ui.drawText("No Item Selected", x + w/2, startY + 50, "italic 13px sans-serif", "#555", "center");
            return;
        }

        let currentY = startY;
        const def = item.definition || item;
        const name = def.name || "Unknown Item";
        const type = (def.slot || "Item").toUpperCase();
        
        // 1. Header
        this.ctx.fillStyle = UITheme.colors.border;
        this.ctx.fillRect(x, currentY, w, 2);
        currentY += 15;

        this.drawItemIcon(item, x, currentY);
        
        const nameFont = "bold 16px sans-serif";
        const nameLines = this.getWrappedLines(name, w - 40, nameFont);
        
        nameLines.forEach((line, i) => {
            this.ui.drawText(line, x + 40, currentY + 12 + (i*18), nameFont, "#fff", "left");
        });

        currentY += Math.max(40, nameLines.length * 18 + 5); 
        this.ui.drawText(type, x, currentY, "10px monospace", UITheme.colors.accent, "left");
        currentY += 20;

        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(x, currentY, w, 1);
        currentY += 15;

        // 2. Stats
        this.ui.drawText("Stats", x, currentY, "bold 12px sans-serif", "#888", "left");
        currentY += 15;

        let hasStats = false;
        
        // STRICT: Only look for 'attack'
        if (def.attack) {
            hasStats = true;
            Object.entries(def.attack).forEach(([type, val]) => {
                this.ui.drawText(`Atk (${type})`, x, currentY, "12px monospace", "#bbb", "left");
                this.ui.drawText(`${val}`, x + w, currentY, "12px monospace", "#faa", "right");
                currentY += 14;
            });
        }
        if (def.defense) {
            hasStats = true;
            Object.entries(def.defense).forEach(([type, val]) => {
                this.ui.drawText(`Def (${type})`, x, currentY, "12px monospace", "#bbb", "left");
                this.ui.drawText(`${val}`, x + w, currentY, "12px monospace", "#aaf", "right");
                currentY += 14;
            });
        }
        if (def.attributes) {
            hasStats = true;
            currentY += 5;
            Object.entries(def.attributes).forEach(([attr, val]) => {
                 this.ui.drawText(`${attr.toUpperCase()}`, x, currentY, "11px monospace", "#8f8", "left");
                 this.ui.drawText(`+${val}`, x + w, currentY, "11px monospace", "#8f8", "right");
                 currentY += 14;
            });
        }
        if (!hasStats) {
            this.ui.drawText("No combat stats", x, currentY, "italic 11px sans-serif", "#555", "left");
            currentY += 14;
        }

        currentY += 10;
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(x, currentY, w, 1);
        currentY += 15;

        // 3. Description
        this.ui.drawText("Description", x, currentY, "bold 12px sans-serif", "#888", "left");
        currentY += 15;

        const description = def.description || "A mysterious item.";
        const descFont = "11px serif";
        const descLines = this.getWrappedLines(description, w, descFont);

        descLines.forEach(line => {
            this.ui.drawText(line, x, currentY, descFont, "#ccc", "left");
            currentY += 14;
        });
    }

    // ===========================================
    // CENTER COLUMN (Name/Vitals + Equipment)
    // ===========================================

    drawCenterColumn(member, activeSlots, selectedIndex, isChoosingItem, x, y, w, h) {
        // --- 1. Header (Name & Vitals) ---
        let headerY = y + 10;
        const centerX = Math.floor(x + (w / 2));

        // Name and Level
        this.ui.drawText(member.name, centerX, headerY + 15, "bold 20px sans-serif", UITheme.colors.textMain, "center");
        this.ui.drawText(`Level ${member.level}`, centerX, headerY + 36, "12px sans-serif", UITheme.colors.accent, "center");

        // Vitals Row (HP | STM | XP)
        const vitalY = headerY + 58;
        const gap = 15;
        
        const hpText = `HP ${member.hp}/${member.maxHp}`;
        const stmText = `STM ${member.stamina}/${member.maxStamina}`;
        const xpText = `XP ${member.xp}`;

        this.ctx.font = "12px monospace";
        const hpW = this.ctx.measureText(hpText).width;
        const stmW = this.ctx.measureText(stmText).width;
        const xpW = this.ctx.measureText(xpText).width;
        
        const totalW = hpW + stmW + xpW + (gap * 2);
        let startX = centerX - (totalW / 2);

        this.ui.drawText(hpText, startX + (hpW/2), vitalY, "12px monospace", UITheme.colors.danger, "center");
        startX += hpW + gap;
        this.ui.drawText(stmText, startX + (stmW/2), vitalY, "12px monospace", "#32CD32", "center");
        startX += stmW + gap;
        this.ui.drawText(xpText, startX + (xpW/2), vitalY, "12px monospace", "#9370DB", "center");

        // Separator Line
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(x + 20, vitalY + 15, w - 40, 1);

        // --- 2. Equipment Slots ---
        const equipData = (member.state && member.state.equipment) ? member.state.equipment : (member.equipment || {});

        const splitIndex = Math.ceil(activeSlots.length / 2);
        const leftSlots = activeSlots.slice(0, splitIndex);
        const rightSlots = activeSlots.slice(splitIndex);

        const PORTRAIT_SIZE = 112; 
        const SLOT_HEIGHT = 48; 
        const headerHeight = 85; 
        
        const totalSlotHeight = Math.max(leftSlots.length, rightSlots.length) * (SLOT_HEIGHT + 4);
        const contentHeight = Math.max(PORTRAIT_SIZE, totalSlotHeight);
        
        // Shifted Up: Fixed position below header
        const equipStartY = y + headerHeight + 10;
        
        const pX = Math.floor(centerX - (PORTRAIT_SIZE / 2));
        const pY = Math.floor(equipStartY + (contentHeight - PORTRAIT_SIZE) / 2);

        // Draw Portrait Box
        this.ctx.strokeStyle = UITheme.colors.border;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pX, pY, PORTRAIT_SIZE, PORTRAIT_SIZE);
        
        let assetKey = member.portrait || member.sprite || 'hero'; 
        if (!this.loader.get(assetKey)) assetKey = 'spritesheet';
        const img = this.loader.get(assetKey);
        if (img) this.ctx.drawImage(img, pX, pY, PORTRAIT_SIZE, PORTRAIT_SIZE);

        const drawSlot = (slotName, index, isLeft) => {
            const globalIndex = isLeft ? index : splitIndex + index;
            const isSelected = (globalIndex === selectedIndex);
            
            const slotW = Math.floor((w - PORTRAIT_SIZE - 20) / 2); 
            const slotX = isLeft ? (centerX - (PORTRAIT_SIZE/2) - slotW - 8) : (centerX + (PORTRAIT_SIZE/2) + 8);
            const slotY = equipStartY + (index * (SLOT_HEIGHT + 4));

            let borderColor = isSelected ? (isChoosingItem ? UITheme.colors.primary : UITheme.colors.accent) : "#333";
            let boxColor = isSelected ? (isChoosingItem ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.1)") : "rgba(0,0,0,0.3)";

            this.ctx.fillStyle = boxColor;
            this.ctx.fillRect(slotX, slotY, slotW, SLOT_HEIGHT);
            this.ctx.strokeStyle = borderColor;
            this.ctx.lineWidth = isSelected ? 2 : 1;
            this.ctx.strokeRect(slotX, slotY, slotW, SLOT_HEIGHT);

            const item = equipData[slotName];
            let itemName = "Unknown";
            if (item) itemName = item.name || (item.definition ? item.definition.name : "Item");

            const slotLabelColor = "#666";
            const itemTextColor = UITheme.colors.textMain;
            const emptyTextColor = "#444";
            const font = "11px sans-serif";
            const lineHeight = 12;

            if (isLeft) {
                const iconX = slotX + slotW - this.RENDER_SIZE - 4;
                if (item) this.drawItemIcon(item, iconX, slotY + (SLOT_HEIGHT - this.RENDER_SIZE)/2);
                
                this.ui.drawText(slotName.toUpperCase(), slotX + 6, slotY + 10, "9px monospace", slotLabelColor, "left");
                
                const maxTextW = slotW - this.RENDER_SIZE - 12;
                const textRegionY = slotY + 16; 

                if (item) {
                    const lines = this.getWrappedLines(itemName, maxTextW, font);
                    let cursorY = textRegionY + ((SLOT_HEIGHT - 20) - (lines.length * lineHeight)) / 2 + 5;
                    lines.forEach(line => {
                        this.ui.drawText(line, iconX - 6, cursorY, font, itemTextColor, "right");
                        cursorY += lineHeight;
                    });
                } else {
                     this.ui.drawText("Empty", iconX - 6, slotY + (SLOT_HEIGHT/2) + 6, font, emptyTextColor, "right");
                }
            } else {
                const iconX = slotX + 4;
                if (item) this.drawItemIcon(item, iconX, slotY + (SLOT_HEIGHT - this.RENDER_SIZE)/2);
                
                this.ui.drawText(slotName.toUpperCase(), slotX + slotW - 6, slotY + 10, "9px monospace", slotLabelColor, "right");
                
                const textStartX = iconX + this.RENDER_SIZE + 6;
                const maxTextW = slotW - this.RENDER_SIZE - 12;
                const textRegionY = slotY + 16; 

                if (item) {
                    const lines = this.getWrappedLines(itemName, maxTextW, font);
                    let cursorY = textRegionY + ((SLOT_HEIGHT - 20) - (lines.length * lineHeight)) / 2 + 5;
                    lines.forEach(line => {
                        this.ui.drawText(line, textStartX, cursorY, font, itemTextColor, "left");
                        cursorY += lineHeight;
                    });
                } else {
                    this.ui.drawText("Empty", textStartX, slotY + (SLOT_HEIGHT/2) + 6, font, emptyTextColor, "left");
                }
            }
        };

        leftSlots.forEach((slot, i) => drawSlot(slot, i, true));
        rightSlots.forEach((slot, i) => drawSlot(slot, i, false));
    }

    // ===========================================
    // RIGHT COLUMN (Inventory List)
    // ===========================================

    drawRightColumn(inventory, inventoryIndex, isChoosingItem, x, y, w) {
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
            const isSelected = (isChoosingItem && index === inventoryIndex);
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
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(textX, currentY - 20, w - 40, 30);
            this.ctx.clip();
            this.ui.drawText(name, textX, currentY, "13px sans-serif", color, "left");
            this.ctx.restore();
            
            currentY += rowHeight;
        });
    }

    drawFooter(w, h, isChoosingItem) {
        const y = h - 15;
        const text = isChoosingItem 
            ? "[SHIFT] Info   [ARROWS] Navigate   [ENTER] Equip   [ESC] Cancel"
            : "[SHIFT] Info   [W/S] Select   [ENTER] Bag   [X] Unequip   [TAB] Next";
        this.ui.drawText(text, w / 2, y, "12px monospace", "#666", "center");
    }
}