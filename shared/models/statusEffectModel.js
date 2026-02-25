export class StatusEffectModel {
    constructor(definition, initialCharges = null, inflictor = null) {
        this.def = definition;
        this.id = definition.id;
        this.name = definition.name;
        this.icon = definition.icon;
        
        // Grab the generic effects array
        this.effects = definition.effects || []; 
        
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
        // All effects lose a charge at the end of the turn to track duration.
        if (eventName === 'ON_TURN_END') {
             this.consumeCharge();
        }

        // 2. PROCESS EFFECTS ARRAY
        this.effects.forEach(effect => {
            // Skip if the event doesn't match this specific effect's trigger
            if (effect.trigger !== eventName) return;

            // --- GENERIC RESOURCE MODIFICATION ---
            if (effect.modify) {
                // Determine target (default is sufferer, unless 'attacker' is specified)
                const target = (effect.target === 'attacker' && eventData && eventData.attacker) 
                    ? eventData.attacker 
                    : targetEntity;

                let amount = 0;
                
                // Handle flat values vs percent-based values (like Thorns)
                if (effect.value !== undefined) {
                    amount = effect.value * this.stacks;
                } else if (effect.percent !== undefined && eventData && eventData.damage) {
                    // Calculates percentage based on incoming damage (Make it negative to hurt)
                    amount = -Math.floor(eventData.damage * effect.percent);
                }

                if (amount !== 0) {
                    target.modifyResource(effect.modify, amount);

                    const actionWord = amount < 0 ? 'loses' : 'gains';
                    const elementText = effect.element ? ` ${effect.element}` : '';
                    result.messages.push(`${target.name} ${actionWord} ${Math.abs(amount)}${elementText} ${effect.modify.toUpperCase()} from ${this.name}!`);
                }

                // If the effect says it should instantly consume a charge (like exploding on hit)
                if (effect.consumeCharge) {
                    this.consumeCharge();
                }
            }

            // --- GENERIC FLAGS ---
            if (effect.flag) {
                if (effect.flag === 'skipAction') {
                    result.cancelAction = true;
                    result.messages.push(`${targetEntity.name} is ${this.name} and cannot act!`);
                }
            }
        });

        return result;
    }
}