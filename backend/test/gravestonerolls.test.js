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

test('the Disturbing Sight never calls the man mad before he proves it, and the scarecrow is never called cursed', () => {
    const text = (enc) => Object.values(enc.stages).flatMap(s => [s.text, ...s.decisions.flatMap(d => [d.text, d.customActionText])]).filter(Boolean).join('\n');
    const sight = text(encounterDefinitions.a_disturbing_sight);
    assert.ok(!/madman|lunatic|insane|delusion|lost his mind/i.test(sight), 'no label for the man');
    const crow = text(encounterDefinitions.peculiar_scarecrow);
    assert.ok(!/cursed|haunted|possessed|demon|evil/i.test(crow));
});
