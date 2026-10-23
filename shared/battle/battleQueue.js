// shared/battle/battleQueue.js
//
// Builds turns for a battle's turn queue (`state.turnQueue`, played by the TurnManager). Every function takes the battle `state` first and only
// reads and writes it, so none of this needs a screen: the BattleController decides WHEN something happens, this file says WHAT gets queued.
import { events } from '../core/eventBus.js';
import { AbilityFactory } from '../abilities/abilityFactory.js';
import { BattleRewardSystem } from './battleRewardSystem.js';
import { TURN_TYPES } from './battleConstants.js';

const ENTER_BATTLE = (actor) => ({
    type: TURN_TYPES.ANIMATION,
    actor,
    animationId: 'enter_battle',
    soundId: actor.crySound || null,
    duration: 1.0
});

/* The opening of a fight: everyone steps in, the weather announces itself, and "on battle start" traits fire. Returns true if anything was queued
   (the fight then opens with a round of its own, see BattleController.start). */
export function queueOpeningSequence(state) {
    let queued = false;

    state.activeEnemies.forEach(enemy => {
        if (enemy && !enemy.isDead()) {
            enemy.hasEnteredBattle = false;
            state.turnQueue.push(ENTER_BATTLE(enemy));
            queued = true;
        }
    });

    state.activeParty.forEach(ally => {
        if (ally && !ally.isDead()) {
            ally.hasEnteredBattle = false;
            state.turnQueue.push(ENTER_BATTLE(ally));
            queued = true;
        }
    });

    if (state.weather && state.weather.id !== 'clear') {
        const weatherMsg = state.weather.battleMessage || `A fierce ${state.weather.name} begins!`;
        state.turnQueue.push({ type: TURN_TYPES.MESSAGE_STATUS, message: weatherMsg });
        const activeCombatants = [...state.activeParty, ...state.activeEnemies].filter(c => c && !c.isDead());
        state.turnQueue.push({
            type: TURN_TYPES.WEATHER_INTRO,
            weather: state.weather,
            targets: activeCombatants
        });
        queued = true;
    }

    if (queuePreBattleTraits(state)) queued = true;
    return queued;
}

export function queuePreBattleTraits(state) {
    let traitsQueued = false;
    const activeCombatants = [...state.activeParty, ...state.activeEnemies].filter(c => c && !c.isDead());

    activeCombatants.sort((a, b) => (b.stats?.speed ?? 10) - (a.stats?.speed ?? 10));

    activeCombatants.forEach(combatant => {
        const rawTraits = combatant.traits;
        if (rawTraits && Array.isArray(rawTraits) && rawTraits.length > 0) {
            rawTraits.forEach(trait => {
                const startTrigger = trait?.triggers?.onBattleStart;
                if (startTrigger && startTrigger.ability) {
                    const abilityId = startTrigger.ability;
                    const [ability] = AbilityFactory.createAbilities([abilityId]);

                    if (ability) {
                        if (startTrigger.animationId) {
                            state.turnQueue.push({
                                type: TURN_TYPES.PLAY_ANIMATION,
                                animationId: startTrigger.animationId,
                                target: combatant
                            });
                        }

                        const msgTemplate = startTrigger.battleMessage || "{actor}'s {trait} activates!";
                        const finalMessage = msgTemplate.replace(/{actor}/g, combatant.name).replace(/{trait}/g, trait.name);

                        state.turnQueue.push({
                            type: TURN_TYPES.MESSAGE_STATUS,
                            message: finalMessage
                        });

                        state.turnQueue.push({
                            type: TURN_TYPES.EXECUTE_ACTION,
                            ignoreCost: true,
                            actor: combatant,
                            action: ability,
                            target: combatant
                        });
                        traitsQueued = true;
                    }
                }
            });
        }
    });
    return traitsQueued;
}

