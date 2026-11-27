// backend/test/insightranks.test.js: `npm test`. Insights are read, not held (shared/abilities/insights.js): every reading raises the reader's rank in its
// element, teaching that rank's spells and costing corruption; the Shmindolyn's Draught takes the last one back; enemies know ranks of their own, deeper each
// act; old saves turn a held Insight into its rank.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ItemDefinitions as I } from '../../shared/items/itemDefinitions.js';
import { ENTITY_DEFINITIONS as E } from '../../shared/characters/entityDefinitions.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { StatCalculator } from '../../shared/characters/statCalculator.js';
import { AbilitySystem } from '../../shared/abilities/abilitySystem.js';
import { CombatantModel } from '../../shared/battle/combatantModel.js';
import { ActSystem } from '../../shared/story/actSystem.js';
import { CorruptionSystem } from '../../shared/characters/corruptionSystem.js';
import { gameState } from '../../shared/core/gameState.js';
import * as X from '../../shared/abilities/insights.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const read = (who, el) => quiet(() => AbilitySystem.execute(`read_insight_${el}`, who, who, { context: 'overworld' }));
const scholar = (attrs = { intelligence: 20, attunement: 20 }) => quiet(() => EntityFactory.create('HUMANOID', { name: 'Ilse', level: 5, attributes: attrs }));

test('every Insight is a consumable read outside a fight, with its spells by rank and its art still on the weapons sheet', () => {
    for (const [el, id] of Object.entries(X.INSIGHT_ITEMS)) {
        const d = I[id];
        assert.equal(d.type, 'consumable', id);
        assert.equal(d.useAbility, `read_insight_${el}`);
        assert.deepEqual(d.usability, ['overworld']);
        assert.equal(d.iconSheet, 'weapons');
        assert.equal(d.insight.element, el);
        assert.ok(d.insight.spells[1].length, `${id}: rank 1 teaches something`);
        assert.ok(!d.slot && !d.upgradeCosts, `${id}: not held, not upgraded`);
    }
    // nothing asks for an Insight as an upgrade material any more
    for (const d of Object.values(I)) for (const c of Object.values(d.upgradeCosts || {})) {
        for (const m of Object.keys(c.materials || {})) assert.ok(!X.elementOfInsight(m), `${d.id} upgrades with ${m}`);
    }
});

test('reading raises the rank one at a time: that rank\'s spells, the old weapon\'s attack at that level, and corruption that grows with the rank', () => {
    const c = scholar();
    const atk0 = StatCalculator.calculate(c).attack.wind;
    let r = read(c, 'wind');
    assert.ok(r.success, r.message);
    assert.equal(X.rankOf(c, 'wind'), 1);
    assert.ok(c.abilities.some(a => a.id === 'gust' && a.source === 'insight'));
    assert.equal(StatCalculator.calculate(c).attack.wind - atk0, 5, 'rank 1: +5 wind, as the Insight held at level 1');
    read(c, 'wind'); read(c, 'wind');
    assert.deepEqual(c.abilities.filter(a => a.source === 'insight').map(a => a.id), ['gust', 'downwind', 'tempest']);
    assert.equal(StatCalculator.calculate(c).attack.wind - atk0, 11, 'rank 3: 5 + 3 + 3');
    assert.deepEqual(c.state.insightLog.map(e => e.rank), [1, 2, 3]);
    assert.deepEqual(c.state.insightLog.map(e => e.corruption), [5, 6, 7], 'each rank costs more');
    assert.equal(CorruptionSystem.valueOf(c), 18);
    read(c, 'wind'); read(c, 'wind');
    assert.equal(X.rankOf(c, 'wind'), 5);
    r = read(c, 'wind');
    assert.equal(r.success, false, 'no rank 6: the Insight is kept');
    assert.match(r.message, /already knows all/);
    // the spells reach the battle
    const fighter = new CombatantModel(c, 'party');
    assert.ok(['gust', 'downwind', 'tempest'].every(id => fighter.abilities.some(a => a.id === id)));
});

test('a rank asks the attributes the held Insight asked at that level: short of them, nothing is learned and the Insight is kept', () => {
    const c = scholar({ intelligence: 7, attunement: 9 });
    assert.ok(read(c, 'fire').success, 'rank 1 asks Attunement 9, Intelligence 7');
    const r = read(c, 'fire');
    assert.equal(r.success, false);
    assert.match(r.message, /Rank 2 asks/);
    assert.equal(X.rankOf(c, 'fire'), 1);
});

