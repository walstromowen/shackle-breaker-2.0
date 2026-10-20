// frontend/src/core/fullscreen.js: take the game fullscreen once the player is through the login (before the boot screen's loading bar).
// Browsers only allow fullscreen from a click or a key press ("user activation", which lasts a few seconds), so:
//   - if the player has just clicked (the CONTINUE / LOG IN / PLAY OFFLINE button) it goes fullscreen straight away;
//   - if that click is too old (a sleeping server can take a minute to answer a login), it goes fullscreen on the very next click or key press.
// Pressing Esc leaves fullscreen as usual and the game never forces it back.

function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

/** Asks for fullscreen. Resolves true when the browser went fullscreen, false when it refused or there is no API. */
async function enterFullscreen() {
    if (isFullscreen()) return true;
    const root = document.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!request) return false;   // e.g. iPhone Safari: no fullscreen API for pages
    try {
        await request.call(root, { navigationUI: 'hide' });
        return true;
    } catch (e) {
        return false;             // refused (no recent click or key press): the caller waits for the next one
    }
}

export function goFullscreenWhenAllowed() {
    if (isFullscreen()) return;

    const waitForGesture = () => {
        const names = ['pointerdown', 'keydown'];
        const onGesture = () => {
            for (const name of names) window.removeEventListener(name, onGesture, true);
            enterFullscreen();
        };
        for (const name of names) window.addEventListener(name, onGesture, true);
    };

    const activeNow = navigator.userActivation ? navigator.userActivation.isActive : true;
    if (activeNow) {
        enterFullscreen().then((ok) => { if (!ok && document.hasFocus()) waitForGesture(); });
    } else {
        waitForGesture();
    }
}
