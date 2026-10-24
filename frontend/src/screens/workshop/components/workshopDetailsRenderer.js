import { WorkshopBaseRenderer } from './workshopBaseRenderer.js';
import { ItemDefinitions } from '../../../../../shared/items/itemDefinitions.js';
import { AbilityDefinitions } from '../../../../../shared/abilities/abilityDefinitions.js';
import { AbilityPreview } from '../../../ui/abilityPreview.js';
import { drawAbilityCard } from '../../../ui/abilityCard.js';
import { Formatting } from '../../../../../shared/core/formatting.js';
import { UITheme } from '../../../ui/UITheme.js';
import { gameState } from '../../../../../shared/core/gameState.js';
import { CorruptionSystem } from '../../../../../shared/characters/corruptionSystem.js';
import { ItemUpgradeSystem } from '../../../../../shared/items/itemUpgradeSystem.js';

// Stat table typography/spacing. Rows are laid out on their vertical middle, and the row height
// is sized to the font so text never touches the row above or below.
const STAT_LABEL_FONT = UITheme.text.label.font;
const STAT_VALUE_FONT = UITheme.fonts.monoSmall;
const STAT_ROW_H = 40;
const TABLE_ROW_H = 38;
const SECTION_GAP = 28;   // empty space between two stat sections

export class WorkshopDetailsRenderer extends WorkshopBaseRenderer {

    /**
     * Picks the combatant whose stats are used to preview ability damage.
     * Prefers whoever is wearing the selected item, then an explicit member on state,
     * then the first party member.
     */
    _resolvePreviewActor(state) {
        return state.selectedUpgradeHolder?.member || state.member || gameState.party?.members?.[0] || null;
    }

    /**
     * Strip shown under the tabs when the selected item is worn by a party member.
     * Returns the Y position below the strip (unchanged if the item isn't equipped).
     */
    _renderHolderStrip(holder, x, y, w) {
        if (!holder) return y;

        const stripH = 42;
        const badgeSize = 30;

        this.ui.drawPanel(x, y, w, stripH, 'rgba(0,0,0,0.35)');
        this.ui.drawRect(x, y, w, stripH, UITheme.colors.border, false);

        this.drawHolderBadge(x + 8, y + (stripH - badgeSize) / 2, badgeSize, holder.name, holder.index);

        const textX = x + 8 + badgeSize + 14;
        const midY = y + (stripH / 2);
        const slotLabel = this.formatSlotName(holder.slot);

        this.ui.drawStyled('cardNote', 'Equipped by', textX, midY, { baseline: 'middle' });
        this.ui.ctx.font = UITheme.fonts.cardItalic;
        const prefixW = this.ui.ctx.measureText('Equipped by ').width;
        this.ui.drawStyled('cardTitle', holder.name, textX + prefixW, midY, { color: this.getHolderColor(holder.index), baseline: 'middle' });

        if (slotLabel) {
            this.ui.drawStyled('cardNote', slotLabel, x + w - 16, midY, { align: 'right', baseline: 'middle' });
        }

        return y + stripH;
    }

