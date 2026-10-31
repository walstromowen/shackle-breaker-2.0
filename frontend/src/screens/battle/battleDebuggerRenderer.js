/**
 * screens/battle/battleDebuggerRenderer.js
 *
 * The battle debugger: part of the debug overlay ("~" on any screen, ui/debugOverlay.js). Drawn over the battle:
 *   - a header: phase, timer, who is choosing, the action being aimed, and the damage knobs in force;
 *   - a card per combatant on the field (party left, enemies right): health / stamina / insight with what comes back each round, the final
 *     attributes and combat stats, the attack / defense / resistance of every damage type, the weapon and its requirements, status effects
 *     (stacks, turns left), traits, abilities (red when they cannot be paid for), which attribute rules it plays by, and what its best attack
 *     does to each opponent on the field;
 *   - on the right, under the performance panel: the queued turns, a damage preview of the action being aimed, and the reserves.
 * It is worked out and drawn five times a second into a picture of its own (stats are recalculated every time they are read, and a few hundred
 * lines of text are slow to draw); every frame in between only puts that picture on screen, so keeping it open does not slow the battle down.
 */
import { UITheme } from '../../ui/UITheme.js';
import { StatCalculator } from '../../../../shared/characters/statCalculator.js';
import { CombatCalculator, DAMAGE_SCALE, ENEMY_DAMAGE_SCALE } from '../../../../shared/battle/combatCalculator.js';
import { requirementsOf, unmetRequirements, UNMET_REQUIREMENT_DAMAGE_SCALE } from '../../../../shared/items/weaponRequirements.js';
import { TURN_TYPES } from '../../../../shared/battle/battleConstants.js';
import { DAMAGE_TYPE_LABELS } from '../../../../shared/core/constants.js';

const TYPES = Object.keys(DAMAGE_TYPE_LABELS);
const REFRESH_MS = 200;

const PARTY_COLOR = '#4fb3bf';
const ENEMY_COLOR = '#c8553d';
const GOOD = '#7fbf6a', WARN = '#d6b24a', BAD = '#d0503c';
const MUTED = () => UITheme.colors.textMuted;
const MAIN = () => UITheme.colors.textMain;
const GOLD = () => UITheme.colors.textHighlight;

const F = {
    title: 'bold 24px monospace',
    name: 'bold 21px monospace',
    row: '17px monospace',
    rowBold: 'bold 17px monospace',
    small: '15px monospace',
    smallBold: 'bold 15px monospace',
};

// Layout (the game draws in 1920 x 1080). The right column starts under the performance panel of the debug overlay.
const M = 16;
const HEADER_H = 66;
const CARD_W = 680;
const CARD_H = 322;
const PARTY_X = M;
const ENEMY_X = M * 2 + CARD_W;
const SIDE_X = M * 3 + CARD_W * 2;
const SIDE_Y = 512;   // under the performance panel of the debug overlay

const n0 = (v, d = 0) => (Number.isFinite(v) ? Number(v.toFixed(d)) : 0);
const pct = (v) => `${Math.round((v || 0) * 100)}%`;

export class BattleDebuggerRenderer {
    constructor(ctx, config) {
        this.screenCtx = ctx;
        this.ctx = ctx;
        this.config = config;
        this._model = null;
        this._modelAt = 0;
        this._layer = null;
    }

    render(state) {
        if (!state) return;
        const W = this.config.CANVAS_WIDTH || 1920, H = this.config.CANVAS_HEIGHT || 1080;
        const now = performance.now();
        if (!this._layer) {
            this._layer = document.createElement('canvas');
            this._layer.width = W; this._layer.height = H;
        }
        if (!this._model || now - this._modelAt >= REFRESH_MS) {
            this._model = this._buildModel(state);
            this._modelAt = now;
            const g = this._layer.getContext('2d');
            g.clearRect(0, 0, W, H);
            this.ctx = g;
            try { this._drawAll(state, W, H); } finally { this.ctx = this.screenCtx; }
        }
        const sc = this.screenCtx;
        sc.save();
        sc.setTransform(1, 0, 0, 1, 0, 0);
        sc.globalAlpha = 1;
        sc.drawImage(this._layer, 0, 0);
        sc.restore();
    }

