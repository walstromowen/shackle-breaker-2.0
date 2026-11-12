// backend/test/jaeger.test.js: `npm test`. Jaeger, Nikoli's corrupted brother, posing as Nikoli in the hoard of the first catacombs. He looks like Nikoli
// (the same warlord art) and speaks like him, more seriously; the clues are in what he says and how, before he asks where Mentoras is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState, resetWorldForNewGame } from '../../shared/core/gameState.js';
import { ENTITY_DEFINITIONS as ENT } from '../../shared/characters/entityDefinitions.js';
import { MAP_OBJECTS_DEFINITIONS as M } from '../../shared/world/mapObjectDefinitions.js';
import { InteriorFactory, STORY_HOMES } from '../../shared/world/interiorFactory.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { VOICED, linesOf } from '../../shared/story/voiceLines.js';
import { EncounterLogic } from '../../frontend/src/screens/encounter/encounterLogic.js';

const J = encounterDefinitions.jaeger;
const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const nexts = (st) => st.decisions.flatMap(d => (d.outcomes || []).flatMap(o => o.results)).filter(r => r.type === 'ADVANCE_STAGE').map(r => r.payload.stageId);
const results = (id) => J.stages[id].decisions.flatMap(d => (d.outcomes || []).flatMap(o => o.results));
const jaegerIn = (g) => { for (let r = g.bounds.minR; r <= g.bounds.maxR; r++) for (let c = g.bounds.minC; c <= g.bounds.maxC; c++) if (g.getObjectIdAt(c, r) === 'JAEGER_NPC') return [c, r]; return null; };

test('the two brothers wear the same art: the Panzerian warlord\'s', () => {
    for (const id of ['NIKOLI', 'JAEGER']) {
        assert.equal(ENT[id].spritePortrait, 'warlordHeroPortrait');
        assert.equal(ENT[id].spriteOverworld, 'warlordHeroSprite');
    }
    assert.equal(encounterDefinitions.nikoli.imageSheet, J.imageSheet);
    assert.equal(J.title, 'Nikoli', 'he gives his brother\'s name');
    assert.equal(M.JAEGER_NPC.interaction.id, 'jaeger');
    assert.equal(J.personal, true);
});

test('he waits in the hoard of the first catacombs entered, in no other, and not once he has been met', () => {
    resetWorldForNewGame();
    gameState.milestones = [];
    assert.ok(STORY_HOMES.includes('jaegerCatacomb'));
    const first = quiet(() => InteriorFactory.create(77, 'CATACOMBS', '5_5'));
    const at = jaegerIn(first);
    assert.ok(at, 'he is there');
    assert.deepEqual(at, first.storyNpcPos);
    assert.equal(gameState.world.jaegerCatacomb, '5_5');
    assert.ok(!jaegerIn(quiet(() => InteriorFactory.create(78, 'CATACOMBS', '9_9'))), 'not in a second catacombs');
    gameState.milestones = ['jaeger_met'];
    assert.ok(!jaegerIn(quiet(() => InteriorFactory.create(77, 'CATACOMBS', '5_5'))), 'gone once met');
    gameState.milestones = [];
    resetWorldForNewGame();
});

test('the clues come before the question: the even smile, the cold, no laughter, the slip into "I", and no memory of a player Nikoli fought beside', () => {
    const order = []; let id = J.initialStage;
    while (id && id !== 'debt') { order.push(id); id = nexts(J.stages[id]).find(s => s !== 'remember') || null; }
    assert.ok(order.indexOf('ask') > order.indexOf('host'), 'he asks only after the clues');
    assert.match(J.stages.smile.text, /straight, white, even smile/);
    assert.match(J.stages.cold.text, /Frost/);
    assert.match(J.stages.host.text, /but I\.\.\. Nikoli/);
    assert.match(J.stages.host.text, /does not laugh/);
    gameState.milestones = ['nikoli_met'];
    const met = J.stages.smile.decisions.filter(d => EncounterLogic.checkConditions(d, {})).flatMap(d => d.outcomes[0].results).map(r => r.payload.stageId);
    gameState.milestones = [];
    const stranger = J.stages.smile.decisions.filter(d => EncounterLogic.checkConditions(d, {})).flatMap(d => d.outcomes[0].results).map(r => r.payload.stageId);
    assert.deepEqual(met, ['remember']);
    assert.deepEqual(stranger, ['host']);
    assert.match(J.stages.remember.text, /Few remember him correctly/);
    // nothing on the buttons gives him away
    for (const s of Object.values(J.stages)) for (const d of s.decisions) assert.doesNotMatch(d.text, /Jaeger|brother|teeth|smile/i);
});

test('two answers: tell him of the hooded man (only once the Stranger is met), or say you do not know the name; never "you are not Nikoli"', () => {
    const tell = J.stages.debt.decisions[0];
    assert.deepEqual(tell.conditions, [{ type: 'quest_completed', id: 'shackled_stranger' }]);
    assert.deepEqual(J.stages.debt.decisions.map(d => d.text.replace(/^\[[^\]]*\] /, '')), ['"There\'s a hooded man in a village workshop. He might be the one."', '"I don\'t know anyone by that name."']);
    assert.ok(!J.stages.unmasked, 'he is never unmasked to his face');
    const ends = { told_3: 'jaeger_told', dunno_2: null };
    for (const [stageId, flag] of Object.entries(ends)) {
        const r = results(stageId);
        assert.ok(r.some(x => x.type === 'GRANT_MILESTONE' && x.payload.id === 'jaeger_met'), stageId);
        assert.ok(r.some(x => x.type === 'DESTROY_OBJECT'), `${stageId}: he leaves the map`);
        if (flag) assert.ok(r.some(x => x.type === 'GRANT_MILESTONE' && x.payload.id === flag), `${stageId}: ${flag}`);
    }
    assert.ok(!results('dunno_2').some(r => r.type === 'GRANT_MILESTONE' && r.payload.id === 'jaeger_told'), 'not telling him tells him nothing');
});

test('voiced: his lines in Nikoli\'s voice, played cold', async () => {
    assert.deepEqual(VOICED.jaeger, [[/./, 'JAEGER']].map(([r, s]) => [r, s]));
    const fs = await import('node:fs');
    const voices = JSON.parse(fs.readFileSync(new URL('../../tools/voice/voices.json', import.meta.url), 'utf8')).voices;
    assert.equal(voices.JAEGER.id, voices.NIKOLI.id, 'the same voice');
    const lines = linesOf('jaeger', J).filter(l => l.speaker === 'JAEGER');
    assert.ok(lines.length >= 8);
    for (const l of lines) assert.ok(voices.JAEGER.directions[l.text], `a cue for "${l.text.slice(0, 40)}"`);
});
