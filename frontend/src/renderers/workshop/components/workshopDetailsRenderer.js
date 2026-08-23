import { WorkshopBaseRenderer } from './workshopBaseRenderer.js';
import { ItemDefinitions } from '../../../../../shared/data/itemDefinitions.js';
import { AbilityDefinitions } from '../../../../../shared/data/abilityDefinitions.js';
import { Formatting } from '../../../../../shared/utils/formatting.js';
import { UITheme } from '../../../ui/UITheme.js';
import { gameState } from '../../../../../shared/state/gameState.js';

export class WorkshopDetailsRenderer extends WorkshopBaseRenderer {

    renderRecipeDetails(state, x, w, h, hitboxes) {
        if (!state.selectedRecipe) {
            this.ui.drawText("- Select a Recipe or Item to Upgrade -", x + (w / 2), h / 2, UITheme.fonts.italic, UITheme.colors.textMuted, "center");
            return;
        }

        const recipe = state.selectedRecipe;
        const outDef = ItemDefinitions[recipe.outputItemId];
        if (!outDef) return;

        let cursorY = this.padding;
        const contentX = x + this.padding;
        const contentW = w - (this.padding * 2);
        const activeTab = state.activeTab || 'description';

        // --- Tabs ---
        const tabH = 67;
        const tabW = contentW / 3;

        const drawTab = (label, tx, isActive, id) => {
            const isHovered = state.hoveredHitboxId === id;
            let bgColor = "rgba(0,0,0,0.5)";
            let textCol = UITheme.colors.textMuted;
            let drawBrackets = false;
            let strokeColor = UITheme.colors.border;

            if (isActive) {
                bgColor = UITheme.colors.states.focusBg;
                textCol = UITheme.colors.states.focusText;
                drawBrackets = true;
                strokeColor = null;
            } else if (isHovered) {
                bgColor = UITheme.colors.states.hoverBg;
                textCol = UITheme.colors.states.hoverText;
                strokeColor = null;
            }

            this.ui.drawPanel(tx, cursorY, tabW, tabH, bgColor);
            if (strokeColor) this.ui.drawRect(tx, cursorY, tabW, tabH, strokeColor, false);
            if (drawBrackets) this.ui.drawSelectionBrackets(tx, cursorY, tabW, tabH, 5, UITheme.colors.borderHighlight);
            this.ui.drawText(label, tx + tabW / 2, cursorY + (tabH / 2) + 10, UITheme.fonts.small, textCol, "center");

            hitboxes.push({ id: id, x: tx, y: cursorY, w: tabW, h: tabH, type: 'tab', hoverSfx: 'hoverTick', clickSfx: 'cinematicBoom' });
        };

        drawTab("DESCRIPTION", contentX, activeTab === 'description', 'TAB_DESCRIPTION');
        drawTab("STATS", contentX + tabW, activeTab === 'stats', 'TAB_STATS');
        drawTab("SKILLS", contentX + (tabW * 2), activeTab === 'skills', 'TAB_SKILLS');
        cursorY += tabH + 36;

        // --- Tab Contents ---
        if (activeTab === 'description') {
            cursorY = this._renderItemHeader(outDef, contentX, cursorY, contentW, null);
            cursorY += 16;
            cursorY = this._renderItemMainInfo(outDef, contentX, cursorY, contentW);
        } else if (activeTab === 'stats') {
            const mockItem = { definition: outDef, stats: outDef.stats };
            cursorY = this._renderDetailedStats(mockItem, contentX, cursorY, contentW);
        } else if (activeTab === 'skills') {
            cursorY = this._renderAbilities(outDef, contentX, cursorY, contentW);
        }

        this._renderMaterialsFooter(state, contentX, cursorY, contentW, h, recipe.materials || {}, recipe.currencyCost || 0, state.canCraftSelected, 'CRAFT ITEM', 'BTN_CRAFT', hitboxes);
    }

