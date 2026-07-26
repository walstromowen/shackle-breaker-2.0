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

        const result = { success: false, outcome: 'NONE', delta: 0, resource: 'hp', message: "", addedTags: [] };
        let attackHit = true;

        // 1. Process Main Effects (Damage, Heal, etc.)
        if (def.effects && Array.isArray(def.effects)) {
            for (const effect of def.effects) {
                if (effect.type === 'damage') {
                    const calc = this._handleDamage(effect, source, target, def.accuracy, def)
                    result.success = calc.hit;
                    result.outcome = calc.crit ? 'CRIT' : (calc.hit ? 'HIT' : 'MISS');
                    result.delta = -calc.damage;
                    result.message = calc.message;

                    if (!calc.hit) {
                        attackHit = false;
                        break; 
                    }
                } else if (effect.type === 'recover') {
                    const subResult = this._handleRecover(effect, source, target, def);
                    if (subResult.success) {
                        result.success = true;
                        result.outcome = 'HEAL';
                        result.delta = subResult.amount;
                        result.resource = effect.resource;
                        result.message = subResult.message;
                    }
                } else if (effect.type === 'set') {
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
                    const existingStatus = (target.statusEffects || []).find(s => s.id === statusDef.id);
                    
                    if (existingStatus) {
                        existingStatus.addStack();
                        result.success = true;
                        result.addedTags.push(statusDef.id);
                        const stackText = existingStatus.stacks === existingStatus.maxStacks ? '(Max Stacks)' : `(x${existingStatus.stacks})`;
                        const template = statusDef.stackMessage || "{target}'s {status} grew stronger! {stackText}";
                        result.message += " " + this._parseMessage(template, source, target, def, { status: existingStatus.name, stackText: stackText });
                    } else {
                        const activeEffect = StatusEffectFactory.createEffect(statusDef.id, statusDef.duration, source);
                        if (activeEffect) {
                            target.applyStatusEffect(activeEffect);
                            result.success = true;
                            result.addedTags.push(statusDef.id);
                            const template = statusDef.applyMessage || "{target} gained {status}!";
                            result.message += " " + this._parseMessage(template, source, target, def, { status: activeEffect.name });
                        } else {
                            console.error(`[Debug] Factory failed to create the effect! Check StatusEffectFactory.`);
                        }
                    }
                }
            }
        }

        return result;
    }

    // =========================================================================
    // LOGIC HANDLERS
    // =========================================================================

    /**
     * Evaluates a condition object on an effect to dynamically scale power.
     */
    static _calculateConditionalMultiplier(effect, source, target) {
        if (!effect.condition) return 1.0;

        let multiplier = 1.0;
        const condition = effect.condition;
        const condMultiplier = condition.multiplier || 1.0;

        // Target HP condition (e.g., Execute)
        if (condition.target_hp_below !== undefined && target.maxHp) {
            const hpPercent = target.hp / target.maxHp;
            if (hpPercent < condition.target_hp_below) multiplier *= condMultiplier;
        }

        // Source HP condition (e.g., Desperation)
        if (condition.user_hp_below !== undefined && source.maxHp) {
            const hpPercent = source.hp / source.maxHp;
            if (hpPercent < condition.user_hp_below) multiplier *= condMultiplier;
        }

        // Target Status condition (e.g., Eviscerate against Bleed)
        if (condition.target_has_status && target.statusEffects) {
            const hasStatus = target.statusEffects.some(s => s.id === condition.target_has_status);
            if (hasStatus) multiplier *= condMultiplier;
        }

        // Source Status condition (e.g., Consuming a buff for extra damage)
        if (condition.user_has_status && source.statusEffects) {
            const hasStatus = source.statusEffects.some(s => s.id === condition.user_has_status);
            if (hasStatus) multiplier *= condMultiplier;
        }

        return multiplier;
    }

    static _handleDamage(effect, source, target, abilityAccuracy = 1.0, def) {
        // Evaluate condition and calculate final modified power
        const conditionMultiplier = this._calculateConditionalMultiplier(effect, source, target);
        const basePower = effect.power || 10;
        const finalPower = basePower * conditionMultiplier;

        if (conditionMultiplier > 1.0) {
            console.log(`[BATTLE DEBUG] Condition met! Multiplier applied: x${conditionMultiplier} (Final Power: ${finalPower})`);
        }

        // Pass the updated power into the Combat Calculator
        const calc = CombatCalculator.calculateDamage(
            source, target, finalPower, effect.damageType || 'blunt', abilityAccuracy
        );

        if (calc.hit) {
            // 1. Identify the target resource (default to 'hp')
            const targetResource = effect.resource || 'hp';
            
            // 2. Apply damage to the dynamic resource
            target.modifyResource(targetResource, -calc.damage);

            // 3. Fetch custom message or fallback to default
            const template = calc.crit ? 
                (def.critMessage || "{target} takes {damage} damage! (Critical!)") : 
                (def.hitMessage || "{target} takes {damage} damage!");
            
            calc.message = this._parseMessage(template, source, target, def, { damage: calc.damage });
            
            // Format message context for non-HP resources
            if (targetResource !== 'hp') {
                calc.message = calc.message.replace("damage!", `${targetResource.toUpperCase()} damage!`);
            }

            // 4. Handle Drain (Leech) Mechanics
            if (effect.drain && effect.drain > 0) {
                // Find out how much of the resource the target ACTUALLY had before we hit them
                // We use Math.max(0) to ensure we don't calculate based on negative numbers if they were already dead/empty
                const currentResourceAmount = Math.max(0, (target[targetResource] || target.stats[targetResource]));
                
                // You can only drain up to the amount of health/stamina/insight the target actually possessed
                const effectiveDamage = Math.min(calc.damage, currentResourceAmount);
                
                // Calculate how much is returned to the user
                const drainAmount = Math.floor(effectiveDamage * effect.drain);
                
                if (drainAmount > 0) {
                    const drainResource = effect.drainResource || targetResource; 
                    source.modifyResource(drainResource, drainAmount);
                    
                    calc.message += ` ${source.name} absorbed ${drainAmount} ${drainResource.toUpperCase()}!`;
                }
            }

            // 5. Handle Recoil Mechanics
        if (effect.recoil && effect.recoil > 0) {
            // Calculate recoil based on the damage dealt (minimum of 1 damage if it hits)
            const recoilAmount = Math.max(1, Math.floor(calc.damage * effect.recoil));
            const recoilResource = effect.recoilResource || 'hp'; // Default to HP damage
            
            source.modifyResource(recoilResource, -recoilAmount);
            calc.message += ` ${source.name} took ${recoilAmount} recoil damage!`;
        }

            // 6. Trigger Status Effect Reactions
            if (target.statusEffects && Array.isArray(target.statusEffects)) {
                for (let i = target.statusEffects.length - 1; i >= 0; i--) {
                    const status = target.statusEffects[i];
                    const reaction = status.onEvent('ON_DAMAGE_RECEIVED', target, { attacker: source, damage: calc.damage });
                    
                    if (reaction.messages && reaction.messages.length > 0) {
                        calc.message += ` ${reaction.messages.join(' ')}`;
                    }
                    if (status.isExpired()) {
                        target.removeStatusEffect(status.id);
                    }
                }
            }
        } else {
            // Added {target} to the fallback string to clarify AoE misses
            const template = def.missMessage || "{user}'s ability missed {target}!";
            calc.message = this._parseMessage(template, source, target, def);
        }

        return calc;
    }

    static _handleRecover(effect, source, target, def) {
        let amount = 0;
        
        // You could theoretically use _calculateConditionalMultiplier here too
        // if you want healing to scale based on conditions!
        
        if (effect.calculation === 'flat') {
            amount = effect.power;
        } else if (effect.calculation === 'attribute') {
            const currentStats = source.stats;
            amount = effect.power + Math.floor((currentStats.attributes?.[effect.attribute] || 0) * (effect.scaling || 0));
        } else if (effect.calculation === 'percent') {
            const maxProp = 'max' + effect.resource.charAt(0).toUpperCase() + effect.resource.slice(1);
            const maxValue = target[maxProp] || 1;
            amount = Math.floor(maxValue * effect.power);
        } else if (effect.calculation === 'max') {
            amount = 9999;
        }

        const actualChange = target.modifyResource(effect.resource, amount);
        const template = def.healMessage || "+{amount} {resource}";
        const parsedMessage = this._parseMessage(template, source, target, def, { amount: actualChange, resource: effect.resource });

        return { 
            success: actualChange !== 0, 
            amount: actualChange, 
            message: actualChange !== 0 ? parsedMessage : "Recover failed" 
        };
    }

    static _handleSet(effect, target) {
        const currentVal = target.stats ? target.stats[effect.resource] : target[effect.resource];
        const diff = effect.value - currentVal;
        if (diff === 0) return { success: false };
        
        target.modifyResource(effect.resource, diff);
        return { success: true, message: `${effect.resource.toUpperCase()} set to ${effect.value}` };
    }

    static _parseMessage(template, source, target, def, extra = {}) {
        const targetName = target === source ? 'They' : (target?.name || "the target");
        let msg = template
            .replace(/{user}/g, source?.name || "Someone")
            .replace(/{target}/g, targetName)
            .replace(/{ability}/g, def?.name || "the action");

        if (extra.damage !== undefined) msg = msg.replace(/{damage}/g, extra.damage);
        if (extra.status !== undefined) msg = msg.replace(/{status}/g, extra.status);
        if (extra.amount !== undefined) msg = msg.replace(/{amount}/g, extra.amount);
        if (extra.resource !== undefined) msg = msg.replace(/{resource}/g, extra.resource.toUpperCase());
        if (extra.stackText !== undefined) msg = msg.replace(/{stackText}/g, extra.stackText);

        return msg;
    }
}