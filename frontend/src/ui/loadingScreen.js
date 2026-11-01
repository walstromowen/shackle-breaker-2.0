/**
 * ui/loadingScreen.js
 *
 * The loading screen, shown at boot while the game's pictures and sounds download (screens/boot/bootRenderer.js) and while the world is built
 * (TransitionRenderer.setWork): smoke and embers over the dark, and in the middle a piece of
 * the world's lore, one item's description (its icon, its name and its words, the quote and who said it set apart); what is being done and
 * a brass progress bar below. A different item each time.
 */
import { UITheme } from './UITheme.js';
import { CanvasUI } from './canvasUI.js';
import { drawSmoke } from './particles/smoke.js';
import { drawEmbers } from './particles/embers.js';
import { ItemDefinitions } from '../../../shared/items/itemDefinitions.js';

const BRASS = UITheme.colors.textHighlight;
const BONE = UITheme.colors.textMain;
const ASH = UITheme.colors.textMuted;

const NAME_FONT = '600 56px "Cormorant Garamond", Georgia, serif';
const TEXT_FONT = 'italic 400 30px "Barlow", system-ui, sans-serif';
const QUOTE_FONT = 'italic 500 34px "Cormorant Garamond", Georgia, serif';
const BY_FONT = '400 24px "Barlow", system-ui, sans-serif';
const LABEL_FONT = 'italic 600 34px "Cormorant Garamond", Georgia, serif';
const PCT_FONT = '400 22px "DM Mono", ui-monospace, monospace';
const TEXT_W = 900;
const ICON = 128;

/* Every item with a description worth reading and an icon to show */
let pool = null;
function splashPool() {
    if (pool) return pool;
    pool = Object.values(ItemDefinitions).filter(d => d && d.icon && typeof d.description === 'string' && d.description.length >= 40);
    return pool;
}

/**
 * One item for the screen: { def, name, text, quote, by }. A description that ends in a quote ('... "A shorter longsword is a faster
 * longsword" - Commander Mentoras.') is split so the quote and its speaker can be set apart.
 */
