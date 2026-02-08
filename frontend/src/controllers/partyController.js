import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../core/eventBus.js'; 

export class PartyController {
    constructor() {
        this.selectedIndex = 0;
        this.gridColumns = 3; 
        
        // --- STATE MACHINE ---
        this.state = 'NAVIGATING'; // Options: 'NAVIGATING', 'MENU', 'SWAPPING'

        // --- MENU DATA ---
        this.menuOptions = ['Summary', 'Move', 'Exile'];
        this.menuIndex = 0;

        // --- SWAP DATA ---
        this.swappingIdx = null; 
    }

    /**
     * Handle global key events (Arrows, Enter, Esc)
     */
    handleKeyDown(code) {
        if (this.state === 'NAVIGATING') {
            this.handleNavigatingKeys(code);
        } 
        else if (this.state === 'MENU') {
            this.handleMenuKeys(code);
        }
        else if (this.state === 'SWAPPING') {
            this.handleSwappingKeys(code);
        }
    }

    /**
     * Handle mouse clicks from the Input system.
     * @param {number} x - Mouse X relative to canvas
     * @param {number} y - Mouse Y relative to canvas
     * @param {Object} renderer - The renderer to calculate hit boxes
     */
    handleMouseDown(x, y, renderer) {
        const party = gameState.party.members;
        
        // --- 1. MENU INTERACTION ---
        if (this.state === 'MENU') {
            // Check if we clicked a specific menu button
            const menuActionIndex = renderer.getMenuHit(x, y, this.selectedIndex);
            
            if (menuActionIndex !== -1) {
                this.selectMenuOption(menuActionIndex);
                return;
            } 
            
            // If we didn't click the menu, check if we clicked a DIFFERENT card.
            // This allows the user to jump from Card A's menu to Card B's menu in one click.
            const cardIndex = renderer.getHitIndex(x, y);

            if (cardIndex !== -1 && cardIndex < party.length) {
                if (cardIndex !== this.selectedIndex) {
                    this.selectedIndex = cardIndex;
                    // Reset to navigating so the new selection is active immediately
                    this.state = 'NAVIGATING';
                } else {
                    // Clicked the *same* card outside the menu buttons -> Close menu
                    this.state = 'NAVIGATING';
                }
            } else {
                // Clicked empty void -> Close menu
                this.state = 'NAVIGATING';
            }
            return; 
        }

        // --- 2. CARD INTERACTION (NAVIGATING / SWAPPING) ---
        const clickedIndex = renderer.getHitIndex(x, y);

        // BOUNDS CHECK: Ignore clicks on empty slots (prevents Summary crash on undefined members)
        if (clickedIndex === -1 || clickedIndex >= party.length) return; 

        if (this.state === 'NAVIGATING') {
            if (this.selectedIndex !== clickedIndex) {
                // Just select the new card
                this.selectedIndex = clickedIndex;
            } else {
                // Clicked the already-selected card -> Open Menu
                this.openMenu();
            }
        } 
        else if (this.state === 'SWAPPING') {
            this.selectedIndex = clickedIndex;
            this.completeSwap();
        }
    }

    // ==========================================
    //           STATE 1: NAVIGATING
    // ==========================================
    handleNavigatingKeys(code) {
        const memberCount = gameState.party.members.length;
        const col = this.selectedIndex % this.gridColumns;

        // Grid Navigation
        if (code === 'ArrowRight' || code === 'KeyD') {
            if (col < this.gridColumns - 1 && this.selectedIndex + 1 < memberCount) this.selectedIndex++;
        } 
        else if (code === 'ArrowLeft' || code === 'KeyA') {
            if (col > 0) this.selectedIndex--;
        }
        else if (code === 'ArrowDown' || code === 'KeyS') {
            const target = this.selectedIndex + this.gridColumns;
            if (target < memberCount) {
                this.selectedIndex = target;
            } else if (target >= memberCount && this.selectedIndex < memberCount - 1) {
                // Snap to last item if moving down into empty space
                this.selectedIndex = memberCount - 1;
            }
        }
        else if (code === 'ArrowUp' || code === 'KeyW') {
            if (this.selectedIndex - this.gridColumns >= 0) this.selectedIndex -= this.gridColumns;
        }
        
        // Open Menu
        else if (code === 'Enter' || code === 'Space') {
            this.openMenu();
        }

        // Return to Overworld
        else if (code === 'KeyP' || code === 'Escape' || code === 'Tab') {
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
        }
    }

