export class BattleState {
    constructor() {
        this.phase = 'INIT'; // INIT, SELECTION, EXECUTION, VICTORY, DEFEAT
        this.turnCount = 0;
        
        // Teams
        this.teams = {
            player: {
                active: [], // Array of Combatant Objects (up to 3)
                reserve: [], // Array of Combatant Objects (up to 3)
                id: 'player'
            },
            enemy: {
                active: [],
                reserve: [],
                id: 'enemy'
            }
        };

        // The Queue of things to happen (Text, Animation, Damage)
        // The Renderer reads this to know what to show
        this.eventQueue = []; 

        // Actions committed this turn (Move Selection)
        this.pendingActions = []; 
    }

    // Helper to get a specific combatant by ID
    getCombatant(id) {
        const all = [...this.teams.player.active, ...this.teams.player.reserve, 
                     ...this.teams.enemy.active, ...this.teams.enemy.reserve];
        return all.find(c => c.id === id);
    }
}