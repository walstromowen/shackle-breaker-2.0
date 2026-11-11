// shared/story/encounterRolls.js: what an attribute adds to an encounter's skill check (a d20 roll against the decision's threshold). Browser-free.
// The one place the rule lives: the roll itself (EncounterLogic.calculateRoll), the encounter screen's bonuses, the attribute help cards and the
// level-up screen all ask this, so they can never disagree.
//
//   attribute bonus   floor((attribute - 10) / 3): +1 at 13, +2 at 16, +3 at 19 ...; below 10 it is negative (-1 at 7, -2 at 4)
//   Easy and Normal   a negative attribute bonus counts as 0 (a low attribute never makes a roll worse)
//   difficulty        then the difficulty's own roll bonus (DIFFICULTY_MODIFIERS: Easy +2, Normal 0, Hard -2, Nightmare -3) is added
//   Nightmare         a total that is still above 0 is halved, rounded down
// The attribute is the character's own points (what the level-up screen raises), not gear or traits.
import { DIFFICULTY_MODIFIERS } from '../core/constants.js';

/** The raw attribute bonus, before the difficulty: floor((value - 10) / 3). */
export function attributeRollBonus(value) {
    return Math.floor(((Number(value) || 0) - 10) / 3);
}

/** The modifier an attribute of `value` adds to a d20 skill check on `difficulty`. `attribute` 'none' (a check no attribute helps) adds only the difficulty's. */
export function rollModifier(value, difficulty = 'normal', { attribute = true } = {}) {
    const diff = DIFFICULTY_MODIFIERS[difficulty] ? difficulty : 'normal';
    const rollBonus = (DIFFICULTY_MODIFIERS[diff] && DIFFICULTY_MODIFIERS[diff].rollBonus) || 0;
    let attr = attribute ? attributeRollBonus(value) : 0;
    if (diff === 'easy' || diff === 'normal') attr = Math.max(0, attr);
    let mod = attr + rollBonus;
    if (diff === 'nightmare' && mod > 0) mod = Math.floor(mod / 2);
    return mod;
}

/** '+2', '0', '-1' */
export const formatModifier = (mod) => (mod > 0 ? `+${mod}` : `${mod}`);

/** The rule in words, for the help cards. */
export function rollRuleText(difficulty = 'normal') {
    const diff = DIFFICULTY_MODIFIERS[difficulty] ? difficulty : 'normal';
    const rb = (DIFFICULTY_MODIFIERS[diff] && DIFFICULTY_MODIFIERS[diff].rollBonus) || 0;
    const name = diff.charAt(0).toUpperCase() + diff.slice(1);
    const low = diff === 'easy' || diff === 'normal' ? 'Below 10 costs nothing on this difficulty.' : 'Below 10 takes away (-1 from 7 to 9, -2 from 4 to 6).';
    const tail = diff === 'nightmare' ? ' A total above 0 is then halved.' : '';
    return `Skill checks roll a d20 plus +1 per 3 points above 10 (13, 16, 19). ${low} ${name} adds ${formatModifier(rb)}.${tail} Only your own points count, not gear or traits.`;
}
