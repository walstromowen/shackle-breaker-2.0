// backend/test/amputators.test.js: `npm test`. The Amputators, the game's first covenant: Senior Surgeon Osric sits among the stones of the first small graveyard
// the player comes upon in act 1; his errand (put Surgeon Garrick, an Amputator going mad, to rest: Garrick stands somewhere the party can walk to, marked on
// the map); his oath, which gives the Amputator's Saw and is the player's own (one covenant at a time).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { QuestDefinitions as Q, STORY_QUESTS } from '../../shared/story/questDefinitions.js';
import { WorldManager, GARRICK_GRAVEYARD } from '../../shared/world/worldManager.js';
import { MAP_OBJECTS_DEFINITIONS as M } from '../../shared/world/mapObjectDefinitions.js';
import { ENTITY_DEFINITIONS as E } from '../../shared/characters/entityDefinitions.js';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';
import { LootTableDefinitions } from '../../shared/items/lootTableDefinitions.js';
import { COVENANTS, Covenants } from '../../shared/story/covenants.js';
import { STORY_HOMES } from '../../shared/world/interiorFactory.js';
import { isWorldFlag } from '../../shared/story/worldStory.js';
import { VOICED } from '../../shared/story/voiceLines.js';
import { ActSystem } from '../../shared/story/actSystem.js';
import fs from 'node:fs';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const OSRIC = encounterDefinitions.amputator_osric, GARRICK = encounterDefinitions.amputator_garrick;
const story = ({ milestones = [], completed = [], active = {} } = {}) => {
    gameState.milestones = milestones.slice();
    gameState.quests = { active: { ...active }, completed: completed.slice(), trackedIds: [] };
    gameState.world.changes = {};
};
const results = (decision) => decision.outcomes[0].results;

test('the Amputators: a covenant, its two characters, their map objects, encounters, quest and weapon', () => {
    const cv = COVENANTS.amputators;
    assert.equal(cv.leader, 'AMPUTATOR_OSRIC');
    assert.ok(ItemDefinitions[cv.gift], 'the oath\'s gift is a real item');
    assert.ok(M.OSRIC_NPC && M.OSRIC_NPC.interaction.id === 'amputator_osric');
    assert.ok(M.GARRICK_NPC && M.GARRICK_NPC.interaction.id === 'amputator_garrick' && M.GARRICK_NPC.interaction.triggerRadius > 0, 'coming near Garrick starts his scene');
    for (const id of ['amputator_osric', 'amputator_garrick', 'amputator_garrick_fallen']) {
        assert.ok(encounterDefinitions[id], id);
        assert.ok(VOICED[id], `${id} is voiced`);
    }
    assert.ok(E.AMPUTATOR_GARRICK.tags.includes('AMPUTATOR') && E.AMPUTATOR_GARRICK.equipment.mainHand === 'amputators_saw');
    for (const it of LootTableDefinitions[E.AMPUTATOR_GARRICK.lootTableId].items) assert.ok(ItemDefinitions[it.id], it.id);
    const q = Q.amputators_trial;
    assert.equal(q.turnIn, 'AMPUTATOR_OSRIC');
    assert.deepEqual(q.objectives.map(o => [o.type, o.targetId]), [['kill_enemy', 'AMPUTATOR_GARRICK']]);
    assert.ok(STORY_QUESTS.has('amputators_trial'), 'a party goes through it together');
    assert.ok(isWorldFlag('osric_met') && isWorldFlag('garrick_slain'), 'his story is the world\'s');
    assert.ok(!isWorldFlag(cv.legacyMilestone), 'the oath is never the world\'s');
    assert.ok(STORY_HOMES.includes('amputatorGraveyard') && STORY_HOMES.includes('amputatorQuarry'));
});

