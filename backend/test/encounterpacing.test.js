// backend/test/encounterpacing.test.js: `npm test`. Encounter dialogue is told in small pieces: a stage is a short paragraph (a few lines of speech or narration), and a longer
// beat runs over several stages joined by a "Continue." button. Fragments are not given a click each: tiny pieces are folded together. Every stage still leads somewhere, and nothing points at a stage that is not there.
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

test('every stage of every encounter is a short paragraph', () => {
    for (const [id, enc] of Object.entries(encounterDefinitions)) {
        for (const [sid, s] of Object.entries(enc.stages)) {
            assert.ok(sentences(s.text) <= 6, `${id}.${sid}: ${sentences(s.text)} sentences`);
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

test('no beat is chopped into crumbs: a bare "Continue." stage is never followed by one that would fit beside it', () => {
    const outs = (d) => [...(d.outcomes || []), ...(d.successOutcomes || []), ...(d.failureOutcomes || [])];
    const exempt = new Set(['prologue', 'act_two', 'shackled_betrayal', 'shackled_betrayal_end']);   // told slowly on purpose
    for (const [id, enc] of Object.entries(encounterDefinitions)) {
        if (exempt.has(id)) continue;
        const inbound = {};
        for (const [sid, s] of Object.entries(enc.stages)) for (const t of new Set(targets(s.decisions))) (inbound[t] ||= new Set()).add(sid);
        for (const [sid, s] of Object.entries(enc.stages)) {
            const d = s.decisions[0];
            const bare = s.decisions.length === 1 && !d.customActionText && !d.type && !d.conditions && outs(d).length === 1 && outs(d)[0].results.length === 1 && outs(d)[0].results[0].type === 'ADVANCE_STAGE';
            if (!bare) continue;
            const to = outs(d)[0].results[0].payload.stageId, next = enc.stages[to];
            if (!next || inbound[to].size !== 1 || to === enc.initialStage) continue;
            const same = !next.sfx && !next.effect && next.tone === s.tone && next.bgm === s.bgm && next.displayText === s.displayText && JSON.stringify(next.image) === JSON.stringify(s.image);
            if (!same) continue;
            const joined = s.text.length + 1 + next.text.length;
            assert.ok(joined > 230 || sentences(s.text + ' ' + next.text) > 6, `${id}.${sid} + ${to} could be one stage (${joined} characters)`);
        }
    }
});