    renderUpgradeDetails(state, x, w, h, hitboxes) {
        const item = state.selectedUpgradeItem;
        const def = item.definition || ItemDefinitions[item.defId || item.id];
        if (!def) return;

        let cursorY = this.padding;
        const contentX = x + this.padding;
        const contentW = w - (this.padding * 2);
        const isUpgradeable = item.isUpgradeable || def.isUpgradeable;
        
        // --- Tabs ---
        const activeTab = state.activeTab || 'description';
        const tabH = 67;
        const tabW = contentW / 3;

        const drawTab = (label, tx, isActive, id) => {
            const isHovered = state.hoveredHitboxId === id;
            let bgColor = "rgba(0,0,0,0.5)";
            let textCol = UITheme.colors.textMuted;
            let drawBrackets = false;
            let strokeColor = UITheme.colors.border;

            if (isActive) {
                bgColor = UITheme.colors.states.focusBg;
                textCol = UITheme.colors.states.focusText;
                drawBrackets = true;
                strokeColor = null;
            } else if (isHovered) {
                bgColor = UITheme.colors.states.hoverBg;
                textCol = UITheme.colors.states.hoverText;
                strokeColor = null;
            }

            this.ui.drawPanel(tx, cursorY, tabW, tabH, bgColor);
            if (strokeColor) this.ui.drawRect(tx, cursorY, tabW, tabH, strokeColor, false);
            if (drawBrackets) this.ui.drawSelectionBrackets(tx, cursorY, tabW, tabH, 5, UITheme.colors.borderHighlight);

            this.ui.drawText(label, tx + tabW / 2, cursorY + (tabH / 2) + 10, UITheme.fonts.small, textCol, "center");

            hitboxes.push({ id: id, x: tx, y: cursorY, w: tabW, h: tabH, type: 'tab', hoverSfx: 'hoverTick', clickSfx: 'cinematicBoom' });
        };

        drawTab("DESCRIPTION", contentX, activeTab === 'description', 'TAB_DESCRIPTION');
        drawTab("STATS", contentX + tabW, activeTab === 'stats', 'TAB_STATS');
        drawTab("SKILLS", contentX + (tabW * 2), activeTab === 'skills', 'TAB_SKILLS');

        cursorY += tabH + 36;

        // --- Tab Contents ---
        if (activeTab === 'description') {
            const currentLevel = item.level !== undefined ? item.level : null;
            const nextLevel = (isUpgradeable && !item.isMaxLevel && currentLevel !== null) ? currentLevel + 1 : null;

            cursorY = this._renderItemHeader(def, contentX, cursorY, contentW, currentLevel, nextLevel);
            cursorY += 16;
            cursorY = this._renderItemMainInfo(def, contentX, cursorY, contentW);

            if (isUpgradeable && item.isMaxLevel) {
                this.ui.drawText("MAX LEVEL REACHED", contentX + (contentW/2), cursorY + 40, UITheme.fonts.header, UITheme.colors.success, "center");
            }
        } else if (activeTab === 'stats') {
            if (isUpgradeable && !item.isMaxLevel) {
                this.ui.drawText("Stat Increases", contentX, cursorY, UITheme.fonts.bold, UITheme.colors.textMain, "left");
                cursorY += 24;
            }
            cursorY = this._renderDetailedStats(item, contentX, cursorY, contentW);
        } else if (activeTab === 'skills') {
            if (isUpgradeable && !item.isMaxLevel) {
                const unlocks = def.abilityUnlocks && def.abilityUnlocks[item.level + 1];
                if (unlocks && unlocks.length > 0) {
                    this.ui.drawText("New Abilities Unlocked", contentX, cursorY, UITheme.fonts.bold, UITheme.colors.textHighlight, "left");
                    cursorY += 20;

                    unlocks.forEach(abilityId => {
                        const ability = AbilityDefinitions[abilityId] || { name: abilityId, description: "" };
                        // FIXED: Pass def.name as the source so it says "Source: Bronze Sword" instead of "Source: Innate"
                        cursorY = this._drawAbilityCard(ability, contentX, cursorY, contentW, def.name);
                    });
                } else {
                    this.ui.drawText("- No new skills at next level -", contentX + (contentW/2), cursorY + 32, UITheme.fonts.italic, UITheme.colors.textMuted, "center");
                }
            } else {
                cursorY = this._renderAbilities(def, contentX, cursorY, contentW);
            }
        }

        // --- Footer ---
        if (isUpgradeable && !item.isMaxLevel) {
            const costs = item.nextUpgradeCost || {};
            this._renderMaterialsFooter(
                state, contentX, cursorY, contentW, h, 
                costs.materials || {}, costs.currency || 0, 
                state.canUpgradeSelected, 'UPGRADE ITEM', 'BTN_UPGRADE', hitboxes
            );
        }
    }

