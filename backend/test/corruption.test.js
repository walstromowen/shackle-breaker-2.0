// backend/test/corruption.test.js: `npm test`. Corruption: what raises it, what it does at 50 and 100, the meteorite that frees a shackled character,
// and the betrayal that follows if they are left shackled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameState } from '../../shared/core/gameState.js';
import { events } from '../../shared/core/eventBus.js';
import { CORRUPTION, MAGIC_DAMAGE_TYPES, PHYSICAL_DAMAGE_TYPES } from '../../shared/core/constants.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { StatCalculator } from '../../shared/characters/statCalculator.js';
import { CorruptionSystem } from '../../shared/characters/corruptionSystem.js';
import { AbilitySystem } from '../../shared/abilities/abilitySystem.js';
import { AbilityDefinitions } from '../../shared/abilities/abilityDefinitions.js';
import { ItemDefinitions } from '../../shared/items/itemDefinitions.js';
import { ItemFactory } from '../../shared/items/itemFactory.js';
import { BiomeModel } from '../../shared/world/biomeModel.js';
import { BIOME_DEFINITIONS } from '../../shared/world/biomeDefinitions.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { getStatDescription } from '../../shared/characters/statDescriptions.js';
import { EncounterLogic } from '../../frontend/src/screens/encounter/encounterLogic.js';
import { BattleController } from '../../frontend/src/screens/battle/battleController.js';
import { PHASE } from '../../shared/battle/battleConstants.js';
import { SpawnTableFactory } from '../../shared/battle/spawnTableFactory.js';
import { SpawnTableDefinitions } from '../../shared/battle/spawnTableDefinitions.js';
import { isCursed } from '../../frontend/src/ui/curseOverlay.js';

const quiet = (fn) => { const log = console.log, warn = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = log; console.warn = warn; } };
const hero = (name = 'Aldric', extra = {}) => quiet(() => {
    const e = EntityFactory.create('HUMANOID', { name, attributes: { vigor: 12, strength: 10, dexterity: 10, intelligence: 14, attunement: 10 }, ...extra });
    e.hp = e.maxHp; e.stamina = e.maxStamina; e.insight = e.maxInsight;
    return e;
});
const stats = (e) => StatCalculator.calculate(e);
// Corruption is a secret until act 2 (the 'act2' milestone). Every test below that is about its effects starts in act 2; the ones about the secret say otherwise.
const act = (n) => { gameState.milestones = n >= 2 ? ['act2'] : []; };
act(2);

test('the tiers are data: one at 50 that halves max health and adds magic damage, and shackling at 100', () => {
    assert.equal(CORRUPTION.MAX, 100);
    assert.equal(CORRUPTION.SHACKLE_AT, 100);
    const tier = CORRUPTION.TIERS.find(t => t.at === 50);
    assert.ok(tier);
    assert.equal(tier.maxHpMultiplier, 0.5);
    assert.ok(tier.magicDamageBonus > 0);
    assert.equal(CORRUPTION.UNSHACKLE_ITEM, 'meteorite');
    assert.ok(CORRUPTION.UNSHACKLE_TO < tier.at, 'a freed character comes back below the first tier');
});

test('at 50% corruption max health is halved and every magical damage type grows, until it drops below 50 again', () => {
    const e = hero();
    gameState.party.members = [e];
    const before = stats(e);
    CorruptionSystem.change(e, 49);
    const at49 = stats(e);
    assert.equal(at49.maxHp, before.maxHp, 'nothing happens below 50');
    assert.equal(at49.attack.fire, before.attack.fire);

    const change = CorruptionSystem.change(e, 1);
    const at50 = stats(e);
    assert.equal(at50.corruption, 50);
    assert.equal(at50.maxHp, Math.floor(before.maxHp * CORRUPTION.TIERS[0].maxHpMultiplier));
    for (const t of MAGIC_DAMAGE_TYPES) assert.equal(at50.attack[t], Math.round(before.attack[t] * (1 + CORRUPTION.TIERS[0].magicDamageBonus)), `${t} grows`);
    for (const t of PHYSICAL_DAMAGE_TYPES) assert.equal(at50.attack[t], before.attack[t], `${t} does not`);
    assert.ok(e.hp <= at50.maxHp, 'current health is pulled down to the new maximum');
    assert.ok(change.messages.length === 1, 'crossing the line says so once');
    assert.equal(CorruptionSystem.tierOf(e).id, 'corrupted');

    CorruptionSystem.change(e, -1);
    assert.equal(stats(e).maxHp, before.maxHp, 'back below 50: full maximum health again');
    assert.equal(stats(e).attack.fire, before.attack.fire);
    assert.equal(CorruptionSystem.tierOf(e), null);
});

