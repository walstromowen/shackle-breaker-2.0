// backend/test/nikoli.test.js: `npm test`. Nikoli, the Panzerian general hunting for Commander Mentoras: where he stands (the first snowy
// campfire; in act 2 the Hooded Stranger's old workshop, while the Stranger moves to the desert), the fight beside him (an ally the party does not
// control), what he says from visit to visit, the Insight of Ice for telling him, and the Panzerian War Beast quest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { events } from '../../shared/core/eventBus.js';
import { gameState } from '../../shared/core/gameState.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { ENTITY_DEFINITIONS } from '../../shared/characters/entityDefinitions.js';
import { createBattleState, commitBattleResults, ownParty } from '../../shared/battle/battleState.js';
import { queueEnemyActions } from '../../shared/battle/enemyAI.js';
import { PHASE } from '../../shared/battle/battleConstants.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { QuestDefinitions as Q } from '../../shared/story/questDefinitions.js';
import { InteriorFactory } from '../../shared/world/interiorFactory.js';
import { WorldManager } from '../../shared/world/worldManager.js';
import { MAP_OBJECTS_DEFINITIONS as M } from '../../shared/world/mapObjectDefinitions.js';
import { EncounterLogic } from '../../frontend/src/screens/encounter/encounterLogic.js';
import { BattleController } from '../../frontend/src/screens/battle/battleController.js';

const N = encounterDefinitions.nikoli;
const AFTER = encounterDefinitions.nikoli_after_battle;
const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const withSeed = (seed, fn) => { const real = Math.random; Math.random = mulberry(seed); try { return quiet(fn); } finally { Math.random = real; } };
const story = ({ milestones = [], completed = [], active = {} } = {}) => {
    gameState.milestones = milestones.slice();
    gameState.quests = { active: { ...active }, completed: completed.slice(), trackedIds: [] };
};
const results = (decision) => decision.outcomes[0].results;
const offered = (stage) => stage.decisions.filter(d => EncounterLogic.checkConditions(d, {})).map(d => d.text);

test('Nikoli is a character with the Panzerian warlord\'s art for now, a map object, and two personal encounters', async () => {
    const def = ENTITY_DEFINITIONS.NIKOLI;
    assert.equal(def.spriteOverworld, 'warlordHeroSprite');
    assert.equal(def.spritePortrait, 'warlordHeroPortrait');
    assert.ok(def.tags.includes('PANZERIAN') && def.tags.includes('HUMANOID'));
    // a strength and ice build with a greatsword
    assert.equal(def.equipment.mainHand, 'panzerian_greatsword');
    const { ItemDefinitions } = await import('../../shared/items/itemDefinitions.js');
    const sword = ItemDefinitions.panzerian_greatsword;
    assert.equal(sword.slot, 'twoHand');
    assert.ok(sword.attack.slash > 0 && sword.attack.ice > 0, 'edge and frost');
    assert.ok(def.attributes.strength === Math.max(...Object.values(def.attributes)), 'strength is his best attribute');
    assert.ok(def.baseStats.baseAttack.ice > 0 && def.baseStats.baseResistance.ice > 0 && def.abilities.includes('frigid_gale'));
    assert.equal(M.NIKOLI_NPC.interaction.id, 'nikoli');
    assert.equal(M.NIKOLI_NPC.character.entity, 'NIKOLI');
    assert.equal(N.personal, true, 'each player\'s own story, never shared or voted on');
    assert.equal(AFTER.initialStage, 'after');
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    for (const key of ['warlordHeroSprite', 'warlordHeroPortrait', 'snowLeopardPortrait']) assert.match(main, new RegExp(`${key}: '`), `${key} is loaded`);
});

