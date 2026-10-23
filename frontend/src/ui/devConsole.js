// frontend/src/ui/devConsole.js: the developer console, a Minecraft-style command line over the game. Press "/" in the overworld.
//
// It is a small HTML box laid over the bottom of the page (like the login screen, instead of something drawn on the canvas) so the browser's own text field
// does the typing: paste, held keys repeating, accented letters. What the commands do lives in shared/core/devCommands.js; this file only reads the line and
// shows the answers.
//
//   Enter          run the line (the box stays open, so several commands in a row are quick)
//   Esc, or click  close it
//   Tab            complete the word being typed (a second Tab lists the choices)
//   Up / Down      the lines already run
//
// While it is open every key stays in the box: the game below does not see them (no walking while you type). SceneManager opens it (see _handleGlobalKeydown)
// and is told when it opens and closes so it can let go of held keys. Switch it off for a release in DEV_CONSOLE (shared/core/constants.js).
import { DevCommands } from '../../../shared/core/devCommands.js';

const HISTORY_LIMIT = 50;
const LOG_LIMIT = 80;          // lines kept in the box
const FADE_AFTER_MS = 6000;    // after closing, the last answers stay on screen this long, then fade (like chat)

const CSS = `
#sbconsole { position: fixed; z-index: 900; display: none; flex-direction: column; justify-content: flex-end; pointer-events: none;
  font-family: 'DM Mono', ui-monospace, monospace; font-size: 15px; line-height: 1.45; color: #e2dac8; }
#sbconsole.sbc-open, #sbconsole.sbc-recent { display: flex; }
#sbconsole * { box-sizing: border-box; font-family: inherit; }
.sbc-log { display: flex; flex-direction: column; justify-content: flex-end; max-height: 46vh; overflow: hidden; padding: 6px 12px 6px; background: rgba(6,8,12,.0); }
.sbc-open .sbc-log { background: rgba(6,8,12,.78); overflow-y: auto; pointer-events: auto; border: 1px solid rgba(194,161,79,.28); border-bottom: 0; }
.sbc-line-out { white-space: pre-wrap; word-break: break-word; text-shadow: 0 1px 2px #000; }
.sbc-recent:not(.sbc-open) .sbc-line-out:not(:nth-last-child(-n+6)) { display: none; }   /* closed: only the last few answers linger */
.sbc-recent:not(.sbc-open) .sbc-line-out { background: rgba(6,8,12,.55); width: fit-content; max-width: 100%; padding: 0 6px; }
.sbc-ok { color: #8fc28a; } .sbc-info { color: #b9b2a2; } .sbc-error { color: #e07a6a; } .sbc-echo { color: #c2a14f; }
.sbc-bar { display: none; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(10,12,16,.94); border: 1px solid rgba(194,161,79,.5); pointer-events: auto; }
.sbc-open .sbc-bar { display: flex; }
.sbc-input { flex: 1; min-width: 0; font-size: 16px; color: #f0e8d4; background: transparent; border: 0; outline: 0; caret-color: #c2a14f; }
.sbc-hint { font-size: 12px; color: #6f6b63; white-space: nowrap; }
#sbconsole.sbc-fading { opacity: 0; transition: opacity 1.2s ease; }
`;

export class DevConsole {
    /**
     * @param {object} options
     * @param {object} options.host        passed to the commands (lockWorld, battleSetup: see shared/core/devCommands.js)
     * @param {function} [options.onOpen]  called when the box opens
     * @param {function} [options.onClose] called when it closes
     * @param {Document} [options.doc]     (for tests)
     */
    constructor({ host = {}, onOpen = () => {}, onClose = () => {}, doc = (typeof document !== 'undefined' ? document : null) } = {}) {
        this.host = host;
        this.onOpen = onOpen;
        this.onClose = onClose;
        this.doc = doc;
        this.history = [];
        this.historyIndex = -1;
        this.draft = '';
        this.isOpen = false;
        this._fadeTimer = null;
        this._lastTab = null;   // the line a Tab last listed choices for, so the second Tab on it does not list them again
        this._build();
    }

    _build() {
        const d = this.doc;
        if (!d) return;
        if (!d.getElementById('sbconsole-style')) {
            const style = d.createElement('style');
            style.id = 'sbconsole-style';
            style.textContent = CSS;
            d.head.appendChild(style);
        }
        this.root = d.createElement('div');
        this.root.id = 'sbconsole';
        this.root.innerHTML = '<div class="sbc-log"></div><div class="sbc-bar"><input class="sbc-input" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Developer console"><span class="sbc-hint">Enter run, Tab complete, Esc close</span></div>';
        d.body.appendChild(this.root);
        this.logEl = this.root.querySelector('.sbc-log');
        this.input = this.root.querySelector('.sbc-input');

        // Every key typed in the box stays in the box: the game listens on the window and must not see them
        for (const type of ['keydown', 'keyup', 'keypress']) this.input.addEventListener(type, (e) => e.stopPropagation());
        this.input.addEventListener('keydown', (e) => this._onKeyDown(e));
        // clicking anywhere else (the game) closes it
        this.input.addEventListener('blur', () => { if (this.isOpen) this.close(); });
    }