test('corruption stays between 0 and 100, and gear and traits add to the stored part', () => {
    const e = hero();
    gameState.party.members = [e];
    CorruptionSystem.change(e, -30);
    assert.equal(CorruptionSystem.valueOf(e), 0, 'it cannot go below nothing');
    CorruptionSystem.change(e, 30);
    assert.equal(CorruptionSystem.valueOf(e), 30);
    const marked = hero('Marked');
    quiet(() => marked.addTrait('superstitious'));   // a trait that adds 5 corruption of its own
    gameState.party.members = [e, marked];
    assert.equal(CorruptionSystem.valueOf(marked), 5, 'the trait is counted');
    CorruptionSystem.change(marked, 10);
    assert.equal(CorruptionSystem.valueOf(marked), 15, 'and what happens in the world is added to it');
    CorruptionSystem.change(marked, -50);
    assert.equal(CorruptionSystem.valueOf(marked), 5, 'the trait\'s share stays however kind they are');
    CorruptionSystem.change(marked, 500);
    assert.equal(marked.shackled, true, 'and the sum never passes the top');
});

test('at 100% the character is shackled: health 0, kept there, and nothing heals them', () => {
    const e = hero();
    gameState.party.members = [e, hero('Mira')];
    const change = CorruptionSystem.change(e, 100);
    assert.equal(change.shackled, true);
    assert.equal(e.shackled, true);
    assert.equal(e.hp, 0);
    assert.equal(CorruptionSystem.valueOf(e), 100);
    assert.ok(change.messages.some(m => /shackle/i.test(m)));

    e.hp = 30;
    e.modifyResource('hp', 50);
    assert.equal(e.hp, 0, 'healing, resting and revival all give nothing back');
    assert.equal(CorruptionSystem.change(e, -50).amount, 0, 'there is nothing to lower until they are freed');
    assert.deepEqual(CorruptionSystem.shackledMembers(), [e]);
});

test('the fallen meteorite frees a shackled character (and is kept for anyone else)', () => {
    assert.equal(ItemDefinitions.meteorite.useAbility, 'meteorite_unshackle');
    assert.equal(ItemDefinitions.meteorite.usable, true);
    assert.equal(ItemFactory.createItem('meteorite').usable, true, 'the item menu offers Use');
    assert.ok(AbilitySystem.usableIn('meteorite_unshackle', 'overworld'));
    assert.ok(!AbilitySystem.usableIn('meteorite_unshackle', 'battle'));
    assert.equal(AbilityDefinitions.meteorite_unshackle.effects[0].type, 'unshackle');

    const well = hero('Well');
    const down = hero('Down');
    gameState.party.members = [well, down];
    CorruptionSystem.change(down, 100);
    const kept = quiet(() => AbilitySystem.execute('meteorite_unshackle', well, well, { context: 'overworld' }));
    assert.equal(kept.success, false, 'not shackled: nothing happens, so the item is not spent');
    assert.match(kept.message, /not shackled/i);

    const freed = quiet(() => AbilitySystem.execute('meteorite_unshackle', down, down, { context: 'overworld' }));
    assert.equal(freed.success, true);
    assert.equal(down.shackled, false);
    assert.equal(CorruptionSystem.valueOf(down), CORRUPTION.UNSHACKLE_TO);
    assert.ok(down.hp > 0 && down.hp <= down.maxHp, 'they wake with some health');
    assert.equal(CorruptionSystem.tierOf(down), null);
    down.hp = down.maxHp;
    assert.equal(down.hp, down.maxHp, 'and can be healed again');
});

