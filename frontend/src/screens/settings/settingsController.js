/**
 * frontend/src/screens/settings/settingsController.js
 *
 * The Settings screen, in two tabs:
 *   Sound     one slider each for Master, Music, Effects and Ambience volume.
 *             - the sliders change the sound at once (AudioManager.setVolume) and are remembered in this browser
 *             - Test Sound plays a battle cry through the Effects slider, so the player can balance it against the music
 *   Display   Graphics: Auto / Full / Light (engine/graphics.js), and whether the browser is drawing with the graphics card at all.
 *   Controls  one page per screen of the game (the same cards the first-visit tips show, from ui/tutorialData.js), so the controls
 *             can be looked up at any time. The pages are tabs down the left; Replay Tips forgets which cards have been seen, so each
 *             shows again the next time its screen opens.
 *
 * Opened from the title screen (data.from = 'title') or from the in-game System screen (data.from = 'game').
 *
 * Mouse: click a tab, click a bar to jump there, or hold and drag. Keyboard: Q / E switch tab; Up / Down choose a row (a page, in
 * Controls); Left / Right move a slider by 5%.
 */
import { BaseController } from '../../engine/baseController.js';
import { events } from '../../../../shared/core/eventBus.js';
import { audioManager, AUDIO_CHANNELS } from '../../engine/audioManager.js';
import { tipStore } from '../../ui/tutorialOverlay.js';
import { TIP_SCENES } from '../../ui/tutorialData.js';
import { graphics, GRAPHICS_MODES } from '../../engine/graphics.js';

const CHANNEL_ORDER = ['master', 'music', 'sfx', 'ambient', 'voice'];
const TABS = ['sound', 'display', 'controls'];
const TAB_LABELS = { sound: 'Sound', display: 'Display', controls: 'Controls' };
const STEP = 0.05;
const TEST_SOUNDS = ['wolfCry', 'legionaryCry', 'madmanCry', 'dogCry'];

export class SettingsController extends BaseController {
    constructor(input) {
        super(input);

        this.extraBindings = { KeyQ: 'PREV_TAB', KeyE: 'NEXT_TAB' };

        this.layout = {
            panelX: 160, panelY: 48, panelW: 1600, panelH: 888,
            tabsY: 214, tabW: 300, tabH: 64,
            rowsY: 324, rowH: 92,       // five sliders (master, music, sfx, ambient, voice) clear of the Test / Reset buttons below
            labelX: 120, trackX: 480, trackW: 820, valueX: 1350,
            // Controls: the pages in two columns on the left (12 of them did not fit in one), the card on the right
            pagesX: 56, pagesY: 316, pageW: 210, pageH: 50, pageGap: 8, pageCols: 2,
            cardX: 540, cardY: 306, cardW: 1004,
            btnH: 76
        };

        this.active = false;
        this.from = 'title';
        this.tab = 'sound';
        this.page = 0;            // index into TIP_SCENES: the Controls page that is showing
        this.kbFocus = 'slider_master';
        this.draggingChannel = null;
        this.tipsReset = false;
        this.testIndex = 0;
        this.lastPreviewAt = 0;
        this.updateHitboxes([]);
    }

    /** Called by SceneManager each time the screen opens. data: { from: 'game' | 'title', tab?: 'sound' | 'controls' } */
    init(data = {}) {
        this.active = true;
        this.from = data.from === 'game' ? 'game' : 'title';
        this.tab = TABS.includes(data.tab) ? data.tab : 'sound';
        this.page = 0;
        this.kbFocus = this.tab === 'sound' ? 'slider_master' : this.tab === 'display' ? `gfx_${graphics.mode}` : 'page_0';
        this.draggingChannel = null;
        this.tipsReset = false;
        this.hoveredHitboxId = null;
        this.startInKeyboardMode();
    }

    // ========================================================
    // FOCUS
    // ========================================================
    getKeyboardFocusId() { return this.kbFocus; }
    setFocusFromPointer(hitboxId) { this.kbFocus = hitboxId; }

