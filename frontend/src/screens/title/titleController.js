import { BaseController } from '../../engine/baseController.js';
import { events } from '../../../../shared/core/eventBus.js';
import { SaveManager } from '../../engine/saveManager.js';
import { AuthService } from '../../auth/authService.js';
import { graphics } from '../../engine/graphics.js';
import { NOTICE_BUTTONS } from '../../ui/graphicsNotice.js';

export class TitleController extends BaseController {
    constructor(input) {
        super(input);

        // Define our semantic menu data
        this.menuItems = [
            { id: 'btn_new_game', text: 'New Game' },
            { id: 'btn_load_game', text: 'Load Game' },
            { id: 'btn_multiplayer', text: 'Multiplayer' },
            { id: 'btn_options', text: 'Settings' },
            // Logged in: log out. Playing offline: go back to the login screen.
            { id: 'btn_account', text: AuthService.isLoggedIn ? 'Log Out' : 'Log In' }
        ];

        // Start with -1 so no button is highlighted by default
        this.selectedIndex = -1;

        // "Load Game" needs a save to load; the answer comes from the SaveStore (async), see refreshSaveState()
        this.hasSave = false;
        this.message = null;   // a short line under the buttons ("No saved game yet.")
        this.refreshSaveState();

        // The title screen is the root: there is nothing to go back to, so Back (right-click / Esc / Tab) is silent here.
        this.cancelSfxOnRightClick = false;

        // Since the user already interacted with the Auth screen prior to this,
        // the browser's AudioContext is fully unlocked. This will play instantly!
        events.emit('PLAY_MUSIC', { id: 'shackle_breaker_theme_1', fadeTime: 2.0 });
    }

    // Pass necessary data to the renderer
    getState() {
        // the graphics notice (ui/graphicsNotice.js): once a visit, when the browser draws without the graphics card
        if (this.notice === undefined) {
            this.notice = graphics.noticeWanted;
            this.noticeIndex = 0;
            if (this.notice) graphics.noticeShown = true;
        }
        return {
            gpuNotice: !!this.notice,
            menuItems: this.menuItems.map(item => item.id === 'btn_load_game' ? { ...item, disabled: !this.hasSave } : item),
            message: this.message,
            accountLabel: this.getAccountLabel(),
            // One highlighted button: the hovered one in mouse mode, the keyboard cursor in keyboard mode
            hoveredId: this.getFocusId()
        };
    }

    /** The small line in the corner: who is playing, and whether the saves are reaching the server. */
    getAccountLabel() {
        if (!AuthService.isLoggedIn) return 'Playing offline: saves stay on this device';
        const sync = SaveManager.getStore().syncStatus;
        const note = sync === 'failed' ? '  (server unreachable: saving on this device)'
                   : sync === 'auth' ? '  (login expired: log out and back in to sync)'
                   : '';
        return `Signed in as ${AuthService.user.username}${note}`;
    }

    /** Asks the SaveStore whether there is a save to continue (called when the title screen is entered). */
    refreshSaveState() {
        this.message = null;
        SaveManager.list().then(list => { this.hasSave = list.length > 0; }, () => { this.hasSave = false; });
    }

    // ======================================================== //
    //     FOCUS (shared standard, see BaseController)          //
    // ======================================================== //

    getKeyboardFocusId() {
        if (this.notice) return NOTICE_BUTTONS[this.noticeIndex].id;
        return this.selectedIndex >= 0 ? (this.menuItems[this.selectedIndex]?.id ?? null) : null;
    }

    // The mouse moved onto a button: the keyboard cursor follows it (silent; UIInteractionManager adds the hover tick)
    setFocusFromPointer(hitboxId) {
        if (this.notice) {
            const n = NOTICE_BUTTONS.findIndex(b => b.id === hitboxId);
            if (n >= 0) this.noticeIndex = n;
            return;
        }
        const index = this.menuItems.findIndex(item => item.id === hitboxId);
        if (index >= 0) this.selectedIndex = index;
    }

    onHover(hitboxId) {
        super.onHover(hitboxId);
        // Clear the selection when the mouse leaves every button (not while the keyboard is driving)
        if (!hitboxId && this.inputMode === 'mouse') this.selectedIndex = -1;
    }

    // ======================================================== //
    //     STANDARDIZED INPUT HANDLING                          //
    // ======================================================== //

    handleKeyDown(keyCode, e) {
        const intent = this.resolveIntent(keyCode, e);
        if (!intent) return;

        if (this.notice) {
            if (intent === 'LEFT' || intent === 'RIGHT' || intent === 'UP' || intent === 'DOWN') {
                this.noticeIndex = (this.noticeIndex + 1) % NOTICE_BUTTONS.length;
                this.playNavSound();
            } else if (intent === 'CONFIRM') {
                this.onClick(NOTICE_BUTTONS[this.noticeIndex].id);
            } else if (intent === 'CANCEL') {
                this.notice = false;
                this.playCancelSound();
            }
            return;
        }

        const count = this.menuItems.length;
        const prevIndex = this.selectedIndex;

        if (intent === 'UP') {
            // First press jumps to the bottom
            this.selectedIndex = this.selectedIndex === -1 ? count - 1 : (this.selectedIndex - 1 + count) % count;
            if (this.selectedIndex !== prevIndex) this.playNavSound();
        } else if (intent === 'DOWN') {
            // First press jumps to the top
            this.selectedIndex = this.selectedIndex === -1 ? 0 : (this.selectedIndex + 1) % count;
            if (this.selectedIndex !== prevIndex) this.playNavSound();
        } else if (intent === 'CONFIRM') {
            const selectedItem = this.menuItems[this.selectedIndex];
            if (selectedItem) this.onClick(selectedItem.id);
        }
        // CANCEL: nothing to go back to on the root menu.
    }

    // --- SEMANTIC UI TRANSLATIONS ---

    // Left-Click / CONFIRM: Selecting/Advancing
    onClick(hitboxId) {
        if (!hitboxId) return;

        // the graphics notice is in front of the menu: only its buttons answer
        if (this.notice) {
            if (hitboxId === 'gpu_never') graphics.hideNoticeForGood();
            if (hitboxId === 'gpu_ok' || hitboxId === 'gpu_never') {
                this.notice = false;
                this.playConfirmSound();
            }
            return;
        }

        switch (hitboxId) {
            case 'btn_new_game':
                this.playConfirmSound();
                events.emit('CHANGE_SCENE', { scene: 'character-creator' });
                break;
            case 'btn_load_game':
                if (!this.hasSave) {
                    this.message = 'No saved game yet.';
                    this.playErrorSound();
                    break;
                }
                this.message = null;
                this.playConfirmSound();
                events.emit('CHANGE_SCENE', { scene: 'saves', data: { mode: 'title' } });   // pick which save to load
                break;
            case 'btn_multiplayer':
                if (!AuthService.isLoggedIn) {
                    this.message = 'Log in to play online.';
                    this.playErrorSound();
                    break;
                }
                this.message = null;
                this.playConfirmSound();
                events.emit('CHANGE_SCENE', { scene: 'multiplayer' });
                break;
            case 'btn_account':
                this.playConfirmSound();
                AuthService.logout();
                window.location.reload();      // the simplest clean slate: the next load starts at the login screen
                break;
            case 'btn_options':
                this.playConfirmSound();
                events.emit('CHANGE_SCENE', { scene: 'settings', data: { from: 'title' } });
                break;
        }
    }

    // Right-Click / CANCEL: Universal Back/Cancel. Nothing to go back to at the root menu.
    onRightClick(hitboxId) {
        return false;
    }
}
