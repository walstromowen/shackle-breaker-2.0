// backend/test/acts.test.js: `npm test`. The milestones and acts (shared/story/actDefinitions.js, shared/story/actSystem.js) and the data that hangs off them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ActSystem } from '../../shared/story/actSystem.js';
import { ACT_DEFINITIONS } from '../../shared/story/actDefinitions.js';
import { gameState } from '../../shared/core/gameState.js';
import { TimeSystem } from '../../shared/world/timeSystem.js';
import { SpawnTableFactory } from '../../shared/battle/spawnTableFactory.js';
import { SpawnTableDefinitions } from '../../shared/battle/spawnTableDefinitions.js';
import { ENTITY_DEFINITIONS } from '../../shared/characters/entityDefinitions.js';
import { TRAIT_DEFINITIONS } from '../../shared/abilities/traitDefinitions.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';
import { QuestDefinitions } from '../../shared/story/questDefinitions.js';
import { BiomeModel } from '../../shared/world/biomeModel.js';
import * as abilityData from '../../shared/abilities/abilityDefinitions.js';

const ABILITIES = Object.values(abilityData).find(v => v && typeof v === 'object' && v.strike);
const act1 = () => ({ milestones: [] });
const act2 = () => ({ milestones: ['act2'] });

test('the act comes from the milestones, and an old save (no list) is act 1', () => {
    assert.equal(ActSystem.getAct(act1()), 1);
    assert.equal(ActSystem.getAct({}), 1);
    assert.equal(ActSystem.getAct(act2()), 2);
    assert.equal(ActSystem.getAct({ milestones: ['something_else'] }), 1);
});

test('a milestone is granted once', () => {
    const state = act1();
    assert.equal(ActSystem.grantMilestone('act2', state), true);
    assert.equal(ActSystem.grantMilestone('act2', state), false);
    assert.deepEqual(state.milestones, ['act2']);
    assert.equal(ActSystem.getAct(state), 2);
});

test('every night of act 2 is a blood moon, no night of act 1 is, and no day ever is', () => {
    for (const hour of [20, 22, 23.5, 0, 3, 5.9]) {
        assert.equal(ActSystem.isBloodMoon(hour, act2()), true, `hour ${hour}`);
        assert.equal(ActSystem.isBloodMoon(hour, act1()), false, `hour ${hour}`);
    }
    for (const hour of [6, 9, 12, 17, 19.9]) assert.equal(ActSystem.isBloodMoon(hour, act2()), false, `hour ${hour}`);
});

test('the blood moon\'s red moonlight: only in act 2, only at night, fading in at dusk and out at dawn', () => {
    assert.equal(ActSystem.getMoonlight(23, act1()), null);
    assert.equal(ActSystem.getMoonlight(12, act2()), null);
    const deep = ActSystem.getMoonlight(23, act2());
    assert.ok(deep && deep.radius > 0 && deep.strength > 0);
    assert.equal(ActSystem.getMoonlight(3, act2()).strength, deep.strength);
    const dusk = ActSystem.getMoonlight(19.75, act2());
    assert.ok(dusk && dusk.strength > 0 && dusk.strength < deep.strength, 'dusk: fading in');
    const dawn = ActSystem.getMoonlight(5.5, act2());
    assert.ok(dawn && dawn.strength > 0 && dawn.strength < deep.strength, 'dawn: fading out');
    assert.equal(ActSystem.getMoonlight(6, act2()), null);
});

test('act 2 makes ambushes more frequent, most of all on a blood moon night', () => {
    assert.equal(ActSystem.getBattleRateMultiplier(12, act1()), 1);
    assert.equal(ActSystem.getBattleRateMultiplier(23, act1()), 1);
    assert.ok(ActSystem.getBattleRateMultiplier(12, act2()) > 1);
    assert.ok(ActSystem.getBattleRateMultiplier(23, act2()) > ActSystem.getBattleRateMultiplier(12, act2()));
});

test('enemies are upgraded in act 2 only', () => {
    assert.equal(ActSystem.getEnemyLevelOffset(act1()), 0);
    assert.ok(ActSystem.getEnemyLevelOffset(act2()) >= 1);
    assert.equal(ActSystem.getEnemyUpgrade('MAD_MAN', act1()), null);
    const up = ActSystem.getEnemyUpgrade('MAD_MAN', act2());
    assert.ok(up.abilities.length > 0);
    assert.equal(ActSystem.getEnemyUpgrade('NOT_AN_ENEMY', act2()), null);
});

test('a save that had already beaten Darius is moved into act 2 when it is loaded, any other is left alone', () => {
    const finished = { milestones: [], quests: { completed: ['shackled8'], active: {} } };
    assert.equal(ActSystem.catchUp(finished), true);
    assert.equal(ActSystem.getAct(finished), 2);
    assert.equal(ActSystem.catchUp(finished), false, 'only once');
    const waiting = { milestones: [], quests: { completed: [], active: { shackled8: { progress: { obj_kill_darius: 1 } } } } };
    assert.equal(ActSystem.catchUp(waiting), true);
    const notYet = { milestones: [], quests: { completed: ['shackled7'], active: { shackled8: { progress: { obj_reach_level_10: 1 } } } } };
    assert.equal(ActSystem.catchUp(notYet), false);
    assert.equal(ActSystem.getAct(notYet), 1);
});

