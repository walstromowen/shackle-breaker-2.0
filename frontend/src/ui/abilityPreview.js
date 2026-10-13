/**
 * AbilityPreview
 * Computes the stat-scaled output of an ability for display in renderers.
 *
 * Mirrors the "attacker side" of AbilitySystem / CombatCalculator so the UI
 * and combat agree:
 *   damage  = attackStat(damageType) * effect.power
 *
 * It deliberately EXCLUDES everything that depends on the target or on RNG:
 *   - target defense / resistance (applied in CombatCalculator.calculateMitigatedDamage)
 *   - hit roll, crit roll, +/-10% variance
 *   - conditional multipliers (target_hp_below, target_has_tag, ...) -> flagged via `conditional`
 *
 * Place at: ui/abilityPreview.js (display-only helper: no game-state side effects)
 */
export class AbilityPreview {
    /** Width every ability card is drawn at, wherever it appears (shrinks only if its container is narrower). */
    static CARD_WIDTH = 480;

    static getCardWidth(availableWidth) {
        return Math.min(this.CARD_WIDTH, availableWidth);
    }

    /**
     * Full targeting description built from the scopes TargetingResolver actually uses:
     * self, enemy, ally, any, dead_ally, space, all_enemies, all_allies, full_ally_party,
     * everyone, random_enemy, random_ally  (select: single | multiple | row).
     */
    static getTargetText(targeting) {
        if (!targeting) return 'None';
        const scope = targeting.scope || 'enemy';
        const select = targeting.select || 'single';
        const count = targeting.count || 1;

        const nouns = {
            enemy:     ['Enemy', 'Enemies'],
            ally:      ['Ally', 'Allies'],
            dead_ally: ['Fallen Ally', 'Fallen Allies'],
            any:       ['Target', 'Targets']
        };

        if (nouns[scope]) {
            const [one, many] = nouns[scope];
            if (select === 'row') return `${one} Row`;
            if (select === 'multiple') return `${count} ${many}`;
            if (select === 'random') return `Random ${one}`;
            return scope === 'any' ? 'Any Target' : `Single ${one}`;
        }

        const fixed = {
            self:            'Self',
            all_enemies:     'All Enemies',
            all_allies:      'All Allies',
            full_ally_party: 'Entire Party',
            everyone:        'Everyone',
            random_enemy:    'Random Enemy',
            random_ally:     'Random Ally',
            space:           'Empty Space'
        };
        if (fixed[scope]) return fixed[scope];

        // Unknown scope: make it readable rather than printing raw_snake_case
        return scope.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    }

    /** How many different targets are affected: '1', '3', 'All', 'Row' or 'Random'. Null without targeting. */
    static getTargetCount(targeting) {
        if (!targeting) return null;
        const scope = targeting.scope || 'enemy';
        const select = targeting.select || 'single';
        const count = targeting.count || 1;

        if (['all_enemies', 'all_allies', 'full_ally_party', 'everyone'].includes(scope)) return 'All';
        if (scope.startsWith('random_') || select === 'random') return 'Random';
        if (scope === 'self') return '1';
        if (select === 'row') return 'Row';
        if (select === 'multiple') return String(count);
        return '1';
    }

    /** Number of strikes: multihit range ('2-4') or targeting.count on non-"multiple" selections. Null when 1. */
    static getHitCount(ability) {
        if (!ability) return null;
        const mh = ability.multihit;
        if (mh) {
            const min = mh.min || 1;
            const max = mh.max || min;
            if (max > 1) return min === max ? String(max) : `${min}-${max}`;
        }
        const t = ability.targeting;
        if (t && t.select !== 'multiple' && (t.count || 1) > 1) return String(t.count);
        return null;
    }



    /**
     * Returns the primary effect preview for an ability, or null if the
     * ability has no damage/recover effect to show.
     *
     * @param {object} ability   Ability definition or Ability instance (needs .effects, or legacy .power)
     * @param {object|null} actor  CombatantModel / party member that will use it. May be null
     *                           (item / workshop panels with no character): the power multiplier is shown instead.
     * @param {object} [stats]   Optional pre-computed stats (e.g. StatCalculator result).
     *                           When provided it is preferred over actor.getAttack().
     * @returns {{kind:'damage'|'heal', label:string, text:string, amount:number|null,
     *            power:number, damageType:string|null, resource:string, conditional:boolean}|null}
     */
    static getPrimary(ability, actor, stats = null) {
        if (!ability) return null;

        const effects = Array.isArray(ability.effects) ? ability.effects : [];
        const effect = effects.find(e => e.type === 'damage' || e.type === 'recover');

        // Legacy fallback: abilities that only expose a flat `power`
        if (!effect) {
            if (ability.power === undefined) return null;
            return this._damagePreview(
                { power: ability.power, damageType: ability.damageType || 'blunt' },
                actor, stats
            );
        }

        return effect.type === 'damage'
            ? this._damagePreview(effect, actor, stats)
            : this._recoverPreview(effect, actor, stats);
    }