    /** Lays the box over the bottom of the game's picture, following the canvas when the window is not 16:9. */
    _place() {
        const canvas = this.doc.getElementById('game-canvas');
        const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, width: window.innerWidth, bottom: window.innerHeight };
        const bottomGap = window.innerHeight - rect.bottom;
        Object.assign(this.root.style, { left: `${Math.round(rect.left)}px`, width: `${Math.round(rect.width)}px`, bottom: `${Math.round(bottomGap)}px` });
    }

    open(prefill = '/') {
        if (!this.root || this.isOpen) return;
        clearTimeout(this._fadeTimer);
        this.root.classList.remove('sbc-fading');
        this._place();
        this.isOpen = true;
        this.root.classList.add('sbc-open');
        this.input.value = prefill;
        this.historyIndex = -1;
        this.onOpen();
        this.input.focus();
        this.input.setSelectionRange(prefill.length, prefill.length);
        this._scroll();
    }

    close() {
        if (!this.root || !this.isOpen) return;
        this.isOpen = false;
        this.root.classList.remove('sbc-open');
        this.input.blur();
        // the last answers linger a moment, then fade, like chat
        if (this.logEl.children.length) {
            this.root.classList.add('sbc-recent');
            clearTimeout(this._fadeTimer);
            this._fadeTimer = setTimeout(() => {
                this.root.classList.add('sbc-fading');
                this._fadeTimer = setTimeout(() => this.root.classList.remove('sbc-recent', 'sbc-fading'), 1300);
            }, FADE_AFTER_MS);
        }
        this.onClose();
    }

    /** Adds lines ({ kind, text }) to the box. */
    print(lines) {
        for (const line of lines) {
            const row = this.doc.createElement('div');
            row.className = `sbc-line-out sbc-${line.kind || 'info'}`;
            row.textContent = line.text;
            this.logEl.appendChild(row);
        }
        while (this.logEl.children.length > LOG_LIMIT) this.logEl.removeChild(this.logEl.firstChild);
        this._scroll();
    }

    clear() {
        if (this.logEl) this.logEl.textContent = '';
    }

    _scroll() {
        if (this.logEl) this.logEl.scrollTop = this.logEl.scrollHeight;
    }

    /** Runs the line in the box. Returns the result of DevCommands.run. */
    submit(line = this.input.value) {
        const text = String(line).trim();
        if (!text || text === '/') return null;
        if (this.history[this.history.length - 1] !== text) this.history.push(text);
        if (this.history.length > HISTORY_LIMIT) this.history.shift();
        this.historyIndex = -1;
        this.print([{ kind: 'echo', text: `> ${text}` }]);
        if (/^\/?clear\s*$/i.test(text)) { this.clear(); this.input.value = '/'; return { lines: [], closeConsole: false }; }
        const result = DevCommands.run(text, this.host);
        this.print(result.lines);
        this.input.value = '/';
        if (result.closeConsole) this.close();
        return result;
    }

    /** Tab: finishes the word being typed, or lists what fits. */
    complete() {
        const line = this.input.value;
        const { start, options } = DevCommands.complete(line);
        if (options.length === 0) return;
        const typed = line.slice(start);
        const common = options.reduce((a, b) => { let i = 0; while (i < a.length && i < b.length && a[i].toLowerCase() === b[i].toLowerCase()) i++; return a.slice(0, i); });
        const word = options.length === 1 ? `${options[0]} ` : common;
        if (word.length >= typed.length) this.input.value = line.slice(0, start) + word;
        if (options.length > 1 && this._lastTab !== this.input.value) {
            this._lastTab = this.input.value;
            this.print([{ kind: 'info', text: options.join('  ') }]);
        }
    }

    _onKeyDown(e) {
        if (e.key === 'Enter') { e.preventDefault(); this.submit(); }
        else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
        else if (e.key === 'Tab') { e.preventDefault(); this.complete(); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.history.length === 0) return;
            if (this.historyIndex === -1) this.draft = this.input.value;
            this.historyIndex += e.key === 'ArrowUp' ? 1 : -1;
            this.historyIndex = Math.max(-1, Math.min(this.history.length - 1, this.historyIndex));
            this.input.value = this.historyIndex === -1 ? this.draft : this.history[this.history.length - 1 - this.historyIndex];
        }
    }
}
