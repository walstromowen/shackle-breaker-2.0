// frontend/src/ui/statusTooltip.js: what a status effect does, when the mouse rests on its icon, on every screen that shows them (the battle's
// cards, the Party screen, the character summary, an encounter's portrait).
//
// A screen calls StatusTips.track(effect, x, y, size) for each status icon it draws. After the frame, SceneManager calls
// StatusTips.drawHovered(ctx, mouse): the icon under the mouse gets a card (its name, what it does from its definition's `description`, how long it
// has left, its stacks) and the list is cleared for the next frame. No hitboxes are added, so a click on whatever is under the icon (a battle card
// being targeted) works as before.
import { UITheme } from './UITheme.js';
import { CanvasUI } from './canvasUI.js';
import { StatusEffectDefinitions } from '../../../shared/abilities/statusEffectDefinitions.js';

const W = 560, PAD = 24, GAP = 10, LINE_H = 34;
const tracked = [];

/** What the card says about a status (an active StatusEffectModel, or anything with an id): { name, text, lines: [extra lines] }. */
export function statusInfo(effect) {
    const def = (effect && StatusEffectDefinitions[effect.id]) || effect?.def || {};
    const name = effect?.name || def.name || 'Status';
    const text = def.description || 'An effect on this character.';
    const lines = [];
    const charges = effect?.charges;
    if (effect?.isInfinite || charges === -1) lines.push(def.id === 'trap_set' ? 'Waits until it springs' : 'No time limit');
    else if (Number.isFinite(charges) && charges >= 99) lines.push('Lasts the whole fight');
    else if (Number.isFinite(charges) && charges > 0) lines.push(`${charges} turn${charges === 1 ? '' : 's'} left`);
    if ((def.maxStacks || 1) > 1) lines.push(`Stacks: ${effect?.stacks || 1} of ${def.maxStacks}`);
    return { name, text, lines };
}

function wrap(ctx, text, width) {
    const out = [];
    for (const para of String(text).split('\n')) {
        let line = '';
        for (const word of para.split(/\s+/)) {
            const next = line ? `${line} ${word}` : word;
            if (ctx.measureText(next).width > width && line) { out.push(line); line = word; } else line = next;
        }
        if (line) out.push(line);
    }
    return out;
}

export const StatusTips = {
    /** A status icon drawn this frame at (x, y), size x size, in canvas pixels. */
    track(effect, x, y, size, h = size) {
        if (effect) tracked.push({ effect, x, y, w: size, h });
    },

    clear() { tracked.length = 0; },

    /** The icon under the mouse, if any. */
    hovered(mouse) {
        if (!mouse) return null;
        for (let i = tracked.length - 1; i >= 0; i--) {
            const t = tracked[i];
            if (mouse.x >= t.x && mouse.x <= t.x + t.w && mouse.y >= t.y && mouse.y <= t.y + t.h) return t;
        }
        return null;
    },

    /** Draws the card of the icon under the mouse (after everything else on the screen), then forgets this frame's icons. */
    drawHovered(ctx, mouse) {
        const t = this.hovered(mouse);
        this.clear();
        if (!t || !ctx) return;
        const info = statusInfo(t.effect);
        const ui = new CanvasUI(ctx);
        const C = UITheme.colors, F = UITheme.fonts;
        ctx.save();
        ctx.font = F.small;
        const body = wrap(ctx, info.text, W - PAD * 2);
        const h = PAD + 40 + GAP + body.length * LINE_H + (info.lines.length ? GAP + info.lines.length * LINE_H : 0) + PAD;
        const cw = ctx.canvas.width, ch = ctx.canvas.height;
        // beside the icon, kept on the screen
        let x = t.x + t.w + 16, y = t.y - 8;
        if (x + W > cw - 8) x = t.x - W - 16;
        x = Math.max(8, Math.min(cw - W - 8, x));
        y = Math.max(8, Math.min(ch - h - 8, y));
        ui.drawPopupPanel(x, y, W, h);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = F.cardTitle;
        ctx.fillStyle = C.textHighlight;
        ctx.fillText(info.name, x + PAD, y + PAD);
        let ty = y + PAD + 40 + GAP;
        ctx.font = F.small;
        ctx.fillStyle = C.textMain;
        for (const line of body) { ctx.fillText(line, x + PAD, ty); ty += LINE_H; }
        if (info.lines.length) {
            ty += GAP;
            ctx.font = F.cardSmall;
            ctx.fillStyle = C.textMuted;
            for (const line of info.lines) { ctx.fillText(line, x + PAD, ty + 4); ty += LINE_H; }
        }
        ctx.restore();
    }
};
