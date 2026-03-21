import { StatCalculator } from '../../shared/systems/statCalculator.js';
import { AbilityFactory } from '../systems/factories/abilityFactory.js';
import { ItemFactory } from '../systems/factories/itemFactory.js';
import { StatusEffectFactory } from '../systems/factories/statusEffectFactory.js';
import { TraitFactory } from '../systems/factories/traitFactory.js'; // <-- NEW IMPORT
import { events } from '../../frontend/src/core/eventBus.js';

export class CombatantModel {
    constructor(entity, teamAllegiance) {
        // 1. Keep a reference to the core EntityModel
        this.originalEntity = entity;
        
        // 2. Battle-Specific Volatile State
        this.team = teamAllegiance;
        this._deathHandled = false;
        this._skipAction = false;
        
        // 3. Cache Abilities specifically for this fight
        this.abilities = this._extractAndResolveAbilities();
        
        // 4. Apply Starting Statuses (from battle contexts/ambushes)
        this._applyStartingStatuses();
    }

    // ==========================================
    // DELEGATED PROPERTIES (Pass-through to Entity)
    // ==========================================
    get id() { return this.originalEntity.id; }
    get name() { return this.originalEntity.name; }
    get spritePortrait() { return this.originalEntity.spritePortrait; }
    get spriteOverworld() { return this.originalEntity.spriteOverworld; }
    // <-- NEW: Audio pass-throughs
    get crySound() { return this.originalEntity.crySound; }
    get deathSound() { return this.originalEntity.deathSound; }
    
    get statusEffects() { return this.originalEntity.statusEffects; }
    
    // --> UPDATED: Now uses the factory to hydrate trait strings into objects
    get traits() { 
        const rawTraitIds = this.originalEntity.traits || [];
        // Optional debug log if you want to verify they are hydrating correctly:
        // console.log(`[Debug] Hydrating traits for ${this.name}:`, rawTraitIds);
        return TraitFactory.createTraits(rawTraitIds); 
    }
    
    // ==========================================
    // STATS & RESOURCES
    // ==========================================
    // Always calculate fresh stats to include active buffs/debuffs
    get stats() { return StatCalculator.calculateDetailed(this.originalEntity); }
    get baseStats() { return this.originalEntity.baseStats; }
    
    // Resource Getters
    get hp() { return this.originalEntity.hp; }
    get maxHp() { return this.stats.maxHp?.total || 1; }
    get stamina() { return this.originalEntity.stamina; }
    get maxStamina() { return this.stats.maxStamina?.total || 10; }
    get insight() { return this.originalEntity.insight; }
    get maxInsight() { return this.stats.maxInsight?.total || 10; }

    getAttack(type) { return this.stats.attack?.[type] || 0; }
    getDefense(type) { return this.stats.defense?.[type] || 0; }

    isDead() { return this.hp <= 0; }

    // ==========================================
    // BATTLE-SPECIFIC LOGIC
    // ==========================================
    modifyResource(resource, amount) {
        // We use the EntityModel's built in modifyResource...
        const actualDifference = this.originalEntity.modifyResource(resource, amount);

        // ...but we wrap it with our Battle UI events!
        if (actualDifference !== 0) {
            events.emit('SPAWN_FCT', {
                target: this,
                value: actualDifference,
                resource: resource, 
                isCritical: false 
            });
        }
        return actualDifference; 
    }

    applyStatusEffect(effect) { 
        this.originalEntity.applyStatusEffect(effect); 
    }
    
    removeStatusEffect(effectId) { 
        this.originalEntity.removeStatusEffect(effectId); 
    }

    // ==========================================
    // PRIVATE SETUP METHODS
    // ==========================================
    _extractAndResolveAbilities() {
        const abilityIds = new Set();
        const addId = (a) => { if (a) abilityIds.add(typeof a === 'string' ? a : a.id); };

        // 1. Get Base Entity Abilities
        const baseAbilities = this.originalEntity.abilities || [];
        baseAbilities.forEach(addId);

        // 2. Get Equipment Abilities
        const equipment = this.originalEntity.equipment || {};
        Object.values(equipment).forEach(item => {
            if (!item) return;
            const itemInstance = typeof item === 'string' ? ItemFactory.createItem(item) : item;
            if (!itemInstance) return;

            itemInstance.grantedAbilities?.forEach(addId);
            addId(itemInstance.grantedAbility);
            addId(itemInstance.useAbility);
        });

        // 3. Fallbacks
        if (this.team === 'party') abilityIds.add('retreat');
        if (abilityIds.size === 0) abilityIds.add('punch'); 
        abilityIds.delete(undefined);
        
        return AbilityFactory.createAbilities(Array.from(abilityIds)).filter(Boolean);
    }

    _applyStartingStatuses() {
        const starting = this.originalEntity.state?.startingStatuses || this.originalEntity.startingStatuses;
        if (!Array.isArray(starting)) return;
        
        starting.forEach(statusId => {
            const newStatus = StatusEffectFactory.createEffect(statusId, null, this);
            if (newStatus) this.applyStatusEffect(newStatus);
        });
    }
}