    _renderMaterialsFooter(state, x, currentY, w, h, materials, currencyCost, isEnabled, btnText, btnHitboxId, hitboxes) {
        const materialEntries = Object.entries(materials);
        const btnH = 64;
        let footerH = 40;
        footerH += materialEntries.length * 76;
        if (currencyCost > 0) footerH += 36;
        footerH += btnH + 24;
        
        let materialsY = Math.max(currentY + 48, h - 90 - footerH);
        
        this.ui.drawText("Required Materials", x, materialsY, UITheme.fonts.bold, UITheme.colors.textMain, "left");
        materialsY += 16;
        this.ui.drawLine(x, materialsY, x + w, materialsY, UITheme.colors.border, 1);
        materialsY += 24;

        for (const [matId, amountNeeded] of materialEntries) {
            const matDef = ItemDefinitions[matId];
            if (!matDef) continue;
            
            const inventoryItem = (state.partyInventory || []).find(i => i.id === matId);
            const playerHas = inventoryItem ? inventoryItem.qty : 0;
            const hasEnough = playerHas >= amountNeeded;
            const matSlotSize = 64;
            
            this.ui.drawPanel(x, materialsY, matSlotSize, matSlotSize, UITheme.colors.bgScale[1]);
            this.ui.drawRect(x, materialsY, matSlotSize, matSlotSize, UITheme.colors.border, false);
            this.drawIcon(matDef, x, materialsY, matSlotSize);
            
            const color = hasEnough ? UITheme.colors.success : UITheme.colors.failure;
            this.ui.drawText(`${matDef.name}`, x + matSlotSize + 16, materialsY + (matSlotSize / 2), UITheme.fonts.body, color, "left", "middle");
            this.ui.drawText(`${playerHas} / ${amountNeeded}`, x + w, materialsY + (matSlotSize / 2), UITheme.fonts.mono, color, "right", "middle");
            
            materialsY += matSlotSize + 12;
        }

        if (currencyCost > 0) {
            const partyCurrency = gameState.party ? (gameState.party.currency || 0) : (state.partyCurrency || 0);
            const hasEnoughCurrency = partyCurrency >= currencyCost;
            const color = hasEnoughCurrency ? UITheme.colors.textHighlight : UITheme.colors.failure;
            this.ui.drawText(`Cost: ${currencyCost} Gold`, x, materialsY + 12, UITheme.fonts.body, color, "left");
            this.ui.drawText(`(Owned: ${partyCurrency})`, x + w, materialsY + 12, UITheme.fonts.small, UITheme.colors.textMuted, "right");
            materialsY += 36;
        }

        const btnY = materialsY + 12;
        const isHoveredBtn = state.hoveredHitboxId === btnHitboxId;
        
        let btnBg = isEnabled ? UITheme.colors.panelBg : "rgba(0,0,0,0.5)";
        let btnTextCol = isEnabled ? UITheme.colors.textMain : UITheme.colors.textMuted;
        
        if (isEnabled && isHoveredBtn) {
            btnBg = UITheme.colors.states.hoverBg;
            btnTextCol = UITheme.colors.states.hoverText;
        }

        this.ui.drawPanel(x, btnY, w, btnH, btnBg);
        if (isEnabled && isHoveredBtn) {
            this.ui.drawSelectionBrackets(x, btnY, w, btnH, 5, UITheme.colors.borderHighlight);
        }
        this.ui.drawText(btnText, x + (w / 2), btnY + (btnH / 2) + 10, UITheme.fonts.bold, btnTextCol, "center");

        if (isEnabled) {
            hitboxes.push({ id: btnHitboxId, x: x, y: btnY, w: w, h: btnH, type: 'action', hoverSfx: 'hoverTick', clickSfx: 'cinematicBoom' });
        }
    }

    _buildUnifiedStats(item, useNext = false) {
        const def = item.definition || ItemDefinitions[item.defId || item.id] || {};
        
        const getVal = (key, category = null) => {
            if (useNext && item.nextStats) {
                if (category && item.nextStats[category] && item.nextStats[category][key] !== undefined) return item.nextStats[category][key];
                if (!category && item.nextStats[key] !== undefined) return item.nextStats[key];
            }
            if (item.stats) {
                if (category && item.stats[category] && item.stats[category][key] !== undefined) return item.stats[category][key];
                if (!category && item.stats[key] !== undefined) return item.stats[key];
            }
            if (category && item[category] && item[category][key] !== undefined) return item[category][key];
            if (!category && item[key] !== undefined) return item[key];
            if (def.stats) {
                if (category && def.stats[category] && def.stats[category][key] !== undefined) return def.stats[category][key];
                if (!category && def.stats[key] !== undefined) return def.stats[key];
            }
            if (category && def[category] && def[category][key] !== undefined) return def[category][key];
            if (def[key] !== undefined) return def[key];
            return 0;
        };

        return {
            resources: {
                maxHp: getVal('maxHp', 'resources'),
                maxStamina: getVal('maxStamina', 'resources'),
                maxInsight: getVal('maxInsight', 'resources')
            },
            attack: {
                blunt: getVal('blunt', 'attack'), slash: getVal('slash', 'attack'), pierce: getVal('pierce', 'attack'),
                fire: getVal('fire', 'attack'), ice: getVal('ice', 'attack'), lightning: getVal('lightning', 'attack'),
                water: getVal('water', 'attack'), earth: getVal('earth', 'attack'), wind: getVal('wind', 'attack'),
                light: getVal('light', 'attack'), dark: getVal('dark', 'attack'), arcane: getVal('arcane', 'attack')
            },
            defense: {
                blunt: getVal('blunt', 'defense'), slash: getVal('slash', 'defense'), pierce: getVal('pierce', 'defense'),
                fire: getVal('fire', 'defense'), ice: getVal('ice', 'defense'), lightning: getVal('lightning', 'defense'),
                water: getVal('water', 'defense'), earth: getVal('earth', 'defense'), wind: getVal('wind', 'defense'),
                light: getVal('light', 'defense'), dark: getVal('dark', 'defense'), arcane: getVal('arcane', 'defense')
            },
            resistance: {
                blunt: getVal('blunt', 'resistance'), slash: getVal('slash', 'resistance'), pierce: getVal('pierce', 'resistance'),
                fire: getVal('fire', 'resistance'), ice: getVal('ice', 'resistance'), lightning: getVal('lightning', 'resistance'),
                water: getVal('water', 'resistance'), earth: getVal('earth', 'resistance'), wind: getVal('wind', 'resistance'),
                light: getVal('light', 'resistance'), dark: getVal('dark', 'resistance'), arcane: getVal('arcane', 'resistance')
            },
            speed: getVal('speed'), critChance: getVal('critChance'), critMultiplier: getVal('critMultiplier'),
            evasion: getVal('evasion'), corruption: getVal('corruption'), hpRecovery: getVal('hpRecovery'),
            staminaRecovery: getVal('staminaRecovery'), insightRecovery: getVal('insightRecovery')
        };
    }

