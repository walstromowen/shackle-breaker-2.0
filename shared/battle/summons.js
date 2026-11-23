// shared/battle/summons.js: summoned familiars and shapeshifts in battle. Browser-free.
//
// The field holds three fighters a side, and a summon must not crowd it, so nothing summoned takes a slot:
//
//   FAMILIARS (an ability effect { type: 'summon', familiar: true, entityId, levelScale, hpShare }: Raise Skeleton)
//     The creature stands beside its caster, smaller, with a health bar of its own (hpShare of the caster's max health). Right after each of the
//     caster's turns it acts by itself, at whoever the caster last struck (or anyone on the other side), with no menu: in a shared fight every
//     screen rolls the same, so nobody waits on it. It may step in front of a single blow meant for its caster (GUARD_CHANCE). One summon per
//     combatant: summoning again replaces the one it has (the old crumbles, a fresh one rises). It crumbles when it is destroyed, when its caster
//     falls, or when the fight ends;
//     it is never anyone's kill, never in the line-up, never saved.
//
//   FORMS (an ability effect { type: 'transform', form, duration }: Bear Form)
//     The caster becomes the form in its own slot: the form's status (its stats) for `duration` turns, the form's moves instead of its own, and a
//     share of its health back as it changes. When the status runs out it turns back (revertExpiredForms, at the start of each round), its own
//     moves returned. Only the battle's copy of the character changes: nothing about the character itself.
import { EntityFactory } from '../characters/entityFactory.js';
import { CombatantModel } from './combatantModel.js';
import { AbilityFactory } from '../abilities/abilityFactory.js';
import { StatusEffectFactory } from '../abilities/statusEffectFactory.js';
import { rng } from '../core/random.js';
import { levelOf } from './combatCalculator.js';

export const GUARD_CHANCE = 0.35;

export const FORMS = {
    // `sprite`: the form's battle sheet (the BEAR's), drawn instead of the caster once it has art; until then the caster, tinted (BattleCombatantRenderer)
    bear: { status: 'bear_form', abilities: ['claw', 'bite', 'pounce', 'rampage', 'rest'], heal: 0.25, name: 'a great bear', sprite: 'bearPortrait' }
};

const foesOf = (state, c) => (c.team === 'party' ? state.activeEnemies : state.activeParty);

/** A living familiar of this combatant, or null. */
export const familiarOf = (c) => (c && c._familiar && !c._familiar.isDead() ? c._familiar : null);

/** Every living familiar on the field (for drawing them). */
export function livingFamiliars(state) {
    return [...(state.activeParty || []), ...(state.activeEnemies || [])].map(familiarOf).filter(Boolean);
}

/**
 * Casts a familiar summon. Returns { message, summoned: true }. One summon per combatant: one it already has crumbles and the new one takes its
 * place, fresh. `pay()` pays the ability's cost.
 */
export function summonFamiliar(state, caster, eff, pay) {
    const had = familiarOf(caster);
    if (had) {
        had.originalEntity.hp = 0;
        caster._familiar = null;
    }
    pay();
    const level = Math.max(1, Math.round(levelOf(caster) * (eff.levelScale || 1)));
    const entity = EntityFactory.create(eff.entityId, { level });
    const want = Math.max(10, Math.round((caster.maxHp || 40) * (eff.hpShare || 0.4)));
    const bs = entity.state.baseStats;
    bs.maxHpMultiplier = (bs.maxHpMultiplier || 1) * want / Math.max(1, entity.maxHp);
    entity.hp = entity.maxHp;
    const fam = new CombatantModel(entity, caster.team);
    fam.isFamiliar = true;
    fam.familiarOf = caster;
    fam.hasEnteredBattle = true;
    caster._familiar = fam;
    return { message: had ? `${caster.name} lets ${had.name} fall and raises a fresh ${fam.name} from the dark!` : `${caster.name} raises ${fam.name} from the dark to fight at their side!`, summoned: true };
}

/** The familiar's turn right after its caster's: { actor, action, target } to execute, or null. `bagOf(c)` is the turn manager's. */
export function familiarTurn(state, owner, bagOf) {
    const fam = familiarOf(owner);
    if (!fam || owner.isDead()) return null;
    const foes = foesOf(state, owner).filter(c => c && !c.isDead());
    if (!foes.length) return null;
    const target = owner._lastTarget && foes.includes(owner._lastTarget) ? owner._lastTarget : foes[Math.floor(rng() * foes.length) % foes.length];
    const strikes = fam.abilities.filter(a => a.id !== 'rest' && a.canPayCost(fam, bagOf(fam)) && (a.targeting?.scope === 'enemy')
        && ((a.config?.effects || []).some(e => e.type === 'damage')));
    if (!strikes.length) {
        const rest = fam.abilities.find(a => a.id === 'rest') || AbilityFactory.createAbilities(['rest'])[0];
        return { actor: fam, action: rest, target: fam };
    }
    return { actor: fam, action: strikes[Math.floor(rng() * strikes.length) % strikes.length], target };
}

/** A single blow at a caster may be taken by its familiar instead: the familiar, or null. */
export function guardFor(target, attacker) {
    const fam = familiarOf(target);
    if (!fam || !attacker || attacker.team === target.team || attacker.isFamiliar) return null;
    return rng() < GUARD_CHANCE ? fam : null;
}

/** A combatant is gone: if it was a familiar, its caster loses it; if it had one, the familiar crumbles too. Returns the messages to tell. */
export function onFallen(state, fallen) {
    const out = [];
    if (fallen.isFamiliar) {
        if (fallen.familiarOf && fallen.familiarOf._familiar === fallen) fallen.familiarOf._familiar = null;
        out.push(`${fallen.name} crumbles back into the dark.`);
        return out;
    }
    const fam = familiarOf(fallen);
    if (fam) {
        fam.originalEntity.hp = 0;
        fallen._familiar = null;
        out.push(`With ${fallen.name} fallen, ${fam.name} crumbles back into the dark.`);
    }
    return out;
}

/** Casts a shapeshift. Returns the message. `pay()` pays the ability's cost. */
export function transform(caster, eff, pay) {
    const form = FORMS[eff.form];
    if (!form) return `${caster.name} strains, but nothing changes.`;
    pay();
    if (!caster._form) caster._formerAbilities = caster.abilities;
    caster._form = eff.form;
    caster.abilities = AbilityFactory.createAbilities(form.abilities);
    const had = (caster.statusEffects || []).find(s => s.id === form.status);
    if (had && typeof caster.removeStatusEffect === 'function') caster.removeStatusEffect(form.status);
    const st = StatusEffectFactory.createEffect(form.status, eff.duration || 4, caster);
    if (st) caster.applyStatusEffect(st);
    if (form.heal) caster.originalEntity.hp = Math.min(caster.maxHp, caster.hp + Math.round(caster.maxHp * form.heal));
    return `${caster.name} shifts into ${form.name}!`;
}

/** Anyone whose form has run out turns back, their own moves returned. Returns the messages to tell. */
export function revertExpiredForms(state) {
    const out = [];
    for (const c of [...(state.activeParty || []), ...(state.activeEnemies || []), ...(state.partyRoster || []), ...(state.enemyRoster || [])]) {
        if (!c || !c._form) continue;
        const form = FORMS[c._form];
        if (form && (c.statusEffects || []).some(s => s.id === form.status) && !c.isDead()) continue;
        c.abilities = c._formerAbilities || c.abilities;
        delete c._formerAbilities;
        delete c._form;
        if (!c.isDead()) out.push(`${c.name} turns back into themselves.`);
    }
    return [...new Set(out)];
}
