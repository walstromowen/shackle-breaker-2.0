// backend/test/amputators.test.js: `npm test`. The Amputators, the game's first covenant: Osric of the Saw sits among the stones of the first small graveyard
// the player comes upon in act 1; his errand (put Brother Garrick, an Amputator going mad, to rest: Garrick stands somewhere the party can walk to, marked on
// the map); his oath, which gives the Amputator's Saw and is the player's own (one covenant at a time).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { QuestDefinitions as Q, STORY_QUESTS } from '../../shared/story/questDefinitions.js';
import { WorldManager } from '../../shared/world/worldManager.js';
import { MAP_OBJECTS_DEFINITIONS as M } from '../../shared/world/mapObjectDefinitions.js';
import { ENTITY_DEFINITIONS as E } from '../../shared/characters/entityDefinitions.js';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';
import { LootTableDefinitions } from '../../shared/items/lootTableDefinitions.js';
import { COVENANTS, Covenants } from '../../shared/story/covenants.js';
import { STORY_HOMES } from '../../shared/world/interiorFactory.js';
import { isWorldFlag } from '../../shared/story/worldStory.js';
import { VOICED } from '../../shared/story/voiceLines.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const OSRIC = encounterDefinitions.amputator_osric, GARRICK = encounterDefinitions.amputator_garrick;
const story = ({ milestones = [], completed = [], active = {} } = {}) => {
    gameState.milestones = milestones.slice();
    gameState.quests = { active: { ...active }, completed: completed.slice(), trackedIds: [] };
    gameState.world.changes = {};
};
const results = (decision) => decision.outcomes[0].results;

test('the Amputators: a covenant, its two characters, their map objects, encounters, quest and weapon', () => {
    const cv = COVENANTS.amputators;
    assert.equal(cv.leader, 'AMPUTATOR_OSRIC');
    assert.ok(ItemDefinitions[cv.gift], 'the oath\'s gift is a real item');
    assert.ok(M.OSRIC_NPC && M.OSRIC_NPC.interaction.id === 'amputator_osric');
    assert.ok(M.GARRICK_NPC && M.GARRICK_NPC.interaction.id === 'amputator_garrick' && M.GARRICK_NPC.interaction.triggerRadius > 0, 'coming near Garrick starts his scene');
    for (const id of ['amputator_osric', 'amputator_garrick', 'amputator_garrick_fallen']) {
        assert.ok(encounterDefinitions[id], id);
        assert.ok(VOICED[id], `${id} is voiced`);
    }
    assert.ok(E.AMPUTATOR_GARRICK.tags.includes('AMPUTATOR') && E.AMPUTATOR_GARRICK.equipment.mainHand === 'amputators_saw');
    for (const it of LootTableDefinitions[E.AMPUTATOR_GARRICK.lootTableId].items) assert.ok(ItemDefinitions[it.id], it.id);
    const q = Q.amputators_trial;
    assert.equal(q.turnIn, 'AMPUTATOR_OSRIC');
    assert.deepEqual(q.objectives.map(o => [o.type, o.targetId]), [['kill_enemy', 'AMPUTATOR_GARRICK']]);
    assert.ok(STORY_QUESTS.has('amputators_trial'), 'a party goes through it together');
    assert.ok(isWorldFlag('osric_met') && isWorldFlag('garrick_slain'), 'his story is the world\'s');
    assert.ok(!isWorldFlag(cv.milestone), 'the oath is the player\'s own');
    assert.ok(STORY_HOMES.includes('amputatorGraveyard') && STORY_HOMES.includes('amputatorQuarry'));
});

test('Osric opens with what this player\'s story has: the meeting, the errand, the oath, the brother', () => {
    const at = (opts) => { story(opts); return OSRIC.initialStage(); };
    assert.equal(at({}), 'meet');
    assert.equal(at({ milestones: ['osric_met'] }), 'again', 'met, the errand turned down');
    assert.equal(at({ milestones: ['osric_met'], active: { amputators_trial: { progress: {} } } }), 'waiting');
    assert.equal(at({ milestones: ['osric_met'], completed: ['amputators_trial'] }), 'offer_again');
    assert.equal(at({ milestones: ['osric_met', 'covenant_amputators'], completed: ['amputators_trial'] }), 'member');
    // taking the errand: the quest, Garrick's spot (and the pin), Osric met
    const take = OSRIC.stages.task_3.decisions.find(d => /find him/.test(d.text));
    const types = results(take).map(r => r.type);
    assert.ok(['GRANT_MILESTONE', 'START_QUEST', 'AMPUTATOR_QUARRY'].every(t => types.includes(t)));
    // the oath: joins, and gives the saw
    const oath = OSRIC.stages.offer.decisions[0];
    assert.ok(results(oath).some(r => r.type === 'JOIN_COVENANT' && r.payload.covenantId === 'amputators'));
    assert.ok(results(oath).some(r => r.type === 'GIVE_ITEM' && r.payload.itemId === 'amputators_saw'));
    // Garrick: a fight, then his last words put him to rest and take him off the map
    const fight = results(GARRICK.stages.g_3.decisions[0]).find(r => r.type === 'START_BATTLE');
    assert.equal(fight.payload.enemies[0].id, 'AMPUTATOR_GARRICK');
    assert.equal(fight.payload.afterVictory.encounterId, 'amputator_garrick_fallen');
    const rest = results(GARRICK.stages.fallen.decisions[0]);
    assert.ok(rest.some(r => r.type === 'GRANT_MILESTONE' && r.payload.id === 'garrick_slain'));
    assert.ok(rest.some(r => r.type === 'REMOVE_STORY_NPC' && r.payload.objectId === 'GARRICK_NPC'));
});

