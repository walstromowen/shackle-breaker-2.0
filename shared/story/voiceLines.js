// shared/story/voiceLines.js: how encounter text is cut into voiced lines, and the key a recorded clip is filed under. Shared by the generation
// script (tools/voice/generateVoices.mjs, which records the clips with ElevenLabs) and the game (the encounter screen plays them), so both
// always agree on which clip belongs to which words.
//
// A stage's text becomes a list of segments: the narrator's words, a character's quoted words (`SPEAKERS` says whose), and pauses.
// The script's marks (docs/encounter-script.txt):
//   "words"          a quoted run: the speaker of this stage (SPEAKERS), else the narrator
//   [pause] [pause 3] a pause of about a second / that many seconds
//   (( words ))      shown on screen, never read
//   [Anything else]  a stage direction ("[Deep breathing]"): shown, never read
//                    except on a speaker's screen whose whole text is one direction: that is a sound the speaker makes (Darius's
//                    "[Deep breathing]"), recorded in their voice like a line (voices.json gives the recording its acting)
// Quoted runs with no letters ("......") are silence.

/* Which encounters are voiced (the generation script records only these, so a draft is never paid for), and who speaks the quoted words of
   each stage: a list of [stage id pattern, speaker]. Unquoted words are always the NARRATOR. */
export const VOICED = {
    prologue: [],
    hooded_stranger: [[/./, 'STRANGER']],
    mysterious_altar: [[/^darius_/, 'DARIUS']],
    act_two: [[/^long_dark$/, 'DARIUS']]
};

/* Who speaks the quoted words of a stage (also used by tools/dialogueScript.mjs for the script's NAME: tags) */
export const SPEAKERS = {
    hooded_stranger: [[/./, 'STRANGER']],
    mysterious_altar: [[/^darius_/, 'DARIUS']],
    act_two: [[/^long_dark$/, 'DARIUS']]      // his own words, in the vision of his life
};

export function speakerOf(encounterId, stageId) {
    const rules = SPEAKERS[encounterId] || [];
    const hit = rules.find(([re]) => re.test(stageId || ''));
    return hit ? hit[1] : null;
}

/** The words as they are compared: straight quotes, single spaces, trimmed (a change of spacing or quote style is not a new line). */
export function normalize(text) {
    return String(text || '')
        .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/—/g, ' - ')
        .replace(/\s+/g, ' ').trim();
}

/** The segments of a text: [{ speaker, text }] and [{ pause: seconds }], in order. */
export function segmentsOf(encounterId, stageId, text) {
    const speaker = speakerOf(encounterId, stageId);
    const out = [];
    // a speaker's screen that is nothing but a direction ("[Deep breathing]"): a sound they make, voiced as they are
    const only = String(text || '').trim();
    if (speaker && /^\[[^\]]*\]$/.test(only) && !/^\[\s*pause\b/i.test(only)) return [{ speaker, text: normalize(only) }];
    let t = String(text || '').replace(/\(\([\s\S]*?\)\)/g, ' ');            // shown, not read
    const push = (who, words) => {
        const w = normalize(words);
        if (!/[a-z0-9]/i.test(w)) return;                                      // punctuation only: silence
        const last = out[out.length - 1];
        if (last && last.speaker === who && !last.pause) last.text = normalize(last.text + ' ' + w);
        else out.push({ speaker: who, text: w });
    };
    // split into quoted / unquoted runs, then each run at its bracket marks
    for (const m of t.matchAll(/"([^"]*)"|([^"]+)/g)) {
        const quoted = m[1] !== undefined;
        const who = quoted ? (speaker || 'NARRATOR') : 'NARRATOR';
        const run = quoted ? m[1] : m[2];
        for (const part of run.split(/(\[[^\]]*\])/)) {
            const mark = part.match(/^\[\s*pause(?:\s+([\d.]+))?\s*\]$/i);
            if (mark) { out.push({ pause: Math.min(10, Number(mark[1] || 1)) }); continue; }
            if (/^\[[^\]]*\]$/.test(part)) continue;                           // a stage direction
            push(who, quoted ? `"${part}"` : part);
        }
    }
    // a quoted segment is spoken without its quote marks
    for (const s of out) if (s.text) s.text = normalize(s.text.replace(/"/g, ''));
    return out.filter(s => s.pause || s.text);
}

/** The key a clip is filed under: who says it and the exact words (cyrb53, a small fast string hash; 14 hex digits). */
export function lineKey(speaker, text) {
    const str = `${speaker}|${normalize(text)}`;
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/** Every line of a voiced encounter: [{ encounterId, stageId, speaker, text, key }] (stage texts and the lines choices say when picked). */
export function linesOf(encounterId, encounter) {
    const lines = [];
    for (const [stageId, stage] of Object.entries(encounter.stages || {})) {
        const texts = [stage.text, ...(stage.decisions || []).map(d => d.customActionText)].filter(Boolean);
        for (const text of texts) for (const s of segmentsOf(encounterId, stageId, text)) {
            if (s.text) lines.push({ encounterId, stageId, speaker: s.speaker, text: s.text, key: lineKey(s.speaker, s.text) });
        }
    }
    return lines;
}