    _drawAll(state, W, H) {
        const ctx = this.ctx;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(4, 5, 8, 0.84)';
        ctx.fillRect(0, 0, W, H);

        this._drawHeader(state);
        const m = this._model;
        m.party.forEach((e, i) => this._drawCard(e, PARTY_X, M + HEADER_H + i * (CARD_H + 8), PARTY_COLOR, state));
        m.enemies.forEach((e, i) => this._drawCard(e, ENEMY_X, M + HEADER_H + i * (CARD_H + 8), ENEMY_COLOR, state));
        if (!m.party.length) this._text('No party on the field', PARTY_X, M + HEADER_H, F.row, MUTED());
        if (!m.enemies.length) this._text('No enemies on the field', ENEMY_X, M + HEADER_H, F.row, MUTED());
        this._drawSide(state);
        ctx.restore();
    }

    // ------------------------------------------------------------------ model (worked out every REFRESH_MS)

    _buildModel(state) {
        const live = (list) => (list || []).filter(Boolean);
        const party = live(state.activeParty).map(c => this._entry(c, 'party'));
        const enemies = live(state.activeEnemies).map(c => this._entry(c, 'enemy'));
        // best attack of each side against each opponent on the field
        const best = (from, against) => {
            for (const e of from) {
                e.best = e.dead ? [] : against.filter(o => !o.dead).map(o => ({ name: o.c.name, ...(this._bestAttack(e, o) || {}) }));
            }
        };
        best(party, enemies);
        best(enemies, party);
        return { party, enemies, byCombatant: new Map([...party, ...enemies].map(e => [e.c, e])) };
    }

    _entry(c, team) {
        let stats = {};
        try { stats = c.stats || {}; } catch (e) { stats = {}; }
        const attrs = stats.attributes || {};
        const entity = c.originalEntity || {};
        const dead = typeof c.isDead === 'function' ? c.isDead() : (c.hp <= 0);
        const total = (v) => (v && typeof v === 'object' && v.total !== undefined ? v.total : v);

        // the weapon in hand and whether its requirements are met
        const equipment = entity.equipment || entity.state?.equipment || {};
        let weapon = null;
        for (const slot of ['mainHand', 'twoHand', 'oneHand', 'offHand']) {
            const it = equipment[slot];
            if (!it || typeof it !== 'object') continue;
            const def = it.definition || {};
            if ((def.type || it.type) !== 'weapon') continue;
            const reqs = requirementsOf(it);
            weapon = { name: it.name || def.name || slot, level: it.level || 1, reqs, unmet: unmetRequirements(reqs, attrs) };
            break;
        }
        if (!weapon) {
            const id = equipment.mainHand || equipment.twoHand || equipment.oneHand;
            if (typeof id === 'string') weapon = { name: id, level: 1, reqs: {}, unmet: [], innate: true };
        }

        let traits = [];
        try { traits = (c.traits || []).map(t => t && (t.name || t.id)).filter(Boolean); } catch (e) { traits = []; }
        const status = (c.statusEffects || []).map(s => ({
            name: s.name || s.id,
            stacks: s.stacks || 1,
            left: s.isInfinite ? '∞' : (s.charges ?? '?'),
        }));
        const abilities = (c.abilities || []).filter(Boolean).map(a => {
            let cost = {}, ok = true;
            try { cost = typeof a.costFor === 'function' ? a.costFor(c) : (a.cost || {}); } catch (e) { cost = {}; }
            try { ok = typeof a.canPayCost === 'function' ? a.canPayCost(c) : true; } catch (e) { ok = true; }
            const parts = [];
            if (cost.stamina) parts.push(`${cost.stamina}S`);
            if (cost.insight) parts.push(`${cost.insight}I`);
            if (cost.hp) parts.push(`${cost.hp}HP`);
            return { ability: a, name: a.name || a.id, cost: parts.join('+'), ok, damage: (a.effects || []).some(f => f.type === 'damage') };
        });

        return {
            c, team, dead, stats, attrs: attrs,
            name: c.name || c.id || '?',
            level: entity.level || c.level || 1,
            template: entity.templateId || entity.definitionKey || '',
            enemyRules: StatCalculator.usesEnemyScaling(entity),
            hp: c.hp, maxHp: total(stats.maxHp) ?? c.maxHp,
            stamina: c.stamina, maxStamina: total(stats.maxStamina) ?? c.maxStamina,
            insight: c.insight, maxInsight: total(stats.maxInsight) ?? c.maxInsight,
            rec: { hp: n0(stats.hpRecovery), stm: n0(stats.staminaRecovery), ins: n0(stats.insightRecovery) },
            weapon, traits, status, abilities, best: [],
        };
    }