export function pickSplash(random = Math.random) {
    const list = splashPool();
    if (!list.length) return null;
    const def = list[Math.floor(random() * list.length) % list.length];
    const desc = def.description.trim();
    const m = desc.match(/^(.*?)\s*["“]([^"”]+)["”]\s*(?:[-–—]\s*(.+?))?\.?$/);
    if (m && m[2]) return { def, name: def.name, text: m[1].trim(), quote: m[2].trim(), by: m[3] ? m[3].trim() : '' };
    return { def, name: def.name, text: desc, quote: '', by: '' };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} o  { W, H, alpha (0..1: the whole screen fades with the transition), progress (0..1), label, splash, loader, shown (seconds on screen) }
 */
export function drawLoadingScreen(ctx, o) {
    const { W, H, alpha = 1, progress = 0, label = 'Loading', splash = null, loader = null, shown = 0 } = o;
    if (alpha <= 0) return;
    const ui = new CanvasUI(ctx);
    const now = performance.now() / 1000;
    const appear = Math.min(1, shown / 0.45);   // the lore eases in

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, W, H);
    drawSmoke(ctx, now, W, H, 0.55, true);
    drawEmbers(ctx, now, 0, W, H, 0.85, undefined, 48, 1.2);
    // a vignette: the light gathers in the middle, where the words are
    const vg = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.15, W / 2, H * 0.45, H * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // ---- the item ----
    if (splash) {
        ctx.globalAlpha = alpha * appear;
        const lift = (1 - appear) * 14;
        // the block is centred in the space above the progress bar, whatever the length of the words
        const textLines = splash.text ? ui.getWrappedLines(splash.text, TEXT_W, TEXT_FONT) : [];
        const quoteLines = splash.quote ? ui.getWrappedLines(`“${splash.quote}”`, TEXT_W - 60, QUOTE_FONT) : [];
        const blockH = ICON + 58 + 26 + 54 + textLines.length * 42 + (textLines.length ? 14 : 0) + quoteLines.length * 46 + (splash.by ? 30 : 0);
        let y = Math.max(60, (H - 180 - blockH) / 2) + lift;

        // icon in a brass frame, with a faint glow behind it
        const ix = W / 2 - ICON / 2;
        const glow = ctx.createRadialGradient(W / 2, y + ICON / 2, 10, W / 2, y + ICON / 2, ICON);
        glow.addColorStop(0, 'rgba(201,166,79,0.18)');
        glow.addColorStop(1, 'rgba(201,166,79,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(W / 2 - ICON * 1.2, y - ICON * 0.7, ICON * 2.4, ICON * 2.4);
        ctx.fillStyle = 'rgba(12, 12, 16, 0.9)';
        ctx.fillRect(ix, y, ICON, ICON);
        // the icon (at boot its sheet may not have arrived yet: a small brass diamond keeps the frame from looking empty)
        const sheetsReady = loader && (typeof loader.isDone !== 'function' || loader.isDone());
        const drawn = sheetsReady && ui.drawItemIcon(loader, splash.def, ix + 8, y + 8, ICON - 16);
        if (!drawn) {
            const cx = W / 2, cy = y + ICON / 2, d = 9;
            ctx.fillStyle = BRASS;
            ctx.beginPath(); ctx.moveTo(cx, cy - d); ctx.lineTo(cx + d, cy); ctx.lineTo(cx, cy + d); ctx.lineTo(cx - d, cy); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = BRASS;
        ctx.lineWidth = 2;
        ctx.strokeRect(ix + 1, y + 1, ICON - 2, ICON - 2);
        ctx.strokeStyle = 'rgba(201,166,79,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(ix - 6.5, y - 6.5, ICON + 13, ICON + 13);
        y += ICON + 58;

        // name, and the flourish under it
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.font = NAME_FONT;
        ctx.fillStyle = BRASS;
        ctx.fillText(splash.name, W / 2, y);
        y += 26;
        ui.drawLineWithGothicFlourish(W / 2 - 260, y, 520, BRASS);
        y += 54;

        // the description, then the quote and who said it
        ctx.globalAlpha = alpha * appear;
        if (textLines.length) {
            for (const line of textLines) {
                ctx.font = TEXT_FONT;
                ctx.fillStyle = ASH;
                ctx.textAlign = 'center';
                ctx.fillText(line, W / 2, y);
                y += 42;
            }
            y += 14;
        }
        if (quoteLines.length) {
            for (const line of quoteLines) {
                ctx.font = QUOTE_FONT;
                ctx.fillStyle = BONE;
                ctx.textAlign = 'center';
                ctx.fillText(line, W / 2, y);
                y += 46;
            }
            if (splash.by) {
                ctx.font = BY_FONT;
                ctx.fillStyle = BRASS;
                ctx.fillText(`— ${splash.by}`, W / 2, y + 4);
            }
        }
    }

    // ---- what is being done, and how far it has got ----
    ctx.globalAlpha = alpha;
    const barW = 560, barY = H - 108;
    const dots = '.'.repeat(1 + (Math.floor(now * 2.5) % 3));
    ctx.textAlign = 'center';
    ctx.font = LABEL_FONT;
    ctx.fillStyle = BRASS;
    ctx.fillText(label, W / 2, barY - 30);
    const lw = ctx.measureText(label).width;
    ctx.textAlign = 'left';
    ctx.fillText(dots, W / 2 + lw / 2 + 2, barY - 30);

    const p = Math.max(0, Math.min(1, progress));
    const bx = W / 2 - barW / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(bx, barY, barW, 4);
    const fill = ctx.createLinearGradient(bx, 0, bx + barW * p, 0);
    fill.addColorStop(0, 'rgba(201,166,79,0.35)');
    fill.addColorStop(1, BRASS);
    ctx.fillStyle = fill;
    ctx.fillRect(bx, barY, barW * p, 4);
    // a spark at the head of the bar
    if (p > 0 && p < 1) {
        const sx = bx + barW * p;
        const spark = ctx.createRadialGradient(sx, barY + 2, 0, sx, barY + 2, 14);
        spark.addColorStop(0, 'rgba(255,214,140,0.9)');
        spark.addColorStop(1, 'rgba(255,214,140,0)');
        ctx.fillStyle = spark;
        ctx.fillRect(sx - 14, barY - 12, 28, 28);
    }
    ctx.font = PCT_FONT;
    ctx.fillStyle = ASH;
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(p * 100)}%`, W / 2, barY + 36);
    ctx.restore();
}
