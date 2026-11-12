// backend/test/heroes.test.js: `npm test`. Act 3: the stories of Mentoras, Nikoli and Jaeger come together (story/heroes.js). What the player told the
// two brothers decides it: ashes (neither), friends (Nikoli), pursuer (Jaeger), brothers (both). Mentoras never dies and never blames the player;
// nobody vanishes in front of the player; each player's story is their own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameState, resetWorldForNewGame } from '../../shared/core/gameState.js';
import { heroesOutcome, movedNorth, snowHouseResidents, catacombResidents, mentorasTaken } from '../../shared/story/heroes.js';
import { ActSystem } from '../../shared/story/actSystem.js';
import { InteriorFactory } from '../../shared/world/interiorFactory.js';
import { MAP_OBJECTS_DEFINITIONS as M } from '../../shared/world/mapObjectDefinitions.js';
import { ENTITY_DEFINITIONS as ENT } from '../../shared/characters/entityDefinitions.js';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { QuestDefinitions as Q } from '../../shared/story/questDefinitions.js';
import { encounterDefinitions as E } from '../../shared/story/encounterDefinitions.js';
import { VOICED, linesOf } from '../../shared/story/voiceLines.js';
import { WorldManager } from '../../shared/world/worldManager.js';

const DESERT_DONE = ['shackled_stranger', 'shackled1', 'shackled2', 'shackled3', 'shackled7', 'shackled8', 'codey1', 'codey2', 'codey3'];
const story = (milestones = [], { completed = DESERT_DONE, active = {} } = {}) => {
    gameState.milestones = ['act2', 'act3', ...milestones];
    gameState.quests = { active: { ...active }, completed: completed.slice(), trackedIds: [] };
};
const results = (enc, id) => E[enc].stages[id].decisions.flatMap(d => (d.outcomes || []).flatMap(o => o.results));
const nexts = (enc, id) => results(enc, id).filter(r => r.type === 'ADVANCE_STAGE').map(r => r.payload.stageId);

test('act 3 begins when the Dry Kraken dies, and keeps act 2\'s world', () => {
    assert.ok(results('codey_freed', 'sinks').some(r => r.type === 'GRANT_MILESTONE' && r.payload.id === 'act3'));
    gameState.milestones = ['act2', 'act3'];
    assert.equal(ActSystem.getAct(), 3);
    assert.equal(ActSystem.getActDefinition().bloodMoon, true, 'the blood moon goes on');
    gameState.milestones = [];
});

test('the four outcomes follow who was told; Jaeger never met counts as not told', () => {
    story([]); assert.equal(heroesOutcome(), 'ashes');
    story(['nikoli_told']); assert.equal(heroesOutcome(), 'friends');
    story(['jaeger_told']); assert.equal(heroesOutcome(), 'pursuer');
    story(['nikoli_told', 'jaeger_told']); assert.equal(heroesOutcome(), 'brothers');
    story([], { completed: DESERT_DONE.slice(0, -1) });
    assert.equal(movedNorth(), false, 'not before Codey is brought back');
});

test('who is in the snowy house, outcome by outcome; Mentoras is always there unless Jaeger holds him, and is never killed', () => {
    story([]); assert.deepEqual(snowHouseResidents(), ['HOODED_STRANGER_NPC', 'CODEY_NPC']);
    story(['nikoli_told']); assert.deepEqual(snowHouseResidents(), ['NIKOLI_NPC_REUNION', 'HOODED_STRANGER_NPC', 'CODEY_NPC']);
    story(['nikoli_told', 'friends_met']); assert.deepEqual(snowHouseResidents(), ['NIKOLI_NPC', 'HOODED_STRANGER_NPC', 'CODEY_NPC']);
    story(['nikoli_told', 'jaeger_told']); assert.deepEqual(snowHouseResidents(), ['NIKOLI_NPC_REUNION', 'HOODED_STRANGER_NPC', 'CODEY_NPC']);
    story(['jaeger_told']); assert.deepEqual(snowHouseResidents(), ['CODEY_NPC_WOUNDED']); assert.equal(mentorasTaken(), true);
    story(['jaeger_told', 'jaeger_met'], { active: { the_pursuer: { progress: {} } } });
    assert.deepEqual(catacombResidents(), ['JAEGER_CAPTOR', 'MENTORAS_CHAINED'], 'Jaeger holds him in the catacombs');
    story(['jaeger_told', 'jaeger_met', 'pursuer_done'], { completed: [...DESERT_DONE, 'the_pursuer'] });
    assert.deepEqual(snowHouseResidents(), ['HOODED_STRANGER_NPC', 'CODEY_NPC'], 'freed, he is back');
    assert.deepEqual(catacombResidents(), []);
});

