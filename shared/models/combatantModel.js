import { StatCalculator } from '../systems/statCalculator.js';

export class CombatantModel {
    /**
     * @param {EntityModel} entityModel - The persistent data (stats, equipment, etc)
     * @param {boolean} isPlayer - True if this is a player character
     */
    constructor(entityModel, isPlayer = false) {
        this.model = entityModel; 
        this.isPlayer = isPlayer;
        
        // 1. Snapshot Base Stats
        // We calculate this ONCE at the start of battle so we don't re-run 
        // the heavy StatCalculator logic every single frame.
        this.baseStats = StatCalculator.calculate(this.model);

        // 2. Volatile Battle State (Resets when this object is destroyed/battle ends)
        this.statStages = {
            attack: 0,
            defense: 0,
            speed: 0,
            accuracy: 0,
            evasion: 0
        };

        // 3. Status Effects (e.g., { flinch: true, poison: 3 })
        this.volatiles = {}; 
        
        // 4. Action Gauge (for Turn-Based logic if needed later)
        this.actionGauge = 0; 
    }

    // --- PROXY GETTERS (Pass-through to the persistent EntityModel) ---
    
    get id() { return this.model.id; }
    get name() { return this.model.name; }
    
    // HP modifies the ACTUAL entity, so damage sticks after battle
    get hp() { return this.model.hp; }
    set hp(val) { this.model.hp = val; } 
    
    get maxHp() { return this.baseStats.maxHp; }

    // --- BATTLE CALCULATIONS ---

    /**
     * effective Attack = (Base Stat) * (Stage Multiplier)
     */
    getAttack(type = 'blunt') {
        const stage = this.statStages.attack;
        const multiplier = this._getStageMultiplier(stage);
        
        // Handle specific damage types if your StatCalculator separates them
        // otherwise default to a generic 'strength' or 'attack'
        const base = this.baseStats.attributes.strength || 10; 
        
        return Math.floor(base * multiplier);
    }

    /**
     * effective Defense = (Base Stat) * (Stage Multiplier)
     */
    getDefense(type = 'blunt') {
        const stage = this.statStages.defense;
        const multiplier = this._getStageMultiplier(stage);
        
        const base = this.baseStats.attributes.defense || 10;
        
        return Math.floor(base * multiplier);
    }

    getSpeed() {
        const stage = this.statStages.speed;
        const multiplier = this._getStageMultiplier(stage);
        
        // Check where 'speed' lives in your StatCalculator output
        // (Usually derived or a primary attribute)
        const base = this.baseStats.attributes.speed || this.baseStats.speed || 10;
        
        return Math.floor(base * multiplier);
    }

    /**
     * Calculates the multiplier for stat stages.
     * Standard RPG Logic:
     * +1 = 1.5x, +2 = 2.0x, -1 = 0.66x, -2 = 0.5x
     */
    _getStageMultiplier(stage) {
        if (stage >= 0) {
            return (2 + stage) / 2;
        } else {
            return 2 / (2 + Math.abs(stage));
        }
    }

    // --- MUTATORS ---

    /**
     * Changes a stat stage (e.g., Growl uses this).
     * Clamps between -6 and +6.
     */
    modifyStage(stat, amount) {
        if (this.statStages[stat] === undefined) return "Invalid stat";

        const oldStage = this.statStages[stat];
        this.statStages[stat] = Math.max(-6, Math.min(6, oldStage + amount));

        const diff = this.statStages[stat] - oldStage;
        if (diff === 0) return `${this.name}'s ${stat} won't go any ${amount > 0 ? 'higher' : 'lower'}!`;

        const direction = amount > 0 ? "rose" : "fell";
        return `${this.name}'s ${stat} ${direction}!`;
    }

    /**
     * Modifies HP/MP/Stamina.
     * Delegates to the underlying model so changes persist.
     */
    modifyResource(resourceId, amount) {
        return this.model.modifyResource(resourceId, amount);
    }
}