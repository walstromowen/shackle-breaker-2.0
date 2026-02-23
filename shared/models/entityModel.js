import { StatCalculator } from '../../shared/systems/statCalculator.js';
import { AbilityFactory } from '../systems/factories/abilityFactory.js';

export class EntityModel {
    constructor(config) {
        // Deep clone to safely detach from the source definition
        this.state = structuredClone(config);

        // =========================================================
        // 1. INITIALIZATION
        // =========================================================
        
        // A. Initialize Base Stats (The "Naked" Potential)
        if (!this.state.baseStats) {
            this.state.baseStats = {
                maxHp: 10,
                maxStamina: 10,
                maxInsight: 10,
                hpRecovery: 0,       // NEW
                staminaRecovery: 0,  // NEW
                insightRecovery: 0,  // NEW
                speed: 0,
                critical: 5, 
                baseAttack: { blunt: 0, slash: 0, pierce: 0 },
                baseDefense: { blunt: 0, slash: 0, pierce: 0 }
            };
        }

        // B. Initialize Current Stats (The "Live" Values)
        if (!this.state.stats) {
            this.state.stats = {
                hp: this.state.baseStats.maxHp,
                stamina: this.state.baseStats.maxStamina,
                insight: this.state.baseStats.maxInsight
            };
        }

        // C. Initialize Attributes
        if (!this.state.attributes) {
            this.state.attributes = {
                vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0
            };
        }

        // D. Initialize Visuals 
        // Ensure defaults exist if missing from config
        if (!this.state.spriteOverworld) this.state.spriteOverworld = "missing_texture";
        if (!this.state.spritePortrait) this.state.spritePortrait = "missing_face";

        // E. Initialize Containers
        if (!this.state.traits) this.state.traits = [];
        if (!this.state.equipment) this.state.equipment = {};
        if (!Array.isArray(this.state.inventory)) this.state.inventory = [];
        if (!this.state.statusEffects) this.state.statusEffects = [];

        // F. Progression Defaults
        if (typeof this.state.xp === 'undefined') this.state.xp = 0;
        if (typeof this.state.maxXp === 'undefined') this.state.maxXp = 100;
        if (typeof this.state.skillPoints === 'undefined') this.state.skillPoints = 0;
        if (typeof this.state.level === 'undefined') this.state.level = 1;

        // G. Runtime Properties (Not saved to State)
        this.abilities = []; 
        
        // Load initial abilities (Innate Biology)
        if (this.state.abilities) {
             const innateMoves = AbilityFactory.createAbilities(this.state.abilities);
             this.addAbilities(innateMoves, 'innate');
        }

        // Load Equipment Abilities (If spawning with gear)
        if (this.state.equipment) {
            Object.entries(this.state.equipment).forEach(([slot, item]) => {
                // Ensure item is an object and has grantedAbilities before processing
                if (item && typeof item === 'object' && item.grantedAbilities) {
                    const gearMoves = AbilityFactory.createAbilities(item.grantedAbilities);
                    this.addAbilities(gearMoves, slot);
                }
            });
        }
    }

    // =========================================================
    // GETTERS & SETTERS (Identity & Progression)
    // =========================================================
    get id() { return this.state.id; }
    get name() { return this.state.name; }
    set name(val) { this.state.name = val; }
    
    // --- VISUALS ---
    get spritePortrait() { return this.state.spritePortrait; }
    get spriteOverworld() { return this.state.spriteOverworld; }

    // --- LEVELING ---
    get level() { return this.state.level; }
    set level(val) { this.state.level = val; }
    get xp() { return this.state.xp; }
    set xp(val) { this.state.xp = val; }
    get maxXp() { return this.state.maxXp; }
    set maxXp(val) { this.state.maxXp = val; }
    get skillPoints() { return this.state.skillPoints; }
    set skillPoints(val) { this.state.skillPoints = val; }
    
    // Direct Access
    get attributes() { return this.state.attributes; }
    get equipment() { return this.state.equipment; }
    get statusEffects() { return this.state.statusEffects; }
    get traits() { return this.state.traits; }

    // **CRITICAL**: Expose Base Stats for the Calculator
    get baseStats() { return this.state.baseStats; }

    // =========================================================
    // CALCULATED STATS (The "Brain")
    // =========================================================
    get calculatedStats() { return StatCalculator.calculate(this); }
    get attack() { return this.calculatedStats.attack; }         
    get defense() { return this.calculatedStats.defense; }      
    get resistance() { return this.calculatedStats.resistance; }
    get speed() { return this.calculatedStats.speed; }           
    get critical() { return this.calculatedStats.critChance; }   
    get critMultiplier() { return this.calculatedStats.critMultiplier; }

    // NEW: Recovery Getters (fall back to baseStats if Calculator doesn't handle them yet)
    get hpRecovery() { return this.calculatedStats.hpRecovery ?? this.state.baseStats.hpRecovery; }
    get staminaRecovery() { return this.calculatedStats.staminaRecovery ?? this.state.baseStats.staminaRecovery; }
    get insightRecovery() { return this.calculatedStats.insightRecovery ?? this.state.baseStats.insightRecovery; }

    // =========================================================
    // RESOURCES (HP / STAMINA / INSIGHT)
    // =========================================================
    modifyResource(resourceId, amount, isPercent = false) {
        if (this[resourceId] === undefined) {
            console.warn(`[EntityModel] Resource '${resourceId}' not found.`);
            return 0;
        }

        let finalChange = amount;

        if (isPercent) {
            const maxKey = `max${resourceId.charAt(0).toUpperCase() + resourceId.slice(1)}`;
            const maxVal = this[maxKey] || 0;
            finalChange = Math.trunc(maxVal * (amount / 100));
        }

        const oldValue = this[resourceId];
        this[resourceId] += finalChange;
        
        return this[resourceId] - oldValue;
    }

    get hp() { return this.state.stats.hp; }
    set hp(val) { this.state.stats.hp = Math.max(0, Math.min(val, this.maxHp)); }
    get maxHp() { return this.calculatedStats.maxHp; }

    get stamina() { return this.state.stats.stamina; }
    set stamina(val) { this.state.stats.stamina = Math.max(0, Math.min(val, this.maxStamina)); }
    get maxStamina() { return this.calculatedStats.maxStamina; }

    get insight() { return this.state.stats.insight; }
    set insight(val) { this.state.stats.insight = Math.max(0, Math.min(val, this.maxInsight)); }
    get maxInsight() { return this.calculatedStats.maxInsight; }

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
            // Only add if not already in the list
            if (!this.abilities.find(a => a.id === ability.id)) {
                this.abilities.push(ability);
            }
        });
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