test('Osric and Garrick have their own sheets, registered and on disk at the sizes the game draws (battle 2048x1024, overworld 512x768)', () => {
    const main = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    const asset = (key) => { const m = new RegExp(`\\b${key}:\\s*'\\./(assets/[^']+)'`).exec(main); return m && new URL('../../frontend/src/' + m[1], import.meta.url); };
    const size = (u) => { const b = fs.readFileSync(u); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };   // a PNG's IHDR width, height
    for (const [d, enc] of [[E.AMPUTATOR_OSRIC, OSRIC], [E.AMPUTATOR_GARRICK, GARRICK]]) {
        assert.equal(enc.imageSheet, d.spritePortrait, `${d.name}: the encounter shows his own portrait sheet`);
        for (const [key, want] of [[d.spritePortrait, [2048, 1024]], [d.spriteOverworld, [512, 768]]]) {
            const u = asset(key);
            assert.ok(u && fs.existsSync(u), `${d.name}: ${key} registered and on disk`);
            assert.deepEqual(size(u), want, `${d.name}: ${key} is ${want.join('x')}`);
        }
    }
    assert.ok(Object.values(GARRICK.stages).every(st => !st.image || st.image.sheet === E.AMPUTATOR_GARRICK.spritePortrait), 'Garrick\'s stages show his sheet');
});

test('Osric opens with what this player\'s story has: the meeting, the errand, the oath, the surgeon', () => {
    const at = (opts) => { story(opts); return OSRIC.initialStage(); };
    assert.equal(at({}), 'meet');
    assert.equal(at({ milestones: ['osric_met'] }), 'again', 'met, the errand turned down');
    assert.equal(at({ milestones: ['osric_met'], active: { amputators_trial: { progress: {} } } }), 'waiting');
    assert.equal(at({ milestones: ['osric_met'], completed: ['amputators_trial'] }), 'offer_again');
    gameState.party.members = [{ state: { name: 'Lead', covenant: { id: 'amputators', rank: 0 } } }];
    assert.equal(at({ milestones: ['osric_met'], completed: ['amputators_trial'] }), 'member', 'the lead is sworn');
    gameState.party.members = [{ state: { name: 'Lead' } }];
    assert.equal(at({ milestones: ['osric_met'], completed: ['amputators_trial'] }), 'offer_again');
    // taking the errand: the quest, Garrick's spot (and the pin), Osric met
    const take = OSRIC.stages.task_3.decisions.find(d => /find him/.test(d.text));
    const types = results(take).map(r => r.type);
    assert.ok(['GRANT_MILESTONE', 'START_QUEST', 'AMPUTATOR_QUARRY'].every(t => types.includes(t)));
    // the oath: joins, and gives the saw
    const oath = OSRIC.stages.offer.decisions[0];
    assert.ok(results(oath).some(r => r.type === 'JOIN_COVENANT' && r.payload.covenantId === 'amputators'));
    assert.ok(results(oath).some(r => r.type === 'GIVE_ITEM' && r.payload.itemId === 'amputators_saw'));
    // Garrick: a fight, then his last words put him to rest and take him off the map
    const fight = results(GARRICK.stages.g_3.decisions[0]).find(r => r.type === 'START_BATTLE');
    assert.equal(fight.payload.enemies[0].id, 'AMPUTATOR_GARRICK');
    assert.equal(fight.payload.afterVictory.encounterId, 'amputator_garrick_fallen');
    const rest = results(GARRICK.stages.fallen.decisions[0]);
    assert.ok(rest.some(r => r.type === 'GRANT_MILESTONE' && r.payload.id === 'garrick_slain'));
    assert.ok(rest.some(r => r.type === 'REMOVE_STORY_NPC' && r.payload.objectId === 'GARRICK_NPC'));
});

