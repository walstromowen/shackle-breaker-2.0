// frontend/src/auth/authScreen.js
//
// The Log In / Create Account screen, shown BEFORE the game (boot screen, title, everything) starts.
// It is a normal HTML form laid over the page instead of something drawn on the canvas, so the browser's own text fields work:
// paste, password managers, mobile keyboards, accessibility.
//
//   const result = await AuthScreen.show();   // { mode: 'online', user } | { mode: 'offline' }
//
// Set ALLOW_OFFLINE_PLAY to false to make an account compulsory (testers then cannot skip it).
import { AuthService } from './authService.js';
import { drawSmoke } from '../ui/smoke.js';

const ALLOW_OFFLINE_PLAY = true;

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;   // keep in step with backend/src/util/validate.js

const CSS = `
#sbauth { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px;
  font-family: 'Barlow', system-ui, sans-serif; color: #e2dac8; background: #040508 url('./assets/screens/title_bg.png')   /* the same picture as the title screen */ center / cover no-repeat;
  transition: opacity .35s ease; }
#sbauth::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(4,5,8,.18) 0%, rgba(4,5,8,.62) 100%); }
#sbauth.sbauth-leaving { opacity: 0; pointer-events: none; }
.sbauth-smoke { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; mix-blend-mode: screen; }
#sbauth * { box-sizing: border-box; }
.sbauth-card { position: relative; width: min(100%, 420px); padding: 36px 34px 28px; background: linear-gradient(180deg, rgba(19,22,29,.94), rgba(10,12,16,.96)); border: 1px solid rgba(194,161,79,.38);
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
  box-shadow: 0 18px 60px rgba(0,0,0,.8); }
.sbauth-title { margin: 0; text-align: center; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 40px; line-height: 1.1; white-space: nowrap; font-weight: 600; letter-spacing: .01em; color: #e2dac8; }
.sbauth-sub { margin: 6px 0 20px; text-align: center; font-size: 14px; font-style: italic; color: #948f86; }
.sbauth-rule { height: 1px; margin: 0 0 20px; border: 0; background: linear-gradient(90deg, transparent, #c2a14f, transparent); opacity: .6; }
.sbauth-tabs { display: flex; margin-bottom: 20px; border: 1px solid #2a2d34; }
.sbauth-tab { flex: 1; padding: 10px 6px; font: inherit; font-size: 13px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: #948f86; background: transparent; border: 0; cursor: pointer; transition: color .15s, background .15s; }
.sbauth-tab + .sbauth-tab { border-left: 1px solid #2a2d34; }
.sbauth-tab[aria-selected="true"] { color: #e2dac8; background: linear-gradient(90deg, rgba(226,218,200,.09), rgba(226,218,200,.01)); box-shadow: inset 3px 0 0 #e2dac8; }
.sbauth-tab:hover { color: #d4b35c; }
.sbauth-field { display: block; margin-bottom: 14px; }
.sbauth-field[hidden] { display: none; }
.sbauth-label { display: block; margin-bottom: 5px; font-size: 13px; font-weight: 500; letter-spacing: .02em; color: #948f86; }
.sbauth-input { width: 100%; padding: 10px 12px; font: inherit; font-size: 17px; color: #e2dac8; background: rgba(4,5,8,.7); border: 1px solid #2a2d34; outline: none; transition: border-color .15s, box-shadow .15s; }
.sbauth-input:focus { border-color: #c2a14f; box-shadow: 0 0 0 1px rgba(194,161,79,.3); }
.sbauth-show { display: flex; align-items: center; gap: 8px; margin: -4px 0 14px; font-size: 13px; color: #948f86; cursor: pointer; user-select: none; }
.sbauth-show input { accent-color: #c2a14f; }
.sbauth-error { min-height: 20px; margin: 0 0 10px; font-size: 14px; color: #e57373; }
.sbauth-info { min-height: 18px; margin: 0 0 10px; font-size: 13px; font-style: italic; color: #948f86; }
.sbauth-submit { width: 100%; padding: 12px; font: inherit; font-size: 18px; font-weight: 500; letter-spacing: .02em; color: #e2dac8; background: linear-gradient(180deg, rgba(201,166,79,.14), rgba(201,166,79,.04));
  border: 1px solid rgba(194,161,79,.6); cursor: pointer; transition: color .15s, background .15s; }
.sbauth-submit:hover:not(:disabled) { background: linear-gradient(180deg, rgba(201,166,79,.24), rgba(201,166,79,.08)); color: #d4b35c; }
.sbauth-submit:disabled { opacity: .55; cursor: default; }
.sbauth-offline { display: block; width: 100%; margin-top: 14px; padding: 6px; font: inherit; font-size: 13px; color: #948f86; background: none; border: 0; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.sbauth-offline:hover { color: #e2dac8; }
.sbauth-server { margin-top: 12px; text-align: center; font-size: 12px; color: #5f5b51; }
`;

