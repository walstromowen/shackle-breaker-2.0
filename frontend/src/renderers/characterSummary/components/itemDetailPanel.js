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
        this._drawHeader(item, def, centerX, currentY);
        
        // Increased space between Slot Type and Description
        // Icon (64) + Name Offset (20) + Text Lines (~25) + Extra Gap (20)
        currentY += this.ICON_SIZE + 65; 

        // 2. Description / Flavor
        currentY = this._drawDescription(def, x + 15, currentY, w - 30);

        // 3. Divider & Spacing (Greatly Reduced)
        currentY += 4; // Tiny gap after text
        this.ui.drawRect(x + 10, currentY, w - 20, 1, "#333");
        currentY += 6; // Tiny gap after divider before next header

        // 4. Main Stats (Attack / Defense)
        currentY = this._drawMainStats(def, x + 20, currentY, w - 40);

        // 5. Attribute Bonuses
        currentY = this._drawAttributeBonuses(def, x + 20, currentY, w - 40);

        // 6. Abilities (Card Design)
        currentY = this._drawAbilities(def, x + 15, currentY, w - 30);
    }

    _drawHeader(item, def, centerX, y) {
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

        // Name
        const nameY = y + this.ICON_SIZE + 20;
        const rarityColor = this._getRarityColor(def.rarity);
        this.ui.drawText(def.name, centerX, nameY, UITheme.fonts.header, rarityColor, "center");

        // Type
        const typeText = `${(def.type || "Item").toUpperCase()} ${def.slot ? " - " + def.slot.toUpperCase() : ""}`;
        this.ui.drawText(typeText, centerX, nameY + 16, "bold 10px monospace", "#666", "center");
    }

    _drawDescription(def, x, y, w) {
        const padding = 10;
        const contentW = w - (padding * 2);
        const contentX = x + padding;
        const centerX = x + (w / 2);

        let currentY = y;
        let hasContent = false;

        // Effect Text
        if (def.effectDescription) {
            const lines = this.ui.getWrappedLines(def.effectDescription, contentW, UITheme.fonts.body);
            lines.forEach(line => {
                this.ui.drawText(line, contentX, currentY, UITheme.fonts.body, "#ddd", "left");
                currentY += 14;
            });
            hasContent = true;
        }

        // Flavor Text
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
        const stats = def.stats || {};
        
        const primaryStats = [
            { key: 'damage', label: 'DMG', color: UITheme.colors.danger },
            { key: 'defense', label: 'DEF', color: UITheme.colors.magic },
            { key: 'block', label: 'BLK', color: '#aaa' }
        ];

        let hasPrinted = false;

        primaryStats.forEach(stat => {
            const val = stats[stat.key];
            if (val) {
                this.ui.drawText(stat.label, x, currentY, UITheme.fonts.bold, stat.color, "left");
                let valStr = val;
                if (typeof val === 'object' && val.min) valStr = `${val.min}-${val.max}`;
                this.ui.drawText(valStr.toString(), x + w, currentY, UITheme.fonts.mono, "#fff", "right");
                currentY += 16;
                hasPrinted = true;
            }
        });

        // Elemental Stats
        ['attack', 'defense', 'resistance'].forEach(category => {
            if (!stats[category]) return;
            const subStats = stats[category];
            Object.keys(subStats).forEach(k => {
                if (subStats[k] === 0) return;
                const label = `${Formatting.getAbbreviation(k)} ${category === 'resistance' ? 'RES' : (category === 'defense' ? 'DEF' : 'DMG')}`;
                const color = category === 'attack' ? "#f88" : (category === 'defense' ? "#aaf" : "#fea");
                this.ui.drawText(label, x, currentY, UITheme.fonts.small, color, "left");
                this.ui.drawText(subStats[k].toString(), x + w, currentY, UITheme.fonts.mono, "#fff", "right");
                currentY += 14;
                hasPrinted = true;
            });
        });

        return hasPrinted ? currentY + 8 : currentY; // Reduced bottom margin
    }

    _drawAttributeBonuses(def, x, y, w) {
        let currentY = y;
        const bonuses = (def.stats && def.stats.attributes) ? def.stats.attributes : {};
        const keys = Object.keys(bonuses);

        if (keys.length === 0) return currentY;

        this.ui.drawText("Bonuses", x, currentY, "bold 10px sans-serif", "#888", "left");
        currentY += 14; // Slightly reduced

        keys.forEach(key => {
            const val = bonuses[key];
            if (val === 0) return;
            const label = Formatting.getAbbreviation(key);
            const valStr = Formatting.formatSigned(val);
            const color = val > 0 ? UITheme.colors.success : UITheme.colors.danger;
            this.ui.drawText(label, x + 10, currentY, UITheme.fonts.mono, "#ccc", "left");
            this.ui.drawText(valStr, x + w, currentY, UITheme.fonts.mono, color, "right");
            currentY += 14;
        });

        return currentY + 8; // Reduced bottom margin
    }

    _drawAbilities(def, x, y, w) {
        let currentY = y;
        const abilityList = def.grantedAbilities || (def.useAbility ? [def.useAbility] : []);
        
        if (abilityList.length > 0) {
            // Tight header spacing
            const label = def.useAbility ? "On Use" : "Granted Abilities";
            this.ui.drawText(label, x, currentY, UITheme.fonts.bold, UITheme.colors.accent, "left");
            currentY += 16;

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
                
                const headerHeight = 14; 
                const statsHeight = 14; 
                const dividerHeight = 6;
                const descTextHeight = descLines.length > 0 ? (descLines.length * 13) : 0;
                const contentHeight = headerHeight + 4 + statsHeight + dividerHeight + descTextHeight;
                
                const cardHeight = Math.max(contentHeight, iconSize) + (cardPadding * 2);

                // BG
                this.ui.drawRect(x, currentY, w, cardHeight, "rgba(0, 0, 0, 0.4)"); 
                this.ui.drawRect(x, currentY, w, cardHeight, "#444", false);

                // Icon
                const iconY = currentY + cardPadding;
                this.ui.drawRect(iconX, iconY, iconSize, iconSize, "rgba(0,0,0,0.5)");
                this._drawAbilityIcon(ab, iconX, iconY);
                this.ui.drawRect(iconX, iconY, iconSize, iconSize, "#555", false);

                // Content
                let cursorY = currentY + cardPadding + 10; 

                // Name/Cost
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

                // Stats
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

                // Description
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