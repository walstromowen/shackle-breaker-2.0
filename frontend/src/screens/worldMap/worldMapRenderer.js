import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { MinimapRenderer } from '../../ui/minimapRenderer.js';
import { BLOCK } from '../../../../shared/world/exploredMap.js';
import { gameState } from '../../../../shared/core/gameState.js';
import { MAP_OBJECTS_DEFINITIONS } from '../../../../shared/world/mapObjectDefinitions.js';
import { VIEW } from './worldMapController.js';

/* WorldMapRenderer - draws the world map screen (see worldMapController.js).
 *
 * The land is painted with the minimap's own painter (MinimapRenderer._paint: the same colours for every biome and cliff level), a chunk of 16 x 16 tiles at a time,
 * at PAINT_ZOOM pixels a tile, and only for chunks that hold something the party has seen. Each painted chunk is then copied to a second canvas with every block the
 * party has NOT seen cut out (transparent), so what is not known is not on the map even for a single frame, and a frame is one drawImage per chunk in view. New
 * chunks are painted a few at a time within a time budget, nearest the middle of the window first, so opening the map or zooming out never stalls.
 * The unknown is a dark, faintly gridded ground; the party is a gold arrow with a pulsing ring.
 */

const PAINT_ZOOM = 4;          // pixels per tile in the painted chunk canvases
const CHUNK = 16;              // tiles along one side of a painted chunk (the minimap painter's own size)
const BUDGET_MS = 8;           // painting time per frame
const NICE = [5, 10, 20, 50, 100, 200, 500, 1000, 2000];   // lengths (tiles) a scale bar may have

