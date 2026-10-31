/**
 * ui/debugOverlay.js
 *
 * The debug overlay: "~" (the Backquote key) on any screen shows it, and again hides it (SceneManager._handleGlobalKeydown).
 *   - every screen: a performance panel in the top right corner (frame rate, frame times, hitches, where the time goes, the canvas and display,
 *     the GPU the browser draws with, memory, and on the overworld the loaded chunks and objects);
 *   - in battle: the battle debugger as well (screens/battle/battleDebuggerRenderer.js reads `debugOverlay.visible`).
 * The numbers come from GameLoop.timing (engine/gameLoop.js). The panel is worked out and drawn four times a second into a picture of its own, and
 * every frame in between only puts that picture on screen, so it costs next to nothing (and does not skew what it measures).
 */
import { UITheme } from './UITheme.js';

/** Shown or hidden, for every screen at once. */
export const debugOverlay = {
    visible: false,
    toggle() { this.visible = !this.visible; return this.visible; },
};

const PANEL_W = 470;
const PAD = 14;
const LINE = 24;
const GRAPH_H = 70;
const GRAPH_FRAMES = 220;   // frames shown in the graph (newest on the right)
const HITCH_MS = 50;        // a frame gap this long is a visible hitch
const FONT = '18px monospace';
const FONT_BOLD = 'bold 18px monospace';
const FONT_TITLE = 'bold 20px monospace';
const GOOD = '#7fbf6a', WARN = '#d6b24a', BAD = '#d0503c';

const MUTED_OK = '#b8b2a6';
const colorForGap = (ms) => (ms <= 18 ? GOOD : ms <= 34 ? WARN : BAD);
const fmt = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : '-');

/** Which GPU the browser draws with, read once ("ANGLE (NVIDIA ...)" vs "... Intel(R) UHD ..." tells the dedicated card from the integrated one). */
let gpuName = null;
function readGpuName() {
    if (gpuName !== null) return gpuName;
    gpuName = 'unknown';
    try {
        const gl = document.createElement('canvas').getContext('webgl');
        const info = gl && gl.getExtension('WEBGL_debug_renderer_info');
        if (info) gpuName = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).replace(/^ANGLE \((.*)\)$/, '$1');
        const lose = gl && gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
    } catch (e) { /* no WebGL: leave it unknown */ }
    return gpuName;
}

/** The numbers of the panel, from the loop's frame history. */
export function summarizeTiming(timing, now) {
    const out = { fps: 0, refreshHz: 0, avgGap: 0, low1: 0, worst: 0, hitches: 0, lastHitchAgo: null, update: 0, render: 0, renderMax: 0, frames: timing.count };
    if (!timing || timing.count === 0) return out;
    const gaps = [];
    let inSecond = 0, upd = 0, ren = 0, renMax = 0, nSecond = 0;
    for (let k = 0; k < timing.count; k++) {
        const i = (timing.next - 1 - k + timing.size) % timing.size;
        const age = now - timing.at[i];
        const gap = timing.gap[i];
        if (gap > 0 && gap < 5000) gaps.push(gap);
        if (gap >= HITCH_MS && gap < 5000) {
            out.hitches++;
            if (out.lastHitchAgo === null) out.lastHitchAgo = age / 1000;
        }
        if (age <= 1000) {
            inSecond++;
            upd += timing.update[i]; ren += timing.render[i]; nSecond++;
            if (timing.render[i] > renMax) renMax = timing.render[i];
        }
    }
    out.fps = inSecond;
    if (nSecond) { out.update = upd / nSecond; out.render = ren / nSecond; out.renderMax = renMax; }
    if (gaps.length) {
        const sorted = gaps.slice().sort((a, b) => a - b);
        out.avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        out.worst = sorted[sorted.length - 1];
        out.low1 = 1000 / sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];   // the "1% low": fps of the slowest 1% of frames
        out.refreshHz = 1000 / sorted[Math.floor(sorted.length * 0.1)];                            // the fastest frames are the screen's refresh
    }
    return out;
}

export class DebugOverlayRenderer {
    /** @param {GameLoop} loop  read for its `timing` */
    constructor(loop = null) {
        this.loop = loop;
        this._lines = [];
        this._nextRefresh = 0;
        this._layer = null;
    }

    /**
     * Draws the performance panel. `info`: { scene, canvas, worldManager, player: { col, row } }, all optional.
     * @param {CanvasRenderingContext2D} ctx  drawn in the game's 1920 x 1080 space
     */
    render(ctx, info = {}) {
        if (!debugOverlay.visible || !this.loop) return;
        const now = performance.now();
        if (!this._layer || now >= this._nextRefresh) {
            this._lines = this._buildLines(info, now);
            this._nextRefresh = now + 250;
            const h = PAD * 2 + 30 + this._lines.length * LINE + GRAPH_H + 34;
            if (!this._layer) this._layer = document.createElement('canvas');
            if (this._layer.width !== PANEL_W || this._layer.height !== h) { this._layer.width = PANEL_W; this._layer.height = h; }
            const g = this._layer.getContext('2d');
            g.clearRect(0, 0, PANEL_W, h);
            this._drawPanel(g, 0, 0, h);
        }
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.drawImage(this._layer, ctx.canvas.width - PANEL_W - 16, 16);
        ctx.restore();
    }

