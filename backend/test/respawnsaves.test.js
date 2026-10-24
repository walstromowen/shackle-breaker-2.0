// backend/test/respawnsaves.test.js: `npm test`. Barrels you can search, things that grow back (a cut tree, a picked herb), saving inside a house or cave, and the compact tooltip / message plate.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const noop = () => {};
const makeCtx = () => new Proxy({ getTransform: () => ({ a: 1 }), createPattern: () => ({}), createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    measureText: (s) => ({ width: String(s).length * 10 }) },
    { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; this._ctx = makeCtx(); } getContext() { return this._ctx; } };

const { MAP_OBJECTS_DEFINITIONS, RESPAWN_DAYS, CONTAINER_REFILL_DAYS } = await import('../../shared/world/mapObjectDefinitions.js');
const { LootTableDefinitions } = await import('../../shared/items/lootTableDefinitions.js');
const { ItemDefinitions } = await import('../../shared/items/itemDefinitions.js');
const { gameState } = await import('../../shared/core/gameState.js');
const { WorldManager } = await import('../../shared/world/worldManager.js');

test('a barrel can be searched, and its loot table only names real items', () => {
    const barrel = MAP_OBJECTS_DEFINITIONS.BARREL;
    assert.equal(barrel.interaction.type, 'SEARCH');
    const table = LootTableDefinitions[barrel.interaction.lootTableId];
    assert.ok(table, 'the table exists');
    const entries = table.entries || table.items || table.pool || (Array.isArray(table) ? table : []);
    assert.ok(entries.length > 0);
    for (const e of entries) {
        const id = e.itemId || e.id || e.item;
        assert.ok(ItemDefinitions[id], `${id} is a real item`);
    }
});

test('every respawning object exists and carries its days; containers stay empty unless asked', () => {
    for (const [id, days] of Object.entries(RESPAWN_DAYS)) {
        assert.ok(MAP_OBJECTS_DEFINITIONS[id], `${id} exists`);
        assert.equal(MAP_OBJECTS_DEFINITIONS[id].interaction.respawnDays, days);
    }
    assert.ok(Object.values(RESPAWN_DAYS).every(d => d > 0));
    assert.equal(RESPAWN_DAYS.IRON_ORE, undefined, 'iron ore does not come back');
    assert.deepEqual(CONTAINER_REFILL_DAYS, {}, 'chests do not refill by default');
});

function freshWorld() {
    gameState.seed = 1234;
    gameState.world.isInterior = false;
    gameState.world.day = 3;
    gameState.world.changes = {};
    return new WorldManager();
}

test('a change made today is forgotten once its day comes, and only then', () => {
    const wm = freshWorld();
    const key = wm._s(5, 6);
    gameState.world.changes[key] = null;
    wm.scheduleRespawn(5, 6, 7);
    assert.equal(gameState.world.changes['respawn:' + key], 10);
    gameState.world.day = 9;
    assert.equal(wm.expireRespawns(), 0);
    assert.ok(key in gameState.world.changes);
    gameState.world.day = 10;
    assert.equal(wm.expireRespawns(), 1);
    assert.ok(!(key in gameState.world.changes), 'the cell is generated as it first was');
    assert.ok(!(('respawn:' + key) in gameState.world.changes), 'and the timer is gone');
});

test('a searched container refills when asked to, and nothing respawns inside a house or cave', () => {
    const wm = freshWorld();
    gameState.world.changes['searched:' + wm._s(1, 1)] = true;
    wm.scheduleRespawn(1, 1, 5, 'searched:');
    gameState.world.day = 8;
    assert.equal(wm.expireRespawns(), 1);
    assert.ok(!(('searched:' + wm._s(1, 1)) in gameState.world.changes));

    gameState.world.day = 3;
    gameState.world.isInterior = true;
    wm.scheduleRespawn(2, 2, 7);
    assert.deepEqual(Object.keys(gameState.world.changes).filter(k => k.startsWith('respawn:')), []);
    gameState.world.isInterior = false;
});

test('days that are zero or missing schedule nothing', () => {
    const wm = freshWorld();
    wm.scheduleRespawn(1, 1, 0);
    wm.scheduleRespawn(1, 1, undefined);
    assert.deepEqual(Object.keys(gameState.world.changes), []);
});

