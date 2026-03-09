// shared/models/combatantModel.js
import { StatCalculator } from '../systems/statCalculator.js';
import { AbilityFactory } from '../systems/factories/abilityFactory.js';
import { ItemFactory } from '../systems/factories/itemFactory.js'; 
import { StatusEffectFactory } from '../systems/factories/statusEffectFactory.js';
import { events } from '../../frontend/src/core/eventBus.js'; 

export class CombatantModel {
    constructor(entity, teamAllegiance) {
        const detailedStats = StatCalculator.calculateDetailed(entity);
        const maxHp = detailedStats.maxHp?.total || 1;
        const maxStamina = detailedStats.maxStamina?.total || 10;
        const maxInsight = detailedStats.maxInsight?.total || 10;

        this.originalEntity = entity; 
        this.name = entity.name;
        this.team = teamAllegiance; 
        this.spritePortrait = entity.spritePortrait; 
        this.spriteOverworld = entity.spriteOverworld;
        
        this.maxHp = maxHp;
        this.hp = Math.min(entity.hp ?? maxHp, maxHp);
        
        this.maxStamina = maxStamina;
        this.stamina = Math.min(entity.stamina ?? maxStamina, maxStamina);
        
        this.maxInsight = maxInsight;
        this.insight = Math.min(entity.insight ?? maxInsight, maxInsight);
        
        this.stats = detailedStats;
        this._deathHandled = false;

        this.abilities = this._extractAndResolveAbilities(entity, teamAllegiance);
        this._applyStartingStatuses(entity);
    }

    get statusEffects() { return this.originalEntity.statusEffects; }
    get baseStats() { return this.stats; }
    
    getAttack(type) { return this.stats.attack?.[type] || 0; }
    getDefense(type) { return this.stats.defense?.[type] || 0; }
    
    isDead() { return this.hp <= 0; }

    modifyResource(resource, amount) {
        if (this[resource] === undefined) return 0;
        
        const maxProp = 'max' + resource.charAt(0).toUpperCase() + resource.slice(1);
        const originalValue = this[resource]; 
        
        this[resource] = Math.max(0, Math.min(this[maxProp], this[resource] + amount));
        const actualDifference = this[resource] - originalValue; 

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

    applyStatusEffect(effect) { this.originalEntity.applyStatusEffect(effect); }
    removeStatusEffect(effectId) { this.originalEntity.removeStatusEffect(effectId); }

    _extractAndResolveAbilities(entity, teamAllegiance) {
        const abilityIds = new Set();
        
        const addId = (a) => {
            if (a) abilityIds.add(typeof a === 'string' ? a : a.id);
        };

        const baseAbilities = entity.abilities || entity.state?.abilities || entity.definition?.abilities || [];
        baseAbilities.forEach(addId);

        const equipment = entity.equipment || entity.state?.equipment || entity.definition?.equipment || {};
        Object.values(equipment).forEach(item => {
            if (!item) return;
            const itemDef = typeof item === 'string' ? ItemFactory.createItem(item) : (item.definition || item);
            if (!itemDef) return;

            itemDef.grantedAbilities?.forEach(addId);
            addId(itemDef.grantedAbility);
            addId(itemDef.useAbility);
        });

        if (teamAllegiance === 'party') abilityIds.add('retreat');
        if (abilityIds.size === 0) abilityIds.add('punch'); 
        abilityIds.delete(undefined);
        
        return AbilityFactory.createAbilities(Array.from(abilityIds)).filter(Boolean);
    }

    _applyStartingStatuses(entity) {
        if (!Array.isArray(entity.startingStatuses)) return;
        entity.startingStatuses.forEach(statusId => {
            const newStatus = StatusEffectFactory.createEffect(statusId, null, this);
            if (newStatus) this.applyStatusEffect(newStatus);
        });
    }
}