import { UITheme } from '../../ui/UITheme.js';
import { CanvasUI } from '../../ui/canvasUI.js';

export class CharacterSummaryRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader; 
        this.ui = new CanvasUI(ctx);
        this.padding = 15; 
    }

    render(state) {
        // We still accept 'slots' from state as a fallback, 
        // but we will prioritize the member's specific data below.
        const { member, slots, selectedSlotIndex, isChoosingItem, filteredInventory, inventoryIndex } = state;
        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;

        this.ui.clearScreen(w, h);

        // --- LAYOUT CONSTANTS ---
        const leftW = w * 0.28;
        const centerW = w * 0.37;
        const rightW = w * 0.35;

        const col1X = 0;
        const col2X = leftW;
        const col3X = leftW + centerW;

        // Backgrounds
        this.ctx.fillStyle = "#111"; 
        this.ctx.fillRect(col1X, 0, leftW, h);
        this.ctx.fillRect(col3X, 0, rightW, h);
        
        // Vertical Separators
        this.ctx.strokeStyle = "#333";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(col2X, 0); this.ctx.lineTo(col2X, h);
        this.ctx.moveTo(col3X, 0); this.ctx.lineTo(col3X, h);
        this.ctx.stroke();

        if (member) {
            this.drawLeftColumn(member, col1X + this.padding, this.padding, leftW - (this.padding*2));
            
            // [UPDATE] Pass the fallback slots, but the method will check member first
            this.drawCenterColumn(member, slots, selectedSlotIndex, isChoosingItem, col2X, this.padding, centerW, h);
            
            this.drawRightColumn(filteredInventory, inventoryIndex, isChoosingItem, col3X + this.padding, this.padding, rightW - (this.padding*2));
        }

        this.drawFooter(w, h, isChoosingItem);
    }

    // =========================================================
    // COLUMN 1: STATS
    // =========================================================
    drawLeftColumn(member, x, y, w) {
        let currentY = y + 20;

        // Header
        this.ui.drawText(member.name, x, currentY, "bold 20px sans-serif", UITheme.colors.textMain, "left");
        currentY += 22;
        this.ui.drawText(`Lvl ${member.level} ${member.type || 'Adventurer'}`, x, currentY, "14px sans-serif", UITheme.colors.textMuted, "left");
        currentY += 30; 

        // Vitals
        const vitalSpacing = 20;
        this.drawStatRow("HP", `${member.hp} / ${member.maxHp}`, x, currentY, UITheme.colors.danger);
        currentY += vitalSpacing;
        this.drawStatRow("XP", `${member.xp} / ${member.maxXp}`, x, currentY, "#9370DB");
        currentY += vitalSpacing;
        this.drawStatRow("Stamina", `${member.stamina} / ${member.maxStamina}`, x, currentY, "#32CD32");
        currentY += 35; 

        // Attributes (Compact Grid)
        this.ui.drawText("Attributes", x, currentY, "bold 16px sans-serif", UITheme.colors.textHighlight, "left");
        currentY += 25;
        
        const attrs = member.attributes || (member.state && member.state.attributes) || {};
        
        for (const [key, val] of Object.entries(attrs)) {
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            this.drawStatRow(label, val, x, currentY);
            currentY += 18; 
        }
        currentY += 20;

        // Combat
        this.ui.drawText("Combat", x, currentY, "bold 16px sans-serif", UITheme.colors.textHighlight, "left");
        currentY += 25;

        const attack = member.attack || {};
        let atkStr = Object.entries(attack).map(([type, val]) => `${val}`).join(', ') || "0";
        this.drawStatRow("Attack", atkStr, x, currentY);
        currentY += 18;

        const defense = member.defense || {};
        let defStr = Object.values(defense).reduce((a, b) => a + b, 0);
        this.drawStatRow("Defense", defStr, x, currentY);
    }

    // =========================================================
    // COLUMN 2: PORTRAIT & DYNAMIC SLOTS
    // =========================================================
    drawCenterColumn(member, defaultSlots, selectedIndex, isChoosingItem, x, y, w, h) {
        const centerX = x + (w / 2);
        let currentY = y + 10; // Start slightly higher

        // 1. PORTRAIT (Reduced to 64px to save space)
        const portraitSize = 64; 
        
        this.ctx.strokeStyle = UITheme.colors.border;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(centerX - (portraitSize/2), currentY, portraitSize, portraitSize);

        // Load Image
        let assetKey = member.portrait || member.sprite || 'hero'; 
        if (!this.loader.get(assetKey)) assetKey = 'spritesheet';
        const img = this.loader.get(assetKey);

        if (img) {
            this.ctx.imageSmoothingEnabled = false; 
            this.ctx.drawImage(
                img, 
                centerX - (portraitSize/2), currentY, 
                portraitSize, portraitSize
            );
        } else {
            this.ui.drawText("No Img", centerX, currentY + 35, "10px sans-serif", "#666", "center");
        }
        
        // Tighten gap between portrait and first slot
        currentY += portraitSize + 15;

        // 2. DYNAMIC EQUIPMENT SLOTS
        const activeSlots = member.slots || defaultSlots;

        const equipData = (member.state && member.state.equipment) 
                          ? member.state.equipment 
                          : (member.equipment || {});

        activeSlots.forEach((slotName, index) => {
            const isSelected = (index === selectedIndex);
            
            // [TWEAK] Ultra-compact Box Height
            const boxH = 28; 
            const boxW = w * 0.95; // Slightly wider to fit text
            const boxX = centerX - (boxW / 2);

            let borderColor = isSelected 
                ? (isChoosingItem ? UITheme.colors.primary : UITheme.colors.accent) 
                : "#333";
            
            let boxColor = isSelected 
                ? (isChoosingItem ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.1)") 
                : "transparent";

            // Draw Box
            this.ctx.fillStyle = boxColor;
            this.ctx.fillRect(boxX, currentY, boxW, boxH);
            this.ctx.strokeStyle = borderColor;
            this.ctx.lineWidth = isSelected ? 2 : 1;
            this.ctx.strokeRect(boxX, currentY, boxW, boxH);

            // Text Centering (Box is 28px, text is ~12px high, so offset is ~19px)
            const textY = currentY + 19; 
            
            // Slot Label (Smaller Font)
            this.ui.drawText(slotName.toUpperCase(), boxX + 6, textY, "10px monospace", UITheme.colors.primary, "left");

            // Item Name
            const item = equipData[slotName];
            let realName = "---";
            if (item) {
                realName = item.name || (item.definition ? item.definition.name : "Unknown");
            }

            const itemColor = item ? "#ffffff" : "#555";
            this.ui.drawText(realName, boxX + boxW - 6, textY, "12px sans-serif", itemColor, "right");

            // [TWEAK] Tiny gap between slots (4px)
            currentY += boxH + 4; 
        });
    }

    // =========================================================
    // COLUMN 3: INVENTORY
    // =========================================================
    drawRightColumn(inventory, selectedIndex, isActive, x, y, w) {
        let currentY = y + 20;

        this.ui.drawText("Inventory", x, currentY, "bold 16px sans-serif", UITheme.colors.textHighlight, "left");
        currentY += 10;
        
        this.ctx.fillStyle = "#444";
        this.ctx.fillRect(x, currentY + 10, w, 2);
        currentY += 25;

        if (!inventory || inventory.length === 0) {
            this.ui.drawText("Empty", x, currentY, "13px sans-serif", "#555", "left");
            return;
        }

        inventory.forEach((item, index) => {
            const isSelected = (isActive && index === selectedIndex);
            const rowHeight = 25;

            if (isSelected) {
                this.ctx.fillStyle = "rgba(255, 215, 0, 0.1)"; 
                this.ctx.fillRect(x - 5, currentY - 18, w + 10, rowHeight);
                this.ui.drawText(">", x - 12, currentY, "13px sans-serif", UITheme.colors.accent, "left");
            }

            const color = isSelected ? "#ffffff" : "#aaaaaa";
            const name = item.name || (item.definition ? item.definition.name : "Unknown");
            
            this.ui.drawText(name, x, currentY, "13px sans-serif", color, "left");
            
            // Show stats on selection
            if (isSelected) {
                const data = item.definition || item;
                let statText = "";
                if (data.damage) statText = `Atk: ${data.damage.min}-${data.damage.max}`;
                if (data.defense) statText = `Def: ${JSON.stringify(data.defense)}`;
                
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
        let text = "";
        
        if (isChoosingItem) {
            text = "Navigate: [ARROWS]   Equip: [ENTER]   Cancel: [ESC]";
        } else {
            text = "Select: [W/S]   Bag: [ENTER]   Unequip: [X]   Next: [TAB]   Exit: [ESC]";
        }
        this.ui.drawText(text, w / 2, y, "12px monospace", "#666", "center");
    }
}