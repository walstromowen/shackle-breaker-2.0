import { BaseController } from '../core/baseController.js';
import { gameState } from '../../../../shared/state/gameState.js';
import { events } from '../../core/eventBus.js';
import { ContextMenuManager } from '../../ui/ContextMenuManager.js';
import { DragAndDropManager } from '../../ui/dragAndDropManager.js';

const KEY_BINDINGS = {
    'ArrowUp': 'UP', 'KeyW': 'UP',
    'ArrowDown': 'DOWN', 'KeyS': 'DOWN',
    'ArrowLeft': 'LEFT', 'KeyA': 'LEFT',
    'ArrowRight': 'RIGHT', 'KeyD': 'RIGHT',
    'Enter': 'CONFIRM', 'Space': 'CONFIRM',
    'Escape': 'CANCEL', 'Backspace': 'CANCEL', 'KeyP': 'CANCEL', 'Tab': 'CANCEL'
};

export class PartyController extends BaseController {
    constructor(input) {
        super(input);
        this.selectedIndex = 0;
        this.gridColumns = 3;

        // --- CONTEXT ---
        this.mode = 'DEFAULT';
        this.activeIndices = [];
        this.callback = null;

        // --- STATE MACHINE ---
        this.state = 'NAVIGATING';

        // --- MANAGERS ---
        this.contextMenu = new ContextMenuManager();
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

    handleMouseMove(x, y, isMouseDown, renderer) {
        // Cache the previous hover state
        const prevHoverId = this.hoveredHitboxId;
        super.handleMouseMove(x, y, isMouseDown, renderer);

        // --- SYNC KEYBOARD LOGIC WITH MOUSE HOVER ---
        if (this.hoveredHitboxId && this.hoveredHitboxId !== prevHoverId) {
            this._syncFocusWithHover(this.hoveredHitboxId);
        }
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
            if (hitboxId === 'MENU_BG') return;

            if (hitboxId.startsWith('MENU_OPT_')) {
                const menuActionIndex = parseInt(hitboxId.replace('MENU_OPT_', ''), 10);
                this.contextMenu.executeAction(menuActionIndex);
                return;
            }

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
                this.selectedIndex = clickedIndex;
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
                // Added distinct sound for initiating a drag
                events.emit('PLAY_SFX', { id: 'ui_drag_start', volume: 0.5 });

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
            
            // Trigger feedback sound only if dropped on a valid target
            if (targetHitboxId && targetHitboxId.startsWith('CARD_')) {
                this.playConfirmSound(); // Reuse cinematicBoom for successful placement
            }

            this.ignoreNextClick = true;
            setTimeout(() => this.ignoreNextClick = false, 50);
        }
    }

    handleKeyDown(keyCode, e) {
        // 1. Try to get the intent from our explicit bindings first
        // 2. Fallback to the BaseController's mapper if the key isn't in our list
        let intent = (e && KEY_BINDINGS[e.code]) || (typeof this._mapKeyCodeToIntent === 'function' ? this._mapKeyCodeToIntent(keyCode) : null);

        // Now the context menu will successfully receive 'UP', 'DOWN', 'CONFIRM', etc.
        if (this.contextMenu.menu) {
            this.contextMenu.handleNavigation(intent);
        } else if (this.state === 'NAVIGATING') {
            this.handleNavigatingKeys(intent, e);
        } else if (this.state === 'SWAPPING') {
            this.handleSwappingKeys(intent, e);
        }
    }

    // ==========================================
    //            STATE 1: NAVIGATING
    // ==========================================
    handleNavigatingKeys(intent, e) {
        const memberCount = gameState.party.members.length;
        const col = this.selectedIndex % this.gridColumns;
        const oldIndex = this.selectedIndex; // Track index before move

        if (intent === 'RIGHT' || e.code === 'ArrowRight' || e.code === 'KeyD') {
            if (col < this.gridColumns - 1 && this.selectedIndex + 1 < memberCount) this.selectedIndex++;
        } else if (intent === 'LEFT' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
            if (col > 0) this.selectedIndex--;
        } else if (intent === 'DOWN' || e.code === 'ArrowDown' || e.code === 'KeyS') {
            const target = this.selectedIndex + this.gridColumns;
            if (target < memberCount) {
                this.selectedIndex = target;
            } else if (target >= memberCount && this.selectedIndex < memberCount - 1) {
                this.selectedIndex = memberCount - 1;
            }
        } else if (intent === 'UP' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            if (this.selectedIndex - this.gridColumns >= 0) this.selectedIndex -= this.gridColumns;
        } 
        
        // --- Added randomized Nav SFX ---
        if (this.selectedIndex !== oldIndex) this.playNavSound();

        if (intent === 'CONFIRM' || e.code === 'Enter' || e.code === 'Space') {
            // Added specialized Confirm SFX
            this.playConfirmSound();
            // Flag as true so the menu highlights the first option
            this.confirmSelection(true);
        } else if (intent === 'CANCEL' || e.code === 'KeyP' || e.code === 'Escape' || e.code === 'Tab') {
            // Added specialized Cancel SFX
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
                this.playCancelSound(); // Feedback sound for invalid selection
                return;
            }

            if (this.callback) {
                this.callback(this.selectedIndex);
            }
            const targetScene = this.mode === 'BATTLE_SELECT' ? 'battle' : 'encounter';
            events.emit('CHANGE_SCENE', { scene: targetScene });
        } else {
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
    handleSwappingKeys(intent, e) {
        const memberCount = gameState.party.members.length;
        const col = this.selectedIndex % this.gridColumns;
        const oldIndex = this.selectedIndex; // Track index before move

        if (intent === 'RIGHT' || e.code === 'ArrowRight' || e.code === 'KeyD') {
            if (col < this.gridColumns - 1 && this.selectedIndex + 1 < memberCount) this.selectedIndex++;
        } else if (intent === 'LEFT' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
            if (col > 0) this.selectedIndex--;
        } else if (intent === 'DOWN' || e.code === 'ArrowDown' || e.code === 'KeyS') {
            const target = this.selectedIndex + this.gridColumns;
            if (target < memberCount) {
                this.selectedIndex = target;
            } else if (target >= memberCount && this.selectedIndex < memberCount - 1) {
                this.selectedIndex = memberCount - 1;
            }
        } else if (intent === 'UP' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            if (this.selectedIndex - this.gridColumns >= 0) this.selectedIndex -= this.gridColumns;
        } 
        
        // --- Added randomized Nav SFX ---
        if (this.selectedIndex !== oldIndex) this.playNavSound();

        if (intent === 'CONFIRM' || e.code === 'Enter' || e.code === 'Space') {
            // Added specialized Confirm SFX
            this.playConfirmSound();
            this.completeSwap();
        } else if (intent === 'CANCEL' || e.code === 'Escape' || e.code === 'Backspace') {
            // Added specialized Cancel SFX
            this.playCancelSound();
            this.swappingIdx = null;
            this.state = 'NAVIGATING';
        }
    }

    completeSwap() {
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
            hoveredElement: this.hoveredHitboxId ? { id: this.hoveredHitboxId } : null,
            onLayoutUpdate: (hitboxes) => {
                this.updateHitboxes(hitboxes);
            }
        };
    }
}