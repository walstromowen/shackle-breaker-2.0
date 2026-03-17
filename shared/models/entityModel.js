import { StatCalculator } from '../../shared/systems/statCalculator.js';
import { AbilityFactory } from '../systems/factories/abilityFactory.js';

export class EntityModel {
    constructor(config) {
        this.state = structuredClone(config);

        if (config.equipment) {
            this.state.equipment = config.equipment;
        }
        if (config.inventory) {
            this.state.inventory = config.inventory;
        }

        // =========================================================
        // 1. INITIALIZATION
        // =========================================================
        
        if (!this.state.baseStats) {
            this.state.baseStats = {
                maxHp: 10, maxStamina: 10, maxInsight: 10,
                hpRecovery: 0, staminaRecovery: 0, insightRecovery: 0, 
                speed: 0, corruption: 0, critical: 0.05, 
                baseAttack: { blunt: 0, slash: 0, pierce: 0 },
                baseDefense: { blunt: 0, slash: 0, pierce: 0 }
            };
        }

        if (!this.state.stats) {
            this.state.stats = {
                hp: this.state.baseStats.maxHp,
                stamina: this.state.baseStats.maxStamina,
                insight: this.state.baseStats.maxInsight
            };
        }

        if (!this.state.attributes) {
            this.state.attributes = {
                vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0
            };
        }

        if (!this.state.spriteOverworld) this.state.spriteOverworld = "missing_texture";
        if (!this.state.spritePortrait) this.state.spritePortrait = "missing_face";

        if (!this.state.traits) this.state.traits = [];
        if (!this.state.equipment) this.state.equipment = {};
        if (!Array.isArray(this.state.inventory)) this.state.inventory = [];
        if (!this.state.statusEffects) this.state.statusEffects = [];

        if (typeof this.state.xp === 'undefined') this.state.xp = 0;
        if (typeof this.state.maxXp === 'undefined') this.state.maxXp = 100;
        if (typeof this.state.skillPoints === 'undefined') this.state.skillPoints = 0;
        if (typeof this.state.level === 'undefined') this.state.level = 1;

        // G. Runtime Properties (Replaced flat array with private array)
        this._learnedAbilities = []; 
        
        // Load initial abilities (Innate Biology)
        if (this.state.abilities) {
             const innateMoves = AbilityFactory.createAbilities(this.state.abilities);
             this.addAbilities(innateMoves, 'innate');
        }
        
        // Note: Equipment abilities are no longer loaded here. The getter handles it!
    }

    // =========================================================
    // GETTERS & SETTERS (Identity & Progression)
    // =========================================================
    get id() { return this.state.id; }
    get name() { return this.state.name; }
    set name(val) { this.state.name = val; }
    
    get spritePortrait() { return this.state.spritePortrait; }
    get spriteOverworld() { return this.state.spriteOverworld; }

    get level() { return this.state.level; }
    set level(val) { this.state.level = val; }
    get xp() { return this.state.xp; }
    set xp(val) { this.state.xp = val; }
    get maxXp() { return this.state.maxXp; }
    set maxXp(val) { this.state.maxXp = val; }
    get skillPoints() { return this.state.skillPoints; }
    set skillPoints(val) { this.state.skillPoints = val; }
    
    get attributes() { return this.state.attributes; }
    get equipment() { return this.state.equipment; }
    get statusEffects() { return this.state.statusEffects; }
    get traits() { return this.state.traits; }
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
    get corruption() { return this.calculatedStats.corruption; }
    
    get hpRecovery() { return this.calculatedStats.hpRecovery ?? this.state.baseStats.hpRecovery; }
    get staminaRecovery() { return this.calculatedStats.staminaRecovery ?? this.state.baseStats.staminaRecovery; }
    get insightRecovery() { return this.calculatedStats.insightRecovery ?? this.state.baseStats.insightRecovery; }

    // =========================================================
    // RESOURCES
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

    addTrait(traitId) {
        if (!this.state.traits.includes(traitId)) this.state.traits.push(traitId);
    }
    removeTrait(traitId) {
        const idx = this.state.traits.indexOf(traitId);
        if (idx > -1) this.state.traits.splice(idx, 1);
    }

    // =========================================================
    // ABILITY & ITEM MANAGEMENT (Updated for Dynamic Retrieval)
    // =========================================================
    
    // NEW: Dynamic getter that combines innate and gear abilities on the fly
    get abilities() {
        const activeList = [...(this._learnedAbilities || [])];

        if (this.state.equipment) {
            Object.values(this.state.equipment).forEach(item => {
                if (item && item.grantedAbilities) {
                    const gearMoves = AbilityFactory.createAbilities(item.grantedAbilities);
                    gearMoves.forEach(move => {
                        move.source = 'equipment';
                        if (!activeList.find(a => a.id === move.id)) {
                            activeList.push(move);
                        }
                    });
                }
            });
        }
        return activeList;
    }

    addAbilities(abilityList, source = 'innate') {
        if (!abilityList || abilityList.length === 0) return;
        abilityList.forEach(ability => {
            ability.source = source; 
            if (!this._learnedAbilities.find(a => a.id === ability.id)) {
                this._learnedAbilities.push(ability);
            }
        });
    }

    removeAbilitiesBySource(source) {
        if (source === 'innate') return;
        this._learnedAbilities = this._learnedAbilities.filter(a => a.source !== source);
    }

    equipItem(slot, itemModel) {
        this.unequipItem(slot);
        this.state.equipment[slot] = itemModel;
        // Logic removed: the `get abilities()` getter now handles injecting gear skills automatically!
    }

    unequipItem(slot) {
        this.state.equipment[slot] = null;
        // Logic removed: the `get abilities()` getter now handles removing gear skills automatically!
    }

    // =========================================================
    // STATUS EFFECT MANAGEMENT
    // =========================================================
    applyStatusEffect(activeEffect) {
        const existingEffect = this.state.statusEffects.find(e => e.id === activeEffect.id);
        if (existingEffect) existingEffect.charges = activeEffect.charges; 
        else this.state.statusEffects.push(activeEffect);
    }

    removeStatusEffect(effectId) {
        this.state.statusEffects = this.state.statusEffects.filter(e => e.id !== effectId);
    }

    clearAllStatusEffects() { this.state.statusEffects = []; }
    hasStatusEffect(effectId) { return this.state.statusEffects.some(e => e.id === effectId); }
    isDead() { return this.hp <= 0; }
    toJSON() { return this.state; }
}