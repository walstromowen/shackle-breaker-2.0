import { PHYSICAL_DAMAGE_TYPES, MAGIC_DAMAGE_TYPES } from '../core/constants.js';
// Damage (and healing) over time grows with the LEVEL of whoever inflicted it, so a poison from a level-10 archer or boss stays dangerous as the
// fights get bigger, instead of staying at the same 5 HP for the whole game. A status with no known inflictor (a trap, the weather, an encounter)
// scales with the level of whoever it is on. +10% per level above 1; a status's own `value` is the level-1 amount.
export const STATUS_POWER_PER_LEVEL = 0.1;

// `attackAverage: 'physical' | 'magical'` + `rate`: an amount of (the holder's average attack over blunt / slash / pierce, or over the nine magic types) x rate,
// so it follows the build and the level (attack already grows with level, so the per-level scaling above is not applied again). Used by Second Wind / Clear Mind.
const attackOf = (who, type) => {
    if (typeof who?.getAttack === 'function') return who.getAttack(type) || 0;
    const stats = who?.calculatedStats || who?.stats || {};
    return stats.attack?.[type] || 0;
};
const averageAttack = (who, group) => {
    const types = group === 'magical' ? MAGIC_DAMAGE_TYPES : PHYSICAL_DAMAGE_TYPES;
    return types.reduce((sum, t) => sum + attackOf(who, t), 0) / types.length;
};

const levelOf = (who) => {
    const l = who?.level ?? who?.originalEntity?.level;
    return Number.isFinite(l) && l > 1 ? l : 1;
};

export class StatusEffectModel {
    constructor(definition, initialCharges = null, inflictor = null) {
        this.def = definition;
        this.id = definition.id;
        this.name = definition.name;
        this.icon = definition.icon;
        this.animationId = definition.animationId;
        this.persistAfterCombat = definition.persistAfterCombat || false;
        
        this.effects = definition.effects || [];
        this.modifiers = definition.modifiers || [];
        this.traitRewards = definition.traitRewards || [];
        
        // NEW: Tag and Range Immunities
        this.immunities = definition.immunities || { ranges: [], tags: [] };
        
        // NEW: Array of status IDs that this status removes upon application
        this.cancels = definition.cancels || [];

        this.charges = initialCharges !== null && initialCharges !== undefined 
            ? initialCharges 
            : definition.defaultCharges;

        // NEW: Handle infinite durations (e.g., -1 for innate trait statuses). -1 as the STARTING charges counts too, not just -1 as the
        // definition's default: an ability that says `duration: -1` (Airborne -> flying) means "until removed". Before, such a status
        // had charges -1, so isExpired() was true at once and it vanished the first time it was checked.
        this.isInfinite = definition.defaultCharges === -1 || this.charges === -1;
        this.spent = false; // set by an effect with `expire: true` (a trap that has sprung); an expired status is removed even when it is infinite
            
        this.maxStacks = definition.maxStacks || 1;
        this.inflictor = inflictor;
        this.stacks = 1;
    }

    addStack() {
        if (this.stacks < this.maxStacks) {
            this.stacks++;
        }
        this.charges = this.def.defaultCharges;
    }

    consumeCharge() {
        // NEW: Only consume charges if the status isn't infinite
        if (!this.isInfinite) {
            this.charges--;
        }
    }

    isExpired() {
        if (this.spent) return true;
        // NEW: Infinite statuses never expire naturally
        if (this.isInfinite) return false;
        return this.charges <= 0;
    }

