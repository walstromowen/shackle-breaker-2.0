// backend/test/codey.test.js: `npm test`. Act 2, the desert: the Hooded Stranger searches for Codey, a Namuh nightblade ("The Hands That Speak": codey1,
// codey2, codey3). Three steps of killing in the desert, then the Dry Kraken, holding Codey, rises out of the open sand (story/storyAmbush.js); the
// hand-in is the reunion. He says only what is needed, nothing of his own story outright, and his grief slips out once, at the reunion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { QuestDefinitions as Q } from '../../shared/story/questDefinitions.js';
import { QuestModel } from '../../shared/story/questModel.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { STRANGER_DESERT } from '../../shared/story/encounters/story/hoodedStranger.js';
import { krakenAmbushDue, storyAmbush } from '../../shared/story/storyAmbush.js';
import { VOICED, linesOf } from '../../shared/story/voiceLines.js';
import { BiomeModel } from '../../shared/world/biomeModel.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';
import { ENTITY_DEFINITIONS as ENT } from '../../shared/characters/entityDefinitions.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';

const S = encounterDefinitions.hooded_stranger;
const AMBUSH = encounterDefinitions.dry_kraken_ambush;
const FREED = encounterDefinitions.codey_freed;
const story = ({ milestones = ['act2'], completed = ['shackled_stranger', 'shackled1', 'shackled2', 'shackled3', 'shackled7', 'shackled8'], active = [] } = {}) => {
    gameState.milestones = milestones.slice();
    gameState.quests = { active: {}, completed: completed.slice(), trackedIds: [] };
    gameState.party.members = [];
    for (const id of active) QuestModel.startQuest(gameState, id);
};
const finish = (id, only) => { for (const o of Q[id].objectives) if (!only || only.includes(o.id)) QuestModel.updateProgress(gameState, id, o.id, o.amount || 1); };
const nexts = (st) => st.decisions.flatMap(d => (d.outcomes || []).flatMap(o => o.results)).filter(r => r.type === 'ADVANCE_STAGE').map(r => r.payload.stageId);
const walk = (enc, start) => { const seen = []; let id = start; while (id && !seen.includes(id)) { seen.push(id); id = nexts(enc.stages[id])[0]; } return seen; };
const results = (enc, id) => enc.stages[id].decisions.flatMap(d => (d.outcomes || []).flatMap(o => o.results));

test('three steps, all handed in to him: the stalkers, the old road, the miragewrights and (hidden as "Find Codey") the Dry Kraken', () => {
    assert.deepEqual(STRANGER_DESERT, ['codey1', 'codey2', 'codey3']);
    for (const id of STRANGER_DESERT) assert.equal(Q[id].turnIn, 'HOODED_STRANGER');
    assert.equal(Q.codey1.objectives[0].targetId, 'SAND_STALKER');
    assert.equal(Q.codey2.objectives[0].targetId, 'CALCIFIED_CRUSADER');
    assert.deepEqual(Q.codey3.objectives.map(o => o.targetId), ['MIRAGEWRIGHT', 'DRY_KRAKEN']);
    assert.equal(Q.codey3.objectives[1].description, 'Find Codey', 'the kraken is not named before it rises');
    for (const o of [Q.codey1, Q.codey2, Q.codey3].flatMap(q => q.objectives)) assert.ok(ENT[o.targetId], o.targetId);
    for (const it of Q.codey3.rewards.items) assert.ok(I[it.id], it.id);
});

test('what he opens with in the desert follows the search, from the first visit to the reunion and after', () => {
    story();
    assert.equal(S.initialStage(), 'desert_meet', 'act 2, the Shackled steps all handed in: the desert meeting');
    story({ milestones: [] });
    assert.equal(S.initialStage(), 'after_darius', 'act 1 still: the old words');
    story({ active: ['codey1'] });
    assert.equal(S.initialStage(), 'waiting_codey1');
    finish('codey1');
    assert.equal(S.initialStage(), 'turnin_codey1');
    story({ completed: [...gameState.quests.completed, 'codey1'] });
    assert.equal(S.initialStage(), 'offer_codey2', 'a step left ungiven is offered');
    story({ completed: [...gameState.quests.completed], active: ['codey2'] });
    finish('codey2');
    assert.equal(S.initialStage(), 'turnin_codey2');
    story({ completed: [...gameState.quests.completed, 'codey2'], active: ['codey3'] });
    finish('codey3', ['obj_codey_miragewrights']);
    assert.equal(S.initialStage(), 'waiting_codey3', 'the miragewrights alone are not enough: Codey is still out there');
    finish('codey3');
    assert.equal(S.initialStage(), 'turnin_codey3', 'the kraken dead: the reunion');
    story({ completed: [...gameState.quests.completed, 'codey3'] });
    assert.equal(S.initialStage(), 'after_codey');
});

