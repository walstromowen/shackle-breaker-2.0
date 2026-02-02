import { UITheme } from '../../../ui/UITheme.js';
import { Formatting } from '../../../../../shared/utils/formatting.js';
import { AbilityDefinitions } from '../../../../../shared/data/abilityDefinitions.js';

export class ItemDetailPanel {
    constructor(ui, loader) {
        this.ui = ui;
        this.loader = loader;
        
        this.ICON_SIZE = 64; 
        this.ABILITY_ICON_SIZE = 32;
        this.SCROLLBAR_WIDTH = 4;

        // State for scroll calculations
        this.lastItemId = null;
        this.totalContentHeight = 0;
    }

    /**
     * @param {Object} item 
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     * @param {Object} state 
     * @param {Array} hitboxes - (NEW) Array to register interactive zones
     */
    render(item, x, y, w, h, state, hitboxes) {
        if (!item) {
            this.ui.drawText("No item selected", x + w / 2, y + 50, UITheme.fonts.body, "#555", "center");
            return;
        }

        const def = item.definition || item;
        const itemId = def.id || "unknown";

        // --- 1. Scroll Management Logic ---
        
        // Reset scroll if item changes
        if (itemId !== this.lastItemId) {
            state.scrollOffset = 0;
            this.lastItemId = itemId;
            this.totalContentHeight = 0;
        }

        // --- Bridge to Controller ---
        // Calculate the maximum allowed scroll based on the content height.
        const maxScroll = Math.max(0, this.totalContentHeight - h);
        
        // Export these metrics to the Controller via the shared 'layout' object
        if (state.layout) {
            state.layout.detailBounds = { x: x, y: y, w: w + 20, h: h };
            state.layout.detailMaxScroll = maxScroll;
            state.layout.detailViewportH = h; // <--- CRITICAL: Used for drag ratio physics
        }

        // Strictly clamp the offset immediately for THIS render frame.
        if (state.scrollOffset > maxScroll) state.scrollOffset = maxScroll;
        if (state.scrollOffset < 0) state.scrollOffset = 0;

        // --- 2. Render with Clipping ---

        this.ui.ctx.save();
        // Start Clipping: ensure content doesn't draw outside the panel 'h'
        this.ui.startClip(x, y, w + 10, h);

        // Apply Scroll Offset to Y
        let currentY = y - state.scrollOffset;
        const initialDrawY = currentY;
        const centerX = Math.floor(x + w / 2);

        // --- Detailed Rendering Logic ---

        // A. Header (Icon + Name + Type)
        currentY = this._drawHeader(item, def, centerX, currentY, w);
        currentY += 15;

        // B. Description / Flavor
        currentY = this._drawDescription(def, x + 15, currentY, w - 30);
        currentY += 15;

        // C. Main Stats (Attack / Defense)
        currentY = this._drawMainStats(def, x + 20, currentY, w - 40);

        // D. Attribute Bonuses
        currentY = this._drawAttributeBonuses(def, x + 20, currentY, w - 40);

        // E. Abilities (Card Design)
        currentY = this._drawAbilities(def, x + 15, currentY, w - 30);

        // --- End Rendering Logic ---

        // Calculate total height for next frame
        this.totalContentHeight = currentY - initialDrawY;

        this.ui.endClip();
        this.ui.ctx.restore();

        // --- 3. Draw Scrollbar ---
        // Only draw if content is taller than the viewport
        if (this.totalContentHeight > h) {
            this.drawScrollBar(x + w + 6, y, h, this.totalContentHeight, state.scrollOffset, hitboxes);
        }
    }

    // --- Helper: Scrollbar ---
    drawScrollBar(x, y, viewportH, contentH, scrollOffset, hitboxes) {
        // Draw Track
        this.ui.drawRect(x, y, this.SCROLLBAR_WIDTH, viewportH, "#222"); 
        
        const viewRatio = viewportH / contentH;
        let thumbH = Math.max(20, viewportH * viewRatio);
        
        const maxScroll = contentH - viewportH;
        // Avoid division by zero
        const scrollRatio = maxScroll > 0 ? (scrollOffset / maxScroll) : 0;
        
        const trackSpace = viewportH - thumbH;
        const thumbY = y + (scrollRatio * trackSpace);

        // Draw Thumb
        this.ui.drawRect(x, thumbY, this.SCROLLBAR_WIDTH, thumbH, "#666");

        // --- HITBOX REGISTRATION (NEW) ---
        if (hitboxes) {
            hitboxes.push({
                id: 'SCROLLBAR_THUMB', // The ID the controller looks for to start dragging
                type: 'ui',
                x: x - 4, // Make the hit zone wider than the visual line for easier clicking
                y: y,     // Cover the whole track height so clicking jump-scrolls works (if supported) or just dragging
                w: this.SCROLLBAR_WIDTH + 8, 
                h: viewportH 
            });
        }
    }

    // --- Existing Detailed Draw Methods (Unchanged) ---

