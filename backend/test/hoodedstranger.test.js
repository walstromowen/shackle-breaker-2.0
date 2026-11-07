// backend/test/hoodedstranger.test.js: `npm test`. The Hooded Stranger hands out (and takes back) every step of the Shackled questline. There is only one
// of him, in one village workshop; what he says first depends on the player's quests; handing a step in pays its rewards and gives the next one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameState, resetWorldForNewGame } from '../../shared/core/gameState.js';
import { QuestDefinitions as Q } from '../../shared/story/questDefinitions.js';
import { QuestModel } from '../../shared/story/questModel.js';
import { QuestSystem } from '../../shared/story/questSystem.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { STRANGER_CHAIN } from '../../shared/story/encounters/story/hoodedStranger.js';
import { InteriorFactory } from '../../shared/world/interiorFactory.js';
import { MAP_OBJECTS_DEFINITIONS as M } from '../../shared/world/mapObjectDefinitions.js';
import { EncounterLogic } from '../../frontend/src/screens/encounter/encounterLogic.js';

const E = encounterDefinitions.hooded_stranger;
const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const freshQuests = () => { gameState.quests = { active: {}, completed: [], trackedIds: [] }; gameState.party.members = []; };
const results = (stageId) => E.stages[stageId].decisions[0].outcomes[0].results;

test('he is one NPC with his own sheet and picture, in a personal encounter', () => {
    assert.equal(M.HOODED_STRANGER_NPC.interaction.id, 'hooded_stranger');
    assert.equal(E.personal, true, 'never shared or voted on in a party');
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    for (const key of ['hoodedStrangerSprite', 'encounter_hooded_stranger']) {
        const m = main.match(new RegExp(`${key}: '([^']+)'`));
        assert.ok(m && fs.existsSync(new URL(`../../frontend/src/${m[1].replace('./', '')}`, import.meta.url)), `${key} is a real file`);
    }
});

test('every step of the questline is handed in to him, none starts the next by itself, and a new game starts by finding him', () => {
    for (const id of STRANGER_CHAIN) {
        assert.equal(Q[id].turnIn, 'HOODED_STRANGER', `${id} is handed in to him`);
        assert.ok(!(Q[id].rewards.quests || []).length, `${id} does not start the next step itself`);
    }
    assert.ok(Q.shackled_stranger.objectives.some(o => o.type === 'talk' && o.targetId === 'HOODED_STRANGER'));
    const creator = fs.readFileSync(new URL('../../frontend/src/screens/characterCreator/characterCreatorLogic.js', import.meta.url), 'utf8');
    assert.match(creator, /startQuest\(gameState, 'shackled_stranger'\)/);
});

test('what he opens with follows the quests: first meeting, a reminder, a hand-in, a step not yet given, and the end', () => {
    freshQuests();
    QuestModel.startQuest(gameState, 'shackled_stranger');
    assert.equal(E.initialStage(), 'meet');
    freshQuests();
    gameState.quests.completed = ['shackled_stranger'];
    QuestModel.startQuest(gameState, 'shackled2');
    assert.equal(E.initialStage(), 'give_shackled1', 'shackled1 was never given');
    gameState.quests.completed.push('shackled1');
    assert.equal(E.initialStage(), 'waiting_shackled2');
    for (const o of Q.shackled2.objectives) QuestModel.updateProgress(gameState, 'shackled2', o.id, o.amount || 1);
    assert.equal(E.initialStage(), 'turnin_shackled2');
    gameState.quests = { active: {}, completed: [...STRANGER_CHAIN], trackedIds: [] };
    assert.equal(E.initialStage(), 'after_darius');
    // every stage an opening can name exists
    for (const id of STRANGER_CHAIN.slice(1)) for (const k of ['give', 'waiting', 'turnin']) assert.ok(E.stages[`${k}_${id}`], `${k}_${id}`);
});

