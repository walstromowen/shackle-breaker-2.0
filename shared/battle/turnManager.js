import { events } from '../core/eventBus.js';
import { TargetingResolver } from './targetingResolver.js';
import { AbilitySystem } from '../abilities/abilitySystem.js';
import { BattleAnimationFactory } from './animation/battleAnimationFactory.js';
import { AbilityFactory } from '../abilities/abilityFactory.js';
import { PHASE, TURN_TYPES } from './battleConstants.js';
import { queueDeath, queueFlee } from './battleQueue.js';
import { getActivePool, registerAbilityUse, registerStatusApplication, registerDeath } from './battleState.js';
import { StatusEffectFactory } from '../abilities/statusEffectFactory.js';
import { InventorySystem } from '../items/inventorySystem.js';
import { CorruptionSystem } from '../characters/corruptionSystem.js';

/* Plays a battle's turn queue (`state.turnQueue`) one turn at a time: abilities, damage, status effects, deaths, messages and animations.
   It needs a `host` for the few things only the screen can do:
     host.state                  the battle state (see battleState.js)
     host.timer                  the wait before the next turn; set back to 0 when a turn starts
     host.checkBattleStatus()    the queue ran dry: decide between victory, defeat and another round
     host.requestPartySwap(forced, slotIndex)   ask the player who steps into a slot
     host.endBattle()            the BATTLE_END turn was reached
   Everything else (deaths, fleeing, the ledger, the active pools) goes straight through the functions in battleQueue.js / battleState.js. */
export class TurnManager {
    constructor(host) {
        this.host = host;
        // outgoing combatant -> the one who took their slot this battle (so attacks aimed at someone who
        // switched out land on whoever stepped in)
        this._slotSuccessors = new Map();
    }

    get state() { return this.host.state; }

    processNextTurnInQueue() {
        this.host.timer = 0;
        this.state.activeAnimation = null;
        
        if (this.state.turnQueue.length > 0) {
            this.executeTurn(this.state.turnQueue.shift());
        } else if (this.state.phase === PHASE.RESOLVE) {
            this.host.checkBattleStatus();
            if (this.state.turnQueue.length > 0) {
                this.executeTurn(this.state.turnQueue.shift());
            }
        }
    }

