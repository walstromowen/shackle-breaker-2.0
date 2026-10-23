// backend/test/battle.test.js: `npm test`. A battle without a screen: the rules in shared/battle (turn queue builders, enemy AI, the ledger) and the
// BattleController driven by key presses, so the pieces stay working when they are moved or split.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { events } from '../../shared/core/eventBus.js';
import { gameState } from '../../shared/core/gameState.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { CombatantModel } from '../../shared/battle/combatantModel.js';
import { TurnManager } from '../../shared/battle/turnManager.js';
import { PHASE, TURN_TYPES } from '../../shared/battle/battleConstants.js';
import { createBattleState, getActivePool, registerDeath, registerAbilityUse } from '../../shared/battle/battleState.js';
import { queueOpeningSequence, queueDeath, queueSwap, queueFlee, queueDefeat, sortTurnQueue } from '../../shared/battle/battleQueue.js';
import { queueEnemyActions, pickEnemyTarget } from '../../shared/battle/enemyAI.js';
import { ALLY_SCOPES, needsDistinctTargets } from '../../shared/battle/targetingResolver.js';
import { AbilityFactory } from '../../shared/abilities/abilityFactory.js';
import { BattleController } from '../../frontend/src/screens/battle/battleController.js';

const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const withSeed = (seed, fn) => { const real = Math.random; const log = console.log, warn = console.warn; Math.random = mulberry(seed); console.log = console.warn = () => {}; try { return fn(); } finally { Math.random = real; console.log = log; console.warn = warn; } };
const party = (...specs) => { gameState.party.members = specs.map(([id, lvl, abilities]) => EntityFactory.create(id, abilities ? { level: lvl, abilities } : lvl)); };
const foes = (...specs) => specs.map(([id, lvl]) => EntityFactory.create(id, lvl));
const newBattle = (enemySpecs, context = { maxActive: 3 }) => { const bc = new BattleController({}, { TILE_SIZE: 64 }, {}); bc.start(foes(...enemySpecs), context); return bc; };
const key = (bc, code) => bc.handleKeyDown(code, { code });

/* plays a whole fight: pick ability `abilityAt(turn)` for everyone, aim at whoever the cursor is on, tick the clock until the battle is over */
function fight(bc, abilityAt = () => 1) {
    const ended = [];
    const off = (e) => ended.push(e);
    events.on('BATTLE_ENDED', off);
    let guard = 0, turn = 0, last = -1;
    while (bc.state.active && guard++ < 3000) {
        if (bc.state.phase === PHASE.SELECT_ACTION) {
            if (bc.state.activePartyIndex <= last) turn++;
            last = bc.state.activePartyIndex;
            const n = bc.state.activeParty[last].abilities.length;
            for (let i = 0; i < abilityAt(turn) % n; i++) key(bc, 'KeyD');
            key(bc, 'Enter');
        } else if (bc.state.phase === PHASE.SELECT_TARGET) {
            key(bc, 'Enter');
        } else bc.update(0.4);
    }
    events.off('BATTLE_ENDED', off);
    return { ended, guard };
}

test('the TurnManager runs on a plain host object: it needs no controller and no screen', () => {
    const host = { state: { turnQueue: [], phase: PHASE.RESOLVE }, timer: 5, checkBattleStatus() { this.checked = true; } };
    const tm = new TurnManager(host);
    tm.processNextTurnInQueue();
    assert.equal(host.timer, 0);
    assert.equal(host.checked, true, 'an empty queue asks the host what comes next');
});

test('a fight played through the controller ends once, writes health back to the party and records every kill', () => {
    for (const seed of [1, 2, 3]) {
        withSeed(seed, () => {
            party(['MAD_MAN', 12], ['DOG', 12], ['MAD_MAN', 11]);
            const members = gameState.party.members;
            const kills = [];
            const onKill = (d) => kills.push(d);
            events.on('ENEMY_KILLED', onKill);
            const bc = newBattle([['SKELETAL_WARRIOR', 1], ['FLOATING_SKULL', 1]]);
            const { ended, guard } = fight(bc);
            events.off('ENEMY_KILLED', onKill);
            assert.ok(guard < 3000, 'the fight finishes');
            assert.equal(ended.length, 1, 'BATTLE_ENDED is sent exactly once');
            assert.equal(ended[0].victory, true, 'twelve levels up on two level-one enemies');
            assert.equal(bc.state.active, false);
            assert.equal(kills.length, bc.state.enemyRoster.filter(c => c.isDead()).length, 'every dead enemy was announced once');
            bc.state.partyRoster.forEach((c, i) => assert.equal(members[i].hp, c.hp, 'what is left of the fight is on the real party member'));
            assert.ok(bc.state.battleLedger.some(e => e.type === 'ABILITY_USED'));
        });
    }
});

