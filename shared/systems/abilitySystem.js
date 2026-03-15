import { StatCalculator } from './statCalculator.js';
import { CombatCalculator } from './combatCalculator.js';
import { StatusEffectFactory } from './factories/statusEffectFactory.js';
import { AbilityDefinitions } from '../data/abilityDefinitions.js';

export class AbilitySystem {

    static execute(abilityId, source, target) {
        const def = AbilityDefinitions[abilityId];
        if (!def) return { success: false, message: "Invalid Ability" };

        // --- Intercept Flee Behavior (Evasion-Based) ---
        if (def.behavior === 'flee_battle') {
            const stats = source.baseStats || source.stats || {};
            const evasion = stats.evasion || 100;
            
            const abilityAcc = def.accuracy !== undefined ? def.accuracy : 1.0;
            let fleeChance = abilityAcc * (evasion / 100);
            
            fleeChance = Math.max(0.05, Math.min(1.0, fleeChance)); 

            const roll = Math.random();
            const isSuccess = roll <= fleeChance;

            console.log(`[MATH DEBUG] Flee Check -> Evasion: ${evasion} | Chance: ${(fleeChance * 100).toFixed(1)}% | Roll: ${(roll * 100).toFixed(1)}% | Success: ${isSuccess}`);

            return {
                success: isSuccess,
                fled: isSuccess, 
                outcome: isSuccess ? 'FLEE_SUCCESS' : 'FLEE_FAIL',
                delta: 0,
                message: isSuccess ? `${source.name} successfully escaped!` : `Failed to escape!`,
                addedTags: []
            };
        }

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
                    const calc = this._handleDamage(effect, source, target, def.accuracy);
                    
                    result.success = calc.hit;
                    result.outcome = calc.crit ? 'CRIT' : (calc.hit ? 'HIT' : 'MISS');
                    result.delta = -calc.damage;
                    result.message = calc.message;

                    if (!calc.hit) {
                        attackHit = false; 
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
        if (attackHit && def.statusEffects && Array.isArray(def.statusEffects)) {
            for (const statusDef of def.statusEffects) {
                const roll = Math.random();
                const chance = statusDef.chance !== undefined ? statusDef.chance : 1.0;

                if (roll <= chance) {
                    // ✅ NEW: Check if the target already has the effect
                    const existingStatus = (target.statusEffects || []).find(s => s.id === statusDef.id);

                    if (existingStatus) {
                        // ✅ Tell the existing status to increment its stacks (and refresh duration)
                        existingStatus.addStack();
                        
                        result.success = true;
                        result.addedTags.push(statusDef.id);
                        
                        // Optional: Format the message to show stacking maxing out
                        const stackText = existingStatus.stacks === existingStatus.maxStacks ? '(Max Stacks)' : `(x${existingStatus.stacks})`;
                        result.message += ` ${target.name}'s ${existingStatus.name} grew stronger! ${stackText}`;
                        
                    } else {
                        // Create a brand new effect if they don't have it yet
                        const activeEffect = StatusEffectFactory.createEffect(
                            statusDef.id, 
                            statusDef.duration, 
                            source
                        );

                        if (activeEffect) {
                            target.applyStatusEffect(activeEffect);
                            result.success = true; 
                            result.addedTags.push(statusDef.id);
                            
                            // Adjust grammar so it doesn't sound weird when casting on yourself
                            const targetName = target === source ? 'They' : target.name;
                            result.message += ` ${targetName} gained ${activeEffect.name}!`;
                        } else {
                            console.error(`[Debug] Factory failed to create the effect! Check StatusEffectFactory.`);
                        }
                    }
                }
            }
        }

        return result;
    }

    // --- LOGIC HANDLERS ---

    static _handleDamage(effect, source, target, abilityAccuracy = 1.0) {
        const calc = CombatCalculator.calculateDamage(
            source, 
            target, 
            effect.power || 10,
            effect.damageType || 'blunt',
            abilityAccuracy 
        );

        if (calc.hit) {
            target.modifyResource('hp', -calc.damage);

            const critText = calc.crit ? " (Critical!)" : "";
            calc.message = `${target.name} takes ${calc.damage} damage!${critText}`;

            if (target.statusEffects && Array.isArray(target.statusEffects)) {
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
            const currentStats = source.stats; 
            amount = effect.power + Math.floor((currentStats.attributes?.[effect.attribute] || 0) * (effect.scaling || 0));
        }
        else if (effect.calculation === 'percent') {
            const maxProp = 'max' + effect.resource.charAt(0).toUpperCase() + effect.resource.slice(1);
            const maxValue = target[maxProp] || 1; 
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