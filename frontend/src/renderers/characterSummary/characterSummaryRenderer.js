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
        
        this.itemContentHeight = 0;
        this.lastItemId = null;
    }

    render(state) {
        const { member, slots, selectedSlotIndex, isChoosingItem, filteredInventory, inventoryIndex, viewMode, focusedItem, derivedStats } = state;
        
        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;
        
        this.ui.clearScreen(w, h);

        const stats = derivedStats || StatCalculator.calculate(member);

        // Layout Columns
        const leftW = Math.floor(w * 0.28); 
        const centerW = Math.floor(w * 0.44);
        const rightW = w - leftW - centerW;
        
        const col1X = 0;
        const col2X = leftW;
        const col3X = leftW + centerW;

        // Backgrounds (using Theme)
        this.ui.drawRect(col1X, 0, leftW, h, "#111"); 
        this.ui.drawRect(col3X, 0, rightW, h, "#111");
        
        // Separators
        this.ui.drawLine(col2X, 0, col2X, h, UITheme.colors.border);
        this.ui.drawLine(col3X, 0, col3X, h, UITheme.colors.border);

        if (member) {
            this.drawLeftColumn(member, stats, viewMode, focusedItem, col1X + this.padding, this.padding, leftW - (this.padding*2), h, state);
            this.drawCenterColumn(member, stats, slots, selectedSlotIndex, isChoosingItem, col2X, this.padding, centerW, h);
            this.drawRightColumn(filteredInventory, inventoryIndex, isChoosingItem, col3X + this.padding, this.padding, rightW - (this.padding*2));
        }

        // Optional footer if needed
        // this.drawFooter(...)
    }

    // ===========================================
    // HELPER METHODS
    // ===========================================

    getAbbreviation(text) {
        if (!text) return "";
        const lower = text.toLowerCase();
        
        const map = {
            strength: "STR", dexterity: "DEX", intelligence: "INT", vigor: "VGR", attunement: "ATN",
            blunt: "BNT", slash: "SLS", pierce: "PRC", fire: "FIR", ice: "ICE", 
            lightning: "LIG", water: "WAT", earth: "ERT", wind: "WND", light: "LGT", dark: "DRK", arcane: "ARC",
            maxhp: "HP", maxstamina: "STM", maxinsight: "INS"
        };

        return map[lower] || text.substring(0, 3).toUpperCase();
    }

    drawItemIcon(item, x, y) {
        if (!item) return;
        const sheet = this.loader.get('items');
        if (!sheet) return; 
        
        const iconData = item.icon || (item.definition ? item.definition.icon : { col: 0, row: 0 });
        const totalSize = this.ICON_SIZE + this.ICON_PADDING;
        const srcX = (iconData.col * totalSize) + this.ICON_PADDING; 
        const srcY = (iconData.row * totalSize) + this.ICON_PADDING; 
        
        this.ui.drawSprite(sheet, srcX, srcY, this.ICON_SIZE, this.ICON_SIZE, x, y, this.RENDER_SIZE, this.RENDER_SIZE);
    }

    drawAbilityIcon(ability, x, y) {
        if (!ability) return;
        const sheet = this.loader.get('abilities'); 
        if (!sheet) return;

        const iconData = ability.icon || { col: 0, row: 0 };
        const totalSize = this.ICON_SIZE + this.ICON_PADDING;
        const srcX = (iconData.col * totalSize) + this.ICON_PADDING;
        const srcY = (iconData.row * totalSize) + this.ICON_PADDING;
        
        this.ui.drawSprite(sheet, srcX, srcY, this.ICON_SIZE, this.ICON_SIZE, x, y, this.RENDER_SIZE, this.RENDER_SIZE);
    }

    // ===========================================
    // LEFT COLUMN (Stats/Items)
    // ===========================================

    drawLeftColumn(member, stats, viewMode, focusedItem, x, y, w, h, state) {
        let currentY = y + 10;

        // --- TABS ---
        const tabW = w / 2;
        const tabH = 24;
        
        // Stats Tab
        const statsActive = viewMode === 'STATS';
        this.ui.drawRect(x, y, tabW, tabH, statsActive ? "#333" : "#111");
        this.ui.drawRect(x, y, tabW, tabH, statsActive ? "#666" : "#222", false); // Stroke
        this.ui.drawText("STATS", x + tabW/2, y + 12, UITheme.fonts.small, statsActive ? "#fff" : "#555", "center", "middle");

        // Item Tab
        const itemActive = viewMode === 'ITEM';
        this.ui.drawRect(x + tabW, y, tabW, tabH, itemActive ? "#333" : "#111");
        this.ui.drawRect(x + tabW, y, tabW, tabH, itemActive ? "#666" : "#222", false); // Stroke
        this.ui.drawText("ITEM", x + tabW + tabW/2, y + 12, UITheme.fonts.small, itemActive ? "#fff" : "#555", "center", "middle");

        currentY += tabH + 20;

        // --- CONTENT ---
        if (viewMode === 'STATS') {
            this.drawStatsPanel(member, stats, x, currentY, w);
        } else {
            const availableHeight = h - currentY - 30; 
            this.drawItemDetailPanel(focusedItem, x, currentY, w, availableHeight, state);
        }
    }

    drawStatsPanel(member, stats, x, startY, w) {
        let currentY = startY;

        // 1. Attributes
        this.ui.drawText("Attributes", x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 15;

        const attrs = member.attributes || {};
        const attrKeys = Object.keys(attrs);

        if (attrKeys.length > 0) {
            const colWidth = w / 2;
            attrKeys.forEach((key, i) => {
                const val = attrs[key];
                const label = this.getAbbreviation(key);
                const colX = (i % 2 === 0) ? x : x + colWidth;
                
                this.ui.drawText(label, colX, currentY, UITheme.fonts.small, "#aaa", "left");
                this.ui.drawText(val.toString(), colX + 30, currentY, UITheme.fonts.mono, "#fff", "left");
                
                if (i % 2 !== 0) currentY += 14;
            });
            if (attrKeys.length % 2 !== 0) currentY += 14;
        } else {
            this.ui.drawText("None", x, currentY, "italic 11px sans-serif", "#555", "left");
            currentY += 14;
        }
        currentY += 15;

        // 2. Combat Properties
        this.ui.drawText("Combat Properties", x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 15;

        // Helper to draw row
        const drawProp = (label, val, color) => {
            this.ui.drawText(label, x, currentY, UITheme.fonts.mono, "#bbb", "left");
            this.ui.drawText(val, x + 70, currentY, UITheme.fonts.mono, color, "left");
            currentY += 14;
        };

        const speed = stats.speed || member.attributes?.speed || 0;
        drawProp("Speed", `${speed}`, UITheme.colors.accent);

        const critChance = (stats.critChance || 0) * 100;
        const critMult = (stats.critMultiplier !== undefined) ? stats.critMultiplier : 1.5;
        drawProp("Crit Chance", `${critChance.toFixed(0)}%`, UITheme.colors.insight);
        drawProp("Crit Dmg", `x${critMult}`, "#aa7");

        const corruption = member.corruption || stats.corruption || 0;
        drawProp("Corruption", `${corruption}`, "#b0f");
        
        currentY += 10;

        // 3. Combined Table (Atk/Def/Res)
        const colType = x;
        const colAtk = x + 70;
        const colDef = x + 105;
        const colRes = x + 140;

        // Headers
        const headerFont = "bold 10px sans-serif";
        this.ui.drawText("TYPE", colType, currentY, headerFont, "#666", "left");
        this.ui.drawText("ATK", colAtk, currentY, headerFont, UITheme.colors.danger, "center");
        this.ui.drawText("DEF", colDef, currentY, headerFont, UITheme.colors.magic, "center");
        this.ui.drawText("RES", colRes, currentY, headerFont, UITheme.colors.insight, "center");
        
        this.ui.drawRect(x, currentY + 4, w - 10, 1, "#333");
        currentY += 15;

        const types = [
            "blunt", "slash", "pierce", 
            "fire", "ice", "lightning", "water", "earth", "wind", 
            "light", "dark", "arcane"
        ];
        
        types.forEach((type) => {
            const atk = (stats.attack || {})[type] || 0;
            const def = stats.defense[type] || 0;
            const res = stats.resistance[type] || 0;
            
            // Skip rows that are completely empty to save space (optional, keeps UI clean)
            // if (atk === 0 && def === 0 && res === 0) return; 

            const label = this.getAbbreviation(type);
            const isZeroRow = (atk === 0 && def === 0 && res === 0);
            const labelColor = isZeroRow ? "#444" : "#bbb";
            
            this.ui.drawText(label, colType, currentY, UITheme.fonts.mono, labelColor, "left");
            this.ui.drawText(`${atk}`, colAtk, currentY, UITheme.fonts.mono, atk > 0 ? "#f88" : "#444", "center");
            this.ui.drawText(`${def}`, colDef, currentY, UITheme.fonts.mono, def > 0 ? "#aaf" : "#444", "center");
            this.ui.drawText(`${res}%`, colRes, currentY, UITheme.fonts.mono, res > 0 ? "#fea" : "#444", "center");
            currentY += 14; 
        });
    }

    drawItemDetailPanel(item, x, startY, w, viewportH, state) {
        if (!item) {
            this.ui.drawText("No Item Selected", x + w/2, startY + 50, "italic 13px sans-serif", "#555", "center");
            return;
        }

        // Logic: Reset Scroll
        const itemId = item.id || (item.definition ? item.definition.id : null);
        if (itemId !== this.lastItemId) {
            this.itemContentHeight = 0;
            this.lastItemId = itemId;
            state.scrollOffset = 0;
        }

        // Logic: Clamp Scroll
        const maxScroll = Math.max(0, this.itemContentHeight - viewportH);
        if (state.scrollOffset > maxScroll) state.scrollOffset = maxScroll;
        if (state.scrollOffset < 0) state.scrollOffset = 0;

        // Render: Clip Viewport
        this.ui.startClip(x, startY, w + 10, viewportH); // +10 for scrollbar width buffer

        let currentY = startY - state.scrollOffset;
        const contentStartY = currentY;

        const def = item.definition || item;
        const name = def.name || "Unknown Item";
        const type = (def.slot || def.type || "Item").toUpperCase();
        
        // --- 1. Header ---
        this.ui.drawRect(x, currentY, w, 2, UITheme.colors.border);
        currentY += 15;

        this.drawItemIcon(item, x, currentY);
        
        const nameFont = UITheme.fonts.bold;
        const nameLines = this.ui.getWrappedLines(name, w - 40, nameFont);
        
        nameLines.forEach((line, i) => {
            this.ui.drawText(line, x + 40, currentY + 12 + (i*18), nameFont, "#fff", "left");
        });
        
        currentY += Math.max(40, nameLines.length * 18 + 5); 
        this.ui.drawText(type, x, currentY, UITheme.fonts.mono, UITheme.colors.accent, "left");
        currentY += 20;

        this.ui.drawRect(x, currentY, w, 1, "#333");
        currentY += 15;

        // --- 2. Description ---
        if (def.description) {
            const descLines = this.ui.getWrappedLines(def.description, w, "11px serif");
            descLines.forEach(line => {
                this.ui.drawText(line, x, currentY, "11px serif", "#999", "left");
                currentY += 14;
            });
            currentY += 5;
            this.ui.drawRect(x, currentY, w, 1, "#333");
            currentY += 15;
        }

        // --- 3. Item Stats ---
        const drawStatBlock = (title, statObj, isPercent = false) => {
            if (!statObj) return false;
            const keys = Object.keys(statObj);
            if (keys.length === 0) return false;

            this.ui.drawText(title, x, currentY, UITheme.fonts.bold, "#888", "left");
            currentY += 14;

            keys.forEach(key => {
                const val = statObj[key];
                if (val === 0) return;
                const typeLabel = this.getAbbreviation(key);
                const sign = val > 0 ? "+" : "";
                const valStr = `${sign}${val}${isPercent ? "%" : ""}`;
                
                this.ui.drawText(typeLabel, x + 10, currentY, UITheme.fonts.mono, "#aaa", "left");
                this.ui.drawText(valStr, x + w - 10, currentY, UITheme.fonts.mono, "#fff", "right");
                currentY += 12;
            });
            currentY += 5; 
            return true;
        };

        let hasContent = false;
        hasContent |= drawStatBlock("Attack Bonuses", def.attack);
        hasContent |= drawStatBlock("Defense Bonuses", def.defense); 
        hasContent |= drawStatBlock("Resistances", def.resistance, true);
        hasContent |= drawStatBlock("Resource Bonuses", def.resources);
        hasContent |= drawStatBlock("Attributes", def.attributes);

        if (hasContent) {
            this.ui.drawRect(x, currentY, w, 1, "#333");
            currentY += 15;
        }

        // --- 4. Abilities ---
        let abilityList = def.grantedAbilities || (def.useAbility ? [def.useAbility] : []);
        
        if (abilityList.length > 0) {
            const label = def.useAbility ? "On Use" : "Granted Abilities";
            this.ui.drawText(label, x, currentY, UITheme.fonts.bold, UITheme.colors.accent, "left");
            currentY += 15;

            abilityList.forEach(abilityId => {
                const ab = AbilityDefinitions[abilityId];
                if (!ab) return;

                const pad = 6;
                const iconSize = this.RENDER_SIZE; 
                
                // Layout Calculation (using UI wrapper)
                const descFont = "italic 10px sans-serif";
                const shortDesc = ab.description || "No description.";
                const descLines = this.ui.getWrappedLines(shortDesc, w - (pad*2), descFont);
                
                const descAreaHeight = (descLines.length * 12);
                const iconSectionHeight = iconSize; 
                const bufferHeight = 12; 
                const statsSectionHeight = (14 * 2) + 6;
                const dividerHeight = 8; 
                const totalHeight = pad + iconSectionHeight + bufferHeight + statsSectionHeight + dividerHeight + descAreaHeight + pad;

                // Background
                this.ui.drawRect(x, currentY, w, totalHeight, "rgba(0, 0, 0, 0.3)");
                
                // Icon
                this.drawAbilityIcon(ab, x + pad, currentY + pad);

                // Header Info
                const textStartX = x + pad + iconSize + 8;
                const headerTextY = currentY + pad + 14; // Approximate text baseline
                this.ui.drawText(ab.name || abilityId, textStartX, headerTextY, "bold 13px sans-serif", "#fff", "left");

                // Cost
                if (ab.cost) {
                    let costStr = "";
                    let costCol = "#aaa";
                    if (ab.cost.mana) { costStr = `${ab.cost.mana} MP`; costCol = UITheme.colors.magic; }
                    else if (ab.cost.stamina) { costStr = `${ab.cost.stamina} SP`; costCol = UITheme.colors.success; }
                    else if (ab.cost.insight) { costStr = `${ab.cost.insight} INS`; costCol = UITheme.colors.insight; }
                    this.ui.drawText(costStr, x + w - pad, headerTextY, UITheme.fonts.mono, costCol, "right");
                }

                // Stats Grid
                const statsStartY = currentY + pad + iconSectionHeight + bufferHeight; 
                const col1X = x + pad;
                const col2X = x + (w / 2) + pad;

                const acc = ab.accuracy ? `${Math.floor(ab.accuracy * 100)}%` : "-";
                this.ui.drawText(`Acc: ${acc}`, col1X, statsStartY, UITheme.fonts.mono, "#bbb", "left");

                let tgtStr = "Self";
                if (ab.targeting) {
                    const count = ab.targeting.select === 'all' ? 'All' : '1';
                    const scope = ab.targeting.scope === 'ally' ? 'Ally' : 'Eny'; 
                    tgtStr = `${count} ${scope}`;
                }
                this.ui.drawText(`Tgt: ${tgtStr}`, col2X, statsStartY, UITheme.fonts.mono, "#bbb", "left");

                let pwrStr = "-";
                if (ab.effects) {
                    const dmgEffect = ab.effects.find(e => e.type === 'damage' || e.type === 'heal');
                    if (dmgEffect) {
                        const val = dmgEffect.power || 0;
                        const el = dmgEffect.element ? `(${this.getAbbreviation(dmgEffect.element)})` : "";
                        pwrStr = `${val}x ${el}`;
                    }
                }
                this.ui.drawText(`Pwr: ${pwrStr}`, col1X, statsStartY + 14, UITheme.fonts.mono, "#fca", "left");

                const speedVal = ab.speed ? ab.speed : "Norm";
                this.ui.drawText(`Spd: ${speedVal}`, col2X, statsStartY + 14, UITheme.fonts.mono, "#bbb", "left");

                // Divider
                const dividerY = statsStartY + 28;
                this.ui.drawRect(x + pad, dividerY, w - (pad*2), 1, "rgba(255, 255, 255, 0.1)");

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
        
        // Capture total height for next frame scrolling calculation
        this.itemContentHeight = currentY - contentStartY;

        this.ui.endClip();

        // --- SCROLLBAR ---
        // Pass the calculated heights to the UI to draw the scrollbar
        const scrollX = x + w + 4;
        this.ui.drawScrollBar(scrollX, startY, viewportH, this.itemContentHeight, state.scrollOffset);
    }

    // ===========================================
    // CENTER COLUMN
    // ===========================================

    drawCenterColumn(member, stats, activeSlots, selectedIndex, isChoosingItem, x, y, w, h) {
        let headerY = y + 10;
        const centerX = Math.floor(x + (w / 2));

        // Name & Vitals
        this.ui.drawText(member.name, centerX, headerY + 15, UITheme.fonts.header, UITheme.colors.textMain, "center");
        this.ui.drawText(`Level ${member.level}`, centerX, headerY + 36, UITheme.fonts.body, UITheme.colors.accent, "center");

        const vitalY = headerY + 58;
        const gap = 12;
        
        // --- FIX: Helper to extract number from object ---
        const getVal = (v) => {
            if (v && typeof v === 'object') return v.total || v.value || v.base || 0;
            return Number(v) || 0;
        };

        const totalMaxHp = getVal(stats.maxHp) || getVal(member.maxHp); 
        const totalMaxStm = getVal(stats.maxStamina) || getVal(member.maxStamina);
        const totalMaxIns = getVal(stats.maxInsight) || getVal(member.maxInsight);
        // ------------------------------------------------

        const hpText = `HP ${member.hp}/${totalMaxHp}`;
        const stmText = `STM ${member.stamina}/${totalMaxStm}`;
        const insText = `INS ${member.insight || 0}/${totalMaxIns}`; 
        const xpText = `XP ${member.xp}/${member.xpToNext || 100}`; 

        // Center the vitals row manually since it's multiple elements
        this.ctx.font = UITheme.fonts.mono; // Need to measure to center
        const hpW = this.ctx.measureText(hpText).width;
        const stmW = this.ctx.measureText(stmText).width;
        const insW = this.ctx.measureText(insText).width;
        const xpW = this.ctx.measureText(xpText).width;
        
        const totalW = hpW + stmW + insW + xpW + (gap * 3);
        let startX = centerX - (totalW / 2);

        this.ui.drawText(hpText, startX + (hpW/2), vitalY, UITheme.fonts.mono, UITheme.colors.danger, "center");
        startX += hpW + gap;
        this.ui.drawText(stmText, startX + (stmW/2), vitalY, UITheme.fonts.mono, UITheme.colors.success, "center");
        startX += stmW + gap;
        this.ui.drawText(insText, startX + (insW/2), vitalY, UITheme.fonts.mono, UITheme.colors.insight, "center");
        startX += insW + gap;
        this.ui.drawText(xpText, startX + (xpW/2), vitalY, UITheme.fonts.mono, "#9370DB", "center");

        this.ui.drawRect(x + 20, vitalY + 15, w - 40, 1, "#333");

        // Equipment Slots
        const equipData = (member.state && member.state.equipment) ? member.state.equipment : (member.equipment || {});
        const splitIndex = Math.ceil(activeSlots.length / 2);
        const leftSlots = activeSlots.slice(0, splitIndex);
        const rightSlots = activeSlots.slice(splitIndex);

        const PORTRAIT_SIZE = 112; 
        const SLOT_HEIGHT = 48; 
        const headerHeight = 85; 
        
        const totalSlotHeight = Math.max(leftSlots.length, rightSlots.length) * (SLOT_HEIGHT + 4);
        const contentHeight = Math.max(PORTRAIT_SIZE, totalSlotHeight);
        const equipStartY = y + headerHeight + 10;
        
        const pX = Math.floor(centerX - (PORTRAIT_SIZE / 2));
        const pY = Math.floor(equipStartY + (contentHeight - PORTRAIT_SIZE) / 2);

        // Portrait
        this.ui.drawRect(pX, pY, PORTRAIT_SIZE, PORTRAIT_SIZE, UITheme.colors.border, false); // Stroke
        let assetKey = member.portrait || member.sprite || 'hero'; 
        if (!this.loader.get(assetKey)) assetKey = 'spritesheet';
        const img = this.loader.get(assetKey);
        this.ui.drawSprite(img, 0, 0, img.width, img.height, pX, pY, PORTRAIT_SIZE, PORTRAIT_SIZE);

        const drawSlot = (slotName, index, isLeft) => {
            const globalIndex = isLeft ? index : splitIndex + index;
            const isSelected = (globalIndex === selectedIndex);
            
            const slotW = Math.floor((w - PORTRAIT_SIZE - 20) / 2); 
            const slotX = isLeft ? (centerX - (PORTRAIT_SIZE/2) - slotW - 8) : (centerX + (PORTRAIT_SIZE/2) + 8);
            const slotY = equipStartY + (index * (SLOT_HEIGHT + 4));

            let borderColor = isSelected ? (isChoosingItem ? UITheme.colors.accent : UITheme.colors.textHighlight) : "#333";
            let boxColor = isSelected ? (isChoosingItem ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.1)") : "rgba(0,0,0,0.3)";

            this.ui.drawRect(slotX, slotY, slotW, SLOT_HEIGHT, boxColor); // Fill
            this.ctx.lineWidth = isSelected ? 2 : 1; // Manual line width override for emphasis
            this.ui.drawRect(slotX, slotY, slotW, SLOT_HEIGHT, borderColor, false); // Stroke

            const item = equipData[slotName];
            let itemName = "Unknown";
            if (item) itemName = item.name || (item.definition ? item.definition.name : "Item");
            
            const slotLabelColor = "#666";
            const font = "11px sans-serif";
            const lineHeight = 12;

            if (isLeft) {
                const iconX = slotX + slotW - this.RENDER_SIZE - 4;
                if (item) this.drawItemIcon(item, iconX, slotY + (SLOT_HEIGHT - this.RENDER_SIZE)/2);
                
                const textAreaW = slotW - this.RENDER_SIZE - 16;
                this.ui.drawText(slotName.toUpperCase(), iconX - 6, slotY + 12, "bold 9px monospace", slotLabelColor, "right");
                
                if (item) {
                    const lines = this.ui.getWrappedLines(itemName, textAreaW, font);
                    let cursorY = slotY + 26; 
                    lines.forEach(line => {
                        this.ui.drawText(line, iconX - 6, cursorY, font, UITheme.colors.textMain, "right");
                        cursorY += lineHeight;
                    });
                } else {
                    this.ui.drawText("Empty", iconX - 6, slotY + 26, "italic 11px sans-serif", "#444", "right");
                }
            } else {
                const iconX = slotX + 4;
                if (item) this.drawItemIcon(item, iconX, slotY + (SLOT_HEIGHT - this.RENDER_SIZE)/2);
                
                const textStartX = iconX + this.RENDER_SIZE + 6;
                const textAreaW = slotW - this.RENDER_SIZE - 16;
                this.ui.drawText(slotName.toUpperCase(), textStartX, slotY + 12, "bold 9px monospace", slotLabelColor, "left");

                if (item) {
                    const lines = this.ui.getWrappedLines(itemName, textAreaW, font);
                    let cursorY = slotY + 26; 
                    lines.forEach(line => {
                        this.ui.drawText(line, textStartX, cursorY, font, UITheme.colors.textMain, "left");
                        cursorY += lineHeight;
                    });
                } else {
                    this.ui.drawText("Empty", textStartX, slotY + 26, "italic 11px sans-serif", "#444", "left");
                }
            }
        };

        leftSlots.forEach((slot, i) => drawSlot(slot, i, true));
        rightSlots.forEach((slot, i) => drawSlot(slot, i, false));

        // Traits
        const traitsStartY = equipStartY + contentHeight + 25;
        this.drawTraitBadges(member, x, traitsStartY, w);
    }

    drawTraitBadges(member, columnX, startY, columnWidth) {
        const centerX = columnX + (columnWidth / 2);
        this.ui.drawText("Traits", centerX, startY, UITheme.fonts.bold, "#666", "center");
        
        let currentY = startY + 20;
        const traits = member.traits || [];

        if (traits.length === 0) {
            this.ui.drawText("None", centerX, currentY, "italic 11px sans-serif", "#444", "center");
            return;
        }

        const badgeHeight = 22;
        const xPadding = 10;
        const gap = 8;
        const leftMargin = columnX + 30;
        const maxRowWidth = columnWidth - 60; 
        
        let currentX = leftMargin;
        this.ctx.font = "11px sans-serif"; // For measuring

        traits.forEach(traitId => {
            const label = traitId.charAt(0).toUpperCase() + traitId.slice(1);
            const textWidth = this.ctx.measureText(label).width;
            const badgeWidth = textWidth + (xPadding * 2);

            if (currentX + badgeWidth > leftMargin + maxRowWidth) {
                currentX = leftMargin;
                currentY += badgeHeight + gap;
            }

            // Draw Badge
            this.ui.drawRect(currentX, currentY, badgeWidth, badgeHeight, "rgba(255, 255, 255, 0.1)");
            this.ui.drawRect(currentX, currentY, badgeWidth, badgeHeight, "#555", false);
            this.ui.drawText(label, currentX + (badgeWidth/2), currentY + 15, "11px sans-serif", "#ccc", "center");

            currentX += badgeWidth + gap;
        });
    }

    drawRightColumn(inventory, inventoryIndex, isChoosingItem, x, y, w) {
        let currentY = y + 20;
        this.ui.drawText("Inventory", x, currentY, UITheme.fonts.bold, UITheme.colors.textHighlight, "left");
        currentY += 10;
        
        this.ui.drawRect(x, currentY + 10, w, 2, "#444");
        currentY += 25;

        if (!inventory || inventory.length === 0) {
            this.ui.drawText("Empty", x, currentY, "13px sans-serif", "#555", "left");
            return;
        }

        inventory.forEach((item, index) => {
            const isSelected = (isChoosingItem && index === inventoryIndex);
            const rowHeight = 34; 
            
            if (isSelected) {
                this.ui.drawRect(x - 5, currentY - 18, w + 10, rowHeight, "rgba(255, 215, 0, 0.1)");
                this.ui.drawText(">", x - 12, currentY, "13px sans-serif", UITheme.colors.accent, "left");
            }
            
            const iconY = Math.floor(currentY - 16);
            this.drawItemIcon(item, Math.floor(x), iconY);
            
            const color = isSelected ? "#ffffff" : "#aaaaaa";
            const name = item.name || (item.definition ? item.definition.name : "Unknown");
            
            // Name
            const nameX = Math.floor(x + this.RENDER_SIZE + 12);
            this.ui.drawText(name, nameX, currentY - 5, "13px sans-serif", color, "left");
            
            // Type/Rarity
            const def = item.definition || item;
            const subText = (def.slot || def.type || "").toUpperCase();
            this.ui.drawText(subText, nameX, currentY + 8, "10px monospace", "#666", "left");
            
            // Count
            if (item.count > 1) {
                this.ui.drawText(`x${item.count}`, x + w, currentY, "13px monospace", "#fff", "right");
            }
            
            currentY += rowHeight + 4;
        });
    }

    drawFooter(w, h, isChoosingItem) {
        const footerY = h - 30;
        let text = "[WASD] Navigate   [SPACE] Select Slot   [ESC] Back";
        if (isChoosingItem) text = "[UP/DOWN] Select Item   [ENTER] Equip   [ESC] Cancel";
        
        this.ui.drawText(text, w / 2, footerY, "12px sans-serif", "#666", "center");
    }
}