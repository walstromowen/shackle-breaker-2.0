import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../core/eventBus.js'; 

export class PartyController {
    constructor() {
        // UI State for navigating the menu
        this.selectedIndex = 0;
        this.tab = 'stats'; // Potential tabs: 'stats', 'inventory', 'formation'
    }

    handleKeyDown(code) {
        const memberCount = gameState.party.members.length;

        // 1. Close Menu (Return to Overworld)
        if (code === 'KeyP' || code === 'Escape' || code === 'Tab') {
            console.log("[Party] Closing Menu...");
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
            return;
        }

        // 2. Navigation (Select different Party Members)
        if (code === 'ArrowUp' || code === 'KeyW') {
            this.selectedIndex = (this.selectedIndex - 1 + memberCount) % memberCount;
        } 
        else if (code === 'ArrowDown' || code === 'KeyS') {
            this.selectedIndex = (this.selectedIndex + 1) % memberCount;
        }

        // 3. Tab Switching (Example logic)
        if (code === 'ArrowLeft' || code === 'KeyA') {
            // Placeholder for tab switching logic
        }
    }

    getState() {
        return { 
            members: gameState.party.members,
            inventory: gameState.party.inventory,
            ui: {
                selectedIndex: this.selectedIndex,
                activeTab: this.tab
            }
        };
    }
}