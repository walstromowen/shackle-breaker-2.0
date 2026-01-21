import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../core/eventBus.js'; 

export class PartyController {
    constructor() {
        this.selectedIndex = 0;
        this.gridColumns = 3; 
        
        // --- STATE MACHINE ---
        // 'NAVIGATING' = Moving cursor / selecting cards
        // 'MENU'       = Context menu is open (Move/Inspect/Exile)
        // 'SWAPPING'   = Moving a card to a new slot
        this.state = 'NAVIGATING'; 

        // --- MENU DATA ---
        this.menuOptions = ['Move', 'Inspect', 'Exile'];
        this.menuIndex = 0;

        // --- SWAP DATA ---
        this.swappingIdx = null; // The index of the card being moved
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
     * @param {number} x - Mouse X position
     * @param {number} y - Mouse Y position
     * @param {PartyRenderer} renderer - The renderer instance (needed for hit detection)
     */
    handleMouseDown(x, y, renderer) {
        // --- 1. MENU INTERACTION ---
        // If the menu is open, we prioritize checking menu clicks.
        if (this.state === 'MENU') {
            // Check if we clicked a specific button in the menu
            // Pass selectedIndex because the menu draws relative to the selected card
            const menuActionIndex = renderer.getMenuHit(x, y, this.selectedIndex);
            
            if (menuActionIndex !== -1) {
                // Clicked a button (Move, Inspect, etc.)
                this.selectMenuOption(menuActionIndex);
            } else {
                // Clicked outside the menu -> Close it
                this.state = 'NAVIGATING';
                
                // Optional: If they clicked a DIFFERENT card, select it immediately
                const cardIndex = renderer.getHitIndex(x, y);
                if (cardIndex !== -1) {
                    this.selectedIndex = cardIndex;
                }
            }
            return; // Stop processing to prevent clicking "through" the menu
        }

        // --- 2. CARD INTERACTION ---
        const clickedIndex = renderer.getHitIndex(x, y);
        if (clickedIndex === -1) return; // Clicked empty background

        // Logic based on current state
        if (this.state === 'NAVIGATING') {
            if (this.selectedIndex !== clickedIndex) {
                // A. Select new card
                this.selectedIndex = clickedIndex;
            } else {
                // B. Clicked the ALREADY selected card -> Open Menu
                this.openMenu();
            }
        } 
        else if (this.state === 'SWAPPING') {
            // In swap mode, clicking a card means "Drop the held card here"
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
            if (target < memberCount) this.selectedIndex = target;
            else if (target >= memberCount && this.selectedIndex < memberCount - 1) this.selectedIndex = memberCount - 1;
        }
        else if (code === 'ArrowUp' || code === 'KeyW') {
            if (this.selectedIndex - this.gridColumns >= 0) this.selectedIndex -= this.gridColumns;
        }
        
        // Open Menu
        else if (code === 'Enter' || code === 'Space') {
            this.openMenu();
        }

        // Exit Scene
        else if (code === 'KeyP' || code === 'Escape' || code === 'Tab') {
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
        }
    }

    // ==========================================
    //             STATE 2: MENU
    // ==========================================
    openMenu() {
        this.state = 'MENU';
        this.menuIndex = 0; // Always start highlighting the top option
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
        else if (code === 'Escape' || code === 'Backspace') {
            this.state = 'NAVIGATING';
        }
    }

    selectMenuOption(index) {
        const option = this.menuOptions[index];

        if (option === 'Move') {
            this.state = 'SWAPPING';
            this.swappingIdx = this.selectedIndex; // Mark current card as "being moved"
        } 
        else if (option === 'Inspect') {
            console.log(`[Party] Inspecting ${gameState.party.members[this.selectedIndex].name}`);
            // Example: events.emit('CHANGE_SCENE', { scene: 'character_summary', memberIdx: this.selectedIndex });
            this.state = 'NAVIGATING'; 
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
        
        const removed = party[index];
        console.log(`[Party] Exiled ${removed.name}`);
        
        party.splice(index, 1);

        // Adjust selection index so it doesn't point out of bounds
        if (this.selectedIndex >= party.length) {
            this.selectedIndex = Math.max(0, party.length - 1);
        }
    }

    // ==========================================
    //           STATE 3: SWAPPING
    // ==========================================
    handleSwappingKeys(code) {
        // Navigation (Same as Navigating)
        const memberCount = gameState.party.members.length;
        const col = this.selectedIndex % this.gridColumns;

        if (code === 'ArrowRight' || code === 'KeyD') {
             if (col < this.gridColumns - 1 && this.selectedIndex + 1 < memberCount) this.selectedIndex++;
        }
        else if (code === 'ArrowLeft' || code === 'KeyA') {
             if (col > 0) this.selectedIndex--;
        }
        else if (code === 'ArrowDown' || code === 'KeyS') {
             const t = this.selectedIndex + this.gridColumns;
             if (t < memberCount) this.selectedIndex = t;
        }
        else if (code === 'ArrowUp' || code === 'KeyW') {
             if (this.selectedIndex - this.gridColumns >= 0) this.selectedIndex -= this.gridColumns;
        }

        // Actions
        else if (code === 'Enter' || code === 'Space') {
            this.completeSwap();
        }
        else if (code === 'Escape' || code === 'Backspace') {
            this.swappingIdx = null; // Cancel
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
        // Standard array swap
        [p[from], p[to]] = [p[to], p[from]];
    }

    /**
     * Prepare the state object for the renderer
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