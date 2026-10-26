import { BaseController } from '../../engine/baseController.js';
import { events } from '../../../../shared/core/eventBus.js';
import { ExploredMap } from '../../../../shared/world/exploredMap.js';
import { gameState } from '../../../../shared/core/gameState.js';
import { getWaypoints, planFastTravel, chargeFastTravel, waypointName } from '../../../../shared/world/waypoints.js';

/* WorldMapController - the world map screen (opened from the overworld menu, key N): the land the party has SEEN, north up, which can be panned and zoomed.
 * Nothing that has not been seen is on it (shared/world/exploredMap.js decides what has), the party's own spot is.
 *
 * Keys:   arrow keys / W A S D pan (hold Shift to go faster), + / - (also Q / E) or the wheel zoom, F fits everything seen, C or Space centres on the party,
 *         T (or a click on a banner) picks a waypoint, Enter (or the Fast Travel button) pays and goes to it, Esc / N / right-click leaves. The mouse can drag the map, too, and the buttons at the bottom right do the same as the keys.
 * Zoom:   a list of scales (pixels per tile); the picture eases to the chosen one, keeping the point under the mouse (or the middle of the map) where it is.
 *
 * The screen is 1920 x 1080 like the others (the canvas is that size; see UITheme.backButtonBox). VIEW is the map's window. */

export const VIEW = { x: 72, y: 128, w: 1776, h: 772 };
export const ZOOM_LEVELS = [1, 1.5, 2, 3, 4, 6, 8, 12];   // screen pixels per tile
export const DEFAULT_ZOOM = 4;
const PAN_SPEED = 640;           // screen pixels per second while an arrow key is held
const PAN_FAST = 2.5;            // times faster with Shift
const EASE = 12;                 // how fast the zoom catches up with its target (per second)
const MARGIN_TILES = 24;         // how far past the seen land the middle of the map may go

const BUTTONS = [
    { id: 'btn_zoom_out', label: '−', w: 76 },
    { id: 'btn_zoom_in', label: '+', w: 76 },
    { id: 'btn_center', label: 'Center', w: 190 },
    { id: 'btn_fit', label: 'Fit All', w: 190 }
];

export class WorldMapController extends BaseController {
    constructor(input) {
        super(input);
        // M (the key that opened it) closes it, like Esc. The zoom and view keys are the screen's own.
        this.extraBindings = {
            KeyM: 'CANCEL',
            Equal: 'ZOOM_IN', NumpadAdd: 'ZOOM_IN', KeyE: 'ZOOM_IN',
            Minus: 'ZOOM_OUT', NumpadSubtract: 'ZOOM_OUT', KeyQ: 'ZOOM_OUT',
            KeyF: 'FIT', KeyC: 'CENTER', Space: 'CENTER', Enter: 'CENTER', KeyT: 'NEXT_WAYPOINT'
        };
        this.worldManager = null;
        this.player = { x: 0, y: 0, direction: 'down' };
        this.cx = 0; this.cy = 0;                 // the tile in the middle of the window
        this.scale = DEFAULT_ZOOM;                // pixels per tile now (eases to targetScale)
        this.targetScale = DEFAULT_ZOOM;
        this.anchor = null;                       // { x, y } screen point the zoom keeps still (null = the middle of the window)
        this.drag = null;                         // { x, y } while the mouse drags the map
        this.explored = null;
        this.hitboxes = [];
        this.selectedId = null;                   // the waypoint picked on the map (its id), or null
        this.notice = null;                       // { text, until } a line the map shows for a moment ("not enough currency")
    }

    init(data = {}) {
        this.worldManager = data.worldManager || null;
        this.player = { x: Number.isFinite(data.x) ? data.x : 0, y: Number.isFinite(data.y) ? data.y : 0, direction: data.direction || 'down' };
        this.explored = ExploredMap.of();
        this.scale = this.targetScale = DEFAULT_ZOOM;
        this.anchor = null;
        this.drag = null;
        this.selectedId = null;
        this.notice = null;
        this.centerOnParty();
        this.startInKeyboardMode();
        console.log('[WorldMapController] Initialized');
    }