    renderRecipeDetails(state, x, w, h, hitboxes) {
        if (!state.selectedRecipe) {
            this.ui.drawStyled('empty', 'Select a recipe or item to upgrade', x + (w / 2), h / 2);
            return;
        }

        const recipe = state.selectedRecipe;
        const outDef = ItemDefinitions[recipe.outputItemId];
        if (!outDef) return;

        this._previewActor = this._resolvePreviewActor(state);
        this._previewStats = (state && state.derivedStats) || null;

        let cursorY = this.padding;
        const contentX = x + this.padding;
        const contentW = w - (this.padding * 2);
        const activeTab = state.activeTab || 'description';

        // --- Tabs ---
        const tabH = 67;
        const tabW = contentW / 3;

        const drawTab = (label, tx, isActive, id) =>
            this.drawTab(state, hitboxes, label, tx, cursorY, tabW, tabH, isActive, id);

        drawTab("DESCRIPTION", contentX, activeTab === 'description', 'TAB_DESCRIPTION');
        drawTab("STATS", contentX + tabW, activeTab === 'stats', 'TAB_STATS');
        drawTab("SKILLS", contentX + (tabW * 2), activeTab === 'skills', 'TAB_SKILLS');
        cursorY += tabH + 36;

        // --- Tab Contents (scrolls inside the space above the pinned footer) ---
        const recipeMaterials = recipe.materials || {};
        const recipeCost = recipe.currencyCost || 0;
        const viewTop = cursorY;
        // The footer heading is drawn on its baseline, so it rises ~25px above the footer's top edge
        const viewBottom = this._footerTop(recipeMaterials, recipeCost, h) - 32;

        this._withScrollRegion(state, x, w, viewTop, viewBottom, () => {
            let yy = viewTop;
            if (activeTab === 'description') {
                yy = this._renderItemHeader(outDef, contentX, yy, contentW, null);
                yy += 20;
                yy = this._renderItemMainInfo(outDef, contentX, yy, contentW);
            } else if (activeTab === 'stats') {
                const mockItem = { definition: outDef, stats: outDef.stats };
                yy = this._renderDetailedStats(mockItem, contentX, yy, contentW);
            } else if (activeTab === 'skills') {
                yy = this._renderAbilities(outDef, contentX, yy, contentW);
            }
            return yy;
        });

        this._renderMaterialsFooter(state, contentX, viewBottom, contentW, h, recipeMaterials, recipeCost, state.canCraftSelected, 'Craft Item', 'BTN_CRAFT', hitboxes);
    }

