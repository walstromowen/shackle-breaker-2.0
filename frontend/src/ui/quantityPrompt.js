/**
 * frontend/src/ui/quantityPrompt.js
 *
 * "How many?" popup with a slider, for selling or dropping part of a stack. One component, used by the shop (Sell / Buy Multiple...)
 * and the character summary's inventory (Drop Multiple...).
 *
 * A controller owns one QuantityPrompt and does three things with it:
 *   1. opens it:      this.quantity.open({ title, subtitle, max, value, confirmLabel: n => `Sell ${n}`, detail: n => `...`, onConfirm: n => {...} })
 *   2. asks it first: while `this.quantity.isOpen` every key, click, drag and wheel turn goes to it and nothing else (see handleIntent,
 *                     onClick, onRightClick, onDragStart / onDragMove / onDrop)
 *   3. draws it last: the renderer calls prompt.render(ctx, ui, hoveredId) and pushes the returned hitboxes in front of its own
 *
 * Mouse: click or drag the bar, the - and + buttons step by one, "All" jumps to the most, the confirm button does it, a click outside cancels.
 * Keyboard: A / D (or Left / Right) step by one, W / S (or Up / Down) by ten, Enter confirms, Esc cancels.
 */
import { UITheme } from './UITheme.js';

const C = UITheme.colors;
const F = UITheme.fonts;

const BIG_STEP = 10;
const PANEL_W = 900;
const PANEL_H = 500;

export class QuantityPrompt {
    /** @param {{ owner?: object }} config  owner: the controller (its sounds are used so nothing doubles, its input gives the pointer) */
    constructor(config = {}) {
        this.owner = config.owner || null;
        this.cfg = null;
        this.amount = 1;
        this.dragging = false;
        this._trackBox = null;
    }

    get isOpen() { return this.cfg !== null; }

    /**
     * @param {object} cfg
     * @param {string} cfg.title            e.g. 'Sell Plant Fiber'
     * @param {string} [cfg.subtitle]       e.g. 'You have 40'
     * @param {number} cfg.max              the most that can be chosen (the stack size, or what the player can afford)
     * @param {number} [cfg.min=1]
     * @param {number} [cfg.value]          where the slider starts (default: the most)
     * @param {(n:number)=>string} [cfg.confirmLabel]  the confirm button, e.g. n => `Sell ${n}`
     * @param {(n:number)=>string} [cfg.detail]        the line under the bar, e.g. n => `${n * 3} coins`
     * @param {(n:number)=>void} cfg.onConfirm
     * @returns {boolean} false (and nothing opens) when there is nothing to choose between
     */
    open(cfg) {
        const min = Math.max(1, Math.floor(cfg.min ?? 1));
        const max = Math.floor(cfg.max);
        if (!Number.isFinite(max) || max < min) return false;
        this.cfg = { ...cfg, min, max };
        this.amount = this._clamp(cfg.value ?? max);
        this.dragging = false;
        return true;
    }

    close() {
        this.cfg = null;
        this.dragging = false;
        this._trackBox = null;
    }

    _clamp(n) {
        const { min, max } = this.cfg;
        return Math.max(min, Math.min(max, Math.round(n)));
    }

    /** Sets the amount; plays the hover tick when it changed (at most once per call). Returns true if it changed. */
    setAmount(n, { silent = false } = {}) {
        const next = this._clamp(n);
        if (next === this.amount) return false;
        this.amount = next;
        if (!silent && this.owner && this.owner.playNavSound) this.owner.playNavSound();
        return true;
    }

    confirm() {
        if (!this.cfg) return;
        const { onConfirm } = this.cfg;
        const n = this.amount;
        this.close();
        if (onConfirm) onConfirm(n);
    }

    cancel() {
        if (!this.cfg) return;
        this.close();
        if (this.owner && this.owner.playCancelSound) this.owner.playCancelSound();
    }

    // ========================================================
    // INPUT (every method returns true when the prompt took the input)
    // ========================================================
    handleIntent(intent) {
        if (!this.cfg) return false;
        if (intent === 'LEFT') this._stepKey(-1);
        else if (intent === 'RIGHT') this._stepKey(1);
        else if (intent === 'DOWN') this._stepKey(-BIG_STEP);
        else if (intent === 'UP') this._stepKey(BIG_STEP);
        else if (intent === 'CONFIRM') this.confirm();
        else if (intent === 'CANCEL') this.cancel();
        return true;   // any other key is swallowed too: the screen underneath is not reachable
    }

