// backend/test/voicelines.test.js: `npm test`. How encounter text is cut into recorded lines (shared/story/voiceLines.js), the same for the
// generation script and the game: narrator vs a character's quoted words, pauses, words shown but never read, and the key a clip is filed under.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { segmentsOf, lineKey, linesOf, VOICED, normalize } from '../../shared/story/voiceLines.js';
import { encounterDefinitions as E } from '../../shared/story/encounterDefinitions.js';

test('a character speaks their quoted words; the narrator reads the rest', () => {
    assert.deepEqual(segmentsOf('mysterious_altar', 'darius_wrath', 'Darius turns around. "Give it to me." "Give it back!"'),
        [{ speaker: 'NARRATOR', text: 'Darius turns around.' }, { speaker: 'DARIUS', text: 'Give it to me. Give it back!' }]);
    assert.equal(segmentsOf('hooded_stranger', 'meet_2', '"So the line broke."')[0].speaker, 'STRANGER');
    assert.equal(segmentsOf('prologue', 'iron', 'You look down at your wrists.')[0].speaker, 'NARRATOR');
});

test('marks: [pause N] is a pause, (( )) and [stage directions] are shown but never read, and "......" is silence', () => {
    assert.deepEqual(segmentsOf('x', 'y', 'The door creaks. [pause 2] Nothing moves. ((not read))'),
        [{ speaker: 'NARRATOR', text: 'The door creaks.' }, { pause: 2 }, { speaker: 'NARRATOR', text: 'Nothing moves.' }]);
    assert.deepEqual(segmentsOf('mysterious_altar', 'darius_pause', '[Deep breathing]'), []);
    assert.deepEqual(segmentsOf('mysterious_altar', 'darius_x', '"......"'), []);
});

test('a clip\'s key changes with the words and the speaker, not with spacing or quote style', () => {
    assert.equal(lineKey('NARRATOR', 'It  was   cold.'), lineKey('NARRATOR', ' It was cold. '));
    assert.equal(normalize('“Hi”'), '"Hi"');
    assert.notEqual(lineKey('NARRATOR', 'It was cold.'), lineKey('NARRATOR', 'It was colder.'));
    assert.notEqual(lineKey('NARRATOR', 'It was cold.'), lineKey('DARIUS', 'It was cold.'));
});

test('the voiced encounters exist and every speaker in them has a voice', () => {
    const voices = JSON.parse(fs.readFileSync(new URL('../../tools/voice/voices.json', import.meta.url), 'utf8')).voices;
    for (const id of Object.keys(VOICED)) {
        assert.ok(E[id], `${id} is an encounter`);
        for (const l of linesOf(id, E[id])) assert.ok(voices[l.speaker], `${l.speaker} has a voice`);
    }
});