test('a party that cannot win loses: the defeat banner, then the end of the battle', () => {
    withSeed(4, () => {
        party(['MAD_MAN', 1]);
        const bc = newBattle([['WOLF', 9], ['WOLF', 9], ['SKELETAL_WARRIOR', 9]]);
        const { ended } = fight(bc);
        assert.equal(ended.length, 1);
        assert.equal(ended[0].victory, false);
        assert.equal(bc.state.phase, PHASE.DEFEAT);
    });
});

test('the enemy AI queues one turn for every living enemy, each with something that makes sense to aim at', () => {
    withSeed(2, () => {
        party(['MAD_MAN', 5], ['DOG', 5]);
        const bc = newBattle([['WOLF', 3], ['SKELETAL_WARRIOR', 3], ['FLOATING_SKULL', 3]]);
        const state = bc.state;
        state.turnQueue = [];
        state.activeEnemies[1].modifyResource('hp', -9999);                     // one is already dead
        queueEnemyActions(state);
        assert.equal(state.turnQueue.length, 2);
        for (const turn of state.turnQueue) {
            assert.ok(state.activeEnemies.includes(turn.actor) && !turn.actor.isDead());
            assert.ok(turn.action && turn.target);
        }
    });
});

test('enemy target scopes are read from the enemy\'s side: allies are other enemies, self is itself, splash hits distinct targets', () => {
    withSeed(3, () => {
        party(['MAD_MAN', 5], ['DOG', 5], ['MAD_MAN', 5]);
        const bc = newBattle([['WOLF', 3], ['WOLF', 3], ['WOLF', 3]]);
        const s = bc.state;
        const enemy = s.activeEnemies[0];
        const livingParty = s.activeParty;
        const howl = AbilityFactory.createAbilities(['howl'])[0];
        assert.ok(ALLY_SCOPES.includes(howl.targeting.scope));
        for (let i = 0; i < 20; i++) {
            const t = pickEnemyTarget(s, enemy, howl, livingParty);
            assert.ok(s.activeEnemies.includes(t) && t !== enemy, 'a buff goes to a teammate');
        }
        const rest = AbilityFactory.createAbilities(['rest'])[0];
        assert.equal(pickEnemyTarget(s, enemy, rest, livingParty), enemy);
        const flame = AbilityFactory.createAbilities(['flamethrower'])[0];
        assert.ok(needsDistinctTargets(flame));
        const picks = pickEnemyTarget(s, enemy, flame, livingParty);
        assert.equal(new Set(picks).size, picks.length, 'no target twice');
        assert.ok(picks.every(p => livingParty.includes(p)));
    });
});

test('choosing a target: single pick, "all" confirm, several distinct picks, and backing out one pick at a time', () => {
    withSeed(5, () => {
        party(['MAD_MAN', 8, ['flamethrower', 'inferno', 'howl']], ['DOG', 8]);
        const bc = newBattle([['SKELETAL_WARRIOR', 3], ['SKELETAL_WARRIOR', 3], ['WOLF', 3]]);
        bc.state.phase = PHASE.SELECT_ACTION;
        const abilities = bc.state.activeParty[0].abilities;
        const use = (id) => { bc.state.menuIndex = abilities.findIndex(a => a.id === id); key(bc, 'Enter'); };
        const queued = () => bc.state.turnQueue.filter(t => t.action && t.actor === bc.state.activeParty[0]);

        // inferno hits every enemy: the cursor is on "ALL", no card is singled out, one confirm commits
        use('inferno');
        assert.equal(bc.state.phase, PHASE.SELECT_TARGET);
        assert.equal(bc.state.targetIndex, 'ALL');
        assert.equal(bc.getKeyboardFocusId(), null);
        key(bc, 'Enter');
        assert.equal(queued().length, 1);
        assert.equal(queued()[0].target, 'ALL');
        assert.equal(bc.state.phase, PHASE.SELECT_ACTION, 'on to the next party member');

        // flamethrower picks distinct targets one by one; Escape takes the last pick back, then leaves the cursor
        bc.state.activePartyIndex = 0; bc.state.turnQueue = []; bc.state.phase = PHASE.SELECT_ACTION;
        use('flamethrower');
        const need = bc.targeting.requiredPickCount(bc.state.selectedAction);
        assert.ok(need >= 2, 'a splash ability asks for more than one target');
        const first = bc.state.targetIndex;
        key(bc, 'Enter');
        assert.equal(bc.state.selectedTargets.length, 1);
        assert.notEqual(bc.state.targetIndex, first, 'the cursor moves off the target just picked');
        key(bc, 'Escape');
        assert.equal(bc.state.selectedTargets.length, 0, 'back one pick');
        assert.equal(bc.state.phase, PHASE.SELECT_TARGET);
        key(bc, 'Escape');
        assert.equal(bc.state.phase, PHASE.SELECT_ACTION, 'back to the ability list');
        assert.equal(bc.state.selectedAction, null);
    });
});