    executeTurn(turn) {
        const messageTypes = [TURN_TYPES.MESSAGE_VICTORY, TURN_TYPES.MESSAGE_DEFEAT, TURN_TYPES.MESSAGE_STATUS, TURN_TYPES.MESSAGE_DEATH];
        if (messageTypes.includes(turn.type)) {
            this.state.message = turn.message;
            this.state.messageItems = turn.items ? { text: turn.message, items: turn.items } : null;   // items to show pictures of beside the message
            return;
        }

        switch (turn.type) {
            case TURN_TYPES.WAIT:
                this.state.message = "";
                if (turn.duration) {
                    this.state.activeAnimation = { duration: turn.duration };
                }
                return;
            case TURN_TYPES.WEATHER_INTRO:
                return this._handleWeatherIntroTurn(turn);
            case TURN_TYPES.ANIMATION:
                return this._handleStandaloneAnimation(turn);
            case TURN_TYPES.APPLY_STATUS_EFFECT:
                return this._applyStatusEffectTurn(turn);
            case TURN_TYPES.EXECUTE_ACTION:
                if (turn.actor._skipAction || (turn.actor.isDead() && !turn.allowDeadActor)) {
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
                return this.host.requestPartySwap(true, turn.slotIndex);
            case TURN_TYPES.BATTLE_END:
                return this.host.endBattle();
            case TURN_TYPES.REINFORCEMENT:
                const pool = turn.team === 'party' ? this.state.activeParty : this.state.activeEnemies;
                const outgoing = pool[turn.slotIndex];
                if (outgoing && outgoing !== turn.replacement) this._slotSuccessors.set(outgoing, turn.replacement);
                pool[turn.slotIndex] = turn.replacement;
                this.state.message = turn.message;
                
                if (this.state.weather && this.state.weather.appliedStatusId && this.state.weather.id !== 'clear') {
                    const hasWeather = turn.replacement.statusEffects.some(s => s.id === this.state.weather.appliedStatusId);
                    if (!hasWeather) {
                        const weatherStatus = StatusEffectFactory.createEffect(this.state.weather.appliedStatusId, this.state.weather.appliedStatusCharges, turn.replacement);
                        if (weatherStatus) {
                            turn.replacement.applyStatusEffect(weatherStatus);
                        }
                    }
                }
                return this.processNextTurnInQueue();
            case TURN_TYPES.PLAY_ANIMATION:
                return this._handleAnimationTurn(turn);
            case TURN_TYPES.APPLY_ABILITY_EFFECTS:
                return this._applyAbilityEffects(turn);
            default:
                return this._unpackBaseTurn(turn);
        }
    }

    _handleStandaloneAnimation(turn) {
        if (turn.message) {
            this.state.message = turn.message;
        }
        
        const animId = turn.animationId;
        const targetActor = turn.actor;
        
        this.state.activeAnimation = BattleAnimationFactory.create(animId, targetActor, [targetActor]);
        
        if (turn.duration && this.state.activeAnimation) {
            this.state.activeAnimation.duration = turn.duration;
        }
        
        if (turn.soundId) {
            events.emit('PLAY_SFX', { id: turn.soundId, volume: turn.volume || 1.0, pitch: turn.pitch || 1.0 });
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
        let { actor, action, targets, isFirstTarget, ignoreCost, allowDeadTarget } = turn;
        
        const canTargetDead = allowDeadTarget || action?.allowDeadTarget;
        const canTargetBench = this._allowsBench(action);
        
        if (isFirstTarget && !ignoreCost) {
            action.payCost(actor, InventorySystem);
        }
        const queuedBefore = this.state.turnQueue.length;
        const actorWasDownAtStart = actor.isDead();

        for (let target of targets) {
            const actualTarget = this.getValidTarget(target, canTargetDead, canTargetBench);
            if (!actualTarget) continue;
            
            const wasTargetDead = actualTarget.isDead();
            const wasActorDead = actor.isDead();
            
            registerAbilityUse(this.state, action, actor, actualTarget);

            // ---> NEW: Unified Tag and Range Immunity Check <---
            // We pass 'actor' so the model knows if the attacker has 'reach' or 'flying'
            const immunityCheck = actualTarget.checkImmunity(action, actor);

            if (immunityCheck.isImmune) {
                if (immunityCheck.reason === 'range') {
                    events.emit('SPAWN_FCT', { target: actualTarget, text: 'Out of Reach!', type: 'miss' });
                    this.queueMessage(`${actor.name}'s attack cannot reach ${actualTarget.name}!`);
                } else if (immunityCheck.reason === 'tag') {
                    const formattedTag = immunityCheck.value.charAt(0).toUpperCase() + immunityCheck.value.slice(1);
                    events.emit('SPAWN_FCT', { target: actualTarget, text: 'Immune!', type: 'status' });
                    this.queueMessage(`${actualTarget.name} is immune to ${formattedTag}!`);
                }
                continue;
            }

            // --- Normal Ability Execution ---
            const statusSnapshots = (actualTarget.statusEffects || []).map(s => ({ id: s.id, stacks: s.stacks }));
            
            const result = AbilitySystem.execute(action.id, actor, actualTarget);
            
            if (actualTarget.statusEffects) {
                actualTarget.statusEffects.forEach(status => {
                    const snap = statusSnapshots.find(s => s.id === status.id);
                    if (!snap || status.stacks > snap.stacks) {
                        registerStatusApplication(this.state, status, actor, actualTarget);
                    }
                });
            }

            if (result.fled) {
                queueFlee(this.state, actor);
                break;
            }

            if (result.missed || result.evaded) {
                events.emit('SPAWN_FCT', { 
                    target: actualTarget, 
                    text: result.evaded ? 'Evade!' : 'Miss!', 
                    type: 'status' 
                });
            }
            
            // Death handling
            if (!wasTargetDead && actualTarget.isDead()) {
                registerDeath(this.state, actor, actualTarget);
                queueDeath(this.state, actualTarget);
            }
            if (!wasActorDead && actor.isDead()) {
                registerDeath(this.state, actualTarget, actor);
                queueDeath(this.state, actor);
            }

            if (result.message) this.queueMessage(result.message);
            
            if (!wasActorDead && actor.isDead()) {
                break;
            }
        }

        // Magic costs the caster a little of themselves (CorruptionSystem). It is told after the spell's own lines, and a caster pushed to the top falls.
        if (isFirstTarget && !ignoreCost) {
            const corruption = CorruptionSystem.onAbilityUsed(actor, action);
            if (corruption) {
                const added = this.state.turnQueue.length - queuedBefore;
                corruption.messages.forEach((message, i) => {
                    this.state.turnQueue.splice(added + i, 0, { type: TURN_TYPES.MESSAGE_STATUS, message });
                });
                if (corruption.shackled && !actorWasDownAtStart) {
                    registerDeath(this.state, actor, actor);
                    queueDeath(this.state, actor);
                }
            }
        }
        this.processNextTurnInQueue();
    }

    _handleActionExecution(turn) {
        let { actor, action, target: primaryTarget, ignoreCost, allowDeadActor, allowDeadTarget } = turn;
        
        if (actor.isDead() && !allowDeadActor) return this.processNextTurnInQueue();

        // Last line of defence: an overworld-only ability can never resolve inside a battle.
        if (action && typeof action.usableIn === 'function' && !action.usableIn('battle')) {
            this.state.message = `${action.name} can't be used in battle!`;
            return this.processNextTurnInQueue();
        }

        // Multi-select casts (Magic Missile, Flamethrower, Waterfall...) arrive as an ARRAY of the
        // player's picks. Any pick can already be dead by the time the cast resolves (a faster actor
        // killed it earlier in the round). Retarget those picks the same way _handleAnimationTurn
        // retargets dead targets mid-cast, so the cast keeps its full shot count instead of losing one.
        // A pick can also have switched out of the field since the action was queued (the swap resolves at
        // the swapper's speed, which may be before this action). Those picks go to whoever stepped in.
        const allowBench = this._allowsBench(action);
        if (Array.isArray(primaryTarget)) {
            primaryTarget = this._retargetPicks(primaryTarget, allowDeadTarget || action.allowDeadTarget, !!action.isSplash, allowBench);
            if (primaryTarget.length === 0) {
                this.state.message = `${actor.name} tried to use ${action.name}, but there were no targets left!`;
                return this.processNextTurnInQueue();
            }
        } else if (primaryTarget && primaryTarget !== 'ALL' && !allowBench && this._isBenched(primaryTarget)) {
            primaryTarget = this._activeStandIn(primaryTarget) || primaryTarget;
        }

        let resolvedTargets = TargetingResolver.resolve(action, actor, primaryTarget, this.state, allowDeadActor);

        // Splash abilities never hit the same target twice (e.g. a lone pick expanded by the resolver's hitCount).
        if (action.isSplash) resolvedTargets = [...new Set(resolvedTargets)];

        // Diagnostic: if this fires, the resolver itself is dropping or de-duplicating picks.
        if (Array.isArray(primaryTarget) && resolvedTargets.length < primaryTarget.length) {
            console.warn(`[TARGETING] ${action.name}: ${primaryTarget.length} picks but TargetingResolver returned ${resolvedTargets.length}`);
        }
        
        if (resolvedTargets.length === 0) {
            this.state.message = `${actor.name} tried to use ${action.name}, but there were no targets left!`;
            return this.processNextTurnInQueue();
        }

        if (!ignoreCost && !action.canPayCost(actor, InventorySystem)) {
            action = AbilityFactory.createAbilities(['rest'])[0];
            resolvedTargets = [actor];
        }

        let messageTemplate = action.battleMessage;
        if (action.id === 'rest') messageTemplate = "{user} recovers!";
        
        // Name whoever is actually being hit: the picked target if it survived resolution, otherwise the
        // first resolved target (covers arrays, 'ALL', and targets the resolver redirected to the right team).
        const leadTarget = (primaryTarget && !Array.isArray(primaryTarget) && resolvedTargets.includes(primaryTarget))
            ? primaryTarget
            : resolvedTargets[0];
        let targetName = leadTarget ? leadTarget.name : "the field";
        this.state.message = messageTemplate
            .replace(/{user}/g, actor.name)
            .replace(/{ability}/g, action.name)
            .replace(/{target}/g, targetName);

        // Splash multi-target (Flamethrower...) plays ONE shared animation like an AoE, hitting only the chosen targets.
        const isAoE = ['all_enemies', 'all_allies', 'full_ally_party'].includes(action.targeting?.scope) || action.targeting?.isAoE || action.isSplash;
        
        if (isAoE) {
            this._queueAoEAction(actor, action, resolvedTargets, ignoreCost);
        } else {
            this._queueMultiAction(actor, action, resolvedTargets, ignoreCost);
        }
        
        this.processNextTurnInQueue();
    }

    _queueAoEAction(actor, action, targets, ignoreCost) {
        for (let i = targets.length - 1; i >= 0; i--) {
            this.state.turnQueue.unshift(
                this._createApplyEffectTurn(actor, action, [targets[i]], i === 0, i === targets.length - 1, ignoreCost)
            );
        }
        this.state.turnQueue.unshift({ type: TURN_TYPES.PLAY_ANIMATION, actor, action, targets });
    }

    _queueMultiAction(actor, action, targets, ignoreCost) {
        for (let i = targets.length - 1; i >= 0; i--) {
            this.state.turnQueue.unshift(
                this._createApplyEffectTurn(actor, action, [targets[i]], i === 0, i === targets.length - 1, ignoreCost)
            );
            this.state.turnQueue.unshift({ type: TURN_TYPES.PLAY_ANIMATION, actor, action, target: targets[i] });
        }
    }

    _createApplyEffectTurn(actor, action, targets, isFirst, isLast, ignoreCost) {
        return { 
            type: TURN_TYPES.APPLY_ABILITY_EFFECTS, 
            actor, 
            action, 
            targets, 
            isFirstTarget: isFirst, 
            isLastTarget: isLast, 
            ignoreCost 
        };
    }

    _handleAnimationTurn(turn) {
        const targetList = turn.targets || [turn.target];
        const validTargets = [];
        const redirectedTurns = new Set();
        const allowDeadTarget = turn.allowDeadTarget || turn.action?.allowDeadTarget || false;
        const allowBench = this._allowsBench(turn.action);

        for (let target of targetList) {
            let actualTarget = this.getValidTarget(target, allowDeadTarget, allowBench);
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
        
        if (actor.isDead()) {
            registerDeath(this.state, context.attacker, actor);
            queueDeath(this.state, actor);
        }
        
        if (context.attacker?.isDead()) {
            registerDeath(this.state, actor, context.attacker);
            queueDeath(this.state, context.attacker);
        }

        if (status.isExpired()) actor.removeStatusEffect(status.id);
        
        if (result.messages?.length > 0) {
            const messageTurns = result.messages.map(msg => ({ 
                type: TURN_TYPES.MESSAGE_STATUS, 
                message: msg 
            }));
            this.state.turnQueue.unshift(...messageTurns);
        }
        
        this.processNextTurnInQueue();
    }

    /** Only whole-roster abilities (Healing Rain...) are meant to reach members who are not on the field. */
    _allowsBench(action) {
        return action?.targeting?.scope === 'full_ally_party';
    }

    /** Alive, but not currently on the field (switched out / waiting in the roster). */
    _isBenched(target) {
        if (!target || typeof target.isDead !== 'function' || target.isDead()) return false;
        if (target.team !== 'party' && target.team !== 'enemy') return false;
        return !getActivePool(this.state, target.team).includes(target);
    }

    /**
     * Who should take a hit meant for a combatant who is no longer on the field: whoever stepped into their
     * slot (following the chain if that one has also left), otherwise a random living combatant on the field.
     * `taken` lists targets a distinct (splash) cast already uses. Returns null if nobody is available.
     */
    _activeStandIn(benched, taken = new Set()) {
        const pool = getActivePool(this.state, benched.team);
        const usable = m => m && !m.isDead() && pool.includes(m) && !taken.has(m);

        const seen = new Set([benched]);
        let next = this._slotSuccessors.get(benched);
        while (next && !seen.has(next)) {
            if (usable(next)) return next;
            seen.add(next);
            next = this._slotSuccessors.get(next);
        }

        const candidates = pool.filter(usable);
        return candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
    }

    /**
     * Swaps every pick that can no longer be hit for a replacement: a dead pick becomes a random living
     * member of its own team (same rule as getValidTarget), a pick that switched out becomes whoever took
     * their place. Picks with no replacement are dropped. Order of the usable picks is preserved.
     * With distinct = true (splash abilities) a replacement is never someone already picked.
     */
    _retargetPicks(picks, allowDeadTarget = false, distinct = false, allowBench = false) {
        const list = picks.filter(Boolean);
        if (!distinct) {
            return list.map(pick => this.getValidTarget(pick, allowDeadTarget, allowBench)).filter(Boolean);
        }

        const isUsable = t => (allowDeadTarget || !t.isDead()) && (allowBench || !this._isBenched(t));
        const taken = new Set(list.filter(isUsable));
        const result = [];
        for (const pick of list) {
            if (isUsable(pick)) {
                if (!result.includes(pick)) result.push(pick);
                continue;
            }
            let replacement;
            if (this._isBenched(pick)) {
                replacement = this._activeStandIn(pick, taken);
            } else {
                const candidates = getActivePool(this.state, pick.team).filter(t => t && !t.isDead() && !taken.has(t));
                replacement = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
            }
            if (!replacement) continue;
            taken.add(replacement);
            result.push(replacement);
        }
        return result;
    }

    getValidTarget(target, allowDeadTarget = false, allowBench = false) {
        if (!allowBench && this._isBenched(target)) return this._activeStandIn(target);
        if (allowDeadTarget || !target.isDead()) return target;
        
        const fallbackPool = getActivePool(this.state, target.team);
        const livingTargets = fallbackPool.filter(t => t && !t.isDead());
        
        if (livingTargets.length === 0) return null;
        return livingTargets[Math.floor(Math.random() * livingTargets.length)];
    }

    queueMessage(message, type = TURN_TYPES.MESSAGE_STATUS) {
        this.state.turnQueue.unshift({ type, message });
    }

    _handleWeatherIntroTurn(turn) {
        const { weather, targets } = turn;
        if (weather.appliedStatusId) {
            targets.forEach(target => {
                if (target && !target.isDead()) {
                    const weatherStatus = StatusEffectFactory.createEffect(weather.appliedStatusId, weather.appliedStatusCharges, target);
                    if (weatherStatus) {
                        target.applyStatusEffect(weatherStatus);
                    }
                }
            });
        }
        
        if (weather.animationId) {
            this.state.activeAnimation = BattleAnimationFactory.create(weather.animationId, null, targets);
        } else {
            this.processNextTurnInQueue();
        }
    }
}
