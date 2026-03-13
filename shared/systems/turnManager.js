import { events } from '../../frontend/src/core/eventBus.js';
import { TargetingResolver } from '../../shared/systems/targetingResolver.js';
import { AbilitySystem } from '../../shared/systems/abilitySystem.js';
import { BattleAnimationFactory } from '../../shared/systems/factories/battleAnimationFactory.js';
import { AbilityFactory } from '../../shared/systems/factories/abilityFactory.js';
import { PHASE } from '../../frontend/src/controllers/battleController.js'; // Import phase constants from the controller
import { StatusEffectFactory } from '../../shared/systems/factories/statusEffectFactory.js'; // <-- NEW IMPORT

export const TURN_TYPES = {
    MESSAGE_STATUS: 'STATUS_MESSAGE',
    MESSAGE_VICTORY: 'VICTORY_MESSAGE',
    MESSAGE_DEFEAT: 'DEFEAT_MESSAGE',
    MESSAGE_DEATH: 'DEATH_MESSAGE',
    BATTLE_END: 'BATTLE_END',
    REINFORCEMENT: 'REINFORCEMENT',
    PROMPT_REINFORCEMENT: 'PROMPT_REINFORCEMENT',
    PLAY_ANIMATION: 'PLAY_ANIMATION',
    APPLY_ABILITY_EFFECTS: 'APPLY_ABILITY_EFFECTS',
    END_ACTOR_TURN: 'END_ACTOR_TURN', 
    EXECUTE_ACTION: 'EXECUTE_ACTION',            
    APPLY_STATUS_EFFECT: 'APPLY_STATUS_EFFECT',
    WEATHER_INTRO: 'WEATHER_INTRO' // <-- NEW: Add this
};

export class TurnManager {
    constructor(battleController) {
        this.bc = battleController;
    }

    // Convenient getter to always reference the parent controller's state
    get state() {
        return this.bc.state;
    }

    processNextTurnInQueue() {
        this.bc.timer = 0;
        this.state.activeAnimation = null; 

        if (this.state.turnQueue.length > 0) {
            this.executeTurn(this.state.turnQueue.shift());
        } else if (this.state.phase === PHASE.RESOLVE) {
            this.bc.checkBattleStatus();
        }
    }

    executeTurn(turn) {
        const messageTypes = [TURN_TYPES.MESSAGE_VICTORY, TURN_TYPES.MESSAGE_DEFEAT, TURN_TYPES.MESSAGE_STATUS, TURN_TYPES.MESSAGE_DEATH];
        if (messageTypes.includes(turn.type)) {
            this.state.message = turn.message;
            return;
        }
        
        switch (turn.type) {
            case TURN_TYPES.WEATHER_INTRO: // <-- NEW
                return this._handleWeatherIntroTurn(turn);
            case TURN_TYPES.APPLY_STATUS_EFFECT:
                return this._applyStatusEffectTurn(turn);
            case TURN_TYPES.EXECUTE_ACTION:
                if (turn.actor._skipAction || turn.actor.isDead()) {
                    turn.actor._skipAction = false; 
                    return this.processNextTurnInQueue();
                }
                return this._handleActionExecution(turn);
            case TURN_TYPES.END_ACTOR_TURN:
                if (!turn.actor.isDead() && !this.state.fled) {
                    this.queueStatusEffects(turn.actor, 'ON_TURN_END');
                }
                return this.processNextTurnInQueue();
            case TURN_TYPES.PROMPT_REINFORCEMENT:
                return this.bc.requestPartySwap(true, turn.slotIndex);
            case TURN_TYPES.BATTLE_END:
                return this.bc.endBattle();
            case TURN_TYPES.REINFORCEMENT:
                const pool = turn.team === 'party' ? this.state.activeParty : this.state.activeEnemies;
                pool[turn.slotIndex] = turn.replacement; 
                this.state.message = turn.message;

                // --- CHANGED: Apply active weather status to the reinforcement consistently! ---
                if (this.state.weather && this.state.weather.appliedStatusId && this.state.weather.id !== 'clear') {
                    const hasWeather = turn.replacement.statusEffects.some(s => s.id === this.state.weather.appliedStatusId);
                    if (!hasWeather) {
                        // Build the object, then apply it
                        const weatherStatus = StatusEffectFactory.createEffect(this.state.weather.appliedStatusId, null, turn.replacement);
                        if (weatherStatus) {
                            turn.replacement.applyStatusEffect(weatherStatus);
                        }
                    }
                }
                return;
            case TURN_TYPES.PLAY_ANIMATION:
                return this._handleAnimationTurn(turn);
            case TURN_TYPES.APPLY_ABILITY_EFFECTS:
                return this._applyAbilityEffects(turn);
            default: 
               return this._unpackBaseTurn(turn);
        }
    }