test('the first meeting: snow leopards at his fire, and the fight is fought beside him, with his thanks and his question after it', () => {
    story();
    assert.equal(N.initialStage(), 'meet');
    const draw = N.stages.meet_2.decisions[0];
    const r = results(draw);
    assert.deepEqual(r[0], { type: 'GRANT_MILESTONE', payload: { id: 'nikoli_met' } });
    const battle = r.find(x => x.type === 'START_BATTLE').payload;
    assert.ok(battle.enemies.length >= 2 && battle.enemies.every(e => e === 'SNOW_LEOPARD'), 'snow leopards');
    assert.deepEqual(battle.allies, [{ id: 'NIKOLI' }], 'Nikoli fights on the party\'s side');
    assert.deepEqual(battle.afterVictory, { encounterId: 'nikoli_after_battle' });
    const walk = N.stages.meet_2.decisions.find(d => /Walk away/.test(d.text));
    assert.ok(walk, 'the player may walk away');
    assert.equal(results(walk)[0].payload.stageId, 'walk_away');
    assert.ok(!JSON.stringify(N.stages.walk_away).includes('nikoli_met'), 'and meets him properly another night');
    assert.ok(battle.bgm && battle.noEscape);
    assert.match(AFTER.stages.after.text, /Thank you/, 'he thanks you');
    assert.match(AFTER.stages.after_2.text, /Nikoli was general/, 'and speaks of himself as Nikoli, as he does in the story');
    assert.match(AFTER.stages.after_2.text, /Commander Mentoras/);
});

test('telling him about the hooded man needs the Stranger met; it pays an Insight of Ice, and either answer leads to the war beast', () => {
    story({ milestones: ['nikoli_met'] });
    assert.deepEqual(offered(N.stages.ask), ["\"I don't know anyone by that name.\""], 'never met the Stranger: only "I don\'t know"');
    story({ milestones: ['nikoli_met'], completed: ['shackled_stranger'] });
    assert.equal(offered(N.stages.ask).length, 2, 'met him: the option to tell appears');
    assert.match(offered(N.stages.ask)[0], /hooded man in a village workshop/);
    const take = results(N.stages.told_2.decisions[0]);
    assert.ok(take.some(x => x.type === 'GIVE_ITEM' && x.payload.itemId === 'insight_of_ice'));
    assert.ok(take.some(x => x.type === 'GRANT_MILESTONE' && x.payload.id === 'nikoli_told'));
    assert.ok(take.some(x => x.type === 'ADVANCE_STAGE' && x.payload.stageId === 'beast'), 'then the beast');
    assert.equal(results(N.stages.dunno.decisions[0])[0].payload.stageId, 'beast', '"I don\'t know" leads there too');
    assert.match(N.stages.beast.text, /Panzerkamfer/);
    story({ milestones: ['nikoli_met', 'nikoli_told'], completed: ['shackled_stranger'] });
    assert.ok(!offered(N.stages.again).some(t => /hooded man/.test(t)), 'told once: never asked to tell again');
});

test('the Panzerian War Beast: asking starts it, killing a Panzerkamfer completes it, and Nikoli hands over another Insight of Ice', () => {
    const quest = Q.panzerian_war_beast;
    assert.equal(quest.name, 'Panzerian War Beast');
    assert.equal(quest.turnIn, 'NIKOLI');
    assert.deepEqual(quest.objectives.map(o => [o.type, o.targetId, o.amount]), [['kill_enemy', 'PANZERKAMFER', 1]]);
    assert.ok(quest.rewards.items.some(i => i.id === 'insight_of_ice'), 'the second Insight of Ice');
    assert.ok(N.stages.beast.decisions.some(d => /Panzerkamfer\?/.test(d.text)), 'the option to inquire');
    const hunt = N.stages.beast_3.decisions.find(d => /hunt it/.test(d.text));
    assert.ok(results(hunt).some(x => x.type === 'START_QUEST' && x.payload.questId === 'panzerian_war_beast'));
    story({ milestones: ['nikoli_met'] });
    assert.ok(offered(N.stages.again).some(t => /war beast/.test(t)), 'a later visit can still ask about it');
    story({ milestones: ['nikoli_met'], active: { panzerian_war_beast: { progress: { obj_kill_panzerkamfer: 0 } } } });
    assert.equal(N.initialStage(), 'beast_waiting');
    assert.ok(!offered(N.stages.again).some(t => /war beast/.test(t)), 'not offered again once taken');
    story({ milestones: ['nikoli_met', 'nikoli_told', 'act2'], active: { panzerian_war_beast: { progress: { obj_kill_panzerkamfer: 1 } } } });
    assert.equal(N.initialStage(), 'beast_done', 'the beast dead: handed in wherever he is');
    assert.ok(results(N.stages.beast_done.decisions[0]).some(x => x.type === 'COMPLETE_QUEST' && x.payload.questId === 'panzerian_war_beast'));
    assert.equal(ENTITY_DEFINITIONS.NIKOLI.properName, true, '"Return to Nikoli"');
});

