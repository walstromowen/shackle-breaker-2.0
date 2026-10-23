// The bottom of a cave: an iron chest flanked by two torches, or (one cave in two) the mysterious altar with a torch at each corner around it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InteriorFactory } from '../../shared/world/interiorFactory.js';
import { INTERIOR_DEFINITIONS } from '../../shared/world/interiorDefinitions.js';

const quiet = (fn) => { const log = console.log, warn = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = log; console.warn = warn; } };
const around = (cave, radius = 3) => {
    const { c, r } = cave.depthSpot, found = {};
    for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
        const id = cave.getObjectIdAt(c + dc, r + dr);
        if (id) (found[id] = found[id] || []).push([dc, dr]);
    }
    return found;
};

test('the definitions: the altar is one cave in two, with a torch at each corner; the chest has a torch two cells to each side', () => {
    const def = INTERIOR_DEFINITIONS.CAVE;
    assert.equal(def.depthAlternatives.length, 1);
    assert.equal(def.depthAlternatives[0].chance, 0.5);
    const altar = def.depthAlternatives[0].objects;
    assert.equal(altar.filter(o => o.id === 'STANDING_TORCH').length, 4);
    assert.deepEqual(altar.filter(o => o.id === 'STANDING_TORCH').map(o => [o.dx, o.dy]).sort(), [[-2, -2], [-2, 2], [2, -2], [2, 2]].sort());
    const chest = def.depthObjects;
    assert.deepEqual(chest.map(o => [o.id, o.dx, o.dy]), [['IRON_CHEST', 0, 0], ['STANDING_TORCH', -2, 0], ['STANDING_TORCH', 2, 0]]);
});

test('generated caves hold what the definitions say: both kinds turn up, each laid out as described, and the cell in front stays free', () => {
    const kinds = { alternative: 0, default: 0 };
    for (let s = 1; s <= 14; s++) {
        const cave = quiet(() => InteriorFactory.create(s * 7919, 'CAVE', 'depth' + s));
        kinds[cave.depthKind]++;
        const found = around(cave);
        const { c, r } = cave.depthSpot;
        if (cave.depthKind === 'alternative') {
            assert.deepEqual(found.MYSTERIOUS_ALTAR, [[-1, 1]], 'the altar sits on the middle of the square (anchor at the bottom left)');
            assert.deepEqual((found.STANDING_TORCH || []).sort(), [[-2, -2], [-2, 2], [2, -2], [2, 2]].sort(), 'four torches in the corners');
            assert.equal(found.IRON_CHEST, undefined);
        } else {
            assert.deepEqual(found.IRON_CHEST, [[0, 0]]);
            assert.deepEqual((found.STANDING_TORCH || []).sort(), [[-2, 0], [2, 0]].sort(), 'two torches, two cells out on either side, level with the chest');
            assert.equal(cave.getObjectIdAt(c, r + 1), null, 'nothing is scattered in front of the chest');
            assert.equal(cave.getObjectIdAt(c - 2, r + 1), null);
            assert.equal(cave.getObjectIdAt(c + 2, r + 1), null);
        }
    }
    assert.ok(kinds.alternative > 0 && kinds.default > 0, JSON.stringify(kinds));
});