    // --------------------------------------------------------------- hit chance
    /**
     * Effective chance to hit, mirroring CombatCalculator.calculateDamage:
     *   raw    = abilityAccuracy * (attackerAccuracy / max(1, defenderEvasion))
     *   chance = min(0.95, raw)
     *
     * No target is known in the UI, so defender evasion defaults to 100, the same
     * default the calculator uses when a defender has no evasion stat. Pass a real
     * value (e.g. the hovered enemy's evasion) to get a target-specific number.
     *
     * Only abilities with a damage effect make a hit roll, so anything else returns null.
     *
     * @returns {{chance:number, raw:number, capped:boolean, text:string}|null}
     */
    static getHitChance(ability, actor, stats = null, targetEvasion = 100) {
        if (!ability) return null;

        const effects = Array.isArray(ability.effects) ? ability.effects : [];
        const rollsToHit = effects.some(e => e.type === 'damage') ||
            (effects.length === 0 && ability.power !== undefined);
        if (!rollsToHit) return null;

        // AbilitySystem passes def.accuracy straight through; undefined falls back to 1.0
        const abilityAcc = ability.accuracy !== undefined ? ability.accuracy : 1.0;
        const attackerAcc = this._getAccuracyStat(actor, stats);

        const raw = abilityAcc * (attackerAcc / Math.max(1, targetEvasion));
        const chance = Math.max(0, Math.min(0.95, raw));

        return {
            chance,
            raw,
            capped: raw > 0.95,
            text: `${Math.round(chance * 100)}%`
        };
    }

    static _getAccuracyStat(actor, stats) {
        if (stats?.accuracy !== undefined) return stats.accuracy;
        const s = actor?.stats || actor?.baseStats || actor?.attributes || {};
        return s.accuracy ?? 100; // same default as CombatCalculator
    }

    // --------------------------------------------------------------- stat chips
    /**
     * Everything the stat row shows, as plain data: [{ label, value, tone }]
     * tone is 'accent' (damage/heal, drawn in the type color) or 'normal'.
     * Renderers hand this to CanvasUI.layoutChips / drawChipRows so the row wraps
     * instead of running past the edge of the card.
     */
    static getStatChips(ability, actor, stats = null) {
        const chips = [];
        if (!ability) return chips;

        const preview = this.getPrimary(ability, actor, stats);
        if (preview) {
            chips.push({
                label: `${preview.label}:`,
                value: preview.text + (preview.conditional ? '+' : ''),
                tone: 'accent'
            });
        }

        const hit = this.getHitChance(ability, actor, stats);
        if (hit) {
            chips.push({ label: 'Acc:', value: hit.text, tone: 'normal' });
        } else if (ability.accuracy !== undefined) {
            // Non-damage ability with a listed accuracy: show it as authored
            chips.push({ label: 'Acc:', value: `${Math.floor(ability.accuracy * 100)}%`, tone: 'normal' });
        }

        if (ability.speed !== undefined) {
            chips.push({ label: 'Spd:', value: ability.speed.toString(), tone: 'normal' });
        }

        if (ability.range !== undefined) {
            const r = ability.range.toString();
            chips.push({ label: 'Rng:', value: r.charAt(0).toUpperCase() + r.slice(1), tone: 'normal' });
        }

        const targets = this.getTargetCount(ability.targeting);
        if (targets !== null) {
            chips.push({ label: 'Tgts:', value: targets, tone: 'normal' });
        }

        const hits = this.getHitCount(ability);
        if (hits !== null) {
            chips.push({ label: 'Hits:', value: hits, tone: 'normal' });
        }

        return chips;
    }

    // ------------------------------------------------------------------ damage
    static _damagePreview(effect, actor, stats) {
        const type = (effect.damageType || 'blunt').toLowerCase();
        const power = effect.power || 10; // same default as AbilitySystem._handleDamage
        const attackVal = actor ? this._getAttack(actor, stats, type) : 0;

        // No character, or no attack stat for this damage type: a computed "0" would be
        // misleading, so show the raw power multiplier instead.
        if (!(attackVal > 0)) {
            return {
                kind: 'damage',
                label: 'Pwr',
                text: `${power}x`,
                amount: null,
                scaled: false,
                power,
                damageType: type,
                resource: effect.resource || 'hp',
                conditional: !!effect.condition
            };
        }

        const amount = Math.max(0, Math.floor(attackVal * power));

        return {
            kind: 'damage',
            label: 'Dmg',
            text: `${amount}`,
            amount,
            scaled: true,
            power,
            damageType: type,
            resource: effect.resource || 'hp',
            conditional: !!effect.condition
        };
    }

    static _getAttack(actor, stats, type) {
        if (stats?.attack && stats.attack[type] !== undefined) return stats.attack[type] || 0;
        if (typeof actor.getAttack === 'function') return actor.getAttack(type) || 0;
        const s = actor.stats || actor.baseStats || actor.attributes || {};
        return s.attack?.[type] || 0;
    }

    // ----------------------------------------------------------------- recover
    // Mirrors AbilitySystem._handleRecover (before clamping to max resource).
    static _recoverPreview(effect, actor, stats) {
        const resource = effect.resource || 'hp';
        const base = {
            kind: 'heal',
            label: 'Heal',
            power: effect.power,
            damageType: null,
            resource,
            conditional: !!effect.condition
        };

        switch (effect.calculation) {
            case 'flat': {
                const amount = Math.floor(effect.power || 0);
                return { ...base, amount, text: `${amount}` };
            }
            case 'attribute': {
                const attrs = stats?.attributes || actor?.stats?.attributes || null;
                if (!attrs || Object.keys(attrs).length === 0) {
                    const attrName = String(effect.attribute || '').slice(0, 3).toUpperCase();
                    const formula = `${effect.power || 0} + ${effect.scaling || 0}x ${attrName}`;
                    return { ...base, amount: null, scaled: false, text: formula };
                }
                const amount = (effect.power || 0) +
                    Math.floor((attrs[effect.attribute] || 0) * (effect.scaling || 0));
                return { ...base, amount, text: `${amount}` };
            }
            case 'percent': {
                // Depends on the TARGET's max resource, not the user's stats.
                const pct = Math.round((effect.power || 0) * 100);
                return { ...base, amount: null, text: `${pct}% Max ${resource.toUpperCase()}` };
            }
            case 'max':
                return { ...base, amount: null, text: 'Full' };
            default:
                return null;
        }
    }
}