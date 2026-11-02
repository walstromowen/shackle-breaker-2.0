// tools/playthroughSim.mjs: simulated playthroughs to tune enemy difficulty.
// Every starting class, N runs, levels 1..MAXL, FIGHTS fights a level, against encounters rolled from the real spawn tables, with the
// game's real stat, ability and damage code. Solo player, fresh HP each fight, attribute points spent the way the class leans, weapon
// upgraded on a schedule and levelled into its requirements.
//
//   node tools/playthroughSim.mjs [runs=100] [maxLevel=50] [fightsPerLevel=3]          a table per metric, per class and level band
//   JSON=1 node tools/playthroughSim.mjs ...                                            the raw numbers as JSON instead
//   KNOBS='{"dmgBase":0.4,"dmgPerLevel":0.015}' node tools/playthroughSim.mjs ...       a what-if with other dials (defaults: the game's)
//   TRACE=Traveler,Hermit node tools/playthroughSim.mjs                                 how those classes' builds grow
const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const RUNS = +(process.argv[2] || 100), MAXL = +(process.argv[3] || 50), FIGHTS = +(process.argv[4] || 3);
const noop = () => {};
const makeCtx = () => new Proxy({ getTransform: () => ({ a: 1 }), createPattern: () => ({}), createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), measureText: (s) => ({ width: String(s).length * 10 }) }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; this._ctx = makeCtx(); } getContext() { return this._ctx; } };
const realLog = console.log;
console.log = noop; console.warn = noop; console.error = noop;
const out = (s) => process.stdout.write(s + '\n');
// the dials (the game's values as defaults): enemy damage = dmgBase + dmgPerLevel * (level - 1), at most dmgCap; per level above 1 an enemy gains
// edgeHp max HP and edgeAtk points in the attribute its best attack scales with (on top of the 2 HP and 1 attribute point every level gives)
const { ENEMY_DAMAGE } = await import(ROOT + '/shared/battle/combatCalculator.js');
const { LEVEL_EDGE_HP_PER_LEVEL, LEVEL_EDGE_ATTACK_PER_LEVEL } = await import(ROOT + '/shared/characters/entityFactory.js');
const K = { dmgBase: ENEMY_DAMAGE.atLevel1, dmgPerLevel: ENEMY_DAMAGE.perLevel, dmgCap: ENEMY_DAMAGE.max, edgeHp: LEVEL_EDGE_HP_PER_LEVEL, edgeAtk: LEVEL_EDGE_ATTACK_PER_LEVEL, ...JSON.parse(process.env.KNOBS || '{}') };
const enemyDamage = (level) => Math.min(K.dmgCap, K.dmgBase + K.dmgPerLevel * (level - 1));

const { gameState } = await import(ROOT + '/shared/core/gameState.js');
const { StatCalculator } = await import(ROOT + '/shared/characters/statCalculator.js');
const { EntityFactory } = await import(ROOT + '/shared/characters/entityFactory.js');
const { ItemFactory } = await import(ROOT + '/shared/items/itemFactory.js');
const { AbilityFactory } = await import(ROOT + '/shared/abilities/abilityFactory.js');
const { CombatCalculator } = await import(ROOT + '/shared/battle/combatCalculator.js');
const { SpawnTableFactory } = await import(ROOT + '/shared/battle/spawnTableFactory.js');
const { ActSystem } = await import(ROOT + '/shared/story/actSystem.js');
const { requirementsAt } = await import(ROOT + '/shared/items/weaponRequirements.js');

