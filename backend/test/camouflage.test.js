// backend/test/camouflage.test.js: `npm test`. The Camouflage item (4 hours without random battles), the Darius music, and the shorter Shackled quest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameState } from '../../shared/core/gameState.js';
import { AbilitySystem } from '../../shared/abilities/abilitySystem.js';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { QuestDefinitions } from '../../shared/story/questDefinitions.js';
import { mysteriousAltar } from '../../shared/story/encounters/story/mysteriousAltar.js';

const quiet = (fn) => { const log = console.log, warn = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = log; console.warn = warn; } };
const src = (rel) => fs.readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

const setup = () => {
    gameState.world.day = 3;
    gameState.world.time = 600;   // 10:00
    gameState.player.buffs = {};
    return quiet(() => EntityFactory.create('HUMANOID', { name: 'Aldric', attributes: { vigor: 10, strength: 10, dexterity: 10, intelligence: 10, attunement: 10 } }));
};

test('the Camouflage item is a consumable at col 9, row 1 that runs the camouflage ability', () => {
    const item = ItemDefinitions.camouflage;
    assert.ok(item, 'defined');
    assert.equal(item.type, 'consumable');
    assert.deepEqual(item.icon, { col: 9, row: 1 });
    assert.equal(item.useAbility, 'camouflage');
    assert.ok(AbilityDefinitions.camouflage, 'the ability exists');
    assert.equal(AbilityDefinitions.camouflage.context, 'overworld');
    assert.ok(item.usability.includes('overworld') && item.stackable);
});

test('using it starts a 4 hour buff that grants no_ambush, and the grant ends with it', () => {
    const hero = setup();
    assert.equal(AbilitySystem.hasWorldGrant('no_ambush'), false, 'ambushes happen before');
    const result = quiet(() => AbilitySystem.execute('camouflage', hero, hero, { context: 'overworld' }));
    assert.ok(result && result.success !== false, 'it works');
    const buff = AbilitySystem.getWorldBuffs().find(b => b.id === 'camouflage');
    assert.ok(buff, 'the buff is running');
    assert.equal(buff.durationMinutes, 4 * 60);
    assert.equal(buff.light, null, 'it gives no light');
    assert.equal(AbilitySystem.hasWorldGrant('no_ambush'), true);

    gameState.world.time += 4 * 60 - 1;
    assert.equal(AbilitySystem.hasWorldGrant('no_ambush'), true, 'still hidden a minute before the end');
    gameState.world.time += 2;
    assert.equal(AbilitySystem.hasWorldGrant('no_ambush'), false, 'visible again after 4 hours');
    assert.equal(quiet(() => AbilitySystem.getWorldBuffs()).length, 0);
});

test('a second one does nothing while more than half is left, and the overworld skips the battle roll under it', () => {
    const hero = setup();
    quiet(() => AbilitySystem.execute('camouflage', hero, hero, { context: 'overworld' }));
    const again = quiet(() => AbilitySystem.execute('camouflage', hero, hero, { context: 'overworld' }));
    assert.equal(again.success, false, 'not wasted');
    const ctl = src('frontend/src/screens/overworld/overworldController.js');
    const check = ctl.indexOf("AbilitySystem.hasWorldGrant('no_ambush')");
    assert.ok(check > 0, 'the controller asks');
    assert.ok(check < ctl.indexOf('biome.getBattle('), 'before the battle is rolled');
    assert.ok(check > ctl.indexOf('START_ENCOUNTER'), 'but after story encounters, which are not random battles');
});

test('Darius: the encounter stage plays Darius_battle_bgm and his fight plays bossbattle', () => {
    const stage = mysteriousAltar.stages.darius_rises;
    assert.equal(stage.bgm, 'dariusEncounterBgm');
    const start = stage.decisions[0].outcomes[0].results.find(r => r.type === 'START_BATTLE');
    assert.equal(start.payload.tableId, 'darius_boss');
    assert.equal(start.payload.bgm, 'bossBattleBgm');
    assert.deepEqual(start.payload.afterVictory, { encounterId: 'act_two' }, 'still ends in act 2');
    const main = src('frontend/src/main.js');
    assert.match(main, /dariusEncounterBgm:\s*'\.\/assets\/audio\/music\/Darius_battle_bgm\.mp3'/);
    assert.match(main, /bossBattleBgm:\s*'\.\/assets\/audio\/music\/bossbattle\.mp3'/);
});

test('the Shackled quest asks for 3 legionaries, not 4', () => {
    const o = QuestDefinitions.shackled7.objectives.find(x => x.targetId === 'LEGIONARY');
    assert.equal(o.amount, 3);
});