test('the item tooltip folds equal damage types into one cell and keeps its sections in order', async () => {
    const { TooltipSystem } = await import('../../frontend/src/ui/tooltipSystem.js');
    const ts = Object.create(TooltipSystem.prototype);
    const sections = ts._groupStatSections([
        { group: 'attack', typeKey: 'blunt', label: 'Blunt', val: '+4' },
        { group: 'resistance', typeKey: 'blunt', label: 'Blunt', val: '3%' },
        { group: 'resistance', typeKey: 'slash', label: 'Slash', val: '3%' },
        { group: 'resistance', typeKey: 'pierce', label: 'Pierce', val: '3%' },
        { group: 'resistance', typeKey: 'fire', label: 'Fire', val: '1%' },
        { group: 'resistance', typeKey: 'ice', label: 'Ice', val: '1%' },
        { group: 'resistance', typeKey: 'water', label: 'Water', val: '1%' },
        { group: 'attribute', label: 'Vigor', abbr: 'VIG', val: '+2' }
    ]);
    assert.deepEqual(sections.map(s => s.title), ['Attack', 'Resist', 'Attributes']);
    assert.deepEqual(sections[1].items.map(i => i.label), ['Physical', 'Magic']);
});

test('a message plate is sized to its text and can stack upward', async () => {
    const { CanvasUI } = await import('../../frontend/src/ui/canvasUI.js');
    const ui = new CanvasUI(makeCtx());
    const a = ui.drawMessageBox('Short', 960, 500);
    const b = ui.drawMessageBox('A much longer message than the other one', 960, 500);
    assert.ok(b.w > a.w);
    assert.equal(a.x + a.w / 2 | 0, 960);
    const up = ui.drawMessageBox('Short', 960, 500, { bottom: true });
    assert.equal(up.y + up.h, 500);
    const capped = ui.drawMessageBox('x'.repeat(200), 960, 500, { maxWidth: 400 });
    assert.ok(capped.w <= 400);
});

test('a game saved inside a house comes back inside it, with the way out intact; on the overworld nothing changes', async () => {
    const { SaveManager } = await import('../../frontend/src/engine/saveManager.js');
    const { EntityFactory } = await import('../../shared/characters/entityFactory.js');
    gameState.party.members = [EntityFactory.create('HUMANOID', { name: 'Aldric' })];
    gameState.seed = 777;
    gameState.world.isInterior = false;
    assert.equal(SaveManager.canSaveNow(), true, 'outside: allowed');
    assert.equal(SaveManager.createSnapshot().data.world.interior, null);

    gameState.world.isInterior = true;
    gameState.world.savedOverworld = null;
    assert.equal(SaveManager.canSaveNow(), false, 'inside with no way out recorded: refused');

    gameState.world.savedOverworld = { seed: 111, returnCol: 4, returnRow: 9 };
    gameState.world.interiorType = 'HOUSE';
    gameState.world.interiorId = 'h1';
    gameState.world.interiorMapId = 'map_a';
    assert.equal(SaveManager.canSaveNow(), true, 'inside with a way out: allowed');
    const snap = JSON.parse(JSON.stringify(SaveManager.createSnapshot()));
    assert.deepEqual(snap.data.world.interior, { type: 'HOUSE', id: 'h1', mapId: 'map_a', savedOverworld: { seed: 111, returnCol: 4, returnRow: 9 } });

    gameState.world.isInterior = false;
    gameState.world.savedOverworld = null;
    gameState.world.interiorType = null;
    SaveManager.applySnapshot(snap);
    assert.equal(gameState.world.isInterior, true);
    assert.equal(gameState.world.interiorType, 'HOUSE');
    assert.equal(gameState.world.interiorId, 'h1');
    assert.equal(gameState.world.interiorMapId, 'map_a');
    assert.deepEqual(gameState.world.savedOverworld, { seed: 111, returnCol: 4, returnRow: 9 });
    assert.equal(gameState.seed, 777, 'the interior\'s own seed is kept');

    snap.data.world.interior = null;   // a save made outside (or an older one) loads on the overworld
    SaveManager.applySnapshot(snap);
    assert.equal(gameState.world.isInterior, false);
    gameState.world.savedOverworld = null;
});
