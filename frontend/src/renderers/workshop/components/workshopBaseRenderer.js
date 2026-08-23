import { UITheme } from '../../../ui/UITheme.js';

export class WorkshopBaseRenderer {
    constructor(ui, loader) {
        this.ui = ui;
        this.ctx = ui.ctx;
        this.loader = loader;
        this.padding = 36;
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