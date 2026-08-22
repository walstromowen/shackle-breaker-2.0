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

        // NEW: Handle infinite durations (e.g., -1 for innate trait statuses)
        this.isInfinite = definition.defaultCharges === -1;
        this.charges = initialCharges !== null && initialCharges !== undefined 
            ? initialCharges 
            : definition.defaultCharges;
            
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
        // NEW: Infinite statuses never expire naturally
        if (this.isInfinite) return false;
        return this.charges <= 0;
    }

    onEvent(eventName, targetEntity, eventData = null) {
        const result = { messages: [], cancelAction: false };
        
        if (eventName === 'ON_TURN_END') {
            this.consumeCharge();
        }
        
        this.effects.forEach(effect => {
            if (effect.trigger !== eventName) return;
            
            if (effect.modify) {
                const target = (effect.target === 'attacker' && eventData && eventData.attacker) 
                    ? eventData.attacker 
                    : targetEntity;
                
                let amount = 0;
                if (effect.value !== undefined) {
                    amount = effect.value * this.stacks;
                } else if (effect.percent !== undefined && eventData && eventData.damage) {
                    amount = -Math.floor(eventData.damage * effect.percent);
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