    _focusOrder() {
        const tabs = TABS.map(t => `tab_${t}`);
        if (this.tab === 'controls') {
            return [...tabs, ...TIP_SCENES.map((_, i) => `page_${i}`), 'btn_tips', 'btn_done'];
        }
        if (this.tab === 'display') return [...tabs, ...GRAPHICS_MODES.map(m => `gfx_${m}`), 'btn_done'];
        return [...tabs, ...CHANNEL_ORDER.map(c => `slider_${c}`), 'btn_test', 'btn_reset', 'btn_done'];
    }

    _buttonIds() {
        if (this.tab === 'display') return [...GRAPHICS_MODES.map(m => `gfx_${m}`), 'btn_done'];
        return this.tab === 'controls' ? ['btn_tips', 'btn_done'] : ['btn_test', 'btn_reset', 'btn_done'];
    }

    // ========================================================
    // TABS AND PAGES
    // ========================================================
    _setTab(tab) {
        if (!TABS.includes(tab) || tab === this.tab) return false;
        this.tab = tab;
        this.draggingChannel = null;
        this.kbFocus = `tab_${tab}`;
        return true;
    }

    _pageOf(hitboxId) {
        if (!hitboxId || !hitboxId.startsWith('page_')) return -1;
        const i = parseInt(hitboxId.slice('page_'.length), 10);
        return i >= 0 && i < TIP_SCENES.length ? i : -1;
    }

    // ========================================================
    // VOLUME
    // ========================================================
    _channelOf(hitboxId) {
        if (!hitboxId || !hitboxId.startsWith('slider_')) return null;
        const channel = hitboxId.slice('slider_'.length);
        return AUDIO_CHANNELS[channel] ? channel : null;
    }

    _trackBox(channel) {
        const L = this.layout;
        const index = CHANNEL_ORDER.indexOf(channel);
        return { x: L.panelX + L.trackX, y: L.rowsY + index * L.rowH, w: L.trackW, h: 64 };
    }

    /** Where the pointer is right now (this.mouse only catches up a frame later, which matters for a tap that arrives with no prior move). */
    _pointerX() {
        const p = this.input && this.input.getMousePosition ? this.input.getMousePosition() : null;
        return p && Number.isFinite(p.x) ? p.x : this.mouse.x;
    }

    _setFromMouse(channel, mouseX) {
        const box = this._trackBox(channel);
        let v = (mouseX - box.x) / box.w;
        v = Math.max(0, Math.min(1, v));
        v = Math.round(v * 100) / 100;
        if (v < 0.02) v = 0;
        if (v > 0.98) v = 1;
        audioManager.setVolume(channel, v);
    }

    /** A short sound after a change, so the player hears the new level (not for Music and Ambience: those are already playing). */
    _preview(channel) {
        const now = performance.now();
        if (now - this.lastPreviewAt < 140) return;
        this.lastPreviewAt = now;
        if (channel === 'sfx') this._playTest();
        else if (channel === 'master') this.playSfx('cinematicBoom', 0.5);
    }

    _playTest() {
        this.playSfx(TEST_SOUNDS[this.testIndex % TEST_SOUNDS.length], 0.8);
        this.testIndex++;
    }

    // ========================================================
    // INPUT
    // ========================================================
    onClick(hitboxId) {
        if (!hitboxId) return;
        this.kbFocus = hitboxId;
        const channel = this._channelOf(hitboxId);
        const page = this._pageOf(hitboxId);
        if (hitboxId.startsWith('tab_')) {
            if (!this._setTab(hitboxId.slice('tab_'.length))) return false; // already open: nothing happened
        } else if (page >= 0) {
            if (page === this.page) return false;
            this.page = page;
        } else if (channel) {
            this.claimSfx();
            this._setFromMouse(channel, this._pointerX());
            this._preview(channel);
        } else if (hitboxId.startsWith('gfx_')) {
            const mode = hitboxId.slice('gfx_'.length);
            if (mode === graphics.mode) return false;
            graphics.setMode(mode);
            this.playConfirmSound();
        } else if (hitboxId === 'btn_test') {
            this.claimSfx();
            this._playTest();
        } else if (hitboxId === 'btn_reset') {
            audioManager.resetVolumes();
            this.playConfirmSound();
        } else if (hitboxId === 'btn_tips') {
            tipStore.reset();
            this.tipsReset = true;
            this.playConfirmSound();
        } else if (hitboxId === 'btn_done') {
            this.playCancelSound();
            this._exit();
        }
    }

