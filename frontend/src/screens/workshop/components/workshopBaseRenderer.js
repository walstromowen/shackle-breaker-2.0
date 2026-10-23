import { UITheme } from '../../../ui/UITheme.js';

export class WorkshopBaseRenderer {
    constructor(ui, loader) {
        this.ui = ui;
        this.ctx = ui.ctx;
        this.loader = loader;
        this.padding = 36;

        // Source cell size (px) of every icon sheet read by the workshop renderers.
        // Subclasses (recipe, details, inventory) inherit this.
        this.ICON_SRC_SIZE = 64;
    }

    formatValue(val, forceSign = false) {
        if (typeof val !== 'number') return val;
        let isDecimal = val % 1 !== 0;
        let displayVal = isDecimal ? +(val * 100).toFixed(1) : val;
        let str = '';
        if (forceSign && displayVal > 0) str += '+';
        str += displayVal;
        if (isDecimal) str += '%';
        return str;
    }

    getStatColor(rawKey) {
        if (!rawKey) return UITheme.colors.textMain;
        const k = rawKey.toLowerCase();
        if (UITheme.colors[k]) return UITheme.colors[k];
        if (UITheme.colors.types && UITheme.colors.types[k]) return UITheme.colors.types[k];
        if (k.includes('hp') || k.includes('health')) return UITheme.colors.hp || "#8c1c1c";
        if (k.includes('stm') || k.includes('stamina')) return UITheme.colors.stm || "#4a5d4e";
        if (k.includes('ins') || k.includes('insight')) return UITheme.colors.ins || "#4a5b70";
        if (k.includes('atk') || k.includes('attack') || k.includes('damage')) return UITheme.colors.attack || "#9e1a1a";
        if (k.includes('def') || k.includes('block')) return UITheme.colors.defense || "#3b4e60";
        return UITheme.colors.textMain;
    }

    drawIcon(def, x, y, size = 64) {
        if (!def) return;

        // Picks the right sprite sheet for the item's category (weapons, armor, consumables,
        // materials ...) - see CanvasUI.drawItemIcon
        this.ui.drawItemIcon(this.loader, def, x, y, size, this.ICON_SRC_SIZE);
    }

    /**
     * A tab in the shared state look: the open tab is "selected" (bar), the one under the mouse / keyboard cursor is
     * "highlighted". Registers the tab's hitbox.
     */
    drawTab(state, hitboxes, label, x, y, w, h, isActive, id) {
        this.ui.drawTab(x, y, w, h, label, this.ui.flags(id, state.hoveredHitboxId, { selected: isActive }));

        hitboxes.push({ id, x, y, w, h, type: 'tab' });
    }

    /** The list scrollbar (shared look). Registers the thumb as a drag hitbox. */
    drawListScrollbar(x, y, viewportH, contentH, scrollOffset, prefix, hitboxes, focusId = null) {
        const width = UITheme.scrollbar.width;
        const id = `SCROLLBAR_THUMB_${prefix}`;
        const thumb = this.ui.drawScrollbar(x, y, width, viewportH, scrollOffset, contentH - viewportH, viewportH,
            this.ui.flags(id, focusId));
        if (!thumb) return;
        hitboxes.push({ id, x: x - 5, y: thumb.y, w: width + 10, h: thumb.h, type: 'scrollbar_thumb' });
    }

    // --- Equipped-gear holder helpers (shared by the inventory grid and the details panel) ---

    /** One stable colour per party slot so members with the same initial can still be told apart. */
    getHolderColor(memberIndex) {
        const palette = ['#c9a227', '#4f8fc0', '#b5525c', '#5fa86b', '#9a6bc2', '#d1823b'];
        return palette[(memberIndex || 0) % palette.length];
    }

    /** "mainHand" / "main_hand" -> "Main Hand" */
    formatSlotName(slot) {
        if (!slot) return '';
        return String(slot)
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    /**
     * Small square badge with the holder's initial, tinted by party slot.
     * Drawn on top of an item slot so you can see at a glance who is wearing it.
     */
    drawHolderBadge(x, y, size, name, memberIndex) {
        const color = this.getHolderColor(memberIndex);
        const initial = (name || '?').trim().charAt(0).toUpperCase();

        this.ui.drawRect(x, y, size, size, 'rgba(0, 0, 0, 0.85)');
        this.ui.drawRect(x, y, size, size, color, false);
        this.ui.drawText(initial, x + Math.floor(size / 2), y + Math.floor(size / 2) + 1, UITheme.fonts.cardTitle, color, 'center', 'middle');
    }

    getRarityColor(rarity) {
        if (!rarity) return UITheme.colors.textMain;

        const rarityColors = {
            common: UITheme.colors.textMain || '#ffffff',
            uncommon: UITheme.colors.success || '#4caf50',
            rare: UITheme.colors.insight || '#2196f3',
            epic: UITheme.colors.corruption || '#9c27b0',
            legendary: UITheme.colors.textHighlight || '#ffeb3b',
        };

        return rarityColors[rarity.toLowerCase()] || UITheme.colors.textMain;
    }
}
