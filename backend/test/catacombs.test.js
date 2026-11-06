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
