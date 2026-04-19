import { BaseController } from '../core/baseController.js'; 
import { gameState } from '../../../../shared/state/gameState.js';
import { events } from '../../core/eventBus.js'; 
import { ContextMenuManager } from '../../ui/ContextMenuManager.js'; // Adjust path if needed

export class PartyController extends BaseController {
    constructor(input) {
        super(input); // Standardize input via BaseController

        this.selectedIndex = 0;
        this.gridColumns = 3; 
        
        // --- CONTEXT ---
        this.mode = 'DEFAULT'; // 'DEFAULT' or 'BATTLE_SELECT'
        this.activeIndices = []; // Tracks who is currently active in battle
        this.callback = null;    // Stores the callback from the SceneManager

        // --- STATE MACHINE ---
        // Options: 'NAVIGATING', 'SWAPPING' 
        // (Menu state is now derived from this.contextMenu.menu)
        this.state = 'NAVIGATING'; 

        // --- MANAGERS ---
        this.contextMenu = new ContextMenuManager();

        // --- SWAP DATA ---
        this.swappingIdx = null; 
    }

    /**
     * Called by sceneManager when transitioning TO this scene.
     */
    init(data = {}) {
        this.mode = data.mode || 'DEFAULT';
        this.activeIndices = data.activeIndices || [];
        this.callback = data.callback || null; 
        this.state = 'NAVIGATING';
        this.selectedIndex = 0;
        this.swappingIdx = null;
        this.contextMenu.close();
    }

    // ========================================================
    // STANDARDIZED INPUT HANDLING (Overrides BaseController)
    // ========================================================

    onClick(hitboxId) {
        const party = gameState.party.members;

        // 1. Handling Clicks while MENU is open
        if (this.contextMenu.menu) {
            // Clicked empty space or an irrelevant element
            if (!hitboxId) {
                this.contextMenu.close();
                return;
            }

            // ADD THIS: Absorb clicks on the menu's empty padding
            if (hitboxId === 'MENU_BG') {
                return; 
            }

            // Clicked a menu option
            if (hitboxId.startsWith('MENU_OPT_')) {
                const menuActionIndex = parseInt(hitboxId.replace('MENU_OPT_', ''), 10);
                this.contextMenu.executeAction(menuActionIndex);
                return;
            }

            // Clicked a card while menu was open
            if (hitboxId.startsWith('CARD_')) {
                const cardIndex = parseInt(hitboxId.replace('CARD_', ''), 10);
                
                if (cardIndex < party.length && cardIndex !== this.selectedIndex) {
                    this.selectedIndex = cardIndex;
                }
                this.contextMenu.close();
            } else {
                // Catch-all for non-card/non-menu clicks
                this.contextMenu.close();
            }
            return; 
        }

        // 2. Handling Clicks while NAVIGATING or SWAPPING
        if (!hitboxId || !hitboxId.startsWith('CARD_')) return;

        const clickedIndex = parseInt(hitboxId.replace('CARD_', ''), 10);
        if (clickedIndex >= party.length) return; 

        if (this.state === 'NAVIGATING') {
            if (this.selectedIndex !== clickedIndex) {
                this.selectedIndex = clickedIndex;
            } else {
                this.confirmSelection(); // Context-aware click (opening menu or selecting for battle)
            }
        } 
        else if (this.state === 'SWAPPING') {
            this.selectedIndex = clickedIndex;
            this.completeSwap();
        }
    }

    onRightClick(hitboxId) {
        // We completely ignore the 'hitboxId' here.
        // A right-click anywhere on the canvas triggers the "Back/Cancel" hierarchy.

        if (this.contextMenu.menu) {
            // 1st Priority: Close the context menu if it's open
            this.contextMenu.close();
        } else if (this.state === 'SWAPPING') {
            // 2nd Priority: Cancel a character move/swap
            this.swappingIdx = null;
            this.state = 'NAVIGATING';
        } else {
            // 3rd Priority: Exit the party screen entirely
            this.cancelAndReturn();
        }
    }

    handleKeyDown(keyCode, e) {
        // Map the intent from BaseController if available
        const intent = typeof this._mapKeyCodeToIntent === 'function' ? this._mapKeyCodeToIntent(keyCode) : null;

        if (this.contextMenu.menu) {
            this.contextMenu.handleNavigation(intent);
        } 
        else if (this.state === 'NAVIGATING') {
            this.handleNavigatingKeys(intent, e);
        } 
        else if (this.state === 'SWAPPING') {
            this.handleSwappingKeys(intent, e);
        }
    }

