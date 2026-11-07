// backend/test/partyshare.test.js: `npm test`. Who in a party of players an encounter's result is for (EncounterLogic partyMode).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partyMode } from '../../frontend/src/screens/encounter/encounterLogic.js';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';

const resultsOf = (enc) => Object.values(enc.stages || {}).flatMap(st => (st.decisions || []).flatMap(d => [...(d.outcomes || []), ...(d.successOutcomes || []), ...(d.failureOutcomes || [])]).flatMap(o => o.results || []));

test('rewards are split, party-wide things happen to everyone, the rest is the initiator\'s', () => {
    assert.equal(partyMode('AWARD_XP', { amount: 10 }), 'split');
    assert.equal(partyMode('MODIFY_CURRENCY', { amount: 50 }), 'split');
    assert.equal(partyMode('MODIFY_CURRENCY', { amount: -25 }), null, 'a price is the leader\'s');
    assert.equal(partyMode('ROLL_LOOT_TABLE', { lootTableId: 'plains' }), 'split');
    assert.equal(partyMode('GIVE_ITEM', { items: [] }), 'split');
    assert.equal(partyMode('MODIFY_VITALS', { hp: 50, target: 'entire_party' }), 'all');
    assert.equal(partyMode('ADVANCE_TIME', { hours: 12 }), 'all');
    assert.equal(partyMode('MODIFY_VITALS', { hp: -25 }), null, 'a rock on {name} is theirs alone');
    assert.equal(partyMode('MODIFY_CORRUPTION', { amount: 5, target: 'active_character' }), null);
});

test('the exploding and poisoned chests, the altar\'s smoke and light and the obelisk\'s bad traits reach everyone; its good traits do not', () => {
    const chest = resultsOf(encounterDefinitions.treasure_chest);
    assert.ok(chest.some(r => r.type === 'APPLY_STATUS_EFFECT' && r.payload.effectId === 'burn' && partyMode(r.type, r.payload) === 'all'));
    assert.ok(chest.some(r => r.type === 'MODIFY_VITALS' && r.payload.damageType === 'fire' && partyMode(r.type, r.payload) === 'all'));
    assert.ok(chest.some(r => r.type === 'APPLY_STATUS_EFFECT' && r.payload.effectId === 'poison' && partyMode(r.type, r.payload) === 'all'));
    const altar = resultsOf(encounterDefinitions.mysterious_altar).filter(r => r.type === 'MODIFY_VITALS');
    assert.ok(altar.length >= 2 && altar.every(r => partyMode(r.type, r.payload) === 'all'));
    const traits = resultsOf(encounterDefinitions.strange_obelisk).filter(r => r.type === 'ADD_TRAIT');
    assert.ok(traits.some(r => r.payload.traitId === 'clumsy' && partyMode(r.type, r.payload) === 'all'));
    assert.ok(traits.some(r => r.payload.traitId === 'quick' && partyMode(r.type, r.payload) === null));
    const mutt = resultsOf(encounterDefinitions.wounded_mutt);
    assert.ok(mutt.filter(r => r.type === 'APPLY_STATUS_EFFECT').every(r => partyMode(r.type, r.payload) === null), 'the bite is the one who reached out');
});
