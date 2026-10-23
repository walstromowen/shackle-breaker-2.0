/**
 * frontend/src/screens/settings/settingsController.js
 *
 * The Settings screen: one slider each for Master, Music, Effects and Ambience volume.
 *   - opened from the title screen (data.from = 'title') or from the in-game System screen (data.from = 'game')
 *   - the sliders change the sound at once (AudioManager.setVolume) and are remembered in this browser
 *   - Test Sound plays a battle cry through the Effects slider, so the player can balance it against the music
 *
 * Replay Tips forgets which first-visit control cards have been seen, so each shows again the next time its screen opens.
 *
 * Mouse: click a bar to jump there, or hold and drag. Keyboard: Up / Down choose a row, Left / Right move the slider by 5%.
 */
import { BaseController } from '../../engine/baseController.js';
import { events } from '../../../../shared/core/eventBus.js';
import { audioManager, AUDIO_CHANNELS } from '../../engine/audioManager.js';
import { tipStore } from '../../ui/tutorialOverlay.js';

const CHANNEL_ORDER = ['master', 'music', 'sfx', 'ambient'];
const STEP = 0.05;
const TEST_SOUNDS = ['wolfCry', 'legionaryCry', 'madmanCry', 'dogCry'];

export class SettingsController extends BaseController {
    constructor(input) {
        super(input);

        this.layout = {
            panelX: 360, panelY: 48, panelW: 1200, panelH: 888,
            rowsY: 302, rowH: 112,
            labelX: 96, trackX: 400, trackW: 560, valueX: 1104,
            btnH: 76
        };

        this.active = false;
        this.from = 'title';
        this.kbFocus = 'slider_master';
        this.draggingChannel = null;
        this.tipsReset = false;
        this.testIndex = 0;
        this.lastPreviewAt = 0;
        this.updateHitboxes([]);
    }

    /** Called by SceneManager each time the screen opens. data: { from: 'game' | 'title' } */
    init(data = {}) {
        this.active = true;
        this.from = data.from === 'game' ? 'game' : 'title';
        this.kbFocus = 'slider_master';
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
        return [...CHANNEL_ORDER.map(c => `slider_${c}`), 'btn_test', 'btn_reset', 'btn_tips', 'btn_done'];
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
        if (channel) {
            this.claimSfx();
            this._setFromMouse(channel, this._pointerX());
            this._preview(channel);
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

        const order = this._focusOrder();
        let index = order.indexOf(this.kbFocus);
        if (index < 0) index = 0;
        const channel = this._channelOf(order[index]);

        if (intent === 'UP' || intent === 'DOWN') {
            index = (index + (intent === 'DOWN' ? 1 : order.length - 1)) % order.length;
            this.kbFocus = order[index];
            this.playNavSound();
        } else if ((intent === 'LEFT' || intent === 'RIGHT') && channel) {
            const next = audioManager.getVolume(channel) + (intent === 'RIGHT' ? STEP : -STEP);
            audioManager.setVolume(channel, Math.round(Math.max(0, Math.min(1, next)) * 100) / 100);
            this.claimSfx();
            this._preview(channel);
        } else if (intent === 'LEFT' || intent === 'RIGHT') {
            // on the buttons the sideways keys move between them
            const buttons = ['btn_test', 'btn_reset', 'btn_tips', 'btn_done'];
            const at = buttons.indexOf(order[index]);
            if (at >= 0) {
                const n = Math.max(0, Math.min(buttons.length - 1, at + (intent === 'RIGHT' ? 1 : -1)));
                if (n !== at) { this.kbFocus = buttons[n]; this.playNavSound(); }
            }
        } else if (intent === 'CONFIRM') {
            if (channel) { this.claimSfx(); this._preview(channel); }
            else this.onClick(order[index]);
        }
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

        const channels = CHANNEL_ORDER.map((channel) => {
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

        const footerY = L.panelY + L.panelH - 40 - L.btnH;
        const buttons = [
            { id: 'btn_test',  label: 'Test Sound', x: L.panelX + 64,                     y: footerY, w: 330, h: L.btnH },
            { id: 'btn_reset', label: 'Reset',      x: L.panelX + 64 + 330 + 24,          y: footerY, w: 330, h: L.btnH },
            { id: 'btn_tips',  label: this.tipsReset ? 'Tips Reset' : 'Replay Tips', x: L.panelX + 64 + (330 + 24) * 2, y: footerY, w: 330, h: L.btnH },
            { id: 'btn_done',  label: 'Back',       x: 48,                             y: 956,     w: 300, h: L.btnH }
        ];
        buttons.forEach(b => hitboxes.push({ id: b.id, x: b.x, y: b.y, w: b.w, h: b.h, zIndex: 10 }));

        this.updateHitboxes(hitboxes);

        return {
            layout: L,
            channels,
            buttons,
            dragging: this.draggingChannel,
            from: this.from,
            focusId: this.draggingChannel ? `slider_${this.draggingChannel}` : this.getFocusId(),
            hitboxes
        };
    }
}