    onEvent(eventName, targetEntity, eventData = null) {
        const result = { messages: [], cancelAction: false, applyStatuses: [] };
        
        if (eventName === 'ON_TURN_END') {
            this.consumeCharge();
        }
        
        this.effects.forEach(effect => {
            if (effect.trigger !== eventName) return;

            // NEW: `range: 'melee'` -- react only to attacks of that range. ON_DAMAGE_RECEIVED carries the range of the ability that hit (AbilitySystem._handleDamage).
            if (effect.range && !(eventData && eventData.range === effect.range)) return;
            
            if (effect.modify) {
                const target = (effect.target === 'attacker' && eventData && eventData.attacker) 
                    ? eventData.attacker 
                    : targetEntity;
                
                let amount = 0;
                if (effect.value !== undefined) {
                    // flat per-stack amount, scaled by the inflictor's level; always a whole number, and never less than 1 (so a tick is never lost)
                    const scale = 1 + STATUS_POWER_PER_LEVEL * (levelOf(this.inflictor || target) - 1);
                    const raw = effect.value * this.stacks * scale;
                    amount = raw === 0 ? 0 : Math.sign(raw) * Math.max(1, Math.round(Math.abs(raw)));
                } else if (effect.attackAverage) {
                    amount = Math.max(1, Math.round(averageAttack(this.inflictor || target, effect.attackAverage) * (effect.rate || 0) * this.stacks));
                } else if (effect.percentCurrent !== undefined) {
                    // NEW: `percentCurrent: 0.5` -- a share of what the holder has RIGHT NOW of the resource `modify` names (at least 1, never more than they have).
                    // Each extra stack compounds the share (two stacks of 50% take 75%, three take 87.5%), so it can never take everything in one go.
                    const now = Math.max(0, target[effect.modify] || 0);
                    const share = 1 - Math.pow(1 - effect.percentCurrent, this.stacks);
                    amount = now > 0 ? -Math.min(now, Math.max(1, Math.floor(now * share))) : 0;
                } else if (effect.percent !== undefined && eventData && eventData.damage) {
                    amount = -Math.floor(eventData.damage * effect.percent);
                } else if (effect.percentMaxHp !== undefined) {
                    // NEW: `percentMaxHp: 0.2` -- a share of the max HP of whoever `modify` hits (at least 1), whatever the hit that set it off did (the bear trap)
                    amount = -Math.max(1, Math.floor((target.maxHp || 0) * effect.percentMaxHp));
                }
                
                if (amount !== 0) {
                    target.modifyResource(effect.modify, amount);
                    let msgTemplate = effect.battleMessage || "{target} takes {amount} {resource} damage from {status}!";
                    let absoluteAmount = Math.abs(amount);
                    let finalMessage = msgTemplate
                        .replace(/{target}/g, target.name)
                        .replace(/{amount}/g, absoluteAmount)
                        .replace(/{resource}/g, effect.modify.toUpperCase())
                        .replace(/{status}/g, this.name);
                    result.messages.push(finalMessage);
                }
                
                if (effect.consumeCharge) {
                    this.consumeCharge();
                }
            }
            
            // NEW: `applyStatus: { id, charges?, message? }` -- put a status on the same entity `modify` hits ('attacker' or the holder). This model only reports it
            // in result.applyStatuses; the caller (AbilitySystem._handleDamage) builds and applies it, so the model needs no import of the factory.
            if (effect.applyStatus) {
                const victim = (effect.target === 'attacker' && eventData && eventData.attacker)
                    ? eventData.attacker
                    : targetEntity;
                result.applyStatuses.push({
                    target: victim,
                    id: effect.applyStatus.id,
                    charges: effect.applyStatus.charges,
                    message: effect.applyStatus.message || null
                });
            }

            // NEW: `expire: true` -- using the effect up ends the whole status, however long it had left (a bear trap springs once).
            if (effect.expire) {
                this.spent = true;
            }
            
            if (effect.flag) {
                if (effect.flag === 'skipAction') {
                    result.cancelAction = true;
                    let msgTemplate = effect.battleMessage || "{target} is hindered by {status} and cannot act!";
                    let finalMessage = msgTemplate
                        .replace(/{target}/g, targetEntity.name)
                        .replace(/{status}/g, this.name);
                    result.messages.push(finalMessage);
                }
            }
        });
        return result;
    }
}