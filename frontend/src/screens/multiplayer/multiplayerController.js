/**
 * frontend/src/screens/multiplayer/multiplayerController.js
 *
 * The Multiplayer screen, opened from the title screen. Four views:
 *   menu    Host a World / Join a World
 *   pick    the host picks which of their saves to open (each save is one world; guests' characters will be kept in it)
 *   join    a guest types the host's code
 *   lobby   up to three players: the code to share, who is in, who is ready. Guests tick Ready; the host starts (and can remove a guest).
 *
 * The connection is engine/multiplayerClient.js. Starting takes the host into their world (the save loads as usual). Playing in the
 * same world together is the next multiplayer step, so for now a guest waits in the lobby and is told so.
 *
 * Keyboard: Up / Down move between the buttons, Enter presses one, Esc goes back (in the lobby: leaves the room). In Join, type the code.
 */
import { BaseController } from '../../engine/baseController.js';
import { events } from '../../../../shared/core/eventBus.js';
import { SaveManager } from '../../engine/saveManager.js';
import { AuthService } from '../../auth/authService.js';
import { multiplayer } from '../../engine/multiplayerClient.js';
import { TextEntry } from '../../../../shared/core/textEntry.js';
import { UITheme } from '../../ui/UITheme.js';

export const CODE_LENGTH = 5;
const PICK_ROWS = 6;

export class MultiplayerController extends BaseController {
    constructor(input) {
        super(input);
        this.layout = { panelX: 410, panelY: 60, panelW: 1100, panelH: 880, btnW: 420, btnH: 68 };
        this.view = 'menu';
        this.active = false;
        this.saves = null;          // [{ slot, summary }] once listed
        this.savesError = null;
        this.pickOffset = 0;
        this.code = new TextEntry('', CODE_LENGTH, /^[a-zA-Z0-9]$/);
        this.message = null;        // { text, kind: 'error' | 'info' | 'success' }
        this.waitingFor = null;     // 'host' | 'join': a request is on its way
        this.startedAsGuest = false;
        this.kbFocus = null;
        this.unsubs = [];
        this.loadingWorld = false;
        // the host's save could not be loaded: back on this screen with the reason
        events.on('LOAD_FAILED', ({ error } = {}) => {
            if (!this.loadingWorld) return;
            this.loadingWorld = false;
            this.active = true;
            this.message = { text: error || 'That save could not be loaded.', kind: 'error' };
        });
        events.on('CHANGE_SCENE', ({ scene } = {}) => { if (scene === 'overworld') this.loadingWorld = false; });
        this.updateHitboxes([]);
    }

    /** Called by SceneManager each time the screen opens. */
    init() {
        this.active = true;
        this.message = null;
        this.waitingFor = null;
        this.startedAsGuest = false;
        this._listen();
        // back in the lobby (the room is still open): show it; otherwise start at the menu
        this.view = multiplayer.room ? 'lobby' : 'menu';
        this.kbFocus = this._focusOrder()[0] || null;
        this.startInKeyboardMode();
        if (!AuthService.isLoggedIn) this.message = { text: 'Multiplayer needs an account. Log in from the title screen to play online.', kind: 'error' };
    }

    _listen() {
        this.unsubs.forEach(u => u());
        this.unsubs = [
            multiplayer.on('room', () => {
                if (!this.active) return;   // the host is in their world: the lobby picks the room up again when it reopens
                if (this.view !== 'lobby') { this.view = 'lobby'; this.message = null; this.kbFocus = this._focusOrder()[0]; this.playConfirmSound(); }
                this.waitingFor = null;
                if (!this._focusOrder().includes(this.kbFocus)) this.kbFocus = this._focusOrder()[0];
            }),
            multiplayer.on('error', (err) => {
                if (!this.active) return;
                this.waitingFor = null;
                this.message = { text: err.message, kind: 'error' };
                this.playErrorSound();
            }),
            multiplayer.on('closed', ({ reason }) => {
                const text = reason === 'kicked' ? 'The host removed you from their world.'
                    : reason === 'host_left' ? 'The host closed their world.'
                    : reason === 'host_lost' ? 'The host lost their connection, so their world closed.'
                    : 'The connection to the server was lost.';
                this.message = { text, kind: 'error' };
                this.view = 'menu';
                this.kbFocus = this._focusOrder()[0];
                this.startedAsGuest = false;
            }),
            multiplayer.on('started', (room) => this._onStarted(room)),
        ];
    }

