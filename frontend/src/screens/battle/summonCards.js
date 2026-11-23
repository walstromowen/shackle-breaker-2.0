// frontend/src/screens/battle/summonCards.js: when a familiar's card (battle/summons.js) comes to the top of its caster's.
//
// A familiar's card sits under its caster's, greyed out, its edge showing below and to the side. It shuffles to the top, in full colour, while it is
// the thing that just happened: when it is summoned, when its health, stamina or insight change, when a status lands on it or leaves it, when it acts
// or is targeted (in the animation playing). ATTENTION_MS after the last of those, it slides back under. `progress` eases between 0 (under, grey)
// and 1 (on top) so the shuffle is seen, not a jump.

export const ATTENTION_MS = 2500;
export const SHUFFLE_SPEED = 6;   // of progress a second

const snapshot = (fam) => ({ hp: fam.hp, stamina: fam.stamina, insight: fam.insight, statuses: (fam.statusEffects || []).map(s => `${s.id}:${s.stacks || 1}`).join(',') });

/**
 * Notes what happened to a familiar since the last frame and eases its card. `memo` is a WeakMap kept by the caller; `anim` the battle's
 * active animation (or null); `dt` seconds since the last frame. Returns { onTop, progress } (onTop: draw it over its caster's card).
 */
export function familiarCard(memo, fam, now, anim, dt) {
    const snap = snapshot(fam);
    let m = memo.get(fam);
    if (!m) { m = { snap, at: now, progress: 0 }; memo.set(fam, m); }   // just summoned: it shows itself
    const changed = ['hp', 'stamina', 'insight', 'statuses'].some(k => m.snap[k] !== snap[k]);
    const involved = !!anim && (anim.actor === fam || (Array.isArray(anim.targets) && anim.targets.includes(fam)));
    if (changed || involved) m.at = now;
    m.snap = snap;
    const want = now - m.at < ATTENTION_MS ? 1 : 0;
    const step = Math.max(0, dt || 0) * SHUFFLE_SPEED;
    m.progress = want > m.progress ? Math.min(want, m.progress + step) : Math.max(want, m.progress - step);
    return { onTop: m.progress > 0.5, progress: m.progress };
}