test('one covenant at a time: swearing to the Amputators is this player\'s own oath', () => {
    story({ milestones: ['osric_met', 'covenant_other'] });
    assert.equal(Covenants.of(), null);
    assert.equal(Covenants.join('amputators'), true);
    assert.equal(Covenants.of(), 'amputators');
    assert.equal(Covenants.join('amputators'), false, 'not twice');
    assert.ok(gameState.milestones.includes('covenant_amputators'));
});

test('in act 1 the first graveyard the player comes upon becomes Osric\'s; Garrick is put where the party can walk to, until he is put to rest', () => {
    quiet(() => {
        for (const seed of [4242, 1000, 77]) {
            story({});
            Object.assign(gameState.world, { amputatorGraveyard: null, amputatorQuarry: null, isInterior: false, structureChunks: {}, nikoliCampfire: null });
            gameState.seed = seed;
            const wm = new WorldManager();
            const sp = wm.findSpawnPoint();
            gameState.player.col = sp.col; gameState.player.row = sp.row;
            for (let y = sp.row - 160; y <= sp.row + 160; y += 16) for (let x = sp.col - 160; x <= sp.col + 160; x += 16) wm.ensureChunkLoaded(x, y);
            const all = [...(wm._graveCandidates || [])].map(k => k.split(',').map(Number));
            // a graveyard: three or more stones in one plot (a village's lone roadside stone is not one, and is never claimed)
            const stones = all.filter(([c, r]) => all.filter(([c2, r2]) => Math.abs(c2 - c) <= 6 && Math.abs(r2 - r) <= 6).length >= 3);
            assert.ok(stones.length, `seed ${seed}: there are graveyards near the start`);
            const lone = all.find(([c, r]) => all.filter(([c2, r2]) => Math.abs(c2 - c) <= 12 && Math.abs(r2 - r) <= 12).length === 1);
            if (lone) assert.equal(wm.noticeAmputatorGraveyard(lone[0], lone[1]), false, 'a lone roadside stone is not a graveyard');
            // far from every stone: nothing is claimed
            assert.equal(wm.noticeAmputatorGraveyard(sp.col + 900, sp.row + 900), false);
            const [gc, gr] = stones[0];
            assert.equal(wm.noticeAmputatorGraveyard(gc, gr + 6), true, `seed ${seed}: claimed when the player comes near`);
            const [oc, or] = gameState.world.amputatorGraveyard.split(',').map(Number);
            assert.ok(Math.abs(oc - gc) <= 8 && Math.abs(or - gr) <= 8, 'Osric sits among its stones');
            assert.equal(wm.getObjectAt(oc, or).id, 'OSRIC_NPC');
            assert.equal(wm.noticeAmputatorGraveyard(gc, gr), false, 'claimed once');
            // the errand, taken standing beside him
            gameState.player.col = oc; gameState.player.row = or + 1;
            const q = wm.pickAmputatorQuarry();
            assert.ok(q, `seed ${seed}: somewhere for Garrick`);
            const d = Math.hypot(q[0] - oc, q[1] - or);
            assert.ok(d >= 18 && d <= 30, `out of sight of the graveyard (${d.toFixed(1)})`);
            assert.deepEqual(wm.pickAmputatorQuarry(), q, 'picked once');
            wm.refreshStoryObjects();
            assert.equal(wm.getObjectAt(q[0], q[1]).id, 'GARRICK_NPC');
            gameState.world.changes['story:garrick_slain'] = true;
            wm.refreshStoryObjects();
            assert.ok(!wm.getObjectAt(q[0], q[1]) || wm.getObjectAt(q[0], q[1]).id !== 'GARRICK_NPC', 'gone once put to rest');
        }
    });
});

test('after act 1 no graveyard is claimed: Osric is only ever met in act 1', () => {
    quiet(() => {
        story({ milestones: ['act2'] });
        gameState.world.changes['story:act2'] = true;
        Object.assign(gameState.world, { amputatorGraveyard: null, amputatorQuarry: null, isInterior: false, structureChunks: {} });
        gameState.seed = 4242;
        const wm = new WorldManager();
        const sp = wm.findSpawnPoint();
        for (let y = sp.row - 160; y <= sp.row + 160; y += 16) for (let x = sp.col - 160; x <= sp.col + 160; x += 16) wm.ensureChunkLoaded(x, y);
        assert.equal((wm._graveCandidates || new Set()).size, 0);
        assert.equal(gameState.world.amputatorGraveyard, null);
    });
});
