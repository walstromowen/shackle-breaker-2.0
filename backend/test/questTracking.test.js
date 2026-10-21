// backend/test/questTracking.test.js: `npm test`. A quest is tracked on the HUD from the moment it is given, wherever it comes from.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QuestModel, MAX_TRACKED_QUESTS } from '../../shared/models/questModel.js';
import { QuestDefinitions } from '../../shared/data/questDefinitions.js';

const fresh = () => ({ quests: { active: {}, completed: [], trackedIds: [] }, party: { inventory: [], members: [], currency: 0 } });

test('a new quest is tracked automatically', () => {
    const s = fresh();
    assert.ok(QuestModel.startQuest(s, 'shackled1'));
    assert.deepEqual(s.quests.trackedIds, ['shackled1']);
});

test('a save from before the tracker existed (no trackedIds) still works', () => {
    const s = fresh();
    delete s.quests.trackedIds;
    QuestModel.startQuest(s, 'shackled1');
    assert.deepEqual(s.quests.trackedIds, ['shackled1']);
});

test('a quest that is already known is not tracked twice, and a refused start tracks nothing', () => {
    const s = fresh();
    QuestModel.startQuest(s, 'shackled1');
    assert.equal(QuestModel.startQuest(s, 'shackled1'), false);
    assert.equal(QuestModel.startQuest(s, 'no_such_quest'), false);
    assert.deepEqual(s.quests.trackedIds, ['shackled1']);
});

test('the tracker holds three: the quest tracked longest ago makes room', () => {
    const s = fresh();
    const ids = Object.keys(QuestDefinitions).slice(0, MAX_TRACKED_QUESTS + 2);
    assert.ok(ids.length > MAX_TRACKED_QUESTS);
    for (const id of ids) QuestModel.startQuest(s, id);
    assert.equal(s.quests.trackedIds.length, MAX_TRACKED_QUESTS);
    assert.deepEqual(s.quests.trackedIds, ids.slice(-MAX_TRACKED_QUESTS));
});

test('finishing a quest hands its place to the quest it unlocks, instead of pushing another one out', () => {
    const s = fresh();
    const first = 'shackled1', next = QuestDefinitions[first].rewards.quests[0];
    QuestModel.startQuest(s, 'bg_a');          // unknown: refused
    QuestModel.startQuest(s, first);
    const others = Object.keys(QuestDefinitions).filter(id => id !== first && id !== next).slice(0, 2);
    others.forEach(id => QuestModel.startQuest(s, id));
    assert.equal(s.quests.trackedIds.length, MAX_TRACKED_QUESTS);
    for (const obj of QuestDefinitions[first].objectives) QuestModel.updateProgress(s, first, obj.id, obj.amount || 1);
    assert.ok(QuestModel.completeQuest(s, first));
    assert.ok(!s.quests.trackedIds.includes(first));
    assert.ok(s.quests.trackedIds.includes(next), 'the next quest of the chain is tracked');
    for (const id of others) assert.ok(s.quests.trackedIds.includes(id), id + ' stays tracked');
});
