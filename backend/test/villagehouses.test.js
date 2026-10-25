// backend/test/villagehouses.test.js: `npm test`. The houses of the abandoned villages: the wooden house, the stone house, the smithy and the crafting house, each seen from the front (with a door)
// and from the side (sealed, for the plots beside a north-south road); their sprites, their yards (compact: the fence is the edge, the gate is in the fence and the road runs along it)
// and the rule that the side houses are only ever put beside north-south streets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MAP_OBJECTS_DEFINITIONS as D } from '../../shared/world/mapObjectDefinitions.js';
import { STRUCTURES } from '../../shared/world/structures.js';

const mainJs = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
const pngSize = (sheet) => {
    const b = fs.readFileSync(new URL(`../../frontend/src/assets/mapObjects/${sheet}.png`, import.meta.url));
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

const FRONTS = ['ABANDONED_HOUSE_1', 'ABANDONED_STONE_HOUSE', 'ABANDONED_SMITHY', 'CRAFTING_HOUSE'];
const SIDES = FRONTS.flatMap(h => [`${h}_LEFT`, `${h}_RIGHT`]);

test('every house, front and side, is a solid 32 px grid sprite that is loaded by main.js and exactly as big as its definition', () => {
    for (const id of [...FRONTS, ...SIDES]) {
        const d = D[id];
        assert.ok(d, `${id} is defined`);
        assert.ok(mainJs.includes(`${d.sheet}: './assets/mapObjects/${d.sheet}.png'`), `${d.sheet} is loaded by main.js`);
        assert.deepEqual(pngSize(d.sheet), [d.width * 32, d.height * 32], `${id}: the picture is ${d.width} x ${d.height} tiles`);
        assert.ok(d.isSolid && !d.isGround && d.isAnchor);
    }
});

test('a side house is as tall as its front view, has no door and is solid along the whole bottom two rows; a front house has a gap for its door', () => {
    for (const h of FRONTS) {
        const front = D[h], l = D[`${h}_LEFT`], r = D[`${h}_RIGHT`];
        assert.equal(l.height, front.height, `${h}: the side view is as tall as the front view`);
        for (const side of [l, r]) {
            assert.equal(side.hitboxes.length, 1);
            assert.deepEqual(side.hitboxes[0], { xOffset: 0, yOffset: -1, w: side.width, h: 2 });
        }
        const cells = new Set(); // the walls of a front house leave exactly the door cell free on its bottom row
        for (const b of front.hitboxes) for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) cells.add(`${b.xOffset + x},${b.yOffset + y}`);
        assert.ok(!cells.has('2,0') && cells.has('2,-1'), `${h}: the door cell is open and the wall above it is solid`);
    }
    assert.equal(D.SMITHY_DOOR.interaction.roomType, 'HOUSE_INTERIOR');
});

test('every yard variant leaves the prefab through the gate in its fence, and has a gap of at most one empty column or row beside the fence', () => {
    const fence = (id) => id && id.startsWith('WOODEN_FENCE');
    for (const [name, proto] of Object.entries(STRUCTURES)) {
        if (!proto.variants || !/HOUSE|COTTAGE|FARMHOUSE|HUT|SMITHY|WORKSHOP/.test(name)) continue;
        for (const [gate, p] of Object.entries(proto.variants)) {
            const { entry } = p;
            assert.ok(entry.x >= 0 && entry.x < p.width && entry.y >= 0 && entry.y < p.height, `${name} ${gate}: the footpath ends inside the prefab`);
            assert.equal(p.terrain[entry.y][entry.x], 1, `${name} ${gate}: the last cell is path`);
            const outX = entry.x + entry.dx, outY = entry.y + entry.dy;
            assert.ok(outX < 0 || outX >= p.width || outY < 0 || outY >= p.height, `${name} ${gate}: the cell it points at is outside the prefab (the road)`);
            let fences = 0, minX = 99, maxX = -1;
            for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) if (fence(p.objects[y][x])) { fences++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
            assert.ok(fences > 10);
            assert.ok(minX <= 1 && p.width - 1 - maxX <= 1, `${name} ${gate}: no more than one empty column beside the fence`);
        }
    }
});

test('the door of a front yard is on the bottom row of its house and has a footpath cell in front of it; a side yard has no door at all', () => {
    for (const [name, proto] of Object.entries(STRUCTURES)) {
        if (!proto.variants || !/HOUSE|COTTAGE|FARMHOUSE|HUT|SMITHY|WORKSHOP/.test(name)) continue;
        const sealed = /_SIDE_/.test(name);
        for (const p of Object.values(proto.variants)) {
            const doors = [];
            p.objects.forEach((row, y) => row.forEach((id, x) => { if (id && id.includes('DOOR')) doors.push([x, y]); }));
            if (sealed) { assert.equal(doors.length, 0, `${name} has no door`); continue; }
            assert.equal(doors.length, 1, `${name} has one door`);
            const [x, y] = doors[0];
            assert.equal(p.terrain[y + 1][x], 1, `${name}: the cell in front of the door is path`);
        }
    }
});

test('every module of every village exists, the side houses stand only beside north-south streets, and the one workshop is required', () => {
    for (const id of ['ABANDONED_VILLAGE', 'ABANDONED_VILLAGE_DESERT', 'ABANDONED_VILLAGE_SNOWY']) {
        const mods = STRUCTURES[id].modules;
        for (const m of mods) assert.ok(STRUCTURES[m.prefab], `${id}: ${m.prefab} exists`);
        const sides = mods.filter(m => /_SIDE_/.test(m.prefab));
        assert.equal(sides.length, 8, `${id}: two modules of each of the four houses`);
        for (const m of sides) assert.equal(m.horizontalWeight, 0, `${m.prefab} is never beside an east-west street`);
        for (const m of mods.filter(x => !/_SIDE_/.test(x.prefab))) assert.ok((m.horizontalWeight ?? m.weight) > 0, `${m.prefab} may stand beside an east-west street`);
        assert.equal(mods.filter(m => m.required).length, 1);
        assert.ok(mods.some(m => /SMITHY$|SMITHY_(DESERT|SNOWY)$/.test(m.prefab)), `${id} has the smithy`);
    }
});

test('the plains village is dense: every free spot is built on, a module that does not fit is replaced by another, and the streets fork off each other', () => {
    const v = STRUCTURES.ABANDONED_VILLAGE;
    assert.equal(v.buildingDensity, 1);
    assert.ok(v.buildingTries >= 2);
    assert.ok(v.sideStreets.depth >= 2);
    assert.ok(v.maxBuildings >= 100);
});

test('the two modules of a side house show different sprites on the same gate, and a plot west of the road shows the other sprite from one east of it', () => {
    const pick = (name, gate) => Object.values(STRUCTURES[name].variants[gate].objects.flat().filter(id => id && /_(LEFT|RIGHT)$/.test(id)))[0];
    assert.notEqual(pick('ABANDONED_HOUSE_SIDE_1', 'E'), pick('ABANDONED_HOUSE_SIDE_2', 'E'));
    assert.notEqual(pick('ABANDONED_HOUSE_SIDE_1', 'E'), pick('ABANDONED_HOUSE_SIDE_1', 'W'));
    assert.match(pick('ABANDONED_SMITHY_SIDE_1', 'W'), /^ABANDONED_SMITHY_(LEFT|RIGHT)$/);
});
