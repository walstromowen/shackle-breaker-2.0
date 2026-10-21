// backend/test/recruit.test.js: `npm test`. Recruiting (the wounded mutt and the other companions) and the material economy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EncounterLogic } from '../../frontend/src/controllers/encounter/encounterLogic.js';
import { encounterDefinitions } from '../../shared/data/encounterDefinitions.js';
import { ItemDefinitions } from '../../shared/data/itemDefinitions.js';
import { gameState } from '../../shared/state/gameState.js';
import { EntityFactory } from '../../shared/systems/factories/entityFactory.js';

const model = () => ({ context: {}, instanceId: 'test' });
const fresh = () => { gameState.party.members = [EntityFactory.create('MAD_MAN')]; };

test('the tamed mutt joins the party, rested, and the player is told', () => {
    fresh();
    const stage = encounterDefinitions.wounded_mutt.stages.success_tame;
    const results = stage.decisions[0].outcomes[0].results;
    const r = EncounterLogic.resolveResults(results, model(), {});
    assert.equal(gameState.party.members.length, 2);
    const dog = gameState.party.members[1];
    assert.equal(dog.name, 'Dog');
    assert.equal(dog.hp, dog.maxHp);
    assert.ok(r.messages.some(m => /Dog joined your party/.test(m)), r.messages.join('|'));
    assert.equal(r.shouldEndEncounter, true);
});

test('every recruit in the game names an entity that exists', () => {
    const ids = new Set();
    const walk = (n) => { if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === 'object') { if (n.type === 'RECRUIT_CHARACTER') ids.add(n.payload.entityId); Object.values(n).forEach(walk); } };
    walk(encounterDefinitions);
    assert.ok(ids.has('DOG'));
    for (const id of ids) assert.ok(EntityFactory.create(id), `${id} can be created`);
});

test('a full party is told there is no room instead of silently losing the companion', () => {
    gameState.party.members = Array.from({ length: 6 }, () => EntityFactory.create('MAD_MAN'));
    const r = EncounterLogic.resolveResults([{ type: 'RECRUIT_CHARACTER', payload: { entityId: 'DOG' } }], model(), {});
    assert.equal(gameState.party.members.length, 6);
    assert.ok(r.messages.some(m => /party is full/i.test(m)));
});

test('materials are cheap, and herbs stay worth twice plant fibers', () => {
    const mats = Object.values(ItemDefinitions).filter(i => i.type === 'material' && i.id !== 'meteorite');
    assert.ok(mats.length >= 19);
    for (const m of mats) assert.ok(m.value >= 2 && m.value <= 32, `${m.id} = ${m.value}`);
    const v = (id) => ItemDefinitions[id].value;
    assert.ok(v('hard_wood') > v('soft_wood') && v('iron_ingot') > v('iron_ore') && v('bronze_ingot') > v('copper_ingot'), 'refined goods still outrank raw ones');
    for (const id of ['healing_herb', 'invigorating_herb', 'illuminating_herb']) assert.equal(v(id), v('plant_fibers') * 2, id);
});
