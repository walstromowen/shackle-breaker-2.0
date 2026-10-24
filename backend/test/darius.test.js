// backend/test/darius.test.js: `npm test`. Darius the Groveler: a conversation at the altar, then the boss fight, with his own music. And the Crimson Vigil is gone.
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

test('setting the meteorite down starts the conversation, and it plays out in order to the fight', () => {
    const setDown = stages.at_the_altar.decisions.find(d => /meteorite/i.test(d.text));
    assert.ok(results(setDown).some(r => r.type === 'ADVANCE_STAGE' && r.payload.stageId === 'darius_rises'));
    assert.deepEqual(walk(), ['darius_rises', 'darius_weeps', 'darius_king', 'darius_late', 'darius_sees', 'darius_envy', 'darius_wrath']);
});

test('every stage of it is wired: it has a way on, its cues exist, its text fits, and only the last one fights', () => {
    for (const id of walk()) {
        const s = stages[id];
        assert.ok(s.text && s.displayText && s.image, `${id} has text, a title and a picture`);
        assert.ok(s.text.length <= 520, `${id}: the text fits the box (${s.text.length})`);
        assert.ok(s.decisions.length >= 1, `${id} has a button`);
        for (const d of s.decisions) assert.ok(d.customActionText, `${id}: "${d.text}" says what you do or say`);
        if (s.tone) assert.ok(TONES[s.tone], `${id}: unknown tone ${s.tone}`);
        if (s.effect) assert.ok(EFFECTS[s.effect], `${id}: unknown effect ${s.effect}`);
        const fights = s.decisions.flatMap(results).filter(r => r.type === 'START_BATTLE');
        assert.equal(fights.length > 0, id === 'darius_wrath', `${id}: only the last stage starts the fight`);
        for (const n of nextOf(id)) assert.ok(stages[n], `${id}: ADVANCE_STAGE to the missing stage ${n}`);
    }
});

test('he weeps for his king, sees the meteorite, and turns on you in envy', () => {
    const say = (id) => stages[id].text;
    assert.match(say('darius_rises'), /weeping/);
    assert.match(say('darius_weeps'), /king/i);
    assert.match(say('darius_king'), /Groveler/);
    assert.match(say('darius_late'), /late/i);
    assert.match(say('darius_sees'), /meteorite|star/i);
    assert.match(say('darius_envy'), /gave it to you/);
    assert.match(say('darius_wrath'), /give it back/i);
});

test('the music: darius-final-battle for the encounter, bossbattle for the fight, and the drone steps aside for the talking', () => {
    assert.equal(stages.darius_rises.bgm, 'dariusEncounterBgm');
    assert.equal(stages.darius_rises.ambience, 'none');
    assert.equal(stages.darius_wrath.ambience, 'altarDrone');
    const start = stages.darius_wrath.decisions[0].outcomes[0].results.find(r => r.type === 'START_BATTLE');
    assert.equal(start.payload.tableId, 'darius_boss');
    assert.equal(start.payload.bgm, 'bossBattleBgm');
    assert.deepEqual(start.payload.afterVictory, { encounterId: 'act_two' }, 'winning still ends in act 2');
    assert.ok(SpawnTableDefinitions.darius_boss);
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    assert.match(main, /dariusEncounterBgm:\s*'\.\/assets\/audio\/music\/darius-final-battle\.mp3'/);
    assert.match(main, /bossBattleBgm:\s*'\.\/assets\/audio\/music\/bossbattle\.mp3'/);
});

test('the Crimson Vigil is gone: no encounter, no biome lists it, and its battle table went with it', () => {
    assert.equal(encounterDefinitions.crimson_vigil, undefined);
    assert.equal(SpawnTableDefinitions.risen_pack, undefined);
    for (const [name, b] of Object.entries(BIOME_DEFINITIONS)) {
        for (const p of (b.encounters && b.encounters.pools) || []) assert.notEqual(p.id, 'crimson_vigil', `${name} still offers it`);
    }
});
