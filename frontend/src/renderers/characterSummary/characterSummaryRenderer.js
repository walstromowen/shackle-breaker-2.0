import { UITheme } from '../../ui/UITheme.js';
import { CanvasUI } from '../../ui/canvasUI.js';

export class CharacterSummaryRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader; 
        this.ui = new CanvasUI(ctx);
        this.padding = 20;
    }

    render(state) {
        const { member, slots, selectedSlotIndex, isChoosingItem, filteredInventory, inventoryIndex } = state;
        
        // [DEBUG] Print the character instance as requested
        // Check your console to see the 'sprite' property!
        if (member) {
            console.log("Current Character:", member);
        }

        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;

        this.ui.clearScreen(w, h);

        // --- DEFINE COLUMNS ---
        const leftW = w * 0.3;
        const centerW = w * 0.4;
        const rightW = w * 0.3;

        const col1X = 0;
        const col2X = leftW;
        const col3X = leftW + centerW;

        // Draw Background Panels
        this.ctx.fillStyle = "#111"; 
        this.ctx.fillRect(col1X, 0, leftW, h);
        this.ctx.fillRect(col3X, 0, rightW, h);

        // --- RENDER COLUMNS ---
        if (member) {
            this.drawLeftColumn(member, col1X + this.padding, this.padding, leftW - (this.padding*2));
            this.drawCenterColumn(member, slots, selectedSlotIndex, isChoosingItem, col2X, this.padding, centerW, h);
            this.drawRightColumn(filteredInventory, inventoryIndex, isChoosingItem, col3X + this.padding, this.padding, rightW - (this.padding*2));
        }

        // --- FOOTER ---
        this.drawFooter(w, h, isChoosingItem);
    }

    // =========================================================
    // COLUMN 1: STATS & VITALS
    // =========================================================
    drawLeftColumn(member, x, y, w) {
        let currentY = y + 40;

        // 1. HEADER
        this.ui.drawText(member.name, x, currentY, UITheme.fonts.header, UITheme.colors.textMain, "left");
        currentY += 30;
        this.ui.drawText(`Lvl ${member.level} ${member.type || 'Adventurer'}`, x, currentY, UITheme.fonts.body, UITheme.colors.textMuted, "left");
        currentY += 40;

        // 2. VITALS 
        this.drawStatRow("HP", `${member.hp} / ${member.maxHp}`, x, currentY, UITheme.colors.danger);
        currentY += 25;
        this.drawStatRow("XP", `${member.xp} / ${member.maxXp}`, x, currentY, "#9370DB");
        currentY += 25;
        this.drawStatRow("Stamina", `${member.stamina} / ${member.maxStamina}`, x, currentY, "#32CD32");
        currentY += 40; 

        // 3. ATTRIBUTES
        this.ui.drawText("Attributes", x, currentY, UITheme.fonts.subHeader, UITheme.colors.textHighlight, "left");
        currentY += 30;
        
        const attrs = member.attributes || (member.state && member.state.attributes) || {};
        
        for (const [key, val] of Object.entries(attrs)) {
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            this.drawStatRow(label, val, x, currentY);
            currentY += 25;
        }
        currentY += 20;

        // 4. COMBAT STATS
        this.ui.drawText("Combat Stats", x, currentY, UITheme.fonts.subHeader, UITheme.colors.textHighlight, "left");
        currentY += 30;

        // Attack Power
        const attack = member.attack || {};
        let atkStr = Object.entries(attack).map(([type, val]) => `${val} ${type}`).join(', ') || "Unarmed";
        this.ui.drawText("Attack:", x, currentY, UITheme.fonts.body, "#aaaaaa", "left");
        this.ui.drawText(atkStr, x + 80, currentY, "14px monospace", "#ffffff", "left");
        currentY += 25;

        // Defense
        const defense = member.defense || {};
        let hasDef = false;
        for (const [type, val] of Object.entries(defense)) {
            if (val > 0) {
                this.drawStatRow(`${type} Def`, val, x, currentY);
                currentY += 25;
                hasDef = true;
            }
        }
        if (!hasDef) this.drawStatRow("Defense", "0", x, currentY);
    }

    // =========================================================
    // COLUMN 2: PORTRAIT & PAPER DOLL
    // =========================================================
    drawCenterColumn(member, slots, selectedIndex, isChoosingItem, x, y, w, h) {
        const centerX = x + (w / 2);
        let currentY = y + 20;

        // 1. PORTRAIT IMAGE
        const portraitSize = 120;
        
        // Draw Border
        this.ctx.strokeStyle = UITheme.colors.border;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(centerX - (portraitSize/2), currentY, portraitSize, portraitSize);

        // --- [FIX] SPRITE LOGIC ---
        // 1. Try to get the key from the member, or default to 'hero'
        let spriteKey = member.sprite || 'hero'; 
        
        // 2. SAFETY CHECK: If the loader doesn't have 'hero', use your test file 'spritesheet'
        if (!this.loader.get(spriteKey)) {
            // This fixes your current issue where the manifest says 'spritesheet' 
            // but the character says 'hero'
            spriteKey = 'spritesheet';
        }

        const img = this.loader.get(spriteKey);

        if (img) {
            this.ctx.imageSmoothingEnabled = false; // Keep pixel art crisp

            // Draw only the top-left 32x32 pixels (The "Face" or "Idle" frame)
            this.ctx.drawImage(
                img, 
                0, 0, 32, 32,                       // Source: x, y, w, h
                centerX - (portraitSize/2),         // Dest: x
                currentY,                           // Dest: y
                portraitSize,                       // Dest: w
                portraitSize                        // Dest: h
            );
        } else {
            // Fallback Text
            this.ui.drawText("(No Img)", centerX, currentY + 65, "12px sans-serif", "#666", "center");
        }
        
        currentY += portraitSize + 40;

        // 2. EQUIPMENT SLOTS
        this.ui.drawText("Equipment", centerX, currentY, UITheme.fonts.subHeader, "#ffffff", "center");
        currentY += 30;

        const equipData = (member.state && member.state.equipment) 
                          ? member.state.equipment 
                          : (member.equipment || {});

        slots.forEach((slotName, index) => {
            const isSelected = (index === selectedIndex);
            
            // Visual Styles
            let textColor = "#888";
            let boxColor = "transparent";
            let borderColor = "#444";

            if (isSelected) {
                borderColor = isChoosingItem ? UITheme.colors.primary : UITheme.colors.accent;
                textColor = "#fff";
                boxColor = isChoosingItem ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.1)";
            }

            // Draw Slot Box
            const boxW = w * 0.8;
            const boxX = centerX - (boxW / 2);
            const boxH = 40;

            this.ctx.fillStyle = boxColor;
            this.ctx.fillRect(boxX, currentY, boxW, boxH);
            this.ctx.strokeStyle = borderColor;
            this.ctx.lineWidth = isSelected ? 2 : 1;
            this.ctx.strokeRect(boxX, currentY, boxW, boxH);

            // Slot Name (Left)
            this.ui.drawText(slotName.toUpperCase(), boxX + 10, currentY + 25, "12px monospace", UITheme.colors.primary, "left");

            // Item Name (Right)
            const item = equipData[slotName];
            
            let realName = "-- Empty --";
            if (item) {
                realName = item.name || (item.definition ? item.definition.name : "Unknown");
            }

            const itemColor = item ? "#ffffff" : "#555";
            this.ui.drawText(realName, boxX + boxW - 10, currentY + 25, "14px sans-serif", itemColor, "right");

            currentY += 50;
        });
    }

    // =========================================================
    // COLUMN 3: INVENTORY (CONTEXTUAL)
    // =========================================================
    drawRightColumn(inventory, selectedIndex, isActive, x, y, w) {
        let currentY = y + 40;

        this.ui.drawText("Inventory", x, currentY, UITheme.fonts.subHeader, UITheme.colors.textHighlight, "left");
        currentY += 10;
        
        this.ctx.fillStyle = "#444";
        this.ctx.fillRect(x, currentY + 10, w, 2);
        currentY += 30;

        if (!inventory || inventory.length === 0) {
            this.ui.drawText("No items for slot", x, currentY, UITheme.fonts.body, "#555", "left");
            return;
        }

        inventory.forEach((item, index) => {
            const isSelected = (isActive && index === selectedIndex);
            
            if (isSelected) {
                this.ctx.fillStyle = "rgba(255, 215, 0, 0.1)"; 
                this.ctx.fillRect(x - 5, currentY - 20, w + 10, 30);
                this.ui.drawText(">", x - 15, currentY, UITheme.fonts.body, UITheme.colors.accent, "left");
            }

            const color = isSelected ? "#ffffff" : "#aaaaaa";
            
            const name = item.name || (item.definition ? item.definition.name : "Unknown Item");
            this.ui.drawText(name, x, currentY, UITheme.fonts.body, color, "left");
            
            // Draw brief stats
            if (isSelected) {
                let statInfo = "";
                
                const data = item.definition || item;

                if (data.damage) {
                   const d = data.damage;
                   const val = (d.min !== undefined && d.max !== undefined) 
                               ? `${d.min}-${d.max}` 
                               : JSON.stringify(d);
                   statInfo = `Atk: ${val}`;
                }
                else if (data.defense) {
                   statInfo = `Def: ${JSON.stringify(data.defense)}`;
                }
                
                if (statInfo) {
                    this.ui.drawText(statInfo, x, currentY + 20, "11px monospace", "#888", "left");
                    currentY += 20; 
                }
            }

            currentY += 30;
        });
    }

    // =========================================================
    // HELPERS
    // =========================================================
    drawStatRow(label, value, x, y, valColor = "#ffffff") {
        this.ui.drawText(`${label}:`, x, y, UITheme.fonts.body, "#aaaaaa", "left");
        this.ui.drawText(value.toString(), x + 100, y, UITheme.fonts.body, valColor, "left");
    }

    drawFooter(w, h, isChoosingItem) {
        const y = h - 30;
        let text = "";
        
        if (isChoosingItem) {
            text = "[UP/DOWN] Select Item   [ENTER] Equip   [ESC] Cancel";
        } else {
            text = "[W/S] Select Slot   [ENTER] Open Bag   [X] Unequip   [TAB] Next Char   [ESC] Back";
        }

        this.ui.drawText(text, w / 2, y, "14px monospace", "#666", "center");
    }
}