    onRightClick() {
        this.playCancelSound();
        this._exit();
    }

    onDragStart(hitboxId) {
        const channel = this._channelOf(hitboxId);
        if (!channel) return;
        this.draggingChannel = channel;
        this.kbFocus = hitboxId;
        this._setFromMouse(channel, this._pointerX());
    }

    onDragMove(x) {
        if (this.draggingChannel) this._setFromMouse(this.draggingChannel, x);
    }

    onDrop() {
        if (!this.draggingChannel) return;
        const channel = this.draggingChannel;
        this.draggingChannel = null;
        this._preview(channel);
    }

    handleKeyDown(code, e) {
        const intent = this.resolveIntent(code, e);
        if (!intent) return;
        if (intent === 'CANCEL') { this.playCancelSound(); this._exit(); return; }

        if (intent === 'PREV_TAB' || intent === 'NEXT_TAB') {
            const at = TABS.indexOf(this.tab);
            const next = TABS[(at + (intent === 'NEXT_TAB' ? 1 : TABS.length - 1)) % TABS.length];
            if (this._setTab(next)) this.playNavSound();
            return;
        }

        const order = this._focusOrder();
        let index = order.indexOf(this.kbFocus);
        if (index < 0) index = 0;
        const focused = order[index];
        const channel = this._channelOf(focused);

        // the Controls pages are a grid (layout.pageCols wide): the arrows move across and down it; off its top, bottom or a side, the usual order
        const pageAt = focused.startsWith('page_') ? parseInt(focused.slice('page_'.length), 10) : -1;
        if (pageAt >= 0 && ['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(intent)) {
            const cols = this.layout.pageCols || 1;
            const step = { UP: -cols, DOWN: cols, LEFT: -1, RIGHT: 1 }[intent];
            const sameRow = intent === 'LEFT' || intent === 'RIGHT' ? Math.floor((pageAt + step) / cols) === Math.floor(pageAt / cols) : true;
            const to = pageAt + step;
            if (sameRow && to >= 0 && to < TIP_SCENES.length) { this._moveFocus(`page_${to}`); this.playNavSound(); return; }
            if (intent === 'DOWN') { this._moveFocus('btn_tips'); this.playNavSound(); return; }
            if (intent === 'LEFT' || intent === 'RIGHT') return;
        }

        if (intent === 'UP' || intent === 'DOWN') {
            index = (index + (intent === 'DOWN' ? 1 : order.length - 1)) % order.length;
            this._moveFocus(order[index]);
            this.playNavSound();
        } else if ((intent === 'LEFT' || intent === 'RIGHT') && channel) {
            const next = audioManager.getVolume(channel) + (intent === 'RIGHT' ? STEP : -STEP);
            audioManager.setVolume(channel, Math.round(Math.max(0, Math.min(1, next)) * 100) / 100);
            this.claimSfx();
            this._preview(channel);
        } else if ((intent === 'LEFT' || intent === 'RIGHT') && focused.startsWith('tab_')) {
            // on a tab the sideways keys switch tabs (the cursor stays on the tab)
            const at = TABS.indexOf(focused.slice('tab_'.length));
            const n = Math.max(0, Math.min(TABS.length - 1, at + (intent === 'RIGHT' ? 1 : -1)));
            if (n !== at) { this._moveFocus(`tab_${TABS[n]}`); this.playNavSound(); }
        } else if (intent === 'LEFT' || intent === 'RIGHT') {
            // on the buttons the sideways keys move between them
            const buttons = this._buttonIds();
            const at = buttons.indexOf(focused);
            if (at >= 0) {
                const n = Math.max(0, Math.min(buttons.length - 1, at + (intent === 'RIGHT' ? 1 : -1)));
                if (n !== at) { this.kbFocus = buttons[n]; this.playNavSound(); }
            }
        } else if (intent === 'CONFIRM') {
            if (channel) { this.claimSfx(); this._preview(channel); }
            else this.onClick(focused);
        }
    }

    /** Puts the keyboard cursor on a row. A tab opens as soon as the cursor lands on it, and so does a page. */
    _moveFocus(id) {
        if (id.startsWith('tab_')) this._setTab(id.slice('tab_'.length));
        this.kbFocus = id;
        const page = this._pageOf(id);
        if (page >= 0) this.page = page;
    }

    _exit() {
        this.active = false;
        this.draggingChannel = null;
        events.emit('CHANGE_SCENE', this.from === 'game'
            ? { scene: 'saves', data: { mode: 'game' } }
            : { scene: 'title' });
    }

    // ========================================================
    // STATE for the renderer (also builds the hitboxes)
    // ========================================================
    getState() {
        const L = this.layout;
        const hitboxes = [];

        // tabs, centred under the title
        const tabsW = TABS.length * L.tabW;
        const tabsX = L.panelX + (L.panelW - tabsW) / 2;
        const tabs = TABS.map((id, i) => {
            const box = { id: `tab_${id}`, tab: id, label: TAB_LABELS[id], x: tabsX + i * L.tabW, y: L.tabsY, w: L.tabW, h: L.tabH };
            hitboxes.push({ id: box.id, x: box.x, y: box.y, w: box.w, h: box.h, zIndex: 10 });
            return box;
        });

        let channels = [];
        let pages = [];
        let modes = [];
        if (this.tab === 'display') {
            const mw = 300, gap = 24, mx = L.panelX + (L.panelW - (mw * 3 + gap * 2)) / 2;
            modes = GRAPHICS_MODES.map((mode, i) => {
                const box = { id: `gfx_${mode}`, mode, x: mx + i * (mw + gap), y: L.rowsY + 60, w: mw, h: 64 };
                hitboxes.push({ id: box.id, x: box.x, y: box.y, w: box.w, h: box.h, zIndex: 10 });
                return box;
            });
        } else if (this.tab === 'sound') {
            channels = CHANNEL_ORDER.map((channel) => {
                const box = this._trackBox(channel);
                hitboxes.push({ id: `slider_${channel}`, x: box.x - 20, y: box.y, w: box.w + 40, h: box.h, zIndex: 10 });
                return {
                    id: `slider_${channel}`,
                    channel,
                    label: AUDIO_CHANNELS[channel].label,
                    value: audioManager.getVolume(channel),
                    track: box
                };
            });
        } else {
            pages = TIP_SCENES.map((sceneId, i) => {
                const box = {
                    id: `page_${i}`, sceneId, index: i,
                    x: L.panelX + L.pagesX + (i % L.pageCols) * (L.pageW + L.pageGap), y: L.pagesY + Math.floor(i / L.pageCols) * (L.pageH + L.pageGap), w: L.pageW, h: L.pageH
                };
                hitboxes.push({ id: box.id, x: box.x, y: box.y, w: box.w, h: box.h, zIndex: 10 });
                return box;
            });
        }

        const footerY = L.panelY + L.panelH - 64 - L.btnH;
        const pageRows = Math.ceil(TIP_SCENES.length / L.pageCols);
        const buttons = this.tab === 'display' ? [] : this.tab === 'sound'
            ? [
                { id: 'btn_test',  label: 'Test Sound', x: L.panelX + 64,            y: footerY, w: 330, h: L.btnH },
                { id: 'btn_reset', label: 'Reset',      x: L.panelX + 64 + 330 + 24, y: footerY, w: 330, h: L.btnH }
            ]
            : [
                { id: 'btn_tips',  label: this.tipsReset ? 'Tips Reset' : 'Replay Tips', x: L.panelX + L.pagesX, y: L.pagesY + pageRows * (L.pageH + L.pageGap) + 24, w: L.pageW * L.pageCols + L.pageGap, h: 64 }
            ];
        buttons.push({ id: 'btn_done', label: 'Back', x: 48, y: 956, w: 300, h: L.btnH });
        buttons.forEach(b => hitboxes.push({ id: b.id, x: b.x, y: b.y, w: b.w, h: b.h, zIndex: 10 }));

        this.updateHitboxes(hitboxes);

        return {
            layout: L,
            tab: this.tab,
            tabs,
            channels,
            pages,
            modes,
            graphics: { mode: graphics.mode, light: graphics.light, info: graphics.detect() },
            page: this.page,
            pageSceneId: TIP_SCENES[this.page],
            buttons,
            dragging: this.draggingChannel,
            from: this.from,
            focusId: this.draggingChannel ? `slider_${this.draggingChannel}` : this.getFocusId(),
            hitboxes
        };
    }
}
