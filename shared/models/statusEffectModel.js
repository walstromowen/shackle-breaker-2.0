export class StatusEffectModel {
    constructor(definition, initialCharges = null, inflictor = null) {
        this.def = definition;
        this.id = definition.id;
        this.name = definition.name;
        this.icon = definition.icon;
        
       // ✅ Added: Pull the animation ID directly from the definition
        this.animationId = definition.animationId; 
        
        // ✅ NEW: Pull the persist flag (defaults to false if not specified)
        this.persistAfterCombat = definition.persistAfterCombat || false;
        
        // Grab the generic effects array
        this.effects = definition.effects || []; 
        this.modifiers = definition.modifiers || [];
        // Use custom charges if provided, otherwise fallback to default
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
        // Refresh charges when a new stack is applied
        this.charges = this.def.defaultCharges; 
    }

    consumeCharge() {
        this.charges--;
    }

    isExpired() {
        return this.charges <= 0;
    }

    /**
     * Universal generic event handler.
     */
    onEvent(eventName, targetEntity, eventData = null) {
        const result = { messages: [], cancelAction: false };

        // 1. UNIVERSAL TICK DOWN 
        if (eventName === 'ON_TURN_END') {
             this.consumeCharge();
        }

        // 2. PROCESS EFFECTS ARRAY
        this.effects.forEach(effect => {
            if (effect.trigger !== eventName) return;

            // --- GENERIC RESOURCE MODIFICATION ---
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

                    // --- NEW MESSAGE PARSER ---
                    // Now looking for battleMessage
                    let msgTemplate = effect.battleMessage || "{target} takes {amount} {resource} damage from {status}!";
                    let absoluteAmount = Math.abs(amount);
                    
                    let finalMessage = msgTemplate
                        .replace(/{target}/g, target.name)
                        .replace(/{amount}/g, absoluteAmount)
                        .replace(/{resource}/g, effect.modify.toUpperCase())
                        .replace(/{status}/g, this.name);
                        
                    result.messages.push(finalMessage);
                    // --------------------------
                }

                if (effect.consumeCharge) {
                    this.consumeCharge();
                }
            }

            // --- GENERIC FLAGS ---
            if (effect.flag) {
                if (effect.flag === 'skipAction') {
                    result.cancelAction = true;
                    
                    // --- NEW MESSAGE PARSER ---
                    // Now looking for battleMessage
                    let msgTemplate = effect.battleMessage || "{target} is hindered by {status} and cannot act!";
                    let finalMessage = msgTemplate
                        .replace(/{target}/g, targetEntity.name)
                        .replace(/{status}/g, this.name);
                        
                    result.messages.push(finalMessage);
                    // --------------------------
                }
            }
        });

        return result;
    }
}