    // ---- view ----------------------------------------------------------------------------------------------------------------------------------

    centerOnParty() {
        this.cx = this.player.x;
        this.cy = this.player.y;
        this.targetScale = this.scale = Math.max(this.scale, ZOOM_LEVELS[0]);
        this._clamp();
    }

    /* Zoom and centre so that everything seen fits the window, with a little room round it. */
    fit() {
        const b = this.explored && this.explored.bounds();
        if (!b) { this.centerOnParty(); return; }
        const w = b.maxCol - b.minCol + 1 + 8, h = b.maxRow - b.minRow + 1 + 8;
        const s = Math.min(VIEW.w / w, VIEW.h / h);
        this.cx = (b.minCol + b.maxCol + 1) / 2;
        this.cy = (b.minRow + b.maxRow + 1) / 2;
        this.anchor = null;
        this.targetScale = Math.max(ZOOM_LEVELS[0] * 0.5, Math.min(ZOOM_LEVELS[ZOOM_LEVELS.length - 1], s));
        this._clamp();
    }

    /* One step along ZOOM_LEVELS from the current target; `anchor` is the screen point to keep still (the mouse for the wheel). */
    zoomStep(dir, anchor = null) {
        const cur = this.targetScale;
        let next = cur;
        if (dir > 0) next = ZOOM_LEVELS.find(z => z > cur + 1e-6) ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
        else next = [...ZOOM_LEVELS].reverse().find(z => z < cur - 1e-6) ?? ZOOM_LEVELS[0];
        if (next === cur) return false;
        this.targetScale = next;
        this.anchor = anchor;
        return true;
    }

    _clamp() {
        const b = this.explored && this.explored.bounds();
        const x0 = Math.min(b ? b.minCol : this.player.x, this.player.x) - MARGIN_TILES, x1 = Math.max(b ? b.maxCol : this.player.x, this.player.x) + MARGIN_TILES;
        const y0 = Math.min(b ? b.minRow : this.player.y, this.player.y) - MARGIN_TILES, y1 = Math.max(b ? b.maxRow : this.player.y, this.player.y) + MARGIN_TILES;
        this.cx = Math.max(x0, Math.min(x1, this.cx));
        this.cy = Math.max(y0, Math.min(y1, this.cy));
    }

    /* The tile under a screen point. */
    tileAt(sx, sy) {
        return { col: this.cx + (sx - (VIEW.x + VIEW.w / 2)) / this.scale, row: this.cy + (sy - (VIEW.y + VIEW.h / 2)) / this.scale };
    }

    _held(...codes) {
        const keys = this.input && this.input.heldKeys;
        return !!keys && codes.some(c => keys.has(c));
    }

    update(dt) {
        if (!this.explored) return;
        // pan with the arrow keys (or WASD); the same screen distance at every zoom
        let dx = 0, dy = 0;
        if (this._held('ArrowLeft', 'KeyA')) dx -= 1;
        if (this._held('ArrowRight', 'KeyD')) dx += 1;
        if (this._held('ArrowUp', 'KeyW')) dy -= 1;
        if (this._held('ArrowDown', 'KeyS')) dy += 1;
        if (dx || dy) {
            const len = Math.hypot(dx, dy), fast = this._held('ShiftLeft', 'ShiftRight') ? PAN_FAST : 1;
            this.cx += (dx / len) * PAN_SPEED * fast * dt / this.scale;
            this.cy += (dy / len) * PAN_SPEED * fast * dt / this.scale;
            this.noteKeyboardInput();
        }
        // ease the zoom, keeping the anchor's tile where it is
        if (Math.abs(this.scale - this.targetScale) > 1e-3) {
            const ax = this.anchor ? this.anchor.x : VIEW.x + VIEW.w / 2, ay = this.anchor ? this.anchor.y : VIEW.y + VIEW.h / 2;
            const before = this.tileAt(ax, ay);
            this.scale += (this.targetScale - this.scale) * Math.min(1, dt * EASE);
            if (Math.abs(this.scale - this.targetScale) <= 1e-3) this.scale = this.targetScale;
            const after = this.tileAt(ax, ay);
            this.cx += before.col - after.col;
            this.cy += before.row - after.row;
        }
        this._clamp();
    }

