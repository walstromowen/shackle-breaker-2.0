import { TIPS } from './tutorialData.js';
import { UITheme } from './UITheme.js';
import { CanvasUI } from './canvasUI.js';

const STORAGE_KEY = 'shackle-breaker:tips';
// How the card arrives and leaves. The screen is seen first, then the card eases in; closing it eases out before the screen takes over.
const SHOW_DELAY_SECONDS = 0.45;    // after the screen is fully visible (any scene transition finished)
const FADE_IN_SECONDS = 0.6;
const FADE_OUT_SECONDS = 0.35;
const IGNORE_INPUT_SECONDS = 0.8;   // counted from the start of the fade-in: a key still held from the last screen (or a double click) must not skip a card unread
const RISE_PIXELS = 36;             // the card drifts up this far as it fades in (and back down as it fades out)
const PLAIN_TOKENS = new Set(['-', '/', 'or']);   // drawn as text between key caps, not as a key cap

/**
 * Which tip cards the player has already seen. Kept in the browser (localStorage), like the audio settings, so a card is shown once
 * per browser rather than once per save. Where storage is unavailable (private window, blocked site data) it still works for the
 * rest of the session, it just forgets on reload.
 */
export class TipStore {
    constructor(storage) {
        this.storage = storage === undefined ? TipStore.defaultStorage() : storage;
        this.seen = new Set();
        try {
            const raw = this.storage ? this.storage.getItem(STORAGE_KEY) : null;
            const list = raw ? JSON.parse(raw) : [];
            if (Array.isArray(list)) list.forEach(id => { if (typeof id === 'string') this.seen.add(id); });
        } catch (e) { /* unreadable: start with none seen */ }
    }

    static defaultStorage() {
        try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
    }

    hasSeen(id) { return this.seen.has(id); }

    markSeen(id) {
        this.seen.add(id);
        this._save();
    }

    /** Forget every card, so each one shows again the next time its screen opens. */
    reset() {
        this.seen.clear();
        this._save();
    }

    _save() {
        try { if (this.storage) this.storage.setItem(STORAGE_KEY, JSON.stringify([...this.seen])); } catch (e) { /* kept in memory only */ }
    }
}

/** The one store the game uses; Settings > Replay Tips resets it. */
export const tipStore = new TipStore();

/** Easing: quick start, soft landing (arrivals), and the reverse (departures). */
const easeOut = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const easeIn = (t) => Math.pow(Math.max(0, Math.min(1, t)), 2);

// ============================================================
// THE CARD'S CONTENT: shared by the pop-up card and the Controls tabs in Settings
// ============================================================

/** The sizes the pop-up card uses. Settings passes smaller ones to fit a tab. */
export const TIP_DEFAULTS = Object.freeze({
    width: 1180 - 72 * 2,   // the width of the content (the card is this plus its side padding)
    keyColW: 380,           // the column the key caps are drawn in
    font: 30,               // the row text
    lineH: 40,
    rowGap: 32,
    capH: 50,               // the key caps
    capFont: 26,
    showTitle: true         // the title and its flourish above the intro
});

/** Works out where everything goes, so the caller can size a panel around it before drawing. Returns { height, ... } for drawTip. */
export function measureTip(ui, tip, options = {}) {
    const o = { ...TIP_DEFAULTS, ...options };
    // the key column is as wide as the widest row of caps (plus a gutter), never wider than `keyColW`: the text sits close to its keys, not across the card
    const widest = Math.max(0, ...tip.rows.map(r => keysWidth(ui.ctx, r.keys, o)));
    o.keyColUsed = Math.min(o.keyColW, Math.round(widest + 48));
    const textW = o.width - o.keyColUsed - 24;
    const rowFont = UITheme.font(o.font);
    const introFont = UITheme.font(o.font, { italic: true });
    const rows = tip.rows.map(row => {
        const lines = ui.getWrappedLines(row.text, textW, rowFont);
        return { row, lines, h: Math.max(o.capH + 14, lines.length * o.lineH) };
    });
    const introLines = tip.intro ? ui.getWrappedLines(tip.intro, o.width, introFont) : [];
    const headH = (o.showTitle ? 100 : 0) + introLines.length * o.lineH + (introLines.length ? 36 : 0);
    const rowsH = rows.reduce((sum, r) => sum + r.h, 0) + o.rowGap * Math.max(0, rows.length - 1);
    return { tip, o, rows, introLines, rowFont, introFont, headH, rowsH, height: headH + rowsH };
}