test('a party member who uses magic gains corruption; physical moves, enemies and strangers do not', () => {
    const mage = hero('Mage');
    const other = hero('Other');
    gameState.party.members = [mage];
    const fireball = { id: 'fireball', config: AbilityDefinitions.fireball };
    const punch = { id: 'punch', config: AbilityDefinitions.punch };
    assert.equal(CorruptionSystem.corruptionOfAbility(fireball), CORRUPTION.PER_MAGIC_USE);
    assert.equal(CorruptionSystem.corruptionOfAbility(punch), 0);
    assert.equal(CorruptionSystem.corruptionOfAbility({ tags: ['magical'], corruption: 3 }), 3, 'an ability can set its own');
    assert.equal(CorruptionSystem.corruptionOfAbility({ tags: ['magical'], corruption: -1 }), -1);

    CorruptionSystem.onAbilityUsed(mage, fireball);
    assert.equal(CorruptionSystem.valueOf(mage), CORRUPTION.PER_MAGIC_USE);
    assert.equal(CorruptionSystem.onAbilityUsed(mage, punch), null);
    assert.equal(CorruptionSystem.onAbilityUsed({ team: 'enemy', originalEntity: mage }, fireball), null, 'enemies never gain it');
    assert.equal(CorruptionSystem.onAbilityUsed(other, fireball), null, 'someone who is not in the party does not');
    // a combatant wraps the real character
    CorruptionSystem.onAbilityUsed({ team: 'party', originalEntity: mage }, fireball);
    assert.equal(CorruptionSystem.valueOf(mage), CORRUPTION.PER_MAGIC_USE * 2);
});

test('casting in a real battle raises the caster\'s corruption once per cast, and the 100th point shackles them mid-fight', () => {
    const real = Math.random;
    quiet(() => {
        const mage = EntityFactory.create('HUMANOID', { name: 'Mage', level: 8, abilities: ['fireball', 'punch'], attributes: { vigor: 14, strength: 8, dexterity: 12, intelligence: 18, attunement: 16 } });
        const ally = EntityFactory.create('HUMANOID', { name: 'Ally', level: 8 });
        mage.hp = mage.maxHp; mage.insight = mage.maxInsight; ally.hp = ally.maxHp;
        gameState.party.members = [mage, ally];
        const start = CorruptionSystem.valueOf(mage);
        const bc = new BattleController({}, { TILE_SIZE: 64 }, {});
        bc.start([EntityFactory.create('WOLF', 1)], { maxActive: 3 });
        const caster = bc.state.partyRoster.find(c => c.originalEntity === mage);
        const fireball = caster.abilities.find(a => a.id === 'fireball');
        assert.ok(fireball, 'the mage has Fireball');
        const wolf = bc.state.activeEnemies[0];
        const mageCombatant = caster;

        mage.state.baseStats.corruption = CORRUPTION.SHACKLE_AT - 1;
        bc.state.turnQueue = [];
        bc.turnManager._applyAbilityEffects({ actor: mageCombatant, action: fireball, targets: [wolf], isFirstTarget: true, ignoreCost: false });
        assert.equal(mage.shackled, true, 'the cast that pushes corruption to 100 shackles the caster');
        assert.equal(mageCombatant.isDead(), true, 'who falls like a fainted member');
        assert.ok(bc.state.turnQueue.some(t => t.message && /shackle/i.test(t.message)), 'and the battle says so');
        assert.ok(start >= 0);
    });
    Math.random = real;
});

