// backend/test/worldstory.test.js: `npm test`. Multiplayer option 3: the story's state belongs to the world (story/worldStory.js), like Dark Souls.
// Everyone in a world sees the same story characters in the same places; a guest's choices change the host's world and are not carried home; the
// story's choices are voted on by the party near you; the story's quests are shared with your party; each player still hands in their own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameState } from '../../shared/core/gameState.js';
import { worldSync } from '../../shared/core/worldSync.js';
import { WORLD_FLAGS, hasWorldFlag, setWorldFlag } from '../../shared/story/worldStory.js';
import { ActSystem } from '../../shared/story/actSystem.js';
import { QuestDefinitions as Q, STORY_QUESTS } from '../../shared/story/questDefinitions.js';
import { encounterDefinitions as E } from '../../shared/story/encounterDefinitions.js';
import { WorldManager } from '../../shared/world/worldManager.js';

const clean = () => {
    gameState.milestones = [];
    gameState.quests = { active: {}, completed: [], trackedIds: [] };
    gameState.world.changes = {};
    worldSync.ownsWorld = true;
    worldSync.onLocalChange = null;
};

test('a world flag is kept in the world\'s changes, saved with the world and sent to the other players', () => {
    clean();
    const sent = [];
    worldSync.onLocalChange = (k, v) => sent.push([k, v]);
    assert.equal(setWorldFlag('nikoli_told'), true);
    assert.equal(gameState.world.changes['story:nikoli_told'], true);
    assert.deepEqual(sent, [['story:nikoli_told', true]]);
    assert.equal(setWorldFlag('nikoli_told'), false, 'only once');
    assert.ok(ActSystem.hasMilestone('nikoli_told'));
    clean();
});

test('ActSystem routes the story\'s flags to the world, and keeps a player\'s other milestones their own', () => {
    clean();
    for (const id of ['act2', 'act3', 'nikoli_told', 'jaeger_told', 'stranger_met', 'codey_back']) assert.ok(WORLD_FLAGS.has(id), id);
    ActSystem.grantMilestone('act2');
    assert.equal(gameState.world.changes['story:act2'], true, 'the act is the world\'s');
    assert.equal(ActSystem.getAct(), 2);
    ActSystem.grantMilestone('some_personal_thing');
    assert.equal(gameState.world.changes['story:some_personal_thing'], undefined, 'not a world flag: the player\'s own');
    assert.ok(gameState.milestones.includes('some_personal_thing'));
    clean();
});

test('a guest: the host\'s world decides; the guest\'s own saved story does not leak in, and their choices are not written home', () => {
    clean();
    gameState.milestones = ['act2', 'nikoli_told'];        // what the guest did in their own world
    worldSync.ownsWorld = false;
    assert.equal(ActSystem.hasMilestone('nikoli_told'), false, 'not in the host\'s world');
    assert.equal(ActSystem.getAct(), 1, 'the host\'s world is still in act 1');
    gameState.world.changes['story:jaeger_met'] = true;    // the host's world: someone met Jaeger
    assert.equal(ActSystem.hasMilestone('jaeger_met'), true);
    ActSystem.grantMilestone('jaeger_told');
    assert.equal(gameState.world.changes['story:jaeger_told'], true, 'the guest\'s choice changes the host\'s world');
    assert.ok(!gameState.milestones.includes('jaeger_told'), 'and is not carried home');
    clean();
});

test('a player\'s own world (single player, or the host): older saves need no migration', () => {
    clean();
    gameState.milestones = ['act2', 'nikoli_told'];
    assert.equal(ActSystem.hasMilestone('nikoli_told'), true);
    gameState.quests.completed = ['shackled_stranger', 'codey3'];
    assert.equal(hasWorldFlag('stranger_met'), true, 'read from the quest it came from');
    assert.equal(hasWorldFlag('codey_back'), true);
    worldSync.ownsWorld = false;
    assert.equal(hasWorldFlag('stranger_met'), false, 'but never in someone else\'s world');
    clean();
});

test('a flag from another player lands in the world\'s changes without disturbing the map', () => {
    clean();
    const wm = Object.create(WorldManager.prototype);
    wm.CHUNK_SIZE = 32; wm._unloadChunk = () => { throw new Error('a story flag is not a cell'); };
    wm.applyRemoteChange('story:brothers_done', true);
    assert.equal(gameState.world.changes['story:brothers_done'], true);
    assert.equal(ActSystem.hasMilestone('brothers_done'), true);
    clean();
});

test('the story\'s scenes are shared and voted on; the Hooded Stranger stays personal (he hands in each player\'s own quests)', () => {
    for (const id of ['nikoli', 'nikoli_after_battle', 'brothers_won', 'jaeger', 'codey', 'stranger_mark', 'brothers_sword', 'pursuer', 'pursuer_won', 'dry_kraken_ambush', 'codey_freed']) {
        assert.equal(E[id].personal, false, `${id} is the world's`);
    }
    assert.equal(E.hooded_stranger.personal, true);
});

test('the story\'s quests are shared with the party; a player still hands in their own', () => {
    for (const id of STORY_QUESTS) assert.ok(Q[id], `${id} is a real quest`);
    assert.ok(!STORY_QUESTS.has('shackled_stranger'), 'finding him is every player\'s own start');
    const social = fs.readFileSync(new URL('../../frontend/src/engine/multiplayerSocial.js', import.meta.url), 'utf8');
    assert.match(social, /events\.on\('QUEST_STARTED'[\s\S]*STORY_QUESTS\.has\(questId\)[\s\S]*k: 'q_share'/, 'a story quest started is sent to the party');
    assert.match(social, /case 'q_share':[\s\S]*myGroup\(\)[\s\S]*START_QUEST/, 'a party member\'s story quest is started here too');
    assert.match(social, /this\._sharingQuest === questId/, 'and not sent back round again');
    const session = fs.readFileSync(new URL('../../frontend/src/engine/multiplayerSession.js', import.meta.url), 'utf8');
    assert.match(session, /this\.role = 'guest';\s*worldSync\.ownsWorld = false;/);
    assert.match(session, /worldSync\.ownsWorld = true;/);
});