test('the workshops: the snowy house takes them in, the desert workshop keeps only the mark on the anvil, the old one empties', () => {
    resetWorldForNewGame();
    const w = gameState.world;
    w.strangerHome = '1_1'; w.strangerDesertHome = '2_2';
    story(['nikoli_told']);
    assert.equal(InteriorFactory.workshopResident('1_1', 'PLAINS'), null, 'Nikoli has gone north from the old workshop');
    assert.equal(InteriorFactory.workshopResident('2_2', 'DESERT'), 'STRANGER_MARK');
    assert.deepEqual(InteriorFactory.workshopResident('3_3', 'SNOWY_MOUNTAINS'), ['NIKOLI_NPC_REUNION', 'HOODED_STRANGER_NPC', 'CODEY_NPC']);
    assert.equal(w.strangerSnowHome, '3_3');
    assert.equal(InteriorFactory.workshopResident('4_4', 'SNOWY_MOUNTAINS'), null, 'only the first');
    // all three really stand in the house
    const house = InteriorFactory.create(9, 'ABANDONED_WORKSHOP', '3_3');
    const found = [];
    for (let r = house.bounds.minR; r <= house.bounds.maxR; r++) for (let c = house.bounds.minC; c <= house.bounds.maxC; c++) {
        const id = house.getObjectIdAt(c, r); if (['NIKOLI_NPC_REUNION', 'HOODED_STRANGER_NPC', 'CODEY_NPC'].includes(id)) found.push(id);
    }
    assert.deepEqual(found.sort(), ['CODEY_NPC', 'HOODED_STRANGER_NPC', 'NIKOLI_NPC_REUNION']);
    // before Codey is back, the desert still has Mentoras
    story(['nikoli_told'], { completed: DESERT_DONE.slice(0, -1) });
    assert.equal(InteriorFactory.workshopResident('2_2', 'DESERT'), 'HOODED_STRANGER_NPC');
    resetWorldForNewGame();
});

test('ashes: Nikoli\'s campfire goes cold and his greatsword stands in the snow, until taken; never in another outcome', () => {
    gameState.world.nikoliCampfire = '40,60'; gameState.world.isInterior = false;
    const at = () => WorldManager.prototype._storyObjects.call({}).get('40,59');
    story(['nikoli_met']); assert.equal(at(), 'BROTHERS_SWORD');
    story(['nikoli_met', 'brothers_sword_taken']); assert.equal(at(), undefined);
    story(['nikoli_met', 'jaeger_told']); assert.equal(at(), 'NIKOLI_NPC', 'pursuer: Nikoli, never told, still waits by his fire');
    gameState.world.nikoliCampfire = null; gameState.milestones = [];
});

