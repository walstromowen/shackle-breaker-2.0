import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { InteriorFactory } from '../../shared/world/interiorFactory.js';
import { INTERIOR_DEFINITIONS } from '../../shared/world/interiorDefinitions.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/world/mapObjectDefinitions.js';
import { SpawnTableDefinitions } from '../../shared/battle/spawnTableDefinitions.js';
import { mysteriousAltar } from '../../shared/story/encounters/story/mysteriousAltar.js';
import { actTwo } from '../../shared/story/encounters/story/actTwo.js';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

test('the catacombs are a dungeon with a biome of their own, darker than a cave', () => {
    const def = INTERIOR_DEFINITIONS.CATACOMBS;
    assert.equal(def.generatorType, 'CATACOMBS');
    assert.equal(def.doorObject, 'CATACOMBS_EXIT');
    const cat = BIOME_DEFINITIONS.CATACOMBS_INTERIOR, cave = BIOME_DEFINITIONS.CAVE_INTERIOR;
    assert.ok(cat.lightScale < 1, 'carried light reaches less far');
    assert.ok(cat.blobTileset.depthShade.max > cave.blobTileset.depthShade.max, 'the deep ledges sink further into the dark');
    assert.equal(cat.battles.tables.night, 'catacombs_battles');
    assert.ok(SpawnTableDefinitions.catacombs_battles.pools.some(p => p.factionId === 'shackled'));
});

test('a catacomb is a large dungeon, built the same every time from its id: brick rooms and caverns, a way out, a gated main chamber', () => {
    for (let k = 0; k < 8; k++) {
        const id = `${k}_${-k}_3_7`;
        const a = InteriorFactory.create(1234 + k * 999, 'CATACOMBS', id), b = InteriorFactory.create(1234 + k * 999, 'CATACOMBS', id);
        assert.equal(a.getBiomeAt(0, 0).id, 'CATACOMBS_INTERIOR');
        assert.ok(a.W >= 93, 'about a hundred cells across');
        assert.deepEqual(a.getEntrySpawnPoint(), b.getEntrySpawnPoint());
        assert.deepEqual(a.puzzle, b.puzzle);
        assert.equal(a.getObjectIdAt(a.doorCol - 1, a.doorRow), 'CATACOMBS_EXIT');
        const roles = a.rooms.map(r => r.role);
        assert.ok(roles.includes('chamber') && roles.includes('antechamber') && roles.includes('entrance'));
        assert.ok(a.rooms.filter(r => r.role === 'room' || r.role === 'lever').length >= 8, 'a dozen rooms or so');
        assert.ok(a.rooms.some(r => r.kind === 'cavern') && a.rooms.some(r => r.kind === 'built' && r.role === 'room'), 'brick rooms and natural caverns');
        const styles = new Set(); for (let r = a.bounds.minR; r <= a.bounds.maxR; r++) for (let c = a.bounds.minC; c <= a.bounds.maxC; c++) if (a.isWallCell(c, r)) styles.add(a.getWallStyle(c, r));
        assert.ok(styles.has('brick') && styles.has('natural'), 'stone brick and natural rock walls');
        assert.ok(a.puzzle.levers.length >= 3 && a.puzzle.braziers.length === a.puzzle.levers.length);
        // every lever stands in its own room, and every room can be walked to from the stairway
        assert.equal(new Set(a.puzzle.levers.map(l => l.room)).size, a.puzzle.levers.length);
        for (const rm of a.rooms) assert.ok(a._roomReached(rm), `${rm.role} ${rm.id} reachable`);
    }
    assert.equal(InteriorFactory.create(1234, 'CAVE', '10_-4').getBiomeAt(0, 0).id, 'CAVE_INTERIOR', 'a plain cave is still a cave');
});

test('the gate stays shut until every lever is down; each lever lights a brazier; the last one raises the gate', async () => {
    const { gameState } = await import('../../shared/core/gameState.js');
    const { WorldManager } = await import('../../shared/world/worldManager.js');
    const { pullLever, puzzleState } = await import('../../shared/world/catacombPuzzle.js');
    const w = gameState.world;
    Object.assign(w, { isInterior: true, interiorType: 'CATACOMBS', interiorId: '5_5_1_1', interiorMapId: null, changes: {} });
    gameState.seed = 4242;
    const wm = new WorldManager();
    const p = wm.terrain.puzzle;
    const solidGate = () => !!wm.getSolidObjectAt(p.gate.c + 1, p.gate.r);
    assert.ok(solidGate(), 'the gate is shut');
    assert.deepEqual(puzzleState(wm), { total: p.levers.length, pulled: 0, open: false });
    p.levers.forEach((l, i) => {
        const r = pullLever(wm, l.c, l.r);
        assert.ok(r.ok, r.message);
        assert.equal(r.pulled, i + 1);
        assert.equal(wm.getObjectAt(p.braziers[i].c, p.braziers[i].r).id, 'STANDING_TORCH', 'a brazier lit');
        if (i < p.levers.length - 1) { assert.ok(!r.opened); assert.ok(solidGate(), 'still shut'); }
        else assert.ok(r.opened);
    });
    assert.ok(!solidGate(), 'the gate is up');
    assert.equal(pullLever(wm, p.levers[0].c, p.levers[0].r).ok, false, 'a lever stays down');
    // it is all in the world's changes: a fresh build of the same catacomb has the gate up
    const again = new WorldManager();
    assert.ok(puzzleState(again).open);
    assert.ok(!again.getSolidObjectAt(p.gate.c + 1, p.gate.r));
    Object.assign(w, { isInterior: false, interiorType: null, interiorId: null, changes: {} });
});

