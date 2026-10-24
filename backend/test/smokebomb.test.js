// backend/test/smokebomb.test.js: `npm test`. The smoke bomb on the overworld (4 hours without random battles), the Darius music, and the shorter Shackled quest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameState } from '../../shared/core/gameState.js';
import { AbilitySystem } from '../../shared/abilities/abilitySystem.js';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { craftingRecipeDefinitions } from '../../shared/items/craftingRecipeDefinitions.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { QuestDefinitions } from '../../shared/story/questDefinitions.js';

const quiet = (fn) => { const log = console.log, warn = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = log; console.warn = warn; } };
const src = (rel) => fs.readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

const setup = () => {
    gameState.world.day = 3;
    gameState.world.time = 600;   // 10:00
    gameState.player.buffs = {};
    return quiet(() => EntityFactory.create('HUMANOID', { name: 'Aldric', attributes: { vigor: 10, strength: 10, dexterity: 10, intelligence: 10, attunement: 10 } }));
};

test('there is no Camouflage item any more: the smoke bomb does the job, in a fight or on the overworld', () => {
    assert.equal(ItemDefinitions.camouflage, undefined);
    assert.equal(AbilityDefinitions.camouflage, undefined);
    assert.equal(craftingRecipeDefinitions.recipe_camouflage, undefined);
    const bomb = ItemDefinitions.smoke_bomb;
    assert.equal(bomb.useAbility, 'item_smoke_bomb');
    assert.deepEqual([...bomb.usability].sort(), ['battle', 'overworld']);
    assert.ok(AbilitySystem.usableIn('item_smoke_bomb', 'battle') && AbilitySystem.usableIn('item_smoke_bomb', 'overworld'));
    assert.ok(craftingRecipeDefinitions.recipe_smoke_bomb, 'it is still crafted as before');
});

test('thrown on the overworld it starts a 4 hour buff that grants no_ambush (and no evasion status), and the grant ends with it', () => {
    const hero = setup();
    assert.equal(AbilitySystem.hasWorldGrant('no_ambush'), false, 'ambushes happen before');
    const result = quiet(() => AbilitySystem.execute('item_smoke_bomb', hero, hero, { context: 'overworld' }));
    assert.equal(result.success, true);
    assert.deepEqual(result.addedTags, [], 'the evasion is for a fight only: it would linger into the next one');
    assert.ok(!(hero.statusEffects || []).some(s => s.id === 'evasive'));
    const buff = AbilitySystem.getWorldBuffs().find(b => b.id === 'smoke_cover');
    assert.ok(buff, 'the buff is running');
    assert.equal(buff.durationMinutes, 4 * 60);
    assert.equal(buff.light, null, 'it gives no light');
    assert.equal(AbilitySystem.hasWorldGrant('no_ambush'), true);

    gameState.world.time += 4 * 60 - 1;
    assert.equal(AbilitySystem.hasWorldGrant('no_ambush'), true, 'still hidden a minute before the end');
    gameState.world.time += 2;
    assert.equal(AbilitySystem.hasWorldGrant('no_ambush'), false, 'visible again after 4 hours');
});

test('in a fight it still hides one ally with evasion and starts no world buff', () => {
    const hero = setup();
    const result = quiet(() => AbilitySystem.execute('item_smoke_bomb', hero, hero, {}));
    assert.equal(result.success, true);
    assert.deepEqual(result.addedTags, ['evasive']);
    assert.equal(AbilitySystem.hasWorldGrant('no_ambush'), false);
    assert.equal(AbilitySystem.getWorldBuffs().length, 0);
});

test('a second bomb does nothing while more than half is left, and the overworld skips the battle roll under it', () => {
    const hero = setup();
    quiet(() => AbilitySystem.execute('item_smoke_bomb', hero, hero, { context: 'overworld' }));
    const again = quiet(() => AbilitySystem.execute('item_smoke_bomb', hero, hero, { context: 'overworld' }));
    assert.equal(again.success, false, 'not wasted');
    const ctl = src('frontend/src/screens/overworld/overworldController.js');
    const check = ctl.indexOf("AbilitySystem.hasWorldGrant('no_ambush')");
    assert.ok(check > 0, 'the controller asks');
    assert.ok(check < ctl.indexOf('biome.getBattle('), 'before the battle is rolled');
    assert.ok(check > ctl.indexOf('START_ENCOUNTER'), 'but after story encounters, which are not random battles');
});

test('the Shackled quest asks for 3 legionaries, not 4', () => {
    const o = QuestDefinitions.shackled7.objectives.find(x => x.targetId === 'LEGIONARY');
    assert.equal(o.amount, 3);
});
