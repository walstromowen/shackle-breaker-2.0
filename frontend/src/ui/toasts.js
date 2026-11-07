// ui/toasts.js: the small "icon + amount" plates that float up the right side of the screen when something is gained (an item picked up,
// encounter loot, XP, coin). They live in gameState.ui.toasts on the wall clock, so ones raised during an encounter keep floating on the
// overworld after it ends. The overworld and the encounter screen both draw them with drawToasts().
import { gameState } from '../../../shared/core/gameState.js';
import { ItemDefinitions } from '../../../shared/items/itemDefinitions.js';
import { UITheme } from './UITheme.js';

const TOAST_MS = 2500;
const ICON_SRC_SIZE = 64;   // default source cell of the item icon sheets (a sheet with its own cell size says so)

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* Which icon sheet an item's icon is on (toasts and the hotbar). */
export function iconSheetFor(itemDef) {
    let sheetName = 'items';
    if (itemDef) {
        const type = (itemDef.type || '').toLowerCase();
        const slot = (itemDef.slot || '').toLowerCase();
        if (slot === 'mainhand' || slot === 'offhand' || type === 'weapon' || type === 'shield' || type === 'tool') {
            sheetName = 'weapons';
        } else if (type === 'armor' || ['head', 'body', 'legs', 'feet', 'hands', 'accessory'].includes(slot)) {
            sheetName = 'armor';
        } else if (type === 'consumable') {
            sheetName = 'consumables';
        } else if (type === 'material') {
            sheetName = 'materials';
        }
    }
    return sheetName;
}

function push(toast) {
    if (!gameState.ui) gameState.ui = {};
    if (!gameState.ui.toasts) gameState.ui.toasts = [];
    const t = now();
    // a batch raised together (an encounter's loot) staggers in a little, so the plates rise one after another rather than as a block
    const latest = gameState.ui.toasts.reduce((m, x) => Math.max(m, x.createdAt), -Infinity);
    const createdAt = latest > t - 150 ? latest + 150 : t;
    gameState.ui.toasts.push({ createdAt, duration: TOAST_MS, ...toast });
    gameState.ui.toasts = gameState.ui.toasts.filter(x => t - x.createdAt < x.duration + 500);
}

/* An item gained: its icon and "+qty". */
export function pushItemToast(itemId, amount) {
    const itemDef = ItemDefinitions[itemId];
    push({
        itemId, amount,
        iconSheet: iconSheetFor(itemDef),
        iconCol: itemDef?.icon?.col || 0,
        iconRow: itemDef?.icon?.row || 0
    });
}

/* A gain with no item picture: "+24 XP", "+15 coins". */
export function pushTextToast(label, color = null) {
    push({ label, color });
}

/* `floor` is the y the lowest toast's bottom edge starts from, and they float up from there. `right` is the x their right edges line up on. */
export function drawToasts(ctx, ui, loader, toasts, floor = ctx.canvas.height - 24, right = ctx.canvas.width - 24) {
    const t = now();
    // Icon is drawn 1:1 with the 64px source cells; the panel grows around it
    const iconSize = 64;
    const padX = 16;
    const padY = 12;
    const iconGap = 18;
    const toastHeight = iconSize + (padY * 2);
    const baseY = floor - toastHeight;

    const live = toasts.filter(x => t >= x.createdAt && t - x.createdAt <= x.duration);
    for (let i = live.length - 1; i >= 0; i--) {
        const toast = live[i];
        const elapsed = t - toast.createdAt;
        const progress = elapsed / toast.duration;
        const activeIndex = live.length - 1 - i;
        const floatY = baseY - (progress * 40) - (activeIndex * (toastHeight + 12));

        let alpha = 1;
        if (progress < 0.1) alpha = progress / 0.1;
        else if (progress > 0.8) alpha = 1 - ((progress - 0.8) / 0.2);

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.font = UITheme.text.cardTitle.font;
        const hasIcon = !toast.label;
        const textString = toast.label || `+${toast.amount}`;
        const textWidth = ctx.measureText(textString).width;

        const toastWidth = hasIcon ? padX + iconSize + iconGap + textWidth + padX + 8 : padX + textWidth + padX + 8;
        const startX = right - toastWidth;

        ui.drawPanel(startX, floatY, toastWidth, toastHeight, "rgba(25, 23, 20, 0.8)");

        const def = toast.itemId ? ItemDefinitions[toast.itemId] : null;
        if (hasIcon && def && typeof ui.drawItemIcon === 'function') {
            // the same icon the bag and every other item picture draws (it knows each item's own sheet and cell size)
            ui.drawItemIcon(loader, def, startX + padX, floatY + padY, iconSize);
        } else if (hasIcon) {
            // toast.iconSheet names a sheet (e.g. 'consumables'); resolve it the same way every
            // other item icon is resolved so alternate sheet keys still work
            const found = ui.resolveItemSheet(loader, toast.iconSheet || 'items');
            if (found) {
                const srcSize = found.cell || ICON_SRC_SIZE;
                ctx.drawImage(found.sheet, toast.iconCol * srcSize, toast.iconRow * srcSize, srcSize, srcSize,
                    startX + padX, floatY + padY, iconSize, iconSize);
            }
        }

        ui.drawStyled('cardTitle', textString, startX + padX + (hasIcon ? iconSize + iconGap : 4), floatY + (toastHeight / 2),
            { color: toast.color || UITheme.colors.success, baseline: 'middle' });
        ctx.globalAlpha = 1.0;
    }
}
