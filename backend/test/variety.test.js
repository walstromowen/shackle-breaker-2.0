// backend/test/variety.test.js: `npm test`. Encounter objects that differ from one to the next (EncounterController offerGroup, the Ruined
// Carriage's dead man), Dolos deciding how many come to an encounter's fight, the herbs and tonics, and the hawk's two abilities' own art.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameState } from '../../shared/core/gameState.js';
import { worldSync } from '../../shared/core/worldSync.js';
import { encounterDefinitions as E } from '../../shared/story/encounterDefinitions.js';
import { EncounterFactory } from '../../shared/story/encounterFactory.js';
import { EncounterController } from '../../frontend/src/screens/encounter/encounterController.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { Dolos } from '../../shared/story/dolos.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { TRAIT_DEFINITIONS } from '../../shared/abilities/traitDefinitions.js';
import { BattleAnimationDefinitions as B } from '../../shared/battle/animation/battleAnimationDefinition.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const visit = (col, row, stage = 'discovery') => {
    const c = Object.create(EncounterController.prototype);
    c._encounterId = 'ruined_carriage';
    c.model = EncounterFactory.create('ruined_carriage', { col, row, objectId: 'RUINED_CARRIAGE' });
    c.model.currentStageId = stage;
    c.mp = null;
    return c;
};
const offered = (c) => c._getValidDecisions().map(d => d.text + (d.offerGroup ? `|${d.offerGroup.variant}` : ''));
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };

test('each carriage has its own dead man, or none: stuck ring, loose ring or nobody, kept for that carriage in every scene', () => {
    gameState.world.changes = {};
    gameState.world.isInterior = false;
    gameState.quests = { active: {}, completed: [] };
    gameState.party.members = [quiet(() => EntityFactory.create('HUMANOID', { level: 8 }))];
    worldSync.onLocalChange = null;
    const bodyChoices = (list) => list.filter(t => /dead man/.test(t));
    // weights stuck 45, loose 20, none 35: a roll of 0.3 is stuck, 0.55 loose, 0.9 nobody
    const stuck = withRandom(0.3, () => offered(visit(1, 1)));
    assert.deepEqual(bodyChoices(stuck), ['Search the dead man slumped against the front wheel.|stuck']);
    const loose = withRandom(0.55, () => offered(visit(2, 2)));
    assert.deepEqual(bodyChoices(loose), ['Search the dead man slumped against the front wheel.|loose']);
    const none = withRandom(0.9, () => offered(visit(3, 3)));
    assert.deepEqual(bodyChoices(none), [], 'no dead man at this carriage');
    // the same carriage later, whatever the dice say now, and in the scene after the herd is beaten too
    assert.deepEqual(bodyChoices(withRandom(0.99, () => offered(visit(1, 1)))), bodyChoices(stuck));
    const cleared = (col, row) => { const c = visit(col, row, 'cleared'); c._encounterId = 'ruined_carriage'; return offered(c).filter(t => /dead man/.test(t)); };
    assert.deepEqual(withRandom(0.99, () => cleared(3, 3)), [], 'still nobody after the fight');
    assert.deepEqual(withRandom(0.0, () => cleared(2, 2)), ['Search the dead man.|loose']);
    // the loose ring needs no roll; the stuck one does
    assert.ok(E.ruined_carriage.stages.body_loose.decisions.find(d => /Slip the ring/.test(d.text)).type !== 'skill_check');
    assert.equal(E.ruined_carriage.stages.body.decisions[0].type, 'skill_check');
    // the journal: only half the bodies carry one, the same for that carriage
    const j = (col, row, v) => withRandom(v, () => { const c = visit(col, row, 'body'); return offered(c).some(t => /journal/.test(t)); });
    assert.equal(j(1, 1, 0.2), true);
    assert.equal(j(1, 1, 0.99), true, 'kept');
    assert.equal(j(5, 5, 0.8), false);
    assert.ok(!/dead man|man in a good coat/.test(E.ruined_carriage.stages.discovery.text), 'the opening says nothing of a body that may not be there');
});