    _drawPanel(ctx, x, y, h) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(8, 9, 12, 0.9)';
        ctx.fillRect(x, y, PANEL_W, h);
        ctx.strokeStyle = UITheme.colors.borderHighlight;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, PANEL_W - 1, h - 1);

        ctx.textBaseline = 'top';
        ctx.font = FONT_TITLE;
        ctx.fillStyle = UITheme.colors.textHighlight;
        ctx.textAlign = 'left';
        ctx.fillText('DEBUG', x + PAD, y + PAD);
        ctx.font = FONT;
        ctx.fillStyle = UITheme.colors.textMuted;
        ctx.textAlign = 'right';
        ctx.fillText('~ to hide', x + PANEL_W - PAD, y + PAD + 2);

        let cy = y + PAD + 32;
        for (const line of this._lines) {
            ctx.textAlign = 'left';
            ctx.font = FONT;
            ctx.fillStyle = UITheme.colors.textMuted;
            ctx.fillText(line.label, x + PAD, cy);
            ctx.font = FONT_BOLD;
            ctx.fillStyle = line.color || UITheme.colors.textMain;
            ctx.fillText(this._fit(ctx, line.value, PANEL_W - PAD * 2 - 150), x + PAD + 150, cy);
            cy += LINE;
        }

        this._drawGraph(ctx, x + PAD, cy + 8, PANEL_W - PAD * 2, GRAPH_H);
        ctx.restore();
    }

    _buildLines(info, now) {
        const s = summarizeTiming(this.loop.timing, now);
        const lines = [];
        const stride = this.loop.frameStride || 1;
        lines.push({ label: 'FPS', value: `${s.fps}  (screen ~${Math.round(s.refreshHz)} Hz${stride > 1 ? `, drawing every ${stride}` : ''})`, color: s.fps >= 55 ? GOOD : s.fps >= 40 ? WARN : BAD });
        lines.push({ label: 'Frame time', value: `${fmt(s.avgGap)} ms avg   1% low ${Math.round(s.low1)} fps`, color: colorForGap(s.avgGap) });
        lines.push({ label: 'Worst (10 s)', value: `${fmt(s.worst, 0)} ms`, color: colorForGap(s.worst) });
        lines.push({ label: `Hitches >${HITCH_MS}ms`, value: s.hitches ? `${s.hitches} in 10 s, last ${fmt(s.lastHitchAgo)} s ago` : 'none in 10 s', color: s.hitches ? (s.hitches > 3 ? BAD : WARN) : GOOD });
        const budget = 1000 / Math.max(30, s.refreshHz || 60);
        lines.push({ label: 'Logic / draw', value: `${fmt(s.update, 2)} / ${fmt(s.render, 2)} ms  (max ${fmt(s.renderMax)})`, color: (s.update + s.render) > budget * 0.8 ? BAD : (s.update + s.render) > budget * 0.5 ? WARN : GOOD });
        // the rest of each frame is spent outside the game's code: the browser putting the drawing on screen (the GPU), garbage collection, other tabs
        const elsewhere = Math.max(0, s.avgGap - s.update - s.render);
        lines.push({ label: 'GPU / browser', value: `${fmt(elsewhere)} ms per frame`, color: s.avgGap > budget * 1.3 && elsewhere > (s.update + s.render) ? BAD : MUTED_OK });

        const canvas = info.canvas;
        if (canvas) {
            const r = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            lines.push({ label: 'Canvas', value: `${canvas.width}x${canvas.height} -> ${Math.round(r.width * dpr)}x${Math.round(r.height * dpr)} px` });
            lines.push({ label: 'Display scale', value: `${Math.round(dpr * 100)}%  window ${window.innerWidth}x${window.innerHeight}` });
        }
        lines.push({ label: 'GPU', value: readGpuName() });
        if (performance.memory) lines.push({ label: 'JS memory', value: `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB` });
        lines.push({ label: 'Scene', value: String(info.scene || '?') });
        const wm = info.worldManager;
        if (wm && wm.chunks && (info.scene === 'overworld' || info.scene === 'encounter' || info.scene === 'battle')) {
            lines.push({ label: 'World', value: `${wm.chunks.size} chunks, ${wm.objects ? wm.objects.size : 0} objects` });
            if (info.player) lines.push({ label: 'Position', value: `${info.player.col}, ${info.player.row}  chunk ${Math.floor(info.player.col / 16)}, ${Math.floor(info.player.row / 16)}` });
        }
        return lines;
    }

    /** `text` cut with … to fit `maxW` px in the context's current font */
    _fit(ctx, text, maxW) {
        if (ctx.measureText(text).width <= maxW) return text;
        let t = text;
        while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
        return t + '…';
    }

    /** The last GRAPH_FRAMES frame gaps as bars (newest on the right), with the 60 fps and 30 fps lines. */
    _drawGraph(ctx, x, y, w, h) {
        const t = this.loop.timing;
        const maxMs = 50;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(x, y, w, h);
        const n = Math.min(GRAPH_FRAMES, t.count);
        const bw = w / GRAPH_FRAMES;
        for (let k = 0; k < n; k++) {
            const i = (t.next - 1 - k + t.size) % t.size;
            const gap = t.gap[i];
            const bh = Math.max(1, Math.min(h, (gap / maxMs) * h));
            ctx.fillStyle = colorForGap(gap);
            ctx.fillRect(x + w - (k + 1) * bw, y + h - bh, Math.max(1, bw - 0.5), bh);
        }
        ctx.font = '14px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        for (const [ms, label] of [[1000 / 60, '60'], [1000 / 30, '30']]) {
            const ly = Math.round(y + h - (ms / maxMs) * h) + 0.5;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + w, ly); ctx.stroke();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText(`${label} fps`, x + w - 2, ly - 1);
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = UITheme.colors.textMuted;
        ctx.fillText(`frame times, last ${GRAPH_FRAMES} frames (0-${maxMs} ms)`, x, y + h + 4);
    }
}
