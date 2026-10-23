// frontend/src/auth/authGate.js: what main.js runs before anything else. Resolves once we know who is playing.
import { AuthService } from './authService.js';
import { AuthScreen } from './authScreen.js';
import { SaveManager } from '../engine/saveManager.js';
import { HybridSaveStore } from './cloudSaveStore.js';
import { goFullscreenWhenAllowed } from '../engine/fullscreen.js';

/**
 * 1. A login remembered from an earlier visit is offered as "Welcome back" (no waiting for a sleeping server: nothing is sent yet).
 * 2. Otherwise (or after "Not you?") the Log In / Create Account screen is shown.
 * Then saves are pointed at the right place: the account's own store when logged in, plain localStorage when playing offline.
 * Resolves { mode: 'online' | 'offline', user, store }.
 */
export async function runAuthGate() {
    let result;
    const remembered = AuthService.restoreStoredSession();
    if (remembered && (await AuthScreen.welcomeBack(remembered)) === 'continue') {
        result = { mode: 'online', user: remembered };
    } else {
        if (remembered) AuthService.logout();     // "Not you?"
        result = await AuthScreen.show();
    }

    // Through the login: go fullscreen now, before the boot screen's loading bar starts (the button the player just pressed allows it)
    goFullscreenWhenAllowed();

    if (result.mode === 'online') {
        result.store = new HybridSaveStore(result.user);
        SaveManager.setStore(result.store);
    }
    return result;
}