    _onStarted(room) {
        if (this.view !== 'lobby') return;
        if (multiplayer.isHost) {
            this.playConfirmSound();
            this.active = false;
            this.loadingWorld = true;
            events.emit('LOAD_GAME', { slot: room.world.slot });   // the host's world loads as it always does; the room stays open
        } else {
            this.startedAsGuest = true;
            this.message = { text: 'The host has gone into their world. Walking it together comes with the next update, so wait here for now.', kind: 'info' };
        }
    }

    // ========================================================
    // FOCUS
    // ========================================================
    _focusOrder() {
        if (this.view === 'menu') return ['btn_host', 'btn_join', 'btn_back'];
        if (this.view === 'pick') {
            const rows = (this.saves || []).slice(this.pickOffset, this.pickOffset + PICK_ROWS).map((_, i) => `save_${this.pickOffset + i}`);
            const more = [];
            if (this.pickOffset > 0) more.push('btn_prev');
            if (this.saves && this.pickOffset + PICK_ROWS < this.saves.length) more.push('btn_next');
            return [...rows, ...more, 'btn_back'];
        }
        if (this.view === 'join') return ['input_code', 'btn_do_join', 'btn_back'];
        // lobby
        const room = multiplayer.room;
        const ids = [];
        if (room && multiplayer.isHost) {
            room.players.filter(p => !p.isHost).forEach(p => ids.push(`kick_${p.id}`));
            ids.push('btn_start');
        } else ids.push('btn_ready');
        ids.push('btn_leave');
        return ids;
    }

    getKeyboardFocusId() { return this.kbFocus; }
    setFocusFromPointer(id) { this.kbFocus = id; }

    // ========================================================
    // INPUT
    // ========================================================
    handleKeyDown(code, e) {
        // typing the code: letters and digits go into the box, Backspace takes one off, Enter joins
        if (this.view === 'join' && this.kbFocus === 'input_code') {
            if (code === 'Enter' || code === 'NumpadEnter') { this.onClick('btn_do_join'); return; }
            if (e && (e.key === 'Backspace' || (e.key && e.key.length === 1 && /[a-z0-9]/i.test(e.key)))) {
                this.code.handleEvent(e);
                this.code.value = this.code.value.toUpperCase();
                this.message = null;
                return;
            }
        }
        const intent = this.resolveIntent(code, e);
        if (!intent) return;
        if (intent === 'CANCEL') { this.onRightClick(); return; }
        const order = this._focusOrder();
        let i = order.indexOf(this.kbFocus);
        if (intent === 'UP' || intent === 'LEFT') {
            i = i < 0 ? order.length - 1 : (i - 1 + order.length) % order.length;
            this.kbFocus = order[i]; this.playNavSound();
        } else if (intent === 'DOWN' || intent === 'RIGHT') {
            i = i < 0 ? 0 : (i + 1) % order.length;
            this.kbFocus = order[i]; this.playNavSound();
        } else if (intent === 'CONFIRM' && this.kbFocus) {
            this.onClick(this.kbFocus);
        }
    }

    onClick(id) {
        if (!id) return;
        this.kbFocus = id;
        switch (id) {
            case 'btn_host': return this._openPick();
            case 'btn_join': return this._openJoin();
            case 'btn_back': return this.onRightClick();
            case 'btn_prev': this.pickOffset = Math.max(0, this.pickOffset - PICK_ROWS); this.playNavSound(); return;
            case 'btn_next': this.pickOffset += PICK_ROWS; this.playNavSound(); return;
            case 'input_code': return;
            case 'btn_do_join': return this._join();
            case 'btn_ready': {
                const me = this._me();
                if (!me) return;
                multiplayer.setReady(!me.ready);
                this.playConfirmSound();
                return;
            }
            case 'btn_start': {
                const room = multiplayer.room;
                if (room && room.players.some(p => !p.isHost && !p.ready)) {
                    this.message = { text: 'Everyone has to be ready before you can start.', kind: 'error' };
                    this.playErrorSound();
                    return;
                }
                this.message = null;
                multiplayer.start();
                return;
            }
            case 'btn_leave': return this._leave();
        }
        if (id.startsWith('save_')) return this._host(parseInt(id.slice(5), 10));
        if (id.startsWith('kick_')) { multiplayer.kick(id.slice(5)); this.playCancelSound(); }
    }