test('each conversation leads where it should: meeting to codey1, each hand-in to the next step, the reunion pays codey3', () => {
    const meet = walk(S, 'desert_meet');
    assert.equal(meet[meet.length - 1], 'give_codey1');
    assert.ok(results(S, 'give_codey1').some(r => r.type === 'START_QUEST' && r.payload.questId === 'codey1'));
    assert.ok(nexts(S.stages.desert_meet_4).includes('desert_who'), 'he can be asked who Codey is to him');
    assert.deepEqual(walk(S, 'desert_who'), ['desert_who', 'give_codey1']);
    for (const [id, nextGive] of [['codey1', 'give_codey2'], ['codey2', 'give_codey3']]) {
        assert.ok(results(S, `turnin_${id}`).some(r => r.type === 'COMPLETE_QUEST' && r.payload.questId === id));
        assert.equal(walk(S, `turnin_${id}`).pop(), nextGive);
    }
    assert.ok(results(S, 'turnin_codey3').some(r => r.type === 'COMPLETE_QUEST' && r.payload.questId === 'codey3'));
    for (const id of ['offer_codey2', 'offer_codey3', 'waiting_codey1', 'waiting_codey2', 'waiting_codey3', 'after_codey']) assert.ok(S.stages[id], id);
});

test('he says only what is needed: no direction, nothing named of his past, and his grief slips out once, at the reunion', () => {
    const desert = Object.entries(S.stages).filter(([id]) => /codey|desert/.test(id)).map(([, s]) => s.text).join(' ');
    assert.doesNotMatch(desert, /\b(north|south|east|west)\b/i, 'the desert could lie in any direction');
    assert.doesNotMatch(JSON.stringify(S.stages), /\b(son|family|Mentoras|Jacob|prison|cell|capital)\b/i);
    assert.match(S.stages.codey_back_2.text, /One of you did\./);
    assert.match(S.stages.desert_meet_3.text, /Namuh/, 'he says what the Namuh are');
    assert.match(S.stages.desert_meet.text, /moon/, 'the red moon, as new to him as to the player');
});

test('the Dry Kraken waits on the open sand once the miragewrights are dead, and only until it is killed', () => {
    gameState.world.isInterior = false;
    story({ active: ['codey3'] });
    assert.equal(krakenAmbushDue('DESERT'), false, 'not before the miragewrights');
    finish('codey3', ['obj_codey_miragewrights']);
    assert.equal(krakenAmbushDue('DESERT'), true);
    assert.equal(krakenAmbushDue('PLAINS'), false, 'only in the desert');
    gameState.world.isInterior = true;
    assert.equal(krakenAmbushDue('DESERT'), false, 'never indoors');
    gameState.world.isInterior = false;
    const desert = new BiomeModel(BIOME_DEFINITIONS.DESERT);
    const real = Math.random;
    try {
        Math.random = () => 0;
        assert.deepEqual(desert.getEncounter(12), { id: 'dry_kraken_ambush' }, 'a step on the sand can wake it');
        assert.deepEqual(storyAmbush('DESERT'), { id: 'dry_kraken_ambush' });
        Math.random = () => 0.99;
        assert.equal(storyAmbush('DESERT'), null, 'but not every step');
    } finally { Math.random = real; }
    finish('codey3');
    assert.equal(krakenAmbushDue('DESERT'), false, 'once killed, it is gone');
    story({ active: [], completed: ['codey3'] });
    assert.equal(krakenAmbushDue('DESERT'), false);
});

test('the ambush: the desert goes still, the kraken rises with Codey in its grip, and the fight (no escape) leads to his freeing', () => {
    assert.equal(AMBUSH.personal, false, 'the world\'s story: the party near you is pulled in');
    const path = walk(AMBUSH, AMBUSH.initialStage);
    assert.deepEqual(path, ['stillness', 'breath', 'rises', 'captive', 'signal']);
    const battle = results(AMBUSH, 'signal').find(r => r.type === 'START_BATTLE');
    assert.deepEqual(battle.payload.enemies, ['DRY_KRAKEN', ...Array(8).fill('DRY_KRAKEN_TENTACLE')]);
    assert.equal(battle.payload.noEscape, true);
    assert.equal(battle.payload.afterVictory.encounterId, 'codey_freed');
    assert.ok(FREED.stages[FREED.initialStage]);
    assert.ok(results(FREED, 'signs').some(r => r.type === 'END_ENCOUNTER'));
    assert.equal(AMBUSH.stages.rises.image.size, 192, 'the kraken\'s picture is a 192 px frame');
});

test('voiced: the Stranger\'s desert lines in his voice, the ambush and the freeing by the narrator alone (Codey never speaks)', () => {
    assert.deepEqual(VOICED.dry_kraken_ambush, []);
    assert.deepEqual(VOICED.codey_freed, []);
    for (const id of ['dry_kraken_ambush', 'codey_freed']) for (const l of linesOf(id, encounterDefinitions[id])) assert.equal(l.speaker, 'NARRATOR');
    const desert = linesOf('hooded_stranger', S).filter(l => /codey|desert/.test(l.stageId));
    assert.ok(desert.some(l => l.speaker === 'STRANGER') && desert.some(l => l.speaker === 'NARRATOR'));
});

test('an encounter picture with cells larger than 128 px (the kraken\'s 192) keeps its size on the way to the screen', async () => {
    const { EncounterModel } = await import('../../shared/story/encounterModel.js');
    const src = (await import('node:fs')).readFileSync(new URL('../../shared/story/encounterModel.js', import.meta.url), 'utf8');
    assert.match(src, /size: stage\.image\.size/);
    assert.ok(EncounterModel);
});