    // ---- input ---------------------------------------------------------------------------------------------------------------------------------

    _inView(x, y) { return x >= VIEW.x && x <= VIEW.x + VIEW.w && y >= VIEW.y && y <= VIEW.y + VIEW.h; }

    handleMouseMove(x, y, isMouseDown, renderer) {
        const px = this.mouse.x, py = this.mouse.y;
        super.handleMouseMove(x, y, isMouseDown, renderer);
        if (!isMouseDown) { this.drag = null; return; }
        if (!this.drag) {
            // a press that starts on the map (not on a button) drags it
            if (!this.hoveredHitboxId && this._inView(px, py)) this.drag = { x: px, y: py };
            else return;
        }
        this.cx -= (x - this.drag.x) / this.scale;
        this.cy -= (y - this.drag.y) / this.scale;
        this.drag = { x, y };
        this._clamp();
    }

    handleScroll(delta) {
        if (!this._inView(this.mouse.x, this.mouse.y)) return;
        this.claimSfx();
        this.zoomStep(delta < 0 ? 1 : -1, { x: this.mouse.x, y: this.mouse.y });
    }

    // ---- waypoints -----------------------------------------------------------------------------------------------------------------------------

    selectedWaypoint() {
        return getWaypoints().find((w) => w.id === this.selectedId) || null;
    }

    select(id) {
        this.selectedId = id;
        const wp = this.selectedWaypoint();
        if (wp) { this.cx = wp.col; this.cy = wp.row; this._clamp(); }
    }

    nextWaypoint() {
        const list = getWaypoints();
        if (!list.length) { this.say('You have not planted a waypoint yet.'); return false; }
        const i = list.findIndex((w) => w.id === this.selectedId);
        this.select(list[(i + 1) % list.length].id);
        return true;
    }

    say(text) {
        this.notice = { text, until: performance.now() + 2600 };
    }

    /* What a fast travel from where the party stands to the picked waypoint takes: { tiles, cost, minutes, affordable }, or null with nothing picked. */
    travelPlan() {
        const wp = this.selectedWaypoint();
        if (!wp) return null;
        return planFastTravel({ col: gameState.player.col, row: gameState.player.row }, wp, gameState.party.currency || 0);
    }

    /* Pay and go: the scene manager puts the party down beside the banner and moves the clock (CHANGE_SCENE's fastTravel). */
    fastTravel() {
        const wp = this.selectedWaypoint();
        const plan = this.travelPlan();
        if (!wp || !plan) { this.playErrorSound(); this.say('Pick a waypoint first.'); return false; }
        if (plan.tiles < 3) { this.playErrorSound(); this.say('You are already there.'); return false; }
        if (!plan.affordable) { this.playErrorSound(); this.say(`Not enough currency: the trip costs ${plan.cost}.`); return false; }
        if (!chargeFastTravel(plan)) { this.playErrorSound(); return false; }
        this.playConfirmSound();
        events.emit('CHANGE_SCENE', { scene: 'overworld', data: { fastTravel: { id: wp.id, minutes: plan.minutes } } });
        return true;
    }

    onClick(hitboxId) {
        if (hitboxId && hitboxId.startsWith('wp_')) { this.playConfirmSound(); this.select(Number(hitboxId.slice(3))); return; }
        switch (hitboxId) {
            case 'btn_fast_travel': this.fastTravel(); break;
            case 'btn_zoom_in': if (this.zoomStep(1)) this.playConfirmSound(); else this.playErrorSound(); break;
            case 'btn_zoom_out': if (this.zoomStep(-1)) this.playConfirmSound(); else this.playErrorSound(); break;
            case 'btn_center': this.playConfirmSound(); this.centerOnParty(); break;
            case 'btn_fit': this.playConfirmSound(); this.fit(); break;
            case 'btn_back': this.exit(); break;
            default: this.claimSfx(); break;   // a click on the map itself (a drag ends in one): silent
        }
    }

