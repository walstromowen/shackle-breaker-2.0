// backend/test/mpnewworld.test.js: `npm test`. A player joining someone's world cannot change its difficulty, cheats or seed (the host's world
// decides them), and a new world started together (Host a World > New World) waits until every player has made a character, then begins.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CREATION_DATA, CharacterCreatorLogic } from '../../frontend/src/screens/characterCreator/characterCreatorLogic.js';
import { multiplayerSession } from '../../frontend/src/engine/multiplayerSession.js';
import { multiplayer } from '../../frontend/src/engine/multiplayerClient.js';

test("a joining player's creator locks difficulty, cheats and seed, and shows the host's values", () => {
    const logic = new CharacterCreatorLogic();
    multiplayerSession.role = 'creating';
    multiplayerSession.pending = { world: { difficulty: 'hard', cheats: true }, spawn: { col: 0, row: 0 } };
    try {
        assert.deepEqual(logic.lockedSteps().sort(), ['cheats', 'difficulty', 'seed']);
        const before = { ...logic.state };
        for (const step of ['difficulty', 'cheats']) { logic.setRowByStep(step); assert.equal(logic.modifyValue(1), false, `${step} cannot change`); }
        assert.equal(logic.state.difficultyIdx, before.difficultyIdx);
        assert.equal(logic.state.cheatsIdx, before.cheatsIdx);
        logic.setRowByStep('seed'); logic.handleAction();
        assert.equal(logic.isEditingSeed, false, 'the seed cannot be typed in');
        assert.equal(logic.hostSetting('difficulty'), CREATION_DATA.DIFFICULTIES.find(d => d.id === 'hard').label);
        assert.equal(logic.hostSetting('cheats'), 'On');
        multiplayerSession.pending = null;   // a new world: not made yet
        assert.equal(logic.hostSetting('difficulty'), "Host's choice");
        // the rest stays the player's own
        logic.setRowByStep('background');
        assert.notEqual(logic.modifyValue(1), undefined);
    } finally { multiplayerSession.role = null; multiplayerSession.pending = null; }
    assert.deepEqual(new CharacterCreatorLogic().lockedSteps(), [], 'nothing is locked in a game of your own (or for the host)');
});

test('a new world begins only when every player in the room has a character', () => {
    const sent = [];
    const realRelay = multiplayer.relay, realRoom = Object.getOwnPropertyDescriptor(multiplayer, 'room'), realYou = multiplayer.you, realIsHost = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(multiplayer), 'isHost');
    multiplayer.relay = (data) => sent.push(data.k);
    Object.defineProperty(multiplayer, 'room', { value: { players: [{ id: 'h', username: 'Host', isHost: true, connected: true }, { id: 'g', username: 'Guest', isHost: false, connected: true }], world: { isNew: true } }, configurable: true, writable: true });
    multiplayer.you = { id: 'h' };
    Object.defineProperty(multiplayer, 'isHost', { get: () => true, configurable: true });
    try {
        multiplayerSession.newWorld = { ready: new Set(), began: false, myParty: null };
        multiplayerSession.role = 'founding';
        multiplayerSession.newWorld.ready.add('h');
        multiplayerSession._checkBegin();
        assert.ok(!sent.includes('begin'), 'the guest is still making a character');
        assert.deepEqual(multiplayerSession.newWorldWaiting().waitingFor, ['Guest']);
        multiplayerSession.role = 'creating';   // (begin itself changes scenes: check only the decision here)
        multiplayerSession._onRelay('g', { k: 'char_ready' });
        assert.ok(sent.includes('begin'), 'everyone is ready: the host says begin');
        assert.equal(multiplayerSession.newWorld.began, true);
    } finally {
        multiplayer.relay = realRelay;
        delete multiplayer.room; if (realRoom) Object.defineProperty(multiplayer, 'room', realRoom);
        multiplayer.you = realYou;
        delete multiplayer.isHost;
        multiplayerSession.newWorld = null; multiplayerSession.role = null;
    }
});
