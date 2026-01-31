import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../core/eventBus.js'; 

export class PartyController {
    constructor() {
        this.selectedIndex = 0;
        this.gridColumns = 3; 
        
        // --- STATE MACHINE ---
        this.state = 'NAVIGATING'; 

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
     * Handle mouse clicks.
     */
    handleMouseDown(x, y, renderer) {
        // --- 1. MENU INTERACTION ---
        if (this.state === 'MENU') {
            // Pass selectedIndex because the menu draws relative to the selected card
            const menuActionIndex = renderer.getMenuHit(x, y, this.selectedIndex);
            
            if (menuActionIndex !== -1) {
                this.selectMenuOption(menuActionIndex);
            } else {
                // Clicked outside -> Close menu
                this.state = 'NAVIGATING';
                
                // Optional: Select the card underneath immediately
                const cardIndex = renderer.getHitIndex(x, y);
                if (cardIndex !== -1) this.selectedIndex = cardIndex;
            }
            return; 
        }

        // --- 2. CARD INTERACTION ---
        const clickedIndex = renderer.getHitIndex(x, y);
        if (clickedIndex === -1) return; 

        if (this.state === 'NAVIGATING') {
            if (this.selectedIndex !== clickedIndex) {
                this.selectedIndex = clickedIndex;
            } else {
                // Clicked same card -> Open Menu
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
        // UX Improvement: Allow Left Arrow to "Back out" of a menu context
        else if (code === 'Escape' || code === 'Backspace' || code === 'ArrowLeft') {
            this.state = 'NAVIGATING';
        }
    }

    selectMenuOption(index) {
        const option = this.menuOptions[index];

        if (option === 'Summary') {
            // Transition to Summary Scene, passing the current member index
            console.log(`[Party] Opening Summary for member ${this.selectedIndex}`);
            
            events.emit('CHANGE_SCENE', { 
                scene: 'character_summary', 
                data: { memberIndex: this.selectedIndex } 
            });
            
            // Reset state so it's clean when we return
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
                 // Consistent UX: Snap to last item if moving down
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