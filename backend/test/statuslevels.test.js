// backend/test/statuslevels.test.js: `npm test`. Every buff and debuff has three levels, 20%, 35% and 50% (STATUS_LEVELS). The weather puts on level 1;
// an ability puts on level 1 too unless its effect names a `level`, and putting it on again raises it a level, up to 3. And the fog's loop is long now.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { StatusEffectDefinitions as SD, STATUS_LEVELS, statusDescription } from '../../shared/abilities/statusEffectDefinitions.js';
import { StatusEffectFactory } from '../../shared/abilities/statusEffectFactory.js';
import { AbilitySystem } from '../../shared/abilities/abilitySystem.js';
import { WeatherDefinitions as W } from '../../shared/world/weatherDefinitions.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { CombatantModel } from '../../shared/battle/combatantModel.js';
import { statusInfo } from '../../frontend/src/ui/statusTooltip.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };
const fighter = (team = 'party') => quiet(() => new CombatantModel(EntityFactory.create('HUMANOID', { level: 10, levelEdge: false }), team));
const BUFFS = ['wet', 'slowed', 'fortified', 'enlightened', 'dimmed', 'enraged', 'weakened', 'attuned', 'suppressed', 'evasive', 'vulnerable', 'exposed'];

test('the three levels are 20%, 35% and 50%, and every buff and debuff has them', () => {
    assert.deepEqual(STATUS_LEVELS, [0.2, 0.35, 0.5]);
    for (const id of BUFFS) {
        const d = SD[id];
        assert.equal(d.leveled, true, id);
        assert.equal(d.maxStacks, 3, `${id}: three levels`);
        for (const m of d.modifiers) assert.equal(Math.abs(m.value), 1, `${id} ${m.target}: a direction, times the level's share`);
        assert.match(d.description, /\{pct\}/, `${id}: its description names the share`);
    }
    assert.equal(statusDescription(SD.enraged, 1), 'Slash, blunt and pierce attacks are 20% stronger.');
    assert.equal(statusDescription(SD.enraged, 3), 'Slash, blunt and pierce attacks are 50% stronger.');
    for (const id of ['poison', 'bleed', 'burn', 'severed', 'bear_form', 'eye_of_the_storm']) assert.ok(!SD[id].leveled, `${id} is not a buff or debuff with levels`);
});

test('the stats follow the level: 20%, 35%, 50%', () => {
    for (const [level, share] of STATUS_LEVELS.map((s, i) => [i + 1, s])) {
        const c = fighter();
        const before = c.stats.speed;
        c.applyStatusEffect(StatusEffectFactory.createEffect('slowed', null, null, level));
        assert.ok(Math.abs(c.stats.speed - before * (1 - share)) < 0.6, `slowed level ${level}: ${before} -> ${c.stats.speed}`);
        const e = fighter();
        const atk = e.stats.attack.slash;
        e.applyStatusEffect(StatusEffectFactory.createEffect('enraged', 3, null, level));
        assert.ok(Math.abs(e.stats.attack.slash - atk * (1 + share)) <= 1, `enraged level ${level}: ${atk} -> ${e.stats.attack.slash}`);
    }
});

test('the weather puts on level 1 of its status', () => {
    for (const w of Object.values(W).filter(w => w.appliedStatusId)) {
        const st = StatusEffectFactory.createEffect(w.appliedStatusId, w.appliedStatusCharges ?? null, null);
        assert.ok(SD[w.appliedStatusId].leveled, `${w.id}: ${w.appliedStatusId} is a buff or debuff`);
        assert.equal(st.level, 1, `${w.id}: level 1`);
    }
    const c = fighter();
    c.applyStatusEffect(StatusEffectFactory.createEffect('evasive', 99, null));
    assert.match(statusInfo(c.statusEffects[0]).text, /^20% more evasion/, 'the fog makes everyone 20% harder to hit');
});

test('an ability puts on level 1, and again raises it a level, up to 3; the card says which', () => {
    const src = fighter(), tgt = fighter();
    const cast = () => quiet(() => withRandom(0.01, () => AbilitySystem.execute('howl', src, tgt)));
    const r1 = cast();
    const st = tgt.statusEffects.find(s => s.id === 'enraged');
    assert.equal(st.level, 1, r1.message);
    const r2 = cast();
    assert.equal(st.level, 2);
    assert.match(r2.message, /Level 2/);
    cast(); cast();
    assert.equal(st.level, 3, 'no higher than 3');
    assert.deepEqual(statusInfo(st).lines.filter(l => l.startsWith('Level')), ['Level 3 of 3']);
    // an effect that names a level starts there, and a lower level put on later never drops it
    const t2 = fighter();
    t2.applyStatusEffect(StatusEffectFactory.createEffect('weakened', 3, null, 2));
    assert.equal(t2.statusEffects[0].level, 2);
    t2.applyStatusEffect(StatusEffectFactory.createEffect('weakened', 3, null, 1));
    assert.equal(t2.statusEffects[0].level, 2, 'kept at level 2');
});

test('the fog loop is long: over a minute, not three seconds', () => {
    const buf = fs.readFileSync(new URL('../../frontend/src/assets/audio/sfx/weather_fog.wav', import.meta.url));
    assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
    const rate = buf.readUInt32LE(24), bytesPerSec = buf.readUInt32LE(28);
    let off = 12, dataLen = 0;
    while (off < buf.length - 8) { const id = buf.toString('ascii', off, off + 4), len = buf.readUInt32LE(off + 4); if (id === 'data') { dataLen = len; break; } off += 8 + len; }
    const seconds = dataLen / bytesPerSec;
    assert.ok(seconds >= 60, `${seconds.toFixed(1)} s at ${rate} Hz`);
});
