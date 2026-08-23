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

    get templateId() { 
        return this.originalEntity.templateId || this.originalEntity.definitionKey || this.originalEntity.type; 
    }
    get definitionKey() { return this.templateId; }

    getAttack(type) { return this.stats.attack?.[type] || 0; }
    getDefense(type) { return this.stats.defense?.[type] || 0; }

    // ---> NEW: Tag & Immunity Evaluation <---
    getActiveTags() {
        const activeTags = new Set(this.originalEntity.tags || []);
        
        this.traits.forEach(trait => {
            if (trait.tags) trait.tags.forEach(t => activeTags.add(t.toLowerCase()));
        });
        
        this.statusEffects.forEach(status => {
            if (status.tags) status.tags.forEach(t => activeTags.add(t.toLowerCase()));
        });
        
        return Array.from(activeTags);
    }

    hasTag(tag) {
        if (!tag) return false;
        return this.getActiveTags().includes(tag.toLowerCase());
    }

    getImmunities() {
        const immunities = { ranges: new Set(), tags: new Set() };

        // Helper function to safely extract both ranges and tags from objects or flat arrays
        const processImmunities = (immData) => {
            if (!immData) return;
            
            if (typeof immData === 'object' && !Array.isArray(immData)) {
                if (immData.ranges) immData.ranges.forEach(r => immunities.ranges.add(r.toLowerCase()));
                if (immData.tags) immData.tags.forEach(t => immunities.tags.add(t.toLowerCase()));
            } 
            else if (Array.isArray(immData)) {
                immData.forEach(t => immunities.tags.add(t.toLowerCase()));
            }
        };

        processImmunities(this.originalEntity.immunities);
        this.traits.forEach(trait => processImmunities(trait.immunities));
        this.statusEffects.forEach(status => processImmunities(status.immunities));

        return {
            ranges: Array.from(immunities.ranges),
            tags: Array.from(immunities.tags)
        };
    }

    checkImmunity(ability, attacker = null) {
        if (!ability) return { isImmune: false, reason: null, value: null };

        const myImmunities = this.getImmunities();

        // 1. Check Range Immunity (e.g., Flying vs Melee)
        if (ability.range && myImmunities.ranges.includes(ability.range.toLowerCase())) {
            
            // Allow bypassing if the attacker has a 'reach' or 'flying' tag
            let bypassed = false;
            if (attacker && ability.range.toLowerCase() === 'melee') {
                if (attacker.hasTag('reach') || attacker.hasTag('flying')) {
                    bypassed = true;
                }
            }

            if (!bypassed) {
                return { isImmune: true, reason: 'range', value: ability.range };
            }
        }

        // 2. Check Tag Immunity (e.g., Ground / Fire / Physical)
        if (ability.tags && Array.isArray(ability.tags)) {
            const matchedTag = ability.tags.find(tag => myImmunities.tags.includes(tag.toLowerCase()));
            if (matchedTag) {
                return { isImmune: true, reason: 'tag', value: matchedTag };
            }
        }

        return { isImmune: false, reason: null, value: null };
    }

    // ----------------------------------------

    isDead() {
        return this.hp <= 0;
    }

    modifyResource(resource, amount) {
        const actualDifference = this.originalEntity.modifyResource(resource, amount);
        
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
        events.emit('ON_STATUS_APPLIED', { status: effect, actor: effect.inflictor, target: this });
    }

    removeStatusEffect(effectId) {
        this.originalEntity.removeStatusEffect(effectId);
    }

   _extractAndResolveAbilities() {
    const allAbilityIds = new Set();
    const equipMap = new Map();

    // 1. Gather ALL abilities the entity claims to have
    // (This prevents the bug where equipment abilities were already mixed in)
    const rawAbilities = this.originalEntity.abilities || [];
    rawAbilities.forEach(a => {
        if (a) allAbilityIds.add(typeof a === 'string' ? a : a.id);
    });

    if (this.team === 'party') allAbilityIds.add('retreat');

    // 2. Gather Equipment Abilities directly from equipped items
    const equipment = this.originalEntity.equipment || {};
    Object.values(equipment).forEach(item => {
        if (!item) return;
        // Resolve item from factory if it's just a string
        const itemInstance = typeof item === 'string' ? ItemFactory.createItem(item) : item;
        if (!itemInstance) return;
        
        const itemName = itemInstance.name || 'Equipment'; 

        const addEquip = (a) => {
            if (a) {
                const id = typeof a === 'string' ? a : a.id;
                equipMap.set(id, itemName); 
                allAbilityIds.add(id); // Ensure it is in our master list
            }
        };
        
        itemInstance.grantedAbilities?.forEach(addEquip);
        addEquip(itemInstance.grantedAbility);
        addEquip(itemInstance.useAbility);
    });

    if (allAbilityIds.size === 0) allAbilityIds.add('punch');
    allAbilityIds.delete(undefined);

    const finalAbilities = [];
    const abilitiesToCreate = Array.from(allAbilityIds);
    
    // 3. Create all abilities at once using your factory
    const createdAbilities = AbilityFactory.createAbilities 
        ? AbilityFactory.createAbilities(abilitiesToCreate) 
        : abilitiesToCreate.map(id => AbilityFactory.createAbility(id));

    // 4. Safely wrap them and assign their source for the UI
    createdAbilities.forEach(ability => {
        if (!ability) return;
        
        // Use Object.create() to make a safe proxy!
        // This prevents mutating shared factory templates while preserving methods like canPayCost()
        const inst = Object.create(ability);
        
        // If this ID exists in our equipMap, we know it came from an item!
        if (equipMap.has(ability.id)) {
            inst.isEquipment = true;
            inst.source = equipMap.get(ability.id);
        } else {
            inst.isEquipment = false;
            inst.source = 'Intrinsic';
        }
        
        finalAbilities.push(inst);
    });

    return finalAbilities;
}
    _applyStartingStatuses() {
        const legacyStarting = this.originalEntity.state?.startingStatuses || this.originalEntity.startingStatuses || [];
        const rawOverrides = this.originalEntity.state?.statusEffects || [];
        
        const allToApply = [...legacyStarting, ...rawOverrides];
        if (allToApply.length === 0) return;
        
        this.originalEntity.clearAllStatusEffects();
        
        allToApply.forEach(effectData => {
            if (!effectData) return;
            
            const statusId = typeof effectData === 'string' ? effectData : effectData.id;
            const customCharges = typeof effectData === 'object' ? (effectData.duration || effectData.charges) : null;
            
            if (!statusId) return;
            
            const newStatus = StatusEffectFactory.createEffect(statusId, customCharges, this);
            if (newStatus) {
                this.applyStatusEffect(newStatus);
            }
        });
    }
}