    // ==========================================
    //            STATE 2: MENU
    // ==========================================
    openMenu() {
        this.state = 'MENU';
        this.menuIndex = 0; 
    }

    handleMenuKeys(code) {
        if (code === 'ArrowUp' || code === 'KeyW') {
            this.menuIndex = Math.max(0, this.menuIndex - 1);
        } 
        else if (code === 'ArrowDown' || code === 'KeyS') {
            this.menuIndex = Math.min(this.menuOptions.length - 1, this.menuIndex + 1);
        }
        else if (code === 'Enter' || code === 'Space') {
            this.selectMenuOption(this.menuIndex);
        }
        // UX: Allow Left/Escape to close menu
        else if (code === 'Escape' || code === 'Backspace' || code === 'ArrowLeft') {
            this.state = 'NAVIGATING';
        }
    }

    selectMenuOption(index) {
        const option = this.menuOptions[index];
        const member = gameState.party.members[this.selectedIndex];

        // Safety check
        if (!member) { 
            this.state = 'NAVIGATING';
            return; 
        }

        if (option === 'Summary') {
            console.log(`[Party] Opening Summary for ${member.name}`);
            
            // Pass the FULL character object. 
            // This prevents the "Summary Bug" where the scene might try to look up an invalid index.
            events.emit('CHANGE_SCENE', { 
                scene: 'character_summary', 
                data: { 
                    memberIndex: this.selectedIndex,
                    character: member 
                } 
            });
            
            this.state = 'NAVIGATING'; 
        }
        else if (option === 'Move') {
            this.state = 'SWAPPING';
            this.swappingIdx = this.selectedIndex; 
        } 
        else if (option === 'Exile') {
            this.exileMember(this.selectedIndex);
            this.state = 'NAVIGATING';
        }
    }

    exileMember(index) {
        const party = gameState.party.members;
        
        if (party.length <= 1) {
            console.warn("Cannot exile the last party member.");
            return;
        }
        
        console.log(`[Party] Exiled ${party[index].name}`);
        party.splice(index, 1);

        // Clamp selection to ensure we don't point to an empty slot
        if (this.selectedIndex >= party.length) {
            this.selectedIndex = Math.max(0, party.length - 1);
        }
    }

    // ==========================================
    //            STATE 3: SWAPPING
    // ==========================================
    handleSwappingKeys(code) {
        const memberCount = gameState.party.members.length;
        const col = this.selectedIndex % this.gridColumns;

        // Same navigation logic as Navigating
        if (code === 'ArrowRight' || code === 'KeyD') {
             if (col < this.gridColumns - 1 && this.selectedIndex + 1 < memberCount) this.selectedIndex++;
        }
        else if (code === 'ArrowLeft' || code === 'KeyA') {
             if (col > 0) this.selectedIndex--;
        }
        else if (code === 'ArrowDown' || code === 'KeyS') {
             const target = this.selectedIndex + this.gridColumns;
             if (target < memberCount) {
                 this.selectedIndex = target;
             } else if (target >= memberCount && this.selectedIndex < memberCount - 1) {
                 this.selectedIndex = memberCount - 1;
             }
        }
        else if (code === 'ArrowUp' || code === 'KeyW') {
             if (this.selectedIndex - this.gridColumns >= 0) this.selectedIndex -= this.gridColumns;
        }

        // Actions
        else if (code === 'Enter' || code === 'Space') {
            this.completeSwap();
        }
        else if (code === 'Escape' || code === 'Backspace') {
            this.swappingIdx = null; 
            this.state = 'NAVIGATING';
        }
    }

    completeSwap() {
        // Only swap if indices are different
        if (this.swappingIdx !== null && this.swappingIdx !== this.selectedIndex) {
            this.swapMembers(this.swappingIdx, this.selectedIndex);
        }
        this.swappingIdx = null;
        this.state = 'NAVIGATING';
    }

    swapMembers(from, to) {
        const p = gameState.party.members;
        // Simple array swap
        [p[from], p[to]] = [p[to], p[from]];
    }

    /**
     * Used by the Renderer to draw the UI
     */
    getState() {
        return { 
            members: gameState.party.members,
            selectedIndex: this.selectedIndex,
            swappingIdx: this.swappingIdx,
            menuOpen: (this.state === 'MENU'),
            menuOptions: this.menuOptions,
            menuIndex: this.menuIndex
        };
    }
}