test('each character swears for themselves, to one covenant at a time; the oath can be renounced; an older save\'s oath goes to the lead', () => {
    const a = { state: { name: 'A' } }, b = { state: { name: 'B' } };
    assert.equal(Covenants.of(a), null);
    assert.equal(Covenants.join('amputators', a), true);
    assert.equal(Covenants.join('amputators', a), false, 'not twice');
    assert.equal(Covenants.of(a), 'amputators');
    assert.equal(Covenants.of(b), null, 'a party member swears for themselves');
    assert.equal(Covenants.label(a), 'The Amputators (Orderly)', 'shown on the character summary with the rank');
    assert.equal(Covenants.renounce(a), true);
    assert.equal(Covenants.of(a), null);
    assert.equal(Covenants.renounce(a), false, 'nothing left to renounce');
    // the oath is offered to whoever is not sworn, and given back by whoever is
    const take = OSRIC.stages.member.decisions.find(d => /Take the oath/.test(d.text));
    const give = OSRIC.stages.member.decisions.find(d => /Renounce/.test(d.text));
    assert.deepEqual(take.conditions, [{ type: 'not_in_covenant', covenant: 'amputators' }, { type: 'covenant_never_sworn', covenant: 'amputators' }]);
    // swearing again after renouncing: offered to whoever swore once, without the gift (the saw is given once), back to the first rank
    const again = OSRIC.stages.offer_again.decisions.find(d => /Swear again/.test(d.text));
    assert.deepEqual(again.conditions, [{ type: 'not_in_covenant', covenant: 'amputators' }, { type: 'covenant_sworn_before', covenant: 'amputators' }]);
    assert.ok(results(again).some(r => r.type === 'JOIN_COVENANT') && !results(again).some(r => r.type === 'GIVE_ITEM'), 'no second saw');
    const c = { state: { name: 'C' } };
    Covenants.join('amputators', c); Covenants.renounce(c);
    assert.ok(Covenants.swornBefore('amputators', c) && !Covenants.of(c), 'remembered after renouncing');
    assert.equal(Covenants.join('amputators', c), true, 'and can swear again');
    assert.equal(Covenants.rankOf(c), 'Orderly');
    assert.deepEqual(give.conditions, [{ type: 'in_covenant', covenant: 'amputators' }]);
    assert.ok(OSRIC.stages.member.decisions.some(d => d.type === 'switch_character'), 'choose who swears');
    assert.ok(results(OSRIC.stages.renounce_ask.decisions[0]).some(r => r.type === 'RENOUNCE_COVENANT'));
    // an older save: the oath was the player's milestone
    const lead = { state: { name: 'Lead' } };
    const old = { milestones: ['osric_met', 'covenant_amputators'], party: { members: [lead] } };
    Covenants.migrate(old);
    assert.equal(Covenants.of(lead), 'amputators');
    assert.ok(!old.milestones.includes('covenant_amputators'));
});

test('an origin opens its own choices, a covenant its own: [ALT] for an Alterian only, [AMP] for a sworn Amputator; both still roll', () => {
    const alt = (enc, sid) => enc.stages[sid].decisions.find(d => /^\[ALT\]/.test(d.text));
    for (const enc of [encounterDefinitions.a_disturbing_sight, encounterDefinitions.aftermath]) {
        const st = Object.keys(enc.stages).find(k => (enc.stages[k].decisions || []).some(d => /^\[ALT\]/.test(d.text)));
        const d = alt(enc, st);
        assert.ok(d, `${enc.id}: the Alterian choice`);
        assert.equal(d.type, 'skill_check', 'a roll');
        assert.ok(d.conditions.some(c => c.type === 'has_tag' && c.tag === 'LANG_ALTERIAN'), `${enc.id}: an Alterian's alone`);
        assert.ok(!d.conditions.some(c => /covenant/.test(c.type)), 'nothing to do with a covenant');
    }
    const amp = encounterDefinitions.suspicious_merchant.stages.discovery.decisions.find(d => /^\[AMP\]/.test(d.text));
    assert.ok(amp && amp.type === 'skill_check', 'the Amputators intimidate the merchant, with a roll');
    assert.ok(amp.conditions.some(c => c.type === 'in_covenant' && c.covenant === 'amputators'));
    assert.ok(encounterDefinitions.suspicious_merchant.stages[amp.successOutcomes[0].results[0].payload.stageId], 'and it leads somewhere');
});

