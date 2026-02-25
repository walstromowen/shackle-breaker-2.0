import { StatCalculator } from './statCalculator.js';
// (Assuming CombatCalculator and StatusEffectFactory are imported here as well based on your previous file structure)
import { CombatCalculator } from './combatCalculator.js';
import { StatusEffectFactory } from './factories/statusEffectFactory.js';
import { AbilityDefinitions } from '../data/abilityDefinitions.js';

export class AbilitySystem {

    static execute(abilityId, source, target) {
        const def = AbilityDefinitions[abilityId];
        if (!def) return { success: false, message: "Invalid Ability" };

        const result = {
            success: false,
            outcome: 'NONE',   
            delta: 0,          
            resource: 'hp',    
            message: "",       
            addedTags: []      // We will push status effect IDs in here!
        };

        // We need to know if a physical/magic attack missed so we don't apply poison on a whiff.
        let attackHit = true;

        // 1. Process Main Effects (Damage, Heal, etc.)
        if (def.effects && Array.isArray(def.effects)) {
            for (const effect of def.effects) {
                
                if (effect.type === 'damage') {
                    const calc = this._handleDamage(effect, source, target);
                    
                    result.success = calc.hit;
                    result.outcome = calc.crit ? 'CRIT' : (calc.hit ? 'HIT' : 'MISS');
                    result.delta = -calc.damage;
                    result.message = calc.message;

                    if (!calc.hit) {
                        attackHit = false; // Mark as missed!
                        break; 
                    }
                }
                else if (effect.type === 'recover') {
                    const subResult = this._handleRecover(effect, source, target);
                    if (subResult.success) {
                        result.success = true;
                        result.outcome = 'HEAL';
                        result.delta = subResult.amount;
                        result.resource = effect.resource;
                        result.message = subResult.message;
                    }
                }
                else if (effect.type === 'set') {
                    const subResult = this._handleSet(effect, target);
                    if (subResult.success) {
                        result.success = true;
                        result.message = subResult.message;
                    }
                }
            }
        }

        // 2. [NEW] Process Status Effects (Only if the attack didn't miss!)
        if (attackHit && def.statusEffects && Array.isArray(def.statusEffects)) {
            for (const statusDef of def.statusEffects) {
                // Roll the dice against the chance (default to 100% if undefined)
                const roll = Math.random();
                const chance = statusDef.chance !== undefined ? statusDef.chance : 1.0;

                if (roll <= chance) {
                    // Create the live effect model
                    const activeEffect = StatusEffectFactory.createEffect(
                        statusDef.id, 
                        statusDef.duration, // Mapped to initialCharges
                        source
                    );

                    if (activeEffect) {
                        // Apply it to the target
                        target.applyStatusEffect(activeEffect);
                        
                        // Update the combat result so the UI knows to show "Poisoned!"
                        result.addedTags.push(statusDef.id);
                        result.message += ` ${target.name} was inflicted with ${activeEffect.name}!`;
                    }
                }
            }
        }

        if (result.success && !result.message) {
            result.message = "Ability used successfully.";
        } else if (!result.success && !result.message) {
            result.message = "But it failed!";
        }

        return result;
    }

    // --- LOGIC HANDLERS ---

    static _handleDamage(effect, source, target) {
        // 1. Ask the Calculator for the numbers (No state change yet)
        const calc = CombatCalculator.calculatePhysical(
            source, 
            target, 
            effect.power || 10,
            effect.damageType || 'blunt'
        );

        // 2. Apply the State Change (Mutation)
        if (calc.hit) {
            target.modifyResource('hp', -calc.damage);

            // 3. Generate the Text Log
            const critText = calc.crit ? " (Critical!)" : "";
            calc.message = `${target.name} takes ${calc.damage} damage!${critText}`;

            // --- 4. NEW: TRIGGER REACTIVE STATUS EFFECTS ---
            if (target.statusEffects && Array.isArray(target.statusEffects)) {
                // We use a copy of the array or standard iteration since `removeStatusEffect` filters the main array
                target.statusEffects.forEach(status => {
                    const reaction = status.onEvent('ON_DAMAGE_RECEIVED', target, { 
                        attacker: source, 
                        damage: calc.damage 
                    });
                    
                    // Append reaction messages (e.g., "Attacker takes 5 PIERCE HP from Thorns!")
                    if (reaction.messages && reaction.messages.length > 0) {
                        calc.message += ` ${reaction.messages.join(' ')}`;
                    }
                    
                    // Clean up if it consumed its last charge (like Living Bomb popping)
                    if (status.isExpired()) {
                        target.removeStatusEffect(status.id);
                    }
                });
            }
            
        } else {
            calc.message = `${source.name}'s attack missed!`;
        }

        return calc;
    }

    static _handleRecover(effect, source, target) {
        let amount = 0;

        if (effect.calculation === 'flat') {
            amount = effect.power;
        } 
        else if (effect.calculation === 'attribute') {
            const stats = StatCalculator.calculate(source);
            amount = effect.power + Math.floor((stats.attributes[effect.attribute] || 0) * (effect.scaling || 0));
        }
        else if (effect.calculation === 'max') {
            amount = 9999; 
        }

        const actualChange = target.modifyResource(effect.resource, amount);

        return {
            success: actualChange !== 0,
            amount: actualChange,
            message: actualChange !== 0 ? `+${actualChange} ${effect.resource.toUpperCase()}` : "Recover failed"
        };
    }

    static _handleSet(effect, target) {
        const currentVal = target.stats ? target.stats[effect.resource] : target[effect.resource];
        const diff = effect.value - currentVal;

        if (diff === 0) return { success: false };

        target.modifyResource(effect.resource, diff);

        return {
            success: true,
            message: `${effect.resource.toUpperCase()} set to ${effect.value}`
        };
    }
}