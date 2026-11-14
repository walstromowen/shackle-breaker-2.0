// backend/test/encountertraits.test.js: `npm test`. The encounter moments that sometimes teach a trait (shared/story/encounterTraits.js), the chance
// on ADD_TRAIT, and the bound-and-lived Claustrophobic from battle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { encounterDefinitions as E, MISSING_TRAIT_STAGES } from '../../shared/story/encounterDefinitions.js';
import { ENCOUNTER_TRAITS } from '../../shared/story/encounterTraits.js';
import { TRAIT_DEFINITIONS } from '../../shared/abilities/traitDefinitions.js';
import { SCAR_TRAITS, traitRewardsFor } from '../../shared/abilities/abilityTraits.js';
import { AbilityDefinitions as A } from '../../shared/abilities/abilityDefinitions.js';
import { EntityFactory } from '../../shared/characters/entityFactory.js';
import { EncounterLogic } from '../../frontend/src/screens/encounter/encounterLogic.js';

const quiet = (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };
const all = (o, acc = []) => { if (Array.isArray(o)) o.forEach(x => all(x, acc)); else if (o && typeof o === 'object') { if (o.type) acc.push(o); Object.values(o).forEach(v => all(v, acc)); } return acc; };

test('every moment is a real stage, teaches a real trait, rarely, and every choice there carries it', () => {
    assert.deepEqual(MISSING_TRAIT_STAGES, []);
    const good = new Set(), bad = new Set();
    for (const [where, traits] of Object.entries(ENCOUNTER_TRAITS)) {
        const [enc, stage] = where.split('.');
        for (const [id, chance, why] of traits) {
            assert.ok(TRAIT_DEFINITIONS[id], `${where}: ${id} is a trait`);
            assert.ok(chance > 0 && chance <= 0.3, `${where}: ${chance} is rare`);
            assert.ok(why && why.length > 3, `${where}: says why`);
            (SCAR_TRAITS.includes(id) ? bad : good).add(id);
            for (const d of E[enc].stages[stage].decisions) {
                if (d.type === 'switch_character') continue;
                const adds = all([d.outcomes, d.successOutcomes, d.failureOutcomes]).filter(r => r.type === 'ADD_TRAIT' && r.payload.traitId === id);
                assert.ok(adds.length && adds.every(r => r.payload.chance === chance), `${where}: "${d.text}" carries ${id}`);
            }
        }
    }
    assert.ok(good.size >= 10 && bad.size >= 5, `${good.size} good, ${bad.size} bad`);
    // Claustrophobic and Perfectionist, once only from the obelisk, now have places of their own
    for (const id of ['claustrophobic', 'perfectionist']) assert.ok(good.has(id), id);
});

test('a choice two stages share is not given the other stage\'s trait', () => {
    // the carriage's herd fight is one array of choices used by several stages: none of them is listed, none carries a trait
    for (const s of ['steeds', 'strongbox_noise', 'bone_snap', 'hunt']) assert.ok(!all(E.ruined_carriage.stages[s]).some(r => r.type === 'ADD_TRAIT'), s);
});

test('ADD_TRAIT with a chance: taught on a low roll, not on a high one; never twice', () => {
    const hero = quiet(() => EntityFactory.create('HUMANOID', { name: 'Aldric', traits: [] }));
    gameState.party.members = [hero];
    const model = { context: {}, updateContext() {} };
    const add = { type: 'ADD_TRAIT', payload: { traitId: 'stealthy', target: 'active_character', chance: 0.25 } };
    const roll = (v) => { const r = Math.random; Math.random = () => v; try { return quiet(() => EncounterLogic.resolveResults([add], model, null)); } finally { Math.random = r; } };
    roll(0.9);
    assert.ok(!hero.traits.includes('stealthy'), 'a high roll teaches nothing');
    roll(0.1);
    assert.ok(hero.traits.includes('stealthy'), 'a low roll teaches it');
    roll(0.1);
    assert.equal(hero.traits.filter(t => t === 'stealthy').length, 1);
});

test('in battle: living through being bound (Wrap, a net, Vine Lash) can teach Claustrophobic', () => {
    for (const id of ['wrap', 'item_throw_net', 'vine_lash']) {
        assert.ok(traitRewardsFor(A[id]).some(r => r.id === 'claustrophobic' && r.condition === 'hit_by_ability'), id);
    }
    assert.ok(!traitRewardsFor(A.bite).some(r => r.id === 'claustrophobic'));
});