test('Dolos decides how many come to an encounter\'s fight; a set piece is left as written', () => {
    gameState.world.changes = {};
    gameState.world.time = 600;
    worldSync.ownsWorld = true;
    gameState.party.members = [quiet(() => EntityFactory.create('HUMANOID', { level: 10, levelEdge: false }))];
    const herd = ['SHACKLED_STEED', 'SHACKLED_STEED', 'SHACKLED_STEED'];
    Dolos._enter(gameState, 'gaze');
    assert.equal(Dolos.adjustEncounterGroup(herd, { rand: () => 0 }).length, 4, 'one more in his gaze');
    Dolos._enter(gameState, 'respite');
    assert.equal(Dolos.adjustEncounterGroup(herd, { rand: () => 0 }).length, 2, 'one fewer in his respite');
    assert.equal(Dolos.adjustEncounterGroup(['WOLF'], { rand: () => 0 }).length, 1, 'never fewer than one');
    Dolos._enter(gameState, 'gaze');
    assert.equal(Dolos.adjustEncounterGroup(herd, { rand: () => 0, fixed: true }).length, 3, 'a set piece is as written');
    assert.equal(Dolos.adjustEncounterGroup(['DARIUS_THE_GROVELER'], { rand: () => 0, isBoss: () => true }).length, 1, 'a boss fight too');
    assert.equal(herd.length, 3, 'the encounter\'s own list is not changed');
    const src = fs.readFileSync(new URL('../../frontend/src/screens/encounter/encounterLogic.js', import.meta.url), 'utf8');
    assert.ok(/Dolos\.adjustEncounterGroup\(enemyList/.test(src), 'encounters send their fights through him');
});

test('herbs restore a tenth of their resource, tonics half', () => {
    const power = (item) => A[I[item].useAbility].effects.find(e => e.type === 'recover');
    for (const [herb, tonic, res] of [['healing_herb', 'healing_tonic', 'hp'], ['invigorating_herb', 'invigorating_tonic', 'stamina'], ['illuminating_herb', 'illuminating_tonic', 'insight']]) {
        assert.deepEqual([power(herb).resource, power(herb).calculation, power(herb).power], [res, 'percent', 0.1], herb);
        assert.deepEqual([power(tonic).resource, power(tonic).calculation, power(tonic).power], [res, 'percent', 0.5], tonic);
    }
});

test('Talon Strike and Take Flight: the artist\'s talons and wings, and animations of their own', () => {
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    assert.deepEqual(A.talon_strike.icon, { col: 0, row: 13 });
    assert.deepEqual(A.take_flight.icon, { col: 1, row: 13 });
    assert.equal(A.talon_strike.animationId, 'talon_strike');
    assert.equal(A.take_flight.animationId, 'take_flight');
    assert.equal(TRAIT_DEFINITIONS.airborne.triggers.onBattleStart.animationId, 'take_flight', 'the hawk takes off at the start of a fight');
    for (const id of ['talon_strike', 'take_flight']) assert.ok(B[id], `${id} animation`);
    for (const key of ['talonStrikeAnimation', 'takeFlightAnimation', 'talonStrikeSfx', 'takeFlightSfx']) {
        const m = main.match(new RegExp(`${key}: '([^']+)'`));
        assert.ok(m && fs.existsSync(new URL(`../../frontend/src/${m[1].replace('./', '')}`, import.meta.url)), `${key} is a real file`);
    }
});

test('Flying keeps a flier out of reach of melee, not of every physical attack; Take Flight and Arcane Blast spend the next turn', async () => {
    const { StatusEffectDefinitions: SD } = await import('../../shared/abilities/statusEffectDefinitions.js');
    const { CombatantModel } = await import('../../shared/battle/combatantModel.js');
    const { StatusEffectModel } = await import('../../shared/abilities/statusEffectModel.js');
    assert.deepEqual(SD.flying.immunities, { ranges: ['melee'] });
    const hawk = new CombatantModel(quiet(() => EntityFactory.create('HAWK', 5)));
    const archer = new CombatantModel(quiet(() => EntityFactory.create('HUMANOID', 5)));
    hawk.applyStatusEffect(new StatusEffectModel(SD.flying, 2, null));
    assert.equal(hawk.checkImmunity(A.claw, archer).isImmune, true, 'a claw cannot reach it');
    assert.equal(hawk.checkImmunity(A.claw, archer).reason, 'range');
    const arrow = Object.values(A).find(a => a.range === 'ranged' && (a.tags || []).includes('physical'));
    assert.equal(hawk.checkImmunity(arrow, archer).isImmune, false, `${arrow.id} still can`);
    const otherFlier = new CombatantModel(quiet(() => EntityFactory.create('HAWK', 5)));
    otherFlier.applyStatusEffect(new StatusEffectModel(SD.flying, 2, null));
    assert.equal(hawk.checkImmunity(A.claw, otherFlier).isImmune, false, 'another flier can');
    for (const id of ['take_flight', 'arcane_blast']) assert.ok(A[id].selfStatusEffects.some(s => s.id === 'recharging' && s.duration === 1), `${id} recharges`);
    assert.deepEqual(SD.recharging.icon, SD.knocked_down.icon, 'recharging looks like knocked down');
    assert.ok(!SD.recharging.cancels || !SD.recharging.cancels.includes('flying'), 'but does not pull the flier down');
});

test('indoors, a fight plays the plains\' battle music', async () => {
    const { BIOME_DEFINITIONS } = await import('../../shared/world/biomeDefinitions.js');
    assert.equal(BIOME_DEFINITIONS.HOUSE_INTERIOR.music.battle, BIOME_DEFINITIONS.PLAINS.music.battle);
});

test('ambushes are 1 to 3 (normal): a bigger party meets bigger groups, Dolos tilts them, and an outnumbered group is fiercer', async () => {
    const { ambushSize, AMBUSH_TILT, OUTNUMBERED, SpawnTableFactory } = await import('../../shared/battle/spawnTableFactory.js');
    const tally = (fighters, phase) => { const h = { 1: 0, 2: 0, 3: 0 }; let i = 0; for (; i < 3000; i++) h[ambushSize('normal', fighters, phase, () => (i * 0.6180339) % 1)]++; return h; };
    for (const f of [1, 2, 3]) for (const ph of Object.keys(AMBUSH_TILT)) {
        const h = tally(f, ph);
        assert.equal(h[1] + h[2] + h[3], 3000, 'never fewer than 1 or more than 3');
        assert.ok(h[1] > 0 && h[3] > 0, `${f} fighters, ${ph}: lone enemies and threes both happen`);
    }
    assert.ok(tally(3, 'calm')[3] < 1500, 'a full party no longer meets three nearly every time');
    assert.ok(tally(3, 'gaze')[3] > tally(3, 'calm')[3] && tally(3, 'respite')[3] < tally(3, 'calm')[3], 'Dolos tilts it');
    gameState.world.changes = {};
    const r = Math.random; Math.random = () => 0.01;   // the smallest group
    try {
        const m = SpawnTableFactory.generateBattle('plains_battles_day', 'normal', { fighters: 3, ambush: true });
        assert.equal(m.enemies.length, 1);
        assert.ok(m.enemies[0].levelOffset >= 2 * OUTNUMBERED.levels, 'a lone enemy against three is a higher level');
        assert.equal(m.enemies[0].outnumbered, 2, 'and is marked to be readied');
        assert.ok(!(m.enemies[0].baseStats && m.enemies[0].baseStats.maxHpMultiplier), 'no inflated health');
    } finally { Math.random = r; }
    // readied (as SceneManager does): always, whatever Dolos's phase: the trait against the party's damage, Tough alone against three, armour
    Dolos._enter(gameState, 'respite');
    const sword = (await import('../../shared/items/itemFactory.js')).ItemFactory.createItem('shortsword'); sword.level = 3;
    gameState.party.members = [quiet(() => EntityFactory.create('HUMANOID', { level: 10, levelEdge: false, equipment: { mainHand: sword } }))];
    const foe = quiet(() => EntityFactory.create('LEGIONARY', 12));
    const done = Dolos.counter(foe, { outnumbered: 2, rand: () => 0.99, makeItem: null });
    assert.ok(done.countered, 'even in his respite, even on a high roll');
    assert.ok((foe.state || foe).traits.includes('ironhide') && (foe.state || foe).traits.includes('tough'));
});
