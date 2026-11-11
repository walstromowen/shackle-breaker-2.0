// backend/test/plainsworld.test.js: `npm test`. Watchmen walk the plains (rarely by day, a middling share at night and under the blood moon); old
// battlefields (the Aftermath) are a little commoner; and the strange obelisks can stand on the top layer of every exterior biome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpawnTableDefinitions } from '../../shared/battle/spawnTableDefinitions.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';

/* The chance a foe of this table is a watchman, in act 1 (entries with minAct are left out): each pool's chance of being picked, times the
   watchman's share of it */
function watchShare(tableId) {
    const pools = SpawnTableDefinitions[tableId].pools;
    const total = pools.reduce((a, p) => a + p.weight, 0);
    let share = 0;
    for (const pool of pools) {
        const members = pool.members.filter(m => !m.minAct);
        const all = members.reduce((a, m) => a + m.weight, 0);
        const watch = members.filter(m => m.id === 'WATCHMAN').reduce((a, m) => a + m.weight, 0);
        if (all) share += (pool.weight / total) * (watch / all);
    }
    return share;
}

test('watchmen: rare in a plains day fight, a middling share at night and under the blood moon', () => {
    const day = watchShare('plains_battles_day'), night = watchShare('plains_battles_night'), blood = watchShare('plains_battles_blood_moon');
    assert.ok(day > 0 && day <= 0.03, `rare by day (${(day * 100).toFixed(1)}%)`);
    assert.ok(night > 2.5 * day, 'much commoner at night than by day');
    assert.ok(night >= 0.06 && night <= 0.12, `a middling share at night (${(night * 100).toFixed(1)}%)`);
    assert.ok(blood >= 0.06 && blood <= 0.12, `and under the blood moon (${(blood * 100).toFixed(1)}%)`);
});

test('old battlefields (the Aftermath) are a little commoner on the plains, and the graveyards as common as before', () => {
    const lm = BIOME_DEFINITIONS.PLAINS.landmarks;
    const share = (id) => { let cum = 0; for (const p of lm.pools) { if (p.id === id) return p.chance * lm.rate; cum += p.chance; } return 0; };
    assert.ok(share('BATTLEFIELD') > 0.06 + 1e-9, `more battlefields than the 6% of chunks they had (${(share('BATTLEFIELD') * 100).toFixed(1)}%)`);
    assert.ok(Math.abs(share('GRAVEYARD') - 0.06) < 0.002, `graveyards stay at about 6% (${(share('GRAVEYARD') * 100).toFixed(1)}%)`);
});

test('the strange obelisks can stand on the top layer of every exterior biome', () => {
    // the top layer of each: the plains' hills rise three levels (LAYER_5), the desert's mesas two (LAYER_4), the snowy mountains five (LAYER_7)
    const TOP = { PLAINS: 5, DESERT: 4, SNOWY_MOUNTAINS: 7 };
    const exterior = Object.entries(BIOME_DEFINITIONS).filter(([id]) => !/INTERIOR/.test(id)).map(([id]) => id);
    assert.deepEqual(exterior.sort(), Object.keys(TOP).sort(), 'every exterior biome is covered');
    for (const id of exterior) {
        const rules = (BIOME_DEFINITIONS[id].mapObjects || {})._ALTITUDE || [];
        const ob = rules.find(r => r.id === 'STRANGE_OBELISK');
        assert.ok(ob && ob.chance > 0, `${id} has obelisks`);
        assert.equal(ob.minLevel, TOP[id], `${id}: on its top layer`);
        assert.equal(ob.maxLevel, TOP[id]);
    }
});
