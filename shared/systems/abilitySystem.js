import { StatCalculator } from './statCalculator.js';
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
            addedTags: []      
        };

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

        // 2. Process Status Effects (Only if the attack didn't miss!)
        console.log(`[Debug] Checking status effects for ${def.name}. attackHit: ${attackHit}, statusEffects:`, def.statusEffects);

        if (attackHit && def.statusEffects && Array.isArray(def.statusEffects)) {
            for (const statusDef of def.statusEffects) {
                const roll = Math.random();
                const chance = statusDef.chance !== undefined ? statusDef.chance : 1.0;
                
                console.log(`[Debug] Rolling for ${statusDef.id}. Rolled: ${roll.toFixed(2)}, Needed: <= ${chance}`);

                if (roll <= chance) {
                    console.log(`[Debug] Roll successful! Creating effect: ${statusDef.id} with duration: ${statusDef.duration}`);
                    
                    const activeEffect = StatusEffectFactory.createEffect(
                        statusDef.id, 
                        statusDef.duration, 
                        source
                    );

                    console.log(`[Debug] Factory returned:`, activeEffect);

                    if (activeEffect) {
                        target.applyStatusEffect(activeEffect);
                        
                        result.success = true; 

                        result.addedTags.push(statusDef.id);
                        result.message += ` ${target.name} was inflicted with ${activeEffect.name}!`;
                    } else {
                        console.error(`[Debug] Factory failed to create the effect! Check StatusEffectFactory.`);
                    }
                } else {
                    console.log(`[Debug] Roll failed for ${statusDef.id}.`);
                }
            }
        }

        // Return the final data payload back to the BattleController
        return result;
    }

    // --- LOGIC HANDLERS ---

    static _handleDamage(effect, source, target) {
        const calc = CombatCalculator.calculatePhysical(
            source, 
            target, 
            effect.power || 10,
            effect.damageType || 'blunt'
        );

        if (calc.hit) {
            target.modifyResource('hp', -calc.damage);

            const critText = calc.crit ? " (Critical!)" : "";
            calc.message = `${target.name} takes ${calc.damage} damage!${critText}`;

            if (target.statusEffects && Array.isArray(target.statusEffects)) {
                // CHANGED: Loop backwards safely handle array splicing mid-iteration
                for (let i = target.statusEffects.length - 1; i >= 0; i--) {
                    const status = target.statusEffects[i];
                    
                    const reaction = status.onEvent('ON_DAMAGE_RECEIVED', target, { 
                        attacker: source, 
                        damage: calc.damage 
                    });
                    
                    if (reaction.messages && reaction.messages.length > 0) {
                        calc.message += ` ${reaction.messages.join(' ')}`;
                    }
                    
                    if (status.isExpired()) {
                        target.removeStatusEffect(status.id);
                    }
                }
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
        else if (effect.calculation === 'percent') {
            // Capitalize the first letter to find the max stat dynamically
            const maxProp = 'max' + effect.resource.charAt(0).toUpperCase() + effect.resource.slice(1);
            const maxValue = target[maxProp] || 1; 
            
            // Calculate the percentage and round down to a whole number
            amount = Math.floor(maxValue * effect.power);
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