    renderUpgradeDetails(state, x, w, h, hitboxes) {
        const item = state.selectedUpgradeItem;
        const def = item.definition || ItemDefinitions[item.defId || item.id];
        if (!def) return;

        this._previewActor = this._resolvePreviewActor(state);
        this._previewStats = (state && state.derivedStats) || null;

        let cursorY = this.padding;
        const contentX = x + this.padding;
        const contentW = w - (this.padding * 2);
        const isUpgradeable = item.isUpgradeable || def.isUpgradeable;
        // --- Tabs ---
        const activeTab = state.activeTab || 'description';
        const tabH = 67;
        const tabW = contentW / 3;

        const drawTab = (label, tx, isActive, id) =>
            this.drawTab(state, hitboxes, label, tx, cursorY, tabW, tabH, isActive, id);

        drawTab("DESCRIPTION", contentX, activeTab === 'description', 'TAB_DESCRIPTION');
        drawTab("STATS", contentX + tabW, activeTab === 'stats', 'TAB_STATS');
        drawTab("SKILLS", contentX + (tabW * 2), activeTab === 'skills', 'TAB_SKILLS');

        cursorY += tabH + 18;

        // Who is holding this item (only when it's equipped on a party member)
        if (state.selectedUpgradeHolder) {
            cursorY = this._renderHolderStrip(state.selectedUpgradeHolder, contentX, cursorY, contentW) + 18;
        } else {
            cursorY += 18;
        }

        // --- Tab Contents (scrolls inside the space above the pinned footer) ---
        const showFooter = isUpgradeable && !item.isMaxLevel;
        const costs = showFooter ? (item.nextUpgradeCost || {}) : null;
        const viewTop = cursorY;
        const viewBottom = (showFooter
            ? this._footerTop(costs.materials || {}, costs.currency || 0, h) - 32
            : h - 110 - 12);

        this._withScrollRegion(state, x, w, viewTop, viewBottom, () => {
            let yy = viewTop;

            if (activeTab === 'description') {
                const currentLevel = item.level !== undefined ? item.level : null;
                const nextLevel = (isUpgradeable && !item.isMaxLevel && currentLevel !== null) ? currentLevel + 1 : null;

                yy = this._renderItemHeader(def, contentX, yy, contentW, currentLevel, nextLevel);
                yy += 20;
                yy = this._renderItemMainInfo(def, contentX, yy, contentW);

                if (isUpgradeable && item.isMaxLevel) {
                    this.ui.drawStyled('title', 'Max level reached', contentX + (contentW / 2), yy + 40, { color: UITheme.colors.success });
                    yy += 80;
                }
            } else if (activeTab === 'stats') {
                if (isUpgradeable && !item.isMaxLevel) {
                    this.ui.drawStyled('heading', 'Stat Increases', contentX, yy, { baseline: 'top' });
                    yy += 60;
                }
                yy = this._renderDetailedStats(item, contentX, yy, contentW);
            } else if (activeTab === 'skills') {
                if (isUpgradeable && !item.isMaxLevel) {
                    const unlocks = def.abilityUnlocks && def.abilityUnlocks[item.level + 1];
                    if (unlocks && unlocks.length > 0) {
                        this.ui.drawStyled('heading', 'New Abilities Unlocked', contentX + (contentW / 2), yy, { align: 'center', baseline: 'top' });
                        yy += 48;

                        unlocks.forEach(abilityId => {
                            const ability = AbilityDefinitions[abilityId] || { name: abilityId, description: "" };
                            // Pass def.name as the source so it says "Source: Bronze Sword" instead of "Source: Innate"
                            yy = this._drawAbilityCard(ability, contentX, yy, contentW, def.name);
                        });
                    } else {
                        this.ui.drawStyled('empty', 'No new skills at next level', contentX + (contentW / 2), yy + 32);
                        yy += 64;
                    }
                } else {
                    yy = this._renderAbilities(def, contentX, yy, contentW);
                }
            }
            return yy;
        });

        // --- Footer (pinned to the bottom so the button is always reachable) ---
        if (showFooter) {
            this._renderMaterialsFooter(
                state, contentX, viewBottom, contentW, h,
                costs.materials || {}, costs.currency || 0,
                state.canUpgradeSelected, 'Upgrade Item', 'BTN_UPGRADE', hitboxes,
                // an insight weapon needs ANOTHER copy of itself: the weapon being upgraded is not one of the copies it can spend
                matId => (matId === (item.defId ?? (item.definition && item.definition.id))) ? ItemUpgradeSystem.countAvailable(matId, item) : null
            );
        }
    }

    /**
     * Draws tab content inside a clipped viewport that can scroll vertically.
     * drawFn draws at absolute coordinates starting at viewTop and returns the Y it ended at.
     * The controller owns the offset (state.detailsScrollOffset) and learns the viewport/limits
     * through state.layout.detailsBounds / detailsMaxScroll.
     */
    _withScrollRegion(state, panelX, panelW, viewTop, viewBottom, drawFn) {
        const viewH = Math.max(0, viewBottom - viewTop);
        const layout = state.layout || null;
        const scroll = Math.min(Math.max(0, state.detailsScrollOffset || 0), (layout && layout.detailsMaxScroll) || 0);

        this.ui.startClip(panelX, viewTop, panelW, viewH);
        this.ui.ctx.save();
        this.ui.ctx.translate(0, -scroll);
        const endY = drawFn();
        this.ui.ctx.restore();
        this.ui.endClip();

        const contentH = endY - viewTop;
        const maxScroll = Math.max(0, contentH - viewH);

        if (layout) {
            layout.detailsBounds = { x: panelX, y: viewTop, w: panelW, h: viewH };
            layout.detailsMaxScroll = maxScroll;
        }

        if (maxScroll > 0) {
            const trackX = panelX + panelW - 8 - UITheme.scrollbar.width;
            this.ui.drawScrollbar(trackX, viewTop, UITheme.scrollbar.width, viewH, scroll, maxScroll, viewH);
        }
    }

