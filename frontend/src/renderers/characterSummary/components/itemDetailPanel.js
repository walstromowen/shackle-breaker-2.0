/**
 * ui/panels/ItemDetailPanel.js
 */
import { UITheme } from '../../../ui/UITheme.js';
import { Formatting } from '../../../../../shared/utils/formatting.js';
import { AbilityDefinitions } from '../../../../../shared/data/abilityDefinitions.js';

export class ItemDetailPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        this.ICON_SIZE = 64; 
        this.ABILITY_ICON_SIZE = 32;
    }

    render(item, x, y, w, h, state) {
        if (!item) {
            this.ui.drawText("No item selected", x + w / 2, y + 50, UITheme.fonts.body, "#555", "center");
            return;
        }

        const def = item.definition || item;
        let currentY = y + 10;
        const centerX = Math.floor(x + w / 2);

        // 1. Header (Icon + Name + Type)
        // Pass 'w' to handle text wrapping; returns the new Y position
        currentY = this._drawHeader(item, def, centerX, currentY, w);
        
        // Add padding between Header and Description
        currentY += 15;

        // 2. Description / Flavor
        currentY = this._drawDescription(def, x + 15, currentY, w - 30);
        
        // Add a little padding after description
        currentY += 15;

        // 3. Main Stats (Attack / Defense)
        currentY = this._drawMainStats(def, x + 20, currentY, w - 40);

        // 4. Attribute Bonuses
        currentY = this._drawAttributeBonuses(def, x + 20, currentY, w - 40);

        // 5. Abilities (Card Design)
        currentY = this._drawAbilities(def, x + 15, currentY, w - 30);
    }

    _drawHeader(item, def, centerX, y, w) {
        // Icon Box
        const iconX = centerX - (this.ICON_SIZE / 2);
        this.ui.drawRect(iconX, y, this.ICON_SIZE, this.ICON_SIZE, "rgba(0,0,0,0.5)");
        this.ui.drawRect(iconX, y, this.ICON_SIZE, this.ICON_SIZE, UITheme.colors.border, false);

        // Sprite
        if (this.loader) {
            const sheet = this.loader.get('items');
            if (sheet) {
                const iconData = def.icon || { col: 0, row: 0 };
                this.ui.drawSprite(
                    sheet,
                    iconData.col * 32, iconData.row * 32, 32, 32, 
                    iconX, y, this.ICON_SIZE, this.ICON_SIZE
                );
            }
        }

        // --- NAME WRAPPING LOGIC ---
        let currentY = y + this.ICON_SIZE + 20;
        
        // Calculate max width for text (Panel Width - Padding)
        const maxTextWidth = w - 40; 
        
        // Get wrapped lines
        const nameLines = this.ui.getWrappedLines(def.name, maxTextWidth, UITheme.fonts.header);
        const rarityColor = this._getRarityColor(def.rarity);
        
        // Draw each line of the name
        const lineHeight = 20; // Adjust based on your header font size
        nameLines.forEach(line => {
            this.ui.drawText(line, centerX, currentY, UITheme.fonts.header, rarityColor, "center");
            currentY += lineHeight;
        });

        // --- TYPE TEXT ---
        // Add small gap between name and type
        currentY += 4; 
        
        const typeText = `${(def.type || "Item").toUpperCase()} ${def.slot ? " - " + def.slot.toUpperCase() : ""}`;
        this.ui.drawText(typeText, centerX, currentY, "bold 10px monospace", "#666", "center");

        // Return the bottom-most Y coordinate so the next section knows where to start
        return currentY + 10;
    }

    _drawDescription(def, x, y, w) {
        const padding = 10;
        const contentW = w - (padding * 2);
        const contentX = x + padding;
        const centerX = x + (w / 2);

        let currentY = y;
        let hasContent = false;

        // Effect Text (Functional description)
        if (def.effectDescription) {
            const lines = this.ui.getWrappedLines(def.effectDescription, contentW, UITheme.fonts.body);
            lines.forEach(line => {
                this.ui.drawText(line, contentX, currentY, UITheme.fonts.body, "#ddd", "left");
                currentY += 14;
            });
            hasContent = true;
        }

        // Flavor Text (Italicized)
        if (def.description) {
            if (hasContent) currentY += 8;
            const lines = this.ui.getWrappedLines(def.description, contentW, "italic 11px sans-serif");
            lines.forEach(line => {
                this.ui.drawText(line, centerX, currentY, "italic 11px sans-serif", "#888", "center"); 
                currentY += 14;
            });
        }

        return currentY;
    }

    _drawMainStats(def, x, y, w) {
        let currentY = y;
        
        // Support both 'stats' object and root-level properties
        const source = def.stats || def; 

        // Primary integer stats (if they exist at root or in stats)
        const primaryStats = [
            { key: 'damage', label: 'DMG', color: UITheme.colors.danger },
            { key: 'defense', label: 'DEF', color: UITheme.colors.magic },
            { key: 'block', label: 'BLK', color: '#aaa' }
        ];

        let hasPrinted = false;

        primaryStats.forEach(stat => {
            const val = source[stat.key];
            
            // 1. If value doesn't exist, skip
            if (val === undefined || val === null) return;

            // 2. SAFETY CHECK: If it's an object but missing 'min', treat it as a container 
            // for sub-stats (handled below) rather than a main stat value.
            if (typeof val === 'object' && typeof val.min === 'undefined') return;

            this.ui.drawText(stat.label, x, currentY, UITheme.fonts.bold, stat.color, "left");
            
            let valStr = val;
            // Handle Min-Max objects
            if (typeof val === 'object' && val.min !== undefined) {
                valStr = `${val.min}-${val.max}`;
            }

            this.ui.drawText(valStr.toString(), x + w, currentY, UITheme.fonts.mono, "#fff", "right");
            currentY += 16;
            hasPrinted = true;
        });

        // Elemental Sub-stats (attack: { fire: 5 }, defense: { fire: 5 }, etc)
        // This picks up the specific keys inside your Amulet's defense object
        ['attack', 'defense', 'resistance'].forEach(category => {
            if (!source[category]) return;
            const subStats = source[category];
            
            // If subStats is just a number (simple defense), we already handled it above.
            if (typeof subStats !== 'object') return;

            Object.keys(subStats).forEach(k => {
                // Ignore min/max keys so we don't duplicate the main line
                if (k === 'min' || k === 'max') return; 
                if (subStats[k] === 0) return;
                
                // Format Label: "Fire RES", "Blunt DEF", "Ice DMG"
                const typeAbbr = Formatting.getAbbreviation ? Formatting.getAbbreviation(k) : k.substring(0,3).toUpperCase();
                const catAbbr = category === 'resistance' ? 'RES' : (category === 'defense' ? 'DEF' : 'DMG');
                const label = `${typeAbbr} ${catAbbr}`;
                
                // Color coding
                const color = category === 'attack' ? "#f88" : (category === 'defense' ? "#aaf" : "#fea");
                
                this.ui.drawText(label, x, currentY, UITheme.fonts.small, color, "left");
                this.ui.drawText(subStats[k].toString(), x + w, currentY, UITheme.fonts.mono, "#fff", "right");
                currentY += 14;
                hasPrinted = true;
            });
        });

        return hasPrinted ? currentY + 8 : currentY; 
    }

    _drawAttributeBonuses(def, x, y, w) {
        let currentY = y;

        // 1. Fetch Attributes (Check root first, then stats.attributes)
        const attributes = def.attributes || (def.stats ? def.stats.attributes : {}) || {};
        const attrKeys = Object.keys(attributes);

        // 2. Fetch Flat Resources (Check root)
        const resources = def.resources || {};
        const resKeys = Object.keys(resources);

        // If nothing to show, exit
        if (attrKeys.length === 0 && resKeys.length === 0) return currentY;

        // Header
        this.ui.drawText("Bonuses", x, currentY, "bold 10px sans-serif", "#888", "left");
        currentY += 14; 

        // --- DRAW ATTRIBUTES ---
        attrKeys.forEach(key => {
            const val = attributes[key];
            if (val === 0) return;
            
            const label = Formatting.getAbbreviation ? Formatting.getAbbreviation(key) : key.substring(0,3).toUpperCase();
            const valStr = Formatting.formatSigned(val);
            const color = val > 0 ? UITheme.colors.success : UITheme.colors.danger;
            
            this.ui.drawText(label, x + 10, currentY, UITheme.fonts.mono, "#ccc", "left");
            this.ui.drawText(valStr, x + w, currentY, UITheme.fonts.mono, color, "right");
            currentY += 14;
        });

        // --- DRAW RESOURCES ---
        resKeys.forEach(key => {
            const val = resources[key];
            if (val === 0) return;

            // Manual readable labels for resources
            let label = key;
            if (key === 'maxHp') label = "Max HP";
            else if (key === 'maxStamina') label = "Max SP";
            else if (key === 'maxInsight') label = "Max INS";
            else label = key;

            const valStr = Formatting.formatSigned(val);
            // Use Insight color (purple/blue) for resource boosts to distinguish them
            const color = val > 0 ? UITheme.colors.insight : UITheme.colors.danger;

            this.ui.drawText(label, x + 10, currentY, UITheme.fonts.mono, "#aaf", "left");
            this.ui.drawText(valStr, x + w, currentY, UITheme.fonts.mono, color, "right");
            currentY += 14;
        });

        return currentY + 8;
    }

    _drawAbilities(def, x, y, w) {
        let currentY = y;
        // Combine abilities granted by item OR specific "use" ability
        const abilityList = def.grantedAbilities || (def.useAbility ? [def.useAbility] : []);
        
        if (abilityList.length > 0) {
            const label = def.useAbility ? "On Use" : "Granted Abilities";
            
            // --- HEADER ---
            this.ui.drawText(label, x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
            
            // --- UNDERLINE ---
            currentY += 5;
            this.ui.drawRect(x, currentY, w, 1, "#333");
            currentY += 15; // Gap before cards start

            abilityList.forEach(abilityId => {
                const ab = AbilityDefinitions[abilityId];
                if (!ab) return;

                const cardPadding = 8;
                const iconSize = this.ABILITY_ICON_SIZE;
                const gap = 10;
                
                const iconX = x + cardPadding;
                const contentX = iconX + iconSize + gap;
                const contentW = w - (cardPadding * 2) - iconSize - gap; 

                const descFont = "italic 11px sans-serif";
                const descLines = ab.description 
                    ? this.ui.getWrappedLines(ab.description, contentW, descFont) 
                    : [];
                
                // Calculate dynamic height based on text
                const headerHeight = 14; 
                const statsHeight = 14; 
                const dividerHeight = 6;
                const descTextHeight = descLines.length > 0 ? (descLines.length * 13) : 0;
                const contentHeight = headerHeight + 4 + statsHeight + dividerHeight + descTextHeight;
                
                const cardHeight = Math.max(contentHeight, iconSize) + (cardPadding * 2);

                // Card Background
                this.ui.drawRect(x, currentY, w, cardHeight, "rgba(0, 0, 0, 0.4)"); 
                this.ui.drawRect(x, currentY, w, cardHeight, "#444", false);

                // Ability Icon
                const iconY = currentY + cardPadding;
                this.ui.drawRect(iconX, iconY, iconSize, iconSize, "rgba(0,0,0,0.5)");
                this._drawAbilityIcon(ab, iconX, iconY);
                this.ui.drawRect(iconX, iconY, iconSize, iconSize, "#555", false);

                // Card Content
                let cursorY = currentY + cardPadding + 10; 

                // 1. Name and Cost
                this.ui.drawText(ab.name || abilityId, contentX, cursorY, "bold 12px sans-serif", "#fff", "left");
                
                if (ab.cost) {
                    let costStr = "";
                    let costCol = "#aaa";
                    if (ab.cost.mana) { costStr = `${ab.cost.mana} MP`; costCol = UITheme.colors.magic; }
                    else if (ab.cost.stamina) { costStr = `${ab.cost.stamina} SP`; costCol = UITheme.colors.success; }
                    else if (ab.cost.insight) { costStr = `${ab.cost.insight} INS`; costCol = UITheme.colors.insight; }
                    this.ui.drawText(costStr, x + w - cardPadding, cursorY, "bold 10px monospace", costCol, "right");
                }
                cursorY += 16;

                // 2. Stats Row (Power, Accuracy, Speed)
                let statX = contentX;
                const drawStat = (label, value, color) => {
                    const txt = `${label} ${value}`;
                    this.ui.drawText(txt, statX, cursorY, "10px monospace", color, "left");
                    statX += (txt.length * 6) + 10;
                };

                if (ab.effects) {
                    const dmg = ab.effects.find(e => e.type === 'damage' || e.type === 'heal');
                    if (dmg) drawStat("Pwr:", `${dmg.power}x`, "#fca");
                }
                if (ab.accuracy) drawStat("Acc:", `${Math.floor(ab.accuracy*100)}%`, "#bbb");
                if (ab.speed) drawStat("Spd:", ab.speed, "#bbb");

                cursorY += 6; 

                // 3. Description
                if (descLines.length > 0) {
                    this.ui.drawRect(contentX, cursorY, contentW, 1, "rgba(255,255,255,0.1)");
                    cursorY += 12;

                    descLines.forEach(line => {
                        this.ui.drawText(line, contentX, cursorY, descFont, "#999", "left");
                        cursorY += 13;
                    });
                }

                currentY += cardHeight + 8;
            });
        }
        return currentY + 5;
    }

    _drawAbilityIcon(ability, x, y) {
        if (!this.loader) return;
        const sheet = this.loader.get('abilities') || this.loader.get('items');
        if (sheet) {
            const iconData = ability.icon || { col: 0, row: 0 };
            this.ui.drawSprite(
                sheet, 
                iconData.col * 32, iconData.row * 32, 32, 32, 
                x, y, this.ABILITY_ICON_SIZE, this.ABILITY_ICON_SIZE
            );
        } else {
            this.ui.drawRect(x, y, this.ABILITY_ICON_SIZE, this.ABILITY_ICON_SIZE, "#330033"); 
        }
    }

    _getRarityColor(rarity) {
        switch ((rarity || "").toLowerCase()) {
            case 'common': return "#ffffff";
            case 'uncommon': return "#1eff00";
            case 'rare': return "#0070dd";
            case 'epic': return "#a335ee";
            case 'legendary': return "#ff8000";
            default: return "#cccccc";
        }
    }
}