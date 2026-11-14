// backend/test/dolos.test.js: `npm test`. Dolos, the director (shared/story/dolos.js): his cycle of respite, calm, stirring and gaze, what each
// does to the world, the blood moon, how he weighs the party, his temperament by difficulty, and that only the world's owner moves him.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { worldSync } from '../../shared/core/worldSync.js';
import { events } from '../../shared/core/eventBus.js';
import { Dolos, PHASE_EFFECTS, TEMPERAMENTS, THRESHOLDS } from '../../shared/story/dolos.js';
import { SCAR_TRAITS } from '../../shared/abilities/abilityTraits.js';
import { ItemFactory } from '../../shared/items/itemFactory.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const reset = (difficulty = 'normal') => {
    gameState.world.changes = {};
    gameState.world.time = 8 * 60;
    gameState.difficulty = difficulty;
    gameState.party.members = [];
    worldSync.ownsWorld = true;
    Dolos.state();   // he starts watching now
};
const hours = (h, blood = false) => { gameState.world.time += h * 60; return Dolos.tick(gameState, blood); };
const signs = [];
events.on('DOLOS_SIGN', (s) => signs.push(s));

test('the cycle: calm builds to stirring, then gaze; a gaze ends in a respite; a respite ends in calm', () => {
    reset();
    const t = TEMPERAMENTS.normal;
    assert.equal(Dolos.state().phase, 'calm');
    let h = 0, phase = null;
    while (h < 200 && phase !== 'stirring') { phase = hours(1); h++; }
    assert.equal(Dolos.state().phase, 'stirring');
    assert.ok(Math.abs(h - THRESHOLDS.stirring / t.tensionPerHour) <= 1, `${h} hours to stirring`);
    while (h < 400 && Dolos.state().phase !== 'gaze') { hours(1); h++; }
    assert.equal(Dolos.state().phase, 'gaze');
    hours(t.gazeHours);
    assert.equal(Dolos.state().phase, 'respite');
    assert.equal(Dolos.state().tension, 0);
    hours(t.respiteHours);
    assert.equal(Dolos.state().phase, 'calm');
});

test('what each phase does: his gaze is harder and pays more, his respite is gentler, calm changes nothing', () => {
    const { respite, calm, stirring, gaze } = PHASE_EFFECTS;
    assert.deepEqual(calm, { ambushRate: 1, enemyLevel: 0, extraEnemyChance: 0, lootBonusChance: 0, goodTrait: 1, badTrait: 1 });
    assert.ok(respite.ambushRate < 1 && respite.enemyLevel < 0 && respite.goodTrait > 1 && respite.badTrait < 1 && respite.lootBonusChance > 0);
    assert.ok(stirring.ambushRate > 1 && stirring.extraEnemyChance > 0 && stirring.badTrait > 1);
    assert.ok(gaze.ambushRate > stirring.ambushRate && gaze.enemyLevel > 0 && gaze.extraEnemyChance > stirring.extraEnemyChance && gaze.badTrait > stirring.badTrait);
});

test('a blood moon: he is felt (at least stirring), and tension builds twice as fast', () => {
    reset();
    assert.equal(Dolos.effects(gameState, true).phase, 'stirring');
    hours(4);
    const plain = Dolos.state().tension;
    reset();
    hours(4, true);
    assert.ok(Math.abs(Dolos.state().tension - 2 * plain) < 1e-9);
});

test('fights: a defeat ends his gaze at once; a gaze ends after its fights; easy wins feed him, hard ones tire him', () => {
    reset();
    Dolos._enter(gameState, 'gaze');
    Dolos.recordFight({ victory: false });
    assert.equal(Dolos.state().phase, 'respite');
    reset();
    Dolos._enter(gameState, 'gaze');
    for (let i = 0; i < TEMPERAMENTS.normal.gazeFights; i++) Dolos.recordFight({ victory: true, hpLeft: 0.9 });
    assert.equal(Dolos.state().phase, 'respite');
    reset();
    Dolos.recordFight({ victory: true, hpLeft: 0.95 });
    const easy = Dolos.state().tension;
    reset();
    Dolos.state().tension = 20;
    Dolos.recordFight({ victory: true, hpLeft: 0.2, fallen: 1 });
    assert.ok(easy > 0 && Dolos.state().tension < 20);
    Dolos.recordFight({ victory: true, fled: true });
    assert.equal(Dolos.state().fights.length, 1, 'a retreat is not a fight he weighs');
});