    /** What `ability` of `from` does to `to`: { hit, min, max, crit, hits } (summed over its damage effects), or null if it deals none. */
    _predict(from, ability, to) {
        const effects = (ability && ability.effects || []).filter(f => f.type === 'damage');
        if (!effects.length) return null;
        const a = from.stats, d = to.stats;
        const hit = Math.min(0.95, (ability.accuracy ?? 1) * (a.accuracy ?? 100) / Math.max(1, d.evasion ?? 100));
        const teamScale = from.team === 'enemy' ? ENEMY_DAMAGE_SCALE : 1;
        let base = 0, crit = 0;
        for (const f of effects) {
            const type = (f.damageType || 'blunt').toLowerCase();
            const raw = (a.attack?.[type] || 0) * (f.power || 1) * DAMAGE_SCALE * teamScale;
            const def = d.defense?.[type] || 0, res = d.resistance?.[type] || 0;
            base += CombatCalculator.calculateMitigatedDamage(raw, def, res, false);
            crit += CombatCalculator.calculateMitigatedDamage(raw * (a.critMultiplier ?? 1.5), def, res, false);
        }
        const mh = ability.multihit;
        const hits = mh ? (typeof mh === 'number' ? mh : (mh.max || mh.min || mh.count || 1)) : 1;
        return { hit, min: Math.max(1, Math.floor(base * 0.9)), max: Math.floor(base * 1.1), crit: Math.floor(crit * 1.1), hits };
    }

    /** The damaging ability (one it can pay for) with the most damage on average against `to`. */
    _bestAttack(from, to) {
        let best = null;
        for (const ab of from.abilities) {
            if (!ab.damage || !ab.ok) continue;
            const p = this._predict(from, ab.ability, to);
            if (!p) continue;
            const avg = ((p.min + p.max) / 2) * p.hit * p.hits;
            if (!best || avg > best.avg) best = { ...p, avg, ability: ab.name };
        }
        return best;
    }

    // ------------------------------------------------------------------ drawing

    _text(t, x, y, font, color, align = 'left', maxW = 0) {
        const ctx = this.ctx;
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        if (maxW > 0 && ctx.measureText(t).width > maxW) {
            while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
            t += '…';
        }
        ctx.fillText(t, x, y);
        return ctx.measureText(t).width;
    }

    /** Text in runs of [text, color] on one line; returns the x after it. */
    _runs(runs, x, y, font, maxX = Infinity) {
        const ctx = this.ctx;
        ctx.font = font;
        ctx.textAlign = 'left';
        for (const [t, color] of runs) {
            if (x >= maxX) break;
            const w = ctx.measureText(t).width;
            if (x + w > maxX) { this._text(t, x, y, font, color, 'left', maxX - x); return maxX; }
            ctx.fillStyle = color;
            ctx.fillText(t, x, y);
            x += w;
        }
        return x;
    }