    _drawHeader(item, def, centerX, y, w) {
        const iconX = centerX - (this.ICON_SIZE / 2);
        this.ui.drawRect(iconX, y, this.ICON_SIZE, this.ICON_SIZE, "rgba(0,0,0,0.5)");
        this.ui.drawRect(iconX, y, this.ICON_SIZE, this.ICON_SIZE, UITheme.colors.border, false);

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

        let currentY = y + this.ICON_SIZE + 20;
        const maxTextWidth = w - 40; 
        
        const nameLines = this.ui.getWrappedLines(def.name, maxTextWidth, UITheme.fonts.header);
        const rarityColor = this._getRarityColor(def.rarity);
        
        const lineHeight = 20;
        nameLines.forEach(line => {
            this.ui.drawText(line, centerX, currentY, UITheme.fonts.header, rarityColor, "center");
            currentY += lineHeight;
        });

        currentY += 4; 
        const typeText = `${(def.type || "Item").toUpperCase()} ${def.slot ? " - " + def.slot.toUpperCase() : ""}`;
        this.ui.drawText(typeText, centerX, currentY, "bold 10px monospace", "#666", "center");

        return currentY + 10;
    }

    _drawDescription(def, x, y, w) {
        const padding = 10;
        const contentW = w - (padding * 2);
        const contentX = x + padding;
        const centerX = x + (w / 2);

        let currentY = y;
        let hasContent = false;

        if (def.effectDescription) {
            const lines = this.ui.getWrappedLines(def.effectDescription, contentW, UITheme.fonts.body);
            lines.forEach(line => {
                this.ui.drawText(line, contentX, currentY, UITheme.fonts.body, "#ddd", "left");
                currentY += 14;
            });
            hasContent = true;
        }

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
        const source = def.stats || def; 

        const primaryStats = [
            { key: 'damage', label: 'DMG', color: UITheme.colors.danger },
            { key: 'defense', label: 'DEF', color: UITheme.colors.magic },
            { key: 'block', label: 'BLK', color: '#aaa' }
        ];

        let hasPrinted = false;

        primaryStats.forEach(stat => {
            const val = source[stat.key];
            if (val === undefined || val === null) return;
            if (typeof val === 'object' && typeof val.min === 'undefined') return;

            this.ui.drawText(stat.label, x, currentY, UITheme.fonts.bold, stat.color, "left");
            
            let valStr = val;
            if (typeof val === 'object' && val.min !== undefined) {
                valStr = `${val.min}-${val.max}`;
            }

            this.ui.drawText(valStr.toString(), x + w, currentY, UITheme.fonts.mono, "#fff", "right");
            currentY += 16;
            hasPrinted = true;
        });

        ['attack', 'defense', 'resistance'].forEach(category => {
            if (!source[category]) return;
            const subStats = source[category];
            if (typeof subStats !== 'object') return;

            Object.keys(subStats).forEach(k => {
                if (k === 'min' || k === 'max') return; 
                if (subStats[k] === 0) return;
                
                const typeAbbr = Formatting.getAbbreviation ? Formatting.getAbbreviation(k) : k.substring(0,3).toUpperCase();
                const catAbbr = category === 'resistance' ? 'RES' : (category === 'defense' ? 'DEF' : 'DMG');
                const label = `${typeAbbr} ${catAbbr}`;
                
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
        const attributes = def.attributes || (def.stats ? def.stats.attributes : {}) || {};
        const attrKeys = Object.keys(attributes);
        const resources = def.resources || {};
        const resKeys = Object.keys(resources);

        if (attrKeys.length === 0 && resKeys.length === 0) return currentY;

        this.ui.drawText("Bonuses", x, currentY, "bold 10px sans-serif", "#888", "left");
        currentY += 14; 

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

        resKeys.forEach(key => {
            const val = resources[key];
            if (val === 0) return;

            let label = key;
            if (key === 'maxHp') label = "Max HP";
            else if (key === 'maxStamina') label = "Max SP";
            else if (key === 'maxInsight') label = "Max INS";
            else label = key;

            const valStr = Formatting.formatSigned(val);
            const color = val > 0 ? UITheme.colors.insight : UITheme.colors.danger;

            this.ui.drawText(label, x + 10, currentY, UITheme.fonts.mono, "#aaf", "left");
            this.ui.drawText(valStr, x + w, currentY, UITheme.fonts.mono, color, "right");
            currentY += 14;
        });

        return currentY + 8;
    }

    _drawAbilities(def, x, y, w) {
        let currentY = y;
        const abilityList = def.grantedAbilities || (def.useAbility ? [def.useAbility] : []);
        
        if (abilityList.length > 0) {
            const label = def.useAbility ? "On Use" : "Granted Abilities";
            
            this.ui.drawText(label, x, currentY, UITheme.fonts.bold, UITheme.colors.textMuted, "left");
            currentY += 5;
            this.ui.drawRect(x, currentY, w, 1, "#333");
            currentY += 15; 

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

                this.ui.drawRect(x, currentY, w, cardHeight, "rgba(0, 0, 0, 0.4)"); 
                this.ui.drawRect(x, currentY, w, cardHeight, "#444", false);

                const iconY = currentY + cardPadding;
                this.ui.drawRect(iconX, iconY, iconSize, iconSize, "rgba(0,0,0,0.5)");
                this._drawAbilityIcon(ab, iconX, iconY);
                this.ui.drawRect(iconX, iconY, iconSize, iconSize, "#555", false);

                let cursorY = currentY + cardPadding + 10; 

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