test('the hidden staircase leads down into the catacombs and their stairway leads back up', () => {
    const down = MAP_OBJECTS_DEFINITIONS.CATACOMBS_STAIRS, up = MAP_OBJECTS_DEFINITIONS.CATACOMBS_EXIT;
    assert.equal(down.interaction.type, 'WARP');
    assert.equal(down.interaction.roomType, 'CATACOMBS');
    assert.ok(down.interaction.walkIn);
    assert.equal(up.interaction.id, 'exit_interior');
    const main = read('../../frontend/src/main.js');
    for (const k of [down.sheet, up.sheet, ...Object.values(BIOME_DEFINITIONS.CATACOMBS_INTERIOR.blobTileset).filter(v => typeof v === 'string' && v.startsWith('catacombs'))]) {
        const m = main.match(new RegExp(`${k}:\\s*'\\./(assets/[^']+)'`));
        assert.ok(m && fs.existsSync(new URL(`../../frontend/src/${m[1]}`, import.meta.url)), `${k} is registered and on disk`);
    }
});

test('the altar gives way to the staircase only after Darius: at the end of the Red Moon, or searched in act 2', () => {
    const last = actTwo.stages[Object.keys(actTwo.stages).find(id => JSON.stringify(actTwo.stages[id]).includes('"act2"'))];
    const res = last.decisions[0].outcomes[0].results;
    assert.ok(res.some(r => r.type === 'REPLACE_OBJECT' && r.payload.objectId === 'CATACOMBS_STAIRS'));
    const search = mysteriousAltar.stages.approach.decisions.find(d => d.outcomes && JSON.stringify(d.outcomes).includes('hidden_stair'));
    assert.ok(search.conditions.some(c => c.type === 'has_milestone' && c.id === 'act2'), 'only once Darius is beaten');
    assert.ok(JSON.stringify(mysteriousAltar.stages.hidden_stair).includes('CATACOMBS_STAIRS'));
});

test('going down from a cave stacks it, and coming up or an Escape Rope takes the right way out', () => {
    const sm = read('../../frontend/src/engine/sceneManager.js');
    assert.ok(sm.includes('w.interiorStack.push('));
    assert.ok(sm.includes('_leaveToOuterInterior()'));
    assert.ok(sm.includes("context: { toWorld: true }"));
    const save = read('../../frontend/src/engine/saveManager.js');
    assert.ok(save.includes('{ stack: world.interiorStack }') && save.includes('interiorStack: interior'));
});

test('the catacombs\' own fights come from the dead and the spiders', async () => {
    const { SpawnTableFactory } = await import('../../shared/battle/spawnTableFactory.js');
    const seen = new Set();
    for (let i = 0; i < 60; i++) { const b = SpawnTableFactory.generateBattle('catacombs_battles', 'normal', 1); if (b) for (const e of b.enemies) seen.add(e.entityId || e.id || e.definitionId); }
    assert.ok(seen.size >= 2, [...seen].join(','));
});

test('every catacomb has its three kinds of trap in the halls, spread out and away from the stairs, and ancient barrels and crates to search', () => {
    for (let k = 0; k < 6; k++) {
        const g = InteriorFactory.create(777 + k * 4321, 'CATACOMBS', `${k}_${k}_2_2`);
        const kinds = new Set(g.traps.map(t => t.kind));
        assert.ok(kinds.has('TRAP_ARROW') && kinds.has('TRAP_PIT') && kinds.has('TRAP_AXES'), [...kinds].join(','));
        assert.ok(g.traps.length >= 6);
        for (const t of g.traps) {
            assert.ok(g._walkable(t.c, t.r), 'on open floor');
            assert.ok(g._reach.distance[g._idx(t.c, t.r)] >= 14, 'not by the stairs');
            for (const u of g.traps) if (u !== t) assert.ok(Math.abs(u.c - t.c) + Math.abs(u.r - t.r) >= 9, 'spread out');
        }
        const ids = [...g.objects.values()];
        assert.ok(ids.includes('ANCIENT_BARREL') && ids.includes('RUINED_BARREL') && ids.includes('CRATE'), 'ancient and ruined barrels, and crates');
    }
});

