// backend/test/gravestonerolls.test.js: `npm test`. The Old Gravestone's extra rolls, and the Disturbing Sight / Peculiar Scarecrow telling it as the player sees it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { DIG_SUCCESS, DIG_FAILURE, CAREFUL_DIG } from '../../shared/story/encounters/oldGravestone.js';

const g = encounterDefinitions.old_gravestone;

const outcomes = (d) => [...(d.outcomes || []), ...(d.successOutcomes || []), ...(d.failureOutcomes || [])];
const results = (d) => outcomes(d).flatMap(o => o.results);

test('nothing comes out of the grave without a roll: every way in is a skill check, and only leaving (or switching) is free', () => {
    const ds = g.stages.approach.decisions;
    for (const d of ds) {
        if (d.type === 'skill_check' || d.type === 'switch_character') continue;
        assert.deepEqual(results(d).map(r => r.type), ['END_ENCOUNTER'], `"${d.text}" may only leave`);
    }
    const checks = ds.filter(d => d.type === 'skill_check');
    assert.deepEqual(checks.map(d => d.attribute).sort(), ['attunement', 'strength']);
    // and no choice anywhere hands out loot or a stage of loot without a roll having led there: the loot stages are reached only by rolls
    const lootStages = Object.entries(g.stages).filter(([, st]) => st.decisions.some(d => results(d).some(r => r.type === 'ROLL_LOOT_TABLE'))).map(([id]) => id);
    for (const [id, st] of Object.entries(g.stages)) for (const d of st.decisions) {
        if (d.type === 'skill_check') continue;
        for (const r of results(d)) if (r.type === 'ADVANCE_STAGE') assert.ok(!lootStages.includes(r.payload.stageId), `${id}: "${d.text}" leads to loot without a roll`);
    }
});

test('digging (strength): a success mostly finds the goods but can be empty or stir the dead; a failure mostly wakes them', () => {
    const dig = g.stages.approach.decisions.find(d => d.attribute === 'strength');
    const w = (outs) => Object.fromEntries(outs.map(o => [o.results[0].payload.stageId, o.weight]));
    assert.deepEqual(w(dig.successOutcomes), DIG_SUCCESS);
    assert.deepEqual(w(dig.failureOutcomes), DIG_FAILURE);
    for (const t of [DIG_SUCCESS, DIG_FAILURE]) assert.equal(Object.values(t).reduce((a, b) => a + b, 0), 100);
    assert.ok(DIG_SUCCESS.empty_grave > 0, 'a success is not always a find');
    assert.ok(DIG_SUCCESS.buried_things > DIG_FAILURE.buried_things && DIG_SUCCESS.bones_rise + DIG_SUCCESS.spirit_rises < DIG_FAILURE.bones_rise + DIG_FAILURE.spirit_rises);
});

test('the careful dig (attunement): a success never wakes the dead but can find nothing; a miss costs insight or wakes the spirit', () => {
    const c = g.stages.approach.decisions.find(d => d.attribute === 'attunement');
    assert.ok(c.threshold > g.stages.approach.decisions.find(d => d.attribute === 'strength').threshold, 'harder than plain digging');
    const w = Object.fromEntries(c.successOutcomes.map(o => [o.results[0].payload.stageId, o.weight]));
    assert.deepEqual(w, CAREFUL_DIG);
    assert.ok(!w.bones_rise && !w.spirit_rises && w.empty_grave > 0);
    const miss = c.failureOutcomes.map(o => o.results.map(r => r.type === 'ADVANCE_STAGE' ? r.payload.stageId : r.type).join(','));
    assert.deepEqual(miss.sort(), ['MODIFY_VITALS,listen_failed', 'spirit_rises']);
    assert.ok(!results(g.stages.listen_failed.decisions[0]).some(r => r.type === 'DESTROY_OBJECT'), 'noise only: the stone stays for another try');
});

test('a short grave: no listening stages, no digging deeper', () => {
    for (const gone of ['dig', 'listen_bundle', 'listen_bones', 'listen_spirit', 'listen_hollow', 'listen_coffin', 'deeper_find', 'deeper_nothing']) assert.ok(!g.stages[gone], `${gone} is gone`);
    assert.ok(Object.keys(g.stages).length <= 12);
    assert.equal(g.stages.buried_things.decisions.length, 1);
});

test('the dead can be escaped with a dexterity roll; a miss is the fight', () => {
    const run = g.stages.bones_rise.decisions.find(d => d.type === 'skill_check');
    assert.equal(run.attribute, 'dexterity');
    assert.equal(run.successOutcomes[0].results[0].payload.stageId, 'escaped_the_grave');
    assert.equal(run.failureOutcomes[0].results[0].payload.stageId, 'dragged_back');
    assert.equal(g.stages.dragged_back.decisions[0].outcomes[0].results[0].type, 'START_BATTLE');
});

test('the sealed coffin is a strength check; failing it wakes the dead', () => {
    const c = g.stages.sealed_coffin.decisions[0];
    assert.equal(c.type, 'skill_check');
    assert.equal(c.attribute, 'strength');
    assert.deepEqual(c.failureOutcomes.map(o => o.results[0].payload.stageId).sort(), ['bones_rise', 'spirit_rises']);
    assert.equal(c.successOutcomes[0].results[0].payload.stageId, 'coffin_opened');
});

test('the spirit can be spoken to (attunement): a success lays it to rest and destroys the grave, a failure is the fight', () => {
    const c = g.stages.spirit_rises.decisions.find(d => d.text.startsWith('[ATT]'));
    assert.equal(c.type, 'skill_check');
    assert.equal(c.attribute, 'attunement');
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