    /** Back: one view at a time (leaving the lobby leaves the room), then the title screen. */
    onRightClick() {
        this.playCancelSound();
        if (this.view === 'lobby') { this._leave(); return; }
        if (this.view === 'pick' || this.view === 'join') {
            this.view = 'menu'; this.message = null; this.waitingFor = null;
            this.kbFocus = this._focusOrder()[0];
            return;
        }
        multiplayer.leave();
        this.active = false;
        this.unsubs.forEach(u => u()); this.unsubs = [];
        events.emit('CHANGE_SCENE', { scene: 'title' });
    }

    // ========================================================
    // ACTIONS
    // ========================================================
    async _openPick() {
        if (!this._canGoOnline()) return;
        this.playConfirmSound();
        this.view = 'pick';
        this.message = null;
        this.saves = null;
        this.savesError = null;
        this.pickOffset = 0;
        this.kbFocus = 'btn_back';
        multiplayer.connect();   // opens while the player chooses
        try {
            this.saves = await SaveManager.list();
            if (!this.saves.length) this.savesError = 'You have no saved game to host. Start a new game first, save it, then host it.';
        } catch {
            this.saves = [];
            this.savesError = 'Your saves could not be read.';
        }
        if (this.view === 'pick') this.kbFocus = this._focusOrder()[0];
    }

    _openJoin() {
        if (!this._canGoOnline()) return;
        this.playConfirmSound();
        this.view = 'join';
        this.message = null;
        this.code.reset('');
        this.kbFocus = 'input_code';
        multiplayer.connect();
    }

    _canGoOnline() {
        if (AuthService.isLoggedIn) return true;
        this.message = { text: 'Multiplayer needs an account. Log in from the title screen to play online.', kind: 'error' };
        this.playErrorSound();
        return false;
    }

    async _host(index) {
        const row = this.saves && this.saves[index];
        if (!row || this.waitingFor) return;
        this.playConfirmSound();
        this.waitingFor = 'host';
        this.message = { text: 'Opening your world…', kind: 'info' };
        const s = row.summary || {};
        await multiplayer.connect();
        if (multiplayer.status !== 'online') { this.waitingFor = null; return; }   // the error listener has said why
        multiplayer.host({ name: s.name || 'A world', day: s.day || 1, slot: row.slot });
    }

    async _join() {
        const code = this.code.value.trim().toUpperCase();
        if (code.length !== CODE_LENGTH) {
            this.message = { text: `A world's code is ${CODE_LENGTH} letters and numbers.`, kind: 'error' };
            this.playErrorSound();
            return;
        }
        if (this.waitingFor) return;
        this.playConfirmSound();
        this.waitingFor = 'join';
        this.message = { text: 'Looking for that world…', kind: 'info' };
        await multiplayer.connect();
        if (multiplayer.status !== 'online') { this.waitingFor = null; return; }
        multiplayer.join(code);
    }

    _leave() {
        multiplayer.leave();
        this.view = 'menu';
        this.startedAsGuest = false;
        this.message = null;
        this.kbFocus = this._focusOrder()[0];
    }

    _me() {
        const room = multiplayer.room;
        return room && multiplayer.you ? room.players.find(p => p.id === multiplayer.you.id) : null;
    }

