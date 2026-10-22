import { UITheme } from './UITheme.js';
import { getStatDescription } from '../../../shared/utils/statDescriptions.js';

// The "what does this attribute do" card, shared by every screen that shows attributes (level-up, character creator,
// character summary, encounters). A screen works out which attribute is under the mouse / selected and where its row is,
// then calls drawStatTooltip LAST in its render so the card sits on top. The text comes from shared/utils/statDescriptions.js.

const WIDTH = 560;
const PADDING = 29;
const GAP = 16;
const HEADER_H = 111;     // banner + tagline, same proportions as the item cards (TooltipSystem)
const LINE_H = 30;
const SECTION_GAP = 14;
const DETAIL_GAP = 8;     // between the numbers and the list of types under them
const FLAVOR_GAP = 20;    // above the story line, which sits under a hairline at the foot of the card

/**
 * Works out the card's size and which line goes where. Pure measuring: draws nothing visible (it only sets the font to measure).
 * @returns {{ w:number, h:number, desc:object, detailLines:string[], noteLines:string[], flavorLines:string[] } | null}
 */
export function layoutStatTooltip(ui, attr, opts = {}) {
    const desc = getStatDescription(attr, opts);
    if (!desc) return null;
    const w = opts.width || WIDTH;
    const textW = w - PADDING * 2;
    const detailLines = desc.detail ? ui.getWrappedLines(desc.detail, textW, UITheme.fonts.cardItalic) : [];
    const noteLines = desc.note ? ui.getWrappedLines(desc.note, textW, UITheme.fonts.cardSmall) : [];
    const flavorLines = desc.flavor ? ui.getWrappedLines(desc.flavor, textW, UITheme.fonts.cardItalic) : [];

    let h = HEADER_H;
    h += desc.rows.length * LINE_H;
    if (detailLines.length) h += DETAIL_GAP + detailLines.length * LINE_H;
    if (noteLines.length) h += SECTION_GAP + noteLines.length * LINE_H;
    if (flavorLines.length) h += FLAVOR_GAP + flavorLines.length * LINE_H;
    h += PADDING - 11;
    return { w, h, desc, detailLines, noteLines, flavorLines };
}

/**
 * Where the card goes. placement: 'right' (default; flips to the left when there is no room), 'left', 'above', 'below'.
 * Always kept fully on the canvas.
 */
export function placeStatTooltip(anchor, size, canvasW, canvasH, placement = 'right', at = null, gap = GAP) {
    let x, y;
    if (at) {
        x = at.x;
        y = at.y;
    } else if (placement === 'above' || placement === 'below') {
        x = anchor.x + anchor.w / 2 - size.w / 2;
        y = placement === 'above' ? anchor.y - size.h - gap : anchor.y + anchor.h + gap;
        if (placement === 'above' && y < 24) y = anchor.y + anchor.h + gap;
    } else {
        const wantLeft = placement === 'left';
        x = wantLeft ? anchor.x - size.w - gap : anchor.x + anchor.w + gap;
        if (!wantLeft && x + size.w > canvasW - 24) x = anchor.x - size.w - gap;
        if (wantLeft && x < 24) x = anchor.x + anchor.w + gap;
        y = anchor.y;
    }
    x = Math.max(24, Math.min(x, canvasW - size.w - 24));
    y = Math.max(24, Math.min(y, canvasH - size.h - 24));
    return { x, y };
}

/**
 * Draws the card for one attribute next to `anchor` ({ x, y, w, h }: the row it explains).
 * @param {CanvasUI} ui
 * @param {string} attr  'vigor' | 'strength' | 'dexterity' | 'intelligence' | 'attunement' (anything else draws nothing)
 * @param {{x:number,y:number,w:number,h:number}} anchor
 * @param {object} [opts]  placement; gap (distance from the anchor); at ({x,y}: draw exactly there instead of next to the anchor); width; skillChecks; multipliers (see getStatDescription)
 * @returns {{x:number,y:number,w:number,h:number} | null} where it was drawn
 */
export function drawStatTooltip(ui, attr, anchor, opts = {}) {
    const lay = layoutStatTooltip(ui, attr, opts);
    if (!lay) return null;
    const ctx = ui.ctx;
    const { w, h, desc, detailLines, noteLines, flavorLines } = lay;
    const { x, y } = placeStatTooltip(anchor, lay, ctx.canvas.width, ctx.canvas.height, opts.placement, opts.at, opts.gap);
    const color = UITheme.colors.textHighlight;

    // Plate
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 29;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 10;
    ui.drawPanel(x, y, w, h, 'rgba(15, 15, 18, 0.98)');
    ctx.restore();

    // Banner
    const inset = 10;
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(x + inset + 2, y + inset + 2, w - inset * 2 - 4, 85);
    ctx.restore();
    ui.drawText(desc.name, x + PADDING, y + 46, UITheme.fonts.cardTitle, color, 'left');
    ui.drawText(desc.tagline, x + PADDING, y + 80, UITheme.fonts.cardItalic, UITheme.colors.textMuted, 'left');
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(x + inset + 2, y + 97);
    ctx.lineTo(x + w - inset - 2, y + 97);
    ctx.stroke();
    ctx.restore();

    // Rows: what a point is worth
    let curY = y + 128;
    for (const row of desc.rows) {
        ui.drawText(row.label, x + PADDING, curY, UITheme.fonts.cardSmall, UITheme.colors.textMuted, 'left');
        ui.drawText(row.value, x + w - PADDING, curY, UITheme.fonts.cardSmall, UITheme.colors.textMain, 'right');
        curY += LINE_H;
    }
    if (detailLines.length) curY += DETAIL_GAP;
    for (const line of detailLines) {
        ui.drawText(line, x + PADDING, curY, UITheme.fonts.cardItalic, UITheme.colors.textMuted, 'left');
        curY += LINE_H;
    }
    if (noteLines.length) {
        curY += SECTION_GAP;
        for (const line of noteLines) {
            ui.drawText(line, x + PADDING, curY, UITheme.fonts.cardSmall, UITheme.colors.textMain, 'left');
            curY += LINE_H;
        }
    }
    if (flavorLines.length) {
        // a hairline, then the story line: the last thing on the card, and the quietest
        curY += FLAVOR_GAP - 8;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.moveTo(x + PADDING, curY - 18);
        ctx.lineTo(x + w - PADDING, curY - 18);
        ctx.stroke();
        ctx.restore();
        for (const line of flavorLines) {
            curY += LINE_H;
            ui.drawText(line, x + PADDING, curY - 8, UITheme.fonts.cardItalic, UITheme.colors.textMuted, 'left');
        }
    }
    return { x, y, w, h };
}
