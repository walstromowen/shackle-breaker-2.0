// backend/test/shackledchain.test.js: `npm test`. The Shackled questline is short: madmen, magic addicts and the old soldiers on the plains,
// then Darius around level 10. No trips to the dunes or the peaks; a save that was on one of those steps picks up from the legionaries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QuestDefinitions as Q } from '../../shared/story/questDefinitions.js';
import { retireQuests } from '../../shared/story/questSystem.js';
import { STRANGER_CHAIN } from '../../shared/story/encounters/story/hoodedStranger.js';

// the steps after "find him", in the order the Hooded Stranger hands them out
const chain = () => STRANGER_CHAIN.slice(1);

test('the chain: level 4, madmen, magic addicts, the old soldiers, then Darius at level 15 (the end of act 1)', () => {
    assert.deepEqual(chain(), ['shackled1', 'shackled2', 'shackled3', 'shackled7', 'shackled8']);
    for (const cut of ['shackled4', 'shackled5', 'shackled6']) assert.equal(Q[cut], undefined, `${cut} is gone`);
    const targets = chain().flatMap(id => Q[id].objectives.filter(o => o.type === 'kill_enemy').map(o => o.targetId));
    for (const far of ['SAND_STALKER', 'MIRAGEWRIGHT', 'FROZEN_TRAPPER']) assert.ok(!targets.includes(far), `no ${far} hunt`);
    const level = (id) => Q[id].objectives.find(o => o.type === 'party_level').targetLevel;
    assert.deepEqual(chain().map(level), [4, 7, 10, 13, 15]);
    assert.ok(Q.shackled8.objectives.some(o => o.targetId === 'DARIUS_THE_GROVELER'));
    assert.ok(Q.shackled7.rewards.items.some(i => i.id === 'meteorite'), 'the legionaries still give up the meteorite');
});

test('a save on a cut step picks up from the legionaries', () => {
    const state = { party: { members: [] }, inventory: [], quests: { active: { shackled5: { id: 'shackled5', progress: { obj_kill_miragewright: 0 } } }, completed: ['shackled1', 'shackled2', 'shackled3', 'shackled4'], trackedIds: ['shackled5'] } };
    retireQuests(state);
    assert.ok(state.quests.active.shackled7, 'on the legionaries now');
    assert.equal(state.quests.active.shackled5, undefined);
    assert.ok(!state.quests.completed.includes('shackled4'));
    assert.ok(state.quests.trackedIds.includes('shackled7') && !state.quests.trackedIds.includes('shackled5'));
    const done = { party: { members: [] }, inventory: [], quests: { active: { shackled8: { id: 'shackled8', progress: {} } }, completed: ['shackled7'], trackedIds: [] } };
    retireQuests(done);
    assert.deepEqual(Object.keys(done.quests.active), ['shackled8'], 'a save already past them is left alone');
});