test('the Brother\'s Sword: a special greatsword with its own move, Last Watch; taken by the player, handed back by Mentoras', () => {
    const s = I.brothers_sword;
    assert.equal(s.name, "Brother's Sword");
    assert.ok(s.attack.slash > I.panzerian_greatsword.attack.slash && s.attack.ice > I.panzerian_greatsword.attack.ice, 'better than the Panzerian greatsword');
    assert.ok(s.grantedAbilities.includes('last_watch'));
    assert.ok(A.last_watch.selfStatusEffects.some(e => e.id === 'fortified'));
    assert.ok(results('brothers_sword', 'sword').some(r => r.type === 'GIVE_ITEM' && r.payload.itemId === 'brothers_sword'));
    const show = E.hooded_stranger.stages.after_codey.decisions.find(d => /Brother's Sword/.test(d.text));
    assert.ok(show.conditions.some(c => c.type === 'has_item' && c.itemId === 'brothers_sword'));
    assert.match(E.hooded_stranger.stages.sword_3.text, /Keep it\. He would want it used\./);
    assert.ok(!results('hooded_stranger', 'sword_3').some(r => r.type === 'REMOVE_ITEM'), 'he hands it back');
});

test('pursuer: Codey, wounded, starts the quest; Jaeger, beaten in the catacombs, flees as the scene tells it; Mentoras thanks you and never blames you', () => {
    assert.ok(results('codey', 'taken_3').some(r => r.type === 'START_QUEST' && r.payload.questId === 'the_pursuer'));
    assert.equal(Q.the_pursuer.objectives[0].targetId, 'JAEGER_BOSS');
    const fight = results('pursuer', 'captive_4').find(r => r.type === 'START_BATTLE');
    assert.deepEqual(fight.payload.enemies, ['JAEGER_BOSS']);
    assert.equal(fight.payload.afterVictory.encounterId, 'pursuer_won');
    assert.ok(results('pursuer_won', 'fled').some(r => r.type === 'REMOVE_STORY_NPC' && r.payload.objectId === 'JAEGER_CAPTOR'), 'he leaves as the scene says he does');
    const thanks = Object.values(E.pursuer_won.stages).map(s => s.text).join(' ');
    assert.match(thanks, /Thank you/);
    assert.doesNotMatch(thanks + JSON.stringify(E.hooded_stranger.stages.rescued_m), /told him|your fault|blame/i, 'he never blames the player');
    assert.ok(ENT.JAEGER_BOSS.tags.includes('BOSS'));
});

test('brothers: Jaeger walks in, the player and Nikoli fight him, he flees; then the old friends travel together', () => {
    const fight = results('nikoli', 'brothers_j2').find(r => r.type === 'START_BATTLE');
    assert.deepEqual(fight.payload.allies, [{ id: 'NIKOLI' }], 'Nikoli fights beside the player');
    assert.equal(fight.payload.afterVictory.encounterId, 'brothers_won');
    assert.ok(results('brothers_won', 'won_6').some(r => r.type === 'GRANT_MILESTONE' && r.payload.id === 'brothers_done'));
    assert.match(E.brothers_won.stages.won_m1.text, /We leave at first light\. Both of us\./);
    // friends: the reunion, no fight
    const reunion = []; let id = 'reunion';
    while (id) { reunion.push(id); id = nexts('nikoli', id)[0]; }
    assert.ok(!reunion.some(s => results('nikoli', s).some(r => r.type === 'START_BATTLE')), 'Old Friends has no fight');
    assert.ok(results('nikoli', 'reunion_7').some(r => r.type === 'GRANT_MILESTONE' && r.payload.id === 'friends_met'));
});

test('nobody vanishes: no scene takes a character off the map without the scene saying they leave', () => {
    for (const id of ['codey', 'stranger_mark', 'brothers_sword', 'pursuer', 'pursuer_won', 'brothers_won', 'nikoli', 'hooded_stranger', 'jaeger']) {
        for (const [sid, s] of Object.entries(E[id].stages)) for (const r of results(id, sid)) {
            assert.ok(!['DESTROY_OBJECT', 'UNPLACE_OBJECT'].includes(r.type) || id === 'nikoli', `${id}.${sid}: ${r.type}`);
            if (r.type === 'REMOVE_STORY_NPC') assert.match(s.text, /gone|Take|sword/i, `${id}.${sid}: the scene tells it`);
        }
    }
});

test('the assets: Codey on the male nightblade\'s sheets, the sword\'s icon and its sprite in the snow; every voiced line has a voice', () => {
    assert.equal(ENT.CODEY.spriteOverworld, 'nightbladeHeroSprite');
    assert.equal(ENT.CODEY.spritePortrait, 'nightbladeHeroPortrait');
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    assert.match(main, /objBrothersSword: '\.\/assets\/mapObjects\/objBrothersSword\.png'/);
    assert.ok(fs.existsSync(new URL('../../frontend/src/assets/mapObjects/objBrothersSword.png', import.meta.url)));
    for (const id of ['CODEY_NPC', 'CODEY_NPC_WOUNDED', 'NIKOLI_NPC_REUNION', 'JAEGER_CAPTOR', 'MENTORAS_CHAINED', 'STRANGER_MARK', 'BROTHERS_SWORD']) {
        assert.ok(M[id], id);
        assert.ok(E[M[id].interaction.id], `${id}: its scene exists`);
    }
    const voices = JSON.parse(fs.readFileSync(new URL('../../tools/voice/voices.json', import.meta.url), 'utf8')).voices;
    for (const id of Object.keys(VOICED)) for (const l of linesOf(id, E[id])) assert.ok(voices[l.speaker], `${id}.${l.stageId}: ${l.speaker}`);
});