    onRightClick() {
        this.exit();
    }

    handleKeyDown(code, e) {
        const intent = this.resolveIntent(code, e);
        switch (intent) {
            case 'CANCEL': this.exit(); break;
            case 'ZOOM_IN': if (this.zoomStep(1)) this.playNavSound(); break;
            case 'ZOOM_OUT': if (this.zoomStep(-1)) this.playNavSound(); break;
            case 'FIT': this.playConfirmSound(); this.fit(); break;
            case 'CENTER':
                if (e && e.preventDefault) e.preventDefault();
                if ((e && e.code || code) === 'Enter' && this.selectedWaypoint()) { this.fastTravel(); break; }   // Enter goes to the picked waypoint; with none picked it centres, like Space
                this.playConfirmSound(); this.centerOnParty(); break;
            case 'NEXT_WAYPOINT': if (this.nextWaypoint()) this.playNavSound(); else this.playErrorSound(); break;
            default: break;
        }
        // the arrow keys scroll the page in some browsers: never here
        if (e && e.preventDefault && /^Arrow/.test(e.code || code)) e.preventDefault();
    }

    exit() {
        this.playCancelSound();
        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }

    // ---- state for the renderer ------------------------------------------------------------------------------------------------------------------

    getState() {
        // the buttons sit in a row at the bottom right, level with the Back button
        const hitboxes = [];
        let x = 1920 - 48;
        const y = 1080 - 48 - 76;
        for (const b of BUTTONS) {
            x -= b.w;
            hitboxes.push({ id: b.id, x, y, w: b.w, h: 76, zIndex: 10, label: b.label });
            x -= 16;
        }
        // a hitbox on every banner in view, and the Fast Travel button while one is picked
        const sx = (col) => VIEW.x + VIEW.w / 2 + (col - this.cx) * this.scale, sy = (row) => VIEW.y + VIEW.h / 2 + (row - this.cy) * this.scale;
        const banners = [];
        for (const wp of getWaypoints()) {
            const x = sx(wp.col + 0.5), y = sy(wp.row + 1);
            if (x < VIEW.x - 20 || x > VIEW.x + VIEW.w + 20 || y < VIEW.y || y > VIEW.y + VIEW.h + 50) continue;
            banners.push({ wp, x, y });
            hitboxes.push({ id: 'wp_' + wp.id, x: x - 22, y: y - 54, w: 44, h: 62, zIndex: 5 });
        }
        const picked = this.selectedWaypoint();
        const plan = picked ? this.travelPlan() : null;
        const panel = { x: VIEW.x + 20, y: VIEW.y + VIEW.h - 150, w: 660, h: 130 };
        if (picked) hitboxes.push({ id: 'btn_fast_travel', x: panel.x + panel.w - 210, y: panel.y + panel.h - 72, w: 190, h: 56, zIndex: 11, label: 'Fast Travel' });
        this.hitboxes = hitboxes;
        this.updateHitboxes(hitboxes);

        const hover = this._inView(this.mouse.x, this.mouse.y) && !this.hoveredHitboxId && this.inputMode === 'mouse' ? this.tileAt(this.mouse.x, this.mouse.y) : null;
        return {
            worldManager: this.worldManager,
            explored: this.explored,
            cx: this.cx, cy: this.cy, scale: this.scale,
            player: this.player,
            hover,
            hitboxes: this.getHitboxes(),
            hoveredHitboxId: this.getFocusId(),
            dragging: !!this.drag,
            banners,
            selectedWaypoint: picked ? { ...picked, name: waypointName(picked) } : null,
            travelPlan: plan,
            currency: gameState.party.currency || 0,
            panel,
            notice: this.notice && performance.now() < this.notice.until ? this.notice.text : null
        };
    }
}