    _unpackBaseTurn(turn) {
        let { actor, action, target } = turn;
        if (actor.isDead()) return this.processNextTurnInQueue();

        actor._skipAction = false; 

        this.state.turnQueue.unshift({ type: TURN_TYPES.END_ACTOR_TURN, actor: actor });
        this.state.turnQueue.unshift({ type: TURN_TYPES.EXECUTE_ACTION, actor, action, target });
        this.queueStatusEffects(actor, 'ON_TURN_START');

        this.processNextTurnInQueue();
    }

    _applyAbilityEffects(turn) {
        let { actor, action, targets, isFirstTarget } = turn;

        if (isFirstTarget) action.payCost(actor, null);

        for (let target of targets) {
            const actualTarget = this.getValidTarget(target);
            if (!actualTarget) continue; 
            
            const wasTargetDead = actualTarget.isDead();
            const wasActorDead = actor.isDead(); 

            const result = AbilitySystem.execute(action.id, actor, actualTarget);
            
            if (result.fled) {
                this.bc.handleFlee(actor);
                break; 
            }

            if (result.missed || result.evaded) {
                events.emit('SPAWN_FCT', {
                    target: actualTarget,
                    text: result.evaded ? 'Evade!' : 'Miss!',
                    type: 'status'
                });
            }

            if (result.message) this.queueMessage(result.message);

            if (!wasTargetDead && actualTarget.isDead()) this.bc.handleDeath(actualTarget);
            if (!wasActorDead && actor.isDead()) {
                this.bc.handleDeath(actor);
                break; 
            }
        }

        this.processNextTurnInQueue();
    }

    _handleActionExecution(turn) {
        let { actor, action, target: primaryTarget } = turn;

        if (actor.isDead()) return this.processNextTurnInQueue();

        let resolvedTargets = TargetingResolver.resolve(action, actor, primaryTarget, this.state);

        if (resolvedTargets.length === 0) {
            this.state.message = `${actor.name} tried to use ${action.name}, but there were no targets left!`;
            return this.processNextTurnInQueue();
        }

        if (!action.canPayCost(actor)) {
            action = AbilityFactory.createAbilities(['rest'])[0]; 
            resolvedTargets = [actor]; 
        }
        
        this.state.message = action.id === 'rest' ? `${actor.name} recovers!` : `${actor.name} used ${action.name}!`;

        const isAoE = ['all_enemies', 'all_allies'].includes(action.targeting?.scope) || action.targeting?.isAoE;

        if (isAoE) {
            this._queueAoEAction(actor, action, resolvedTargets);
        } else {
            this._queueMultiAction(actor, action, resolvedTargets);
        }
        
        this.processNextTurnInQueue();
    }

    _queueAoEAction(actor, action, targets) {
        for (let i = targets.length - 1; i >= 0; i--) {
            this.state.turnQueue.unshift(this._createApplyEffectTurn(actor, action, [targets[i]], i === 0, i === targets.length - 1));
        }
        this.state.turnQueue.unshift({ type: TURN_TYPES.PLAY_ANIMATION, actor, action, targets });
    }

    _queueMultiAction(actor, action, targets) {
        for (let i = targets.length - 1; i >= 0; i--) {
            this.state.turnQueue.unshift(this._createApplyEffectTurn(actor, action, [targets[i]], i === 0, i === targets.length - 1));
            this.state.turnQueue.unshift({ type: TURN_TYPES.PLAY_ANIMATION, actor, action, target: targets[i] });
        }
    }

    _createApplyEffectTurn(actor, action, targets, isFirst, isLast) {
        return {
            type: TURN_TYPES.APPLY_ABILITY_EFFECTS,
            actor, action, targets, 
            isFirstTarget: isFirst, 
            isLastTarget: isLast 
        };
    }

