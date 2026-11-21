// backend/test/insightspells.test.js: `npm test`. The Insights of Wind, Water, Ice and Lightning each grow a full set of spells as they are raised,
// and the arcane vortex is Arcane Blast's backdrop, not Arcane Dart's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { StatusEffectDefinitions as S } from '../../shared/abilities/statusEffectDefinitions.js';
import * as Anim from '../../shared/battle/animation/battleAnimationDefinition.js';

const ANIMS = Object.values(Anim).find(v => v && typeof v === 'object' && v.arcane_blast);

test('the arcane vortex plays behind Arcane Blast, and no longer behind Arcane Dart', () => {
    assert.ok(ANIMS.arcane_blast.background && ANIMS.arcane_blast.background.key === 'arcaneVortexBg');
    assert.ok(!ANIMS.arcane_dart.background, 'Arcane Dart has none');
});

test('the Insights of Wind, Water, Ice and Lightning: new spells as each is raised, every one with its animation, a free icon cell and real effects', () => {
    const want = {
        insight_of_wind: { granted: ['gust'], unlocks: { 2: ['downwind'], 3: ['tempest'] } },
        insight_of_water: { granted: ['water_blast'], unlocks: { 2: ['waterfall'], 3: ['tidal_wave'], 4: ['mending_tide'] } },
        insight_of_ice: { granted: ['ice_shard'], unlocks: { 2: ['frigid_gale'], 3: ['glacial_spike'], 4: ['frost_ward'] } },
        insight_of_lightning: { granted: ['shock'], unlocks: { 2: ['overload'], 3: ['chain_lightning'], 4: ['lightning_strike'] } }
    };
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    const used = new Map();
    for (const a of Object.values(A)) if (a.icon) { const k = `${a.icon.col},${a.icon.row}`; used.set(k, [...(used.get(k) || []), a.id]); }
    for (const [item, w] of Object.entries(want)) {
        assert.deepEqual(I[item].grantedAbilities, w.granted, `${item} gives`);
        assert.deepEqual(I[item].abilityUnlocks, w.unlocks, `${item} unlocks`);
        assert.ok(Math.max(...Object.keys(w.unlocks).map(Number)) <= I[item].maxLevel, `${item}: reachable`);
    }
    const fresh = ['gust', 'downwind', 'tempest', 'tidal_wave', 'mending_tide', 'glacial_spike', 'frost_ward', 'chain_lightning', 'lightning_strike'];
    for (const id of fresh) {
        const a = A[id];
        assert.ok(a && a.cost && a.cost.insight > 0, `${id}: an insight spell`);
        assert.ok(ANIMS[a.animationId], `${id}: its animation`);
        assert.deepEqual(used.get(`${a.icon.col},${a.icon.row}`), [id], `${id}: an icon cell of its own`);
        assert.ok((a.effects || []).length || (a.statusEffects || []).length, `${id}: does something`);
        for (const se of a.statusEffects || []) assert.ok(S[se.id], `${id}: ${se.id} exists`);
        // the sheets and sounds its animation uses are registered
        const json = JSON.stringify(ANIMS[a.animationId]);
        for (const key of json.match(/"[a-zA-Z0-9]+(?:Animation|Sfx)"/g) || []) assert.ok(main.includes(`${key.slice(1, -1)}:`), `${id}: ${key} registered`);
    }
    // and each has a sheet and sounds of its own: none borrowed from another animation, none shared between them
    const keysOf = (anim) => new Set(JSON.stringify(anim).match(/"[a-zA-Z0-9]+(?:Animation|Sfx)"/g) || []);
    const elsewhere = new Set();
    for (const [aid, anim] of Object.entries(ANIMS)) if (!fresh.includes(aid)) for (const k of keysOf(anim)) elsewhere.add(k);
    const mine = new Map();
    for (const id of fresh) {
        const keys = [...keysOf(ANIMS[A[id].animationId])];
        assert.ok(keys.some(k => k.endsWith('Animation"')) && keys.some(k => k.endsWith('Sfx"')), `${id}: a sheet and a sound`);
        for (const k of keys) {
            assert.ok(!elsewhere.has(k), `${id}: ${k} is borrowed from another animation`);
            assert.ok(!mine.has(k) || mine.get(k) === id, `${id}: ${k} is shared with ${mine.get(k)}`);
            mine.set(k, id);
            const file = main.match(new RegExp(`${k.slice(1, -1)}: '\\./([^']+)'`))[1];
            assert.ok(fs.existsSync(new URL(`../../frontend/src/${file}`, import.meta.url)), `${id}: ${file} exists`);
        }
    }
    assert.equal(A.downwind.name, 'Downwind');
    assert.equal(A.lightning_strike.name, 'Lightning Strike');
    assert.ok(!A.tailwind && !A.thunderbolt, 'the old names are gone');
    assert.ok(!I.insight_of_wind.grantedAbilities.includes('strike'), 'wind is no longer a plain Strike');
});
