// backend/test/deserthazards.test.js: `npm test`. The desert's hazards (story/encounters/desertHazards.js): quicksand, any time; a cyclone, only in a
// sandstorm, its battle music from the first sight, which can give an Insight of Wind, Earth or Lightning, and whose heart, guarded by a great
// thunder locust swarm, always gives one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameState } from '../../shared/core/gameState.js';
import { encounterDefinitions as E } from '../../shared/story/encounterDefinitions.js';
import { BiomeModel } from '../../shared/world/biomeModel.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { ENTITY_DEFINITIONS as ENT } from '../../shared/characters/entityDefinitions.js';

const results = (enc, id) => E[enc].stages[id].decisions.flatMap(d => [...(d.outcomes || []), ...(d.successOutcomes || []), ...(d.failureOutcomes || [])]).flatMap(o => o.results);
const INSIGHTS = ['insight_of_wind', 'insight_of_earth', 'insight_of_lightning'];

test('the desert\'s pool: quicksand any time, the cyclone only in a sandstorm', () => {
    const desert = new BiomeModel(BIOME_DEFINITIONS.DESERT);
    const pools = BIOME_DEFINITIONS.DESERT.encounters.pools;
    assert.deepEqual(pools.map(p => p.id).sort(), ['cyclone', 'quicksand']);
    const real = Math.random;
    const seen = (weather) => {
        gameState.world.currentWeather = weather ? { id: weather } : null;
        const ids = new Set();
        // each step: the first roll passes the rate, the next picks from the pool (spread over the weights)
        for (let i = 0; i < 40; i++) { let n = 0; Math.random = () => (n++ === 0 ? 0 : (i + 0.5) / 40); const r = desert.getEncounter(12); if (r) ids.add(r.id); }
        return ids;
    };
    try {
        assert.deepEqual([...seen(null)], ['quicksand'], 'clear skies: no cyclone');
        assert.ok(seen('sandstorm').has('cyclone'), 'a sandstorm: the cyclone can come');
    } finally { Math.random = real; gameState.world.currentWeather = null; }
});

test('quicksand: four ways out; struggling wrong drags you deeper; lying still can turn up a buried pack; the rope is spent', () => {
    const q = E.quicksand;
    assert.deepEqual(q.stages.sinking.decisions.filter(d => d.type === 'skill_check').map(d => d.attribute), ['strength', 'dexterity', 'intelligence']);
    for (const d of q.stages.sinking.decisions.filter(d => d.type === 'skill_check')) assert.equal(d.failureOutcomes[0].results[0].payload.stageId, 'deeper');
    assert.ok(results('quicksand', 'deeper').some(r => r.type === 'MODIFY_VITALS' && r.payload.hp < 0));
    assert.ok(results('quicksand', 'floated').some(r => r.type === 'ROLL_LOOT_TABLE'));
    const rope = q.stages.sinking.decisions.find(d => /Escape Rope/.test(d.text));
    assert.deepEqual(rope.conditions, [{ type: 'has_item', itemId: 'escape_rope', qty: 1 }]);
    assert.ok(results('quicksand', 'roped').some(r => r.type === 'REMOVE_ITEM' && r.payload.itemId === 'escape_rope'));
});

test('the cyclone: battle music from the start; it can give an Insight of Wind, Earth or Lightning; done wrong, it hurts or brings locusts', () => {
    const c = E.cyclone;
    assert.equal(c.stages.funnel.bgm, 'desertBattleBgm');
    for (const id of INSIGHTS) assert.ok(I[id], id);
    for (const s of ['seized', 'calm']) {
        const gives = results('cyclone', s).filter(r => r.type === 'GIVE_ITEM').map(r => r.payload.itemId).sort();
        assert.deepEqual(gives, [...INSIGHTS].sort(), `${s}: one of the three`);
    }
    assert.ok(results('cyclone', 'thrown').some(r => r.type === 'MODIFY_VITALS'));
    assert.ok(results('cyclone', 'struck').some(r => r.type === 'MODIFY_VITALS' && r.payload.damageType === 'lightning'));
    assert.ok(results('cyclone', 'swarm').some(r => r.type === 'START_BATTLE' && r.payload.enemies.every(e => e === 'THUNDER_LOCUST')));
    assert.ok(ENT.THUNDER_LOCUST);
});

test('its heart: a great locust swarm, and beating it always gives one of the three insights', () => {
    const fight = results('cyclone', 'eye').find(r => r.type === 'START_BATTLE');
    assert.ok(fight.payload.enemies.length >= 6 && fight.payload.enemies.every(e => e === 'THUNDER_LOCUST'), 'a large swarm');
    assert.equal(fight.payload.bgm, 'desertBattleBgm');
    assert.equal(fight.payload.afterVictory.encounterId, 'cyclone_heart');
    const won = E.cyclone_heart.stages.stilled.decisions[0].outcomes;
    assert.ok(won.every(o => o.results.some(r => r.type === 'GIVE_ITEM' && INSIGHTS.includes(r.payload.itemId))), 'every outcome gives one: guaranteed');
    const out = E.cyclone.stages.eye.decisions.find(d => /Ride the next gust out/.test(d.text));
    assert.ok(out, 'the fight can be refused');
    assert.equal(out.type, 'skill_check', 'but getting out is a roll');
    assert.equal(out.failureOutcomes[0].results[0].payload.stageId, 'thrown');
});

test('no free way past the cyclone: every choice at the funnel is a roll, sheltering too', () => {
    const f = E.cyclone.stages.funnel.decisions;
    assert.ok(f.length >= 4 && f.every(d => d.type === 'skill_check'), f.map(d => d.text).join(' | '));
    const hide = f.find(d => /behind a dune/.test(d.text));
    assert.equal(hide.attribute, 'vigor');
    assert.deepEqual(hide.successOutcomes[0].results[0].payload.stageId, 'shelter');
    assert.ok(hide.failureOutcomes.every(o => ['thrown', 'swarm'].includes(o.results[0].payload.stageId)));
});

test('their pictures are real files', () => {
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    for (const key of ['encounter_quicksand', 'encounter_cyclone']) {
        const m = main.match(new RegExp(`${key}: '([^']+)'`));
        assert.ok(m && fs.existsSync(new URL(`../../frontend/src/${m[1].replace('./', '')}`, import.meta.url)), key);
    }
});