test('a shackled member can only betray a party that still has someone standing, and the betrayer leaves it for good', () => {
    const lead = hero('Lead');
    const bound = hero('Bound');
    gameState.party.members = [lead, bound];
    assert.equal(CorruptionSystem.pickBetrayer(), null, 'nobody is shackled yet');
    CorruptionSystem.change(bound, 100);
    assert.equal(CorruptionSystem.pickBetrayer(), bound);

    lead.hp = 0;
    assert.equal(CorruptionSystem.pickBetrayer(), null, 'with nobody left to fight them it is game over, not a betrayal');
    lead.hp = lead.maxHp;

    const turned = CorruptionSystem.turnAgainstParty(bound);
    assert.equal(turned, bound);
    assert.deepEqual(gameState.party.members, [lead], 'gone from the party');
    assert.equal(turned.hp, turned.maxHp, 'full health');
    assert.equal(turned.shackled, false);
    assert.equal(CorruptionSystem.tierOf(turned), null, 'no penalty to take the edge off the fight');
    assert.equal(CorruptionSystem.turnAgainstParty(bound), null, 'and they cannot leave twice');
});

test('the Shackling is an ordinary encounter in the pool: only with a shackled member, at any hour, and a likely one (BETRAYAL_WEIGHT)', () => {
    const lead = hero('Lead');
    const bound = hero('Bound');
    gameState.party.members = [lead, bound];
    const biome = new BiomeModel(BIOME_DEFINITIONS.PLAINS);
    const real = Math.random;
    // the first roll of getEncounter is "does an encounter happen" (0 always lets it); the next ones (who is shackled, then the pool) all use `pick`
    const withRoll = (pick) => { let n = 0; Math.random = () => (n++ === 0 ? 0 : pick); };
    try {
        for (const hour of [3, 12, 18]) {
            withRoll(0.999);                        // the last entry of the pool
            const none = biome.getEncounter(hour);
            assert.ok(!none || none.id !== 'shackled_betrayal', `nobody shackled at ${hour}h: no Shackling`);
        }
        CorruptionSystem.change(bound, 100);
        for (const hour of [3, 12, 18]) {
            withRoll(0.999);
            const hit = biome.getEncounter(hour);
            assert.equal(hit.id, 'shackled_betrayal', `it can come at ${hour}h`);
            assert.equal(hit.context.betrayerIndex, 1);
            assert.equal(hit.context.betrayerName, 'Bound');
            withRoll(0);
            const other = biome.getEncounter(hour);
            assert.ok(other && other.id !== 'shackled_betrayal', 'the biome\'s own encounters are still in the pool');
        }
        // it is not automatic: over many encounters it is a share of them, and a big one
        Math.random = real;
        let shackling = 0, total = 0;
        const hits = {};
        for (let i = 0; i < 4000; i++) {
            const realRandom = Math.random; let n = 0;
            Math.random = () => (n++ === 0 ? 0 : realRandom());
            const e = biome.getEncounter(12);
            Math.random = realRandom;
            if (!e) continue;
            total++; hits[e.id] = (hits[e.id] || 0) + 1;
            if (e.id === 'shackled_betrayal') shackling++;
        }
        assert.ok(total > 0 && Object.keys(hits).length > 1, 'ordinary encounters still come up: ' + JSON.stringify(hits));
        assert.ok(shackling / total > 0.3 && shackling / total < 0.8, `share ${shackling / total}`);
        // a lone shackled member with nobody standing cannot turn on anyone
        gameState.party.members = [bound];
        withRoll(0.999);
        const alone = biome.getEncounter(12);
        assert.ok(!alone || alone.id !== 'shackled_betrayal');
    } finally { Math.random = real; }
    const town = new BiomeModel({ ...BIOME_DEFINITIONS.PLAINS, encounters: { rate: 0, pools: [] } });
    gameState.party.members = [lead, bound];
    Math.random = () => 0;
    try { assert.equal(town.getEncounter(12), null, 'where encounters never happen, neither does this'); } finally { Math.random = real; }
});

test('the Shackling reads as a party noticing erratic behaviour: no time of day, no "holding up" line, and its name is Shackling', () => {
    const enc = encounterDefinitions.shackled_betrayal;
    assert.equal(enc.title, 'Shackling');
    assert.equal(enc.ambience, undefined, 'it can come at any hour, so it does not set a night ambience');
    const words = JSON.stringify(enc).toLowerCase();
    assert.ok(!words.includes('small hours'));
    assert.ok(!words.includes('holding them down') && !words.includes('holding something up'));
    assert.ok(/twitch|muttering|erratic|not been right/.test(enc.stages.awake.text.toLowerCase()), 'the party has noticed something is off');
});