const el = (tag, props = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key in node) node[key] = value;
        else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
};

/**
 * Wisps of smoke drifting over the picture behind the form (the same ones as on the title screen, ui/smoke.js). The canvas is half the
 * size it is shown at, because smoke is soft anyway, and it is drawn about thirty times a second. It stops by itself when the screen is gone.
 */
function startSmoke(root) {
    const canvas = el('canvas', { class: 'sbauth-smoke', width: 960, height: 540 });
    canvas.setAttribute('aria-hidden', 'true');
    root.prepend(canvas);
    const ctx = canvas.getContext('2d');
    let last = 0;
    const frame = (time) => {
        if (!root.isConnected) return;
        if (time - last >= 33) {
            last = time;
            ctx.clearRect(0, 0, 960, 540);
            drawSmoke(ctx, Date.now() / 1000, 960, 540);
        }
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}

export const AuthScreen = {
    /**
     * For a player who is already logged in from an earlier visit: a small "Welcome back" card. It also gives the browser the click it needs
     * before it lets the game play sound. Resolves 'continue' or 'switch' (the caller then logs out and shows the full screen).
     */
    welcomeBack(user) {
        return new Promise((resolve) => {
            const style = el('style', { text: CSS });
            const go = el('button', { class: 'sbauth-submit', type: 'button', text: 'CONTINUE' });
            const switchAccount = el('button', { class: 'sbauth-offline', type: 'button', text: 'Not you? Log in as someone else' });
            const who = el('strong', { text: user.username });
            const root = el('div', { id: 'sbauth' }, [
                el('div', { class: 'sbauth-card' }, [
                    el('h1', { class: 'sbauth-title', text: 'Shackle Breaker' }),
                    el('p', { class: 'sbauth-sub', text: 'Welcome back' }),
                    el('hr', { class: 'sbauth-rule' }),
                    el('p', { class: 'sbauth-info', style: 'font-size:17px;font-style:normal;color:#e2dac8;text-align:center;margin-bottom:18px' }, ['Signed in as ', who]),
                    go,
                    switchAccount
                ])
            ]);
            const finish = (choice) => {
                root.classList.add('sbauth-leaving');
                setTimeout(() => { root.remove(); style.remove(); }, 400);
                resolve(choice);
            };
            go.addEventListener('click', () => finish('continue'));
            switchAccount.addEventListener('click', () => finish('switch'));
            document.head.append(style);
            document.body.append(root);
            startSmoke(root);
            go.focus();
        });
    },

    /** Shows the screen and resolves when the player has logged in, created an account, or chosen to play offline. */
    show() {
        return new Promise((resolve) => {
            let mode = 'login';
            let busy = false;
            let inviteRequired = false;
            let serverState = 'checking';   // 'checking' | 'ready' | 'down'

            const style = el('style', { text: CSS });

            // ---- fields ----
            const username = el('input', { class: 'sbauth-input', type: 'text', name: 'username', id: 'sbauth-username', autocomplete: 'username', maxLength: 20, spellcheck: false, autocapitalize: 'none' });
            const password = el('input', { class: 'sbauth-input', type: 'password', name: 'password', id: 'sbauth-password', autocomplete: 'current-password', maxLength: 72 });
            const confirm = el('input', { class: 'sbauth-input', type: 'password', name: 'confirm', id: 'sbauth-confirm', autocomplete: 'new-password', maxLength: 72 });
            const invite = el('input', { class: 'sbauth-input', type: 'text', name: 'invite', id: 'sbauth-invite', autocomplete: 'off', maxLength: 64, spellcheck: false });
            const show = el('input', { type: 'checkbox', id: 'sbauth-show' });

            const field = (labelText, input) => el('label', { class: 'sbauth-field', htmlFor: input.id }, [el('span', { class: 'sbauth-label', text: labelText }), input]);
            const confirmField = field('Repeat password', confirm);
            const inviteField = field('Invite code', invite);
            confirmField.hidden = true;
            inviteField.hidden = true;

            const error = el('p', { class: 'sbauth-error', role: 'alert' });
            const info = el('p', { class: 'sbauth-info', 'aria-live': 'polite' });
            const submit = el('button', { class: 'sbauth-submit', type: 'submit', text: 'LOG IN' });
            const serverNote = el('div', { class: 'sbauth-server' });

            const tabLogin = el('button', { class: 'sbauth-tab', type: 'button', role: 'tab', text: 'Log In' });
            const tabRegister = el('button', { class: 'sbauth-tab', type: 'button', role: 'tab', text: 'Create Account' });

            const form = el('form', { noValidate: true }, [
                field('Username', username),
                field('Password', password),
                confirmField,
                inviteField,
                el('label', { class: 'sbauth-show' }, [show, el('span', { text: 'Show password' })]),
                error, info, submit
            ]);

            const offlineButton = ALLOW_OFFLINE_PLAY
                ? el('button', { class: 'sbauth-offline', type: 'button', text: 'Play offline (saves stay on this device)' })
                : null;

            const root = el('div', { id: 'sbauth' }, [
                el('div', { class: 'sbauth-card' }, [
                    el('h1', { class: 'sbauth-title', text: 'Shackle Breaker' }),
                    el('p', { class: 'sbauth-sub', text: 'Sign in to keep your journey safe' }),
                    el('hr', { class: 'sbauth-rule' }),
                    el('div', { class: 'sbauth-tabs', role: 'tablist' }, [tabLogin, tabRegister]),
                    form,
                    offlineButton,
                    serverNote
                ])
            ]);

            // ---- behaviour ----
            const setError = (text) => { error.textContent = text || ''; };

            const render = () => {
                const registering = mode === 'register';
                tabLogin.setAttribute('aria-selected', String(!registering));
                tabRegister.setAttribute('aria-selected', String(registering));
                confirmField.hidden = !registering;
                inviteField.hidden = !(registering && inviteRequired);
                password.autocomplete = registering ? 'new-password' : 'current-password';
                submit.textContent = busy ? (registering ? 'CREATING…' : 'LOGGING IN…') : (registering ? 'CREATE ACCOUNT' : 'LOG IN');
                submit.disabled = busy;
                for (const input of [username, password, confirm, invite]) input.disabled = busy;
                serverNote.textContent = serverState === 'checking' ? 'Contacting the server…'
                    : serverState === 'down' ? 'The server can not be reached right now.'
                    : '';
            };

            const setMode = (next) => {
                if (busy || next === mode) return;
                mode = next;
                setError('');
                info.textContent = '';
                render();
                (username.value ? password : username).focus();
            };

            show.addEventListener('change', () => { password.type = confirm.type = show.checked ? 'text' : 'password'; });
            tabLogin.addEventListener('click', () => setMode('login'));
            tabRegister.addEventListener('click', () => setMode('register'));

            const finish = (result) => {
                root.classList.add('sbauth-leaving');
                setTimeout(() => { root.remove(); style.remove(); }, 400);
                resolve(result);
            };

            offlineButton?.addEventListener('click', () => finish({ mode: 'offline' }));

            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (busy) return;
                setError('');

                const name = username.value.trim();
                const pass = password.value;
                if (!name || !pass) return setError(mode === 'login' ? 'Enter your username and password.' : 'Choose a username and a password.');
                if (mode === 'register') {
                    if (!USERNAME_RE.test(name)) return setError('Usernames are 3-20 characters: letters, numbers and underscores.');
                    if (pass.length < 8) return setError('Passwords need at least 8 characters.');
                    if (pass !== confirm.value) return setError('The two passwords do not match.');
                    if (inviteRequired && !invite.value.trim()) return setError('Enter the invite code you were given.');
                }

                busy = true;
                render();
                // A sleeping free server needs a while: say so instead of looking frozen
                const waking = setTimeout(() => { info.textContent = 'The server is waking up. This can take up to a minute…'; }, 4000);

                try {
                    const user = mode === 'register'
                        ? await AuthService.register({ username: name, password: pass, inviteCode: invite.value.trim() })
                        : await AuthService.login({ username: name, password: pass });
                    clearTimeout(waking);
                    finish({ mode: 'online', user });
                } catch (e) {
                    clearTimeout(waking);
                    busy = false;
                    info.textContent = '';
                    setError(e.message || 'Something went wrong. Please try again.');
                    render();
                    password.focus();
                    password.select();
                }
            });

            document.head.append(style);
            document.body.append(root);
            startSmoke(root);
            render();
            username.focus();

            // Wake the server and learn whether an invite code is needed, while the player types
            AuthService.health().then(
                (health) => { serverState = 'ready'; inviteRequired = !!health.inviteRequired; render(); },
                () => { serverState = 'down'; render(); }
            );
        });
    }
};