// ---- the classes (characterCreatorLogic.js) ----
const CLASSES = {
    Traveler:     { a: [11, 11, 10, 9, 9],  weapon: 'shortsword',        armor: 'leather' },
    Blacksmith:   { a: [15, 13, 8, 7, 7],   weapon: 'shortsword',        armor: 'iron' },
    Ranger:       { a: [10, 9, 15, 8, 8],   weapon: 'shortbow',          armor: 'leather' },
    Scholar:      { a: [8, 7, 9, 14, 12],   weapon: 'insight_of_arcane', armor: 'cloth' },
    Warrior:      { a: [13, 15, 9, 7, 6],   weapon: 'handaxe',           armor: 'iron' },
    Thief:        { a: [9, 8, 16, 9, 8],    weapon: 'dagger',            armor: 'leather' },
    Hermit:       { a: [10, 7, 9, 13, 11],  weapon: 'insight_of_earth',  armor: 'cloth' },
    Farmer:       { a: [15, 12, 9, 7, 7],   weapon: 'scythe',            armor: 'iron' },
    BountyHunter: { a: [12, 11, 14, 7, 6],  weapon: 'shortsword',        armor: 'leather' },
    Diseased:     { a: [10, 10, 10, 10, 10], weapon: null,               armor: 'leather' },
};
const ATTRS = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];
const ARMOR = {
    tattered: ['tattered_hood', 'tattered_shirt', 'tattered_gloves', 'tattered_pants', 'tattered_boots'],
    leather: ['leather_helmet', 'leather_armor', 'leather_bracers', 'leather_leggings', 'leather_boots'],
    iron: ['iron_helmet', 'iron_armor', 'iron_gauntlets', 'iron_greaves', 'iron_boots'],
    cloth: ['cloth_hood', 'cloth_robe', 'cloth_gloves', 'cloth_pants', 'cloth_shoes'],
};
const WEAPON_DUE = [1, 4, 9, 15, 22];   // player level at which the weapon reaches level 1..5 (materials), give or take
const rnd = Math.random;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ---- one playthrough's character ----
function newRun(cls) {
    const base = {};
    ATTRS.forEach((k, i) => base[k] = cls.a[i]);
    // what this player likes to raise: the class's own leanings, a little vigor always, and a personal twist
    const w = {};
    ATTRS.forEach((k, i) => w[k] = Math.max(0.3, cls.a[i] - 6) * (0.7 + rnd() * 0.6));
    w.vigor += 2;
    return { attrs: { ...base }, weights: w, weaponLevel: 1, due: WEAPON_DUE.map(l => Math.max(1, l + Math.round((rnd() - 0.5) * 3))), armorAt: 3 + Math.floor(rnd() * 3) };
}
function spendPoint(run, cls, level) {
    // the next weapon upgrade's requirements come first (a Souls player levels into the weapon), then what the class likes
    if (cls.weapon) {
        const next = run.weaponLevel + 1;
        if (next <= 5 && run.due[next - 1] <= level + 3) {
            const reqs = requirementsAt(cls.weapon, next);
            for (const [k, need] of Object.entries(reqs)) if (run.attrs[k] < need) { run.attrs[k]++; return; }
        }
    }
    const total = ATTRS.reduce((s, k) => s + run.weights[k], 0);
    let r = rnd() * total;
    for (const k of ATTRS) { r -= run.weights[k]; if (r <= 0) { run.attrs[k]++; return; } }
    run.attrs.vigor++;
}
function buildPlayer(run, cls, level) {
    // upgrade the weapon when it is due and its requirements are met
    if (cls.weapon) while (run.weaponLevel < 5 && run.due[run.weaponLevel] <= level) {
        const reqs = requirementsAt(cls.weapon, run.weaponLevel + 1);
        if (Object.entries(reqs).some(([k, need]) => run.attrs[k] < need)) break;
        run.weaponLevel++;
    }
    const equipment = {};
    if (cls.weapon) { const it = ItemFactory.createItem(cls.weapon); it.level = run.weaponLevel; equipment[it.slot === 'twoHand' ? 'twoHand' : 'mainHand'] = it; }
    const set = level >= run.armorAt ? cls.armor : 'tattered';
    const armorLevel = set === 'tattered' ? 1 : Math.min(5, 1 + Math.floor((level - run.armorAt) / 6));
    for (const id of ARMOR[set]) { const it = ItemFactory.createItem(id); if (!it) continue; it.level = Math.min(armorLevel, it.maxLevel || 1); equipment[it.slot] = it; }
    const e = EntityFactory.create('HUMANOID', { attributes: { ...run.attrs }, equipment, level, traits: [], levelEdge: false });
    Object.assign(e.state ? e.state.attributes : e.attributes, run.attrs);
    return e;
}

