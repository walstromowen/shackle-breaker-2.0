import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';
import { AbilityDefinitions } from '../../../../shared/data/abilityDefinitions.js';
import { Formatting } from '../../../../shared/utils/formatting.js';
import { TooltipSystem } from '../../renderers/characterSummary/components/tooltipSystem.js';
import { gameState } from '../../../../shared/state/gameState.js';

export class WorkshopRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader;
        this.ui = new CanvasUI(ctx);
        this.tooltipSystem = new TooltipSystem(this.ui, loader);
        this.hitboxes = [];
        this.padding = 36;
    }

    render(state) {
        this.hitboxes = [];
        if (!state) return;

        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;
        this.ui.clearScreen(w, h);

        const leftW = Math.floor(w * 0.28);
        const centerW = Math.floor(w * 0.44);
        const rightW = w - leftW - centerW;

        this.ui.drawRect(0, 0, leftW, h, UITheme.colors.bgScale[0]);
        this.ui.drawRect(leftW, 0, centerW, h, UITheme.colors.bgScale[1]);
        this.ui.drawRect(leftW + centerW, 0, rightW, h, UITheme.colors.bgScale[0]);

        this.ui.drawLine(leftW, 0, leftW, h, UITheme.colors.border, 1);
        this.ui.drawLine(leftW + centerW, 0, leftW + centerW, h, UITheme.colors.border, 1);

        this._renderRecipeList(state, 0, leftW, h);

        // --- Context Switch: Crafting vs Upgrading ---
        if (state.selectedUpgradeItem) {
            this._renderUpgradeDetails(state, leftW, centerW, h);
        } else {
            this._renderRecipeDetails(state, leftW, centerW, h);
        }

        this._renderInventory(state, leftW + centerW, rightW, h);
        this._drawInputPrompts(state, leftW, centerW, h);

        // --- Tooltip Rendering ---
        if (state.hoveredHitboxId && state.hoveredHitboxId.startsWith('PARTY_ITEM_')) {
            const tooltipState = { ...state };
            tooltipState.filteredInventory = state.partyInventory || [];
            if (!tooltipState.member) {
                tooltipState.member = { equipment: {}, stats: {} };
            }

            const activeHitbox = this.hitboxes.find(h => h.id === state.hoveredHitboxId);
            if (activeHitbox) {
                const mx = tooltipState.mouse?.x || 0;
                const my = tooltipState.mouse?.y || 0;
                const isMouseInBox = mx >= activeHitbox.x && mx <= activeHitbox.x + activeHitbox.w &&
                                     my >= activeHitbox.y && my <= activeHitbox.y + activeHitbox.h;
                if (!isMouseInBox) {
                    tooltipState.mouse = {
                        x: Math.floor(activeHitbox.x + (activeHitbox.w / 2)),
                        y: Math.floor(activeHitbox.y + (activeHitbox.h / 2))
                    };
                }
                this.tooltipSystem.render(tooltipState, this.hitboxes);
            }
        }

        if (state.onLayoutUpdate) {
            state.onLayoutUpdate([...this.hitboxes].reverse());
        }

        return this.hitboxes;
    }

    _renderRecipeList(state, x, w, h) {
        const centerX = x + (w / 2);
        let listY = this.padding;

        this.ui.drawText("Recipes", centerX, listY + 24, UITheme.fonts.header, UITheme.colors.textMain, "center");
        listY += 48;
        const flourishW = w * 0.8;
        this.ui.drawLineWithGothicFlourish(centerX - (flourishW / 2), listY, flourishW, UITheme.colors.borderHighlight);
        listY += 32;

        state.availableRecipes.forEach((recipe, index) => {
            const outDef = ItemDefinitions[recipe.outputItemId];
            if (!outDef) return;

            const isSelected = !state.selectedUpgradeItem && state.selectedRecipe && state.selectedRecipe.id === recipe.id;
            const hitboxId = `RECIPE_${recipe.id}`;
            const isHovered = state.hoveredHitboxId === hitboxId;
            const rowH = 88;

            let bgColor = null;
            let textColor = UITheme.colors.textMuted;
            let drawBrackets = false;

            if (isSelected) {
                bgColor = UITheme.colors.states.focusBg;
                textColor = UITheme.colors.states.focusText;
                drawBrackets = true;
            } else if (isHovered) {
                bgColor = UITheme.colors.states.hoverBg;
                textColor = UITheme.colors.states.hoverText;
            }

            if (bgColor) this.ui.drawRect(x + 12, listY, w - 24, rowH, bgColor, true);
            if (drawBrackets) this.ui.drawSelectionBrackets(x + 12, listY, w - 24, rowH, 5, UITheme.colors.borderHighlight);

            this._drawIcon(outDef, x + 24, listY + 12, 64);
            const color = this._getRarityColor(outDef.rarity);
            this.ui.drawText(outDef.name, x + 104, listY + (rowH / 2) + 8, UITheme.fonts.body, color, "left");

            this.hitboxes.push({ id: hitboxId, x: x + 12, y: listY, w: w - 24, h: rowH, type: 'recipe', hoverSfx: 'hoverTick', clickSfx: 'cinematicBoom' });
            listY += rowH + 8;
        });
    }

    _renderRecipeDetails(state, x, w, h) {
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
            this.hitboxes.push({ id: id, x: tx, y: cursorY, w: tabW, h: tabH, type: 'tab', hoverSfx: 'hoverTick', clickSfx: 'cinematicBoom' });
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
            // Mock an item structure to use the detailed stats renderer without diff arrows
            const mockItem = { definition: outDef, stats: outDef.stats };
            cursorY = this._renderDetailedStats(mockItem, contentX, cursorY, contentW);
        } else if (activeTab === 'skills') {
            cursorY = this._renderAbilities(outDef, contentX, cursorY, contentW);
        }

        this._renderMaterialsFooter(state, contentX, cursorY, contentW, h, recipe.materials || {}, recipe.currencyCost || 0, state.canCraftSelected, 'CRAFT ITEM', 'BTN_CRAFT');
    }

    _renderUpgradeDetails(state, x, w, h) {
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
            this.hitboxes.push({ id: id, x: tx, y: cursorY, w: tabW, h: tabH, type: 'tab', hoverSfx: 'hoverTick', clickSfx: 'cinematicBoom' });
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
                        cursorY = this._drawAbilityCard(ability, contentX, cursorY, contentW);
                    });
                } else {
                    this.ui.drawText("- No new skills at next level -", contentX + (contentW/2), cursorY + 32, UITheme.fonts.italic, UITheme.colors.textMuted, "center");
                }
            } else {
                cursorY = this._renderAbilities(def, contentX, cursorY, contentW);
            }
        }

        // --- Footer (Only draws if there is an active upgrade path) ---
        if (isUpgradeable && !item.isMaxLevel) {
            const costs = item.nextUpgradeCost || {};
            this._renderMaterialsFooter(state, contentX, cursorY, contentW, h, costs.materials || {}, costs.currency || 0, state.canUpgradeSelected, 'UPGRADE ITEM', 'BTN_UPGRADE');
        }
    }

    _renderMaterialsFooter(state, x, currentY, w, h, materials, currencyCost, isEnabled, btnText, btnHitboxId) {
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
            this._drawIcon(matDef, x, materialsY, matSlotSize);

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
            this.hitboxes.push({ id: btnHitboxId, x: x, y: btnY, w: w, h: btnH, type: 'action', hoverSfx: 'hoverTick', clickSfx: 'cinematicBoom' });
        }
    }

    _buildUnifiedStats(item, useNext = false) {
        const def = item.definition || ItemDefinitions[item.defId || item.id] || {};

        // Helper to grab stats by safely cascading through available sources
        const getVal = (key, category = null) => {
            // Priority 1: Projected Next Stats (if requested and available)
            if (useNext && item.nextStats) {
                if (category && item.nextStats[category] && item.nextStats[category][key] !== undefined) {
                    return item.nextStats[category][key];
                }
                if (!category && item.nextStats[key] !== undefined) {
                    return item.nextStats[key];
                }
            }

            // Priority 2: Legacy nested stats object (if it exists)
            if (item.stats) {
                if (category && item.stats[category] && item.stats[category][key] !== undefined) {
                    return item.stats[category][key];
                }
                if (!category && item.stats[key] !== undefined) {
                    return item.stats[key];
                }
            }

            // Priority 3: THE FIX - Direct Item Instance Getters
            // This properly grabs `item.attack.slash` or `item.speed` which scale with the item's current level!
            if (category && item[category] && item[category][key] !== undefined) {
                return item[category][key];
            }
            if (!category && item[key] !== undefined) {
                return item[key];
            }

            // Priority 4: Base Item Definition Stats (Level 1 Fallback)
            if (def.stats) {
                if (category && def.stats[category] && def.stats[category][key] !== undefined) {
                    return def.stats[category][key];
                }
                if (!category && def.stats[key] !== undefined) {
                    return def.stats[key];
                }
            }

            // Priority 5: Flat Base Definition Fallback
            if (category && def[category] && def[category][key] !== undefined) {
                return def[category][key];
            }
            if (def[key] !== undefined) {
                return def[key];
            }

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
            speed: getVal('speed'),
            critChance: getVal('critChance'),
            critMultiplier: getVal('critMultiplier'),
            evasion: getVal('evasion'),
            corruption: getVal('corruption'),
            hpRecovery: getVal('hpRecovery'),
            staminaRecovery: getVal('staminaRecovery'),
            insightRecovery: getVal('insightRecovery')
        };
    }

    _renderDetailedStats(item, x, y, w) {
        let currentY = y;
        const cStats = this._buildUnifiedStats(item, false);
        const pStats = this._buildUnifiedStats(item, true); // if it's a recipe, pStats will match cStats automatically

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
        const color = this._getRarityColor(def.rarity);
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
        this._drawIcon(def, x, y, iconSize);

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
        granted.forEach(abilityId => {
            const ability = AbilityDefinitions[abilityId] || { name: abilityId, description: "" };
            currentY = this._drawAbilityCard(ability, x, currentY, w);
        });

        return currentY;
    }

    _drawAbilityCard(ab, x, y, w) {
        const cardPadding = 24;
        const iconSize = 64;
        const gap = 24;

        let rawType = ab.damageType || (ab.type ? ab.type.toLowerCase() : 'physical');
        if (!ab.damageType && ab.effects && ab.effects.length > 0) {
            const dmgEffect = ab.effects.find(e => e.type === 'damage');
            if (dmgEffect && dmgEffect.damageType) rawType = dmgEffect.damageType.toLowerCase();
        }

        const themeColor = (UITheme.colors.types && UITheme.colors.types[rawType]) || UITheme.colors.textMuted;
        const displayType = rawType.charAt(0).toUpperCase() + rawType.slice(1);
        const descW = w - (cardPadding * 2);
        const descLines = ab.description ? this.ui.getWrappedLines(ab.description, descW, UITheme.fonts.cardItalic) : [];
        const hasStats = ab.effects || ab.accuracy || ab.speed;
        const infoBlockHeight = hasStats ? 160 : 136;
        const dividerHeight = descLines.length > 0 ? 40 : 0;
        const descTextHeight = descLines.length > 0 ? (descLines.length * 24) : 0;
        const cardHeight = cardPadding + infoBlockHeight + dividerHeight + descTextHeight + cardPadding;

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

        const infoY = y + cardPadding;
        const iconX = x + cardPadding;
        const iconY = infoY + 16;

        this.ui.ctx.fillStyle = UITheme.colors.bgScale?.[2] || 'rgba(255, 255, 255, 0.05)';
        this.ui.ctx.fillRect(iconX, iconY, iconSize, iconSize);
        this._drawIcon(ab, iconX, iconY, iconSize);
        this.ui.ctx.strokeStyle = themeColor;
        this.ui.ctx.lineWidth = 1;
        this.ui.ctx.strokeRect(iconX, iconY, iconSize, iconSize);

        const contentX = iconX + iconSize + gap;
        let currentTextY = iconY + 12;
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
            if (ab.cost.hp) { costStr = `${ab.cost.hp} HP`; costCol = UITheme.colors.hp; }
            else if (ab.cost.mana) { costStr = `${ab.cost.mana} MP`; costCol = UITheme.colors.ins; }
            else if (ab.cost.stamina) { costStr = `${ab.cost.stamina} STM`; costCol = UITheme.colors.stm; }
            else if (ab.cost.insight) { costStr = `${ab.cost.insight} INS`; costCol = UITheme.colors.ins; }
            this.ui.ctx.fillStyle = costCol;
            this.ui.ctx.fillText(costStr, x + w - cardPadding, currentTextY);
        } else {
            this.ui.ctx.fillStyle = themeColor;
            this.ui.ctx.fillText("Free", x + w - cardPadding, currentTextY);
        }

        currentTextY += 32;
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
        this.ui.ctx.font = UITheme.fonts.cardItalic;
        const targetLabel = "Target: ";
        this.ui.ctx.fillStyle = UITheme.colors.textMuted;
        this.ui.ctx.fillText(targetLabel, contentX, currentTextY);
        const labelColumnW = this.ui.ctx.measureText(targetLabel).width;
        const targetText = ab.targeting ? (ab.targeting.type || "Self") : "Self";
        this.ui.ctx.fillText(targetText, contentX + labelColumnW, currentTextY);

        let descY = y + cardPadding + infoBlockHeight + (dividerHeight / 2) + 8;
        if (descLines.length > 0) {
            this.ui.ctx.strokeStyle = UITheme.colors.border;
            this.ui.ctx.beginPath();
            this.ui.ctx.moveTo(x + cardPadding, descY - 16);
            this.ui.ctx.lineTo(x + w - cardPadding, descY - 16);
            this.ui.ctx.stroke();

            this.ui.ctx.font = UITheme.fonts.cardItalic;
            this.ui.ctx.fillStyle = UITheme.colors.textMuted;
            descLines.forEach(line => {
                this.ui.ctx.fillText(line, x + cardPadding, descY);
                descY += 24;
            });
        }

        return y + cardHeight + 24;
    }

    _formatValue(val, forceSign = false) {
        if (typeof val !== 'number') return val;
        let isDecimal = val % 1 !== 0;
        let displayVal = isDecimal ? +(val * 100).toFixed(1) : val;
        let str = '';
        if (forceSign && displayVal > 0) str += '+';
        str += displayVal;
        if (isDecimal) str += '%';
        return str;
    }

    _getStatColor(rawKey) {
        if (!rawKey) return UITheme.colors.textMain;
        const k = rawKey.toLowerCase();
        if (UITheme.colors[k]) return UITheme.colors[k];
        if (UITheme.colors.types && UITheme.colors.types[k]) return UITheme.colors.types[k];
        if (k.includes('hp') || k.includes('health')) return UITheme.colors.hp || "#8c1c1c";
        if (k.includes('stm') || k.includes('stamina')) return UITheme.colors.stm || "#4a5d4e";
        if (k.includes('ins') || k.includes('insight')) return UITheme.colors.ins || "#4a5b70";
        if (k.includes('atk') || k.includes('attack') || k.includes('damage')) return UITheme.colors.attack || "#9e1a1a";
        if (k.includes('def') || k.includes('block')) return UITheme.colors.defense || "#4a5b70";
        if (k.includes('res')) return UITheme.colors.resistance || "#8a8578";
        return UITheme.colors.textMain;
    }

    _getRarityColor(rarity) {
        switch ((rarity || "").toLowerCase()) {
            case 'common':    return "#ffffff";
            case 'uncommon':  return "#1eff00";
            case 'rare':      return "#0070dd";
            case 'epic':      return "#a335ee";
            case 'legendary': return "#ff8000";
            default:          return UITheme.colors.textMuted;
        }
    }

    _renderInventory(state, x, w, h) {
        const centerX = Math.floor(x + (w / 2));
        const HEADER_HEIGHT = 180;

        // --- 1. Draw Fixed Header ---
        this.ui.drawText("Inventory", centerX, 48, UITheme.fonts.header, UITheme.colors.textMain, "center");

        // --- Currency Label ---
        const currencyAmount = gameState.party ? (gameState.party.currency || 0) : (state.partyCurrency || 0);
        this.ui.drawText(`Currency: ${currencyAmount}`, centerX, 108, UITheme.fonts.cardMono, UITheme.colors.textHighlight, "center");

        const dividerY = HEADER_HEIGHT - 24;
        const flourishW = w * 0.8;
        this.ui.drawLineWithGothicFlourish(x + (w - flourishW) / 2, dividerY, flourishW, UITheme.colors.borderHighlight);

        // --- 2. Calculate Viewport Metrics ---
        const listY = HEADER_HEIGHT;
        const listH = h - HEADER_HEIGHT;
        const inv = state.partyInventory || [];

        const COLS = 4;
        const SLOT_SIZE = 96;
        const SLOT_PADDING = 19;
        const SCROLLBAR_WIDTH = 10;
        const totalGridW = (COLS * SLOT_SIZE) + ((COLS - 1) * SLOT_PADDING);

        let startX = x + Math.floor((w - totalGridW) / 2);
        if (startX < x + 5) startX = x + 5;

        const rowCount = Math.ceil(inv.length / COLS);
        const currentContentHeight = rowCount * (SLOT_SIZE + SLOT_PADDING);
        const scrollOffset = state.partyScrollOffset || 0;
        const maxScroll = Math.max(0, currentContentHeight - listH);

        if (state.layout) {
            state.layout.partyBounds = { x, y: listY, w, h: listH };
            state.layout.partyMaxScroll = maxScroll;
            state.layout.cols = COLS;
            state.layout.itemHeight = SLOT_SIZE + SLOT_PADDING;
        }

        let renderScroll = scrollOffset;
        if (renderScroll > maxScroll) renderScroll = maxScroll;
        if (renderScroll < 0) renderScroll = 0;

        this.ui.ctx.save();
        this.ui.startClip(x, listY - 24, w, listH + 48);

        if (inv.length === 0) {
            this.ui.drawText("- Empty -", centerX, listY + 72, UITheme.fonts.italic, UITheme.colors.textMuted, "center");
        } else {
            inv.forEach((item, index) => {
                const def = ItemDefinitions[item.defId || item.id];
                if (!def) return;

                const col = index % COLS;
                const row = Math.floor(index / COLS);

                const itemX = startX + (col * (SLOT_SIZE + SLOT_PADDING));
                const itemY = listY + (row * (SLOT_SIZE + SLOT_PADDING)) - renderScroll;

                if (itemY > listY + listH) return;
                if (itemY + SLOT_SIZE < listY) return;

                const isHovered = state.hoveredHitboxId === `PARTY_ITEM_${index}`;
                const isSelected = state.selectedUpgradeItem && state.selectedUpgradeItem.id === item.id && state.selectedUpgradeItem.instanceId === item.instanceId;

                let bgFill = UITheme.colors.bgScale[1];
                let drawBrackets = false;

                if (isSelected) {
                    bgFill = UITheme.colors.states.focusBg;
                    drawBrackets = true;
                } else if (isHovered) {
                    bgFill = UITheme.colors.states.hoverBg;
                    drawBrackets = true;
                }

                this.hitboxes.push({ id: `PARTY_ITEM_${index}`, x: itemX, y: itemY, w: SLOT_SIZE, h: SLOT_SIZE, type: 'inventory', index: index, hoverSfx: 'hoverTick', clickSfx: 'uiClick' });

                this.ui.drawPanel(itemX, itemY, SLOT_SIZE, SLOT_SIZE, bgFill);

                const iconOffset = (SLOT_SIZE - 64) / 2;
                this._drawIcon(def, itemX + iconOffset, itemY + iconOffset, 64);

                if (item.qty > 1) {
                    this.ui.drawText(`${item.qty}`, itemX + SLOT_SIZE - 5, itemY + SLOT_SIZE - 5, UITheme.fonts.small, UITheme.colors.textHighlight, "right");
                }

                if (drawBrackets) {
                    this.ui.drawSelectionBrackets(itemX, itemY, SLOT_SIZE, SLOT_SIZE, 5, UITheme.colors.borderHighlight);
                }
            });
        }

        this.ui.endClip();
        this.ui.ctx.restore();

        if (currentContentHeight > listH) {
            const scrollX = x + w - SCROLLBAR_WIDTH - 5;
            this._drawScrollBar(scrollX, listY, listH, currentContentHeight, renderScroll, 'PARTY');
        }
    }

    _drawScrollBar(x, y, viewportH, contentH, scrollOffset, prefix) {
        const SCROLLBAR_WIDTH = 10;
        this.ui.drawRect(x, y, SCROLLBAR_WIDTH, viewportH, UITheme.colors.scrollTrack || UITheme.colors.bgScale[0]);
        const viewRatio = viewportH / contentH;
        let thumbH = Math.max(20, viewportH * viewRatio);
        const scrollRatio = scrollOffset / (contentH - viewportH);
        const thumbY = y + (scrollRatio * (viewportH - thumbH));

        this.ui.drawRect(x, thumbY, SCROLLBAR_WIDTH, thumbH, UITheme.colors.borderHighlight);

        this.hitboxes.push({ id: `SCROLLBAR_THUMB_${prefix}`, x: x - 5, y: thumbY, w: SCROLLBAR_WIDTH + 10, h: thumbH, type: 'scrollbar_thumb' });
    }

    _drawInputPrompts(state, leftW, centerW, h) {
        let lines = [];
        if (state.hoveredHitboxId === 'BTN_CRAFT') {
            lines.push("[L-Click/SPC] Craft Item      [R-Click/ESC] Close");
        } else if (state.hoveredHitboxId === 'BTN_UPGRADE') {
            lines.push("[L-Click/SPC] Upgrade Item      [R-Click/ESC] Close");
        } else {
            lines.push("[L-Click/WASD] Select Recipe/Item      [R-Click/ESC] Close");
        }

        const centerX = leftW + Math.floor(centerW / 2);
        const flourishW = Math.min(720, centerW - 64);

        this.ui.drawLineWithGothicFlourish(centerX - (flourishW / 2), h - 104, flourishW, UITheme.colors.borderHighlight);
        const startY = h - 64;

        lines.forEach((lineText, index) => {
            this.ui.drawText(
                lineText,
                centerX,
                startY + (index * 32),
                UITheme.fonts.small,
                UITheme.colors.textMuted,
                "center"
            );
        });
    }

    _drawIcon(def, x, y, size = 64) {
        if (!def) return;
        let sheetName = 'items';
        const type = (def.type || '').toLowerCase();
        const slot = (def.slot || '').toLowerCase();

        if (slot === 'mainhand' || slot === 'offhand' || type === 'weapon' || type === 'shield' || type === 'tool') {
            sheetName = 'weapons';
        } else if (type === 'armor' || ['head', 'body', 'legs', 'feet', 'hands', 'accessory'].includes(slot)) {
            sheetName = 'armor';
        } else if (type === 'consumable') {
            sheetName = 'consumables';
        } else if (type === 'material') {
            sheetName = 'materials';
        }

        const sheet = this.loader.get(sheetName) || this.loader.get('items') || this.loader.get('icons');
        if (!sheet) return;

        const iconData = def.icon || { col: 0, row: 0 };
        const ICON_SIZE = 32;
        const srcX = (iconData.col * ICON_SIZE);
        const srcY = (iconData.row * ICON_SIZE);

        this.ui.drawSprite(sheet, srcX, srcY, ICON_SIZE, ICON_SIZE, x, y, size, size);
    }
}