    _renderDetailedStats(item, x, y, w) {
        let currentY = y;
        const cStats = this._buildUnifiedStats(item, false);
        const pStats = this._buildUnifiedStats(item, true);

        // --- 1. Resources ---
        this.ui.drawText("Resources", x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 10;
        this.ui.drawLineWithGothicFlourish(x, currentY, w, UITheme.colors.borderHighlight);
        currentY += 32;

        if (cStats.resources.maxHp || pStats.resources.maxHp) currentY = this._drawStatDiffRow("Max HP", cStats.resources.maxHp, pStats.resources.maxHp, x, currentY, w, 32);
        if (cStats.resources.maxStamina || pStats.resources.maxStamina) currentY = this._drawStatDiffRow("Max STM", cStats.resources.maxStamina, pStats.resources.maxStamina, x, currentY, w, 32);
        if (cStats.resources.maxInsight || pStats.resources.maxInsight) currentY = this._drawStatDiffRow("Max INS", cStats.resources.maxInsight, pStats.resources.maxInsight, x, currentY, w, 32);
        currentY += 15;

        // --- 2. Combat Stats ---
        this.ui.drawText("Combat Stats", x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 10;
        this.ui.drawLineWithGothicFlourish(x, currentY, w, UITheme.colors.borderHighlight);
        currentY += 32;

        const combatStats = [
            { label: "SPD", c: cStats.speed, p: pStats.speed },
            { label: "CRT %", c: cStats.critChance, p: pStats.critChance, isPct: true },
            { label: "HP REC", c: cStats.hpRecovery, p: pStats.hpRecovery },
            { label: "CRT DMG", c: cStats.critMultiplier, p: pStats.critMultiplier, isPct: true },
            { label: "STM REC", c: cStats.staminaRecovery, p: pStats.staminaRecovery },
            { label: "EVA %", c: cStats.evasion, p: pStats.evasion, isPct: true },
            { label: "INS REC", c: cStats.insightRecovery, p: pStats.insightRecovery },
            { label: "COR %", c: cStats.corruption, p: pStats.corruption, isPct: true }
        ].filter(stat => stat.c !== 0 || stat.p !== 0);

        const cColW = w / 2;
        const rowH = 32;

        combatStats.forEach((stat, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const itemX = x + (col * cColW);
            const itemY = currentY + (row * rowH);

            let cStr = stat.isPct ? `${(stat.c * 100).toFixed(0)}%` : stat.c.toString();
            let pStr = stat.isPct ? `${(stat.p * 100).toFixed(0)}%` : stat.p.toString();

            this.ui.drawText(stat.label, itemX, itemY, UITheme.fonts.small, UITheme.colors.textMuted, "left");
            this.ui.drawText(cStr, itemX + 85, itemY, UITheme.fonts.mono, UITheme.colors.textMain, "left");

            if (stat.c !== stat.p) {
                let arrowColor = (stat.p > stat.c) ? UITheme.colors.success : UITheme.colors.failure;
                this.ctx.font = UITheme.fonts.mono;
                const cWidth = this.ctx.measureText(cStr).width;
                const arrowX = itemX + 85 + cWidth + 12;
                this.ui.drawArrow(arrowX, itemY - 8, 6, 'right', arrowColor);
                this.ui.drawText(pStr, arrowX + 15, itemY, UITheme.fonts.mono, arrowColor, "left");
            }
        });

        if (combatStats.length > 0) {
            currentY += (Math.ceil(combatStats.length / 2) * rowH) + 24;
        }

        // --- 3. Attack & Defenses Table ---
        currentY = this._drawProjectedResistanceTable(cStats, pStats, x, currentY, w);
        return currentY;
    }

    _drawStatDiffRow(label, curr = 0, prev = 0, x, y, w, rowH = 48) {
        this.ui.drawText(label, x, y, UITheme.fonts.small, UITheme.colors.textMuted, "left");
        const valX = x + (w * 0.4);
        this.ui.drawText(curr.toString(), valX, y, UITheme.fonts.mono, UITheme.colors.textMain, "right");
        if (curr !== prev) {
            let arrowColor = (prev > curr) ? UITheme.colors.success : UITheme.colors.failure;
            const arrowX = valX + 25;
            this.ui.drawArrow(arrowX, y - 8, 8, 'right', arrowColor);
            this.ui.drawText(prev.toString(), arrowX + 20, y, UITheme.fonts.mono, arrowColor, "left");
        }
        return y + rowH;
    }

    _drawProjectedResistanceTable(cStats, pStats, x, y, w) {
        let currentY = y;
        this.ui.drawText("Damage & Resistances", x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 10;
        this.ui.drawLineWithGothicFlourish(x, currentY, w, UITheme.colors.borderHighlight);
        currentY += 32;

        const colType = x;
        const colAtk = x + (w * 0.35);
        const colDef = x + (w * 0.60);
        const colRes = x + (w * 0.85);
        const headerFont = UITheme.fonts.cardTitle || "bold 28px sans-serif";
        
        this.ui.drawText("TYPE", colType, currentY, headerFont, UITheme.colors.textMuted, "left");
        this.ui.drawText("ATK", colAtk, currentY, headerFont, UITheme.colors.attack, "center");
        this.ui.drawText("DEF", colDef, currentY, headerFont, UITheme.colors.defense, "center");
        this.ui.drawText("RES", colRes, currentY, headerFont, UITheme.colors.resistance, "center");
        currentY += 10;
        this.ui.drawLineWithGothicFlourish(x, currentY, w, UITheme.colors.border);
        currentY += 30;

        const types = ["blunt", "slash", "pierce", "fire", "ice", "lightning", "water", "earth", "wind", "light", "dark", "arcane"];
        const rowH = 30;

        types.forEach((type) => {
            const cAtk = cStats.attack[type] || 0;
            const pAtk = pStats.attack[type] || 0;
            const cDef = cStats.defense[type] || 0;
            const pDef = pStats.defense[type] || 0;
            const cRes = cStats.resistance[type] || 0;
            const pRes = pStats.resistance[type] || 0;
            
            if (pAtk === 0 && pDef === 0 && pRes === 0 && cAtk === 0 && cDef === 0 && cRes === 0) return;
            
            const label = Formatting.getAbbreviation ? Formatting.getAbbreviation(type) : type.substring(0, 3).toUpperCase();
            this.ui.drawText(label, colType, currentY, UITheme.fonts.mono, UITheme.colors.textMuted, "left");
            
            const drawCell = (curr, prev, xPos, defaultColor, isPct = false) => {
                if (prev === 0 && curr === 0) {
                    this.ui.drawText("-", xPos, currentY, UITheme.fonts.mono, UITheme.colors.textMuted, "center");
                    return;
                }
                const cStr = isPct ? `${(curr * 100).toFixed(0)}%` : `${curr}`;
                const pStr = isPct ? `${(prev * 100).toFixed(0)}%` : `${prev}`;
                
                if (curr === prev) {
                    this.ui.drawText(cStr, xPos, currentY, UITheme.fonts.mono, defaultColor, "center");
                } else {
                    let arrowColor = (prev > curr) ? UITheme.colors.success : UITheme.colors.failure;
                    this.ctx.font = UITheme.fonts.mono;
                    const cWidth = this.ctx.measureText(cStr).width;
                    const pWidth = this.ctx.measureText(pStr).width;
                    const arrowSize = 6;
                    const space = 8;
                    const totalWidth = cWidth + space + (arrowSize * 2) + space + pWidth;
                    const startX = xPos - (totalWidth / 2);
                    
                    this.ui.drawText(cStr, startX, currentY, UITheme.fonts.mono, UITheme.colors.textMain, "left");
                    const arrowX = startX + cWidth + space + arrowSize;
                    this.ui.drawArrow(arrowX, currentY - 8, arrowSize, 'right', arrowColor);
                    this.ui.drawText(pStr, arrowX + arrowSize + space, currentY, UITheme.fonts.mono, arrowColor, "left");
                }
            };

            drawCell(cAtk, pAtk, colAtk, UITheme.colors.attack);
            drawCell(cDef, pDef, colDef, UITheme.colors.defense);
            drawCell(cRes, pRes, colRes, UITheme.colors.resistance, true);
            
            currentY += rowH;
        });
        return currentY;
    }

    _renderItemHeader(def, x, y, w, currentLevel = null, nextLevel = null) {
        let currentY = y;
        const color = this.getRarityColor(def.rarity);
        const title = def.name || "Unknown";
        const itemLevel = currentLevel !== null ? currentLevel : (def.level || def.itemLevel);
        let typeText = `${(def.type || "Item").toUpperCase()}`;
        
        if (def.slot) {
            typeText += ` - ${def.slot.toUpperCase()}`;
        }

        this.ui.ctx.save();
        this.ui.ctx.fillStyle = color;
        this.ui.ctx.globalAlpha = 0.12;
        this.ui.ctx.fillRect(x, currentY, w, 85);
        this.ui.ctx.restore();

        const headerFont = UITheme.fonts.cardTitle || UITheme.fonts.header;
        const typeFont = UITheme.fonts.cardItalic || UITheme.fonts.italic;
        const bodyFont = UITheme.fonts.cardSmall || UITheme.fonts.body;

        this.ui.drawText(title, x + 24, currentY + 40, headerFont, color, "left");
        
        if (itemLevel !== undefined) {
            let lvlStr = `Lv. ${itemLevel}`;
            if (nextLevel !== null) {
                lvlStr += ` -> ${nextLevel}`;
            }
            this.ui.drawText(lvlStr, x + w - 24, currentY + 40, headerFont, UITheme.colors.textHighlight, "right");
        }

        this.ui.drawText(typeText, x + 24, currentY + 74, typeFont, UITheme.colors.textMuted, "left");
        
        if (def.weight !== undefined || def.value !== undefined) {
            const rightMeta = [];
            if (def.weight !== undefined) rightMeta.push(`Wt: ${def.weight}`);
            if (def.value !== undefined) rightMeta.push(`Val: ${def.value}g`);
            this.ui.drawText(rightMeta.join("   "), x + w - 24, currentY + 74, bodyFont, UITheme.colors.textMuted, "right");
        }

        this.ui.ctx.save();
        this.ui.ctx.strokeStyle = color;
        this.ui.ctx.globalAlpha = 0.6;
        this.ui.ctx.beginPath();
        this.ui.ctx.moveTo(x, currentY + 85);
        this.ui.ctx.lineTo(x + w, currentY + 85);
        this.ui.ctx.stroke();
        this.ui.ctx.restore();

        return currentY + 85;
    }

    _renderItemMainInfo(def, x, y, w) {
        let textY = y;
        const iconSize = 128;
        
        this.ui.drawPanel(x, y, iconSize, iconSize, UITheme.colors.bgScale[2]);
        this.ui.drawRect(x, y, iconSize, iconSize, UITheme.colors.border, false);
        this.drawIcon(def, x, y, iconSize);
        
        const textX = x + iconSize + 16;
        const textW = w - iconSize - 16;
        let hasContent = false;
        
        if (def.effectDescription) {
            const lines = this.ui.getWrappedLines(def.effectDescription, textW, UITheme.fonts.body);
            lines.forEach(line => {
                this.ui.drawText(line, textX, textY + 16, UITheme.fonts.body, UITheme.colors.textMain, "left");
                textY += 28;
            });
            hasContent = true;
        }
        
        if (def.description) {
            if (hasContent) textY += 16;
            const lines = this.ui.getWrappedLines(`"${def.description}"`, textW, UITheme.fonts.cardItalic);
            lines.forEach(line => {
                this.ui.drawText(line, textX, textY + 16, UITheme.fonts.cardItalic, UITheme.colors.textMuted, "left");
                textY += 28;
            });
        }
        return Math.max(y + iconSize, textY);
    }

    _renderAbilities(def, x, y, w) {
        const granted = def.grantedAbilities || [];
        if (granted.length === 0) {
            this.ui.drawText("- No skills granted -", x + (w/2), y + 32, UITheme.fonts.italic, UITheme.colors.textMuted, "center");
            return y + 64;
        }

        let currentY = y;
        const sourceName = def.name || 'Equipment';
        
        granted.forEach(abilityId => {
            const ability = AbilityDefinitions[abilityId] || { name: abilityId, description: "" };
            currentY = this._drawAbilityCard(ability, x, currentY, w, sourceName);
        });
        return currentY;
    }

    _drawAbilityCard(ab, x, y, w, sourceName = 'Innate') {
        const cardPadding = 24;
        const iconSize = 64; 
        const gap = 24;

        // --- 1. Damage Type Colors Configuration ---
        let rawType = ab.damageType || (ab.type ? ab.type.toLowerCase() : 'physical');
        if (!ab.damageType && ab.effects && ab.effects.length > 0) {
            const dmgEffect = ab.effects.find(e => e.type === 'damage');
            if (dmgEffect && dmgEffect.damageType) rawType = dmgEffect.damageType.toLowerCase();
        }
        const themeColor = (UITheme.colors.types && UITheme.colors.types[rawType]) || UITheme.colors.textMuted;
        const displayType = rawType.charAt(0).toUpperCase() + rawType.slice(1);

        // --- 2. Calculate Layout Heights ---
        const descW = w - (cardPadding * 2);
        const descLines = ab.description ? this.ui.getWrappedLines(ab.description, descW, UITheme.fonts.cardItalic) : [];
        
        // FIXED: Check for range as a stat trigger
        const hasStats = ab.effects || ab.accuracy !== undefined || ab.speed !== undefined || ab.range !== undefined;
        
        const infoBlockHeight = hasStats ? 160 : 136;
        const dividerHeight = descLines.length > 0 ? 40 : 0;
        const descTextHeight = descLines.length > 0 ? (descLines.length * 24) : 0;
        const cardHeight = cardPadding + infoBlockHeight + dividerHeight + descTextHeight + cardPadding;

        // --- 3. Draw Thematic Background Panel & Border ---
        this.ui.drawPanel(x, y, w, cardHeight, UITheme.colors.panelBg);

        this.ui.ctx.save();
        const bgGrad = this.ui.ctx.createLinearGradient(x, y, x, y + cardHeight);
        bgGrad.addColorStop(0, `${themeColor}15`);
        bgGrad.addColorStop(0.4, 'rgba(0,0,0,0)');
        this.ui.ctx.fillStyle = bgGrad;
        this.ui.ctx.fillRect(x, y, w, cardHeight);
        this.ui.ctx.restore();

        this.ui.ctx.strokeStyle = themeColor;
        this.ui.ctx.lineWidth = 1;
        this.ui.ctx.strokeRect(x, y, w, cardHeight);

        // --- 4. Render Info Block (TOP) ---
        const infoY = y + cardPadding;
        const iconX = x + cardPadding;
        const iconY = infoY + 16;

        this.ui.ctx.fillStyle = UITheme.colors.bgScale?.[2] || 'rgba(255, 255, 255, 0.05)';
        this.ui.ctx.fillRect(iconX, iconY, iconSize, iconSize);
        this._drawAbilityIcon(ab, iconX, iconY, iconSize);

        this.ui.ctx.strokeStyle = themeColor;
        this.ui.ctx.lineWidth = 1;
        this.ui.ctx.strokeRect(iconX, iconY, iconSize, iconSize);

        const contentX = iconX + iconSize + gap;
        let currentTextY = iconY + 12;

        // Row 1: Title & Cost
        const abilityName = ab.name || ab.id;
        this.ui.ctx.textAlign = 'left';
        this.ui.ctx.textBaseline = 'middle';
        this.ui.ctx.font = UITheme.fonts.cardTitle;
        this.ui.ctx.fillStyle = themeColor;
        this.ui.ctx.fillText(abilityName, contentX, currentTextY);

        this.ui.ctx.textAlign = 'right';
        this.ui.ctx.font = UITheme.fonts.cardMono;
        if (ab.cost) {
            let costStr = "Free";
            let costCol = UITheme.colors.textMuted;
            if (ab.cost.hp) {
                costStr = `${ab.cost.hp} HP`;
                costCol = UITheme.colors.hp;
            } else if (ab.cost.mana) {
                costStr = `${ab.cost.mana} MP`;
                costCol = UITheme.colors.ins;
            } else if (ab.cost.stamina) {
                costStr = `${ab.cost.stamina} STM`;
                costCol = UITheme.colors.stm;
            } else if (ab.cost.insight) {
                costStr = `${ab.cost.insight} INS`;
                costCol = UITheme.colors.ins;
            }
            this.ui.ctx.fillStyle = costCol;
            this.ui.ctx.fillText(costStr, x + w - cardPadding, currentTextY);
        } else {
            this.ui.ctx.fillStyle = themeColor;
            this.ui.ctx.fillText("Free", x + w - cardPadding, currentTextY);
        }
        currentTextY += 32;

        // Row 2: Type Badge
        this.ui.ctx.textAlign = 'left';
        this.ui.ctx.font = UITheme.fonts.cardItalic;
        const typeWidth = this.ui.ctx.measureText(displayType).width;
        const badgePadX = 10;
        const badgeH = 24;
        const badgeW = typeWidth + (badgePadX * 2);
        const badgeDrawY = currentTextY - (badgeH / 2);

        this.ui.ctx.fillStyle = `${themeColor}33`;
        this.ui.ctx.strokeStyle = themeColor;
        this.ui.ctx.lineWidth = 1;
        this.ui.ctx.beginPath();
        if (this.ui.ctx.roundRect) {
            this.ui.ctx.roundRect(contentX, badgeDrawY, badgeW, badgeH, badgeH / 2);
        } else {
            this.ui.ctx.rect(contentX, badgeDrawY, badgeW, badgeH);
        }
        this.ui.ctx.fill();
        this.ui.ctx.stroke();
        
        this.ui.ctx.fillStyle = themeColor;
        this.ui.ctx.fillText(displayType, contentX + badgePadX, currentTextY);
        currentTextY += 30;

        // Row 3: Target
        this.ui.ctx.font = UITheme.fonts.cardItalic;
        const targetLabel = "Target: ";
        const sourceLabel = "Source: ";
        const labelColumnW = Math.max(
            this.ui.ctx.measureText(targetLabel).width,
            this.ui.ctx.measureText(sourceLabel).width
        );

        const targetText = this._formatTargetingText(ab.targeting);
        this.ui.ctx.fillStyle = UITheme.colors.textMuted;
        this.ui.ctx.fillText(targetLabel, contentX, currentTextY);
        this.ui.ctx.fillStyle = themeColor;
        this.ui.ctx.fillText(targetText, contentX + labelColumnW, currentTextY);
        currentTextY += 24;

        // Row 4: Source
        this.ui.ctx.fillStyle = UITheme.colors.textMuted;
        this.ui.ctx.fillText(sourceLabel, contentX, currentTextY);
        this.ui.ctx.fillStyle = themeColor;
        this.ui.ctx.fillText(sourceName, contentX + labelColumnW, currentTextY);
        currentTextY += 26;

        // Row 5: Combat Stats Grid
        if (hasStats) {
            let statX = contentX;
            this.ui.ctx.font = UITheme.fonts.cardMono;
            
            const drawStat = (label, value, valueColor) => {
                this.ui.ctx.fillStyle = UITheme.colors.textMuted;
                this.ui.ctx.fillText(`${label} `, statX, currentTextY);
                statX += this.ui.ctx.measureText(`${label} `).width;
                this.ui.ctx.fillStyle = valueColor;
                this.ui.ctx.fillText(value, statX, currentTextY);
                statX += this.ui.ctx.measureText(value).width + 24;
            };

            if (ab.effects) {
                const dmg = ab.effects.find(e => e.type === 'damage' || e.type === 'heal');
                if (dmg) drawStat("Pwr:", `${dmg.power}x`, themeColor);
            }
            if (ab.accuracy !== undefined) drawStat("Acc:", `${Math.floor(ab.accuracy*100)}%`, themeColor);
            if (ab.speed !== undefined) drawStat("Spd:", ab.speed.toString(), themeColor);
            
            // FIXED: Added Range stat rendering
            if (ab.range !== undefined) drawStat("Rng:", ab.range.toString(), themeColor);
        }

        // --- 7. Render Divider & Description (BOTTOM) ---
        this.ui.ctx.textBaseline = 'top';
        let cursorY = infoY + infoBlockHeight;

        if (descLines.length > 0) {
            const flourishW = w * 0.6;
            if (this.ui.drawLineWithGothicFlourish) {
                this.ui.drawLineWithGothicFlourish(x + (w - flourishW)/2, cursorY, flourishW, themeColor);
            } else {
                this.ui.ctx.fillStyle = themeColor;
                this.ui.ctx.fillRect(x + (w - flourishW)/2, cursorY + 12, flourishW, 1);
            }
            cursorY += 24;

            this.ui.ctx.textAlign = 'center';
            this.ui.ctx.fillStyle = themeColor;
            this.ui.ctx.font = UITheme.fonts.cardItalic;
            
            descLines.forEach(line => {
                this.ui.ctx.fillText(line, x + (w/2), cursorY);
                cursorY += 24;
            });
        }
        
        this.ui.ctx.textBaseline = 'alphabetic';
        return y + cardHeight + 16;
    }

    _formatTargetingText(targeting) {
        if (!targeting) return 'None';
        const scope = targeting.scope || 'enemy';
        const select = targeting.select || 'single';
        const count = targeting.count || 1;
        
        if (scope === 'self') return 'Self';
        if (scope === 'all_enemies') return 'All Enemies';
        if (scope === 'all_allies') return 'All Allies';
        if (scope === 'everyone') return 'Everyone';
        
        const scopeStr = scope.charAt(0).toUpperCase() + scope.slice(1);
        if (select === 'multiple') return `${count}x ${scopeStr}`;
        if (select === 'random') return `Random ${scopeStr}`;
        if (select === 'row') return `${scopeStr} Row`;
        return `Single ${scopeStr}`;
    }
    _drawAbilityIcon(ability, x, y, size) {
        // Try to access the loader (either directly on the class or via this.ui)
        const loader = this.loader || (this.ui && this.ui.loader);
        
        if (loader && typeof this.ui.drawSprite === 'function') {
            const sheet = loader.get('abilities') || loader.get('items');
            if (sheet) {
                const iconData = ability.icon || { col: 0, row: 0 };
                this.ui.drawSprite(
                    sheet, 
                    iconData.col * 32, 
                    iconData.row * 32, 
                    32, 32, 
                    x, y, 
                    size, 
                    size
                );
                return; // Successfully drew from the spritesheet
            }
        }
        
        // Fallback: Use the base class's drawIcon, but force the type 
        // to 'ability' so it knows to look for the correct spritesheet.
        this.drawIcon({ ...ability, type: 'ability' }, x, y, size);
    }
}