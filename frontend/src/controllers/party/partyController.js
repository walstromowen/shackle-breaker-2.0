import { BaseController } from '../core/baseController.js';
import { gameState } from '../../../../shared/state/gameState.js';
import { events } from '../../core/eventBus.js';
import { ContextMenuManager } from '../../ui/contextMenuManager.js';
import { DragAndDropManager } from '../../ui/dragAndDropManager.js';

export class PartyController extends BaseController {
    constructor(input) {
        super(input);
        this.extraBindings = { KeyP: 'CANCEL' }; // the party key closes the party screen, like Esc
        this.selectedIndex = 0;
        this.gridColumns = 3;

        // --- CONTEXT ---
        this.mode = 'DEFAULT';
        this.activeIndices = [];
        this.callback = null;

        // --- STATE MACHINE ---
        this.state = 'NAVIGATING';

        // --- MANAGERS ---
        this.contextMenu = new ContextMenuManager({ owner: this }); // the menu plays its sounds through this controller
        this.dragManager = new DragAndDropManager();

        // --- SWAP DATA ---
        this.swappingIdx = null;
        this.hoveredHitboxId = null;
        this.ignoreNextClick = false;
    }

    init(data = {}) {
        this.mode = data.mode || 'DEFAULT';
        this.activeIndices = data.activeIndices || [];
        this.callback = data.callback || null;
        this.state = 'NAVIGATING';
        this.selectedIndex = 0;
        this.swappingIdx = null;
        this.hoveredHitboxId = null;
        this.ignoreNextClick = false;
        this.contextMenu.close();
        this.dragManager.cancelDrag();
    }

    // ========================================================
    // STANDARDIZED INPUT HANDLING
    // ========================================================

    // The keyboard cursor: the card under selectedIndex, or the lit option while the context menu is open
    getKeyboardFocusId() {
        const menu = this.contextMenu.menu;
        if (menu) return menu.selectedIndex >= 0 ? `MENU_OPT_${menu.selectedIndex}` : null;
        if (this.selectedIndex < 0 || this.selectedIndex >= gameState.party.members.length) return null;
        return `CARD_${this.selectedIndex}`;
    }

    // The mouse moved onto something: the cursor follows it (silent; UIInteractionManager adds the hover tick)
    setFocusFromPointer(hitboxId) {
        if (hitboxId) this._syncFocusWithHover(hitboxId);
    }

    _syncFocusWithHover(hitboxId) {
        if (this.contextMenu.menu) {
            if (hitboxId.startsWith('MENU_OPT_')) {
                const menuActionIndex = parseInt(hitboxId.replace('MENU_OPT_', ''), 10);
                this.contextMenu.menu.selectedIndex = menuActionIndex;
            } else {
                // Mouse left the menu options
                this.contextMenu.menu.selectedIndex = -1;
            }
            return;
        }

        if (hitboxId.startsWith('CARD_')) {
            const cardIndex = parseInt(hitboxId.replace('CARD_', ''), 10);
            if (cardIndex < gameState.party.members.length) {
                this.selectedIndex = cardIndex;
            }
        }
    }

    onClick(hitboxId, fromKeyboard = false) {
        if (this.ignoreNextClick) return;

        const party = gameState.party.members;

        if (this.contextMenu.menu) {
            if (!hitboxId) {
                this.contextMenu.close();
                this.playCancelSound(); // Feedback for closing
                return;
            }
            if (hitboxId === 'MENU_BG') return false; // the menu's background: nothing happens

            if (hitboxId.startsWith('MENU_OPT_')) {
                const menuActionIndex = parseInt(hitboxId.replace('MENU_OPT_', ''), 10);
                this.contextMenu.executeAction(menuActionIndex);
                return;
            }

            // Clicking outside the menu closes it
            this.playCancelSound();
            if (hitboxId.startsWith('CARD_')) {
                const cardIndex = parseInt(hitboxId.replace('CARD_', ''), 10);
                if (cardIndex < party.length && cardIndex !== this.selectedIndex) {
                    this.selectedIndex = cardIndex;
                }
                this.contextMenu.close();
            } else {
                this.contextMenu.close();
            }
            return;
        }

        if (!hitboxId || !hitboxId.startsWith('CARD_')) return;

        const clickedIndex = parseInt(hitboxId.replace('CARD_', ''), 10);
        if (clickedIndex >= party.length) return;

        if (this.state === 'NAVIGATING') {
            if (this.selectedIndex !== clickedIndex) {
                this.selectedIndex = clickedIndex; // just moves the cursor: the default click sound
            } else {
                // Pass the fromKeyboard flag down!
                this.confirmSelection(fromKeyboard);
            }
        } else if (this.state === 'SWAPPING') {
            this.selectedIndex = clickedIndex;
            this.completeSwap();
        }
    }