    _stepKey(delta) {
        // The tick only plays when the value really moved; hitting the end of the bar is a quiet error tick
        if (!this.setAmount(this.amount + delta) && this.owner && this.owner.playErrorSound) this.owner.playErrorSound();
    }

    onClick(hitboxId) {
        if (!this.cfg) return false;
        if (hitboxId === 'QTY_MINUS') this._stepKey(-1);
        else if (hitboxId === 'QTY_PLUS') this._stepKey(1);
        else if (hitboxId === 'QTY_MAX') {
            if (this.amount === this.cfg.max) this._claim();
            else this.setAmount(this.cfg.max);
        } else if (hitboxId === 'QTY_TRACK') {
            this._setFromPointer();
            this._claim();
        } else if (hitboxId === 'QTY_OK') {
            this.confirm();   // whatever onConfirm does makes the sound (a till ring for a sale, a thud for a drop)
        } else if (hitboxId === 'QTY_CANCEL' || !hitboxId || hitboxId === 'QTY_BG') {
            this.cancel();
        }
        return true;
    }

    onRightClick() {
        if (!this.cfg) return false;
        this.cancel();
        return true;
    }

    onDragStart(hitboxId) {
        if (!this.cfg) return false;
        if (hitboxId === 'QTY_TRACK') {
            this.dragging = true;
            this._setFromPointer();
        }
        this._claim();
        return true;
    }

    onDragMove(x) {
        if (!this.cfg) return false;
        if (this.dragging) this._setFromX(x);
        return true;
    }

    onDrop() {
        if (!this.cfg) return false;
        this.dragging = false;
        this._claim();
        return true;
    }

    /** The prompt makes its own sounds; this stops UIInteractionManager from adding a default one on top. */
    _claim() {
        if (this.owner && this.owner.claimSfx) this.owner.claimSfx();
    }

    _pointerX() {
        const input = this.owner && this.owner.input;
        const p = input && input.getMousePosition ? input.getMousePosition() : null;
        return p && Number.isFinite(p.x) ? p.x : (this.owner && this.owner.mouse ? this.owner.mouse.x : 0);
    }

    _setFromPointer() { this._setFromX(this._pointerX()); }

    _setFromX(x) {
        const box = this._trackBox;
        if (!box || !this.cfg) return;
        const { min, max } = this.cfg;
        const t = Math.max(0, Math.min(1, (x - box.x) / box.w));
        this.setAmount(min + t * (max - min), { silent: true });
    }

    // ========================================================
    // DRAW
    // ========================================================
    /** Where everything goes for a canvas of this size. Pure, so tests can check the geometry. */
    layout(canvasW, canvasH) {
        const x = Math.round((canvasW - PANEL_W) / 2);
        const y = Math.round((canvasH - PANEL_H) / 2);
        const btnH = 72;
        const stepW = 72;
        const trackX = x + 64 + stepW + 24;
        const trackW = PANEL_W - 128 - (stepW + 24) * 2;
        const rowY = y + 250;
        const footY = y + PANEL_H - 40 - btnH;
        const footW = (PANEL_W - 128 - 48) / 3;
        return {
            panel: { x, y, w: PANEL_W, h: PANEL_H },
            minus: { x: x + 64, y: rowY - 36, w: stepW, h: 72 },
            plus: { x: x + PANEL_W - 64 - stepW, y: rowY - 36, w: stepW, h: 72 },
            track: { x: trackX, y: rowY - 32, w: trackW, h: 64 },
            midY: rowY,
            ok: { x: x + 64, y: footY, w: footW, h: btnH },
            max: { x: x + 64 + footW + 24, y: footY, w: footW, h: btnH },
            cancel: { x: x + 64 + (footW + 24) * 2, y: footY, w: footW, h: btnH }
        };
    }