    _handleAnimationTurn(turn) {
        const targetList = turn.targets || [turn.target];
        const validTargets = [];
        const redirectedTurns = new Set();

        for (let target of targetList) {
            let actualTarget = this.getValidTarget(target);
            if (!actualTarget) continue; 
            
            if (actualTarget !== target) {
                const nextApplyTurn = this.state.turnQueue.find(t => 
                    t.type === TURN_TYPES.APPLY_ABILITY_EFFECTS && 
                    t.targets?.includes(target) &&
                    !redirectedTurns.has(t) 
                );
                
                if (nextApplyTurn) {
                    nextApplyTurn.targets = [actualTarget];
                    redirectedTurns.add(nextApplyTurn); 
                }
            }
            
            if (!validTargets.includes(actualTarget)) validTargets.push(actualTarget);
        }

        if (validTargets.length === 0) {
            return this.processNextTurnInQueue(); 
        }

        const animId = turn.animationId || turn.action?.animationId;
        this.state.activeAnimation = BattleAnimationFactory.create(animId, turn.actor, validTargets);
    }

    queueStatusEffects(combatant, triggerEvent, context = {}) {
        if (!combatant || combatant.isDead()) return;

        for (let i = combatant.statusEffects.length - 1; i >= 0; i--) {
            const status = combatant.statusEffects[i];
            const hasActiveTrigger = status.effects && status.effects.some(e => e.trigger === triggerEvent);

            this.state.turnQueue.unshift({
                type: TURN_TYPES.APPLY_STATUS_EFFECT,
                actor: combatant,
                status: status,
                triggerEvent: triggerEvent,
                context: context
            });

            if (hasActiveTrigger) {
                const animId = status.animationId || status.definition?.animationId || status.config?.animationId;
                if (animId) {
                    this.state.turnQueue.unshift({
                        type: TURN_TYPES.PLAY_ANIMATION,
                        actor: combatant,
                        target: combatant,
                        animationId: animId
                    });
                }
            }
        }
    }

    _applyStatusEffectTurn(turn) {
        const { actor, status, triggerEvent, context } = turn;
        if (actor.isDead() || status.isExpired()) return this.processNextTurnInQueue();

        const result = status.onEvent(triggerEvent, actor, context);
        
        if (result.cancelAction) actor._skipAction = true;

        if (result.messages?.length > 0) {
            const messageTurns = result.messages.map(msg => ({
                type: TURN_TYPES.MESSAGE_STATUS, 
                message: msg
            }));
            this.state.turnQueue.unshift(...messageTurns);
        }

        if (actor.isDead()) this.bc.handleDeath(actor);
        if (context.attacker?.isDead()) this.bc.handleDeath(context.attacker);
        if (status.isExpired()) actor.removeStatusEffect(status.id);

        this.processNextTurnInQueue();
    }

    getValidTarget(target) {
        if (!target.isDead()) return target;
        
        const fallbackPool = this.bc.getActivePool(target.team);
        const livingTargets = fallbackPool.filter(t => t && !t.isDead());
        
        if (livingTargets.length === 0) return null;
        return livingTargets[Math.floor(Math.random() * livingTargets.length)];
    }

    queueMessage(message, type = TURN_TYPES.MESSAGE_STATUS) {
        this.state.turnQueue.unshift({ type, message });
    }
    _handleWeatherIntroTurn(turn) {
        console.log('[DEBUG] TurnManager executing WEATHER_INTRO turn:', turn);
        const { weather, targets } = turn;
        
        if (weather.appliedStatusId) {
            targets.forEach(target => {
                if (target && !target.isDead()) {
                    console.log(`[DEBUG] Applying weather status ${weather.appliedStatusId} to ${target.name}`);
                    
                    // --- CHANGED: Build the object, then apply it consistently ---
                    const weatherStatus = StatusEffectFactory.createEffect(weather.appliedStatusId, null, target);
                    if (weatherStatus) {
                        target.applyStatusEffect(weatherStatus); 
                    }
                }
            });
        }

        // 2. Play the screen-wide animation
        if (weather.animationId) {
            console.log(`[DEBUG] Triggering Weather Animation: ${weather.animationId}`);
            this.state.activeAnimation = BattleAnimationFactory.create(weather.animationId, null, targets);
        } else {
            console.log('[DEBUG] No animationId found for weather. Skipping to next turn.');
            this.processNextTurnInQueue();
        }
    }
}