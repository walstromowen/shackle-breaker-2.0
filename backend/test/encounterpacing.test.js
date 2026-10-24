// backend/test/encounterpacing.test.js: `npm test`. Encounter dialogue is told in small pieces: a stage is one sentence, two at most, and a longer beat runs over several
// stages joined by a "Continue." button. Every stage still leads somewhere, and nothing points at a stage that is not there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';

const sentences = (t) => t.split(/(?<=[.!?]["]?)\s+(?=["{A-Z])/).length;
const targets = (o, acc = []) => {
    if (Array.isArray(o)) o.forEach(x => targets(x, acc));
    else if (o && typeof o === 'object') {
        if (o.type === 'ADVANCE_STAGE' && o.payload) acc.push(o.payload.stageId);
        Object.values(o).forEach(v => targets(v, acc));
    }
    return acc;
};

test('every stage of every encounter is one sentence, or two short ones', () => {
    for (const [id, enc] of Object.entries(encounterDefinitions)) {
        for (const [sid, s] of Object.entries(enc.stages)) {
            assert.ok(sentences(s.text) <= 2, `${id}.${sid}: ${sentences(s.text)} sentences`);
            assert.ok(s.text.length <= 300, `${id}.${sid}: ${s.text.length} characters`);
        }
    }
});

test('every stage has a button, and every stage a button leads to exists', () => {
    for (const [id, enc] of Object.entries(encounterDefinitions)) {
        assert.ok(enc.stages[enc.initialStage], `${id}: no first stage`);
        for (const [sid, s] of Object.entries(enc.stages)) {
            assert.ok(s.decisions && s.decisions.length, `${id}.${sid}: no way on`);
            for (const t of targets(s.decisions)) assert.ok(enc.stages[t], `${id}.${sid} -> missing ${t}`);
        }
    }
});

test('the first piece of a beat carries its sound and effect; the pieces after it only continue', () => {
    for (const [id, enc] of Object.entries(encounterDefinitions)) {
        for (const [sid, s] of Object.entries(enc.stages)) {
            const m = sid.match(/^(.*)_(\d+)$/);
            if (!m || !enc.stages[m[1]]) continue;   // not a continuation piece
            assert.equal(s.effect, undefined, `${id}.${sid} repeats the effect`);
            assert.equal(s.sfx, undefined, `${id}.${sid} repeats the sound`);
        }
    }
});