test('in act 1 the first graveyard the player comes upon becomes Osric\'s; Garrick is put where the party can walk to, until he is put to rest', () => {
    quiet(() => {
        for (const seed of [4242, 1000, 77]) {
            story({});
            Object.assign(gameState.world, { amputatorGraveyard: null, amputatorQuarry: null, isInterior: false, structureChunks: {}, nikoliCampfire: null });
            gameState.seed = seed;
            const wm = new WorldManager();
            const sp = wm.findSpawnPoint();
            gameState.player.col = sp.col; gameState.player.row = sp.row;
            for (let y = sp.row - 160; y <= sp.row + 160; y += 16) for (let x = sp.col - 160; x <= sp.col + 160; x += 16) wm.ensureChunkLoaded(x, y);
            const all = [...(wm._graveCandidates || [])].map(k => k.split(',').map(Number));
            // a graveyard: three or more stones in one plot (a village's lone roadside stone is not one, and is never claimed)
            const stones = all.filter(([c, r]) => all.filter(([c2, r2]) => Math.abs(c2 - c) <= 6 && Math.abs(r2 - r) <= 6).length >= 3);
            assert.ok(stones.length, `seed ${seed}: there are graveyards near the start`);
            const lone = all.find(([c, r]) => all.filter(([c2, r2]) => Math.abs(c2 - c) <= 12 && Math.abs(r2 - r) <= 12).length === 1);
            if (lone) assert.equal(wm.noticeAmputatorGraveyard(lone[0], lone[1]), false, 'a lone roadside stone is not a graveyard');
            // far from every stone: nothing is claimed
            assert.equal(wm.noticeAmputatorGraveyard(sp.col + 900, sp.row + 900), false);
            const [gc, gr] = stones[0];
            assert.equal(wm.noticeAmputatorGraveyard(gc, gr + 6), true, `seed ${seed}: claimed when the player comes near`);
            const [oc, or] = gameState.world.amputatorGraveyard.split(',').map(Number);
            assert.ok(Math.abs(oc - gc) <= 8 && Math.abs(or - gr) <= 8, 'Osric sits among its stones');
            assert.equal(wm.getObjectAt(oc, or).id, 'OSRIC_NPC');
            assert.equal(wm.noticeAmputatorGraveyard(gc, gr), false, 'claimed once');
            // the errand, taken standing beside him
            gameState.player.col = oc; gameState.player.row = or + 1;
            const t0 = Date.now();
            const q = wm.pickAmputatorQuarry();
            const took = Date.now() - t0;
            assert.ok(q, `seed ${seed}: somewhere for Garrick`);
            const d = Math.hypot(q[0] - oc, q[1] - or);
            // at another small graveyard, the nearest one at least GARRICK_GRAVEYARD.MIN cells from Osric's: gravestones round him
            const gstones = Object.entries(gameState.world.changes).filter(([k, id]) => /TOMBSTONE|OLD_GRAVESTONE/.test(String(id))).map(([k]) => k.split(',').map(Number))
                .filter(([c, r]) => Math.abs(c - q[0]) <= 7 && Math.abs(r - q[1]) <= 7);
            assert.ok(d >= GARRICK_GRAVEYARD.MIN, `seed ${seed}: farther than before, ${d.toFixed(1)} cells from Osric`);
            assert.ok(gstones.length >= 3, `seed ${seed}: in another graveyard (${gstones.length} stones round him, ${took} ms to find)`);
            assert.ok(took < 4000, `found quickly enough (${took} ms)`);
            assert.deepEqual(wm.pickAmputatorQuarry(), q, 'picked once');
            wm.refreshStoryObjects();
            assert.equal(wm.getObjectAt(q[0], q[1]).id, 'GARRICK_NPC');
            gameState.world.changes['story:garrick_slain'] = true;
            wm.refreshStoryObjects();
            assert.ok(!wm.getObjectAt(q[0], q[1]) || wm.getObjectAt(q[0], q[1]).id !== 'GARRICK_NPC', 'gone once put to rest');
        }
    });
});

test('after act 1 no graveyard is claimed: Osric is only ever met in act 1', () => {
    quiet(() => {
        story({ milestones: ['darius_slain'] });
        gameState.world.changes['story:darius_slain'] = true;
        Object.assign(gameState.world, { amputatorGraveyard: null, amputatorQuarry: null, isInterior: false, structureChunks: {} });
        gameState.seed = 4242;
        const wm = new WorldManager();
        const sp = wm.findSpawnPoint();
        for (let y = sp.row - 160; y <= sp.row + 160; y += 16) for (let x = sp.col - 160; x <= sp.col + 160; x += 16) wm.ensureChunkLoaded(x, y);
        assert.equal((wm._graveCandidates || new Set()).size, 0);
        assert.equal(gameState.world.amputatorGraveyard, null);
    });
});

test('the Amputators call each other by the old surgical ranks, never "brother": Osric a Senior Surgeon, Garrick a Surgeon, a new oath an Orderly', () => {
    const ranks = COVENANTS.amputators.ranks;
    assert.deepEqual(ranks, ['Orderly', 'Dresser', 'Surgeon', 'Senior Surgeon', 'Chief Surgeon']);
    assert.match(E.AMPUTATOR_OSRIC.name, /^Senior Surgeon /);
    assert.match(E.AMPUTATOR_GARRICK.name, /^Surgeon /);
    const all = [OSRIC, GARRICK].flatMap(e => Object.values(e.stages)).flatMap(st => [st.text, st.displayText, ...(st.decisions || []).map(d => d.text)]).join('\n');
    assert.ok(!/\bbrother(hood)?\b/i.test(all), 'no brothers among them');
    assert.ok(OSRIC.stages.joined.text.includes('Welcome, Orderly'), 'whoever swears starts at the first rank');
    assert.ok(!/brother/i.test(Q.amputators_trial.name + Q.amputators_trial.description));
});

