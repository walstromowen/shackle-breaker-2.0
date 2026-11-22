// backend/test/stranger_stone.test.js: `npm test`. The Hooded Stranger has the stone, and the player is never sent to find one. Handing in shackled3
// rouses the King's Arc Knight at his gate; once the knight is dead he trusts the player with his stone: buried under an old gravestone he marks on the
// map (world.strangerGrave), dug up through the Old Gravestone's own encounter (a choice of its own there).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { QuestDefinitions as Q } from '../../shared/story/questDefinitions.js';
import { QuestModel } from '../../shared/story/questModel.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { MAP_OBJECTS_DEFINITIONS as M } from '../../shared/world/mapObjectDefinitions.js';
import { WorldManager } from '../../shared/world/worldManager.js';
import { getMarkers } from '../../shared/world/mapMarkers.js';
import { EncounterLogic } from '../../frontend/src/screens/encounter/encounterLogic.js';

const E = encounterDefinitions.hooded_stranger;
const G = encounterDefinitions.old_gravestone;
const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const nextOf = (id) => (E.stages[id].decisions[0].outcomes || []).flatMap(o => o.results).find(r => r.type === 'ADVANCE_STAGE')?.payload.stageId;
const save = () => ({ milestones: gameState.milestones, quests: gameState.quests, changes: gameState.world.changes, grave: gameState.world.strangerGrave, home: gameState.world.strangerHome, markers: gameState.world.mapMarkers });
const restore = (s) => { gameState.milestones = s.milestones; gameState.quests = s.quests; gameState.world.changes = s.changes; gameState.world.strangerGrave = s.grave; gameState.world.strangerHome = s.home; gameState.world.mapMarkers = s.markers; };

test('no step asks the player to find a stone (one legionary, no watchmen): shackled7 is his stone, dug up, given only once the Arc Knight at his gate is dead', () => {
    const chain = ['shackled_stranger', 'shackled1', 'shackled2', 'shackled3', 'shackled7', 'shackled8'].flatMap(id => Q[id].objectives);
    assert.equal(chain.filter(o => o.targetId === 'LEGIONARY').reduce((n, o) => n + o.amount, 0), 1, 'the whole chain: one legionary');
    assert.ok(!chain.some(o => o.targetId === 'WATCHMAN'), 'and no watchmen');
    const kept = save();
    try {
        gameState.milestones = [];
        gameState.world.changes = {};
        gameState.quests = { active: {}, completed: ['shackled_stranger', 'shackled1', 'shackled2', 'shackled3'], trackedIds: [] };
        assert.equal(E.initialStage(), 'knight_waits', 'while the knight stands at the gate he only says so');
        gameState.world.changes['story:arc_knight_slain'] = true;
        assert.equal(E.initialStage(), 'offer_shackled7');
        assert.equal(nextOf(nextOf('offer_shackled7')), 'trust_shackled7', 'he trusts you now');
        assert.equal(nextOf('trust_shackled7'), 'give_shackled7');
        const give = E.stages.give_shackled7.decisions[0].outcomes[0].results;
        assert.ok(give.some(r => r.type === 'START_QUEST' && r.payload.questId === 'shackled7'));
        assert.match(E.stages.give_shackled7.text, /buried it under an old grave/);
        // handing in shackled3 ends on the knight at his gate, not on a new step
        assert.equal(nextOf(nextOf('lore_shackled3')), 'knight_at_gate');
        // and handing in the stone: he lets you keep it, then the story of how he came by it, then Darius
        assert.equal(nextOf(nextOf('lore_shackled7')), 'give_shackled8');
        assert.match(E.stages.lore_shackled7_2.text, /I found it/);
    } finally { restore(kept); }
});

test('his grave: picked out in the open near his workshop, pinned on the map, dug up through the Old Gravestone, and gone after', () => {
    const kept = save();
    try {
        quiet(() => {
            gameState.seed = 4242; gameState.milestones = []; gameState.world.mapMarkers = [];
            Object.assign(gameState.world, { changes: {}, terrainOverrides: {}, levelPaths: {}, isInterior: false, structureChunks: {}, strangerHome: null, strangerGrave: null });
            const wm = new WorldManager();
            const sp = wm.findSpawnPoint();
            for (let y = sp.row - 96; y <= sp.row + 96; y += 16) for (let x = sp.col - 96; x <= sp.col + 96; x += 16) wm.ensureChunkLoaded(x, y);
            const door = Object.entries(gameState.world.changes).find(([, v]) => v && /WORKSHOP_DOOR/.test(v))[0].split(',').map(Number);
            gameState.world.strangerHome = `${door[0]}_${door[1]}`;
            gameState.quests = { active: {}, completed: [], trackedIds: [] };
            assert.equal(wm.noticeStrangerGrave(), null, 'not before his quest');
            gameState.party.members = [];
            QuestModel.startQuest(gameState, 'shackled7');
            const at = wm.noticeStrangerGrave();
            assert.ok(at, 'picked');
            const far = Math.hypot(at[0] - door[0], at[1] - door[1]);
            assert.ok(far >= 18 && far <= 32, `away from his door (${far.toFixed(1)})`);
            assert.equal(gameState.world.strangerGrave, `${at[0]},${at[1]}`);
            assert.ok(getMarkers().some(m => m.col === at[0] && m.row === at[1] && m.color === 'gold'), 'a gold pin on the map');
            assert.deepEqual(wm.noticeStrangerGrave(), at, 'picked once');
            assert.equal(getMarkers().length, 1, 'one pin');
            assert.equal(wm._storyObjects().get(`${at[0]},${at[1]}`), 'STRANGER_GRAVE');
            assert.equal(M.STRANGER_GRAVE.interaction.id, 'old_gravestone', 'an Old Gravestone to look at');

            // the grave's encounter: his choice only there, the other digs not
            const here = { col: at[0], row: at[1] }, elsewhere = { col: at[0] + 5, row: at[1] };
            const ds = G.stages.approach.decisions;
            const his = ds.find(d => (d.conditions || []).some(c => c.type === 'at_story_place'));
            assert.ok(EncounterLogic.checkConditions(his, here) && !EncounterLogic.checkConditions(his, elsewhere));
            const digs = ds.filter(d => d.type === 'skill_check');
            assert.ok(digs.every(d => !(d.conditions || []).filter(c => c.type === 'not_at_story_place').every(c => EncounterLogic.checkConditions({ conditions: [c] }, here))), 'no grave-robbing his grave');
            assert.ok(digs.every(d => EncounterLogic.checkConditions({ conditions: (d.conditions || []).filter(c => c.type === 'not_at_story_place') }, elsewhere)), 'every other grave as before');

            // digging it up: the stone, the step done (with the level), the pin and the grave gone
            const inv = gameState.party.inventory; gameState.party.inventory = [];
            const res = G.stages.his_stone.decisions[0].outcomes[0].results;
            EncounterLogic.resolveResults(res, { context: here, instanceId: 't' }, wm);
            assert.ok(gameState.party.inventory.some(i => i.defId === 'meteorite'), 'his stone: the Fallen Meteorite (the altar wakes Darius with it)');
            assert.equal(gameState.quests.active.shackled7.progress.obj_dig_stone, 1, 'the step: dug up');
            assert.ok(!getMarkers().some(m => m.col === at[0] && m.row === at[1]), 'the pin comes off');
            assert.equal(wm._storyObjects().get(`${at[0]},${at[1]}`), undefined, 'and the grave is nobody\'s again');
            assert.equal(EncounterLogic.checkConditions(his, here), false, 'nothing more to dig');
            gameState.party.inventory = inv;
        });
    } finally { restore(kept); }
});