/** Draws a measured tip with its top-left corner at (x, y). */
export function drawTip(ctx, ui, m, x, y) {
    const { o } = m;
    let cy = y;
    if (o.showTitle) {
        ui.drawText(m.tip.title, x + o.width / 2, cy + 40, UITheme.fonts.sectionHeading, UITheme.colors.textHighlight, 'center');
        ui.drawLineWithGothicFlourish(x, cy + 80, o.width);
        cy += 100;
    }
    m.introLines.forEach(line => {
        cy += o.lineH;
        ui.drawText(line, x + o.width / 2, cy, m.introFont, UITheme.colors.textMuted, 'center');
    });
    if (m.introLines.length) cy += 36;

    const textX = x + o.keyColUsed + 24;
    m.rows.forEach(({ row, lines, h }, idx) => {
        drawKeys(ctx, ui, row.keys, x, cy + 8, o);
        lines.forEach((line, i) => {
            ui.drawText(line, textX, cy + 8 + Math.round(o.capH * 0.68) + i * o.lineH, m.rowFont, UITheme.colors.textMain, 'left');
        });
        cy += h + o.rowGap;
        // a faint rule between rows, halfway down the gap, so each control reads as its own line
        if (idx < m.rows.length - 1) {
            ctx.save();
            ctx.strokeStyle = UITheme.colors.textMuted;
            ctx.globalAlpha = 0.16;
            ctx.beginPath();
            ctx.moveTo(x, Math.round(cy - o.rowGap / 2) + 0.5);
            ctx.lineTo(x + o.width, Math.round(cy - o.rowGap / 2) + 0.5);
            ctx.stroke();
            ctx.restore();
        }
    });
}

/** How wide a row of key caps is drawn (the same arithmetic as drawKeys). */
function keysWidth(ctx, keys, o) {
    const h = o.capH, gap = 10, pad = Math.round(h * 0.36);
    ctx.save();
    ctx.font = UITheme.font(o.capFont, { bold: true });
    let w = 0;
    keys.forEach(key => {
        const tw = ctx.measureText(key).width;
        w += PLAIN_TOKENS.has(key) ? tw + 14 : Math.max(h, tw + pad * 2) + gap;
    });
    ctx.restore();
    return Math.max(0, w - gap);
}

/** One row's keys as small brass-edged caps, left to right from (x, y), the cap tops at y. */
function drawKeys(ctx, ui, keys, x, y, o) {
    const h = o.capH, gap = 10, pad = Math.round(h * 0.36);
    const capFont = UITheme.font(o.capFont, { bold: true });
    let cx = x;
    keys.forEach(key => {
        ctx.save();
        ctx.font = capFont;
        const tw = ctx.measureText(key).width;
        ctx.restore();
        if (PLAIN_TOKENS.has(key)) {
            ui.drawText(key === '-' ? '–' : key, cx + tw / 2 + 4, y + Math.round(h * 0.72), UITheme.font(o.capFont + 2), UITheme.colors.textMuted, 'center');
            cx += tw + 14;
            return;
        }
        const w = Math.max(h, tw + pad * 2);
        ctx.save();
        ctx.fillStyle = 'rgba(201, 166, 79, 0.10)';
        ctx.strokeStyle = 'rgba(194, 161, 79, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(cx, y, w, h);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ui.drawText(key, cx + w / 2, y + Math.round(h * 0.7), capFont, UITheme.colors.textHighlight, 'center');
        cx += w + gap;
    });
}

/**
 * The card that explains a screen's controls the first time it opens. It waits for the screen to be fully visible, eases in, and
 * while it is up the screen underneath is paused: SceneManager hands it every key and click, and any of them (after a short delay)
 * eases it out again.
 *
 *   phase:  null -> 'wait' -> 'in' -> 'open' -> 'out' -> null
 *   active    a card is pending or showing (any phase)
 *   blocking  the card is on screen ('in', 'open', 'out'): the screen underneath is paused and the input is the card's
 */
