import { gameState } from '../../../shared/state/gameState.js';
import { events } from '../core/eventBus.js'; 

export class PartyController {
    constructor() {
        this.selectedIndex = 0;
    }

    handleKeyDown(code) {
        const memberCount = gameState.party.members.length;
        if (memberCount === 0) return;

        // Visual Grid Logic:
        // [0] [1]
        // [2] [3]
        // [4] [5]

        const col = this.selectedIndex % 2; // 0 = Left, 1 = Right

        // --- NAVIGATION ---
        
        // RIGHT: Move to next index, but only if currently in Left column
        if ((code === 'ArrowRight' || code === 'KeyD') && col === 0) {
            if (this.selectedIndex + 1 < memberCount) {
                this.selectedIndex++;
            }
        } 
        // LEFT: Move to previous index, but only if currently in Right column
        else if ((code === 'ArrowLeft' || code === 'KeyA') && col === 1) {
            this.selectedIndex--;
        }
        // DOWN: Jump +2. 
        else if (code === 'ArrowDown' || code === 'KeyS') {
            if (this.selectedIndex + 2 < memberCount) {
                this.selectedIndex += 2;
            } else if (col === 0 && this.selectedIndex + 1 < memberCount) {
                // UX Polish: If at bottom-left and can't go straight down, 
                // but there is a slot at bottom-right, go there.
                this.selectedIndex += 1;
            }
        }
        // UP: Jump -2
        else if (code === 'ArrowUp' || code === 'KeyW') {
            if (this.selectedIndex - 2 >= 0) {
                this.selectedIndex -= 2;
            }
        }

        // --- ACTIONS ---
        if (code === 'Enter' || code === 'Space') {
            // Placeholder: This is where you'd open a context menu (Summary/Switch/Item)
            const member = gameState.party.members[this.selectedIndex];
            console.log(`[Party] Selected ${member.name}`);
            // events.emit('OPEN_CONTEXT_MENU', member);
        }

        // --- EXIT ---
        if (code === 'KeyP' || code === 'Escape' || code === 'Tab' || code === 'Backspace') {
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
        }
    }

    getState() {
        return { 
            members: gameState.party.members,
            gold: gameState.party.gold,
            selectedIndex: this.selectedIndex
        };
    }
}