/**
 * ui/narration.js
 *
 * The pacing of an encounter's text, in ONE place, shared by EncounterController (what a click / key may do right now) and
 * EncounterRenderer (what is on screen right now). They must agree to the millisecond, so neither keeps its own numbers.
 *
 * The text is told like the opening of a story: word by word, each word rising out of the dark, with the pause a narrator would
 * make at a comma, a full stop, an ellipsis or a new paragraph. Only after the last word has had time to sink in do the choices
 * appear, one after another. Nothing can be skipped by clicking: the player has to HOLD (see HOLD_TO_SKIP).
 *
 * Times are seconds on the controller's `textTimer`. A stage's words start at TEXT_START; a new stage begins the timer BEAT
 * seconds earlier, so there is a moment of darkness before its first word.
 */
export const NARRATION = {
    TEXT_START: 6.0,          // textTimer value at which the first word begins (the first stage plays its title / columns intro before it)
    BEAT: 1.0,                // darkness between a stage change and its first word
    WORD_FADE: 1.1,           // how long one word takes to rise out of the dark
    WORD_RISE: 9,             // px a word travels upward while it appears
    EMBER_GLOW: 1.6,          // how long a fresh word keeps its warm ember tint

    BASE: 0.16,               // seconds before the next word, plus
    PER_CHAR: 0.011,          //   this much per letter of the word just shown
    PAUSE: {
        comma: 0.30,          // , ; :
        dash: 0.55,           // a dash
        sentence: 0.85,       // . ! ?
        ellipsis: 1.10,       // ... or the single character
        paragraph: 1.40       // a blank line between paragraphs (added to the sentence pause)
    },

    DWELL: 1.4,               // silence after the last word before the first choice begins to appear
    DECISION_FADE: 1.5,       // one choice fading in
    DECISION_STAGGER: 0.7,    // gap between one choice starting and the next
    DECISION_READY: 0.85,     // a choice can be picked once it is this visible

    HOLD_TO_SKIP: 0.8,        // seconds the button / Enter / Space must be held to skip ahead
    ACTION_PADDING: { min: 1.4, max: 3.2, perChar: 0.03 }   // a short rest after a typed result message before the story goes on
};

/** The timer value a new stage / message starts at (a beat of darkness, then the words). */
export const STAGE_START_TIMER = NARRATION.TEXT_START - NARRATION.BEAT;

const PLAN_CACHE = new Map();

/**
 * The reveal schedule of a text: `starts[i]` is when word i begins (seconds after TEXT_START), `duration` is when the last word has
 * finished appearing. Words are counted exactly as the renderer lays them out: paragraphs split at "\n", words split at spaces.
 */
export function narrationPlan(text) {
    const key = String(text || '');
    let plan = PLAN_CACHE.get(key);
    if (plan) return plan;

    const starts = [];
    let t = 0;
    const paragraphs = key.split('\n');
    paragraphs.forEach((paragraph, p) => {
        const words = paragraph.split(' ').filter(Boolean);
        words.forEach((word, w) => {
            starts.push(t);
            t += NARRATION.BASE + NARRATION.PER_CHAR * word.length;
            const last = w === words.length - 1;
            if (/(\.\.\.|…)["'”’)\]]*$/.test(word)) t += NARRATION.PAUSE.ellipsis;
            else if (/[.!?]["'”’)\]]*$/.test(word)) t += NARRATION.PAUSE.sentence;
            else if (/[—–-]$/.test(word)) t += NARRATION.PAUSE.dash;
            else if (/[,;:]["'”’)\]]*$/.test(word)) t += NARRATION.PAUSE.comma;
            if (last && p < paragraphs.length - 1) t += NARRATION.PAUSE.paragraph;
        });
    });

    const lastStart = starts.length ? starts[starts.length - 1] : 0;
    plan = { starts, duration: starts.length ? lastStart + NARRATION.WORD_FADE * 0.6 : 0 };
    if (PLAN_CACHE.size > 200) PLAN_CACHE.clear();
    PLAN_CACHE.set(key, plan);
    return plan;
}

/** textTimer value at which the last word of `text` has appeared. */
export function textEndTimer(text) {
    return NARRATION.TEXT_START + narrationPlan(text).duration;
}

/** textTimer value at which the first choice starts to appear. */
export function decisionsStartTimer(text) {
    return textEndTimer(text) + NARRATION.DWELL;
}

/** How visible choice number `index` is (0..1, eased) at `timer`. */
export function decisionAlpha(timer, text, index) {
    const start = decisionsStartTimer(text) + index * NARRATION.DECISION_STAGGER;
    const raw = Math.max(0, Math.min(1, (timer - start) / NARRATION.DECISION_FADE));
    return raw * raw * (3 - 2 * raw);
}

/** textTimer value at which every one of `count` choices is fully visible. */
export function decisionsDoneTimer(text, count) {
    return decisionsStartTimer(text) + Math.max(0, count - 1) * NARRATION.DECISION_STAGGER + NARRATION.DECISION_FADE;
}

/** The rest after a typed result message ("Dusk falls as you rest...") before the story moves on. */
export function actionPadding(text) {
    const p = NARRATION.ACTION_PADDING;
    return Math.max(p.min, Math.min(p.max, String(text || '').length * p.perChar));
}