test('the betrayal encounter: every stage it names exists, it ends in a fight against the shackled member, and the aftermath is registered', () => {
    const enc = encounterDefinitions.shackled_betrayal;
    const end = encounterDefinitions.shackled_betrayal_end;
    assert.ok(enc && end);
    const results = Object.values(enc.stages).flatMap(s => s.decisions).flatMap(d => (d.outcomes || []).flatMap(o => o.results));
    for (const r of results.filter(r => r.type === 'ADVANCE_STAGE')) assert.ok(enc.stages[r.payload.stageId], `stage ${r.payload.stageId}`);
    const battle = results.find(r => r.type === 'START_BATTLE');
    assert.ok(battle && battle.payload.betrayer === true);
    assert.equal(battle.payload.afterVictory.encounterId, 'shackled_betrayal_end');
    assert.ok(Object.values(enc.stages).some(s => /{betrayer}/.test(s.text)), 'the text names who it is');
    const mainJs = fs.readFileSync(new URL('../../frontend/src/main.js', import.meta.url), 'utf8');
    for (const e of [enc, end]) assert.ok(mainJs.includes(`${e.imageSheet}:`), `${e.id} has a registered picture sheet`);
});

test('MODIFY_CORRUPTION (encounter results) raises or lowers the leader, and a shackling ends the run when nobody is left standing', () => {
    const lead = hero('Lead');
    const second = hero('Second');
    gameState.party.members = [lead, second];
    const model = { context: {} };
    let r = quiet(() => EncounterLogic.resolveResults([{ type: 'MODIFY_CORRUPTION', payload: { amount: 7, target: 'active_character' } }], model, null));
    assert.equal(CorruptionSystem.valueOf(lead), 7);
    assert.ok(r.messages.some(m => /Corruption \+7%/.test(m)), r.messages.join('|'));
    r = quiet(() => EncounterLogic.resolveResults([{ type: 'MODIFY_CORRUPTION', payload: { amount: -5 } }], model, null));
    assert.equal(CorruptionSystem.valueOf(lead), 2);
    assert.ok(r.messages.some(m => /-5%/.test(m)));
    quiet(() => EncounterLogic.resolveResults([{ type: 'MODIFY_CORRUPTION', payload: { amount: 3, target: 'entire_party' } }], model, null));
    assert.equal(CorruptionSystem.valueOf(second), 3);

    r = quiet(() => EncounterLogic.resolveResults([{ type: 'MODIFY_CORRUPTION', payload: { amount: 100 } }], model, null));
    assert.equal(lead.shackled, true);
    assert.equal(gameState.party.members[0], second, 'the next member in line steps to the front');
    assert.equal(r.isGameOver, false);
    const last = quiet(() => EncounterLogic.resolveResults([{ type: 'MODIFY_CORRUPTION', payload: { amount: 100 } }], model, null));
    assert.equal(second.shackled, true);
    assert.equal(last.isGameOver, true, 'everyone is shackled: nobody is left standing');
});

test('START_BATTLE with betrayer: true sends the shackled member out of the party as the enemy', () => {
    const lead = hero('Lead');
    const bound = hero('Bound');
    gameState.party.members = [lead, bound];
    CorruptionSystem.change(bound, 100);
    const model = { context: { betrayerIndex: 1, betrayerName: 'Bound' }, updateContext(d) { Object.assign(this.context, d); } };
    const started = [];
    const on = (d) => started.push(d);
    events.on('START_BATTLE', on);
    quiet(() => EncounterLogic.resolveResults([{ type: 'START_BATTLE', payload: { betrayer: true, background: 'default', afterVictory: { encounterId: 'shackled_betrayal_end' } } }], model, { getBiomeAt: () => null }));
    events.off('START_BATTLE', on);
    assert.equal(started.length, 1);
    assert.equal(started[0].enemies.length, 1);
    assert.equal(started[0].enemies[0], bound);
    assert.deepEqual(gameState.party.members, [lead]);
    assert.equal(started[0].afterVictory.encounterId, 'shackled_betrayal_end');
    assert.equal(model.context.betrayerName, 'Bound');
});

