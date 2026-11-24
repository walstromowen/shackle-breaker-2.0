// backend/test/arcknight.test.js: `npm test`. An Arc Knight, act 1's mini boss: roused when the Hooded Stranger's "Sparks of the Mad" (shackled3) is
// handed in, he paces his beat before the Stranger's workshop door (the clock's: every player sees him in the same place) until he is put down.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameState } from '../../shared/core/gameState.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { ENTITY_DEFINITIONS as E } from '../../shared/characters/entityDefinitions.js';
import { MAP_OBJECTS_DEFINITIONS as M } from '../../shared/world/mapObjectDefinitions.js';
import { LootTableDefinitions } from '../../shared/items/lootTableDefinitions.js';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { isWorldFlag } from '../../shared/story/worldStory.js';
import { VOICED } from '../../shared/story/voiceLines.js';
import { WorldManager } from '../../shared/world/worldManager.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const results = (d) => d.outcomes[0].results;

test('an Arc Knight: a boss of his own, his art, his scene and fight, voiced, and the Stranger\'s hand-in rouses him', () => {
    const k = E.ARC_KNIGHT;
    assert.equal(k.name, 'Arc Knight', 'one of the Arc Knights, not a name of his own');
    assert.ok(k.tags.includes('BOSS') && k.tags.includes('ALTERIAN'));
    for (const a of k.abilities) assert.ok(AbilityDefinitions[a], a);
    for (const it of LootTableDefinitions[k.lootTableId].items) assert.ok(ItemDefinitions[it.id], it.id);
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    const asset = (key) => { const m = new RegExp(`\\b${key}:\\s*'\\./(assets/[^']+)'`).exec(main); return m && new URL('../../frontend/src/' + m[1], import.meta.url); };
    const size = (u) => { const b = fs.readFileSync(u); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
    assert.deepEqual(size(asset(k.spritePortrait)), [2048, 256], 'the battle sheet: two rows of sixteen 128 px frames');
    assert.deepEqual(size(asset(k.spriteOverworld)), [512, 768], 'the overworld sheet');
    assert.equal(M.ARC_KNIGHT_NPC.interaction.id, 'arc_knight');
    for (const [id, facing] of [['ARC_KNIGHT_NPC', 'UP'], ['ARC_KNIGHT_NPC_LEFT', 'LEFT'], ['ARC_KNIGHT_NPC_RIGHT', 'RIGHT']]) {
        assert.equal(M[id].interaction.id, 'arc_knight');
        assert.equal(M[id].interaction.triggerRadius, 1, 'coming near him is the meeting');
        assert.ok(!M[id].interaction.onArrival, 'not the moment you walk out of the door');
        assert.equal(M[id].character.facing, facing, 'facing into the yard');
    }
    // his words: few, and only his errand (the narrator tells what he does, not what he thinks)
    const enc0 = encounterDefinitions.arc_knight;
    assert.deepEqual(Object.keys(enc0.stages).filter(id => id.startsWith('ak_')), ['ak_meet', 'ak_hold', 'ak_4'], 'three stages, then the fight');
    assert.ok(!/"/.test(enc0.stages.ak_meet.text), 'the first is the narrator\'s alone: he is introduced');
    assert.match(enc0.stages.ak_hold.text, /"Hold\."[\s\S]*"He knows your face\."/);
    assert.match(enc0.stages.ak_4.text, /blade[\s\S]*throat[\s\S]*"Stand still, shackled one\. It is easier this way\."/);
    const enc = encounterDefinitions.arc_knight;
    const fight = results(enc.stages.ak_4.decisions[0]).find(r => r.type === 'START_BATTLE');
    assert.equal(fight.payload.enemies[0].id, 'ARC_KNIGHT');
    assert.equal(fight.payload.afterVictory.encounterId, 'arc_knight_fallen');
    assert.equal(enc.stages.ak_hold.bgm, fight.payload.bgm, 'the battle music starts as he speaks, before you draw, and carries into the fight');
    assert.equal(enc.stages.ak_4.bgm, fight.payload.bgm);
    assert.ok(!enc.stages.ak_meet.bgm, 'not while he is only introduced');
    const rest = results(encounterDefinitions.arc_knight_fallen.stages.fallen_2.decisions[0]);
    assert.ok(rest.some(r => r.type === 'GRANT_MILESTONE' && r.payload.id === 'arc_knight_slain'));
    assert.ok(isWorldFlag('arc_knight_roused') && isWorldFlag('arc_knight_slain'), 'the world\'s story');
    assert.ok(VOICED.arc_knight && VOICED.arc_knight_fallen, 'voiced');
    const handIn = results(encounterDefinitions.hooded_stranger.stages.turnin_shackled3.decisions[0]);
    assert.ok(handIn.some(r => r.type === 'COMPLETE_QUEST' && r.payload.questId === 'shackled3'));
    assert.ok(handIn.some(r => r.type === 'GRANT_MILESTONE' && r.payload.id === 'arc_knight_roused'), 'handing in Sparks of the Mad rouses him');
});

test('once roused he stands in the gate of the Stranger\'s yard, the only way out (the fence mended round him), until put down', () => {
    gameState.milestones = []; gameState.quests = { active: {}, completed: [], trackedIds: [] };
    Object.assign(gameState.world, { changes: {}, terrainOverrides: {}, levelPaths: {}, isInterior: false, strangerHome: '40_12', amputatorGraveyard: null, amputatorQuarry: null, nikoliCampfire: null });
    const wm = Object.create(WorldManager.prototype);
    const objs = () => [...WorldManager.prototype._storyObjects.call(wm)];
    const knight = () => objs().filter(([, id]) => /^ARC_KNIGHT_NPC/.test(id)).map(([k, id]) => `${k} ${id}`);
    assert.deepEqual(knight(), [], 'not before the hand-in');
    gameState.quests.completed = ['shackled3'];
    assert.deepEqual(knight(), ['40,15 ARC_KNIGHT_NPC'], 'an older save that handed it in: he is there, in the south gate (three rows below the door)');
    gameState.quests.completed = [];
    gameState.world.changes['story:arc_knight_roused'] = true;
    assert.deepEqual(knight(), ['40,15 ARC_KNIGHT_NPC']);
    // a yard whose gate is in the west fence (the footpath runs west along the row below the door)
    gameState.world.terrainOverrides['38,13'] = 1;
    assert.deepEqual(knight(), ['37,13 ARC_KNIGHT_NPC_RIGHT'], 'in the west gate, facing in');
    delete gameState.world.terrainOverrides['38,13'];
    gameState.world.terrainOverrides['42,13'] = 1;
    assert.deepEqual(knight(), ['43,13 ARC_KNIGHT_NPC_LEFT'], 'in the east gate, facing in');
    delete gameState.world.terrainOverrides['42,13'];
    // a fence piece the years knocked out is mended while he waits; his own cell is not
    gameState.world.changes['39,9'] = null; gameState.world.changes['37,11'] = null; gameState.world.changes['40,15'] = null;
    const mended = Object.fromEntries(objs().filter(([, id]) => /FENCE/.test(id)));
    assert.deepEqual(mended, { '39,9': 'WOODEN_FENCE_H', '37,11': 'WOODEN_FENCE_V' });
    gameState.world.changes['story:arc_knight_slain'] = true;
    assert.deepEqual(knight(), [], 'gone once put down');
    assert.deepEqual(objs().filter(([, id]) => /FENCE/.test(id)), [], 'and the fence left as it was');
});

test('act 3 (the blood moon, as before): Arc Knights on patrol, rare, in the plains; the patrol is the fight, with the hunt\'s music and only one thing to do', async () => {
    const { BIOME_DEFINITIONS } = await import('../../shared/world/biomeDefinitions.js');
    const { BiomeModel } = await import('../../shared/world/biomeModel.js');
    const plains = Object.values(BIOME_DEFINITIONS).find(b => b.id === 'PLAINS');
    const rule = Object.values(plains.mapObjects).flat().find(r => r && r.id === 'ARC_KNIGHT_PATROL');
    assert.ok(rule && rule.minAct === 3 && rule.chance - rule.rangeStart <= 0.0002, 'rare, and from act 3');
    const biome = new BiomeModel(plains);
    const tile = Object.keys(plains.mapObjects).find(t => plains.mapObjects[t].includes(rule));
    const roll = rule.rangeStart + 0.00005;
    gameState.milestones = [];
    assert.ok(!biome.getSpawnId(tile, roll) || biome.getSpawnId(tile, roll).id !== 'ARC_KNIGHT_PATROL', 'not in act 1');
    gameState.milestones = ['darius_slain'];
    assert.equal(biome.getSpawnId(tile, roll).id, 'ARC_KNIGHT_PATROL', 'in act 2');
    gameState.milestones = [];
    assert.ok(M.ARC_KNIGHT_PATROL.wander && M.ARC_KNIGHT_PATROL.interaction.sight === 10, 'he walks; being seen by him (10 tiles ahead) is the fight');
    const p = encounterDefinitions.arc_knight_patrol;
    const st = p.stages[p.initialStage];
    assert.ok(st.bgm, 'the battle music starts with the encounter');
    assert.deepEqual(st.decisions.map(d => d.text), ['Draw your weapon.']);
    const rs = results(st.decisions[0]);
    assert.ok(rs.some(r => r.type === 'DESTROY_OBJECT') && rs.find(r => r.type === 'START_BATTLE').payload.enemies[0].id === 'ARC_KNIGHT');
});

test('wanderers (the madmen, the Arc Knights on patrol) walk about their home and pause, never off its chunk nor onto the player, and leave no double behind', () => {
    quiet(() => {
        assert.ok(M.MADMAN_NPC.wander && M.MADMAN_NPC.wander.pauseChance > 0, 'the madmen stop now and then');
        gameState.seed = 4242; gameState.milestones = []; gameState.quests = { active: {}, completed: [], trackedIds: [] };
        Object.assign(gameState.world, { changes: {}, isInterior: false, structureChunks: {}, strangerHome: null, amputatorGraveyard: null, amputatorQuarry: null, nikoliCampfire: null });
        const wm = new WorldManager();
        const sp = wm.findSpawnPoint();
        gameState.player.col = sp.col; gameState.player.row = sp.row;
        for (let y = sp.row - 32; y <= sp.row + 32; y += 16) for (let x = sp.col - 32; x <= sp.col + 32; x += 16) wm.ensureChunkLoaded(x, y);
        // a madman the world remembers (a village's: world.changes), in open ground near the player
        const home = wm._freeNear(sp.col + 4, sp.row + 4, 6);
        const C = wm.CHUNK_SIZE;
        gameState.world.changes[wm._s(home[0], home[1])] = 'MADMAN_NPC';
        wm._placeObject(home[0], home[1], 'MADMAN_NPC');
        wm.objects.get(wm._s(home[0], home[1]))._home = [...home];
        const mine = () => [...wm.objects.values()].find(o => o._home && o._home[0] === home[0] && o._home[1] === home[1]);
        let t = 0, moves = 0, pauses = 0;
        const seen = new Set();
        for (let i = 0; i < 400; i++) {
            t += 2500;
            const was = mine();
            wm.tickWanderers(t);
            const m = mine();
            const n = m !== was;
            assert.ok(m, 'still one madman');
            if (n) moves++; else pauses++;
            seen.add(`${m.col},${m.row}`);
            assert.ok(Math.max(Math.abs(m.col - home[0]), Math.abs(m.row - home[1])) <= M.MADMAN_NPC.wander.radius, 'near home');
            assert.ok(Math.floor(m.col / C) === Math.floor(home[0] / C) && Math.floor(m.row / C) === Math.floor(home[1] / C), 'in its home chunk');
            assert.ok(!(m.col === gameState.player.col && m.row === gameState.player.row), 'never onto the player');
            // its home cell, looked at while it is away, does not make a second madman
            if (m.col !== home[0] || m.row !== home[1]) { const at = wm.getObject(home[0], home[1]); assert.ok(!at || at === m, 'no double at home'); }
            assert.equal([...wm.objects.values()].filter(o => o._home && o._home[0] === home[0] && o._home[1] === home[1]).length, 1, 'one of him on the map');
        }
        assert.ok(moves > 20 && pauses > 20, `he walks and pauses (${moves} steps, ${pauses} pauses)`);
        assert.ok(seen.size >= 3, `he gets about (${seen.size} cells)`);
    });
});

test('a wanderer is where the clock has it on its round: the same on every player\'s screen (two worlds made from the same seed agree)', () => {
    quiet(() => {
        const make = () => {
            gameState.seed = 1000; gameState.milestones = [];
            Object.assign(gameState.world, { changes: {}, isInterior: false, structureChunks: {}, strangerHome: null, amputatorGraveyard: null, amputatorQuarry: null, nikoliCampfire: null });
            const wm = new WorldManager();
            const sp = wm.findSpawnPoint();
            gameState.player.col = sp.col; gameState.player.row = sp.row;
            for (let y = sp.row - 32; y <= sp.row + 32; y += 16) for (let x = sp.col - 32; x <= sp.col + 32; x += 16) wm.ensureChunkLoaded(x, y);
            const home = wm._freeNear(sp.col + 5, sp.row + 3, 6);
            wm._placeObject(home[0], home[1], 'ARC_KNIGHT_PATROL');
            return { wm, home };
        };
        const a = make(), b = make();
        assert.deepEqual(a.home, b.home);
        const at = (x) => { const o = [...x.wm.objects.values()].find(o => o._home && o._home[0] === x.home[0] && o._home[1] === x.home[1]); return [o.col, o.row, o._facing || null]; };
        const T = 1_700_000_000_000;
        let moved = 0;
        for (let i = 0; i < 60; i++) {
            a.wm.tickWanderers(T + i * 900); b.wm.tickWanderers(T + i * 900);
            assert.deepEqual(at(a), at(b), `the same at ${i}`);
            if (i && (at(a)[0] !== a.home[0] || at(a)[1] !== a.home[1])) moved++;
        }
        assert.ok(moved > 10, 'and it walks');
        // a third world, made later and meeting the round part way, finds him where the others do
        const c = make();
        c.wm.tickWanderers(T + 59 * 900);
        assert.deepEqual(at(c).slice(0, 2), at(a).slice(0, 2));
    });
});

test('come at a madman from behind and it is A Disturbing Sight (the sneak\'s chances); from the front or the sides he sees you, and it is the fight', async () => {
    const { OverworldController } = await import('../../frontend/src/screens/overworld/overworldController.js');
    assert.equal(M.MADMAN_NPC.interaction.id, 'a_disturbing_sight');
    assert.equal(M.MADMAN_NPC.interaction.seenId, 'madman_spots_you');
    const sees = (facing, dx, dy) => { gameState.player.col = 10 + dx; gameState.player.row = 10 + dy; return OverworldController.prototype.seesPlayer.call({}, { col: 10, row: 10, _facing: facing }); };
    // he faces up: behind him is below
    assert.equal(sees('UP', 0, 2), false, 'straight behind');
    assert.equal(sees('UP', 1, 2), false, 'behind, a little to the side');
    assert.equal(sees('UP', 2, 2), false, 'behind on the diagonal');
    assert.equal(sees('UP', 2, 1), true, 'beside him, more than behind');
    assert.equal(sees('UP', 2, 0), true, 'at his side');
    assert.equal(sees('UP', 0, -2), true, 'in front');
    assert.equal(sees('LEFT', 2, 0), false, 'facing left: behind is to the right');
    const spotted = encounterDefinitions.madman_spots_you;
    const st = spotted.stages[spotted.initialStage];
    assert.ok(st.bgm, 'the battle music plays');
    assert.deepEqual(st.decisions.map(d => d.text), ['Draw your weapon.']);
    assert.ok(results(st.decisions[0]).some(r => r.type === 'START_BATTLE'));
    assert.ok(encounterDefinitions.a_disturbing_sight.stages.discovery.decisions.some(d => d.type === 'skill_check'), 'from behind: the chances a sneak gives');
});

test('a round stops now and then, and at a stop it stands and turns to look about', () => {
    quiet(() => {
        gameState.seed = 4242; gameState.milestones = [];
        Object.assign(gameState.world, { changes: {}, isInterior: false, structureChunks: {}, strangerHome: null, amputatorGraveyard: null, amputatorQuarry: null, nikoliCampfire: null });
        const wm = new WorldManager();
        const sp = wm.findSpawnPoint();
        for (let y = sp.row - 32; y <= sp.row + 32; y += 16) for (let x = sp.col - 32; x <= sp.col + 32; x += 16) wm.ensureChunkLoaded(x, y);
        for (const id of ['ARC_KNIGHT_PATROL', 'MADMAN_NPC']) {
            const home = wm._freeNear(sp.col + (id === 'MADMAN_NPC' ? -5 : 5), sp.row, 6);
            wm._placeObject(home[0], home[1], id);
            const round = wm._wanderRound(wm.objects.get(wm._s(home[0], home[1])));
            let turnsInPlace = 0, stops = 0;
            for (let i = 1; i < round.cells.length; i++) {
                const same = round.cells[i][0] === round.cells[i - 1][0] && round.cells[i][1] === round.cells[i - 1][1];
                if (same) stops++;
                if (same && round.facing[i] !== round.facing[i - 1]) turnsInPlace++;
            }
            assert.ok(stops >= 4, `${id}: it stops (${stops})`);
            assert.ok(turnsInPlace >= 2, `${id}: and turns where it stands (${turnsInPlace})`);
        }
    });
});

test('the Arc Knights\' armor: a tier 3 set in the armor sheet\'s column 6, just short of iron against blows, strong against fire, ice and the arcane, no cost to speed, a rare drop of theirs', () => {
    const set = ['arc_knight_helm', 'arc_knight_cuirass', 'arc_knight_gauntlets', 'arc_knight_greaves', 'arc_knight_sabatons'];
    const slots = ['head', 'torso', 'arms', 'legs', 'feet'];
    const iron = ['iron_helmet', 'iron_armor', 'iron_gauntlets', 'iron_greaves', 'iron_boots'];
    const sum = (ids, f) => ids.reduce((n, id) => n + f(ItemDefinitions[id]), 0);
    set.forEach((id, row) => {
        const d = ItemDefinitions[id];
        assert.ok(d && d.type === 'armor' && d.tier === 3 && d.slot === slots[row], id);
        assert.ok(!d.iconSheet && d.icon.col === 6 && d.icon.row === row, `${id}: column 6, row ${row}`);
    });
    for (const t of ['blunt', 'slash', 'pierce']) {
        const a = sum(set, d => d.defense[t] || 0), b = sum(iron, d => d.defense[t] || 0);
        assert.ok(a < b && a >= b - 2, `${t} defense just short of iron (${a} against ${b})`);
        const ra = sum(set, d => d.resistance[t] || 0), rb = sum(iron, d => d.resistance[t] || 0);
        assert.ok(ra < rb + 1e-9 && ra >= rb - 0.03, `${t} resistance just short of iron (${ra.toFixed(2)} against ${rb.toFixed(2)})`);
    }
    for (const t of ['fire', 'ice', 'arcane']) {
        assert.ok(sum(set, d => d.defense[t] || 0) >= 8, `${t} defense`);
        assert.ok(sum(set, d => d.resistance[t] || 0) >= 0.15, `${t} resistance`);
        assert.ok(sum(set, d => d.resistance[t] || 0) > sum(set, d => d.resistance.water || 0) * 2, `${t} well above the other magic`);
    }
    assert.ok(sum(set, d => d.resistance.lightning || 0) < 0, 'the metal draws lightning');
    assert.equal(sum(set, d => (d.combat && d.combat.speed) || 0), 0, 'no cost to speed');
    const drops = LootTableDefinitions[E.ARC_KNIGHT.lootTableId].items;
    for (const id of set) { const it = drops.find(i => i.id === id); assert.ok(it && it.dropRate > 0 && it.dropRate <= 0.1, `${id}: a low chance`); }
    for (const t of Object.values(LootTableDefinitions)) if (t !== LootTableDefinitions[E.ARC_KNIGHT.lootTableId]) for (const id of set) assert.ok(!JSON.stringify(t).includes(`"${id}"`), `${id} only from Arc Knights`);
});
