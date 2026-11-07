// backend/test/darius.test.js: `npm test`. Darius the Groveler: a short scene at the altar where he alone speaks, then the boss fight (one Darius), with his music from the moment he turns. And the Crimson Vigil is gone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mysteriousAltar } from '../../shared/story/encounters/story/mysteriousAltar.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { SpawnTableDefinitions } from '../../shared/battle/spawnTableDefinitions.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';
import { TONES, EFFECTS } from '../../frontend/src/ui/encounterFx.js';

const stages = mysteriousAltar.stages;
const results = (d) => [...(d.outcomes || []), ...(d.successOutcomes || []), ...(d.failureOutcomes || [])].flatMap(o => o.results);
const nextOf = (stageId) => stages[stageId].decisions.flatMap(d => results(d)).filter(r => r.type === 'ADVANCE_STAGE').map(r => r.payload.stageId);

const lastBeat = 'darius_wrath';   // the fight starts on the last stage

// walk the conversation from the moment the meteorite is set down
const walk = () => {
    const seen = [], queue = ['darius_rises'];
    while (queue.length) {
        const id = queue.shift();
        if (seen.includes(id)) continue;
        seen.push(id);
        queue.push(...nextOf(id));
    }
    return seen;
};

test('setting the meteorite down starts the scene, and it plays out in five short stages to the fight', () => {
    const setDown = stages.at_the_altar.decisions.find(d => /meteorite/i.test(d.text));
    assert.ok(results(setDown).some(r => r.type === 'ADVANCE_STAGE' && r.payload.stageId === 'darius_rises'));
    assert.deepEqual(walk(), ['darius_rises', 'darius_speaks', 'darius_late', 'darius_sees', 'darius_wrath']);
});

test('Darius does all the talking: up to the fight, the only button is "Continue."', () => {
    for (const id of ['darius_rises', 'darius_speaks', 'darius_late', 'darius_sees']) {
        assert.deepEqual(stages[id].decisions.map(d => d.text), ['Continue.'], id);
    }
    assert.deepEqual(stages.darius_wrath.decisions.map(d => d.text), ['Draw your weapon.']);
});

test('every stage of it is wired: it has a way on, its cues exist, its text fits, and only the last one fights', () => {
    for (const id of walk()) {
        const s = stages[id];
        assert.ok(s.text && s.displayText && s.image, `${id} has text, a title and a picture`);
        assert.ok(s.text.length <= 300, `${id}: the text fits the box (${s.text.length})`);
        assert.ok(s.text.split(/(?<=[.!?]["]?)\s+(?=["{A-Z])/).length <= 6, `${id}: a short paragraph`);
        assert.ok(s.decisions.length >= 1, `${id} has a button`);
        for (const d of s.decisions) assert.ok(d.customActionText || d.text === 'Continue.', `${id}: "${d.text}" says what you do or say`);
        if (s.tone) assert.ok(TONES[s.tone], `${id}: unknown tone ${s.tone}`);
        if (s.effect) assert.ok(EFFECTS[s.effect], `${id}: unknown effect ${s.effect}`);
        const fights = s.decisions.flatMap(results).filter(r => r.type === 'START_BATTLE');
        assert.equal(fights.length > 0, id === lastBeat, `${id}: only the last stage starts the fight`);
        for (const n of nextOf(id)) assert.ok(stages[n], `${id}: ADVANCE_STAGE to the missing stage ${n}`);
    }
});

test('he talks to you: every stage is his own words, spoken to you, with no narration', () => {
    for (const id of walk().filter(id => id !== 'darius_wrath')) {
        const t = stages[id].text.trim();
        assert.ok(t.startsWith('"') && t.endsWith('"'), `${id}: only his words, in quotes`);
        assert.doesNotMatch(t, /turns? around/i, `${id}: his back is still to you`);
    }
    // he turns around only on the last stage, right before the fight
    assert.match(stages.darius_wrath.text, /^Darius turns around\./);
    assert.ok(stages.darius_wrath.text.trim().endsWith('"'));
    const all = walk().map(id => stages[id].text).join(' ');
    assert.match(all, /\byou\b/, 'he speaks to the player');
    assert.match(stages.darius_rises.text, /king/i);
    assert.match(stages.darius_speaks.text, /Groveler/);
    assert.match(stages.darius_late.text, /late/i);
    assert.match(stages.darius_sees.text, /loved/);
    assert.match(stages.darius_wrath.text, /give it back/i);
});

test('the music: none at all while he talks (only the altar\'s drone, kept low), his track the moment he turns, and the same track carries on into the fight', async () => {
    for (const id of ['darius_rises', 'darius_speaks', 'darius_late', 'darius_sees']) assert.equal(stages[id].bgm, 'none', `${id}: no music`);
    assert.equal(stages.darius_rises.ambience, 'altarDrone');
    assert.ok(stages.darius_rises.ambienceVolume > 0 && stages.darius_rises.ambienceVolume < 0.6, 'a quiet bed');
    assert.equal(stages.darius_wrath.bgm, 'dariusEncounterBgm', 'his track starts when he turns');
    const start = stages[lastBeat].decisions[0].outcomes[0].results.find(r => r.type === 'START_BATTLE');
    assert.equal(start.payload.tableId, 'darius_boss');
    assert.equal(start.payload.bgm, 'dariusEncounterBgm', 'the fight plays the same track, so it never stops');
    assert.deepEqual(start.payload.afterVictory, { encounterId: 'act_two' }, 'winning still ends in act 2');
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    const m = main.match(/dariusEncounterBgm:\s*'\.\/([^']+)'/);
    assert.ok(m && fs.existsSync(new URL(`../../frontend/src/${m[1]}`, import.meta.url)), 'his track is registered and on disk');
});

test('there is only ever one Darius, whatever the size of the party or the difficulty', async () => {
    const { SpawnTableFactory } = await import('../../shared/battle/spawnTableFactory.js');
    assert.equal(SpawnTableDefinitions.darius_boss.fixedSize, true);
    for (const difficulty of ['easy', 'normal', 'hard', 'nightmare'])
        for (const fighters of [1, 2, 3])
            for (let i = 0; i < 30; i++) assert.equal(SpawnTableFactory.generateBattle('darius_boss', difficulty, { fighters, players: 3 }).enemies.length, 1);
});

test('the Crimson Vigil is gone: no encounter, no biome lists it, and its battle table went with it', () => {
    assert.equal(encounterDefinitions.crimson_vigil, undefined);
    assert.equal(SpawnTableDefinitions.risen_pack, undefined);
    for (const [name, b] of Object.entries(BIOME_DEFINITIONS)) {
        for (const p of (b.encounters && b.encounters.pools) || []) assert.notEqual(p.id, 'crimson_vigil', `${name} still offers it`);
    }
});
