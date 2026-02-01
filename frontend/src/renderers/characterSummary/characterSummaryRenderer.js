import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { StatCalculator } from '../../../../shared/systems/statCalculator.js'; 

// Sub-Components
import { ItemDetailPanel } from './components/itemDetailPanel.js';
import { StatsPanel } from './components/statsPanel.js';
import { EquipmentPanel } from './components/equipmentPanel.js';
import { InventoryPanel } from './components/inventoryPanel.js';
import { TooltipSystem } from './components/tooltipSystem.js';

export class CharacterSummaryRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader;
        this.ui = new CanvasUI(ctx);
        
        // --- Component Initialization ---
        // Pass the UI instance to share the context/theme wrappers
        this.itemPanel = new ItemDetailPanel(this.ui, loader);
        this.statsPanel = new StatsPanel(this.ui);
        this.equipPanel = new EquipmentPanel(this.ui, loader);
        this.invPanel   = new InventoryPanel(this.ui, loader);
        this.tooltipSystem = new TooltipSystem(this.ui);

        this.hitboxes = [];
        this.padding = 15;
    }

    render(state) {
        // 1. Reset Frame State
        this.hitboxes = [];
        const { member, derivedStats } = state;

        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;
        this.ui.clearScreen(w, h);

        // 2. Layout Calculations (3-Column Grid)
        // 
        const leftW = Math.floor(w * 0.28);
        const centerW = Math.floor(w * 0.44);
        const rightW = w - leftW - centerW;

        // 3. Draw Global Backgrounds & Borders
        this.ui.drawRect(0, 0, leftW, h, UITheme.colors.bgScale[0]);
        this.ui.drawRect(leftW, 0, centerW, h, UITheme.colors.bgScale[1]);
        this.ui.drawRect(leftW + centerW, 0, rightW, h, UITheme.colors.bgScale[0]);
        
        this.ui.drawLine(leftW, 0, leftW, h, UITheme.colors.border);
        this.ui.drawLine(leftW + centerW, 0, leftW + centerW, h, UITheme.colors.border);

        if (!member) return;

        // Ensure stats are calculated once per frame (or used from state)
        const stats = derivedStats || StatCalculator.calculate(member);

        // --- 4. Render Components ---

        // A. Left Column (Tabbed: Stats / Item Detail)
        this.renderLeftColumn(state, leftW, h, member, stats);

        // B. Center Column (Equipment & Vitals)
        this.equipPanel.render(
            member, 
            stats, 
            state.slots, 
            state.selectedSlotIndex, 
            state.isChoosingItem, 
            leftW, 0, centerW, h, 
            this.hitboxes
        );

        // C. Right Column (Inventory Grid)
        this.invPanel.render(
            state.filteredInventory, 
            state.inventoryIndex, 
            state.isChoosingItem, 
            leftW + centerW + this.padding, 
            0, 
            rightW - (this.padding * 2), 
            this.hitboxes
        );

        // D. Tooltips (Overlay - Rendered Last)
        this.tooltipSystem.render(state, this.hitboxes);
    }

    renderLeftColumn(state, w, h, member, stats) {
        const { viewMode, focusedItem } = state;
        const x = this.padding;
        const y = this.padding;
        const contentW = w - (this.padding * 2);

        // --- Tabs Drawing Logic ---
        const tabH = 28;
        const tabW = contentW / 2;
        
        const drawTab = (label, tx, isActive, id) => {
            // Tab Background
            const bg = isActive ? UITheme.colors.bgScale[2] : UITheme.colors.bgScale[0];
            const border = isActive ? UITheme.colors.borderHighlight : UITheme.colors.border;
            const text = isActive ? UITheme.colors.textMain : UITheme.colors.textMuted;
            
            this.ui.drawRect(tx, y, tabW, tabH, bg);
            this.ui.drawRect(tx, y, tabW, tabH, border, false); // Stroke
            
            this.ui.drawText(
                label, 
                tx + tabW/2, 
                y + (tabH/2) + 4, 
                UITheme.fonts.small, 
                text, 
                "center", 
                "middle"
            );

            // Register Hitbox
            this.hitboxes.push({ id, x: tx, y, w: tabW, h: tabH, type: 'tab' });
        };

        drawTab("STATS", x, viewMode === 'STATS', 'TAB_STATS');
        drawTab("ITEM", x + tabW, viewMode === 'ITEM', 'TAB_ITEM');

        // --- Panel Content ---
        const contentY = y + tabH + 20;
        const contentH = h - contentY - 20;

        if (viewMode === 'STATS') {
            this.statsPanel.render(member, stats, x, contentY, contentW);
        } else {
            // Pass the specific item to focus on (either hovered or selected)
            this.itemPanel.render(focusedItem, x, contentY, contentW, contentH, state);
        }
    }

    /**
     * Determines which interactive element is under the mouse.
     * Uses LIFO (Last-In-First-Out) to prioritize elements drawn on top (like Tooltips).
     */
    getHitZone(x, y) {
        for (let i = this.hitboxes.length - 1; i >= 0; i--) {
            const box = this.hitboxes[i];
            if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
                return box.id;
            }
        }
        return null;
    }
}

