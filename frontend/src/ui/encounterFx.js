/**
 * ui/encounterFx.js
 *
 * The look of an encounter stage's optional `tone` and `effect` (see the header of story/encounters/story/prologue.js for every stage field).
 *
 *   tone    colours the words as they arrive and the embers. A stage may set one, or the whole encounter may (`tone` on the definition);
 *           a stage can go back to the default with tone: 'warm'.
 *   effect  plays once when the stage opens: a jolt of the screen and / or a flash of colour.
 *             shake    a jolt that lasts and fades            flash    colour that blinks in and fades
 *             swell    colour that rises and falls (a glow)    [r, g, b], peak alpha, seconds
 */
export const TONES = {
    warm:   { word: [232, 160, 84],  ember: [232, 160, 84]  },   // the default: ember orange
    cold:   { word: [176, 214, 196], ember: [112, 232, 168] },   // the cursed green of the prologue
    blood:  { word: [236, 120, 104], ember: [220, 60, 44]   },
    frost:  { word: [190, 220, 248], ember: [150, 200, 255] },
    arcane: { word: [200, 170, 245], ember: [170, 120, 255] },
    gold:   { word: [246, 208, 120], ember: [255, 200, 80]  }
};

export const EFFECTS = {
    snap:       { shake: { amp: 10, dur: 0.7 },  flash: { rgb: [215, 255, 232], peak: 0.85, dur: 0.5 } },   // the prologue's chain
    shake:      { shake: { amp: 7,  dur: 1.5 } },                                                          // a rumble
    jolt:       { shake: { amp: 6,  dur: 0.35 } },                                                         // a start: a snapped twig, a lunge
    blood:      { shake: { amp: 7,  dur: 0.5 },  flash: { rgb: [150, 12, 12],   peak: 0.55, dur: 0.8 } },    // a bite, a blow
    flash:      { flash: { rgb: [255, 255, 255], peak: 0.5,  dur: 1.1 } },                                   // a burst of light
    blast:      { shake: { amp: 12, dur: 0.9 },  flash: { rgb: [255, 190, 110], peak: 0.8,  dur: 0.7 } },    // an explosion
    poison:     { flash: { rgb: [120, 200, 60], peak: 0.4,  dur: 1.6 } },
    glow_blue:  { flash: { rgb: [70, 130, 255], peak: 0.4,  dur: 2.2, swell: true } },
    glow_green: { flash: { rgb: [70, 230, 130], peak: 0.4,  dur: 2.2, swell: true } },
    glow_red:   { flash: { rgb: [225, 40, 30],  peak: 0.4,  dur: 2.2, swell: true } }
};

/** The jolt offset for an effect `age` seconds after its stage opened ({0,0} when there is none). */
export function fxShake(effect, age) {
    const s = EFFECTS[effect]?.shake;
    if (!s || age < 0 || age >= s.dur) return { x: 0, y: 0 };
    const amp = Math.pow(1 - age / s.dur, 2) * s.amp;
    return { x: Math.sin(age * 90) * amp, y: Math.cos(age * 77) * amp };
}

/** The colour wash for an effect `age` seconds after its stage opened, or null: { rgb, alpha }. */
export function fxFlash(effect, age) {
    const f = EFFECTS[effect]?.flash;
    if (!f || age < 0 || age >= f.dur) return null;
    const k = f.swell ? Math.sin(Math.PI * age / f.dur) : Math.pow(1 - age / f.dur, 2);
    return { rgb: f.rgb, alpha: f.peak * k };
}