export class TutorialOverlay {
    constructor(store = tipStore) {
        this.store = store;
        this.sceneId = null;
        this.phase = null;
        this.age = 0;       // seconds since the fade-in began
        this.phaseTime = 0; // seconds in the current phase
    }

    get active() { return this.sceneId !== null; }

    get blocking() { return this.phase === 'in' || this.phase === 'open' || this.phase === 'out'; }

    get canDismiss() { return (this.phase === 'in' || this.phase === 'open') && this.age >= IGNORE_INPUT_SECONDS; }

    /** 0 (not there) to 1 (fully in), eased: how much of the card is showing. */
    get visibility() {
        if (this.phase === 'in') return easeOut(this.phaseTime / FADE_IN_SECONDS);
        if (this.phase === 'open') return 1;
        if (this.phase === 'out') return 1 - easeIn(this.phaseTime / FADE_OUT_SECONDS);
        return 0;
    }

    _enter(phase) { this.phase = phase; this.phaseTime = 0; }

    /** Queues the card for a screen unless there is none or it was seen already. Returns true when it was queued. */
    show(sceneId) {
        if (!TIPS[sceneId] || this.store.hasSeen(sceneId)) return false;
        this.sceneId = sceneId;
        this.age = 0;
        this._enter('wait');
        return true;
    }

    /** Starts closing the card and remembers it as seen. Returns false when there is nothing to close (or it is already closing). */
    dismiss() {
        if (!this.active || this.phase === 'out') return false;
        this.store.markSeen(this.sceneId);
        if (this.phase === 'wait') { this.cancel(); return true; }
        this._enter('out');
        return true;
    }

    /** Closes the card at once without remembering it (the scene changed before it was read). */
    cancel() {
        this.sceneId = null;
        this.phase = null;
        this.age = 0;
        this.phaseTime = 0;
    }

    /** @param {number} dt  @param {{ sceneBusy?: boolean }} [opts]  sceneBusy: a scene transition is still running, so the card keeps waiting */
    update(dt, { sceneBusy = false } = {}) {
        if (!this.active) return;
        if (this.phase === 'wait') {
            if (!sceneBusy) this.phaseTime += dt;
            if (this.phaseTime >= SHOW_DELAY_SECONDS) { this._enter('in'); this.age = 0; }
            return;
        }
        this.phaseTime += dt;
        if (this.phase === 'in' || this.phase === 'open') {
            this.age += dt;
            if (this.phase === 'in' && this.phaseTime >= FADE_IN_SECONDS) this._enter('open');
        } else if (this.phase === 'out' && this.phaseTime >= FADE_OUT_SECONDS) {
            this.cancel();
        }
    }

    render(ctx) {
        if (!this.blocking) return;
        const tip = TIPS[this.sceneId];
        const ui = new CanvasUI(ctx);
        const W = ctx.canvas.width, H = ctx.canvas.height;
        const v = this.visibility;

        const panelW = 1180;
        const padX = 72;
        const m = measureTip(ui, tip, { width: panelW - padX * 2 });
        const footH = 120;
        const panelH = 24 + m.height + footH;
        const x = Math.round((W - panelW) / 2);
        const y = Math.round((H - panelH) / 2);

        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${(0.72 * v).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);

        // the card drifts up into place as it fades in
        ctx.globalAlpha = v;
        ctx.translate(0, Math.round((1 - v) * RISE_PIXELS));
        ui.drawPopupPanel(x, y, panelW, panelH);
        drawTip(ctx, ui, m, x + padX, y + 24);

        // the prompt arrives a moment after the card, once a key press would actually count
        const ready = this.canDismiss ? Math.min(1, (this.age - IGNORE_INPUT_SECONDS) / 0.4) : 0;
        if (ready > 0) {
            ctx.globalAlpha = v * ready;
            ui.drawText('Press any key or click to continue', x + panelW / 2, y + panelH - 52, UITheme.font(26, { italic: true }), UITheme.colors.textMuted, 'center');
        }
        ctx.restore();
    }
}
