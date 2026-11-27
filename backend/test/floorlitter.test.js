// backend/test/floorlitter.test.js: `npm test`. Floor litter: the plains' grass and dirt carry small pixel decals (tufts, clover, flowers, pebbles, twigs;
// pebbles, cracks, prints, straw) and soft patches, drawn by BlobTerrainRenderer over whole, flat ground only. The sheet must hold what the settings say.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';

const pngSize = (url) => { const b = fs.readFileSync(url); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

test('the plains have floor litter on their grass and dirt, and the sheet holds every decal and patch the settings name', () => {
    const plains = Object.values(BIOME_DEFINITIONS).find(b => b.id === 'PLAINS');
    const L = plains.blobTileset.litter;
    assert.ok(L && L.sheet && L.grass > 0 && L.dirt > 0, 'the plains have litter');
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    const m = main.match(new RegExp(`${L.sheet}:\\s*'([^']+)'`));
    assert.ok(m, 'its sheet is registered');
    const { w, h } = pngSize(new URL(`../../frontend/src/${m[1].replace('./', '')}`, import.meta.url));
    assert.ok(h >= 128, 'two rows of decals and a row of patches');
    assert.ok(w >= Math.max(L.grass, L.dirt) * 32, 'every decal is on it');
    for (const kind of ['grass', 'dirt']) for (const i of L.patches[kind]) assert.ok((i + 1) * 64 <= w, `${kind} patch ${i} is on it`);
    const ch = L.chance;
    for (const kind of ['grass', 'dirt']) { const v = typeof ch === 'object' ? ch[kind] : ch; assert.ok(v > 0 && v < 1, `${kind}: some cells, not all`); }
});

test('litter only lies on whole ground, picked by the cell\'s place, under everything else', () => {
    const src = fs.readFileSync(new URL('../../frontend/src/screens/overworld/blobTerrainRenderer.js', import.meta.url), 'utf8');
    assert.match(src, /n\.water \|\| n\.lv !== lv \|\| this\._pack\(c \+ dx, r \+ dy\) !== pack \|\| dirtAt\(c \+ dx, r \+ dy\) !== d/, 'eight neighbours of its level, ground and biome');
    assert.match(src, /terrain\.getStairAt\(c, r\)/, 'never on a stair');
    assert.ok(!/Math\.random/.test(src.slice(src.indexOf('_drawLitter('), src.indexOf('_stairCarved('))), 'no dice: the same litter every frame');
});