    // ========================================================
    // STATE for the renderer (builds the hitboxes)
    // ========================================================
    getState() {
        const L = this.layout;
        const cx = L.panelX + L.panelW / 2;
        const hitboxes = [];
        const buttons = [];
        const add = (id, label, x, y, w = L.btnW, h = L.btnH, extra = {}) => {
            const b = { id, label, x, y, w, h, ...extra };
            buttons.push(b);
            if (!extra.disabled) hitboxes.push({ id, x, y, w, h, zIndex: 10 });
            return b;
        };
        const back = UITheme.backButtonBox();
        const state = { layout: L, view: this.view, focusId: this.getFocusId(), message: this.message, status: multiplayer.status, buttons };

        if (this.view === 'menu') {
            add('btn_host', 'Host a World', cx - L.btnW / 2, L.panelY + 330);
            add('btn_join', 'Join a World', cx - L.btnW / 2, L.panelY + 330 + L.btnH + 24);
            add('btn_back', 'Back', back.x, back.y, back.w, back.h);
        } else if (this.view === 'pick') {
            const rowW = 860, rowH = 84, rowX = cx - rowW / 2, top = L.panelY + 250;
            state.rows = (this.saves || []).slice(this.pickOffset, this.pickOffset + PICK_ROWS).map((row, i) => {
                const index = this.pickOffset + i;
                const s = row.summary || {};
                const box = { id: `save_${index}`, x: rowX, y: top + i * (rowH + 12), w: rowW, h: rowH,
                    name: s.saveName || s.name || 'Unnamed save', detail: [s.level ? `Level ${s.level}` : null, s.day ? `Day ${s.day}` : null, s.partySize ? `Party of ${s.partySize}` : null, s.difficulty || null].filter(Boolean).join('   ·   '),
                    savedAt: row.savedAt ? new Date(row.savedAt).toLocaleString() : '' };
                hitboxes.push({ id: box.id, x: box.x, y: box.y, w: box.w, h: box.h, zIndex: 10 });
                return box;
            });
            state.loading = this.saves === null;
            state.savesError = this.savesError;
            const pagerY = top + PICK_ROWS * (rowH + 12) + 4;
            if (this.pickOffset > 0) add('btn_prev', 'Newer', rowX, pagerY, 200, 56);
            if (this.saves && this.pickOffset + PICK_ROWS < this.saves.length) add('btn_next', 'Older', rowX + rowW - 200, pagerY, 200, 56);
            add('btn_back', 'Back', back.x, back.y, back.w, back.h);
        } else if (this.view === 'join') {
            const boxW = 520, boxH = 110;
            state.input = { id: 'input_code', x: cx - boxW / 2, y: L.panelY + 340, w: boxW, h: boxH, value: this.code.value, length: CODE_LENGTH, editing: this.kbFocus === 'input_code' };
            hitboxes.push({ id: 'input_code', x: state.input.x, y: state.input.y, w: boxW, h: boxH, zIndex: 10 });
            add('btn_do_join', this.waitingFor === 'join' ? 'Joining…' : 'Join', cx - L.btnW / 2, L.panelY + 500, L.btnW, L.btnH, { disabled: this.code.value.length !== CODE_LENGTH || !!this.waitingFor });
            add('btn_back', 'Back', back.x, back.y, back.w, back.h);
        } else {
            const room = multiplayer.room;
            state.room = room;
            state.youId = multiplayer.you?.id || null;
            state.isHost = multiplayer.isHost;
            state.startedAsGuest = this.startedAsGuest;
            const slotW = 900, slotH = 96, slotX = cx - slotW / 2, top = L.panelY + 380;
            state.slots = [];
            for (let i = 0; i < (room ? room.maxPlayers : 3); i++) {
                const p = room ? room.players[i] : null;
                const slot = { x: slotX, y: top + i * (slotH + 12), w: slotW, h: slotH, player: p || null };
                if (p && state.isHost && !p.isHost) slot.kick = add(`kick_${p.id}`, 'Remove', slotX + slotW - 200, slot.y + (slotH - 56) / 2, 180, 56);
                state.slots.push(slot);
            }
            const footY = top + 3 * (slotH + 12) + 30;
            if (state.isHost) {
                const waiting = room && room.players.some(p => !p.isHost && !p.ready);
                add('btn_start', room && room.state === 'playing' ? 'Enter the World' : 'Start', cx - L.btnW / 2, footY, L.btnW, L.btnH, { dim: waiting });
            } else {
                const me = this._me();
                add('btn_ready', me && me.ready ? 'Not Ready' : 'Ready', cx - L.btnW / 2, footY);
            }
            add('btn_leave', state.isHost ? 'Close World' : 'Leave', back.x, back.y, back.w, back.h);
        }

        this.updateHitboxes(hitboxes);
        return state;
    }
}
