// backend/test/gravestonerolls.test.js: `npm test`. The Old Gravestone's extra rolls, and the Disturbing Sight / Peculiar Scarecrow telling it as the player sees it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';

const g = encounterDefinitions.old_gravestone;
const weightsOf = (outs) => Object.fromEntries(outs.map(o => [o.results[0].payload.stageId, o.weight]));

test('digging has five possible finds, adding up to 100', () => {
    const w = weightsOf(g.stages.dig.decisions[0].outcomes);
    assert.deepEqual(Object.keys(w).sort(), ['bones_rise', 'buried_things', 'empty_grave', 'sealed_coffin', 'spirit_rises']);
    assert.equal(Object.values(w).reduce((a, b) => a + b, 0), 100);
});

test('the buried bundle can be dug deeper for more, or less', () => {
    const d = g.stages.buried_things.decisions.find(x => x.text === 'Dig deeper still.');
    const w = weightsOf(d.outcomes);
    assert.equal(Object.values(w).reduce((a, b) => a + b, 0), 100);
    const rolls = (id) => g.stages[id].decisions[0].outcomes[0].results.find(r => r.type === 'ROLL_LOOT_TABLE').payload.rolls;
    assert.ok(rolls('deeper_find') > rolls('deeper_nothing'));
    assert.equal(rolls('deeper_nothing'), 2);
});

test('the sealed coffin is a strength check; failing it wakes the dead', () => {
    const c = g.stages.sealed_coffin.decisions[0];
    assert.equal(c.type, 'skill_check');
    assert.equal(c.attribute, 'strength');
    assert.deepEqual(Object.keys(weightsOf(c.failureOutcomes)).sort(), ['bones_rise', 'spirit_rises']);
    assert.equal(c.successOutcomes[0].results[0].payload.stageId, 'coffin_opened');
});

test('listening to the ground is an attunement check that shows the dig\'s own odds, and a miss costs insight and cannot be retried', () => {
    const l = g.stages.approach.decisions.find(d => d.text.startsWith('[ATT]'));
    assert.equal(l.type, 'skill_check');
    assert.equal(l.attribute, 'attunement');
    const shown = weightsOf(l.successOutcomes), dug = weightsOf(g.stages.dig.decisions[0].outcomes);
    assert.deepEqual(Object.values(shown).reduce((a, b) => a + b, 0), 100);
    // each thing it can tell you has the same share as the thing it stands for in the dig
    const stands = { listen_bundle: 'buried_things', listen_bones: 'bones_rise', listen_spirit: 'spirit_rises', listen_hollow: 'empty_grave', listen_coffin: 'sealed_coffin' };
    assert.deepEqual(Object.keys(shown).sort(), Object.keys(stands).sort());
    for (const [stage, target] of Object.entries(stands)) {
        assert.equal(shown[stage], dug[target], `${stage} has the share of ${target}`);
        const digs = g.stages[stage].decisions.find(d => d.outcomes[0].results[0].type === 'ADVANCE_STAGE');
        assert.equal(digs.outcomes[0].results[0].payload.stageId, target, `${stage} leads to ${target}`);
        assert.ok(g.stages[stage].decisions.some(d => d.outcomes[0].results[0].type === 'END_ENCOUNTER'), `${stage} lets you walk away`);
    }
    const fail = l.failureOutcomes[0].results.map(r => r.type);
    assert.deepEqual(fail, ['SET_CONTEXT_FLAG', 'MODIFY_VITALS', 'ADVANCE_STAGE']);
    assert.ok(l.conditions.some(c => c.type === 'context_flag_not_set' && c.flagId === 'failed_gravestone_listen'));
    assert.equal(l.failureOutcomes[0].results[0].payload.flagId, 'failed_gravestone_listen');
    // after a miss you can still dig (or go), but not listen again
    const after = g.stages.listen_failed.decisions.map(d => d.text);
    assert.ok(after.includes('Dig it up anyway.') && after.includes('Leave the dead in peace.'));
    assert.ok(!g.stages.listen_failed.decisions.some(d => d.type === 'skill_check'));
});

test('the spirit can be spoken to (attunement): a success lays it to rest and destroys the grave, a failure is the fight', () => {
    const c = g.stages.spirit_rises.decisions.find(d => d.text.startsWith('[ATT]'));
    assert.equal(c.type, 'skill_check');
    assert.equal(c.attribute, 'attunement');
    assert.ok(c.threshold > g.stages.approach.decisions.find(d => d.text.startsWith('[ATT]')).threshold, 'harder than listening');
    assert.equal(c.successOutcomes[0].results[0].payload.stageId, 'spirit_at_rest');
    assert.equal(c.failureOutcomes[0].results[0].payload.stageId, 'spirit_unmoved');
    const rest = g.stages.spirit_at_rest.decisions[0];
    const types = rest.outcomes[0].results.map(r => r.type);
    assert.ok(types.includes('DESTROY_OBJECT') && types.includes('END_ENCOUNTER') && !types.includes('START_BATTLE'));
    assert.ok(rest.corruption < 0, 'a kind act');
    const fight = g.stages.spirit_unmoved.decisions[0].outcomes[0].results;
    assert.deepEqual(fight.map(r => r.type), ['START_BATTLE', 'DESTROY_OBJECT']);
    assert.equal(fight[0].payload.tableId, 'shackled_spirit');
});

test('every stage of the gravestone leads to a stage that exists', () => {
    const outcomes = (d) => [...(d.outcomes || []), ...(d.successOutcomes || []), ...(d.failureOutcomes || [])];
    for (const [id, st] of Object.entries(g.stages)) {
        for (const d of st.decisions) for (const o of outcomes(d)) for (const r of o.results) {
            if (r.type === 'ADVANCE_STAGE') assert.ok(g.stages[r.payload.stageId], `${id} -> ${r.payload.stageId}`);
        }
    }
});

test('the Disturbing Sight never calls the man mad before he proves it, and the scarecrow is never called cursed', () => {
    const text = (enc) => Object.values(enc.stages).flatMap(s => [s.text, ...s.decisions.flatMap(d => [d.text, d.customActionText])]).filter(Boolean).join('\n');
    const sight = text(encounterDefinitions.a_disturbing_sight);
    assert.ok(!/madman|lunatic|insane|delusion|lost his mind/i.test(sight), 'no label for the man');
    const crow = text(encounterDefinitions.peculiar_scarecrow);
    assert.ok(!/cursed|haunted|possessed|demon|evil/i.test(crow));
});