test('the enemy casters hold no Insight: they know ranks, deeper each act, and their attack does not change for it', () => {
    for (const [id, d] of Object.entries(E)) {
        for (const item of Object.values(d.equipment || {})) assert.ok(!X.elementOfInsight(item), `${id} holds ${item}`);
    }
    const casters = Object.entries(E).filter(([, d]) => d.insights).map(([id]) => id).sort();
    assert.deepEqual(casters, ['ANCIENT_CULTIST', 'MAGIC_ADDICT', 'MIRAGEWRIGHT', 'RIME_HERMIT', 'SCORCHED_VAGRANT']);   // (the Rime Hermit: the snow's caster)
    const saved = gameState.milestones;
    try {
        const make = (milestones) => {
            gameState.milestones = milestones;
            const e = quiet(() => EntityFactory.create('SCORCHED_VAGRANT', 4));
            const atk = StatCalculator.calculate(e).attack.fire;
            ActSystem.scaleEnemyInsights(e);
            return { e, atk, after: StatCalculator.calculate(e).attack.fire };
        };
        const a1 = make([]);
        assert.deepEqual(a1.e.state.insights, { fire: 1 });
        assert.ok(a1.e.abilities.some(a => a.id === 'fireball'));
        assert.ok(!a1.e.abilities.some(a => a.id === 'meteor_shower'));
        assert.equal(a1.after, a1.atk, 'ranks add no attack to an enemy');
        const a2 = make(['act2']);
        assert.deepEqual(a2.e.state.insights, { fire: 2 });
        const a3 = make(['act2', 'act3']);
        assert.deepEqual(a3.e.state.insights, { fire: 3 });
        assert.ok(a3.e.abilities.some(a => a.id === 'meteor_shower'), 'act III: rank 3, and its Meteor Shower');
    } finally { gameState.milestones = saved; }
});

test('the Scholar and the Hermit start knowing their Insight, at no corruption, with nothing in hand', async () => {
    const src = (await import('node:fs')).readFileSync(new URL('../../frontend/src/screens/characterCreator/characterCreatorLogic.js', import.meta.url), 'utf8');
    assert.ok(!/insight_of_/.test(src), 'no Insight is equipped at the start');
    assert.match(src, /insights: \{ arcane: 1 \}/);
    assert.match(src, /insights: \{ earth: 1 \}/);
    const hermit = quiet(() => EntityFactory.create('HUMANOID', { insights: { earth: 1 } }));
    assert.ok(hermit.abilities.some(a => a.id === 'vine_lash'));
    assert.equal(CorruptionSystem.valueOf(hermit), 0);
});

test('an old save: a held Insight becomes its rank (no corruption), and one carried at level n becomes n Insights to read', async () => {
    const { SaveManager } = await import('../../frontend/src/engine/saveManager.js');
    const hero = quiet(() => EntityFactory.create('HUMANOID', { name: 'Old Save' }));
    const keep = { members: gameState.party.members, inventory: gameState.party.inventory, seed: gameState.seed };
    if (gameState.seed === undefined || gameState.seed === null) gameState.seed = 1234;
    gameState.party.members = [hero];
    gameState.party.inventory = [];
    try {
        const save = JSON.parse(JSON.stringify(quiet(() => SaveManager.createSnapshot())));
        save.saveVersion = 2;
        const m = save.data.party.members[0];
        delete m.insights;
        m.equipment.mainHand = { defId: 'insight_of_fire', qty: 1, level: 3 };
        save.data.party.inventory = [{ defId: 'insight_of_wind', qty: 1, level: 2 }, { defId: 'insight_of_wind', qty: 1, level: 1 }, { defId: 'healing_herb', qty: 2, level: 1 }];
        quiet(() => SaveManager.applySnapshot(save));
        const loaded = gameState.party.members[0];
        assert.deepEqual(loaded.state.insights, { fire: 3 });
        assert.equal(loaded.state.equipment.mainHand, null);
        assert.ok(loaded.abilities.some(a => a.id === 'meteor_shower'));
        assert.equal(CorruptionSystem.valueOf(loaded), 0, 'no corruption for what they already had');
        const wind = gameState.party.inventory.filter(i => i.defId === 'insight_of_wind');
        assert.equal(wind.reduce((n, i) => n + i.qty, 0), 3, '2 + 1');
        assert.ok(gameState.party.inventory.some(i => i.defId === 'healing_herb' && i.qty === 2), 'everything else as it was');
    } finally { gameState.party.members = keep.members; gameState.party.inventory = keep.inventory; gameState.seed = keep.seed; }
});
