// shared/battle/battleState.js
//
// The battle's `state` object and the plain rules that act on it: who is active, the end-of-round recovery, writing the results back to the party,
// and the ledger of what happened (read by BattleRewardSystem for traits that are earned in a fight). No screen is needed for any of it.
import { gameState } from '../core/gameState.js';
import { CombatantModel } from './combatantModel.js';
import { PHASE } from './battleConstants.js';

/* A fresh battle: the party and the enemies as combatants, the first `maxActive` of each on the field, the rest in reserve. */
export function createBattleState(enemies, context = {}) {
    const maxActive = context.maxActive || 3;
    const party = gameState.party.members.map(member => new CombatantModel(member, 'party'));
    const preparedEnemies = enemies.map(enemy => new CombatantModel(enemy, 'enemy'));
    [...party, ...preparedEnemies].forEach(c => stripNonBattleAbilities(c)); // overworld-only abilities (a torch...) never show up in a fight

    return {
        active: true,
        isPausedForUI: false,
        phase: PHASE.INTRO,
        backgroundId: context.backgroundId,
        weather: context.weather || null,
        partyRoster: party,
        enemyRoster: preparedEnemies,
        activeParty: party.slice(0, maxActive),
        activeEnemies: preparedEnemies.slice(0, maxActive),
        activePartyIndex: 0,
        selectedAction: null,
        turnQueue: [],
        battleLedger: [], // Added to track events for trait rewards
        menuIndex: 0,
        targetIndex: 0,
        selectedTargets: [],
        message: `Battle started!`,
        fled: false,
        showAbilityDetails: true
    };
}

/* Takes the abilities that only work outside a fight (context 'overworld', see AbilityModel.contextOf) out of a combatant's list, in place. */
export function stripNonBattleAbilities(combatant) {
    const list = combatant && combatant.abilities;
    if (!Array.isArray(list)) return;
    for (let i = list.length - 1; i >= 0; i--) {
        if (list[i] && typeof list[i].usableIn === 'function' && !list[i].usableIn('battle')) list.splice(i, 1);
    }
}

export function getActivePool(state, team) {
    return team === 'party' ? state.activeParty : state.activeEnemies;
}

/* A round has been fought: everyone on the field recovers a little stamina, insight and health. */
export function applyRoundEndRecovery(state) {
    const activeCombatants = [...state.activeParty, ...state.activeEnemies].filter(c => c && !c.isDead());
    activeCombatants.forEach(c => {
        const s = c.stats || {}; // c.stats recalculates every time it is read, so read it once
        // Recovery can be fractional now (it is a small share of the pool, and % status modifiers can touch it), so round it here
        const stamina = Math.round(s.staminaRecovery ?? 0);
        const insight = Math.round(s.insightRecovery ?? 0);
        const hp = Math.round(s.hpRecovery ?? 0);
        if (stamina) c.modifyResource('stamina', stamina);
        if (insight) c.modifyResource('insight', insight);
        if (hp > 0) c.modifyResource('hp', hp);
    });
}

/* The fight is over: what the party members are left with (health, resources, the effects that only last a fight) goes back onto the real
   party members. Returns true if somebody is still standing. */
export function commitBattleResults(state) {
    state.partyRoster.forEach(combatant => {
        combatant.originalEntity.hp = combatant.hp;
        combatant.originalEntity.stamina = combatant.stamina;
        combatant.originalEntity.insight = combatant.insight;

        const effectsToRemove = combatant.originalEntity.statusEffects
            .filter(effect => !effect.persistAfterCombat)
            .map(effect => effect.id);

        if (state.weather && state.weather.appliedStatusId) {
            if (!effectsToRemove.includes(state.weather.appliedStatusId)) {
                effectsToRemove.push(state.weather.appliedStatusId);
            }
        }

        effectsToRemove.forEach(effectId => combatant.originalEntity.removeStatusEffect(effectId));
    });

    return state.partyRoster.some(p => !p.isDead());
}

// --- THE LEDGER: events kept for the end-of-battle trait checks (BattleRewardSystem.processVictory) ---
export function registerBattleEvent(state, event) {
    if (state?.battleLedger) {
        state.battleLedger.push(event);
    }
}

export function registerStatusApplication(state, status, actor, target) {
    registerBattleEvent(state, { type: 'STATUS_APPLIED', status, actor, target });
}

export function registerAbilityUse(state, action, actor, target) {
    registerBattleEvent(state, { type: 'ABILITY_USED', action, actor, target });
}

export function registerDeath(state, killer, killed) {
    registerBattleEvent(state, { type: 'DEATH', killer, killed });
}
