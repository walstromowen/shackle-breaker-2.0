// backend/test/prologue.test.js: `npm test`. The prologue is a chain of stages; every ADVANCE_STAGE has to land on a stage that exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prologue } from '../../shared/story/encounters/prologue.js';

const targets = (stage) => (stage.decisions || []).flatMap(d => d.outcomes.flatMap(o => o.results))
    .filter(r => r.type === 'ADVANCE_STAGE').map(r => r.payload.stageId);

test('every stage of the prologue leads to a stage that exists, and all of them can be reached', () => {
    const ids = Object.keys(prologue.stages);
    const seen = new Set([prologue.initialStage]);
    const queue = [prologue.initialStage];
    while (queue.length) for (const t of targets(prologue.stages[queue.shift()])) {
        assert.ok(prologue.stages[t], `stage '${t}' exists`);
        if (!seen.has(t)) { seen.add(t); queue.push(t); }
    }
    assert.deepEqual([...seen].sort(), ids.slice().sort(), 'no stage is orphaned');
});

test('after the chain breaks, the player finds out the shackles have no key before the convoy leaves', () => {
    const order = [];
    let id = prologue.initialStage;
    while (id && !order.includes(id)) { order.push(id); id = targets(prologue.stages[id])[0]; }
    assert.ok(order.indexOf('slack') < order.indexOf('no_key'));
    assert.ok(order.indexOf('no_key') < order.indexOf('still'));
    const text = JSON.stringify(prologue.stages.no_key).toLowerCase();
    assert.match(text, /keyhole/);
    assert.match(text, /no key/);
    assert.match(text, /wrong|grown|never forged|no smith/);
    assert.equal(prologue.stages.no_key.tone, 'cold');
});

test('the prologue ends the encounter on its last stage and keeps its silence rule (music resumes afterwards)', () => {
    const last = prologue.stages.awake;
    assert.ok(last.decisions.some(d => d.outcomes.some(o => o.results.some(r => r.type === 'END_ENCOUNTER'))));
    assert.equal(prologue.stages.slack.bgm, 'none');
});