    _panel(x, y, w, h, border) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(16, 18, 23, 0.95)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    _bar(x, y, w, value, max, color, label) {
        const ctx = this.ctx;
        const share = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x, y + 20, w, 6);
        ctx.fillStyle = color;
        ctx.fillRect(x, y + 20, w * share, 6);
        this._text(label, x, y, F.small, MAIN(), 'left', w);
    }

    _drawHeader(state) {
        const m = this._model;
        const x = M, y = M, w = SIDE_X - M * 2;
        this._panel(x, y, w, HEADER_H - 8, UITheme.colors.borderHighlight);
        this._text('BATTLE DEBUGGER', x + 14, y + 8, F.title, GOLD());
        const actor = state.phase === 'SELECT_ACTION' || state.phase === 'SELECT_TARGET' ? state.activeParty?.[state.activePartyIndex] : null;
        const runs = [
            ['phase ', MUTED()], [String(state.phase || '?'), MAIN()],
            ['   timer ', MUTED()], [`${n0(state.timer, 1)}s`, MAIN()],
            ['   choosing ', MUTED()], [actor ? actor.name : '-', actor ? PARTY_COLOR : MUTED()],
            ['   action ', MUTED()], [state.selectedAction ? state.selectedAction.name : '-', state.selectedAction ? GOLD() : MUTED()],
        ];
        this._runs(runs, x + 290, y + 12, F.rowBold, x + w - 14);
        this._runs([
            ['damage x', MUTED()], [String(DAMAGE_SCALE), MAIN()],
            ['   enemy damage x', MUTED()], [String(ENEMY_DAMAGE_SCALE), MAIN()],
            ['   unmet weapon reqs x', MUTED()], [String(UNMET_REQUIREMENT_DAMAGE_SCALE), MAIN()],
            ['   on field ', MUTED()], [`${m.party.length} v ${m.enemies.length}`, MAIN()],
        ], x + 290, y + 34, F.small, x + w - 14);
    }

    _drawCard(e, x, y, teamColor, state) {
        const w = CARD_W, h = CARD_H, pad = 12, ix = x + pad, iw = w - pad * 2;
        const acting = e.team === 'party' && state.activeParty?.[state.activePartyIndex] === e.c && (state.phase === 'SELECT_ACTION' || state.phase === 'SELECT_TARGET');
        this._panel(x, y, w, h, acting ? GOLD() : teamColor);
        if (acting) { this.ctx.strokeStyle = GOLD(); this.ctx.lineWidth = 2; this.ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); }
        const dim = e.dead ? MUTED() : MAIN();
        let cy = y + 8;

        // 1. name, level, rules
        const nameW = this._text(`${e.name}`, ix, cy, F.name, e.dead ? MUTED() : teamColor, 'left', iw - 260);
        this._text(`Lv ${e.level}${e.dead ? '  DOWN' : ''}${acting ? '  ◄ choosing' : ''}`, ix + nameW + 12, cy + 3, F.rowBold, e.dead ? BAD : (acting ? GOLD() : MUTED()));
        this._text(`${e.enemyRules ? 'enemy rules' : 'player rules'} · ${e.template}`, x + w - pad, cy + 4, F.small, MUTED(), 'right', 250);
        cy += 30;

        // 2. pools (with what comes back at the end of each round)
        const bw = (iw - 24) / 3;
        this._bar(ix, cy, bw, e.hp, e.maxHp, '#b23a3a', `HP ${Math.round(e.hp)}/${e.maxHp}  +${e.rec.hp}`);
        this._bar(ix + bw + 12, cy, bw, e.stamina, e.maxStamina, '#6f9a5e', `STM ${Math.round(e.stamina)}/${e.maxStamina}  +${e.rec.stm}`);
        this._bar(ix + (bw + 12) * 2, cy, bw, e.insight, e.maxInsight, '#5f7fa8', `INS ${Math.round(e.insight)}/${e.maxInsight}  +${e.rec.ins}`);
        cy += 34;

        // 3. attributes | combat stats
        const a = e.attrs, s = e.stats;
        const attrRuns = [];
        for (const [k, label] of [['vigor', 'VIG'], ['strength', 'STR'], ['dexterity', 'DEX'], ['intelligence', 'INT'], ['attunement', 'ATN']]) {
            attrRuns.push([`${label} `, MUTED()], [`${a[k] ?? s[k] ?? 0} `, dim]);
        }
        attrRuns.push(['| ', MUTED()]);
        for (const [label, v] of [['SPD', s.speed], ['ACC', s.accuracy], ['EVA', s.evasion]]) attrRuns.push([`${label} `, MUTED()], [`${n0(v)} `, dim]);
        attrRuns.push(['CRT ', MUTED()], [`${pct(s.critChance)} x${n0(s.critMultiplier ?? 1.5, 2)}`, dim]);
        this._runs(attrRuns, ix, cy, F.small, x + w - pad);
        cy += 26;

        // 4. damage matrix: attack / defense / resistance of every type (the best attack type in gold)
        const labelW = 46, colW = (iw - labelW) / TYPES.length;
        const bestType = TYPES.reduce((b, t) => ((s.attack?.[t] || 0) > (s.attack?.[b] || 0) ? t : b), TYPES[0]);
        this.ctx.fillStyle = 'rgba(255,255,255,0.035)';
        this.ctx.fillRect(ix, cy - 2, iw, 21 * 4 + 2);
        TYPES.forEach((t, i) => this._text(DAMAGE_TYPE_LABELS[t], ix + labelW + i * colW + colW / 2, cy, F.smallBold, MUTED(), 'center'));
        cy += 21;
        const rows = [
            ['ATK', '#d06a5a', (t) => s.attack?.[t] || 0, (v) => (v ? String(Math.round(v)) : '·')],
            ['DEF', '#7d97c4', (t) => s.defense?.[t] || 0, (v) => (v ? String(Math.round(v)) : '·')],
            ['RES', '#b0aa9a', (t) => s.resistance?.[t] || 0, (v) => (v ? pct(v) : '·')],
        ];
        for (const [label, color, get, show] of rows) {
            this._text(label, ix + 4, cy, F.smallBold, color);
            TYPES.forEach((t, i) => {
                const v = get(t);
                const isBest = label === 'ATK' && t === bestType && v > 0;
                this._text(show(v), ix + labelW + i * colW + colW / 2, cy, isBest ? F.smallBold : F.small, isBest ? GOLD() : (v ? dim : MUTED()), 'center');
            });
            cy += 21;
        }
        cy += 6;

        // 5. weapon and its requirements
        const wpn = e.weapon;
        if (wpn) {
            const runs = [['Weapon ', MUTED()], [`${wpn.name}${wpn.innate ? '' : ` Lv${wpn.level}`}`, dim]];
            const reqKeys = Object.keys(wpn.reqs || {});
            if (reqKeys.length) {
                runs.push(['   needs ', MUTED()]);
                for (const k of reqKeys) {
                    const miss = wpn.unmet.find(u => u.attr === k);
                    runs.push([`${k.slice(0, 3).toUpperCase()} ${wpn.reqs[k]}${miss ? ` (has ${miss.have})` : ' ✓'}  `, miss ? BAD : GOOD]);
                }
                if (wpn.unmet.length) runs.push([`-${Math.round((1 - UNMET_REQUIREMENT_DAMAGE_SCALE) * 100)}% dmg`, BAD]);
            } else if (wpn.innate) runs.push(['   (counted in base attack)', MUTED()]);
            this._runs(runs, ix, cy, F.row, x + w - pad);
        } else this._runs([['Weapon ', MUTED()], ['none', MUTED()]], ix, cy, F.row);
        cy += 22;

        // 6. status effects and traits
        const st = e.status.length ? e.status.flatMap(x2 => [[`${x2.name}${x2.stacks > 1 ? ` x${x2.stacks}` : ''} (${x2.left})  `, WARN]]) : [['none', MUTED()]];
        this._runs([['Status ', MUTED()], ...st], ix, cy, F.row, x + w - pad);
        cy += 22;
        this._runs([['Traits ', MUTED()], [e.traits.length ? e.traits.join(', ') : 'none', e.traits.length ? dim : MUTED()]], ix, cy, F.row, x + w - pad);
        cy += 22;

        // 7. abilities (cost; red = cannot pay now)
        const abRuns = [['Abilities ', MUTED()]];
        e.abilities.forEach((ab, i) => abRuns.push([`${ab.name}${ab.cost ? ` ${ab.cost}` : ''}${i < e.abilities.length - 1 ? ' · ' : ''}`, ab.ok ? dim : BAD]));
        this._wrapRuns(abRuns, ix, cy, F.small, x + w - pad, 2, 19);
        cy += 40;

        // 8. best attack against each opponent on the field
        const bestRuns = [['Best vs ', MUTED()]];
        if (!e.best.length) bestRuns.push(['-', MUTED()]);
        e.best.forEach((b, i) => {
            if (!b.ability) { bestRuns.push([`${b.name}: no usable attack${i < e.best.length - 1 ? ' · ' : ''}`, MUTED()]); return; }
            bestRuns.push([`${b.name}: `, MUTED()], [`${b.min}-${b.max}${b.hits > 1 ? ` x${b.hits}` : ''} (${pct(b.hit)})`, e.team === 'enemy' ? '#e08a7a' : '#8fd0b0'], [`${i < e.best.length - 1 ? ' · ' : ''}`, MUTED()]);
        });
        this._wrapRuns(bestRuns, ix, cy, F.small, x + w - pad, 2, 19);
    }

    /** Runs of text wrapped over at most `lines` lines (cut with … after that). */
    _wrapRuns(runs, x, y, font, maxX, lines, lineH) {
        const ctx = this.ctx;
        ctx.font = font;
        let cx = x, line = 0;
        for (const [t, color] of runs) {
            const w = ctx.measureText(t).width;
            if (cx + w > maxX && cx > x) {
                line++;
                if (line >= lines) { this._text('…', cx, y + (line - 1) * lineH, font, MUTED()); return; }
                cx = x + 16;
            }
            if (cx + w > maxX) { this._text(t, cx, y + line * lineH, font, color, 'left', maxX - cx); cx = maxX; continue; }
            ctx.fillStyle = color;
            ctx.textAlign = 'left';
            ctx.fillText(t, cx, y + line * lineH);
            cx += w;
        }
    }

    _drawSide(state) {
        const x = SIDE_X, w = (this.config.CANVAS_WIDTH || 1920) - SIDE_X - M;
        let y = SIDE_Y;
        const H = (this.config.CANVAS_HEIGHT || 1080) - M - y;
        this._panel(x, y, w, H, UITheme.colors.border);
        const ix = x + 12, maxX = x + w - 12;
        y += 10;

        // queued turns
        const queue = state.turnQueue || [];
        this._text(`TURN QUEUE (${queue.length})`, ix, y, F.rowBold, GOLD());
        y += 24;
        const actions = queue.filter(q => q && q.type === TURN_TYPES.EXECUTE_ACTION);
        if (!queue.length) { this._text('empty', ix, y, F.small, MUTED()); y += 20; }
        let shown = 0;
        for (const q of queue) {
            if (shown >= 9) { this._text(`… ${queue.length - shown} more`, ix, y, F.small, MUTED()); y += 20; break; }
            if (q.type === TURN_TYPES.EXECUTE_ACTION) {
                const team = q.actor && q.actor.team;
                const targets = (q.targets || (q.target ? [q.target] : [])).map(t => t && t.name).filter(Boolean).join(', ');
                this._runs([
                    [`${shown + 1}. `, MUTED()], [q.actor ? q.actor.name : '?', team === 'enemy' ? ENEMY_COLOR : PARTY_COLOR],
                    [' → ', MUTED()], [q.action ? q.action.name : '?', MAIN()], [targets ? ` → ${targets}` : '', MUTED()],
                ], ix, y, F.small, maxX);
            } else {
                this._text(`${shown + 1}. ${String(q.type || '?').toLowerCase().replace(/_/g, ' ')}`, ix, y, F.small, MUTED(), 'left', maxX - ix);
            }
            y += 20; shown++;
        }
        if (actions.length === 0 && queue.length > 0) { this._text('(no actions queued)', ix, y, F.small, MUTED()); y += 20; }
        y += 10;

        // preview of the action being aimed
        this._text('ACTION PREVIEW', ix, y, F.rowBold, GOLD());
        y += 24;
        const m = this._model;
        const actor = state.activeParty?.[state.activePartyIndex];
        const from = actor && m.byCombatant.get(actor);
        const action = state.selectedAction;
        if (!from || !action) {
            this._text('pick an action to see its damage', ix, y, F.small, MUTED(), 'left', maxX - ix);
            y += 20;
        } else {
            this._text(`${from.name}: ${action.name}`, ix, y, F.row, MAIN(), 'left', maxX - ix);
            y += 22;
            const chosen = (state.selectedTargets || []).map(t => m.byCombatant.get(t)).filter(Boolean);
            const pool = chosen.length ? chosen : m.enemies.filter(o => !o.dead);
            let any = false;
            for (const to of pool.slice(0, 6)) {
                const p = this._predict(from, action, to);
                if (!p) continue;
                any = true;
                this._runs([
                    [chosen.length ? '► ' : '  ', GOLD()], [to.name, to.team === 'enemy' ? ENEMY_COLOR : PARTY_COLOR],
                    [`  ${p.min}-${p.max}`, MAIN()], [p.hits > 1 ? ` x${p.hits}` : '', MAIN()],
                    [`  crit ${p.crit}`, MUTED()], [`  hit ${pct(p.hit)}`, p.hit >= 0.8 ? GOOD : p.hit >= 0.5 ? WARN : BAD],
                    [`  (${Math.round(to.hp)} HP)`, MUTED()],
                ], ix, y, F.small, maxX);
                y += 20;
            }
            if (!any) { this._text('this action deals no direct damage', ix, y, F.small, MUTED()); y += 20; }
        }
        y += 10;

        // reserves
        const reserve = (roster, active) => (roster || []).filter(c => c && !(active || []).includes(c));
        const rp = reserve(state.partyRoster, state.activeParty), re = reserve(state.enemyRoster, state.activeEnemies);
        this._text('RESERVES', ix, y, F.rowBold, GOLD());
        y += 24;
        this._runs([['party ', MUTED()], [rp.length ? rp.map(c => c.name).join(', ') : 'none', rp.length ? PARTY_COLOR : MUTED()]], ix, y, F.small, maxX);
        y += 20;
        this._runs([['enemies ', MUTED()], [re.length ? re.map(c => c.name).join(', ') : 'none', re.length ? ENEMY_COLOR : MUTED()]], ix, y, F.small, maxX);
    }
}