test('the first meeting hands in "find him" and gives the first step; a hand-in pays its rewards and leads to the next step', () => {
    QuestSystem.init();
    freshQuests();
    QuestModel.startQuest(gameState, 'shackled_stranger');
    const model = { context: {}, instanceId: 't' };
    quiet(() => EncounterLogic.resolveResults(results('meet_4'), model, null));
    assert.ok(gameState.quests.completed.includes('shackled_stranger'));
    assert.ok(gameState.quests.active.shackled1, 'he gave the first step');

    for (const o of Q.shackled1.objectives) QuestModel.updateProgress(gameState, 'shackled1', o.id, o.amount || 1);
    const coins = gameState.party.currency || 0;
    const r = quiet(() => EncounterLogic.resolveResults(results('turnin_shackled1'), model, null));
    assert.ok(gameState.quests.completed.includes('shackled1'));
    assert.equal(gameState.party.currency, coins + Q.shackled1.rewards.currency, 'its rewards are paid');
    assert.equal(r.newStageId, 'give_shackled2', 'on to the next step');
    quiet(() => EncounterLogic.resolveResults(results('give_shackled2'), model, null));
    assert.ok(gameState.quests.active.shackled2);
});

test('only one workshop in the world has him: the first one entered', () => {
    resetWorldForNewGame();
    const a = InteriorFactory.create(1234, 'ABANDONED_WORKSHOP', '10_20');
    const b = InteriorFactory.create(1234, 'ABANDONED_WORKSHOP', '90_-40');
    const again = InteriorFactory.create(1234, 'ABANDONED_WORKSHOP', '10_20');
    const has = (g) => { for (let r = g.bounds.minR; r <= g.bounds.maxR; r++) for (let c = g.bounds.minC; c <= g.bounds.maxC; c++) if (g.getObjectIdAt(c, r) === 'HOODED_STRANGER_NPC') return true; return false; };
    assert.equal(gameState.world.strangerHome, '10_20');
    assert.ok(has(a), 'he is in the first workshop');
    assert.ok(!has(b), 'and in no other');
    assert.ok(has(again), 'and still there on the next visit');
    resetWorldForNewGame();
    assert.equal(gameState.world.strangerHome, null, 'a new world: he has not chosen yet');
});

test('the first step reads "Find someone who can help" in the tracker and the journal', () => {
    const o = Q.shackled_stranger.objectives[0];
    assert.equal(o.description, 'Find someone who can help');
    const journal = fs.readFileSync(new URL('../../frontend/src/screens/journal/journalRenderer.js', import.meta.url), 'utf8');
    assert.match(journal, /if \(obj\.description\)/, 'the journal shows an objective\'s own words');
});

test('in multiplayer there is still only one: the host\'s world decides, and a joining guest gets it with the world', async () => {
    const { worldPart, mergeParts, playerPart } = await import('../../shared/core/multiplayerSave.js');
    const data = { seed: 7, world: { strangerHome: '10_20', changes: {} }, quests: { active: {}, completed: [], trackedIds: [] }, player: {}, party: {} };
    const joined = mergeParts(worldPart(data), playerPart({ ...data, world: { strangerHome: 'someone_elses' } }));
    assert.equal(joined.world.strangerHome, '10_20', 'the guest takes the host\'s workshop, not its own');
    const session = fs.readFileSync(new URL('../../frontend/src/engine/multiplayerSession.js', import.meta.url), 'utf8');
    assert.match(session, /case 'stranger_claim':[\s\S]*if \(!gameState\.world\.strangerHome/, 'the host keeps the first claim');
    assert.match(session, /case 'stranger_home':[\s\S]*this\.role === 'guest'/, 'guests take the host\'s answer');
    // a claim made while a session is on goes through the hook (InteriorFactory.onStrangerHome), and is made only once
    resetWorldForNewGame();
    const claims = [];
    InteriorFactory.onStrangerHome = (id) => claims.push(id);
    try {
        InteriorFactory.create(1, 'ABANDONED_WORKSHOP', '1_1');
        InteriorFactory.create(1, 'ABANDONED_WORKSHOP', '2_2');
    } finally { InteriorFactory.onStrangerHome = null; }
    assert.deepEqual(claims, ['1_1']);
});
