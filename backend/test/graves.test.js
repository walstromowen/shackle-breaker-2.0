// backend/test/graves.test.js: `npm test`. What a beaten multiplayer party leaves behind (shared/world/graves.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { ItemFactory } from '../../shared/items/itemFactory.js';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/world/mapObjectDefinitions.js';
import { GRAVE, dropGrave, collectGrave, graveAt } from '../../shared/world/graves.js';

/* a stand-in for the WorldManager: open ground everywhere, objects where the world's changes put them, every change reported */
function fakeWorld() {
    const sent = [];
    const wm = {
        sent,
        _s: (c, r) => `${c},${r}`,
        isTileFree: () => true,
        getObjectAt: (c, r) => (gameState.world.changes[`${c},${r}`] ? { id: gameState.world.changes[`${c},${r}`] } : null),
        modifyWorld(c, r, v) { gameState.world.changes[`${c},${r}`] = v; sent.push([`${c},${r}`, v]); },
        _placeObject() {},
        setChange(k, v) { if (v === undefined) delete gameState.world.changes[k]; else gameState.world.changes[k] = v; sent.push([k, v]); },
    };
    return wm;
}

test('a beaten party leaves its bag and coin in a grave; only its owner digs it up, and gets back exactly what it left', () => {
    gameState.world.changes = {};
    gameState.world.day = 3;
    const sword = ItemFactory.createItem('shortsword'); sword.level = 3;
    gameState.party.inventory = [sword, ItemFactory.createItem('healing_herb', { qty: 4 })];
    gameState.party.currency = 75;
    const wm = fakeWorld();
    assert.ok(MAP_OBJECTS_DEFINITIONS[GRAVE.OBJECT_ID].interaction.type === 'GRAVE');

    const g = dropGrave(wm, 10, 5, 'me', 'Owen');
    assert.deepEqual([g.col, g.row], [10, 5], 'where the party fell');
    assert.equal(gameState.party.inventory.length, 0, 'the bag is empty');
    assert.equal(gameState.party.currency, 0, 'and so is the purse');
    assert.equal(gameState.world.changes['10,5'], GRAVE.OBJECT_ID, 'the grave is on the map');
    assert.equal(graveAt(wm, 10, 5).owner, 'me');
    assert.ok(wm.sent.some(([k]) => k === 'grave:10,5'), 'and what it holds is sent to the other players');

    // a second fall on the same spot never covers the first grave
    gameState.party.inventory = [ItemFactory.createItem('healing_herb', { qty: 1 })];
    const g2 = dropGrave(wm, 10, 5, 'p2', 'Ally');
    assert.notDeepEqual([g2.col, g2.row], [10, 5]);

    assert.equal(collectGrave(wm, 10, 5, 'p2').ok, false, 'someone else\'s grave stays shut');
    gameState.party.inventory = []; gameState.party.currency = 0;
    const r = collectGrave(wm, 10, 5, 'me');
    assert.ok(r.ok);
    assert.equal(gameState.party.currency, 75);
    const back = gameState.party.inventory.find(i => i.defId === 'shortsword');
    assert.equal(back.level, 3, 'gear comes back as it was');
    assert.equal(gameState.party.inventory.find(i => i.defId === 'healing_herb').qty, 4);
    assert.equal(graveAt(wm, 10, 5), null, 'the grave is gone');
    assert.equal(gameState.world.changes['10,5'], undefined);

    gameState.party.inventory = []; gameState.party.currency = 0;
    assert.equal(dropGrave(wm, 0, 0, 'me', 'Owen'), null, 'nothing to leave, no grave');
});
