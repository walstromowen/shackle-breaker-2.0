export class EntityModel {
    /**
     * @param {Object} config - The raw JSON data (stats, name, etc.)
     */
    constructor(config) {
        // 1. Single Source of Truth
        this.state = structuredClone(config);

        // 2. Default Structure Enforcement
        
        // --- CORE STATS ---
        if (!this.state.stats) {
            this.state.stats = {
                hp: 10, maxHp: 10,
                stamina: 10, maxStamina: 10,
                insight: 0, maxInsight: 10
            };
        }

        // --- PROGRESSION DEFAULTS (New) ---
        // Ensure these exist to prevent UI NaN errors
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
        if (!this.state.baseStats.baseDefense) this.state.baseStats.baseDefense = {};
        if (!this.state.baseStats.baseResistance) this.state.baseStats.baseResistance = {};
        if (!this.state.baseStats.baseAttack) this.state.baseStats.baseAttack = {};
    }

    // --- GETTERS & SETTERS (The Proxy Layer) ---

    get id() { return this.state.id; }
    
    get name() { return this.state.name; }
    set name(val) { this.state.name = val; }

    get portrait() { return this.state.portrait; }
    
    get level() { return this.state.level; }
    set level(val) { this.state.level = val; }

    // [NEW] Progression Accessors
    get xp() { return this.state.xp; }
    set xp(val) { this.state.xp = val; }

    get maxXp() { return this.state.maxXp; }
    set maxXp(val) { this.state.maxXp = val; }

    get skillPoints() { return this.state.skillPoints; }
    set skillPoints(val) { this.state.skillPoints = val; }

    get attributes() { return this.state.attributes || {}; }

    // --- DERIVED COMBAT STATS (The "Magic" Part) ---
    // Calculated on-demand. No imports needed.

    /**
     * Calculates Current Defense
     * Formula: Base + Equipment + Attribute Scaling
     */
    get defense() {
        const totals = {};
        const base = this.state.baseStats.baseDefense; 
        const gear = this._getEquipmentStats().defense; 

        // 1. Get all unique damage types found on this entity (Base keys + Gear keys)
        const allTypes = new Set([...Object.keys(base), ...Object.keys(gear)]);

        allTypes.forEach(type => {
            let val = (base[type] || 0) + (gear[type] || 0);
            totals[type] = val;
        });

        return totals;
    }

    /**
     * Calculates Current Resistance
     * Formula: Base + Equipment
     */
    get resistance() {
        const totals = {};
        const base = this.state.baseStats.baseResistance;
        const gear = this._getEquipmentStats().resistance;

        const allTypes = new Set([...Object.keys(base), ...Object.keys(gear)]);

        allTypes.forEach(type => {
            totals[type] = (base[type] || 0) + (gear[type] || 0);
        });

        return totals;
    }

    /**
     * Calculates Attack Power
     * Logic: If holding weapon -> Use Weapon stats. If empty -> Use Base Natural stats.
     */
    get attack() {
        const weapon = this.state.equipment.mainHand; 
        
        // SCENARIO A: ARMED
        // (Assuming 'weapon' is an Item object with a 'damage' property)
        if (weapon && weapon.damage) {
            // We return the weapon damage. 
            // TODO: Add attribute scaling logic here later (e.g. + Strength)
            return { ...weapon.damage }; 
        } 
        
        // SCENARIO B: UNARMED / NATURAL
        else {
            const base = this.state.baseStats.baseAttack;
            const totals = {};
            
            for (const [type, val] of Object.entries(base)) {
                let currentVal = val;
                
                // Simple Attribute Scaling for Unarmed
                // If it's physical, add Strength scaling
                if (['blunt', 'slash', 'pierce'].includes(type)) {
                    currentVal += Math.floor((this.attributes.strength || 0) / 2);
                }

                if (currentVal > 0) totals[type] = currentVal;
            }
            return totals;
        }
    }

    // --- FLATTENED RESOURCES ---

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
    set maxStamina(val) { this.state.stats.maxStamina = val; } // Added setter for leveling

    get insight() { return this.state.stats.insight; }
    set insight(val) { 
        this.state.stats.insight = Math.max(0, Math.min(val, this.maxInsight)); 
    }
    get maxInsight() { return this.state.stats.maxInsight; }
    set maxInsight(val) { this.state.stats.maxInsight = val; } // Added setter for leveling

    // --- HELPER METHODS ---

    /**
     * LOOPS through all equipment slots and sums up defense/resistance.
     */
    _getEquipmentStats() {
        const summary = { defense: {}, resistance: {} };
        const slots = ['head', 'torso', 'legs', 'feet', 'arms', 'offHand', 'accessory'];

        slots.forEach(slot => {
            const item = this.state.equipment[slot];
            if (!item) return; // Empty slot

            // Merge Defense
            if (item.defense) {
                for (const [key, val] of Object.entries(item.defense)) {
                    summary.defense[key] = (summary.defense[key] || 0) + val;
                }
            }
            // Merge Resistance
            if (item.resistance) {
                for (const [key, val] of Object.entries(item.resistance)) {
                    summary.resistance[key] = (summary.resistance[key] || 0) + val;
                }
            }
        });
        return summary;
    }

    /**
     * Returns true if the entity is dead (HP <= 0).
     */
    isDead() {
        return this.hp <= 0;
    }

    /**
     * For saving the game. Returns the raw state object.
     */
    toJSON() {
        return this.state;
    }
}