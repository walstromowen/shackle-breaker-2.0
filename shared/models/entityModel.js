/**
 * shared/models/entityModel.js
 */
import { StatCalculator } from '../../shared/systems/statCalculator.js';

// [NEW] Required to generate abilities when equipping items
import { AbilityFactory } from '../systems/factories/abilityFactory.js';

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

        // --- [NEW] RUNTIME ABILITY CONTAINER ---
        // We do NOT store complex Ability objects in 'this.state' (which is for saving JSON).
        // Instead, they live on the instance. The Factory populates this.
        this.abilities = []; 
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
    
    // We modify this via equipItem(), but the getter is needed for the Calculator
    get equipment() { return this.state.equipment || {}; }
    
    get statusEffects() { return this.state.statusEffects || []; }

    // =========================================================
    // ✅ MIGRATION: USE THE CALCULATOR
    // =========================================================
    
    /**
     * The single source of calculated stats.
     */
    get stats() {
        return StatCalculator.calculate(this);
    }

    get attack() { return this.stats.attack; }         
    get defense() { return this.stats.defenses; }      
    get resistance() { return this.stats.resistances; }
    
    get speed() { return this.stats.speed; }           
    get corruption() { return this.stats.corruption; } 

    get critical() { return this.stats.critChance; }   
    get critMultiplier() { return this.stats.critMultiplier; }

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

    // =========================================================
    // --- [NEW] ABILITY MANAGEMENT ---
    // =========================================================

    /**
     * Adds abilities to the entity, tagged with a source.
     * @param {Array<AbilityModel>} abilityList - List of instantiated abilities
     * @param {String} source - 'innate', 'mainHand', 'accessory', etc.
     */
    addAbilities(abilityList, source = 'innate') {
        if (!abilityList || abilityList.length === 0) return;

        // Tag each ability so we know where it came from (for removal later)
        abilityList.forEach(ability => {
            ability.source = source; 
        });

        this.abilities.push(...abilityList);
    }

    /**
     * Removes all abilities associated with a specific source.
     */
    removeAbilitiesBySource(source) {
        if (source === 'innate') {
            console.warn("[EntityModel] Warning: Attempting to remove innate abilities.");
        }
        this.abilities = this.abilities.filter(a => a.source !== source);
    }

    // =========================================================
    // --- [NEW] EQUIPMENT MANAGEMENT ---
    // =========================================================

    /**
     * Equips an item into a slot, handling ability swaps.
     * @param {string} slot - 'mainHand', 'head', etc.
     * @param {ItemModel} itemModel - The item instance
     */
    equipItem(slot, itemModel) {
        // 1. Remove old item & its abilities
        this.unequipItem(slot);

        // 2. Set new item in state
        this.state.equipment[slot] = itemModel;

        // 3. Add new abilities (if the item has any)
        if (itemModel && itemModel.grantedAbilities) {
            // Use Factory to convert strings ["cleave"] -> Objects [AbilityModel]
            const newMoves = AbilityFactory.createAbilities(itemModel.grantedAbilities);
            
            // Add them with the slot as the source
            this.addAbilities(newMoves, slot);
        }
    }

    /**
     * Unequips an item from a slot.
     * @param {string} slot 
     */
    unequipItem(slot) {
        // 1. Remove abilities linked to this slot
        this.removeAbilitiesBySource(slot);
        
        // 2. Clear item from state
        this.state.equipment[slot] = null;
    }

    // --- HELPER METHODS ---

    isDead() {
        return this.hp <= 0;
    }

    toJSON() {
        return this.state;
    }
}