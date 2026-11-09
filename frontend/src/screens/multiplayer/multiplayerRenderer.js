/**
 * frontend/src/screens/multiplayer/multiplayerRenderer.js
 *
 * Draws the Multiplayer screen (multiplayerController.js builds the state and the hitboxes): the title art dimmed behind one panel, like
 * Settings and the Saves screen. In the lobby the code is set large, letter by letter, so it can be read out to a friend.
 */
import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

const C = UITheme.colors;
const F = UITheme.fonts;
const CODE_FONT = '600 76px "DM Mono", ui-monospace, monospace';
const STATUS_TEXT = { offline: 'Offline', connecting: 'Connecting…', online: 'Connected' };

export class MultiplayerRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
    }

    render(ctx, state) {
        const ui = new CanvasUI(ctx);
        const w = ctx.canvas.width, h = ctx.canvas.height;
        const L = state.layout;
        const cx = L.panelX + L.panelW / 2;
        const focus = state.focusId;

        const bg = this.loader.getImage ? this.loader.getImage('title_bg') : this.loader.get('title_bg');
        if (bg) {
            ctx.drawImage(bg, 0, 0, w, h);
            ui.drawRect(0, 0, w, h, 'rgba(4, 4, 7, 0.86)', true);
        } else {
            ui.clearScreen(w, h);
        }
        ui.drawPanel(L.panelX, L.panelY, L.panelW, L.panelH, C.bgScale[0]);

        const titles = { menu: 'Multiplayer', pick: 'Host a World', join: 'Join a World', lobby: 'The Lobby' };
        ui.drawStyled('title', titles[state.view], cx, L.panelY + 112);
        ui.drawLineWithGothicFlourish(cx - 160, L.panelY + 142, 320, C.borderHighlight);

        if (state.view === 'menu') this._menu(ui, state, cx);
        else if (state.view === 'pick') this._pick(ui, state, cx, focus);
        else if (state.view === 'join') this._join(ui, state, cx, focus);
        else this._lobby(ui, state, cx, focus);

        for (const b of state.buttons) {
            ui.drawButton(b.x, b.y, b.w, b.h, b.label, ui.flags(b.id, focus, { disabled: !!b.disabled || !!b.dim }), { font: F.medium });
        }

        if (state.message) {
            ui.drawStyled('notice', state.message.text, cx, L.panelY + L.panelH - 46, { kind: state.message.kind, align: 'center', baseline: 'middle', maxWidth: L.panelW - 120 });
        }
        // connection status, top-right of the panel
        if (state.view !== 'menu' || state.status !== 'offline') {
            const color = state.status === 'online' ? C.success : state.status === 'connecting' ? C.textHighlight : C.textMuted;
            ui.drawText(`● ${STATUS_TEXT[state.status] || state.status}`, L.panelX + L.panelW - 40, L.panelY + 56, F.small, color, 'right');
        }
    }

    _menu(ui, state, cx) {
        const L = state.layout;
        ui.drawText('Play with up to two friends in one world.', cx, L.panelY + 220, F.body, C.textMain, 'center');
        ui.drawText('The host opens one of their saves; friends join with its code.', cx, L.panelY + 262, F.italic, C.textMuted, 'center');
    }

    _pick(ui, state, cx, focus) {
        const L = state.layout;
        ui.drawText('Start a new world together (everyone plays the prologue), or open a save. Friends\' characters are kept in it.', cx, L.panelY + 210, F.italic, C.textMuted, 'center', 'alphabetic', L.panelW - 120);
        if (state.loading) { ui.drawStyled('empty', 'Reading your saves', cx, L.panelY + 430); return; }
        if (state.savesError) { ui.drawStyled('empty', state.savesError, cx, L.panelY + 430, { maxWidth: L.panelW - 160 }); return; }
        for (const r of state.rows) {
            const flags = ui.flags(r.id, focus);
            ui.drawPanel(r.x, r.y, r.w, r.h, 'rgba(0, 0, 0, 0.35)');
            ui.drawStateBox(r.x, r.y, r.w, r.h, flags, { inset: true });
            ui.drawText(r.name, r.x + 28, r.y + 38, F.bold, ui.stateTextColor(flags, C.textMain), 'left', 'alphabetic', r.w - 360);
            ui.drawText(r.detail, r.x + 28, r.y + 68, F.small, C.textMuted, 'left', 'alphabetic', r.w - 360);
            ui.drawText(r.savedAt, r.x + r.w - 28, r.y + 52, F.small, C.textMuted, 'right');
        }
    }

    _join(ui, state, cx, focus) {
        const L = state.layout;
        const inp = state.input;
        ui.drawText('Type the code your host gave you.', cx, L.panelY + 240, F.body, C.textMain, 'center');
        ui.drawText('It is five letters and numbers, shown in their lobby.', cx, L.panelY + 282, F.italic, C.textMuted, 'center');
        ui.drawPanel(inp.x, inp.y, inp.w, inp.h, inp.editing ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.4)');
        ui.drawStateBox(inp.x, inp.y, inp.w, inp.h, ui.flags(inp.id, inp.editing ? inp.id : focus));
        this._codeCells(ui, inp.value, inp.length, cx, inp.y + inp.h / 2, inp.editing);
    }

    /** The code, one cell per character: typed ones in bone, the next one with a blinking caret, the rest as brass dashes. */
    _codeCells(ui, value, length, cx, midY, caret) {
        const cell = 84, x0 = cx - (cell * length) / 2;
        for (let i = 0; i < length; i++) {
            const x = x0 + i * cell + cell / 2;
            const ch = value[i];
            if (ch) ui.drawText(ch, x, midY + 26, CODE_FONT, C.textMain, 'center');
            else ui.drawLine(x - 24, midY + 30, x + 24, midY + 30, i === value.length && caret && Math.floor(Date.now() / 500) % 2 === 0 ? C.textHighlight : C.border, 3);
        }
    }

    _lobby(ui, state, cx, focus) {
        const L = state.layout;
        const room = state.room;
        if (!room) { ui.drawStyled('empty', 'Opening the world', cx, L.panelY + 330); return; }
        ui.drawText(room.world.isNew ? 'A new world  ·  everyone plays the prologue together' : `${room.world.name}'s world  ·  Day ${room.world.day}`, cx, L.panelY + 200, F.bold, C.textMain, 'center');
        ui.drawText(state.isHost ? 'Share this code with your friends:' : 'World code:', cx, L.panelY + 246, F.small, C.textMuted, 'center');
        this._codeCells(ui, room.code, room.code.length, cx, L.panelY + 310, false);

        for (const s of state.slots) {
            const p = s.player;
            ui.drawPanel(s.x, s.y, s.w, s.h, p ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.15)');
            if (!p) {
                ui.drawText('An empty place', s.x + 32, s.y + s.h / 2 + 8, F.italic, C.textMuted, 'left');
                continue;
            }
            const you = p.id === state.youId;
            ui.drawText(`${p.username}${you ? '  (you)' : ''}`, s.x + 32, s.y + 46, F.bold, you ? C.textHighlight : C.textMain, 'left', 'alphabetic', s.w - 460);
            const note = !p.connected ? 'Connection lost: holding their place'
                : p.isHost ? 'Host' : p.ready ? 'Ready' : 'Not ready';
            const color = !p.connected ? C.error : p.isHost ? C.textHighlight : p.ready ? C.success : C.textMuted;
            ui.drawText(note, s.x + 32, s.y + 80, F.small, color, 'left');
        }
        if (room.state === 'playing' && state.isHost) {
            ui.drawText('Your world is open. Enter it again whenever you are ready.', cx, state.buttons.find(b => b.id === 'btn_start').y - 18, F.italic, C.textMuted, 'center');
        }
    }
}
