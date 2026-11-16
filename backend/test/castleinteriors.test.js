// backend/test/castleinteriors.test.js: `npm test`. A ruined castle's keep and armory can be entered: their doors open (frames) and lead into interiors of their
// own (generators/castleInteriorGenerator.js), stone rooms in the castle's tiles furnished with the game's own objects, every floor cell reachable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { InteriorFactory } = await import('../../shared/world/interiorFactory.js');
const { INTERIOR_DEFINITIONS } = await import('../../shared/world/interiorDefinitions.js');
const { MAP_OBJECTS_DEFINITIONS: D } = await import('../../shared/world/mapObjectDefinitions.js');
const { BIOME_DEFINITIONS } = await import('../../shared/world/biomeDefinitions.js');
const { LootTableDefinitions } = await import('../../shared/items/lootTableDefinitions.js');
const { ItemDefinitions } = await import('../../shared/items/itemDefinitions.js');
const { CASTLE } = await import('../../shared/world/castleLayout.js');
const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');

test('the keep and the armory open onto interiors of their own', () => {
    const kd = D.CASTLE_KEEP_DOOR, ad = D.CASTLE_ARMORY_DOOR;
    assert.equal(kd.interaction.roomType, 'KEEP_INTERIOR');
    assert.equal(ad.interaction.roomType, 'ARMORY_INTERIOR');
    for (const d of [kd, ad]) { assert.ok(d.frames > 1 && !d.isSolid, 'a door that swings open as you step in'); assert.equal(d.interaction.type, 'WARP'); }
    assert.equal(CASTLE.ARMORY.door, 'CASTLE_ARMORY_DOOR');
    assert.ok(/objCastleKeepDoor:\s*'\.\/assets\/mapObjects\/objCastleKeepDoor\.png'/.test(main), 'the keep door art is registered');
    assert.ok(fs.existsSync(new URL('../../frontend/src/assets/mapObjects/objCastleKeepDoor.png', import.meta.url)));
    // the keep is solid but for its door: columns 9 and 10 of its last row
    const cells = new Set();
    for (const h of D.CASTLE_KEEP.hitboxes) for (let y = 0; y < h.h; y++) for (let x = 0; x < h.w; x++) cells.add((h.xOffset + x) + ',' + (h.yOffset + y));
    assert.ok(!cells.has('9,0') && !cells.has('10,0') && cells.has('8,0') && cells.has('11,0') && cells.has('9,-1'));
    assert.equal(BIOME_DEFINITIONS.CASTLE_INTERIOR.defaultLootTable, 'castle');
    for (const it of LootTableDefinitions.castle.items) assert.ok(ItemDefinitions[it.id], `castle loot is a real item (${it.id})`);
});

test('keeps and armories: stone rooms, furnished from the game\'s own objects, every floor cell reachable, a way out', () => {
    for (const type of ['KEEP_INTERIOR', 'ARMORY_INTERIOR']) {
        assert.equal(INTERIOR_DEFINITIONS[type].biome, 'CASTLE_INTERIOR');
        for (const id of ['3_4', '120_77', '-40_9', '555_-12', '7_7']) {
            const g = InteriorFactory.create(4242, type, id);
            assert.equal(g.getBiomeAt(0, 0).id, 'CASTLE_INTERIOR');
            assert.ok(g.furniture._connected(), `${type} ${id}: every floor cell can be walked to from the door`);
            const b = g.bounds, ids = {};
            for (let r = b.minR; r <= b.maxR + 1; r++) for (let c = b.minC; c <= b.maxC; c++) {
                const o = g.getObjectIdAt(c, r);
                if (o) { assert.ok(D[o], `${o} is a real map object`); ids[o] = (ids[o] || 0) + 1; }
            }
            assert.equal(ids.CASTLE_EXIT_DOOR, 1, 'the iron door out');
            assert.ok(ids.STANDING_TORCH >= 1, 'torches to see by');
            assert.ok(ids.IRON_CHEST >= 1, 'an iron chest');
            if (type === 'KEEP_INTERIOR') {
                assert.ok(g.layoutState.rooms.some(r => r.kind === 'treasury'), 'a treasury');
                assert.ok(ids.RUG_LONG >= 2 && ids.BRAZIER_UNLIT === 2, 'the runner to the lord\'s chair, between braziers');
            } else {
                assert.ok(ids.FORGE === 1 && ids.ANVIL === 1, 'the smithy');
                assert.ok(ids.COUNTER >= 1, 'weapon counters');
            }
        }
    }
});