/* "On death" traits go to the FRONT of the queue (they happen right now, before anything else), with the message in front of the ability. */
export function queueDeathTraits(state, deadCombatant) {
    const rawTraits = deadCombatant.traits;
    if (!rawTraits || !Array.isArray(rawTraits) || rawTraits.length === 0) return;

    rawTraits.forEach(trait => {
        const deathTrigger = trait?.triggers?.onDeath;
        if (deathTrigger && deathTrigger.ability) {
            const abilityId = deathTrigger.ability;
            const [ability] = AbilityFactory.createAbilities([abilityId]);

            if (ability) {
                state.turnQueue.unshift({
                    type: TURN_TYPES.EXECUTE_ACTION,
                    ignoreCost: true,
                    allowDeadActor: true,
                    allowDeadTarget: true,
                    actor: deadCombatant,
                    action: ability,
                    target: deadCombatant
                });

                const msgTemplate = deathTrigger.battleMessage || "{actor}'s {trait} activates upon death!";
                const finalMessage = msgTemplate.replace(/{actor}/g, deadCombatant.name).replace(/{trait}/g, trait.name);
                state.turnQueue.unshift({ type: TURN_TYPES.MESSAGE_STATUS, message: finalMessage });

                const animId = deathTrigger.animationId || "trait_activate";

                state.turnQueue.unshift({
                    type: TURN_TYPES.PLAY_ANIMATION,
                    animationId: animId,
                    target: deadCombatant,
                    allowDeadTarget: true
                });
            }
        }
    });
}

/* Someone just died: drop their pending turns, bring in a reserve if there is one (the party is asked, the enemies simply send the next one),
   and queue the faint animation, the death traits and the "has been slain" line, all at the front of the queue. */
export function queueDeath(state, combatant) {
    if (combatant._deathHandled) return;
    combatant._deathHandled = true;

    if (combatant.team === 'enemy') {
        // Shout to the event bus! Let the QuestSystem (or achievements system) handle the tracking.
        events.emit('ENEMY_KILLED', {
            enemyId: combatant.templateId || combatant.definitionKey || combatant.name
        });
    }

    state.turnQueue = state.turnQueue.filter(turn =>
        turn.actor !== combatant &&
        turn.swapInitiator !== combatant
    );

    const isParty = combatant.team === 'party';
    const activeArray = isParty ? state.activeParty : state.activeEnemies;
    const rosterArray = isParty ? state.partyRoster : state.enemyRoster;
    const slotIndex = activeArray.indexOf(combatant);

    if (slotIndex !== -1) {
        const livingReserves = rosterArray.filter(member =>
            !member.isDead() &&
            !activeArray.includes(member) &&
            !state.turnQueue.some(turn => turn.replacement === member)
        );

        if (livingReserves.length > 0) {
            if (isParty) {
                state.turnQueue.unshift({
                    type: TURN_TYPES.PROMPT_REINFORCEMENT,
                    slotIndex
                });
            } else {
                const replacement = livingReserves[0];
                state.turnQueue.unshift({
                    type: TURN_TYPES.ANIMATION,
                    actor: replacement,
                    animationId: 'enter_battle',
                    soundId: replacement.crySound,
                    duration: 1.0
                });
                state.turnQueue.unshift({
                    type: TURN_TYPES.MESSAGE_STATUS,
                    message: `${replacement.name} joins the battle!`
                });
                state.turnQueue.unshift({
                    type: TURN_TYPES.REINFORCEMENT,
                    team: 'enemy',
                    slotIndex,
                    replacement
                });
            }
        }
    }

    state.turnQueue.unshift({
        type: TURN_TYPES.ANIMATION,
        actor: combatant,
        animationId: 'faint',
        soundId: combatant.deathSound,
        duration: 1.0
    });

    queueDeathTraits(state, combatant);

    state.turnQueue.unshift({
        type: TURN_TYPES.MESSAGE_STATUS,
        message: `${combatant.name} has been slain!`
    });
}

/* The party takes a new member into a slot. `isForced` = the slot's owner just died (the newcomer steps in right away); otherwise it is a
   voluntary swap that takes the swapper's turn and plays out at the swapper's speed. */
