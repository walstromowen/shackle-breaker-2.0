// Item reward chips: the same small "icon + amount" plate the overworld pickup toast uses, drawn as a static row.
// Battle victory messages and encounter reward messages use it to show the pictures of the items the party received.
import { UITheme } from './UITheme.js';
import { ItemDefinitions } from '../../../shared/items/itemDefinitions.js';

const ICON_SRC_SIZE = 64;   // one cell of an item sheet
const ICON_SIZE = 64;       // drawn 1:1, like the toast
const PAD_X = 12;
const PAD_Y = 8;
const ICON_GAP = 14;
const TAIL = 16;
const CHIP_H = ICON_SIZE + PAD_Y * 2;
const GAP = 16;             // between chips in a row
const ROW_GAP = 12;         // between rows when a long list wraps

function chipWidth(ctx, qty) {
    ctx.font = UITheme.fonts.cardTitle || '16px sans-serif';
    return PAD_X + ICON_SIZE + ICON_GAP + ctx.measureText(`+${qty}`).width + TAIL;
}

/** Normalises [{id, qty}] to chips that have a definition (unknown ids are skipped). */
function resolve(items) {
    return (items || [])
        .map(it => ({ id: it.id, qty: it.qty || 1, def: ItemDefinitions[it.id] }))
        .filter(it => it.def);
}

/** How tall a row of chips for these items would be when wrapped to maxWidth (0 when there is nothing to draw). */
export function itemChipsHeight(ctx, items, maxWidth) {
    const chips = resolve(items);
    if (chips.length === 0) return 0;
    const rows = layoutRows(ctx, chips, maxWidth);
    return rows.length * CHIP_H + (rows.length - 1) * ROW_GAP;
}

function layoutRows(ctx, chips, maxWidth) {
    const rows = [];
    let row = [], rowW = 0;
    chips.forEach(chip => {
        chip.w = chipWidth(ctx, chip.qty);
        const next = row.length ? rowW + GAP + chip.w : chip.w;
        if (row.length && next > maxWidth) {
            rows.push({ chips: row, w: rowW });
            row = [chip]; rowW = chip.w;
        } else {
            row.push(chip); rowW = next;
        }
    });
    if (row.length) rows.push({ chips: row, w: rowW });
    return rows;
}

/**
 * Draws the chips centred on centerX, with the top of the first row at y.
 * @param {CanvasUI} ui
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} loader   the asset loader (item sheets)
 * @param {Array<{id:string, qty:number}>} items
 * @param {number} centerX
 * @param {number} y
 * @param {{maxWidth?:number, alpha?:number}} [opts]
 * @returns {number} the height used
 */
export function drawItemChips(ui, ctx, loader, items, centerX, y, opts = {}) {
    const chips = resolve(items);
    if (chips.length === 0) return 0;
    const maxWidth = opts.maxWidth || 1200;
    const rows = layoutRows(ctx, chips, maxWidth);

    ctx.save();
    ctx.globalAlpha *= opts.alpha === undefined ? 1 : opts.alpha;

    rows.forEach((row, r) => {
        let x = centerX - row.w / 2;
        const rowY = y + r * (CHIP_H + ROW_GAP);
        row.chips.forEach(chip => {
            ui.drawPanel(x, rowY, chip.w, CHIP_H, 'rgba(25, 23, 20, 0.8)');

            const found = ui.resolveItemSheet(loader, ui.getItemCategory(chip.def));
            if (found) {
                const src = found.cell || ICON_SRC_SIZE;
                const icon = chip.def.icon || {};
                ctx.drawImage(found.sheet,
                    (icon.col || 0) * src, (icon.row || 0) * src, src, src,
                    x + PAD_X, rowY + PAD_Y, ICON_SIZE, ICON_SIZE);
            }

            ui.drawText(`+${chip.qty}`, x + PAD_X + ICON_SIZE + ICON_GAP, rowY + CHIP_H / 2,
                UITheme.fonts.cardTitle, UITheme.colors.success || '#4CAF50', 'left', 'middle');
            x += chip.w + GAP;
        });
    });

    ctx.restore();
    return rows.length * CHIP_H + (rows.length - 1) * ROW_GAP;
}