test('minAct / maxAct decide what is available', () => {
    assert.equal(ActSystem.isAvailable({}, act1()), true);
    assert.equal(ActSystem.isAvailable({ minAct: 2 }, act1()), false);
    assert.equal(ActSystem.isAvailable({ minAct: 2 }, act2()), true);
    assert.equal(ActSystem.isAvailable({ maxAct: 1 }, act2()), false);
    assert.equal(ActSystem.isAvailable({ maxAct: 1 }, act1()), true);
});

test('every ability, trait and enemy named in the acts exists', () => {
    assert.ok(ABILITIES, 'the ability definitions could not be found');
    for (const [act, def] of Object.entries(ACT_DEFINITIONS)) {
        for (const [enemyId, up] of Object.entries(def.enemies || {})) {
            assert.ok(ENTITY_DEFINITIONS[enemyId], `act ${act}: unknown enemy ${enemyId}`);
            for (const a of up.abilities || []) assert.ok(ABILITIES[a], `act ${act}: ${enemyId} gets unknown ability ${a}`);
            for (const t of up.traits || []) assert.ok(TRAIT_DEFINITIONS[t], `act ${act}: ${enemyId} gets unknown trait ${t}`);
        }
    }
});

test('the clock is red on a night of act 2 and black on a night of act 1', () => {
    const time = new TimeSystem();
    const saved = { time: gameState.world.time, milestones: gameState.milestones };
    try {
        gameState.world.time = 23 * 60;
        gameState.milestones = [];
        const plain = time.getCurrentColorData();
        gameState.milestones = ['act2'];
        const blood = time.getCurrentColorData();
        assert.ok(plain.r < 30 && plain.b >= plain.r, 'the night of act 1 stays the cold near-black');
        assert.ok(blood.a > 0.9 && blood.r < 50 && blood.r > blood.g * 3 && blood.r > blood.b * 3, 'the night of act 2 is black with only a trace of crimson in it');
        gameState.world.time = 12 * 60;
        assert.equal(time.getCurrentColorData().a, 0, 'the day is still bright to the clock (the gloom is the lighting pass)');
        gameState.milestones = [];
        gameState.world.time = 23 * 60;
        assert.deepEqual(time.getCurrentColorData(), plain, 'going back to act 1 (a new game) brings the black night back');
    } finally {
        gameState.world.time = saved.time;
        gameState.milestones = saved.milestones;
    }
});

test('act 2 spawns: only in act 2, and no table is ever empty', () => {
    const saved = gameState.milestones;
    try {
        const plainsDayMembers = new Set(SpawnTableDefinitions.plains_battles_day.pools.flatMap(p => p.members.filter(m => !m.minAct).map(m => m.id)));
        const act2Only = new Set(SpawnTableDefinitions.plains_battles_day.pools.flatMap(p => p.members.filter(m => m.minAct === 2).map(m => m.id)));
        assert.ok(act2Only.size > 0, 'the plains day table has act 2 members');

        gameState.milestones = [];
        for (let i = 0; i < 300; i++) {
            const battle = SpawnTableFactory.generateBattle('plains_battles_day', 'hard');
            for (const e of battle.enemies) assert.ok(!act2Only.has(e.id) || plainsDayMembers.has(e.id), `act 1 spawned the act 2 enemy ${e.id}`);
        }

        gameState.milestones = ['act2'];
        let sawAct2 = false;
        for (let i = 0; i < 600 && !sawAct2; i++) {
            const battle = SpawnTableFactory.generateBattle('plains_battles_day', 'hard');
            sawAct2 = battle.enemies.some(e => act2Only.has(e.id) && !plainsDayMembers.has(e.id));
        }
        assert.ok(sawAct2, 'act 2 never spawned its own enemies in 600 tries');

        for (const [id, table] of Object.entries(SpawnTableDefinitions)) {
            if (table.type !== 'faction_pool') continue;
            for (const milestones of [[], ['act2']]) {
                gameState.milestones = milestones;
                for (let i = 0; i < 20; i++) assert.ok(SpawnTableFactory.generateBattle(id, 'normal').hasEnemies(), `${id} came up empty in act ${milestones.length + 1}`);
            }
        }
    } finally {
        gameState.milestones = saved;
    }
});

test('every spawn member exists, and every biome has a blood moon table that exists', () => {
    for (const [id, table] of Object.entries(SpawnTableDefinitions)) {
        for (const pool of table.pools || []) for (const m of pool.members || []) assert.ok(ENTITY_DEFINITIONS[m.id], `${id}: unknown enemy ${m.id}`);
    }
    for (const biomeId of ['PLAINS', 'DESERT', 'SNOWY_MOUNTAINS']) {
        const tableId = BIOME_DEFINITIONS[biomeId].battles.tables.bloodMoon;
        assert.ok(tableId && SpawnTableDefinitions[tableId], `${biomeId} has no blood moon table`);
    }
});

