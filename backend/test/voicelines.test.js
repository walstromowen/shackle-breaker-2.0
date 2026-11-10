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
    assert.deepEqual(segmentsOf('x', 'y', '[Deep breathing]'), [], 'a direction on the narrator\'s screen is not read');
    assert.deepEqual(segmentsOf('mysterious_altar', 'darius_x', 'He turns. [Deep breathing]'), [{ speaker: 'NARRATOR', text: 'He turns.' }], 'nor one among other words');
    assert.deepEqual(segmentsOf('mysterious_altar', 'darius_x', '"......"'), []);
});

test('a clip with word timings shows each word when it is said; the chuckles at the end of Darius\'s lines are on screen too', async () => {
    const n = await import('../../frontend/src/ui/narration.js');
    const text = '"No. No, you are not him. Hm-hm."';
    n.setVoiceTiming(text, [{ text: 'No. No, you are not him. Hm-hm.', dur: 8, w: [0.3, 2.4, 3.5, 3.6, 3.8, 4.1, 7.6] }]);
    const plan = n.narrationPlan(text);
    assert.deepEqual(plan.starts, [0.3, 2.4, 3.5, 3.6, 3.8, 4.1, 7.6], 'the long pause before the second "No," and the chuckle at the end');
    n.setVoiceTiming(text, [{ text: 'No. No, you are not him. Hm-hm.', dur: 8, w: [0.3, 2.4] }]);
    assert.ok(n.narrationPlan(text).starts[1] < 2, 'timings that do not fit the words are ignored: an even pace');
    n.clearVoiceTiming(text);
    const manifest = JSON.parse(fs.readFileSync(new URL('../../frontend/src/assets/audio/voice/manifest.json', import.meta.url), 'utf8'));
    const darius = linesOf('mysterious_altar', E.mysterious_altar).filter(l => l.speaker === 'DARIUS' && !l.text.startsWith('['));
    assert.ok(darius.length >= 7);
    for (const l of darius) {
        const e = manifest[l.key];
        assert.ok(e && Array.isArray(e.w) && e.w.length === l.text.split(/\s+/).length, `"${l.text.slice(0, 30)}" is timed word by word`);
    }
    assert.ok(darius.some(l => / Hm-hm\.$/.test(l.text)) && darius.some(l => / Heh\.\.\. heh\. Heh heh\.$/.test(l.text)), 'his chuckles are written out');
    assert.ok(darius.some(l => /is mine!$/.test(l.text)), 'and his last words before the fight end without one');
});

test('a speaker\'s screen that is only a direction is a sound they make, in their voice: Darius\'s deep breathing has a clip', () => {
    assert.deepEqual(segmentsOf('mysterious_altar', 'darius_pause', '[Deep breathing]'), [{ speaker: 'DARIUS', text: '[Deep breathing]' }]);
    assert.deepEqual(segmentsOf('mysterious_altar', 'darius_pause', '[pause 2]'), [{ pause: 2 }], 'a pause is still a pause');
    const manifest = JSON.parse(fs.readFileSync(new URL('../../frontend/src/assets/audio/voice/manifest.json', import.meta.url), 'utf8'));
    const clip = manifest[lineKey('DARIUS', '[Deep breathing]')];
    assert.ok(clip && fs.existsSync(new URL('../../frontend/src/assets/audio/voice/' + clip.f, import.meta.url)), 'the breathing is recorded');
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

test('with a recording, the words appear as they are said and are done when the voice is', async () => {
    const n = await import('../../frontend/src/ui/narration.js');
    const text = 'Darius turns around. "Give it to me." [Deep breathing]';
    n.setVoiceTiming(text, [{ text: 'Darius turns around.', dur: 1.6 }, { pause: 1 }, { text: 'Give it to me.', dur: 2.0 }]);
    const plan = n.narrationPlan(text);
    assert.equal(plan.voiced, true);
    assert.equal(plan.starts[0], 0);
    assert.equal(plan.starts[3], 2.6, 'his first word comes after the narrator\'s clip and the pause');
    assert.ok(plan.duration >= 4.6, 'not done before the voice is');
    n.clearVoiceTiming(text);
    assert.ok(!n.narrationPlan(text).voiced, 'without it, the usual pace');
    const controller = fs.readFileSync(new URL('../../frontend/src/screens/encounter/encounterController.js', import.meta.url), 'utf8');
    assert.match(controller, /this\.lastText = this\.actionMessage;\s*\r?\n\s*this\._speak\(this\.actionMessage\);/, 'the line a choice says is spoken too');
});