export function queueSwap(state, replacement, isForced, slotIndex) {
    if (isForced) {
        state.turnQueue.unshift({
            type: TURN_TYPES.ANIMATION,
            actor: replacement,
            animationId: 'enter_battle',
            soundId: replacement.crySound,
            duration: 1.0
        });
        state.turnQueue.unshift({ type: TURN_TYPES.MESSAGE_STATUS, message: `${replacement.name} steps into the fray!` });
        state.turnQueue.unshift({ type: TURN_TYPES.REINFORCEMENT, team: 'party', slotIndex, replacement });
    } else {
        const activeChar = state.activeParty[slotIndex];
        const swapSpeed = (activeChar.stats?.speed ?? 10) + (slotIndex * 0.001);

        state.turnQueue.push({ type: TURN_TYPES.MESSAGE_STATUS, message: `${activeChar.name} falls back...`, speedOverride: swapSpeed, swapSequenceOrder: 1, swapInitiator: activeChar });
        state.turnQueue.push({ type: TURN_TYPES.ANIMATION, actor: activeChar, animationId: 'retreat', duration: 1.0, speedOverride: swapSpeed, swapSequenceOrder: 2, swapInitiator: activeChar });
        state.turnQueue.push({ type: TURN_TYPES.REINFORCEMENT, team: 'party', slotIndex, replacement, speedOverride: swapSpeed, swapSequenceOrder: 3, swapInitiator: activeChar });
        state.turnQueue.push({ type: TURN_TYPES.MESSAGE_STATUS, message: `${replacement.name} steps into the fray!`, speedOverride: swapSpeed, swapSequenceOrder: 4, swapInitiator: activeChar });
        state.turnQueue.push({ type: TURN_TYPES.ANIMATION, actor: replacement, animationId: 'enter_battle', soundId: replacement.crySound, duration: 1.0, speedOverride: swapSpeed, swapSequenceOrder: 5, swapInitiator: activeChar });
    }
}

/* The party got away: the queue is replaced by the escape line and the end of the battle. */
export function queueFlee(state, actor) {
    state.fled = true;
    state.turnQueue = [
        { type: TURN_TYPES.MESSAGE_STATUS, message: `${actor.name}'s party escapes!` },
        { type: TURN_TYPES.BATTLE_END }
    ];
}

export function queueVictory(state) {
    state.turnQueue = [];

    // Stall the queue for 3.0 seconds to let the visual banner play out seamlessly!
    state.turnQueue.push({ type: TURN_TYPES.WAIT, duration: 3.0 });

    // Pass battleLedger so BattleRewardSystem can process trait conditions
    const rewardMessages = BattleRewardSystem.processVictory(state.partyRoster, state.enemyRoster, state.battleLedger);

    rewardMessages.forEach(msg => {
        const items = (msg === rewardMessages.lootMessage) ? rewardMessages.lootItems : null;
        state.turnQueue.push({ type: TURN_TYPES.MESSAGE_VICTORY, message: msg, items });
    });
    state.turnQueue.push({ type: TURN_TYPES.BATTLE_END });
}

export function queueDefeat(state) {
    state.turnQueue = [
        // Stalling here as well so the "PARTY SLAIN" banner gets its spotlight
        { type: TURN_TYPES.WAIT, duration: 3.0 },
        { type: TURN_TYPES.MESSAGE_DEFEAT, message: `The party has fallen in battle...` },
        { type: TURN_TYPES.BATTLE_END }
    ];
}

/* Fastest first; at equal speed a swap's steps keep their order. */
export function sortTurnQueue(state) {
    state.turnQueue.sort((a, b) => {
        const speedA = a.speedOverride ?? ((a.actor?.stats?.speed ?? 10) * (a.action?.speedModifier ?? 1));
        const speedB = b.speedOverride ?? ((b.actor?.stats?.speed ?? 10) * (b.action?.speedModifier ?? 1));

        if (speedA !== speedB) {
            return speedB - speedA;
        }
        const orderA = a.swapSequenceOrder ?? 99;
        const orderB = b.swapSequenceOrder ?? 99;
        return orderA - orderB;
    });
}