test('each trap is a walk-in encounter with a Vigor saving throw: a failure hurts, and either way the trap is spent', async () => {
    const { encounterDefinitions } = await import('../../shared/story/encounterDefinitions.js');
    for (const [obj, id, sprung] of [['TRAP_ARROW', 'arrow_trap', 'TRAP_ARROW_SPRUNG'], ['TRAP_PIT', 'pit_trap', 'TRAP_PIT_SPRUNG'], ['TRAP_AXES', 'swinging_axes', 'TRAP_AXES_SPRUNG']]) {
        const def = MAP_OBJECTS_DEFINITIONS[obj];
        assert.equal(def.interaction.type, 'ENCOUNTER'); assert.equal(def.interaction.id, id); assert.ok(def.interaction.walkIn);
        assert.equal(def.isSolid, false, 'a trap never blocks the way');
        assert.ok(!MAP_OBJECTS_DEFINITIONS[sprung].interaction, 'spent, it does nothing');
        const enc = encounterDefinitions[id];
        const first = enc.stages[enc.initialStage];
        const save = first.decisions.find(d => d.type === 'skill_check');
        assert.ok(!first.decisions.some(d => d.type === 'switch_character'), `${id}: a trap springs on whoever stepped on it, no switching`);
        assert.equal(save.attribute, 'vigor');
        const failStage = enc.stages[save.failureOutcomes[0].results[0].payload.stageId];
        const okStage = enc.stages[save.successOutcomes[0].results[0].payload.stageId];
        const failRes = failStage.decisions[0].outcomes[0].results, okRes = okStage.decisions[0].outcomes[0].results;
        assert.ok(failRes.some(r => r.type === 'MODIFY_VITALS' && r.payload.hp < 0), `${id}: a failure hurts`);
        assert.ok(!okRes.some(r => r.type === 'MODIFY_VITALS'), `${id}: a success does not`);
        for (const res of [failRes, okRes]) assert.ok(res.some(r => r.type === 'REPLACE_OBJECT' && r.payload.objectId === sprung), `${id}: spent either way`);
    }
});

test('the ancient and ruined barrels are searched for things that exist; the ancient crate is gone', async () => {
    assert.ok(!MAP_OBJECTS_DEFINITIONS.ANCIENT_CRATE);
    const { LootTableDefinitions } = await import('../../shared/items/lootTableDefinitions.js');
    const { ItemDefinitions } = await import('../../shared/items/itemDefinitions.js');
    for (const id of ['ANCIENT_BARREL', 'RUINED_BARREL']) {
        const def = MAP_OBJECTS_DEFINITIONS[id];
        assert.equal(def.interaction.type, 'SEARCH');
        const table = LootTableDefinitions[def.interaction.lootTableId];
        assert.ok(table && table.items.length >= 5);
        for (const it of table.items) assert.ok(ItemDefinitions[it.id], `${it.id} exists`);
    }
    const main = read('../../frontend/src/main.js');
    for (const k of ['objTrapArrow', 'objTrapArrowSprung', 'objTrapPit', 'objTrapPitSprung', 'objTrapAxes', 'objTrapAxesSprung', 'objAncientBarrel', 'objRuinedBarrel', 'encounter_catacomb_traps']) {
        const m = main.match(new RegExp(`${k}:\\s*'\\./(assets/[^']+)'`));
        assert.ok(m && fs.existsSync(new URL(`../../frontend/src/${m[1]}`, import.meta.url)), `${k} is registered and on disk`);
    }
});

test('every trap is one floor tile on the flagstone floor, so it can hardly be told from the floor around it', () => {
    for (const id of ['TRAP_ARROW', 'TRAP_PIT', 'TRAP_AXES', 'TRAP_ARROW_SPRUNG', 'TRAP_PIT_SPRUNG', 'TRAP_AXES_SPRUNG']) {
        const d = MAP_OBJECTS_DEFINITIONS[id];
        assert.equal(d.width, 1); assert.equal(d.height, 1); assert.equal(d.isGround, true, `${id} lies flat on the floor`);
        assert.ok(!(d.frames > 1), `${id} does not move`);
    }
    for (let k = 0; k < 4; k++) {
        const g = InteriorFactory.create(31 + k * 977, 'CATACOMBS', `${k}_1_1_${k}`);
        for (const t of g.traps) assert.equal(g.getFloorStyle(t.c, t.r), 'brick', 'on flagstones');
    }
});

test('every encounter has a picture sheet that is registered and on disk, for every stage', async () => {
    const { encounterDefinitions } = await import('../../shared/story/encounterDefinitions.js');
    const main = read('../../frontend/src/main.js');
    for (const [id, enc] of Object.entries(encounterDefinitions)) {
        for (const [sid, st] of Object.entries(enc.stages)) {
            if (!st.image) continue;
            const key = st.image.sheet || enc.imageSheet;
            const m = main.match(new RegExp(`\\b${key}:\\s*'\\./([^']+)'`));
            assert.ok(m && fs.existsSync(new URL(`../../frontend/src/${m[1]}`, import.meta.url)), `${id}.${sid}: sheet ${key} is registered and on disk`);
        }
    }
});
