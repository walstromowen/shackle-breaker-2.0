// backend/test/hawk.test.js: `npm test`. The hunting hawk is a starting companion again: offered in the character creator, built like the other
// beast companions, with a battle sheet that faces the enemy from the party's side and a map sheet to follow the leader with.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ENTITY_DEFINITIONS } from '../../shared/characters/entityDefinitions.js';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { StatCalculator } from '../../shared/characters/statCalculator.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { CREATION_DATA } from '../../frontend/src/screens/characterCreator/characterCreatorLogic.js';

const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
const fileOf = (key) => { const m = main.match(new RegExp(`\\b${key}:\\s*'\\./([^']+)'`)); return m && new URL(`../../frontend/src/${m[1]}`, import.meta.url); };
const pngSize = (url) => { const b = fs.readFileSync(url); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('the hawk is offered as a starting companion and joins as a beast with its own abilities', () => {
    const offer = CREATION_DATA.COMPANIONS.find(c => c.speciesId === 'HAWK');
    assert.ok(offer, 'Hunting Hawk is in the character creator');
    const H = ENTITY_DEFINITIONS.HAWK;
    for (const id of H.abilities) assert.ok(AbilityDefinitions[id], `${id} exists`);
    assert.ok(H.abilities.includes('claw') && H.abilities.includes('hit_and_run'));
    const hawk = EntityFactory.create('HAWK', { name: offer.label, attributes: { ...offer.attributes } });
    assert.equal(StatCalculator.usesEnemyScaling(hawk), true, 'beast rules, like the dog and the snow leopard');
    const s = StatCalculator.calculate(hawk);
    const dog = StatCalculator.calculate(EntityFactory.create('DOG', {}));
    assert.ok(s.speed > dog.speed && s.evasion > dog.evasion, 'faster and harder to hit than the dog');
    assert.ok(s.maxHp < dog.maxHp, 'and more fragile');
});

test("the hawk's sheets are registered, on disk and laid out like the others", () => {
    const H = ENTITY_DEFINITIONS.HAWK;
    assert.deepEqual(pngSize(fileOf(H.spritePortrait)), [2048, 1024], 'battle sheet: 16 frames of 128 to a row, rows 0-1 and 4-5 used');
    assert.deepEqual(pngSize(fileOf(H.spriteOverworld)), [512, 960], 'map sheet: like the heroes');
    assert.ok(fileOf(H.crySound) && fs.existsSync(fileOf(H.crySound)), 'its cry');
});