// ---- battle ----
const abilityIdsOf = (e) => {
    const ids = new Set((e.abilities || e.state?.abilities || []).map(a => typeof a === 'string' ? a : a.id));
    for (const it of Object.values(e.equipment || e.state?.equipment || {})) {
        if (!it) continue;
        const item = typeof it === 'string' ? ItemFactory.createItem(it) : it;
        (item?.grantedAbilities || []).forEach(a => ids.add(a));
    }
    return [...ids];
};
function combatant(e, team) {
    let stats = StatCalculator.calculate(e);
    if (team === 'enemy') {
        // the enemy damage dial, applied the way the game applies ENEMY_DAMAGE_SCALE (to raw damage = attack x power x DAMAGE_SCALE)
        const f = enemyDamage(e.level || e.state?.level || 1);
        stats = { ...stats, attack: Object.fromEntries(Object.entries(stats.attack).map(([k, v]) => [k, v * f])) };
        team = 'scaled-enemy';
    }
    const c = { e, team, stats, name: e.name, hp: stats.maxHp, stamina: stats.maxStamina, insight: stats.maxInsight, maxHp: stats.maxHp, maxStamina: stats.maxStamina, maxInsight: stats.maxInsight };
    c.abilities = AbilityFactory.createAbilities(abilityIdsOf(e)).filter(a => a && (typeof a.usableIn !== 'function' || a.usableIn('battle')));
    for (const a of c.abilities) { a._cost = a.costFor({ maxStamina: c.maxStamina, maxInsight: c.maxInsight, maxHp: c.maxHp }); a._dmg = (a.effects || []).filter(f => f.type === 'damage'); }
    return c;
}
const canPay = (c, a) => (!a._cost.stamina || c.stamina >= a._cost.stamina) && (!a._cost.insight || c.insight >= a._cost.insight) && (!a._cost.hp || c.hp > a._cost.hp);
const pay = (c, a) => { c.stamina -= a._cost.stamina || 0; c.insight -= a._cost.insight || 0; c.hp -= a._cost.hp || 0; };
const hitsOf = (a) => { const m = a.multihit; return m ? (typeof m === 'number' ? m : (m.max || m.min || 1)) : 1; };
function targetsOf(a, foes) {
    const live = foes.filter(f => f.hp > 0);
    const t = a.targeting || {};
    if (t.scope === 'all_enemies') return live;
    if (t.select === 'multiple') return live.slice(0, t.count || 2);
    if (t.scope === 'random_enemy') return [pick(live)];
    return [live.sort((x, y) => x.hp - y.hp)[0]];
}
function expected(a, c, foes) {
    if (!a._dmg.length) return 0;
    const ts = targetsOf(a, foes); let sum = 0;
    for (const t of ts) for (const f of a._dmg) {
        const type = (f.damageType || 'blunt').toLowerCase();
        sum += CombatCalculator.calculateMitigatedDamage((c.stats.attack[type] || 0) * (f.power || 1) * 1.4, t.stats.defense[type] || 0, t.stats.resistance[type] || 0, false) * hitsOf(a);
    }
    return sum;
}
function act(c, a, foes, log) {
    pay(c, a);
    for (const f of (a.effects || [])) {
        if (f.type === 'recover' && f.calculation === 'percent') {
            if (f.resource === 'stamina') c.stamina = Math.min(c.maxStamina, c.stamina + c.maxStamina * f.power);
            if (f.resource === 'insight') c.insight = Math.min(c.maxInsight, c.insight + c.maxInsight * f.power);
        }
    }
    if (!a._dmg.length) return;
    for (const t of targetsOf(a, foes)) for (let h = 0; h < hitsOf(a); h++) for (const f of a._dmg) {
        if (t.hp <= 0) break;
        const r = CombatCalculator.calculateDamage({ team: c.team, stats: c.stats }, { stats: t.stats }, f.power || 1, f.damageType || 'blunt', a.accuracy ?? 1);
        if (r.hit) { t.hp -= r.damage; if (log) log.dealt += r.damage; }
    }
}
const REST = () => { const r = AbilityFactory.createAbilities(['rest'])[0]; r._cost = {}; r._dmg = []; return r; };
function battle(player, enemies) {
    const p = combatant(player, 'party');
    const foes = enemies.map(e => combatant(e, 'enemy'));
    const startHp = p.hp, foeHp = foes.reduce((s, f) => s + f.maxHp, 0);
    let rounds = 0, playerAttacks = 0;
    const log = { dealt: 0 };
    const rest = REST();
    while (rounds < 60 && p.hp > 0 && foes.some(f => f.hp > 0)) {
        rounds++;
        const order = [p, ...foes.filter(f => f.hp > 0)].sort((x, y) => (y.stats.speed || 0) - (x.stats.speed || 0) + (rnd() - 0.5) * 0.01);
        for (const c of order) {
            if (c.hp <= 0 || p.hp <= 0 || !foes.some(f => f.hp > 0)) continue;
            if (c === p) {
                let best = null, bestV = 0, topV = 0;
                for (const a of p.abilities) {
                    if (!a._dmg.length) continue;
                    const v = expected(a, p, foes);
                    if (v > topV) topV = v;
                    if (canPay(p, a) && v > bestV) { bestV = v; best = a; }
                }
                // a player rests a turn rather than poke with an attack far weaker than the one the rest would pay for
                if (best && bestV < topV * 0.5) best = null;
                if (best) { act(p, best, foes, log); playerAttacks++; } else act(p, rest, foes);
            } else {
                const valid = c.abilities.filter(a => canPay(c, a) && !['rest', 'punch'].includes(a.id));
                const choice = valid.length ? pick(valid) : (c.abilities.find(a => a.id === 'punch' && canPay(c, a)) || rest);
                act(c, choice, [p]);
            }
        }
        for (const c of [p, ...foes]) {
            if (c.hp <= 0) continue;
            c.stamina = Math.min(c.maxStamina, c.stamina + Math.round(c.stats.staminaRecovery || 0));
            c.insight = Math.min(c.maxInsight, c.insight + Math.round(c.stats.insightRecovery || 0));
            c.hp = Math.min(c.maxHp, c.hp + Math.round(c.stats.hpRecovery || 0));
        }
    }
    const won = p.hp > 0 && !foes.some(f => f.hp > 0);
    const killed = foes.filter(f => f.hp <= 0).length;
    return { won, hpLeft: Math.max(0, p.hp) / startHp, rounds, n: foes.length, attacksPerKill: killed ? playerAttacks / killed : null, dmgShare: log.dealt / Math.max(1, playerAttacks) / (foeHp / foes.length) };
}