    _footerHeight(materials, currencyCost) {
        const btnH = 64;
        let footerH = 40;
        footerH += Object.keys(materials).length * 76;
        if (currencyCost > 0) footerH += 44;
        footerH += btnH + 24;
        return footerH;
    }

    /** Top edge of the pinned footer (materials list + button). */
    _footerTop(materials, currencyCost, h) {
        return h - 90 - this._footerHeight(materials, currencyCost);
    }

    _renderMaterialsFooter(state, x, currentY, w, h, materials, currencyCost, isEnabled, btnText, btnHitboxId, hitboxes, ownedOf = null) {
        const materialEntries = Object.entries(materials);
        const btnH = 64;

        // Always pinned to the bottom of the column (currentY is no longer used to push it down)
        let materialsY = this._footerTop(materials, currencyCost, h);
        this.ui.drawStyled('heading', 'Required Materials', x, materialsY);
        materialsY += 16;
        this.ui.drawLine(x, materialsY, x + w, materialsY, UITheme.colors.border, 1);
        materialsY += 24;

        for (const [matId, amountNeeded] of materialEntries) {
            const matDef = ItemDefinitions[matId];
            if (!matDef) continue;
            const inventoryItem = (state.partyInventory || []).find(i => i.id === matId);
            const owned = ownedOf ? ownedOf(matId) : null; /* null = use the bag count */
            const playerHas = (owned !== null && owned !== undefined) ? owned : (inventoryItem ? inventoryItem.qty : 0);
            const hasEnough = playerHas >= amountNeeded;
            const matSlotSize = 64;
            this.ui.drawPanel(x, materialsY, matSlotSize, matSlotSize, UITheme.colors.bgScale[1]);
            this.ui.drawRect(x, materialsY, matSlotSize, matSlotSize, UITheme.colors.border, false);
            this.drawIcon(matDef, x, materialsY, matSlotSize);
            const color = hasEnough ? UITheme.colors.success : UITheme.colors.failure;
            this.ui.drawStyled('body', `${matDef.name}`, x + matSlotSize + 16, materialsY + (matSlotSize / 2), { color, baseline: 'middle' });
            this.ui.drawStyled('value', `${playerHas} / ${amountNeeded}`, x + w, materialsY + (matSlotSize / 2), { color, align: 'right', baseline: 'middle' });
            materialsY += matSlotSize + 12;
        }

        if (currencyCost > 0) {
            const partyCurrency = gameState.party ? (gameState.party.currency || 0) : (state.partyCurrency || 0);
            const hasEnoughCurrency = partyCurrency >= currencyCost;
            const color = hasEnoughCurrency ? UITheme.colors.textHighlight : UITheme.colors.failure;
            this.ui.drawStyled('body', `Cost: ${currencyCost} Currency`, x, materialsY + 22, { color, baseline: 'middle' });
            this.ui.drawStyled('label', `(Owned: ${partyCurrency})`, x + w, materialsY + 22, { align: 'right', baseline: 'middle' });
            materialsY += 44;
        }

        const btnY = materialsY + 12;
        // The action button: highlighted under the mouse / keyboard cursor, faded when it cannot be used yet
        this.ui.drawButton(x, btnY, w, btnH, btnText,
            this.ui.flags(btnHitboxId, state.hoveredHitboxId, { disabled: !isEnabled }),
            { bg: UITheme.colors.panelBg, font: UITheme.fonts.bold });

        if (isEnabled) {
            hitboxes.push({ id: btnHitboxId, x: x, y: btnY, w: w, h: btnH, type: 'action' });
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

    /** Section title + flourish. Returns the Y where the section's first row starts. */
    _drawSectionHeader(label, x, y, w) {
        this.ui.drawStyled('cardHeading', label, x, y, { baseline: 'top' });
        const lineY = y + 46;
        this.ui.drawLineWithGothicFlourish(x, lineY, w, UITheme.colors.borderHighlight);
        return lineY + 18;
    }

    /** Measures text in the stat value font. */
    _measure(text, font = STAT_VALUE_FONT) {
        this.ctx.save();
        this.ctx.font = font;
        const width = this.ctx.measureText(text).width;
        this.ctx.restore();
        return width;
    }

    /**
     * Draws "current > projected" (or just "current" when unchanged), vertically centred on cy.
     * With align "left" x is the left edge, with "center" x is the middle of the whole group.
     * Returns the total width drawn.
     */
    _drawDiffRowValues(cNum, pNum, cStr, pStr, x, cy, align = "left", plainColor = UITheme.colors.textMain) {
        const cW = this._measure(cStr);

        if (cStr === pStr) {
            const startX = align === "center" ? x - (cW / 2) : x;
            this.ui.drawText(cStr, startX, cy, STAT_VALUE_FONT, plainColor, "left", "middle");
            return cW;
        }

        const arrowSize = 6;
        const space = 10;
        const pW = this._measure(pStr);
        const total = cW + space + (arrowSize * 2) + space + pW;
        const startX = align === "center" ? x - (total / 2) : x;
        const changeColor = (pNum > cNum) ? UITheme.colors.success : UITheme.colors.failure;

        this.ui.drawText(cStr, startX, cy, STAT_VALUE_FONT, UITheme.colors.textMain, "left", "middle");
        const arrowX = startX + cW + space + arrowSize;
        this.ui.drawArrow(arrowX, cy, arrowSize, 'right', changeColor);
        this.ui.drawText(pStr, arrowX + arrowSize + space, cy, STAT_VALUE_FONT, changeColor, "left", "middle");
        return total;
    }

    _renderDetailedStats(item, x, y, w) {
        let currentY = y;
        const cStats = this._buildUnifiedStats(item, false);
        const pStats = this._buildUnifiedStats(item, true);

        // --- 1. Resources (only when the item actually touches them) ---
        const resourceRows = [
            { label: "Max HP", c: cStats.resources.maxHp, p: pStats.resources.maxHp },
            { label: "Max STM", c: cStats.resources.maxStamina, p: pStats.resources.maxStamina },
            { label: "Max INS", c: cStats.resources.maxInsight, p: pStats.resources.maxInsight }
        ].filter(r => r.c || r.p);

        if (resourceRows.length > 0) {
            currentY = this._drawSectionHeader("Resources", x, currentY, w);
            resourceRows.forEach(r => {
                currentY = this._drawStatDiffRow(r.label, r.c, r.p, x, currentY, w, STAT_ROW_H);
            });
            currentY += SECTION_GAP;
        }

        // --- 2. Combat Stats ---
        const combatStats = [
            { label: "SPD", c: cStats.speed, p: pStats.speed },
            { label: "CRT %", c: cStats.critChance, p: pStats.critChance, isPct: true },
            { label: "HP REC", c: cStats.hpRecovery, p: pStats.hpRecovery },
            { label: "CRT DMG", c: cStats.critMultiplier, p: pStats.critMultiplier, isPct: true },
            { label: "STM REC", c: cStats.staminaRecovery, p: pStats.staminaRecovery },
            { label: "EVA %", c: cStats.evasion, p: pStats.evasion, isPct: true },
            { label: "INS REC", c: cStats.insightRecovery, p: pStats.insightRecovery },
            { label: "COR %", c: cStats.corruption, p: pStats.corruption, isPct: true }
        ].filter(stat => (stat.c !== 0 || stat.p !== 0) && (stat.label !== "COR %" || CorruptionSystem.isRevealed()));   // corruption is a secret until act 2

        if (combatStats.length > 0) {
            currentY = this._drawSectionHeader("Combat Stats", x, currentY, w);

            // Label column is as wide as the longest label so values never collide with it
            const labelColW = Math.max(...combatStats.map(s => this._measure(s.label, STAT_LABEL_FONT))) + 20;
            const colGap = 24;
            const cColW = (w - colGap) / 2;

            combatStats.forEach((stat, i) => {
                const col = i % 2;
                const row = Math.floor(i / 2);
                const itemX = x + (col * (cColW + colGap));
                const cy = currentY + (row * STAT_ROW_H) + (STAT_ROW_H / 2);

                const cStr = stat.isPct ? `${(stat.c * 100).toFixed(0)}%` : stat.c.toString();
                const pStr = stat.isPct ? `${(stat.p * 100).toFixed(0)}%` : stat.p.toString();

                this.ui.drawText(stat.label, itemX, cy, STAT_LABEL_FONT, UITheme.colors.textMuted, "left", "middle");
                this._drawDiffRowValues(stat.c, stat.p, cStr, pStr, itemX + labelColW, cy);
            });

            currentY += (Math.ceil(combatStats.length / 2) * STAT_ROW_H) + SECTION_GAP;
        }

        // --- 3. Attack & Defenses Table ---
        const tableEndY = this._drawProjectedResistanceTable(cStats, pStats, x, currentY, w);

        // Nothing at all to show (no resources, combat stats or damage types)
        if (resourceRows.length === 0 && combatStats.length === 0 && tableEndY === currentY) {
            this.ui.drawStyled('empty', 'No stat bonuses', x + (w / 2), currentY + 32);
            return currentY + 64;
        }
        return tableEndY;
    }

    /** One labelled row: label on the left, "current > projected" in a fixed value column. */
    _drawStatDiffRow(label, curr = 0, prev = 0, x, y, w, rowH = STAT_ROW_H) {
        const cy = y + (rowH / 2);
        this.ui.drawText(label, x, cy, STAT_LABEL_FONT, UITheme.colors.textMuted, "left", "middle");
        this._drawDiffRowValues(curr, prev, curr.toString(), prev.toString(), x + 150, cy);
        return y + rowH;
    }

    _drawProjectedResistanceTable(cStats, pStats, x, y, w) {
        const types = ["blunt", "slash", "pierce", "fire", "ice", "lightning", "water", "earth", "wind", "light", "dark", "arcane"];
        const visibleTypes = types.filter(type => {
            const vals = [
                cStats.attack[type], pStats.attack[type],
                cStats.defense[type], pStats.defense[type],
                cStats.resistance[type], pStats.resistance[type]
            ];
            return vals.some(v => v);
        });

        if (visibleTypes.length === 0) return y;

        let currentY = this._drawSectionHeader("Damage & Resistances", x, y, w);

        const colType = x;
        const colAtk = x + (w * 0.36);
        const colDef = x + (w * 0.62);
        const colRes = x + (w * 0.88);

        // Column headers sit on the middle of their own row, with a thin rule underneath
        const headerCy = currentY + (STAT_ROW_H / 2);
        this.ui.drawStyled('tableHeader', 'Type', colType, headerCy, { baseline: 'middle' });
        this.ui.drawStyled('tableHeader', 'Atk', colAtk, headerCy, { color: UITheme.colors.attack, align: 'center', baseline: 'middle' });
        this.ui.drawStyled('tableHeader', 'Def', colDef, headerCy, { color: UITheme.colors.defense, align: 'center', baseline: 'middle' });
        this.ui.drawStyled('tableHeader', 'Res', colRes, headerCy, { color: UITheme.colors.resistance, align: 'center', baseline: 'middle' });
        currentY += STAT_ROW_H;
        this.ui.drawLine(x, currentY, x + w, currentY, UITheme.colors.border, 1);
        currentY += 8;

        visibleTypes.forEach((type) => {
            const cy = currentY + (TABLE_ROW_H / 2);
            const label = Formatting.getAbbreviation ? Formatting.getAbbreviation(type) : type.substring(0, 3).toUpperCase();
            this.ui.drawText(label.toUpperCase(), colType, cy, STAT_VALUE_FONT, UITheme.colors.textMuted, "left", "middle");

            const drawCell = (curr, prev, xPos, defaultColor, isPct = false) => {
                if (prev === 0 && curr === 0) {
                    this.ui.drawText("-", xPos, cy, STAT_VALUE_FONT, UITheme.colors.textMuted, "center", "middle");
                    return;
                }
                const cStr = isPct ? `${(curr * 100).toFixed(0)}%` : `${curr}`;
                const pStr = isPct ? `${(prev * 100).toFixed(0)}%` : `${prev}`;
                this._drawDiffRowValues(curr, prev, cStr, pStr, xPos, cy, "center", defaultColor);
            };

            drawCell(cStats.attack[type] || 0, pStats.attack[type] || 0, colAtk, UITheme.colors.attack);
            drawCell(cStats.defense[type] || 0, pStats.defense[type] || 0, colDef, UITheme.colors.defense);
            drawCell(cStats.resistance[type] || 0, pStats.resistance[type] || 0, colRes, UITheme.colors.resistance, true);

            currentY += TABLE_ROW_H;
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

        this.ui.drawStyled('cardTitle', title, x + 24, currentY + 40, { color });
        if (itemLevel !== undefined) {
            let lvlStr = `Lv. ${itemLevel}`;
            if (nextLevel !== null) {
                lvlStr += ` -> ${nextLevel}`;
            }
            this.ui.drawStyled('cardHeading', lvlStr, x + w - 24, currentY + 40, { align: 'right' });
        }

        this.ui.drawStyled('cardNote', typeText, x + 24, currentY + 74);
        if (def.weight !== undefined || def.value !== undefined) {
            const rightMeta = [];
            if (def.weight !== undefined) rightMeta.push(`Wt: ${def.weight}`);
            if (def.value !== undefined) rightMeta.push(`Val: ${def.value}`);
            this.ui.drawStyled('cardLabel', rightMeta.join("   "), x + w - 24, currentY + 74, { align: 'right' });
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
                // Top-aligned so the first line starts level with the icon; 40px lines fit the 34px font
                this.ui.drawStyled('body', line, textX, textY + 2, { baseline: 'top' });
                textY += 40;
            });
            hasContent = true;
        }
        if (def.description) {
            if (hasContent) textY += 12;
            const lines = this.ui.getWrappedLines(`"${def.description}"`, textW, UITheme.fonts.cardItalic);
            lines.forEach(line => {
                this.ui.drawStyled('cardNote', line, textX, textY + 2, { baseline: 'top' });
                textY += 32;
            });
        }
        return Math.max(y + iconSize, textY);
    }

    _renderAbilities(def, x, y, w) {
        const granted = def.grantedAbilities || [];
        if (granted.length === 0) {
            this.ui.drawStyled('empty', 'No skills granted', x + (w/2), y + 32);
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
        // one card for every list of skills (ui/abilityCard.js), centred in the column so it lines up with the centred section title
        return drawAbilityCard(this.ui, this.loader, ab, {
            x, y, w, center: true, member: this._previewActor, derivedStats: this._previewStats,
            source: sourceName
        });
    }

    _formatTargetingText(targeting) {
        return AbilityPreview.getTargetText(targeting);
    }
    _drawAbilityIcon(ability, x, y, size) {
        // Try to access the loader (either directly on the class or via this.ui)
        const loader = this.loader || (this.ui && this.ui.loader);
        if (loader && typeof this.ui.drawSprite === 'function') {
            const sheet = loader.get('abilities') || loader.get('items');
            if (sheet) {
                const iconData = ability.icon || { col: 0, row: 0 };
                const src = this.ICON_SRC_SIZE; // 64px source cells
                this.ui.drawSprite(
                    sheet, 
                    iconData.col * src, 
                    iconData.row * src, 
                    src, src, 
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