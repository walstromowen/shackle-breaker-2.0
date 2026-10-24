// backend/test/healerspouch.test.js: `npm test`. The Healer's Pouch keepsake in the character creator.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';

const logic = await import('../../frontend/src/screens/characterCreator/characterCreatorLogic.js');
const exported = Object.values(logic).find(v => v && typeof v === 'object' && Array.isArray(v.KEEPSAKES));
const KEEPSAKES = exported ? exported.KEEPSAKES : (logic.CREATOR_OPTIONS || logic.OPTIONS || {}).KEEPSAKES;

test("the Healer's Pouch holds 3 of each herb, 1 healing tonic and 1 of each status cure", () => {
    const pouch = KEEPSAKES.find(k => k.label === "Healer's Pouch");
    const qty = Object.fromEntries(pouch.items.map(i => [i.id, i.qty]));
    for (const herb of ['healing_herb', 'invigorating_herb', 'illuminating_herb']) assert.equal(qty[herb], 3, herb);
    assert.equal(qty.healing_tonic, 1);
    // every current cure: a consumable whose use ability only dispels a status (plus the little heal)
    const cures = Object.values(ItemDefinitions).filter(d => d.useAbility && (AbilityDefinitions[d.useAbility]?.effects || []).some(e => e.type === 'dispel')).map(d => d.id);
    assert.ok(cures.length >= 3);
    for (const cure of cures) assert.equal(qty[cure], 1, `1 ${cure}`);
    for (const id of Object.keys(qty)) assert.ok(ItemDefinitions[id], `${id} exists`);
});