// ---- encounters ----
function encounter(level) {
    const act2 = level >= 20;
    gameState.milestones = act2 ? ['act2'] : [];
    const biomes = level < 6 ? ['plains'] : ['plains', 'desert', 'snowy_mountains'];
    const b = pick(biomes);
    const night = rnd() < 0.3;
    const table = act2 && night && rnd() < 0.6 ? `${b}_battles_blood_moon` : `${b}_battles_${night ? 'night' : 'day'}`;
    const model = SpawnTableFactory.generateBattle(table, 'normal');
    const base = level + ActSystem.getEnemyLevelOffset();
    return (model.enemies || []).map(cfg => {
        const id = cfg.id; const { id: _, levelOffset = 0, ...rest } = cfg;
        let overrides = { level: Math.max(1, base + levelOffset), ...rest };
        const up = ActSystem.getEnemyUpgrade(id);
        if (up) overrides = { ...overrides, abilities: [...(overrides.abilities || []), ...up.abilities], traits: [...(overrides.traits || []), ...up.traits] };
        const e = EntityFactory.create(id, { ...overrides, levelEdge: false });
        if (!e) return null;
        // the level edge, from the dials
        const lv = overrides.level, st = e.state || e;
        if (lv > 1) {
            const main = EntityFactory._mainAttackAttribute({ attributes: st.attributes, equipment: st.equipment, baseStats: st.baseStats });
            if (main) st.attributes[main] += Math.floor((lv - 1) * K.edgeAtk);
            st.baseStats.maxHp += Math.trunc((lv - 1) * K.edgeHp);
            e.hp = e.maxHp;
        }
        return e;
    }).filter(Boolean);
}