    // ==========================================
    //           STATE 1: NAVIGATING
    // ==========================================
    handleNavigatingKeys(intent, e) {
        const memberCount = gameState.party.members.length;
        const col = this.selectedIndex % this.gridColumns;

        // Grid Navigation
        if (intent === 'RIGHT' || e.code === 'ArrowRight' || e.code === 'KeyD') {
            if (col < this.gridColumns - 1 && this.selectedIndex + 1 < memberCount) this.selectedIndex++;
        } 
        else if (intent === 'LEFT' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
            if (col > 0) this.selectedIndex--;
        }
        else if (intent === 'DOWN' || e.code === 'ArrowDown' || e.code === 'KeyS') {
            const target = this.selectedIndex + this.gridColumns;
            if (target < memberCount) {
                this.selectedIndex = target;
            } else if (target >= memberCount && this.selectedIndex < memberCount - 1) {
                this.selectedIndex = memberCount - 1;
            }
        }
        else if (intent === 'UP' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            if (this.selectedIndex - this.gridColumns >= 0) this.selectedIndex -= this.gridColumns;
        }
        
        // Action Confirm
        else if (intent === 'CONFIRM' || e.code === 'Enter' || e.code === 'Space') {
            this.confirmSelection();
        }

        // Return / Cancel
        else if (intent === 'CANCEL' || e.code === 'KeyP' || e.code === 'Escape' || e.code === 'Tab') {
            this.cancelAndReturn();
        }
    }

    confirmSelection() {
        if (this.mode === 'BATTLE_SELECT' || this.mode === 'ENCOUNTER_SELECT') {
            const member = gameState.party.members[this.selectedIndex];
            const isDead = member.hp <= 0;
            const isActive = this.activeIndices.includes(this.selectedIndex);

            if (isDead || isActive) {
                console.log("[Party] Cannot select this member.");
                // Optionally emit a sound event here: events.emit('PLAY_SOUND', 'error');
                return; 
            }

            if (this.callback) {
                this.callback(this.selectedIndex);
            }

            const targetScene = this.mode === 'BATTLE_SELECT' ? 'battle' : 'encounter';
            events.emit('CHANGE_SCENE', { scene: targetScene });
        } else {
            this.openMenu();
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
    //            STATE 2: MENU
    // ==========================================
    openMenu() {
        const member = gameState.party.members[this.selectedIndex];
        if (!member) return;
        
        // Define the base options first
        const options = [
            {
                label: 'Summary',
                actionId: 'SUMMARY',
                callback: () => {
                    console.log(`[Party] Opening Summary for ${member.name}`);
                    events.emit('CHANGE_SCENE', { 
                        scene: 'character_summary', 
                        data: { memberIndex: this.selectedIndex, character: member } 
                    });
                }
            },
            {
                label: 'Move',
                actionId: 'MOVE',
                callback: () => {
                    this.state = 'SWAPPING';
                    this.swappingIdx = this.selectedIndex; 
                }
            },
            {
                label: 'Exile',
                actionId: 'EXILE',
                callback: () => {
                    this.exileMember(this.selectedIndex);
                }
            }
        ];
        
        // Add the Level Up option at the very end if they have points
        if (member.skillPoints && member.skillPoints > 0) {
            options.push({
                label: 'Spend Skill Points',
                actionId: 'SKILLS',
                callback: () => {
                    console.log(`[Party] Opening Skills for ${member.name}`);
                    events.emit('CHANGE_SCENE', { 
                        scene: 'level_up', 
                        data: { memberIndex: this.selectedIndex, character: member } 
                    });
                }
            });
        }

        this.contextMenu.open(0, 0, options, member);
    }

    exileMember(index) {
        const party = gameState.party.members;
        
        if (party.length <= 1) {
            console.warn("Cannot exile the last party member.");
            return;
        }
        
        console.log(`[Party] Exiled ${party[index].name}`);
        party.splice(index, 1);

        if (this.selectedIndex >= party.length) {
            this.selectedIndex = Math.max(0, party.length - 1);
        }
    }

    // ==========================================
    //            STATE 3: SWAPPING
    // ==========================================
    handleSwappingKeys(intent, e) {
        const memberCount = gameState.party.members.length;
        const col = this.selectedIndex % this.gridColumns;

        if (intent === 'RIGHT' || e.code === 'ArrowRight' || e.code === 'KeyD') {
             if (col < this.gridColumns - 1 && this.selectedIndex + 1 < memberCount) this.selectedIndex++;
        }
        else if (intent === 'LEFT' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
             if (col > 0) this.selectedIndex--;
        }
        else if (intent === 'DOWN' || e.code === 'ArrowDown' || e.code === 'KeyS') {
             const target = this.selectedIndex + this.gridColumns;
             if (target < memberCount) {
                 this.selectedIndex = target;
             } else if (target >= memberCount && this.selectedIndex < memberCount - 1) {
                 this.selectedIndex = memberCount - 1;
             }
        }
        else if (intent === 'UP' || e.code === 'ArrowUp' || e.code === 'KeyW') {
             if (this.selectedIndex - this.gridColumns >= 0) this.selectedIndex -= this.gridColumns;
        }
        else if (intent === 'CONFIRM' || e.code === 'Enter' || e.code === 'Space') {
            this.completeSwap();
        }
        else if (intent === 'CANCEL' || e.code === 'Escape' || e.code === 'Backspace') {
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
            menu: this.contextMenu.menu, // Pass the active ContextMenu object
            mode: this.mode,                     
            activeIndices: this.activeIndices,
            
            // UI Interaction Manager requirements
            hoveredElement: this.hoveredHitboxId ? { id: this.hoveredHitboxId } : null,
            onLayoutUpdate: (hitboxes) => {
                this.updateHitboxes(hitboxes);
            }
        };
    }
}