test('in a party of players: everyone who fought beside him has met him, and nobody is offered a quest they already have', () => {
    const go = results(AFTER.stages.after.decisions[0]);
    assert.ok(go.some(x => x.type === 'GRANT_MILESTONE' && x.payload.id === 'nikoli_met'), 'the after-fight talk marks him met on every screen');
    story({ milestones: ['nikoli_met'], active: { panzerian_war_beast: { progress: {} } } });
    assert.ok(!offered(N.stages.beast).some(t => /Panzerkamfer\?/.test(t)), 'already hunting it: not asked again');
    assert.ok(!offered(N.stages.beast_3).some(t => /hunt it/.test(t)));
    story({ milestones: ['nikoli_met'], completed: ['panzerian_war_beast'] });
    assert.ok(!offered(N.stages.beast).some(t => /Panzerkamfer\?/.test(t)), 'nor once it is done');
    assert.deepEqual(offered(N.stages.beast), ['Leave him to the fire.'], 'there is always a way out');
});

test('from visit to visit: by the fire until told; in act 2, told, he is in the Stranger\'s old workshop', () => {
    story({ milestones: ['nikoli_met'] });
    assert.equal(N.initialStage(), 'again');
    story({ milestones: ['nikoli_met', 'nikoli_told'] });
    assert.equal(N.initialStage(), 'told_again');
    story({ milestones: ['nikoli_met', 'nikoli_told', 'act2'] });
    assert.equal(N.initialStage(), 'workshop');
    assert.match(N.stages.workshop_2.text, /sand/, 'one step behind: the trail points to the desert');
    // the biomes can lie in any direction, so nobody gives one
    assert.ok(!/\b(north|south|east|west)\b/i.test(Object.values(N.stages).map(st => st.text).join(' ')), 'no compass directions');
});

test('the workshops: act 1 the Stranger; act 2 he moves to the first desert workshop entered, and Nikoli (if told) takes his old one', () => {
    const w = gameState.world;
    w.strangerHome = null; w.strangerDesertHome = null;
    story();
    assert.equal(InteriorFactory.workshopResident('10_10', 'PLAINS'), 'HOODED_STRANGER_NPC', 'the first workshop is his');
    assert.equal(InteriorFactory.workshopResident('20_20', 'DESERT'), null, 'only one of him');
    story({ milestones: ['act2'] });
    assert.equal(InteriorFactory.workshopResident('10_10', 'PLAINS'), null, 'act 2, Nikoli never told: the old workshop stands empty');
    assert.equal(InteriorFactory.workshopResident('30_30', 'PLAINS'), null, 'not a desert village: nobody');
    assert.equal(InteriorFactory.workshopResident('20_20', 'DESERT'), 'HOODED_STRANGER_NPC', 'the first desert workshop entered in act 2');
    assert.equal(w.strangerDesertHome, '20_20');
    assert.equal(InteriorFactory.workshopResident('40_40', 'DESERT'), null, 'and only that one');
    story({ milestones: ['act2', 'nikoli_told'] });
    assert.equal(InteriorFactory.workshopResident('10_10', 'PLAINS'), 'NIKOLI_NPC', 'Nikoli, a step behind');
    assert.equal(InteriorFactory.workshopResident('20_20', 'DESERT'), 'HOODED_STRANGER_NPC', 'never in the same place');
    w.strangerHome = null; w.strangerDesertHome = null;
});

test('the Stranger and Nikoli have not met: the Stranger never speaks of him, however far the player has taken Nikoli\'s story', () => {
    const S = encounterDefinitions.hooded_stranger;
    story({ milestones: ['act2', 'nikoli_met', 'nikoli_told'], completed: ['shackled_stranger', 'shackled1', 'shackled2', 'shackled3', 'shackled7', 'shackled8'] });
    assert.equal(S.initialStage(), 'desert_meet', 'in act 2 he is in the desert, after someone else');
    assert.ok(!/Nikoli/.test(JSON.stringify(S.stages)), 'not a word about him');
    // the one exception is act 3's cold campfire (story/heroes.js "ashes"): shown the sword, he knows the steel, and still does not say the name
    const panz = Object.entries(S.stages).filter(([, s]) => /Panzerian/.test(s.text)).map(([id]) => id);
    assert.deepEqual(panz, ['sword'], 'only the sword is Panzerian to him');
});

