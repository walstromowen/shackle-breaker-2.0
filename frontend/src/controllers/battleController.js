import { gameState } from '../../../shared/state/gameState.js';

export class BattleController {
    constructor(input, config, worldManager) {
        this.input = input;
        this.config = config;
        
        // Simple state object
        this.state = null;
    }

    /**
     * @param {Object[]} enemies - Array of ALREADY CREATED entity objects
     * @param {Object} context - Background info
     */
    start(enemies, context) {
        console.log(`[BattleController] Received Entities:`, enemies);

        // 1. GET PARTY (Direct from Global State)
        // We just grab the reference. No wrappers. No 'CombatantModel'.
        const party = gameState.party.members; 

        // 2. SETUP STATE
        // We just store the raw arrays. The Renderer will read .name, .hp, .sprite directly.
        this.state = {
            active: true,
            phase: 'INTRO', 
            
            // THE RAW DATA
            party: party,    
            enemies: enemies,

            // Simple UI State
            menuIndex: 0,
            message: `Battle started!`
        };
    }

    handleKeyDown(key) {
        if (!this.state || !this.state.active) return;
        
        console.log("Battle Input:", key);
        
        // Simple "Exit" for testing
        if (key === 'Escape') {
            this.state.active = false;
            // You'd emit an event to go back to overworld here
        }
    }

    update(dt) {
        // No logic yet. Just data storage.
    }

    getState() {
        return this.state;
    }
}