test('the corruption stat card lists what magic costs and what the tiers do, from the same table', () => {
    const d = getStatDescription('corruption');
    assert.ok(d.rows.some(r => r.label === 'Each magical ability used' && r.value === `+${CORRUPTION.PER_MAGIC_USE}%`));
    assert.ok(d.rows.some(r => r.label === 'At 50%' && /max health halved/.test(r.value) && /magic damage \+25%/.test(r.value)));
    assert.ok(d.rows.some(r => r.label === 'At 100%' && r.value === 'Shackled'));
    assert.match(d.note, /meteorite/i);
});

test('the crit damage multiplier reaches battle: the stats a fight reads carry it', () => {
    const e = hero();
    const detailed = StatCalculator.calculateDetailed(e);
    assert.equal(detailed.critMultiplier, StatCalculator.calculate(e).critMultiplier);
    assert.ok(detailed.critMultiplier >= 1.5);
});

test('decisions that carry `corruption` use whole numbers and are applied by the encounter screen whichever way the outcome falls', () => {
    let found = 0;
    for (const enc of Object.values(encounterDefinitions)) {
        for (const [stageId, stage] of Object.entries(enc.stages)) {
            for (const d of stage.decisions || []) {
                if (d.corruption === undefined) continue;
                found++;
                assert.ok(Number.isInteger(d.corruption) && d.corruption !== 0 && Math.abs(d.corruption) <= 10, `${enc.id}/${stageId}: ${d.corruption}`);
                assert.notEqual(d.type, 'switch_character');
            }
        }
    }
    assert.ok(found >= 10, 'the cruel, kind and magical choices of the encounters are marked');
    const controller = fs.readFileSync(new URL('../../frontend/src/screens/encounter/encounterController.js', import.meta.url), 'utf8');
    assert.ok(/decision\.corruption/.test(controller) && /MODIFY_CORRUPTION/.test(controller));
});


test('before act 2 corruption builds quietly: it stops short of the first tier, no penalty is felt, nothing is said, and nobody can be shackled', () => {
    act(1);
    try {
        assert.equal(CorruptionSystem.isRevealed(), false);
        const e = hero();
        gameState.party.members = [e];
        const before = stats(e);
        const change = CorruptionSystem.change(e, 80);
        const first = Math.min(...CORRUPTION.TIERS.map(t => t.at));
        assert.equal(CorruptionSystem.valueOf(e), first - 1, 'it cannot climb to the first tier');
        assert.equal(stats(e).maxHp, before.maxHp);
        assert.equal(change.messages.length, 0);
        assert.equal(CorruptionSystem.isShackled(e), false);
        // gear or a trait pushing the sum over the line still costs nothing in act 1
        const marked = hero('Marked', { traits: ['superstitious'] });
        CorruptionSystem.change(marked, 80);
        assert.ok(CorruptionSystem.valueOf(marked) >= first);
        assert.equal(stats(marked).maxHp, stats(hero('Plain', { traits: ['superstitious'] })).maxHp, 'no halving before the reveal');
        // and the encounter result says nothing about it
        const out = quiet(() => EncounterLogic.resolveResults([{ type: 'MODIFY_CORRUPTION', payload: { amount: 3 } }], { context: {} }, null));
        assert.ok(!out.messages.join('|').toLowerCase().includes('corruption'), 'no corruption text in act 1');
    } finally { act(2); }
    // the reveal: granting the milestone lifts the ceiling and the screens may show it
    act(2);
    assert.equal(CorruptionSystem.isRevealed(), true);
    const e = hero();
    gameState.party.members = [e];
    CorruptionSystem.change(e, 80);
    assert.equal(CorruptionSystem.valueOf(e), 80);
});