test('the Panzerkamfer is one of many war beasts from the war, and Mentoras an old friend he did not always agree with', () => {
    assert.match(N.stages.beast_2.text, /many/);
    assert.match(N.stages.beast_2.text, /one of them/);
    assert.match(Q.panzerian_war_beast.description, /many Panzerkamfers/);
    assert.match(N.stages.ask.text, /Old friend/);
    assert.match(N.stages.ask.text, /not always agreeing/);
});

test('his camp: the first snowy campfire is claimed; before the meeting he stands north of it facing the cats, and the scene follows the story', () => {
    const w = gameState.world;
    w.nikoliCampfire = null; w.isInterior = false;
    story();
    const placed = [];
    const fake = (biomeId) => ({ getBiomeAt: () => ({ id: biomeId }), _placeStory: (c, r, id) => placed.push([c, r, id]), _storyObjects: WorldManager.prototype._storyObjects });
    WorldManager.prototype._campfirePlaced.call(fake('PLAINS'), 5, 5);
    assert.equal(w.nikoliCampfire, null, 'a plains campfire is not his');
    WorldManager.prototype._campfirePlaced.call(fake('SNOWY_MOUNTAINS'), 40, 60);
    assert.equal(w.nikoliCampfire, '40,60');
    assert.deepEqual(placed.sort(), [[39, 56, 'SNOW_LEOPARD_STALKING'], [40, 55, 'SNOW_LEOPARD_STALKING'], [40, 59, 'NIKOLI_NPC_WATCHING'], [41, 56, 'SNOW_LEOPARD_STALKING']],
        'Nikoli just north of the fire, three cats further north');
    assert.equal(M.NIKOLI_NPC_WATCHING.character.facing, 'UP', 'he faces up, at the cats');
    assert.equal(M.SNOW_LEOPARD_STALKING.character.facing, 'DOWN', 'they face down, at him');
    for (const id of ['NIKOLI_NPC_WATCHING', 'SNOW_LEOPARD_STALKING']) assert.deepEqual(M[id].interaction, { type: 'ENCOUNTER', id: 'nikoli', triggerRadius: 3 }, `${id}: coming near starts it`);
    WorldManager.prototype._campfirePlaced.call(fake('SNOWY_MOUNTAINS'), 90, 90);
    assert.equal(w.nikoliCampfire, '40,60', 'only the first one');
    const at = (c, r) => WorldManager.prototype._storyObjectAt.call({ _storyObjects: WorldManager.prototype._storyObjects }, c, r);
    story({ milestones: ['nikoli_met'] });
    assert.equal(at(40, 59), 'NIKOLI_NPC', 'met: he faces you, nothing starts by itself');
    assert.equal(at(40, 55), null, 'and the cats are gone');
    story({ milestones: ['nikoli_met', 'act2'] });
    assert.equal(at(40, 59), 'NIKOLI_NPC', 'act 2 but never told: he stays');
    story({ milestones: ['nikoli_met', 'act2', 'nikoli_told'] });
    assert.equal(at(40, 59), null, 'told, act 2: gone to the workshop');
    w.nikoliCampfire = null;
});

test('the loaded world swaps the scene when the story moves on: the cats leave and Nikoli turns once he has been met', () => {
    const w = gameState.world;
    w.nikoliCampfire = '10,20'; w.isInterior = false;
    story();
    const objects = new Map(), collision = new Map();
    const host = {
        objects, _collisionMap: collision, _s: (c, r) => `${c},${r}`,
        _placeObject(c, r, id) { const o = { id, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 } }; objects.set(`${c},${r}`, o); collision.set(`${c},${r}`, o); },
        _storyObjects: WorldManager.prototype._storyObjects, _placeStory: WorldManager.prototype._placeStory,
        _unplaceObject: WorldManager.prototype._unplaceObject, refreshStoryObjects: WorldManager.prototype.refreshStoryObjects
    };
    host.refreshStoryObjects();
    assert.equal(objects.get('10,19').id, 'NIKOLI_NPC_WATCHING');
    assert.equal(objects.get('10,15').id, 'SNOW_LEOPARD_STALKING');
    story({ milestones: ['nikoli_met'] });
    host.refreshStoryObjects();
    assert.equal(objects.get('10,19').id, 'NIKOLI_NPC');
    assert.ok(!objects.has('10,15') && !objects.has('9,16') && !objects.has('11,16') && !collision.has('10,15'), 'the cats and their footprint are gone');
    w.nikoliCampfire = null;
});

