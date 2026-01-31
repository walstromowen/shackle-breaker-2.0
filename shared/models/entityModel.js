import { StatCalculator } from '../../shared/systems/statCalculator.js';
import { AbilityFactory } from '../systems/factories/abilityFactory.js';

export class EntityModel {
    constructor(config) {
        this.state = structuredClone(config);

        // 1. Initialize Base Resources
        if (!this.state.stats) {
            this.state.stats = {
                hp: 10, maxHp: 10,
                stamina: 10, maxStamina: 10,
                insight: 0, maxInsight: 10
            };
        }

        // 2. Initialize Attributes to prevent Calculator crashes
        if (!this.state.attributes) {
            this.state.attributes = {
                vigor: 0,
                strength: 0,
                dexterity: 0,
                intelligence: 0,
                attunement: 0
            };
        }

        // 3. Ensure arrays exist
        if (!this.state.traits) this.state.traits = [];
        if (!this.state.equipment) this.state.equipment = {};
        if (!this.state.baseStats) this.state.baseStats = {};

        // 4. Progression Defaults
        if (typeof this.state.xp === 'undefined') this.state.xp = 0;
        if (typeof this.state.maxXp === 'undefined') this.state.maxXp = 100;
        if (typeof this.state.skillPoints === 'undefined') this.state.skillPoints = 0;
        if (typeof this.state.level === 'undefined') this.state.level = 1;

        this.abilities = []; 
    }

    // --- GETTERS & SETTERS ---
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
    
    // Direct Access (Careful, modifying this directly bypasses calculators)
    get attributes() { return this.state.attributes; }
    get equipment() { return this.state.equipment; }
    get statusEffects() { return this.state.statusEffects || []; }
    get traits() { return this.state.traits; }

    // --- CALCULATED STATS ---
    // This is the "Brain" connection. It runs fresh math every time you ask for .stats
    get stats() {
        return StatCalculator.calculate(this);
    }

    // Convenience Getters for UI/Combat
    get attack() { return this.stats.attack; }         
    get defense() { return this.stats.defenses; }      
    get resistance() { return this.stats.resistance; }
    get speed() { return this.stats.speed; }           
    get critical() { return this.stats.critChance; }   
    get critMultiplier() { return this.stats.critMultiplier; }

    // --- RESOURCES (HP / STAMINA / INSIGHT) ---

    // HP
    get hp() { return this.state.stats.hp; }
    set hp(val) { 
        // We use the getter for maxHp to ensure we don't heal past the calculated max
        this.state.stats.hp = Math.max(0, Math.min(val, this.maxHp)); 
    }
    
    // [FIXED] Trust the Calculator for the Total
    get maxHp() { 
        return this.stats.maxHp || this.state.stats.maxHp || 10; 
    }
    // Set base only (StatCalculator adds bonuses on top of this)
    set maxHp(val) { this.state.stats.maxHp = val; }

    // STAMINA
    get stamina() { return this.state.stats.stamina; }
    set stamina(val) { 
        this.state.stats.stamina = Math.max(0, Math.min(val, this.maxStamina)); 
    }

    // [FIXED] Trust the Calculator for the Total
    get maxStamina() { 
        return this.stats.maxStamina || this.state.stats.maxStamina || 10;
    }
    set maxStamina(val) { this.state.stats.maxStamina = val; }

    // INSIGHT (MANA)
    get insight() { return this.state.stats.insight; }
    set insight(val) { 
        this.state.stats.insight = Math.max(0, Math.min(val, this.maxInsight)); 
    }

    // [FIXED] Trust the Calculator for the Total
    get maxInsight() { 
        return this.stats.maxInsight || this.state.stats.maxInsight || 0; 
    }
    set maxInsight(val) { this.state.stats.maxInsight = val; }


    // =========================================================
    // TRAIT MANAGEMENT
    // =========================================================
    
    addTrait(traitId) {
        if (!this.state.traits.includes(traitId)) {
            this.state.traits.push(traitId);
        }
    }

    removeTrait(traitId) {
        const idx = this.state.traits.indexOf(traitId);
        if (idx > -1) {
            this.state.traits.splice(idx, 1);
        }
    }

    // =========================================================
    // ABILITY & ITEM MANAGEMENT
    // =========================================================

    addAbilities(abilityList, source = 'innate') {
        if (!abilityList || abilityList.length === 0) return;
        abilityList.forEach(ability => {
            ability.source = source; 
        });
        this.abilities.push(...abilityList);
    }

    removeAbilitiesBySource(source) {
        if (source === 'innate') {
            console.warn("[EntityModel] Warning: Attempting to remove innate abilities.");
            return;
        }
        this.abilities = this.abilities.filter(a => a.source !== source);
    }

    equipItem(slot, itemModel) {
        this.unequipItem(slot);
        this.state.equipment[slot] = itemModel;
        
        // Grant abilities from the item (e.g., Sword grants "Slash")
        if (itemModel && itemModel.grantedAbilities) {
            const newMoves = AbilityFactory.createAbilities(itemModel.grantedAbilities);
            this.addAbilities(newMoves, slot);
        }
    }

    unequipItem(slot) {
        this.removeAbilitiesBySource(slot);
        this.state.equipment[slot] = null;
    }

    isDead() {
        return this.hp <= 0;
    }

    toJSON() {
        return this.state;
    }
}