// backend/test/cures.test.js: `npm test`. Bandage, antidote, aloe (and where the aloe grows), the tonic recipes, and metal prices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { craftingRecipeDefinitions as CraftingRecipeDefinitions } from '../../shared/items/craftingRecipeDefinitions.js';
import { MAP_OBJECTS_DEFINITIONS } from '../../shared/world/mapObjectDefinitions.js';
import { CONFIG } from '../../shared/core/constants.js';
import { biomeFactory } from '../../shared/world/biomeFactory.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { StatusEffectFactory } from '../../shared/abilities/statusEffectFactory.js';
import { AbilitySystem } from '../../shared/abilities/abilitySystem.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(root, p));
function decodePng(p) {   // 8-bit RGBA, non-interlaced
    const b = read(p); let o = 8, idat = [], width = 0, height = 0;
    while (o < b.length) {
        const len = b.readUInt32BE(o), type = b.toString('ascii', o + 4, o + 8);
        if (type === 'IHDR') { width = b.readUInt32BE(o + 8); height = b.readUInt32BE(o + 12); assert.equal(b[o + 17], 6); }
        if (type === 'IDAT') idat.push(b.subarray(o + 8, o + 8 + len));
        o += 12 + len;
    }
    const raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * 4, data = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) {
        const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        for (let x = 0; x < stride; x++) {
            const a = x >= 4 ? data[y * stride + x - 4] : 0, up = y ? data[(y - 1) * stride + x] : 0, c = x >= 4 && y ? data[(y - 1) * stride + x - 4] : 0;
            let v = line[x];
            if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
            else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? up : c); }
            data[y * stride + x] = v & 255;
        }
    }
    return { width, height, data };
}
const cellHasArt = (img, col, row, size = 64) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (img.data[((row * size + y) * img.width + col * size + x) * 4 + 3] > 0) return true; return false; };

const CURES = { bandage: ['item_bandage', 'bleed'], antidote: ['item_antidote', 'poison'], aloe: ['item_aloe', 'burn'] };

test('bandage, antidote and aloe are consumables with art, each curing exactly one status', () => {
    const sheet = decodePng('frontend/src/assets/icons/consumables.png');
    for (const [id, [abilityId, status]] of Object.entries(CURES)) {
        const item = ItemDefinitions[id];
        assert.equal(item.type, 'consumable'); assert.equal(item.useAbility, abilityId);
        assert.ok(item.usability.includes('overworld') && item.usability.includes('battle'));
        assert.ok(cellHasArt(sheet, item.icon.col, item.icon.row), `${id} icon cell is drawn`);
        const dispel = AbilityDefinitions[abilityId].effects.find(e => e.type === 'dispel');
        assert.deepEqual(dispel.tags, [status]);
        assert.equal(AbilityDefinitions[abilityId].targeting.scope, 'ally');
    }
    const cells = Object.values(ItemDefinitions).filter(i => i.type === 'consumable').map(i => `${i.icon.col},${i.icon.row}`);
    for (const id of Object.keys(CURES)) assert.equal(cells.filter(c => c === `${ItemDefinitions[id].icon.col},${ItemDefinitions[id].icon.row}`).length, 1, `${id} shares no icon cell`);
});

test('using a cure removes its status and nothing else; with nothing to cure it does nothing (so the item is kept)', () => {
    for (const [id, [abilityId, status]] of Object.entries(CURES)) {
        const hero = EntityFactory.create('HUMANOID', 1);
        assert.equal(AbilitySystem.execute(abilityId, hero, hero, { context: 'overworld' }).success, false, `${id}: nothing to cure`);
        for (const s of ['poison', 'bleed', 'burn']) hero.applyStatusEffect(StatusEffectFactory.createEffect(s));
        const r = AbilitySystem.execute(abilityId, hero, hero, { context: 'overworld' });
        assert.equal(r.success, true, id);
        const left = hero.statusEffects.map(s => s.id).sort();
        assert.deepEqual(left, ['bleed', 'burn', 'poison'].filter(s => s !== status), `${id} removes only ${status}`);
    }
});

test('aloe grows only in the desert and is picked up by walking over it', () => {
    const def = MAP_OBJECTS_DEFINITIONS.ALOE_PLANT;
    assert.deepEqual(def.interaction, { type: 'PICKUP', itemId: 'aloe', amount: 1 });
    assert.ok(!def.isSolid);
    assert.deepEqual([decodePng('frontend/src/assets/mapObjects/objAloe.png').width, decodePng('frontend/src/assets/mapObjects/objAloe.png').height], [32, 32]);
    assert.match(fs.readFileSync(path.join(root, 'frontend/src/main.js'), 'utf8'), /objAloe: '\.\/assets\/mapObjects\/objAloe\.png'/);
    const spawns = (biome) => { let n = 0; for (let i = 0; i < 10000; i++) if (biomeFactory.getBiome(biome).getSpawnId(CONFIG.TILE_TYPES.LAYER_2, i / 10000)?.id === 'ALOE_PLANT') n++; return n; };
    assert.equal(spawns('DESERT'), 40, '0.4% of desert ground');
    for (const b of ['PLAINS', 'SNOWY_MOUNTAINS', 'CAVE']) assert.equal(spawns(b), 0, b);
});

test('each tonic needs three of its herb and two bones', () => {
    for (const herb of ['healing', 'invigorating', 'illuminating']) {
        assert.deepEqual(CraftingRecipeDefinitions[`recipe_${herb}_tonic`].materials, { [`${herb}_herb`]: 3, bone: 2 });
    }
});

test('bandage and antidote can be crafted from real materials', () => {
    for (const [id, rid] of [['bandage', 'recipe_bandage'], ['antidote', 'recipe_antidote']]) {
        const r = CraftingRecipeDefinitions[rid];
        assert.equal(r.outputItemId, id);
        for (const m of Object.keys(r.materials)) assert.ok(ItemDefinitions[m], `${rid} uses ${m}`);
    }
});

test('iron is worth clearly more than copper', () => {
    const v = (id) => ItemDefinitions[id].value;
    assert.ok(v('iron_ore') >= v('copper_ore') * 2 - 1, `${v('iron_ore')} vs ${v('copper_ore')}`);
    assert.ok(v('iron_ingot') >= v('copper_ingot') * 1.5, `${v('iron_ingot')} vs ${v('copper_ingot')}`);
    assert.ok(v('bronze_ingot') > v('copper_ingot') && v('copper_ingot') > v('copper_ore'));
});