test('the snowy mountains\' battle music plays from the moment the scene opens, on into the fight', () => {
    assert.equal(N.stages.meet.bgm, 'snowyMountainsBattleBgm');
    assert.equal(N.stages.meet_2.bgm, 'snowyMountainsBattleBgm');
    assert.equal(results(N.stages.meet_2.decisions[0]).find(x => x.type === 'START_BATTLE').payload.bgm, 'snowyMountainsBattleBgm');
});

test('an ally fights on the party\'s side, picked for by the dice, earns nothing, and cannot win the fight alone', () => {
    withSeed(3, () => {
        gameState.party.members = [EntityFactory.create('MAD_MAN', 10), EntityFactory.create('DOG', 10), EntityFactory.create('MAD_MAN', 10)];
        const nikoli = EntityFactory.create('NIKOLI', 10);
        const s = createBattleState([EntityFactory.create('SNOW_LEOPARD', 10), EntityFactory.create('SNOW_LEOPARD', 10)], { maxActive: 3, allies: [nikoli] });
        assert.equal(s.activeParty.length, 3);
        const ally = s.activeParty[2];
        assert.equal(ally.isAlly, true);
        assert.ok(!ally.abilities.some(a => a.isFlee && a.isFlee()), 'an ally has no Retreat: he stands and fights');
        for (let i = 0; i < 40; i++) { s.turnQueue = []; queueEnemyActions(s); assert.ok(!s.turnQueue.some(t => t.actor === ally && t.action.isFlee && t.action.isFlee())); }
        assert.equal(ally.originalEntity, nikoli);
        assert.equal(s.partyRoster.filter(c => !c.isAlly).length, 3, 'the third party member waits in reserve');
        assert.ok(!s.activeParty.includes(s.partyRoster[2]));
        assert.deepEqual(ownParty(s).map(c => c.originalEntity), gameState.party.members);
        queueEnemyActions(s);
        const mine = s.turnQueue.find(t => t.actor === ally);
        assert.ok(mine, 'the dice pick for him with the enemies');
        const targets = [].concat(mine.target);
        if (mine.action.targeting?.scope === 'enemy') assert.ok(targets.every(t => t.team === 'enemy'), 'and he aims at the enemies');
        // only the ally left standing: the fight is lost, and nothing is written back to him
        for (const c of ownParty(s)) c.modifyResource('hp', -100000);
        assert.ok(ownParty(s).every(c => c.isDead()) && !ally.isDead());
        assert.equal(commitBattleResults(s), false);
    });
});

test('in the controller nobody picks for the ally: the party picks, then the round resolves with his move queued', () => {
    withSeed(4, () => {
        gameState.party.members = [EntityFactory.create('MAD_MAN', 10)];
        const bc = new BattleController({}, { TILE_SIZE: 64 }, {});
        bc.start([EntityFactory.create('SNOW_LEOPARD', 10)], { maxActive: 3, allies: [EntityFactory.create('NIKOLI', 10)] });
        let guard = 0;
        while (bc.state.phase !== PHASE.SELECT_ACTION && guard++ < 200) bc.update(0.4);
        assert.equal(bc.state.activeParty[bc.state.activePartyIndex].isAlly, undefined, 'the menu is for the player\'s own fighter');
        assert.equal(bc._isMine(bc.state.activeParty[1]), false, 'never the ally\'s');
        const ended = [];
        const off = (e) => ended.push(e);
        events.on('BATTLE_ENDED', off);
        guard = 0;
        while (bc.state.active && guard++ < 3000) {
            if (bc.state.phase === PHASE.SELECT_ACTION) { bc.handleKeyDown('KeyD', { code: 'KeyD' }); bc.handleKeyDown('Enter', { code: 'Enter' }); }
            else if (bc.state.phase === PHASE.SELECT_TARGET) bc.handleKeyDown('Enter', { code: 'Enter' });
            else bc.update(0.4);
        }
        events.off('BATTLE_ENDED', off);
        assert.equal(ended.length, 1, 'the fight ends');
        assert.ok(bc.state.battleLedger.some(e => e.type === 'ABILITY_USED' && e.actor && e.actor.isAlly), 'and Nikoli fought in it');
    });
});