test('Darius leads to the encounter that starts act 2, and that encounter grants the milestone', () => {
    // Darius's last line is told over a few short stages: the fight is on the last of them
    const rises = Object.values(encounterDefinitions.mysterious_altar.stages).find(s => JSON.stringify(s.decisions).includes('darius_boss'));
    const battle = rises.decisions[0].outcomes[0].results.find(r => r.type === 'START_BATTLE');
    assert.equal(battle.payload.tableId, 'darius_boss');
    assert.equal(battle.payload.afterVictory.encounterId, 'act_two');

    const actTwo = encounterDefinitions.act_two;
    assert.ok(actTwo, 'the act_two encounter is registered');
    const granted = [];
    for (const stage of Object.values(actTwo.stages)) {
        for (const d of stage.decisions) for (const o of d.outcomes || []) for (const r of o.results) if (r.type === 'GRANT_MILESTONE') granted.push(r.payload.id);
    }
    assert.deepEqual(granted, [ACT_DEFINITIONS[2].milestone]);
});

test('every encounter an act asks for exists, with all its stages wired up', () => {
    const ids = new Set();
    for (const b of Object.values(BIOME_DEFINITIONS)) for (const p of (b.encounters && b.encounters.pools) || []) ids.add(p.id);
    for (const id of ids) assert.ok(encounterDefinitions[id], `a biome lists the unknown encounter ${id}`);
    for (const id of ['act_two']) {
        const enc = encounterDefinitions[id];
        assert.ok(enc.stages[enc.initialStage], `${id}: missing the first stage`);
        const json = JSON.stringify(enc);
        for (const m of json.matchAll(/"stageId":"([a-z_]+)"/g)) assert.ok(enc.stages[m[1]], `${id}: ADVANCE_STAGE to the missing stage ${m[1]}`);
        for (const m of json.matchAll(/"tableId":"([a-z_]+)"/g)) assert.ok(SpawnTableDefinitions[m[1]], `${id}: unknown spawn table ${m[1]}`);
    }
    assert.ok(QuestDefinitions.act2_red_moon, 'the quest the act 2 encounter starts exists');
});

test('a biome ambush uses the table of the hour: night in act 1, the blood moon table in act 2', () => {
    const saved = gameState.milestones;
    try {
        const plains = new BiomeModel({ ...BIOME_DEFINITIONS.PLAINS, battles: { ...BIOME_DEFINITIONS.PLAINS.battles, rate: 1000 } });
        const idsOf = (tableId) => new Set(SpawnTableDefinitions[tableId].pools.flatMap(p => p.members.map(m => m.id)));
        const night = idsOf('plains_battles_night'), blood = idsOf('plains_battles_blood_moon');
        const sample = (hour) => { const ids = new Set(); for (let i = 0; i < 400; i++) (plains.getBattle('hard', hour)?.enemies || []).forEach(e => ids.add(e.id)); return ids; };

        gameState.milestones = [];
        for (const id of sample(23)) assert.ok(night.has(id), `act 1, night: ${id} is not on the night table`);
        assert.ok(!sample(12).has('SKELETAL_WARRIOR'), 'act 1 day never has the act 2 skeletons');

        gameState.milestones = ['act2'];
        const bloodSeen = sample(23);
        for (const id of bloodSeen) assert.ok(blood.has(id), `act 2, night: ${id} is not on the blood moon table`);
        assert.ok(bloodSeen.has('SKELETAL_WARRIOR'), 'the dead rise on a blood moon night');
        assert.ok(sample(12).has('SKELETAL_WARRIOR'), 'act 2 days have their skeletons too');
    } finally {
        gameState.milestones = saved;
    }
});

test('an encounter pool marked minAct 2 is only offered in act 2, at the hours it names', () => {
    const saved = gameState.milestones;
    try {
        // no encounter needs this today (the Crimson Vigil was removed): a made-up pool keeps the rule honest
        const plains = new BiomeModel({ ...BIOME_DEFINITIONS.PLAINS, encounters: { rate: 1000, type: 'time_weighted', pools: [
            { weight: 10, id: 'always_there' },
            { weight: 10, id: 'late_game_night', allowedTimes: ['dusk', 'night'], minAct: 2 }
        ] } });
        const sample = (hour) => { const ids = new Set(); for (let i = 0; i < 600; i++) { const e = plains.getEncounter(hour); if (e) ids.add(e.id); } return ids; };
        gameState.milestones = [];
        assert.ok(!sample(22).has('late_game_night'));
        assert.ok(sample(22).has('always_there'));
        gameState.milestones = ['act2'];
        assert.ok(sample(22).has('late_game_night'));
        assert.ok(sample(19).has('late_game_night'));
        assert.ok(!sample(12).has('late_game_night'));
    } finally {
        gameState.milestones = saved;
    }
});
