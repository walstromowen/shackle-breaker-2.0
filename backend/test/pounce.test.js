// backend/test/pounce.test.js: `npm test`. The dog's Pounce and its buff, Inferno with the burn's flames (a little weaker), and ability cards that
// show how fast an ability goes for the one using it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { ENTITY_DEFINITIONS as E } from '../../shared/characters/entityDefinitions.js';
import * as Anim from '../../shared/battle/animation/battleAnimationDefinition.js';

const ANIMS = Object.values(Anim).find(v => v && typeof v === 'object' && v.inferno);
const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');

test('dogs Pounce: a heavy blunt leap with a chance to knock the target down, its own icon, animation and sound', () => {
    const p = A.pounce;
    assert.equal(p.effects[0].damageType, 'blunt');
    assert.ok(p.effects[0].power > A.bite.effects[0].power, 'harder than a bite');
    assert.deepEqual(p.statusEffects.map(s => [s.id, s.chance]), [['knocked_down', 0.2]]);
    assert.deepEqual(p.icon, { col: 12, row: 2 });
    assert.ok(!Object.values(A).some(a => a !== p && a.icon && a.icon.col === 12 && a.icon.row === 2), 'a cell of its own');
    assert.ok(ANIMS.pounce, 'its animation');
    assert.match(main, /pounceSfx: '\.\/assets\/audio\/sfx\/abilities\/pounce\.mp3'/);
    assert.ok(fs.existsSync(new URL('../../frontend/src/assets/audio/sfx/abilities/pounce.mp3', import.meta.url)));
    assert.ok(E.DOG.abilities.includes('pounce') && E.DOG.abilities.includes('bite'));
    assert.ok(E.DOG.baseStats.baseAttack.pierce >= 7 && E.DOG.baseStats.baseAttack.blunt >= 6, 'a dog with some bite to it');
});

test('Inferno: the burn\'s own flames, and a little weaker than it was', () => {
    assert.equal(A.inferno.effects[0].power, 2.2);
    const sheets = JSON.stringify(ANIMS.inferno);
    assert.ok(sheets.includes('burnAnimation'), 'the burn sheet');
    assert.ok(!sheets.includes('firePunchAnimation'));
});

test('an ability card shows its speed for the one using it: their speed times the ability\'s speed modifier', async () => {
    const { AbilityPreview } = await import('../../frontend/src/ui/abilityPreview.js');
    const chip = (ab, stats) => AbilityPreview.getStatChips(ab, null, stats).find(c => c.label === 'Spd:');
    assert.equal(chip(A.slash, { speed: 10, attack: {} }).value, '10');
    assert.equal(chip(A.lightning_strike, { speed: 10, attack: {} }).value, '8.5 (x0.85)');
    assert.equal(AbilityPreview.getSpeed(A.lightning_strike, null).text, 'x0.85', 'no one to read a speed from: the modifier');
});
