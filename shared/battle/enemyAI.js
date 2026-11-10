// shared/battle/enemyAI.js
//
// What the enemies do each round: every living enemy on the field picks an ability it can pay for and a target for it, and the choice is pushed
// onto `state.turnQueue` like a player's would be. (Random on purpose; it is the same dice the rest of a battle uses.)
import { AbilityFactory } from '../abilities/abilityFactory.js';
import { InventorySystem } from '../items/inventorySystem.js';
import { ALLY_SCOPES, needsDistinctTargets } from './targetingResolver.js';
import { rng } from '../core/random.js';

/* A support move that would change nothing is not worth a turn: a status-only move whose statuses the caster already has (Bless when blessed), or a
   cleanse-only move when the caster has none of what it removes (Cleanse with nothing on them). Attacks are always worth it. */
export function worthUsing(ability, caster) {
    const effects = ability.effects || [], statuses = ability.statusEffects || [];
    const has = (id) => (caster.statusEffects || []).some(s => s && s.id === id);
    const selfScope = ['self', 'ally', 'full_ally_party'].includes(ability.targeting && ability.targeting.scope);
    if (!selfScope) return true;
    if (effects.length === 0 && statuses.length > 0) return !statuses.every(s => has(s.id));
    if (effects.length > 0 && effects.every(e => e.type === 'dispel')) return effects.some(e => (e.tags || []).some(has));
    return true;
}

export function queueEnemyActions(state) {
    queueFoeActions(state);
    queueAllyActions(state);
}

/* The enemies' picks. */
function queueFoeActions(state) {
    const livingParty = state.activeParty.filter(p => p && !p.isDead());
    if (livingParty.length === 0) return;

    state.activeEnemies.forEach(enemy => {
        if (!enemy || enemy.isDead()) return;

        const validAbilities = enemy.abilities.filter(a =>
            a.canPayCost(enemy, InventorySystem) && !['rest', 'punch'].includes(a.id) && (typeof a.usableIn !== 'function' || a.usableIn('battle')) && worthUsing(a, enemy)
        );

        const randomTarget = livingParty[Math.floor(rng() * livingParty.length)];

        if (validAbilities.length > 0) {
            const action = validAbilities[Math.floor(rng() * validAbilities.length)];
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
/* The allies' picks (fighters on the party's side whom nobody controls, battleState `context.allies`): the same choices an enemy makes, aimed the
   other way. Run right after the enemies' on every screen of a shared fight, with the same dice, so every screen has the same picks. */
export function queueAllyActions(state) {
    const foes = state.activeEnemies.filter(e => e && !e.isDead());
    if (foes.length === 0) return;
    const friends = state.activeParty.filter(p => p && !p.isDead());
    for (const ally of state.activeParty) {
        if (!ally || !ally.isAlly || ally.isDead()) continue;
        const usable = ally.abilities.filter(a =>
            a.canPayCost(ally, InventorySystem) && !['rest', 'punch'].includes(a.id) && (typeof a.usableIn !== 'function' || a.usableIn('battle')) && worthUsing(a, ally)
        );
        if (usable.length > 0) {
            const action = usable[Math.floor(rng() * usable.length)];
            state.turnQueue.push({ actor: ally, action, target: pickTarget(action, ally, foes, friends) });
            continue;
        }
        state.turnQueue.push({ actor: ally, action: AbilityFactory.createAbilities(['rest'])[0], target: ally });
    }
}

/* Who a fighter run by the dice aims at: `foes` are the other side, `friends` its own (scopes are written from the caster's side). */
function pickTarget(action, caster, foes, friends) {
    const scope = action.targeting?.scope || 'enemy';
    const pick = list => list[Math.floor(rng() * list.length)];
    if (scope === 'self') return caster;
    const pool = scope === 'any' ? [...foes, ...friends] : ALLY_SCOPES.includes(scope) ? friends : foes;
    if (needsDistinctTargets(action)) {
        const wanted = Math.min(action.targeting?.count || 1, pool.length);
        const shuffled = [...pool];
        for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
        return shuffled.slice(0, Math.max(1, wanted));
    }
    if (ALLY_SCOPES.includes(scope)) {
        const others = pool.filter(c => c !== caster);
        return pick(others.length > 0 ? others : pool);
    }
    return pick(pool);
}

export function pickEnemyTarget(state, enemy, action, livingParty) {
    const scope = action.targeting?.scope || 'enemy';
    const pick = list => list[Math.floor(rng() * list.length)];
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
        const shuffled = [...pool];   // Fisher-Yates: the same shuffle in every browser for the same dice (a random sort comparator is not)
        for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
        return shuffled.slice(0, Math.max(1, wanted));
    }

    // Prefer a teammate over the caster (Howl, Rally...), fall back to the caster if alone.
    if (ALLY_SCOPES.includes(scope)) {
        const others = pool.filter(e => e !== enemy);
        return pick(others.length > 0 ? others : pool);
    }
    return pick(pool);
}
