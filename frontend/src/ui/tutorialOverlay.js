import { TIPS } from './tutorialData.js';
import { UITheme } from './UITheme.js';
import { CanvasUI } from './canvasUI.js';

const STORAGE_KEY = 'shackle-breaker:tips';
const IGNORE_INPUT_SECONDS = 0.5;   // a key still held from the last screen (or a double click) must not skip a card unread
const FADE_SECONDS = 0.25;
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

/**
 * The card that explains a screen's controls the first time it opens. While it is up the screen underneath is paused: SceneManager
 * hands it every key and click, and any of them (after a short delay) closes it.
 */
export class TutorialOverlay {
    constructor(store = tipStore) {
        this.store = store;
        this.sceneId = null;
        this.age = 0;
    }

    get active() { return this.sceneId !== null; }

    get canDismiss() { return this.active && this.age >= IGNORE_INPUT_SECONDS; }

    /** Opens the card for a screen unless there is none or it was seen already. Returns true when it opened. */
    show(sceneId) {
        if (!TIPS[sceneId] || this.store.hasSeen(sceneId)) return false;
        this.sceneId = sceneId;
        this.age = 0;
        return true;
    }

    /** Closes the card and remembers it as seen. Returns false when nothing was open. */
    dismiss() {
        if (!this.active) return false;
        this.store.markSeen(this.sceneId);
        this.sceneId = null;
        return true;
    }

    /** Closes the card without remembering it (the scene changed before it was read). */
    cancel() {
        this.sceneId = null;
    }

    update(dt) {
        if (this.active) this.age += dt;
    }

    render(ctx) {
        if (!this.active) return;
        const tip = TIPS[this.sceneId];
        const ui = new CanvasUI(ctx);
        const W = ctx.canvas.width, H = ctx.canvas.height;
        const fade = Math.min(1, this.age / FADE_SECONDS);

        const panelW = 1180;
        const padX = 72;
        const keyColW = 380;
        const textX = padX + keyColW + 24;
        const textW = panelW - textX - padX;
        const rowFont = UITheme.font(30);
        const lineH = 40;
        const rowGap = 22;

        // Measure first, so the card is as tall as its content
        const rows = tip.rows.map(row => {
            const lines = ui.getWrappedLines(row.text, textW, rowFont);
            return { row, lines, h: Math.max(64, lines.length * lineH) };
        });
        const introLines = tip.intro ? ui.getWrappedLines(tip.intro, panelW - padX * 2, UITheme.font(30, { italic: true })) : [];
        const headH = 64 + 56 + introLines.length * lineH + 36;
        const rowsH = rows.reduce((s, r) => s + r.h, 0) + rowGap * (rows.length - 1);
        const footH = 120;
        const panelH = headH + rowsH + footH;
        const x = Math.round((W - panelW) / 2);
        const y = Math.round((H - panelH) / 2);

        ctx.save();
        ctx.globalAlpha = fade;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.fillRect(0, 0, W, H);
        ui.drawPopupPanel(x, y, panelW, panelH);

        let cy = y + 64;
        ui.drawText(tip.title, x + panelW / 2, cy, UITheme.fonts.sectionHeading, UITheme.colors.textHighlight, 'center');
        cy += 40;
        ui.drawLineWithGothicFlourish(x + padX, cy, panelW - padX * 2);
        cy += 20;
        introLines.forEach(line => {
            cy += lineH;
            ui.drawText(line, x + panelW / 2, cy, UITheme.font(30, { italic: true }), UITheme.colors.textMuted, 'center');
        });
        cy += 36;

        rows.forEach(({ row, lines, h }) => {
            this._drawKeys(ctx, ui, row.keys, x + padX, cy + 8);
            lines.forEach((line, i) => {
                ui.drawText(line, x + textX, cy + 8 + 34 + i * lineH, rowFont, UITheme.colors.textMain, 'left');
            });
            cy += h + rowGap;
        });

        const prompt = this.canDismiss ? 'Press any key or click to continue' : '';
        ui.drawText(prompt, x + panelW / 2, y + panelH - 52, UITheme.font(26, { italic: true }), UITheme.colors.textMuted, 'center');
        ctx.restore();
    }

    /** One row's keys as small brass-edged caps, left to right from (x, y), the cap tops at y. */
    _drawKeys(ctx, ui, keys, x, y) {
        const h = 50, gap = 10, pad = 18;
        const capFont = UITheme.font(26, { bold: true });
        let cx = x;
        keys.forEach(key => {
            ctx.save();
            ctx.font = capFont;
            const tw = ctx.measureText(key).width;
            ctx.restore();
            if (PLAIN_TOKENS.has(key)) {
                ui.drawText(key === '-' ? '–' : key, cx + tw / 2 + 4, y + 36, UITheme.font(28), UITheme.colors.textMuted, 'center');
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
            ui.drawText(key, cx + w / 2, y + 35, capFont, UITheme.colors.textHighlight, 'center');
            cx += w + gap;
        });
    }
}