test('Osric keeps a shop once Garrick is at rest: a plain club and mace until Darius falls, the Amputators\' own armor set from act 3 (the blood moon)', () => {
    const shopIn = (sid) => (OSRIC.stages[sid].decisions || []).find(d => d.type === 'open_shop');
    for (const sid of ['meet_5', 'task_3', 'again', 'waiting', 'return']) assert.ok(!shopIn(sid), `${sid}: no shop before Garrick is at rest`);
    for (const sid of ['joined_2', 'member', 'rejoined']) assert.ok(shopIn(sid), `${sid}: his shop`);
    for (const sid of ['not_yet', 'renounced']) assert.ok(!shopIn(sid), `${sid}: no shop for a stranger`);
    assert.deepEqual(shopIn('member').conditions, [{ type: 'in_covenant', covenant: 'amputators' }], 'for the sworn only');
    assert.ok(shopIn('offer_again') && shopIn('offer_again').conditions.some(c => c.type === 'in_covenant'), 'a stranger sees no shop');
    assert.deepEqual(Covenants.waresFor('amputators', 1).map(w => w.id), ['wooden_club', 'mace']);
    const set = ['amputators_hood', 'amputators_apron', 'amputators_gloves', 'amputators_trousers', 'amputators_boots'];
    assert.deepEqual(Covenants.waresFor('amputators', 2).map(w => w.id), ['wooden_club', 'mace'], 'act 2 (after the first Arc Knight) still the plain stock');
    assert.deepEqual(Covenants.waresFor('amputators', 3).map(w => w.id), set);
    assert.deepEqual(Covenants.waresFor('amputators', 4).map(w => w.id), set, 'act 4 keeps the act 3 stock');
    // the shop's stock follows the act it is opened in
    story({ milestones: ['darius_slain'] });
    assert.deepEqual(shopIn('member').wares.map(w => w.id), Covenants.waresFor('amputators', ActSystem.getAct()).map(w => w.id));
    story({});
    assert.deepEqual(shopIn('member').wares.map(w => w.id), ['wooden_club', 'mace']);
    // the armor: tier 3, each piece +1 HP recovery, not leather's Stamina recovery, and dearer than the leather piece for the same slot
    const leather = Object.values(ItemDefinitions).filter(d => /^leather_/.test(d.id) && d.type === 'armor');
    for (const id of set) {
        const d = ItemDefinitions[id], l = leather.find(x => x.slot === d.slot);
        assert.equal(d.tier, 3, id);
        assert.equal(d.resources.hpRecovery, 1, `${id}: +1 HP recovery`);
        assert.ok(!d.resources.staminaRecovery, `${id}: not a leather piece renamed`);
        assert.ok(l && d.value > 2 * l.value, `${id}: ${d.value} against leather's ${l && l.value}`);
    }
    // every ware is a real item, with its icon on a sheet that is registered and on disk
    for (const id of ['wooden_club', 'mace']) assert.ok(ItemDefinitions[id] && !ItemDefinitions[id].iconSheet, `${id}: a plain weapon`);
    // their icons: the armor sheet's own column for the set (a row per slot, head to feet), painted
    const png = fs.readFileSync(new URL('../../frontend/src/assets/icons/armor.png', import.meta.url));
    assert.ok(png.readUInt32BE(16) >= 6 * 64, 'the armor sheet has the set\'s column');
    set.forEach((id, row) => { const d = ItemDefinitions[id]; assert.ok(!d.iconSheet && d.icon.col === 5 && d.icon.row === row, `${id}: column 5, row ${row}`); });
    // the armor is the Amputators' own: no loot table and no other shop has it
    const tables = JSON.stringify(LootTableDefinitions);
    for (const id of set) assert.ok(!tables.includes(`"${id}"`), `${id}: in no loot table`);
    assert.ok(!/\bsins?\b/i.test(Object.values(OSRIC.stages).map(s => s.text).join(' ')), 'Osric speaks of no sins');
});