    /** Draws the prompt over everything and returns its hitboxes (put them in front of the screen's own). */
    render(ctx, ui, hoveredId = null, keyboardFocusId = null) {
        if (!this.cfg) return [];
        const W = ctx.canvas.width, H = ctx.canvas.height;
        const L = this.layout(W, H);
        const { min, max } = this.cfg;
        const focus = this.dragging ? 'QTY_TRACK' : (hoveredId || keyboardFocusId);
        this._trackBox = L.track;

        ctx.save();
        ui.drawRect(0, 0, W, H, 'rgba(0, 0, 0, 0.62)', true);
        ui.drawPopupPanel(L.panel.x, L.panel.y, L.panel.w, L.panel.h);

        const cx = L.panel.x + L.panel.w / 2;
        ui.drawText(this.cfg.title, cx, L.panel.y + 84, F.sectionHeading, C.textHighlight, 'center');
        ui.drawLineWithGothicFlourish(L.panel.x + 64, L.panel.y + 112, L.panel.w - 128);
        if (this.cfg.subtitle) ui.drawText(this.cfg.subtitle, cx, L.panel.y + 158, F.small, C.textMuted, 'center');

        // the number, big, above the bar
        ui.drawText(String(this.amount), cx - 4, L.panel.y + 222, UITheme.font(60, { bold: true }), C.textMain, 'right', 'alphabetic');
        ui.drawText(`of ${max}`, cx + 8, L.panel.y + 222, F.body, C.textMuted, 'left', 'alphabetic');

        this._drawTrack(ui, L, min, max, focus === 'QTY_TRACK');

        ui.drawButton(L.minus.x, L.minus.y, L.minus.w, L.minus.h, '−', ui.flags('QTY_MINUS', focus), { font: UITheme.font(50, { bold: true }), tracking: 0 });
        ui.drawButton(L.plus.x, L.plus.y, L.plus.w, L.plus.h, '+', ui.flags('QTY_PLUS', focus), { font: UITheme.font(50, { bold: true }), tracking: 0 });

        const detail = this.cfg.detail ? this.cfg.detail(this.amount) : '';
        if (detail) ui.drawText(detail, cx, L.track.y + L.track.h + 62, F.medium, C.textHighlight, 'center');

        const label = this.cfg.confirmLabel ? this.cfg.confirmLabel(this.amount) : `Confirm ${this.amount}`;
        ui.drawButton(L.ok.x, L.ok.y, L.ok.w, L.ok.h, label, ui.flags('QTY_OK', focus), { font: F.button });
        ui.drawButton(L.max.x, L.max.y, L.max.w, L.max.h, `All (${max})`, ui.flags('QTY_MAX', focus), { font: F.button });
        ui.drawButton(L.cancel.x, L.cancel.y, L.cancel.w, L.cancel.h, 'Cancel', ui.flags('QTY_CANCEL', focus), { font: F.button });

        ui.drawText('[A/D] ±1     [W/S] ±10     [ENT] Confirm     [ESC] Cancel', cx, L.panel.y + L.panel.h + 44, F.small, C.textMuted, 'center');
        ctx.restore();

        // zIndex above everything the screen reports; the first match wins, so the buttons come before the backdrop
        const hb = (id, r) => ({ id, x: r.x, y: r.y, w: r.w, h: r.h, zIndex: 1000 });
        return [
            hb('QTY_MINUS', L.minus), hb('QTY_PLUS', L.plus),
            { id: 'QTY_TRACK', x: L.track.x - 20, y: L.track.y, w: L.track.w + 40, h: L.track.h, zIndex: 1000 },
            hb('QTY_OK', L.ok), hb('QTY_MAX', L.max), hb('QTY_CANCEL', L.cancel),
            { id: 'QTY_PANEL', x: L.panel.x, y: L.panel.y, w: L.panel.w, h: L.panel.h, zIndex: 999 },
            { id: 'QTY_BG', x: 0, y: 0, w: W, h: H, zIndex: 998 }
        ];
    }

    _drawTrack(ui, L, min, max, lit) {
        const t = L.track;
        const trackH = 14;
        const ty = L.midY - trackH / 2;
        const frac = max === min ? 1 : (this.amount - min) / (max - min);
        ui.drawRect(t.x, ty, t.w, trackH, C.bgScale[3], true);
        ui.drawRect(t.x, ty, t.w, trackH, C.border, false);
        const fillW = Math.round(t.w * frac);
        if (fillW > 0) ui.drawRect(t.x + 1, ty + 1, Math.max(0, fillW - 2), trackH - 2, lit ? C.borderHighlight : C.xp, true);
        const hx = t.x + fillW;
        const handleColor = lit ? C.borderHighlight : C.selectedWhite;
        ui.drawRect(hx - 9, L.midY - 24, 18, 48, C.bgScale[1], true);
        ui.drawRect(hx - 9, L.midY - 24, 18, 48, handleColor, false);
        ui.drawLine(hx, L.midY - 14, hx, L.midY + 14, handleColor, 2);
    }
}