if (process.env.TRACE) {
    for (const name of process.env.TRACE.split(',')) {
        const cls = CLASSES[name]; const r = newRun(cls);
        for (let level = 1; level <= 25; level++) {
            if (level > 1) spendPoint(r, cls, level);
            const p = buildPlayer(r, cls, level);
            if ([1, 4, 8, 12, 16, 20, 25].includes(level)) {
                const d = StatCalculator.calculateDetailed(p);
                realLog(`${name} L${level} wpn Lv${r.weaponLevel} ${JSON.stringify(r.attrs)} slash ${d.attack.slash} pierce ${d.attack.pierce} unmet ${JSON.stringify(d.unmetRequirements.map(u => u.unmet))} hp ${d.maxHp.total} stam ${d.maxStamina.total}`);
            }
        }
    }
    process.exit(0);
}
// ---- run ----
const BANDS = [[1, 5], [6, 10], [11, 15], [16, 20], [21, 30], [31, 40], [41, 50], [51, 80], [81, 150]].filter(([a]) => a <= MAXL);
const stats = {};
const t0 = Date.now();
for (const [name, cls] of Object.entries(CLASSES)) {
    const S = stats[name] = BANDS.map(() => ({ fights: 0, wins: 0, hpLeft: 0, rounds: 0, apk: 0, apkN: 0, enemies: 0, dmg: 0 }));
    for (let run = 0; run < RUNS; run++) {
        const r = newRun(cls);
        for (let level = 1; level <= MAXL; level++) {
            if (level > 1) spendPoint(r, cls, level);
            const player = buildPlayer(r, cls, level);
            const band = BANDS.findIndex(([a, b]) => level >= a && level <= b);
            for (let f = 0; f < FIGHTS; f++) {
                const foes = encounter(level);
                if (!foes.length) continue;
                const res = battle(player, foes);
                const s = S[band];
                s.fights++; if (res.won) s.wins++; s.hpLeft += res.won ? res.hpLeft : 0; s.rounds += res.rounds; s.enemies += res.n; s.dmg += res.dmgShare;
                if (res.attacksPerKill !== null) { s.apk += res.attacksPerKill; s.apkN++; }
            }
        }
    }
}
const result = { knobs: K, runs: RUNS, maxLevel: MAXL, fights: FIGHTS, bands: BANDS, stats, seconds: (Date.now() - t0) / 1000 };
if (process.env.JSON) { process.stdout.write(JSON.stringify(result) + '\n'); process.exit(0); }
const bandName = ([a, b]) => `L${a}-${b}`;
out(`dials ${JSON.stringify(K)}`);
out(`${RUNS} runs x ${FIGHTS} fights a level, levels 1-${MAXL}, ${result.seconds.toFixed(0)}s`);
const METRICS = [
    ['WIN RATE (fresh HP)', s => s.wins / s.fights * 100, '%'],
    ['HP LEFT AFTER A WIN', s => s.hpLeft / Math.max(1, s.wins) * 100, '%'],
    ['PLAYER ATTACKS PER KILL', s => s.apk / Math.max(1, s.apkN), ' '],
    ['ROUNDS PER FIGHT', s => s.rounds / s.fights, ' '],
];
for (const [title, fn, unit] of METRICS) {
    out(`\n${title}`);
    out('class'.padEnd(14) + BANDS.map(b => bandName(b).padStart(9)).join(''));
    const agg = BANDS.map(() => [0, 0]);
    for (const [name, S] of Object.entries(stats)) {
        out(name.padEnd(14) + S.map((s, i) => {
            if (!s.fights) return '-'.padStart(9);
            const v = fn(s);
            if (name !== 'Diseased') { agg[i][0] += v; agg[i][1]++; }
            return (v.toFixed(1) + unit).padStart(9);
        }).join(''));
    }
    out('AVG (no Dis.)'.padEnd(14) + agg.map(([t, n]) => ((t / Math.max(1, n)).toFixed(1) + unit).padStart(9)).join(''));
}