export class WorldMapRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
        this.painter = new MinimapRenderer({ ...config, MINIMAP: { ...(config.MINIMAP || {}), zoom: PAINT_ZOOM, outline: 1 } });
        this.painter.cfg.maxChunks = Infinity;
        this._wm = null;
        this._masked = new Map();   // "cx,cy" -> { cv, ver (the painted version it was made from), xv (the explored version) }
        this._houses = null;        // { t, list } the buildings the world has placed, as { x, y, w, h } in tiles (see _buildings)
    }

    _reset(wm) {
        this._wm = wm;
        this.painter._wm = wm;
        this.painter._chunks.clear();
        this.painter._inside = false;
        this._masked.clear();
        this._houses = null;
    }

    /* Every building the world has placed (the village houses, smithies, workshops): a solid object of 6 or more tiles that does nothing when touched, the minimap's own rule. They are
       read from the world's changes, where the villages write them, so a house is on the map when its village was generated, however far away the party has walked since. Cached for a second. */
    _buildings() {
        const now = performance.now();
        if (this._houses && now - this._houses.t < 1000) return this._houses.list;
        const list = [];
        const changes = (gameState.world && gameState.world.changes) || {};
        for (const key in changes) {
            const def = changes[key] && MAP_OBJECTS_DEFINITIONS[changes[key]];
            if (!def || def.isGround || !def.isSolid || def.interaction) continue;
            const w = def.width || 1, h = def.height || 1;
            if (w * h < 6) continue;
            const [col, row] = key.split(',').map(Number);
            list.push({ x: col, y: row - (h - 1), w, h });   // a tall object stands on its row and rises above it
        }
        this._houses = { t: now, list };
        return list;
    }

    /* The painted-and-masked canvas of chunk (cx, cy), or null when nothing there has been seen or it is not painted yet. Paints within `deadline`. */
    _chunk(wm, explored, cx, cy, ver, deadline) {
        const key = cx + ',' + cy;
        // anything seen in it? (a chunk is 4 x 4 blocks)
        const bpc = CHUNK / BLOCK;
        let seen = false;
        for (let by = cy * bpc; by < cy * bpc + bpc && !seen; by++) for (let bx = cx * bpc; bx < cx * bpc + bpc; bx++) if (explored.hasBlock(bx, by)) { seen = true; break; }
        if (!seen) return null;
        let e = this.painter._chunks.get(key);
        if (!e) { e = { cx, cy, cv: null, ctx: null, ver: -1, job: null }; this.painter._chunks.set(key, e); }
        if (e.ver !== ver && performance.now() < deadline) this.painter._paint(e, wm, ver, deadline);
        if (e.ver < 0) return null;   // still waiting for its turn
        let m = this._masked.get(key);
        if (!m) { m = { cv: document.createElement('canvas'), ver: -2, xv: -1 }; m.cv.width = m.cv.height = CHUNK * PAINT_ZOOM; this._masked.set(key, m); }
        if (m.ver !== e.ver || m.xv !== explored.version) {
            const g = m.cv.getContext('2d'), Z = BLOCK * PAINT_ZOOM;
            g.clearRect(0, 0, m.cv.width, m.cv.height);
            g.drawImage(e.cv, 0, 0);
            for (let by = 0; by < bpc; by++) for (let bx = 0; bx < bpc; bx++) {
                if (!explored.hasBlock(cx * bpc + bx, cy * bpc + by)) g.clearRect(bx * Z, by * Z, Z, Z);
            }
            m.ver = e.ver; m.xv = explored.version;
        }
        return m.cv;
    }

    render(ctx, state) {
        const ui = new CanvasUI(ctx);
        const W = ctx.canvas.width, H = ctx.canvas.height;
        ui.clearScreen(W, H);
        const { worldManager: wm, explored, cx, cy, scale, player } = state;

        // the frame, the title and what the pointer is over
        const panel = { x: 48, y: 48, w: W - 96, h: VIEW.y + VIEW.h + 24 - 48 };
        ui.drawPanel(panel.x, panel.y, panel.w, panel.h, UITheme.colors.bgScale[0]);
        ui.drawStyled('heading', 'World Map', VIEW.x, 100);
        ui.drawLineWithGothicFlourish(VIEW.x, 114, VIEW.w, UITheme.colors.borderHighlight);
        ui.drawStyled('label', this._readout(state), VIEW.x + VIEW.w, 96, { align: 'right' });

        // the window: the unknown is dark ground with a faint grid, the seen land is drawn over it
        ctx.save();
        ctx.beginPath();
        ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
        ctx.clip();
        ctx.fillStyle = '#0c0b09';
        ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
        const mx = VIEW.x + VIEW.w / 2, my = VIEW.y + VIEW.h / 2;
        const sx = (col) => mx + (col - cx) * scale, sy = (row) => my + (row - cy) * scale;
        const left = cx - VIEW.w / 2 / scale, right = cx + VIEW.w / 2 / scale, top = cy - VIEW.h / 2 / scale, bottom = cy + VIEW.h / 2 / scale;
        this._grid(ctx, sx, sy, left, right, top, bottom, scale);

        if (wm && explored) {
            if (wm !== this._wm) this._reset(wm);
            const ver = (wm.terrain && wm.terrain.overrideVersion) || 0;
            const c0 = Math.floor(left / CHUNK), c1 = Math.floor(right / CHUNK), r0 = Math.floor(top / CHUNK), r1 = Math.floor(bottom / CHUNK);
            const todo = [];
            for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) todo.push([c, r]);
            const mcx = cx / CHUNK, mcy = cy / CHUNK;
            todo.sort((a, b) => Math.hypot(a[0] + 0.5 - mcx, a[1] + 0.5 - mcy) - Math.hypot(b[0] + 0.5 - mcx, b[1] + 0.5 - mcy));
            const deadline = performance.now() + BUDGET_MS;
            ctx.imageSmoothingEnabled = scale < PAINT_ZOOM;
            ctx.imageSmoothingQuality = 'high';
            for (const [c, r] of todo) {
                const cv = this._chunk(wm, explored, c, r, ver, deadline);
                if (!cv) continue;
                const x0 = Math.round(sx(c * CHUNK)), y0 = Math.round(sy(r * CHUNK));
                const x1 = Math.round(sx((c + 1) * CHUNK)), y1 = Math.round(sy((r + 1) * CHUNK));
                ctx.drawImage(cv, x0, y0, x1 - x0, y1 - y0);
            }
        }

        // the buildings, on the land the party has seen
        if (wm && explored) {
            ctx.fillStyle = this.painter.cfg.buildings || '#7a5a3c';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.lineWidth = 1;
            for (const b of this._buildings()) {
                if (b.x + b.w < left || b.x > right || b.y + b.h < top || b.y > bottom) continue;
                if (!explored.has(b.x + (b.w >> 1), b.y + (b.h >> 1))) continue;
                const x0 = Math.round(sx(b.x)), y0 = Math.round(sy(b.y));
                const w = Math.max(2, Math.round(sx(b.x + b.w)) - x0), h = Math.max(2, Math.round(sy(b.y + b.h)) - y0);
                ctx.fillRect(x0, y0, w, h);
                if (w >= 8) ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
            }
        }

        this._party(ctx, sx(player.x), sy(player.y), player.direction, scale);
        ctx.restore();

        // the edge of the window, then the scale bar and the compass on top of it
        ctx.save();
        ctx.strokeStyle = UITheme.colors.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(VIEW.x - 1, VIEW.y - 1, VIEW.w + 2, VIEW.h + 2);
        ctx.restore();
        this._scaleBar(ctx, ui, scale);
        this._compass(ctx, ui);

        // buttons, and the key help between them and the Back button (the Back button itself is drawn by SceneManager)
        for (const b of state.hitboxes) {
            if (!b.label) continue;
            ui.drawButton(b.x, b.y, b.w, b.h, b.label, ui.flags(b.id, state.hoveredHitboxId));
        }
        ui.drawStyled('hint', 'Arrows pan  ·  Wheel zooms  ·  F fits all  ·  C centers', 820, H - 48 - 28, { maxWidth: 900 });
    }

    /* Top right: what is under the pointer (only land that has been seen is named), else the tile in the middle. */
    _readout(state) {
        const { explored, worldManager: wm, hover } = state;
        const col = Math.floor(hover ? hover.col : state.cx), row = Math.floor(hover ? hover.row : state.cy);
        const place = `${col}, ${row}`;
        if (!hover) return place;
        if (!explored || !explored.has(col, row)) return `Unexplored  ·  ${place}`;
        const biome = wm && wm.getBiomeAt ? wm.getBiomeAt(col, row) : null;
        const id = biome && biome.id;
        const name = id ? String(id).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()) : 'Explored';
        return `${name}  ·  ${place}`;
    }

    /* A faint line every 64 tiles, so panning shows movement even over unknown ground. */
    _grid(ctx, sx, sy, left, right, top, bottom, scale) {
        const step = scale >= 2 ? 64 : 256;
        ctx.save();
        ctx.strokeStyle = 'rgba(168, 146, 112, 0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c = Math.ceil(left / step) * step; c <= right; c += step) { const x = Math.round(sx(c)) + 0.5; ctx.moveTo(x, VIEW.y); ctx.lineTo(x, VIEW.y + VIEW.h); }
        for (let r = Math.ceil(top / step) * step; r <= bottom; r += step) { const y = Math.round(sy(r)) + 0.5; ctx.moveTo(VIEW.x, y); ctx.lineTo(VIEW.x + VIEW.w, y); }
        ctx.stroke();
        ctx.restore();
    }

    /* The party: an arrow that points the way it faces, in a pulsing gold ring. */
    _party(ctx, x, y, direction, scale) {
        const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
        const d = DIRS[direction] || DIRS.down, p = [-d[1], d[0]];
        const pulse = (Math.sin(performance.now() * 0.004) + 1) / 2;
        const k = Math.max(1, Math.min(1.8, 0.7 + scale / 8));   // the arrow grows a little as the map zooms in
        ctx.save();
        ctx.strokeStyle = `rgba(255, 210, 90, ${0.35 + pulse * 0.4})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, (16 + pulse * 7) * k, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + d[0] * 13 * k, y + d[1] * 13 * k);
        ctx.lineTo(x - d[0] * 7 * k + p[0] * 9 * k, y - d[1] * 7 * k + p[1] * 9 * k);
        ctx.lineTo(x - d[0] * 3 * k, y - d[1] * 3 * k);
        ctx.lineTo(x - d[0] * 7 * k - p[0] * 9 * k, y - d[1] * 7 * k - p[1] * 9 * k);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    /* Bottom right of the window: a bar of a round number of tiles. */
    _scaleBar(ctx, ui, scale) {
        let tiles = NICE[0];
        for (const n of NICE) { tiles = n; if (n * scale >= 110) break; }
        const w = Math.round(tiles * scale), x1 = VIEW.x + VIEW.w - 28, x0 = x1 - w, y = VIEW.y + VIEW.h - 30;
        ctx.save();
        ctx.fillStyle = 'rgba(12, 11, 9, 0.7)';
        ctx.fillRect(x0 - 16, y - 44, w + 32, 66);
        ctx.strokeStyle = UITheme.colors.textMain;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0, y - 8); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y - 8);
        ctx.stroke();
        ctx.restore();
        ui.drawStyled('label', `${tiles} tiles`, (x0 + x1) / 2, y - 14, { align: 'center' });
    }

    /* Top right of the window: which way is north (the map never turns). */
    _compass(ctx, ui) {
        const x = VIEW.x + VIEW.w - 52, y = VIEW.y + 62;
        ctx.save();
        ctx.fillStyle = 'rgba(12, 11, 9, 0.7)';
        ctx.beginPath();
        ctx.arc(x, y, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = UITheme.colors.border;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = UITheme.colors.textHighlight;
        ctx.beginPath();
        ctx.moveTo(x, y - 24); ctx.lineTo(x + 8, y + 4); ctx.lineTo(x, y - 2); ctx.lineTo(x - 8, y + 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ui.drawStyled('badge', 'N', x, y + 20, { color: UITheme.colors.textMuted, align: 'center', baseline: 'middle' });
    }
}
