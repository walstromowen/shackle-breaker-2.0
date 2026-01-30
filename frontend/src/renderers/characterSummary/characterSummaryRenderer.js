import { UITheme } from '../../ui/UITheme.js';
import { CanvasUI } from '../../ui/canvasUI.js';
import { CONFIG } from '../../../../shared/data/constants.js'; 
import { StatCalculator } from '../../../../shared/systems/statCalculator.js'; 
import { AbilityDefinitions } from '../../../../shared/data/abilityDefinitions.js';

export class CharacterSummaryRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader; 
        this.ui = new CanvasUI(ctx);
        this.padding = 15; 
        this.ICON_SIZE = CONFIG.TILE_SIZE || 32; 
        this.ICON_PADDING = CONFIG.TILE_PADDING || 0; 
        this.RENDER_SIZE = 32; 
        // State to track content height for scroll clamping
        this.itemContentHeight = 0;
        this.lastItemId = null;
    }

    render(state) {
        const { member, slots, selectedSlotIndex, isChoosingItem, filteredInventory, inventoryIndex, viewMode, focusedItem, derivedStats } = state;
        
        // Note: We access state.scrollOffset inside the sub-methods to mutate it if necessary.
        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;
        this.ctx.imageSmoothingEnabled = false;
        this.ui.clearScreen(w, h);

        // Optimization: Use passed stats if available, otherwise calculate
        const stats = derivedStats || StatCalculator.calculate(member);

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
            // PASS 'state' OBJECT HERE instead of just the number
            this.drawLeftColumn(member, stats, viewMode, focusedItem, col1X + this.padding, this.padding, leftW - (this.padding*2), h, state);
            
            this.drawCenterColumn(member, stats, slots, selectedSlotIndex, isChoosingItem, col2X, this.padding, centerW, h);
            
            this.drawRightColumn(filteredInventory, inventoryIndex, isChoosingItem, col3X + this.padding, this.padding, rightW - (this.padding*2));
        }

        this.drawFooter(w, h, isChoosingItem);
    }

    // ===========================================
    // HELPER METHODS
    // ===========================================

    getAbbreviation(text) {
        if (!text) return "";
        const lower = text.toLowerCase();
        
        const map = {
            // --- Attributes ---
            strength: "STR",
            dexterity: "DEX",
            intelligence: "INT",
            vigor: "VGR",
            attunement: "ATN",
            
            // --- Damage Types ---
            blunt: "BNT",
            slash: "SLS",
            pierce: "PRC",
            fire: "FIR",
            ice: "ICE",
            lightning: "LIG",
            water: "WAT",
            earth: "ERT",
            wind: "WND",
            light: "LGT", 
            dark: "DRK",
            arcane: "ARC",

            // --- Resources ---
            maxhp: "HP",
            maxstamina: "STM",
            maxinsight: "INS"
        };

        if (map[lower]) return map[lower];
        return text.substring(0, 3).toUpperCase();
    }

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

    drawAbilityIcon(ability, x, y) {
        if (!ability) return;
        const sheet = this.loader.get('abilities'); 
        if (!sheet) return;

        const iconData = ability.icon || { col: 0, row: 0 };
        const totalSize = this.ICON_SIZE + this.ICON_PADDING;
        const srcX = (iconData.col * totalSize) + this.ICON_PADDING;
        const srcY = (iconData.row * totalSize) + this.ICON_PADDING;
        
        this.ctx.drawImage(sheet, srcX, srcY, this.ICON_SIZE, this.ICON_SIZE, Math.floor(x), Math.floor(y), this.RENDER_SIZE, this.RENDER_SIZE);
    }

    getWrappedLines(text, maxWidth, font) {
        if (!text) return [];
        this.ctx.save(); 
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
        this.ctx.restore();
        return lines;
    }

    // ===========================================
    // LEFT COLUMN (Stats/Items)
    // ===========================================

    drawLeftColumn(member, stats, viewMode, focusedItem, x, y, w, h, state) {
        let currentY = y + 10;

        // --- TABS ---
        const tabW = w / 2;
        const tabH = 24;
        
        this.ctx.fillStyle = (viewMode === 'STATS') ? "#333" : "#111";
        this.ctx.fillRect(x, y, tabW, tabH);
        this.ctx.strokeStyle = (viewMode === 'STATS') ? "#666" : "#222";
        this.ctx.strokeRect(x, y, tabW, tabH);
        this.ui.drawText("STATS", x + tabW/2, y + 16, "bold 11px sans-serif", (viewMode === 'STATS' ? "#fff" : "#555"), "center");

        this.ctx.fillStyle = (viewMode === 'ITEM') ? "#333" : "#111";
        this.ctx.fillRect(x + tabW, y, tabW, tabH);
        this.ctx.strokeStyle = (viewMode === 'ITEM') ? "#666" : "#222";
        this.ctx.strokeRect(x + tabW, y, tabW, tabH);
        this.ui.drawText("ITEM", x + tabW + tabW/2, y + 16, "bold 11px sans-serif", (viewMode === 'ITEM' ? "#fff" : "#555"), "center");

        currentY += tabH + 20;

        // --- CONTENT ---
        if (viewMode === 'STATS') {
            this.drawStatsPanel(member, stats, x, currentY, w);
        } else {
            const availableHeight = h - currentY - 30; 
            // Pass 'state' here so we can clamp the actual scrollOffset variable
            this.drawItemDetailPanel(focusedItem, x, currentY, w, availableHeight, state);
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
                const label = this.getAbbreviation(key);
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

        const speed = stats.speed || member.attributes?.speed || 0;
        this.ui.drawText("Speed", x, currentY, "11px monospace", "#bbb", "left");
        this.ui.drawText(`${speed}`, x + 60, currentY, "11px monospace", "#0ff", "left");
        currentY += 14;

        const critChance = (stats.critChance || 0) * 100;
        const critMult = (stats.critMultiplier !== undefined) ? stats.critMultiplier : 1.5;
        this.ui.drawText("Crit Chance", x, currentY, "11px monospace", "#bbb", "left");
        this.ui.drawText(`${critChance.toFixed(0)}%`, x + 70, currentY, "11px monospace", "#fe0", "left");
        currentY += 14;
        
        this.ui.drawText("Crit Dmg", x, currentY, "11px monospace", "#bbb", "left");
        this.ui.drawText(`x${critMult}`, x + 70, currentY, "11px monospace", "#aa7", "left");
        currentY += 14;

        const corruption = member.corruption || stats.corruption || 0;
        this.ui.drawText("Corruption", x, currentY, "11px monospace", "#bbb", "left");
        this.ui.drawText(`${corruption}`, x + 70, currentY, "11px monospace", "#b0f", "left");
        currentY += 25;

        // 3. Combined Table
        const types = [
            "blunt", "slash", "pierce", 
            "fire", "ice", "lightning", "water", "earth", "wind", 
            "light", "dark", "arcane"
        ];
        const attackStats = stats.attack || {};
        
        const colType = x;
        const colAtk = x + 70;
        const colDef = x + 105;
        const colRes = x + 140;

        this.ctx.fillStyle = "#666";
        this.ui.drawText("TYPE", colType, currentY, "bold 10px sans-serif", "#666", "left");
        this.ui.drawText("ATK", colAtk, currentY, "bold 10px sans-serif", "#f66", "center");
        this.ui.drawText("DEF", colDef, currentY, "bold 10px sans-serif", "#66f", "center");
        this.ui.drawText("RES", colRes, currentY, "bold 10px sans-serif", "#fe6", "center");
        
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(x, currentY + 4, w - 10, 1);
        currentY += 15;

        types.forEach((type) => {
            const atk = attackStats[type] || 0;
            const def = stats.defense[type] || 0;
            const res = stats.resistance[type] || 0;
            const label = this.getAbbreviation(type);
            const isZeroRow = (atk === 0 && def === 0 && res === 0);
            const labelColor = isZeroRow ? "#444" : "#bbb";
            
            this.ui.drawText(label, colType, currentY, "11px monospace", labelColor, "left");
            this.ui.drawText(`${atk}`, colAtk, currentY, "11px monospace", atk > 0 ? "#f88" : "#444", "center");
            this.ui.drawText(`${def}`, colDef, currentY, "11px monospace", def > 0 ? "#aaf" : "#444", "center");
            this.ui.drawText(`${res}%`, colRes, currentY, "11px monospace", res > 0 ? "#fea" : "#444", "center");
            currentY += 14; 
        });
    }

    drawItemDetailPanel(item, x, startY, w, viewportH, state) {
        if (!item) {
            this.ui.drawText("No Item Selected", x + w/2, startY + 50, "italic 13px sans-serif", "#555", "center");
            return;
        }

        // Reset scroll limit tracking if the item changes
        const itemId = item.id || (item.definition ? item.definition.id : null);
        if (itemId !== this.lastItemId) {
            this.itemContentHeight = 0;
            this.lastItemId = itemId;
            // Also reset scroll to 0 instantly when item changes
            state.scrollOffset = 0;
        }

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(x, startY, w + 10, viewportH);
        this.ctx.clip();

        // --- HARD SCROLL CLAMPING ---
        // 1. Calculate the maximum valid scroll based on LAST frame's content height
        const maxScroll = Math.max(0, this.itemContentHeight - viewportH);
        
        // 2. Check if the ACTUAL state.scrollOffset (from input) has drifted out of bounds
        //    If so, snap it back to the limit. This stops the "catch up" lag.
        if (state.scrollOffset > maxScroll) {
            state.scrollOffset = maxScroll;
        }
        if (state.scrollOffset < 0) {
            state.scrollOffset = 0;
        }

        // 3. Use the now-corrected state value for rendering
        let currentY = startY - state.scrollOffset;
        const contentStartY = currentY;

        const def = item.definition || item;
        const name = def.name || "Unknown Item";
        const type = (def.slot || def.type || "Item").toUpperCase();
        
        // --- 1. HEADER ---
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

        // --- 2. DESCRIPTION ---
        const description = def.description || "";
        if (description) {
            const descLines = this.getWrappedLines(description, w, "11px serif");
            descLines.forEach(line => {
                this.ui.drawText(line, x, currentY, "11px serif", "#999", "left");
                currentY += 14;
            });
            currentY += 5;
            this.ctx.fillStyle = "#333";
            this.ctx.fillRect(x, currentY, w, 1);
            currentY += 15;
        }

        // --- 3. ITEM STATS ---
        const drawStatBlock = (title, statObj, isPercent = false) => {
            if (!statObj) return false;
            const keys = Object.keys(statObj);
            if (keys.length === 0) return false;

            this.ui.drawText(title, x, currentY, "bold 11px sans-serif", "#888", "left");
            currentY += 14;

            keys.forEach(key => {
                const val = statObj[key];
                if (val === 0) return;
                const typeLabel = this.getAbbreviation(key);
                const sign = val > 0 ? "+" : "";
                const valStr = `${sign}${val}${isPercent ? "%" : ""}`;
                this.ui.drawText(typeLabel, x + 10, currentY, "11px monospace", "#aaa", "left");
                this.ui.drawText(valStr, x + w - 10, currentY, "11px monospace", "#fff", "right");
                currentY += 12;
            });
            currentY += 5; 
            return true;
        };

        let hasContent = false;
        hasContent |= drawStatBlock("Attack Bonuses", def.attack);
        
        // [FIXED] Use def.defense (plural) instead of def.defense
        hasContent |= drawStatBlock("Defense Bonuses", def.defense); 
        
        hasContent |= drawStatBlock("Resistances", def.resistance, true);
        
        // [ADDED] Resources (Max HP, Stamina, etc.)
        hasContent |= drawStatBlock("Resource Bonuses", def.resources);

        hasContent |= drawStatBlock("Attributes", def.attributes);

        if (hasContent) {
            this.ctx.fillStyle = "#333";
            this.ctx.fillRect(x, currentY, w, 1);
            currentY += 15;
        }

        // --- 4. ABILITIES ---
        let abilityList = [];
        if (def.grantedAbilities) abilityList = def.grantedAbilities;
        else if (def.useAbility) abilityList = [def.useAbility];

        if (abilityList.length > 0) {
            const label = def.useAbility ? "On Use" : "Granted Abilities";
            this.ui.drawText(label, x, currentY, "bold 12px sans-serif", UITheme.colors.accent, "left");
            currentY += 15;

            abilityList.forEach(abilityId => {
                const ab = AbilityDefinitions[abilityId];
                if (!ab) return;

                const pad = 6;
                const iconSize = this.RENDER_SIZE; 
                
                // --- FIXED LAYOUT CALCULATION ---
                const descFont = "italic 10px sans-serif";
                const shortDesc = ab.description || "No description.";
                const descLines = this.getWrappedLines(shortDesc, w - (pad*2), descFont);
                const descAreaHeight = (descLines.length * 12);

                const iconSectionHeight = iconSize; 
                const bufferHeight = 12; 
                const statsSectionHeight = (14 * 2) + 6;
                const dividerHeight = 8; 

                const totalHeight = pad + iconSectionHeight + bufferHeight + statsSectionHeight + dividerHeight + descAreaHeight + pad;

                // Background
                this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
                this.ctx.fillRect(x, currentY, w, totalHeight); 
                
                // Icon
                this.drawAbilityIcon(ab, x + pad, currentY + pad);

                // Header Info
                const textStartX = x + pad + iconSize + 8;
                const headerTextY = currentY + pad + 14; 
                this.ui.drawText(ab.name || abilityId, textStartX, headerTextY, "bold 13px sans-serif", "#fff", "left");

                if (ab.cost) {
                    let costStr = "";
                    let costCol = "#aaa";
                    if (ab.cost.mana) { costStr = `${ab.cost.mana} MP`; costCol = UITheme.colors.magic; }
                    else if (ab.cost.stamina) { costStr = `${ab.cost.stamina} SP`; costCol = UITheme.colors.success; }
                    else if (ab.cost.insight) { costStr = `${ab.cost.insight} INS`; costCol = "#ffd700"; }
                    this.ui.drawText(costStr, x + w - pad, headerTextY, "11px monospace", costCol, "right");
                }

                // Stats Grid
                const statsStartY = currentY + pad + iconSectionHeight + bufferHeight; 
                const col1X = x + pad;
                const col2X = x + (w / 2) + pad;

                const acc = ab.accuracy ? `${Math.floor(ab.accuracy * 100)}%` : "-";
                this.ui.drawText(`Acc: ${acc}`, col1X, statsStartY, "11px monospace", "#bbb", "left");

                let tgtStr = "Self";
                if (ab.targeting) {
                    const count = ab.targeting.select === 'all' ? 'All' : '1';
                    const scope = ab.targeting.scope === 'ally' ? 'Ally' : 'Eny'; 
                    tgtStr = `${count} ${scope}`;
                }
                this.ui.drawText(`Tgt: ${tgtStr}`, col2X, statsStartY, "11px monospace", "#bbb", "left");

                let pwrStr = "-";
                if (ab.effects) {
                    const dmgEffect = ab.effects.find(e => e.type === 'damage' || e.type === 'heal');
                    if (dmgEffect) {
                        const val = dmgEffect.power || 0;
                        const el = dmgEffect.element ? `(${this.getAbbreviation(dmgEffect.element)})` : "";
                        pwrStr = `${val}x ${el}`;
                    }
                }
                this.ui.drawText(`Pwr: ${pwrStr}`, col1X, statsStartY + 14, "11px monospace", "#fca", "left");

                const speedVal = ab.speed ? ab.speed : "Norm";
                this.ui.drawText(`Spd: ${speedVal}`, col2X, statsStartY + 14, "11px monospace", "#bbb", "left");

                // Divider
                const dividerY = statsStartY + 28;
                this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
                this.ctx.fillRect(x + pad, dividerY, w - (pad*2), 1);

                // Description
                let textCursorY = dividerY + 12; 
                descLines.forEach(line => {
                    this.ui.drawText(line, x + pad, textCursorY, descFont, "#888", "left");
                    textCursorY += 12;
                });

                currentY += totalHeight + 10; 
            });
        }

        currentY += 20; 
        
        // --- CAPTURE HEIGHT ---
        // This will be used in the NEXT frame to calculate maxScroll
        this.itemContentHeight = currentY - contentStartY;

        this.ctx.restore();

        // --- DRAW SCROLLBAR ---
        if (this.itemContentHeight > viewportH) {
            const scrollbarWidth = 4;
            const scrollbarX = x + w + 4; 
            const ratio = viewportH / this.itemContentHeight;
            const thumbHeight = Math.max(20, viewportH * ratio);
            
            // Thumb position based on the now clamped state
            const thumbY = startY + (state.scrollOffset * ratio);
            
            this.ctx.fillStyle = "#222";
            this.ctx.fillRect(scrollbarX, startY, scrollbarWidth, viewportH);
            this.ctx.fillStyle = "#555";
            this.ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
        }
    }

    // ===========================================
    // CENTER COLUMN (Name/Vitals + Equipment + Traits)
    // ===========================================

    drawCenterColumn(member, stats, activeSlots, selectedIndex, isChoosingItem, x, y, w, h) {
        let headerY = y + 10;
        const centerX = Math.floor(x + (w / 2));

        // --- NAME & VITALS ---
        this.ui.drawText(member.name, centerX, headerY + 15, "bold 20px sans-serif", UITheme.colors.textMain, "center");
        this.ui.drawText(`Level ${member.level}`, centerX, headerY + 36, "12px sans-serif", UITheme.colors.accent, "center");

        const vitalY = headerY + 58;
        const gap = 12;
        
        // [FIXED] Use calculated total stats from the StatCalculator result
        // If stats.maxHp is undefined, fallback to member.maxHp
        const totalMaxHp = stats.maxHp || member.maxHp; 
        const totalMaxStm = stats.maxStamina || member.maxStamina;
        const totalMaxIns = stats.maxInsight || member.maxInsight || 0;

        const hpText = `HP ${member.hp}/${totalMaxHp}`;
        const stmText = `STM ${member.stamina}/${totalMaxStm}`;
        const insText = `INS ${member.insight || 0}/${totalMaxIns}`; 
        const xpText = `XP ${member.xp}/${member.xpToNext || 100}`; 

        this.ctx.font = "12px monospace";
        const hpW = this.ctx.measureText(hpText).width;
        const stmW = this.ctx.measureText(stmText).width;
        const insW = this.ctx.measureText(insText).width;
        const xpW = this.ctx.measureText(xpText).width;
        
        const totalW = hpW + stmW + insW + xpW + (gap * 3);
        let startX = centerX - (totalW / 2);

        this.ui.drawText(hpText, startX + (hpW/2), vitalY, "12px monospace", UITheme.colors.danger, "center");
        startX += hpW + gap;
        this.ui.drawText(stmText, startX + (stmW/2), vitalY, "12px monospace", "#32CD32", "center");
        startX += stmW + gap;
        this.ui.drawText(insText, startX + (insW/2), vitalY, "12px monospace", "#ffd700", "center");
        startX += insW + gap;
        this.ui.drawText(xpText, startX + (xpW/2), vitalY, "12px monospace", "#9370DB", "center");

        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(x + 20, vitalY + 15, w - 40, 1);

        // --- EQUIPMENT SLOTS ---
        const equipData = (member.state && member.state.equipment) ? member.state.equipment : (member.equipment || {});

        const splitIndex = Math.ceil(activeSlots.length / 2);
        const leftSlots = activeSlots.slice(0, splitIndex);
        const rightSlots = activeSlots.slice(splitIndex);

        const PORTRAIT_SIZE = 112; 
        const SLOT_HEIGHT = 48; 
        const headerHeight = 85; 
        
        // Calculate height dynamically so we know where to draw traits later
        const totalSlotHeight = Math.max(leftSlots.length, rightSlots.length) * (SLOT_HEIGHT + 4);
        const contentHeight = Math.max(PORTRAIT_SIZE, totalSlotHeight);
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
                
                const textAreaW = slotW - this.RENDER_SIZE - 16;
                this.ui.drawText(slotName.toUpperCase(), iconX - 6, slotY + 12, "bold 9px monospace", slotLabelColor, "right");
                
                if (item) {
                    const lines = this.getWrappedLines(itemName, textAreaW, font);
                    let cursorY = slotY + 26; 
                    lines.forEach(line => {
                        this.ui.drawText(line, iconX - 6, cursorY, font, itemTextColor, "right");
                        cursorY += lineHeight;
                    });
                } else {
                    this.ui.drawText("Empty", iconX - 6, slotY + 26, "italic 11px sans-serif", emptyTextColor, "right");
                }
            } else {
                const iconX = slotX + 4;
                if (item) this.drawItemIcon(item, iconX, slotY + (SLOT_HEIGHT - this.RENDER_SIZE)/2);
                
                const textStartX = iconX + this.RENDER_SIZE + 6;
                const textAreaW = slotW - this.RENDER_SIZE - 16;

                this.ui.drawText(slotName.toUpperCase(), textStartX, slotY + 12, "bold 9px monospace", slotLabelColor, "left");

                if (item) {
                    const lines = this.getWrappedLines(itemName, textAreaW, font);
                    let cursorY = slotY + 26; 
                    lines.forEach(line => {
                        this.ui.drawText(line, textStartX, cursorY, font, itemTextColor, "left");
                        cursorY += lineHeight;
                    });
                } else {
                    this.ui.drawText("Empty", textStartX, slotY + 26, "italic 11px sans-serif", emptyTextColor, "left");
                }
            }
        };
        leftSlots.forEach((slot, i) => drawSlot(slot, i, true));
        rightSlots.forEach((slot, i) => drawSlot(slot, i, false));
        // --- TRAITS SECTION (New) ---
        // We start drawing traits 25px below the equipment section
        const traitsStartY = equipStartY + contentHeight + 25;
        this.drawTraitBadges(member, x, traitsStartY, w);
    }

    drawTraitBadges(member, columnX, startY, columnWidth) {
        // 1. Draw Section Header
        const centerX = columnX + (columnWidth / 2);
        this.ui.drawText("Traits", centerX, startY, "bold 12px sans-serif", "#666", "center");
        
        let currentY = startY + 20;
        const traits = member.traits || [];

        if (traits.length === 0) {
            this.ui.drawText("None", centerX, currentY, "italic 11px sans-serif", "#444", "center");
            return;
        }
        // 2. Setup Badge Styling
        const badgeHeight = 22;
        const xPadding = 10;
        const gap = 8;
        const leftMargin = columnX + 30;
        const maxRowWidth = columnWidth - 60; 
        let currentX = leftMargin;
        this.ctx.font = "11px sans-serif";
        traits.forEach(traitId => {
            // Capitalize first letter
            const label = traitId.charAt(0).toUpperCase() + traitId.slice(1);
            const textWidth = this.ctx.measureText(label).width;
            const badgeWidth = textWidth + (xPadding * 2);

            // Wrap to next line if needed
            if (currentX + badgeWidth > leftMargin + maxRowWidth) {
                currentX = leftMargin;
                currentY += badgeHeight + gap;
            }

            // Draw Badge Background
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            this.ctx.fillRect(currentX, currentY, badgeWidth, badgeHeight);
            
            // Draw Badge Border
            this.ctx.strokeStyle = "#555";
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(currentX, currentY, badgeWidth, badgeHeight);

            // Draw Text
            this.ui.drawText(label, currentX + (badgeWidth/2), currentY + 15, "11px sans-serif", "#ccc", "center");

            // Advance X
            currentX += badgeWidth + gap;
        });
    }

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
            
            const textX = Math.floor(x + this.RENDER_SIZE + 12);
            const color = isSelected ? "#ffffff" : "#aaaaaa";
            const name = item.name || (item.definition ? item.definition.name : "Unknown");
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(textX, currentY - 20, w - 50, 30);
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