test('every enemy of the shackled faction is born at 100% corruption, as a stat only (no tier, no shackle), and is cleansed if it ever joins the party', () => {
    const seen = { shackled: 0, other: 0 };
    for (const tableId of Object.keys(SpawnTableDefinitions)) {
        for (let i = 0; i < 40; i++) {
            const model = SpawnTableFactory.generateBattle(tableId, 'normal');
            const fromShackled = model.enemies.some(e => e.baseStats);
            for (const cfg of model.enemies) {
                if (cfg.baseStats) { assert.equal(cfg.baseStats.corruption, 100); seen.shackled++; } else seen.other++;
            }
            // a pool is one faction: either everyone has it or nobody does
            if (model.enemies.length) assert.equal(model.enemies.every(e => !!e.baseStats), fromShackled);
        }
    }
    assert.ok(seen.shackled > 0 && seen.other > 0, 'both factions came up');

    const cfg = { id: 'ROTTER', baseStats: { corruption: 100, naturalCorruption: true } };
    const plain = quiet(() => EntityFactory.create('ROTTER', { level: 3 }));
    const cursed = quiet(() => EntityFactory.create('ROTTER', { level: 3, baseStats: cfg.baseStats }));
    assert.equal(CorruptionSystem.valueOf(cursed), 100);
    assert.equal(CorruptionSystem.isShackled(cursed), false, 'born cursed is not shackled');
    assert.equal(cursed.maxHp, plain.maxHp, 'the enemy is tuned already: no max health cut');
    for (const t of MAGIC_DAMAGE_TYPES) assert.equal(stats(cursed).attack[t], stats(plain).attack[t]);
    assert.equal(CorruptionSystem.cleanseNatural(cursed), true);
    assert.equal(CorruptionSystem.valueOf(cursed), 0);
    assert.equal(CorruptionSystem.cleanseNatural(plain), false);
});

test('the act 2 story explains corruption (the gauge stage) before the milestone is granted', () => {
    const stages = encounterDefinitions.act_two.stages;
    // a long beat is told over several short stages: gauge, gauge_2, gauge_3...
    const beat = (id) => { const ids = [id]; while (stages[`${id}_${ids.length + 1}`]) ids.push(`${id}_${ids.length + 1}`); return ids; };
    const text = (id) => beat(id).map(s => stages[s].text).join(' ');
    const last = (id) => beat(id).at(-1);
    assert.ok(stages.gauge, 'there is a stage that names it');
    assert.match(text('gauge'), /Corruption/);
    const next = (id) => stages[id].decisions.flatMap(d => d.outcomes.flatMap(o => o.results.map(r => r.payload?.stageId)));
    assert.ok(next(last('you')).every(s => s === 'gauge'), 'what you carry leads into it');
    assert.ok(next(last('gauge')).every(s => s === 'iron'), 'and on into the iron');
});

test('the cursed portrait is used for exactly the shackled, and every portrait screen draws it', () => {
    const e = hero();
    gameState.party.members = [e];
    assert.equal(isCursed(e), false);
    CorruptionSystem.shackle(e);
    assert.equal(isCursed(e), true);
    for (const file of ['screens/characterSummary/components/equipmentPanel.js', 'screens/party/partyRenderer.js', 'screens/levelUp/levelUpRenderer.js', 'screens/encounter/encounterRenderer.js']) {
        const src = fs.readFileSync(new URL(`../../frontend/src/${file}`, import.meta.url), 'utf8');
        assert.match(src, /drawCursedPortrait\(/, `${file} draws the curse`);
    }
    for (const file of ['screens/characterSummary/components/statsPanel.js', 'screens/levelUp/levelUpRenderer.js', 'screens/workshop/components/workshopDetailsRenderer.js']) {
        const src = fs.readFileSync(new URL(`../../frontend/src/${file}`, import.meta.url), 'utf8');
        assert.match(src, /CorruptionSystem\.isRevealed\(\)/, `${file} hides corruption until act 2`);
    }
});
