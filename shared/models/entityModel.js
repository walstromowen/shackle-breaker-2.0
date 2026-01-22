import { StatCalculator } from '../../shared/systems/statCalculator.js';

export class EntityModel {
    /**
     * @param {Object} config - The raw JSON data (stats, name, etc.)
     */
    constructor(config) {
        // 1. Single Source of Truth
        this.state = structuredClone(config);

        // --- CORE STATS ---
        if (!this.state.stats) {
            this.state.stats = {
                hp: 10, maxHp: 10,
                stamina: 10, maxStamina: 10,
                insight: 0, maxInsight: 10
            };
        }

        // --- PROGRESSION DEFAULTS ---
        if (typeof this.state.xp === 'undefined') this.state.xp = 0;
        if (typeof this.state.maxXp === 'undefined') this.state.maxXp = 100;
        if (typeof this.state.skillPoints === 'undefined') this.state.skillPoints = 0;
        if (typeof this.state.level === 'undefined') this.state.level = 1;

        // --- INVENTORY ---
        if (!this.state.equipment) {
            this.state.equipment = {};
        }

        // --- COMBAT BASE STATS ---
        if (!this.state.baseStats) this.state.baseStats = {};
        // We no longer need deep defaults here because StatCalculator handles missing keys safely
    }

    // --- GETTERS & SETTERS (The Proxy Layer) ---

    get id() { return this.state.id; }
    
    get name() { return this.state.name; }
    set name(val) { this.state.name = val; }

    get portrait() { return this.state.portrait; }
    
    get level() { return this.state.level; }
    set level(val) { this.state.level = val; }

    get xp() { return this.state.xp; }
    set xp(val) { this.state.xp = val; }

    get maxXp() { return this.state.maxXp; }
    set maxXp(val) { this.state.maxXp = val; }

    get skillPoints() { return this.state.skillPoints; }
    set skillPoints(val) { this.state.skillPoints = val; }

    // Ensure we return the raw object so the Calculator can read it
    get attributes() { return this.state.attributes || {}; }
    get equipment() { return this.state.equipment || {}; }

    // =========================================================
    // ✅ MIGRATION: USE THE CALCULATOR
    // =========================================================
    
    /**
     * The single source of calculated stats.
     * Returns: { attacks, defenses, resistances, other }
     */
    get stats() {
        return StatCalculator.calculate(this);
    }

    // Proxies for backward compatibility (if your combat system calls .attack)
    get attack() { return this.stats.attacks; }
    get defense() { return this.stats.defenses; }
    get resistance() { return this.stats.resistances; }
    
    // New derived stats that didn't exist before
    get speed() { return this.stats.other.speed; }
    get critical() { return this.stats.other.critical; }
    get corruption() { return this.stats.other.corruption; }

    // =========================================================
    // --- FLATTENED RESOURCES ---
    // =========================================================

    get hp() { return this.state.stats.hp; }
    set hp(val) { 
        this.state.stats.hp = Math.max(0, Math.min(val, this.maxHp)); 
    }

    get maxHp() { return this.state.stats.maxHp; }
    set maxHp(val) { this.state.stats.maxHp = val; }

    get stamina() { return this.state.stats.stamina; }
    set stamina(val) { 
        this.state.stats.stamina = Math.max(0, Math.min(val, this.maxStamina)); 
    }
    get maxStamina() { return this.state.stats.maxStamina; }
    set maxStamina(val) { this.state.stats.maxStamina = val; }

    get insight() { return this.state.stats.insight; }
    set insight(val) { 
        this.state.stats.insight = Math.max(0, Math.min(val, this.maxInsight)); 
    }
    get maxInsight() { return this.state.stats.maxInsight; }
    set maxInsight(val) { this.state.stats.maxInsight = val; }

    // --- HELPER METHODS ---

    isDead() {
        return this.hp <= 0;
    }

    toJSON() {
        return this.state;
    }
}