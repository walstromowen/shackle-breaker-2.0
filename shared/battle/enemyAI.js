// shared/battle/enemyAI.js
//
// What the enemies do each round: every living enemy on the field picks an ability it can pay for and a target for it, and the choice is pushed
// onto `state.turnQueue` like a player's would be. (Random on purpose; it is the same dice the rest of a battle uses.)
import { AbilityFactory } from '../abilities/abilityFactory.js';
import { InventorySystem } from '../items/inventorySystem.js';
import { ALLY_SCOPES, needsDistinctTargets } from './targetingResolver.js';

export function queueEnemyActions(state) {
    const livingParty = state.activeParty.filter(p => p && !p.isDead());
    if (livingParty.length === 0) return;

    state.activeEnemies.forEach(enemy => {
        if (!enemy || enemy.isDead()) return;

        const validAbilities = enemy.abilities.filter(a =>
            a.canPayCost(enemy, InventorySystem) && !['rest', 'punch'].includes(a.id) && (typeof a.usableIn !== 'function' || a.usableIn('battle'))
        );

        const randomTarget = livingParty[Math.floor(Math.random() * livingParty.length)];

        if (validAbilities.length > 0) {
            const action = validAbilities[Math.floor(Math.random() * validAbilities.length)];
            return state.turnQueue.push({ actor: enemy, action, target: pickEnemyTarget(state, enemy, action, livingParty) });
        }

        const punch = enemy.abilities.find(a => a.id === 'punch' && a.canPayCost(enemy, InventorySystem));
        if (punch) {
            return state.turnQueue.push({ actor: enemy, action: punch, target: randomTarget });
        }

        const restAction = AbilityFactory.createAbilities(['rest'])[0];
        state.turnQueue.push({ actor: enemy, action: restAction, target: enemy });
    });
}

/**
 * Chooses who an enemy aims an ability at, based on the ability's targeting scope as seen from the
 * ENEMY's side. (Scopes are written from the caster's point of view: 'ally' means the caster's own
 * team, so for an enemy that is another enemy, not a party member.)
 */
export function pickEnemyTarget(state, enemy, action, livingParty) {
    const scope = action.targeting?.scope || 'enemy';
    const pick = list => list[Math.floor(Math.random() * list.length)];
    const livingEnemies = state.activeEnemies.filter(e => e && !e.isDead());

    let pool;
    if (scope === 'self') return enemy;
    else if (scope === 'any') pool = [...livingParty, ...livingEnemies];
    // Same test the player-side targeting uses, mirrored: ally-type scopes stay on the caster's team.
    else if (ALLY_SCOPES.includes(scope)) pool = livingEnemies;
    else pool = livingParty;

    // Splash / distinct multi-select (Flamethrower...): aim at N different targets, never the same one twice.
    if (needsDistinctTargets(action)) {
        const wanted = Math.min(action.targeting?.count || 1, pool.length);
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.max(1, wanted));
    }

    // Prefer a teammate over the caster (Howl, Rally...), fall back to the caster if alone.
    if (ALLY_SCOPES.includes(scope)) {
        const others = pool.filter(e => e !== enemy);
        return pick(others.length > 0 ? others : pool);
    }
    return pick(pool);
}
