
// =========================================================================
// 4. combatantModel.js
// =========================================================================
import { StatCalculator } from '../../shared/systems/statCalculator.js';
import { AbilityFactory } from '../systems/factories/abilityFactory.js';
import { ItemFactory } from '../systems/factories/itemFactory.js';
import { StatusEffectFactory } from '../systems/factories/statusEffectFactory.js';
import { TraitFactory } from '../systems/factories/traitFactory.js';
import { events } from '../../frontend/src/core/eventBus.js';

export class CombatantModel {
    constructor(entity, teamAllegiance) {
        this.originalEntity = entity;
        this.team = teamAllegiance;
        this._deathHandled = false;
        this._skipAction = false;
        this.hasEnteredBattle = false;
        this.abilities = this._extractAndResolveAbilities();
        this._applyStartingStatuses();
    }

    get id() { return this.originalEntity.id; }
    get name() { return this.originalEntity.name; }
    get spritePortrait() { return this.originalEntity.spritePortrait; }
    get spriteOverworld() { return this.originalEntity.spriteOverworld; }
    get battlePortraitFramesFront() { return this.originalEntity.battlePortraitFramesFront; }
    get battlePortraitFramesBack() { return this.originalEntity.battlePortraitFramesBack; }
    get frameSize() { return this.originalEntity.frameSize; }
    get framesPerRow() { return this.originalEntity.framesPerRow; }
    get customRowIndex() { return this.originalEntity.customRowIndex; }
    get crySound() { return this.originalEntity.crySound; }
    get deathSound() { return this.originalEntity.deathSound; }
    get statusEffects() { return this.originalEntity.statusEffects; }
    get traits() { return TraitFactory.createTraits(this.originalEntity.traits || []); }
    
    get stats() { return StatCalculator.calculateDetailed(this.originalEntity); }
    get baseStats() { return this.originalEntity.baseStats; }
    get hp() { return this.originalEntity.hp; }
    get maxHp() { return this.stats.maxHp?.total || 1; }
    get stamina() { return this.originalEntity.stamina; }
    get maxStamina() { return this.stats.maxStamina?.total || 10; }
    get insight() { return this.originalEntity.insight; }
    get maxInsight() { return this.stats.maxInsight?.total || 10; }
    
    getAttack(type) { return this.stats.attack?.[type] || 0; }
    getDefense(type) { return this.stats.defense?.[type] || 0; }
    isDead() { return this.hp <= 0; }

    modifyResource(resource, amount) {
        const actualDifference = this.originalEntity.modifyResource(resource, amount);
        if (actualDifference !== 0) {
            events.emit('SPAWN_FCT', { target: this, value: actualDifference, resource: resource, isCritical: false });
        }
        return actualDifference;
    }

   applyStatusEffect(effect) {
        // 1. Actually apply the status to the entity
        this.originalEntity.applyStatusEffect(effect);
        
        // 2. 📢 SHOUT IT OUT so the BattleController records it!
        events.emit('ON_STATUS_APPLIED', {
            status: effect,
            actor: effect.inflictor, // The enemy who cast the poison
            target: this             // The party member getting poisoned
        });
    }
    removeStatusEffect(effectId) { this.originalEntity.removeStatusEffect(effectId); }

    _extractAndResolveAbilities() {
        const abilityIds = new Set();
        const addId = (a) => { if (a) abilityIds.add(typeof a === 'string' ? a : a.id); };

        const baseAbilities = this.originalEntity.abilities || [];
        baseAbilities.forEach(addId);

        const equipment = this.originalEntity.equipment || {};
        Object.values(equipment).forEach(item => {
            if (!item) return;
            const itemInstance = typeof item === 'string' ? ItemFactory.createItem(item) : item;
            if (!itemInstance) return;
            itemInstance.grantedAbilities?.forEach(addId);
            addId(itemInstance.grantedAbility);
            addId(itemInstance.useAbility);
        });

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