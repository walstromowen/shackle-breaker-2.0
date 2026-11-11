// backend/test/statusimmunity.test.js: `npm test`. Creatures cannot be given statuses that make no sense for them: skeletons and constructs
// (the Infernus Sentinel, the Calcified Crusader) neither bleed nor are poisoned, the undead take no poison, a ghost cannot be knocked down or
// bound, and a floating skull cannot be knocked down. Every path goes through EntityModel, and an ability says so in the battle log.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { ENTITY_DEFINITIONS } from '../../shared/characters/entityDefinitions.js';
import { StatusEffectFactory } from '../../shared/abilities/statusEffectFactory.js';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { AbilitySystem } from '../../shared/abilities/abilitySystem.js';
import { statusImmunitiesOf, isImmuneToStatus } from '../../shared/abilities/statusImmunity.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const make = (id) => quiet(() => EntityFactory.create(id, 5));

test('who is immune to what, by what they are', () => {
    const has = (id, list) => { const s = statusImmunitiesOf(make(id)); for (const x of list) assert.ok(s.has(x), `${id} is immune to ${x}`); };
    const not = (id, list) => { const s = statusImmunitiesOf(make(id)); for (const x of list) assert.ok(!s.has(x), `${id} is not immune to ${x}`); };
    has('SKELETAL_WARRIOR', ['bleed', 'poison']);
    has('ANCIENT_CULTIST', ['bleed', 'poison']);
    has('INFERNUS_SENTINEL', ['bleed', 'poison']);
    has('CALCIFIED_CRUSADER', ['bleed', 'poison']);
    has('FLOATING_SKULL', ['bleed', 'poison', 'knocked_down']);
    has('SHACKLED_SPIRIT', ['bleed', 'poison', 'knocked_down', 'bound']);
    has('HOLLOW_HARVESTER', ['poison']); not('HOLLOW_HARVESTER', ['bleed']);   // dead flesh still cuts
    for (const id of ['HUMANOID', 'WOLF', 'DOG', 'HAWK', 'DARIUS_THE_GROVELER', 'LEGIONARY']) assert.equal(statusImmunitiesOf(make(id)).size, 0, `${id} is immune to nothing`);
    for (const id of ['INFERNUS_SENTINEL', 'SKELETAL_WARRIOR']) not(id, ['burn', 'frozen', 'weakened']);
});

test('the status is not put on, whichever way it comes', () => {
    const skel = make('SKELETAL_WARRIOR');
    assert.equal(skel.applyStatusEffect(StatusEffectFactory.createEffect('bleed', 3, null)), false);
    assert.equal(skel.applyStatusEffect(StatusEffectFactory.createEffect('poison', 3, null)), false);
    assert.ok(!skel.statusEffects.some(s => s.id === 'bleed' || s.id === 'poison'));
    assert.equal(skel.applyStatusEffect(StatusEffectFactory.createEffect('burn', 3, null)), true, 'other statuses still land');
    const man = make('HUMANOID');
    assert.equal(man.applyStatusEffect(StatusEffectFactory.createEffect('bleed', 3, null)), true);
});

test('an ability that would make a skeleton bleed says it is immune, and the rest of the blow still happens', () => {
    AbilityDefinitions.__test_cut = { id: '__test_cut', name: 'Test Cut', targeting: { scope: 'enemy', select: 'single' }, cost: {}, accuracy: 1, effects: [], statusEffects: [{ id: 'bleed', chance: 1 }, { id: 'burn', chance: 1 }] };
    try {
        const skel = make('SKELETAL_WARRIOR'), hero = make('HUMANOID');
        const r = quiet(() => AbilitySystem.execute('__test_cut', hero, skel, { context: 'battle' }));
        assert.match(r.message, /immune to Bleed/);
        assert.ok(!skel.statusEffects.some(s => s.id === 'bleed'));
        assert.ok(skel.statusEffects.some(s => s.id === 'burn'), 'the burn still took');
        assert.ok(isImmuneToStatus(skel, 'bleed') && !isImmuneToStatus(hero, 'bleed'));
    } finally { delete AbilityDefinitions.__test_cut; }
});

test('the Infernus Sentinel and its encounters are named without "The": there is one in every catacomb', async () => {
    const { encounterDefinitions } = await import('../../shared/story/encounterDefinitions.js');
    assert.equal(ENTITY_DEFINITIONS.INFERNUS_SENTINEL.name, 'Infernus Sentinel');
    for (const id of ['infernus_sentinel', 'infernus_sentinel_fallen']) assert.equal(encounterDefinitions[id].title, 'Infernus Sentinel');
});