test('his temperament follows the difficulty: easy rests long and watches briefly, nightmare the reverse', () => {
    const { easy, normal, hard, nightmare } = TEMPERAMENTS;
    for (const [a, b] of [[easy, normal], [normal, hard], [hard, nightmare]]) {
        assert.ok(a.tensionPerHour < b.tensionPerHour && a.respiteHours > b.respiteHours && a.gazeHours < b.gazeHours);
    }
    reset('nightmare');
    let h = 0;
    while (h < 100 && Dolos.state().phase !== 'gaze') { hours(1); h++; }
    reset('easy');
    let e = 0;
    while (e < 200 && Dolos.state().phase !== 'gaze') { hours(1); e++; }
    assert.ok(h < e, `nightmare ${h}h, easy ${e}h`);
});

test('a party far ahead of the curve is watched sooner and harder, and given less', () => {
    reset();
    const sword = ItemFactory.createItem('shortsword'); sword.level = 5;   // level 5 at character level 5: far ahead (the curve has it at 2)
    const hero = quiet(() => EntityFactory.create('HUMANOID', { level: 5, levelEdge: false, equipment: { mainHand: sword } }));
    gameState.party.members = [hero];
    for (let i = 0; i < 6; i++) Dolos.recordFight({ victory: true, hpLeft: 0.95 });
    const edge = Dolos.edge();
    assert.ok(edge > 0.5, `edge ${edge}`);
    Dolos._enter(gameState, 'gaze');
    const e = Dolos.effects();
    assert.equal(e.enemyLevel, PHASE_EFFECTS.gaze.enemyLevel + 1, 'his gaze is harder on the strong');
    assert.ok(e.lootBonusChance < PHASE_EFFECTS.gaze.lootBonusChance && e.goodTrait < PHASE_EFFECTS.gaze.goodTrait);
});

test('trait chances, weighed: bad ones likelier in his gaze, good ones in his respite', () => {
    reset();
    Dolos._enter(gameState, 'gaze');
    assert.ok(Dolos.traitChance('frail', 0.1, SCAR_TRAITS) > 0.1 && Dolos.traitChance('quick', 0.1, SCAR_TRAITS) < 0.1);
    Dolos._enter(gameState, 'respite');
    assert.ok(Dolos.traitChance('frail', 0.1, SCAR_TRAITS) < 0.1 && Dolos.traitChance('quick', 0.1, SCAR_TRAITS) > 0.1);
    assert.equal(Dolos.traitChance('quick', 0.9, SCAR_TRAITS), 1 > 0.9 * 1.5 ? 0.9 * 1.5 : 1, 'never more than certain');
});

test('his signs: nameless while he is hidden, named once the story reveals him; each phase change sends one', () => {
    reset();
    signs.length = 0;
    Dolos._enter(gameState, 'gaze');
    assert.equal(signs.at(-1).phase, 'gaze');
    assert.ok(!/Dolos/.test(signs.at(-1).text), 'not named');
    gameState.world.changes['story:dolos_named'] = true;
    Dolos._enter(gameState, 'respite');
    assert.match(signs.at(-1).text, /Dolos/);
});

test('a grace period: he takes no notice of a party below level 5', async () => {
    const { GRACE_LEVEL } = await import('../../shared/story/dolos.js');
    reset();
    gameState.party.members = [quiet(() => EntityFactory.create('HUMANOID', { level: GRACE_LEVEL - 1, levelEdge: false }))];
    hours(200);
    Dolos.recordFight({ victory: true, hpLeft: 1 });
    assert.equal(Dolos.state().phase, 'calm');
    assert.equal(Dolos.state().tension, 0);
    gameState.party.members = [quiet(() => EntityFactory.create('HUMANOID', { level: GRACE_LEVEL, levelEdge: false }))];
    hours(30);
    assert.ok(Dolos.state().tension > 0, 'at level 5 he looks up');
});

test('only the world\'s owner moves him; the others play by the state they are sent', () => {
    reset();
    const sent = [];
    worldSync.onLocalChange = (k, v) => sent.push(k);
    try {
        Dolos.recordFight({ victory: true, hpLeft: 0.9 });
        assert.ok(sent.includes('dolos'), 'the owner shares his state');
        worldSync.ownsWorld = false;
        const before = JSON.stringify(Dolos.state());
        hours(500);
        Dolos.recordFight({ victory: false });
        assert.equal(JSON.stringify(Dolos.state()), before, 'a guest never moves him');
    } finally { worldSync.onLocalChange = null; worldSync.ownsWorld = true; }
});