test('when somebody dies: their pending turns go, a reserve steps in (the party is asked, the enemies just send the next), and the faint plays first', () => {
    withSeed(6, () => {
        party(['MAD_MAN', 5], ['DOG', 5], ['MAD_MAN', 5], ['DOG', 5]);
        const bc = newBattle([['WOLF', 2], ['WOLF', 2], ['WOLF', 2], ['WOLF', 2]], { maxActive: 3 });
        const s = bc.state;
        s.turnQueue = [];
        const foe = s.activeEnemies[0];
        s.turnQueue.push({ actor: foe, action: foe.abilities[0], target: s.activeParty[0] });
        foe.modifyResource('hp', -9999);
        const kills = [];
        const onKill = (d) => kills.push(d);
        events.on('ENEMY_KILLED', onKill);
        queueDeath(s, foe);
        queueDeath(s, foe);                                  // dying twice must not queue twice
        events.off('ENEMY_KILLED', onKill);
        assert.equal(kills.length, 1);
        assert.ok(!s.turnQueue.some(t => t.actor === foe && t.action), 'its own attack is gone');
        const types = s.turnQueue.map(t => t.type);
        assert.equal(types[0], TURN_TYPES.MESSAGE_STATUS, 'the slain line comes first');
        assert.ok(types.includes(TURN_TYPES.REINFORCEMENT), 'the fourth wolf takes the slot');
        const hero = s.activeParty[1];
        hero.modifyResource('hp', -9999);
        queueDeath(s, hero);
        assert.ok(s.turnQueue.some(t => t.type === TURN_TYPES.PROMPT_REINFORCEMENT), 'the player picks the replacement');
    });
});

test('a voluntary swap is five steps at the swapper\'s speed, in order; a forced one steps in at once', () => {
    withSeed(7, () => {
        party(['MAD_MAN', 5], ['DOG', 5], ['MAD_MAN', 5], ['DOG', 5]);
        const bc = newBattle([['WOLF', 2]]);
        const s = bc.state;
        s.turnQueue = [];
        const reserve = s.partyRoster[3];
        queueSwap(s, reserve, false, 0);
        sortTurnQueue(s);
        assert.deepEqual(s.turnQueue.map(t => t.swapSequenceOrder), [1, 2, 3, 4, 5]);
        assert.equal(new Set(s.turnQueue.map(t => t.speedOverride)).size, 1);
        s.turnQueue = [];
        queueSwap(s, reserve, true, 0);
        assert.equal(s.turnQueue[0].type, TURN_TYPES.REINFORCEMENT);
        assert.equal(s.turnQueue.length, 3);
    });
});

test('fleeing replaces the queue with the escape line and the end of the battle; a defeat does the same with its banner', () => {
    withSeed(8, () => {
        party(['MAD_MAN', 5]);
        const bc = newBattle([['WOLF', 2]]);
        const s = bc.state;
        queueFlee(s, s.activeParty[0]);
        assert.equal(s.fled, true);
        assert.deepEqual(s.turnQueue.map(t => t.type), [TURN_TYPES.MESSAGE_STATUS, TURN_TYPES.BATTLE_END]);
        queueDefeat(s);
        assert.equal(s.turnQueue.at(-1).type, TURN_TYPES.BATTLE_END);
        assert.ok(s.turnQueue.some(t => t.type === TURN_TYPES.MESSAGE_DEFEAT));
    });
});

test('the opening: everyone steps in, and the ledger and the active pools work on a bare state', () => {
    withSeed(9, () => {
        party(['MAD_MAN', 5], ['DOG', 5]);
        const state = createBattleState(foes(['WOLF', 2], ['WOLF', 2], ['WOLF', 2], ['WOLF', 2]), { maxActive: 2 });
        assert.equal(state.activeEnemies.length, 2);
        assert.equal(state.enemyRoster.length, 4);
        assert.equal(getActivePool(state, 'party'), state.activeParty);
        assert.equal(getActivePool(state, 'enemy'), state.activeEnemies);
        assert.equal(queueOpeningSequence(state), true);
        const entrances = state.turnQueue.filter(t => t.animationId === 'enter_battle');
        assert.equal(entrances.length, 4);
        registerAbilityUse(state, { id: 'x' }, state.activeParty[0], state.activeEnemies[0]);
        registerDeath(state, state.activeParty[0], state.activeEnemies[0]);
        assert.deepEqual(state.battleLedger.map(e => e.type), ['ABILITY_USED', 'DEATH']);
    });
});