    onRightClick(hitboxId) {
        // Added specialized Cancel SFX to all RIGHT CLICK logic
        if (this.dragManager.dragState.active) {
            this.dragManager.cancelDrag();
            this.playCancelSound();
            return;
        }

        if (this.contextMenu.menu) {
            this.contextMenu.close();
            this.playCancelSound();
        } else if (this.state === 'SWAPPING') {
            this.swappingIdx = null;
            this.state = 'NAVIGATING';
            this.playCancelSound();
        } else {
            this.cancelAndReturn();
            this.playCancelSound();
        }
    }

    // ========================================================
    // STANDARD DRAG AND DROP CALLBACKS
    // ========================================================

    onDragStart(hitboxId) {
        if (this.contextMenu.menu) return;
        // Block drag and drop operations if selecting a member for battle or encounter
        if (this.mode === 'BATTLE_SELECT' || this.mode === 'ENCOUNTER_SELECT') return;

        if (hitboxId && typeof hitboxId === 'string' && hitboxId.startsWith('CARD_')) {
            const clickedIndex = parseInt(hitboxId.replace('CARD_', ''), 10);
            const member = gameState.party.members[clickedIndex];

            if (member) {
                this.selectedIndex = clickedIndex;
                // (the drag-start sound is the standard one, added by UIInteractionManager)

                // Safely use this.mouse.x/y inherited from BaseController
                this.dragManager.startDrag(
                    member, 'PARTY', clickedIndex, this.mouse.x, this.mouse.y,
                    (payload, sourceId, originSlot, dropTargetId) => {
                        if (dropTargetId && typeof dropTargetId === 'string' && dropTargetId.startsWith('CARD_')) {
                            const targetIndex = parseInt(dropTargetId.replace('CARD_', ''), 10);
                            if (originSlot !== targetIndex && targetIndex < gameState.party.members.length) {
                                this.swapMembers(originSlot, targetIndex);
                                this.selectedIndex = targetIndex;
                            }
                        }
                    }
                );
            }
        }
    }

    onDragMove(x, y) {
        if (this.dragManager.dragState.active) {
            this.dragManager.updateDrag(x, y);
        }
    }

    onDrop(sourceHitboxId, targetHitboxId) {
        if (this.dragManager.dragState.active) {
            this.dragManager.endDrag(targetHitboxId);
            
            // Placed on a card: confirm. Dropped anywhere else the drag is simply let go: cancel.
            if (targetHitboxId && targetHitboxId.startsWith('CARD_')) {
                this.playConfirmSound();
            } else {
                this.playCancelSound();
            }

            this.ignoreNextClick = true;
            setTimeout(() => this.ignoreNextClick = false, 50);
        }
    }

    handleKeyDown(keyCode, e) {
        const intent = this.resolveIntent(keyCode, e); // also hands control to the keyboard
        if (!intent) return;

        // Now the context menu will successfully receive 'UP', 'DOWN', 'CONFIRM', etc.
        if (this.contextMenu.menu) {
            this.contextMenu.handleNavigation(intent);
        } else if (this.state === 'NAVIGATING') {
            this.handleNavigatingKeys(intent);
        } else if (this.state === 'SWAPPING') {
            this.handleSwappingKeys(intent);
        }
    }

    // Moves the cursor one step on the card grid (shared by NAVIGATING and SWAPPING); plays the nav tick when it really moved
    _moveCursor(intent) {
        const memberCount = gameState.party.members.length;
        const col = this.selectedIndex % this.gridColumns;
        const oldIndex = this.selectedIndex;

        if (intent === 'RIGHT') {
            if (col < this.gridColumns - 1 && this.selectedIndex + 1 < memberCount) this.selectedIndex++;
        } else if (intent === 'LEFT') {
            if (col > 0) this.selectedIndex--;
        } else if (intent === 'DOWN') {
            const target = this.selectedIndex + this.gridColumns;
            if (target < memberCount) {
                this.selectedIndex = target;
            } else if (this.selectedIndex < memberCount - 1) {
                this.selectedIndex = memberCount - 1;
            }
        } else if (intent === 'UP') {
            if (this.selectedIndex - this.gridColumns >= 0) this.selectedIndex -= this.gridColumns;
        }

        if (this.selectedIndex !== oldIndex) this.playNavSound();
    }

    // ==========================================
    //            STATE 1: NAVIGATING
    // ==========================================
    handleNavigatingKeys(intent) {
        this._moveCursor(intent);

        if (intent === 'CONFIRM') {
            // Flag as true so the menu highlights the first option (confirmSelection plays the sound)
            this.confirmSelection(true);
        } else if (intent === 'CANCEL') {
            this.playCancelSound();
            this.cancelAndReturn();
        }
    }