/*
import { UITheme } from '../../ui/UITheme.js';
import { CanvasUI } from '../../ui/canvasUI.js';
import { CONFIG } from '../../../../shared/data/constants.js'; 
import { StatCalculator } from '../../../../shared/systems/statCalculator.js'; 
import { AbilityDefinitions } from '../../../../shared/data/abilityDefinitions.js';
import { TRAIT_DEFINITIONS } from '../../../../shared/data/traitDefinitions.js'; 

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

        // --- Interaction State ---
        this.hitboxes = [];
    }

    // --- NEW: The method SceneManager is looking for ---
    getHitZone(x, y) {
        // Iterate backwards (LIFO) so we catch elements drawn on top first
        for (let i = this.hitboxes.length - 1; i >= 0; i--) {
            const box = this.hitboxes[i];
            if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
                return box.id;
            }
        }
        return null;
    }

    render(state) {
        // 1. Reset hitboxes every frame
        this.hitboxes = [];
        
        const { member, slots, selectedSlotIndex, isChoosingItem, filteredInventory, inventoryIndex, viewMode, focusedItem, derivedStats } = state;
        
        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;
        
        this.ui.clearScreen(w, h);
        
        // Calculate stats if not pre-calculated in state
        const stats = derivedStats || StatCalculator.calculate(member);

        // Layout Columns
        const leftW = Math.floor(w * 0.28); 
        const centerW = Math.floor(w * 0.44);
        const rightW = w - leftW - centerW;
        
        const col1X = 0;
        const col2X = leftW;
        const col3X = leftW + centerW;

        // Backgrounds & Borders
        this.ui.drawRect(col1X, 0, leftW, h, "#111"); 
        this.ui.drawRect(col3X, 0, rightW, h, "#111");
        this.ui.drawLine(col2X, 0, col2X, h, UITheme.colors.border);
        this.ui.drawLine(col3X, 0, col3X, h, UITheme.colors.border);

        if (member) {
            this.drawLeftColumn(member, stats, viewMode, focusedItem, col1X + this.padding, this.padding, leftW - (this.padding*2), h, state);
            
            this.drawCenterColumn(member, stats, slots, selectedSlotIndex, isChoosingItem, col2X, this.padding, centerW, h);
            
            this.drawRightColumn(filteredInventory, inventoryIndex, isChoosingItem, col3X + this.padding, this.padding, rightW - (this.padding*2));
            
            // Optional: Draw a footer or back button if needed
            // this.drawFooter(w, h);
        }

        // 2. Draw Tooltips LAST so they overlay everything
        this.drawTooltips(state);
    }

    // ===========================================
    // HELPERS
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
    // INTERACTION & TOOLTIPS
    // ===========================================

    drawTooltips(state) {
        const mx = state.mouse ? state.mouse.x : -1000;
        const my = state.mouse ? state.mouse.y : -1000;

        const hitId = this.getHitZone(mx, my);
        const hitBox = this.hitboxes.find(b => b.id === hitId);

        if (!hitBox) return;

        if (hitBox.type === 'trait') {
            const def = TRAIT_DEFINITIONS[hitBox.id] || { name: hitBox.id, description: "Unknown trait." };
            
            // --- 1. Recursive Helper to Flatten Nested Stats ---
            // This turns { resistances: { fire: 5 } } into [{ key: "Fire Resistances", val: 5 }]
            const effects = [];
            
            const flattenStats = (obj, parentKey = '') => {
                if (!obj) return;
                
                Object.entries(obj).forEach(([key, val]) => {
                    // Skip internal IDs or metadata (optional filter)
                    if (key === 'id' || key === 'icon') return;

                    if (typeof val === 'object' && val !== null) {
                        // RECURSION: If it's an object, dive deeper
                        // We append the parent key to keep context (e.g. "Attack" + "Blunt")
                        flattenStats(val, parentKey ? `${parentKey} ${key}` : key);
                    } else if (typeof val === 'number' && val !== 0) {
                        // BASE CASE: If it's a non-zero number, add it
                        const finalLabel = parentKey ? `${parentKey} ${key}` : key;
                        effects.push({ key: finalLabel, val });
                    }
                });
            };

            // Scan common property locations
            flattenStats(def.attributes); // STR, DEX, etc
            flattenStats(def.stats);      // maxHP, speed, etc
            flattenStats(def.bonuses);    // If you store flat bonuses here
            
            // --- 2. Helper to Format Text (camelCase -> Title Case) ---
            // e.g., "maxHP" -> "Max HP", "bluntAttack" -> "Blunt Attack"
            const formatLabel = (str) => {
                // specific overrides for abbreviations
                const map = { 'hp': 'HP', 'mp': 'MP', 'stm': 'STM', 'str': 'STR', 'dex': 'DEX', 'int': 'INT' };
                
                return str
                    .replace(/([A-Z])/g, ' $1') // Add space before capitals
                    .replace(/[_\-]/g, ' ')     // Replace underscores/dashes with space
                    .split(' ')
                    .map(word => map[word.toLowerCase()] || (word.charAt(0).toUpperCase() + word.slice(1)))
                    .join(' ')
                    .trim();
            };

            // --- 3. Calculate Dimensions ---
            const tipW = 230; // Slightly wider for full stat names
            const padding = 10;
            const descFont = "11px sans-serif";
            const statFont = UITheme.fonts.mono || "10px monospace";

            const descLines = this.ui.getWrappedLines(def.description, tipW - (padding*2), descFont);
            
            // Base height calculation
            let tipH = padding + 16 + 8 + (descLines.length * 14) + padding;
            if (effects.length > 0) {
                tipH += 8; // Spacer
                tipH += (effects.length * 14); // Stat rows
            }

            // --- 4. Position Tooltip (Clamp to Screen) ---
            let tipX = mx + 15;
            let tipY = my + 15;
            if (tipX + tipW > this.ctx.canvas.width) tipX = mx - tipW - 10;
            if (tipY + tipH > this.ctx.canvas.height) tipY = my - tipH - 10;

            // --- 5. Render Background & Title ---
            this.ui.drawRect(tipX, tipY, tipW, tipH, "rgba(20, 20, 25, 0.95)"); 
            this.ui.drawRect(tipX, tipY, tipW, tipH, UITheme.colors.accent, false); 

            this.ui.drawText(def.name, tipX + padding, tipY + padding + 10, "bold 12px sans-serif", UITheme.colors.accent, "left");
            this.ui.drawLine(tipX + padding, tipY + padding + 18, tipX + tipW - padding, tipY + padding + 18, "#555");

            // --- 6. Render Description ---
            let textY = tipY + padding + 32;
            descLines.forEach(line => {
                this.ui.drawText(line, tipX + padding, textY, descFont, "#ddd", "left");
                textY += 14;
            });

            // --- 7. Render Flattened Effects ---
            if (effects.length > 0) {
                this.ui.drawLine(tipX + padding, textY + 4, tipX + tipW - padding, textY + 4, "#444");
                textY += 16;

                effects.forEach(eff => {
                    const label = formatLabel(eff.key);
                    const isPositive = eff.val > 0;
                    const sign = isPositive ? "+" : "";
                    const valStr = `${sign}${eff.val}`;
                    
                    // Logic: Positive HP is Green, Negative Speed is Red, etc.
                    const valColor = isPositive ? UITheme.colors.success : UITheme.colors.danger;

                    // Draw Label (Left)
                    this.ui.drawText(label, tipX + padding, textY, statFont, "#aaa", "left");
                    
                    // Draw Value (Right)
                    this.ui.drawText(valStr, tipX + tipW - padding, textY, statFont, valColor, "right");

                    textY += 14;
                });
            }
        }
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
        this.ui.drawRect(x, y, tabW, tabH, statsActive ? "#666" : "#222", false);
        this.ui.drawText("STATS", x + tabW/2, y + 12, UITheme.fonts.small, statsActive ? "#fff" : "#555", "center", "middle");
        
        // [HITBOX] Stats Tab
        this.hitboxes.push({ id: 'TAB_STATS', x, y, w: tabW, h: tabH, type: 'tab' });

        // Item Tab
        const itemActive = viewMode === 'ITEM';
        this.ui.drawRect(x + tabW, y, tabW, tabH, itemActive ? "#333" : "#111");
        this.ui.drawRect(x + tabW, y, tabW, tabH, itemActive ? "#666" : "#222", false);
        this.ui.drawText("ITEM", x + tabW + tabW/2, y + 12, UITheme.fonts.small, itemActive ? "#fff" : "#555", "center", "middle");

        // [HITBOX] Item Tab
        this.hitboxes.push({ id: 'TAB_ITEM', x: x + tabW, y, w: tabW, h: tabH, type: 'tab' });

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

        // --- 1. Attributes ---
        this.ui.drawText("Attributes", x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 15;

        const attrs = member.attributes || {};
        const attrKeys = Object.keys(attrs);

        if (attrKeys.length > 0) {
            const colWidth = w / 2;
            
            attrKeys.forEach((key, i) => {
                const baseVal = attrs[key];      
                const finalVal = stats[key];     
                
                const displayVal = (finalVal !== undefined) ? finalVal : baseVal;
                const isBuffed = displayVal > baseVal;
                const valColor = isBuffed ? UITheme.colors.accent : "#fff"; 

                const label = this.getAbbreviation(key);
                const colX = (i % 2 === 0) ? x : x + colWidth;
                
                this.ui.drawText(label, colX, currentY, UITheme.fonts.small, "#aaa", "left");
                this.ui.drawText(displayVal.toString(), colX + 30, currentY, UITheme.fonts.mono, valColor, "left");
                
                if (i % 2 !== 0) currentY += 14;
            });
            if (attrKeys.length % 2 !== 0) currentY += 14;
        } else {
            this.ui.drawText("None", x, currentY, "italic 11px sans-serif", "#555", "left");
            currentY += 14;
        }
        currentY += 15;

        // --- 2. Stats (Renamed from Combat Properties) ---
        this.ui.drawText("Stats", x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
        currentY += 15;

        const drawRow = (label, val, color) => {
            this.ui.drawText(label, x, currentY, UITheme.fonts.mono, "#bbb", "left");
            this.ui.drawText(val, x + 70, currentY, UITheme.fonts.mono, color, "left");
            currentY += 14;
        };

        // Speed -> SPD
        const speed = stats.speed || member.attributes?.speed || 0;
        drawRow("SPD", `${speed}`, UITheme.colors.accent);

        // Crit Chance -> CRT %
        const critChance = (stats.critChance || 0) * 100;
        drawRow("CRT %", `${critChance.toFixed(0)}%`, UITheme.colors.insight);

        // Crit Damage -> CRT Dmg
        const critMult = (stats.critMultiplier !== undefined) ? stats.critMultiplier : 1.5;
        drawRow("CRT Dmg", `x${critMult}`, "#aa7");

        // Corruption -> COR
        const corruption = member.corruption || stats.corruption || 0;
        drawRow("COR", `${corruption}`, "#b0f");
        
        currentY += 10;

        // --- 3. Combined Table (Atk/Def/Res) ---
        // (Kept identical to your previous version, just ensuring flow continues)
        const colType = x;
        const colAtk = x + 70;
        const colDef = x + 105;
        const colRes = x + 140;

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
            const defense = stats.defense[type] || 0;
            const res = stats.resistance[type] || 0;
            
            // Skip rows that are completely empty to save space (optional)
            if (atk === 0 && defense === 0 && res === 0) return;

            const label = this.getAbbreviation(type);
            
            this.ui.drawText(label, colType, currentY, UITheme.fonts.mono, "#bbb", "left");
            this.ui.drawText(`${atk}`, colAtk, currentY, UITheme.fonts.mono, atk > 0 ? "#f88" : "#444", "center");
            this.ui.drawText(`${defense}`, colDef, currentY, UITheme.fonts.mono, defense > 0 ? "#aaf" : "#444", "center");
            this.ui.drawText(`${res}%`, colRes, currentY, UITheme.fonts.mono, res > 0 ? "#fea" : "#444", "center");
            currentY += 14; 
        });
    }

    drawItemDetailPanel(item, x, startY, w, viewportH, state) {
        if (!item) {
            this.ui.drawText("No Item Selected", x + w/2, startY + 50, "italic 13px sans-serif", "#555", "center");
            return;
        }

        // Logic: Reset Scroll if item changed
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
        this.ui.startClip(x, startY, w + 10, viewportH);

        let currentY = startY - state.scrollOffset;
        const contentStartY = currentY;

        const def = item.definition || item;
        const name = def.name || "Unknown Item";
        const type = (def.slot || def.type || "Item").toUpperCase();
        
        // --- 1. Header (FIXED LAYOUT) ---
        this.ui.drawRect(x, currentY, w, 2, UITheme.colors.border);
        currentY += 15;

        // Draw Icon
        this.drawItemIcon(item, x, currentY);
        
        // Calculate offset for text so it sits to the right of the icon
        const iconSize = this.RENDER_SIZE; // 32
        const textOffsetX = x + iconSize + 12; // Icon width + padding
        const textWidth = w - (iconSize + 12);

        // Draw Name
        const nameFont = UITheme.fonts.bold;
        const nameLines = this.ui.getWrappedLines(name, textWidth, nameFont);
        
        let textCursorY = currentY;
        nameLines.forEach((line) => {
            this.ui.drawText(line, textOffsetX, textCursorY + 10, nameFont, "#fff", "left");
            textCursorY += 18;
        });
        
        // Draw Slot Type (Below name, aligned with name)
        this.ui.drawText(type, textOffsetX, textCursorY + 5, UITheme.fonts.mono, UITheme.colors.accent, "left");

        // Move currentY down past the icon or the text, whichever is taller
        const headerHeight = Math.max(iconSize + 10, (nameLines.length * 18) + 20);
        currentY += headerHeight;

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
                const descFont = "italic 10px sans-serif";
                const shortDesc = ab.description || "No description.";
                const descLines = this.ui.getWrappedLines(shortDesc, w - (pad*2), descFont);
                
                const descAreaHeight = (descLines.length * 12);
                const iconSectionHeight = this.RENDER_SIZE; 
                const bufferHeight = 12; 
                const statsSectionHeight = (14 * 2) + 6;
                const dividerHeight = 8; 
                const totalHeight = pad + iconSectionHeight + bufferHeight + statsSectionHeight + dividerHeight + descAreaHeight + pad;

                // Ability Box Background
                this.ui.drawRect(x, currentY, w, totalHeight, "rgba(0, 0, 0, 0.3)");
                
                this.drawAbilityIcon(ab, x + pad, currentY + pad);

                // Header Info
                const textStartX = x + pad + this.RENDER_SIZE + 8;
                const headerTextY = currentY + pad + 14; 
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
        
        const getVal = (v) => {
            if (v && typeof v === 'object') return v.total || v.value || v.base || 0;
            return Number(v) || 0;
        };

        const totalMaxHp = getVal(stats.maxHp) || getVal(member.maxHp); 
        const totalMaxStm = getVal(stats.maxStamina) || getVal(member.maxStamina);
        const totalMaxIns = getVal(stats.maxInsight) || getVal(member.maxInsight);

        const hpText = `HP ${member.hp}/${totalMaxHp}`;
        const stmText = `STM ${member.stamina}/${totalMaxStm}`;
        const insText = `INS ${member.insight || 0}/${totalMaxIns}`; 
        const xpText = `XP ${member.xp}/${member.xpToNext || 100}`; 

        // Center the vitals row manually
        this.ctx.font = UITheme.fonts.mono; 
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

            // [HITBOX] Add Hitbox for Slot
            // ID Format: "SLOT_head", "SLOT_torso"
            this.hitboxes.push({
                id: `SLOT_${slotName}`,
                x: slotX, y: slotY, w: slotW, h: SLOT_HEIGHT,
                type: 'slot'
            });

            this.ui.drawRect(slotX, slotY, slotW, SLOT_HEIGHT, boxColor); // Fill
            
            // --- Lighting/Stroke Fix ---
            this.ctx.lineWidth = isSelected ? 2 : 1; 
            this.ui.drawRect(slotX, slotY, slotW, SLOT_HEIGHT, borderColor, false); // Stroke
            this.ctx.lineWidth = 1; // RESET LINE WIDTH

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
            const def = TRAIT_DEFINITIONS[traitId] || { name: traitId, description: "Unknown trait." };
            const label = def.name; 
            
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

            // [HITBOX] Trait
            this.hitboxes.push({
                type: 'trait',
                id: traitId,
                x: currentX,
                y: currentY,
                w: badgeWidth,
                h: badgeHeight
            });

            currentX += badgeWidth + gap;
        });
    }

    // ===========================================
    // RIGHT COLUMN (Inventory)
    // ===========================================

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
            
            // [HITBOX] Inventory Item
            // ID Format: "INV_ITEM_0", "INV_ITEM_1"
            this.hitboxes.push({
                id: `INV_ITEM_${index}`,
                x: x - 5, 
                y: currentY - 18, 
                w: w + 10, 
                h: rowHeight,
                type: 'inventory'
            });

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
                 this.ui.drawText(`x${item.count}`, x + w - 5, currentY, "12px sans-serif", "#888", "right");
            }

            currentY += rowHeight + 2;
        });
    }
}
    */