    confirmSelection(fromKeyboard = false) {
        if (this.mode === 'BATTLE_SELECT' || this.mode === 'ENCOUNTER_SELECT') {
            const member = gameState.party.members[this.selectedIndex];
            const isDead = member.hp <= 0;
            const isActive = this.activeIndices.includes(this.selectedIndex);

            if (isDead || isActive) {
                console.log("[Party] Cannot select this member.");
                this.playErrorSound(); // that member can't be picked
                return;
            }

            this.playConfirmSound();

            if (this.callback) {
                this.callback(this.selectedIndex);
            }
            const targetScene = this.mode === 'BATTLE_SELECT' ? 'battle' : 'encounter';
            events.emit('CHANGE_SCENE', { scene: targetScene });
        } else {
            this.playConfirmSound();
            this.openMenu(fromKeyboard);
        }
    }

    cancelAndReturn() {
        if (this.mode === 'BATTLE_SELECT' || this.mode === 'ENCOUNTER_SELECT') {
            if (this.callback) {
                this.callback(null);
            }
            const targetScene = this.mode === 'BATTLE_SELECT' ? 'battle' : 'encounter';
            events.emit('CHANGE_SCENE', { scene: targetScene });
        } else {
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
        }
    }

    // ==========================================
    //             STATE 2: MENU
    // ==========================================
    openMenu(fromKeyboard = false) {
        const member = gameState.party.members[this.selectedIndex];
        if (!member) return;

        const options = [
            {
                label: 'Summary', actionId: 'SUMMARY', callback: () => {
                    events.emit('CHANGE_SCENE', { scene: 'character_summary', data: { memberIndex: this.selectedIndex, character: member } });
                }
            },
            {
                label: 'Move', actionId: 'MOVE', callback: () => {
                    this.state = 'SWAPPING';
                    this.swappingIdx = this.selectedIndex;
                }
            }
        ];

        // Render the Exile option ONLY if there is more than 1 party member
        if (gameState.party.members.length > 1) {
            options.push({
                label: 'Exile', actionId: 'EXILE', callback: () => {
                    this.exileMember(this.selectedIndex);
                }
            });
        }

        if (member.skillPoints && member.skillPoints > 0) {
            options.push({
                label: 'Spend Skill Points', actionId: 'SKILLS', callback: () => {
                    events.emit('CHANGE_SCENE', { scene: 'level_up', data: { memberIndex: this.selectedIndex, character: member } });
                }
            });
        }

        // UX Upgrade: Spawn at the mouse cursor if clicked, or roughly center if keyboard
        let menuX = 0;
        let menuY = 0;
        if (!fromKeyboard && this.mouse) {
            menuX = this.mouse.x;
            menuY = this.mouse.y;
        }

        this.contextMenu.open(menuX, menuY, options, member);

        // Dynamic Menu Highlight Logic
        if (this.contextMenu.menu) {
            if (!fromKeyboard) {
                // Clear default highlight for mouse users
                this.contextMenu.menu.selectedIndex = -1;
            } else {
                // Pre-select the first option for keyboard users
                this.contextMenu.menu.selectedIndex = 0;
            }
        }
    }

    exileMember(index) {
        const party = gameState.party.members;
        if (party.length <= 1) {
            console.warn("Cannot exile the last party member.");
            return;
        }
        party.splice(index, 1);
        if (this.selectedIndex >= party.length) {
            this.selectedIndex = Math.max(0, party.length - 1);
        }
    }

    // ==========================================
    //             STATE 3: SWAPPING
    // ==========================================
    handleSwappingKeys(intent) {
        this._moveCursor(intent);

        if (intent === 'CONFIRM') {
            this.completeSwap(); // plays the confirm sound
        } else if (intent === 'CANCEL') {
            this.playCancelSound();
            this.swappingIdx = null;
            this.state = 'NAVIGATING';
        }
    }

    completeSwap() {
        this.playConfirmSound();
        if (this.swappingIdx !== null && this.swappingIdx !== this.selectedIndex) {
            this.swapMembers(this.swappingIdx, this.selectedIndex);
        }
        this.swappingIdx = null;
        this.state = 'NAVIGATING';
    }

    swapMembers(from, to) {
        const p = gameState.party.members;
        [p[from], p[to]] = [p[to], p[from]];
    }

    // ========================================================
    // STATE ACCESS FOR RENDERER
    // ========================================================
    getState() {
        return {
            members: gameState.party.members,
            selectedIndex: this.selectedIndex,
            swappingIdx: this.swappingIdx,
            menu: this.contextMenu.menu,
            mode: this.mode,
            activeIndices: this.activeIndices,
            dragState: this.dragManager.dragState,
            // The one lit element: the card (or menu option) under the mouse, or the keyboard cursor
            hoveredElement: this.getFocusId() ? { id: this.getFocusId() } : null,
            onLayoutUpdate: (hitboxes) => {
                this.updateHitboxes(hitboxes);
            }
        };
    }
}