// shared/core/devCommands.js: the commands of the developer console (the "/" box in the overworld, frontend/src/ui/devConsole.js). Browser-free.
//
// Each command does what the game itself does for the same thing, by calling the same code, so a quick test here is a real test:
//   /additem      InventorySystem.addItem          (the GIVE_ITEM result of an encounter)
//   /addentity    PartyManager.addMember           (the RECRUIT_CHARACTER result: arrives rested, loses the enemy-only level HP bonus)
//   /awardxp      ExperienceSystem.addXp           (the AWARD_XP result, a battle's reward)
//   /gold         gameState.party.currency         (the MODIFY_CURRENCY result)
//   /corruption   CorruptionSystem.change          (the MODIFY_CORRUPTION result)
//   /milestone    ActSystem.grantMilestone         (the GRANT_MILESTONE result)
//   /encounter    the START_ENCOUNTER event        (what the overworld emits when a step triggers one)
//   /battle       the START_BATTLE event           (what the overworld emits for an ambush)
//
// To add a command: add an entry to COMMANDS below ({ usage, summary, run(args, host), complete?(index, typed, args) }). `run` returns a list of lines
// (use ok / info / fail) and may add `closeConsole: true`. `host` is whatever the screen offers (all optional, so tests run without it):
//   host.lockWorld()      stops the overworld taking input while a scene it started is loading
//   host.battleSetup()    { background, weather } for a battle started from where the player stands
// Nothing in the game imports this file: only the console does.
import { gameState } from './gameState.js';
import { events } from './eventBus.js';
import { InventorySystem } from '../items/inventorySystem.js';
import { ItemDefinitions } from '../items/itemDefinitions.js';
import { ENTITY_DEFINITIONS } from '../characters/entityDefinitions.js';
import { EntityFactory } from '../characters/entityFactory.js';
import { PartyManager } from '../characters/partyManager.js';
import { ExperienceSystem } from '../characters/experienceSystem.js';
import { CorruptionSystem } from '../characters/corruptionSystem.js';
import { encounterDefinitions } from '../story/encounterDefinitions.js';
import { ACT_DEFINITIONS } from '../story/actDefinitions.js';
import { ActSystem } from '../story/actSystem.js';

const ok = (text) => ({ kind: 'ok', text });
const info = (text) => ({ kind: 'info', text });
const fail = (text) => ({ kind: 'error', text });

const MAX_LISTED = 40;
const norm = (s) => String(s).toLowerCase();

/* "Legionary Companion" can be typed as legionary_companion, in quotes, or as a start of it. */
const nameKey = (s) => norm(s).replace(/_/g, ' ').trim();

/** Splits a line into words; "double quotes" keep spaces together. */
export function tokenize(line) {
    const out = [];
    const re = /"([^"]*)"|(\S+)/g;
    let m;
    while ((m = re.exec(line)) !== null) out.push(m[1] !== undefined ? m[1] : m[2]);
    return out;
}

const members = () => (gameState.party && gameState.party.members) || [];

/** An id typed in any case, matched to the game's own spelling (items are snake_case, entities UPPER_CASE). */
const resolveId = (table, typed) => {
    if (typed === undefined) return null;
    if (Object.prototype.hasOwnProperty.call(table, typed)) return typed;
    const want = norm(typed);
    return Object.keys(table).find(k => norm(k) === want) || null;
};

/** Which party members a word means: nothing = the leader, "all", a place in the party (1 is the leader), or part of a name. Returns { list } or { error }. */
function pickMembers(word) {
    const all = members();
    if (all.length === 0) return { error: 'There is no party yet.' };
    if (word === undefined) return { list: [all[0]] };
    if (['all', 'party', '*'].includes(norm(word))) return { list: [...all] };
    if (/^\d+$/.test(word)) {
        const m = all[Number(word) - 1];
        return m ? { list: [m] } : { error: `The party has ${all.length} member${all.length === 1 ? '' : 's'}: there is no member ${word}.` };
    }
    const key = nameKey(word);
    const exact = all.filter(m => nameKey(m.name) === key);
    const starts = all.filter(m => nameKey(m.name).startsWith(key));
    const inside = all.filter(m => nameKey(m.name).includes(key));
    const found = exact.length ? exact : starts.length ? starts : inside;
    if (found.length === 0) return { error: `No party member matches "${word}". Members: ${all.map((m, i) => `${i + 1} ${m.name}`).join(', ')}.` };
    if (found.length > 1) return { error: `"${word}" fits more than one member (${found.map(m => m.name).join(', ')}): type more of the name or a number.` };
    return { list: found };
}

const toInt = (word) => (/^-?\d+$/.test(String(word)) ? parseInt(word, 10) : null);

const memberNames = () => members().map(m => m.name.replace(/ /g, '_'));
const starting = (list, typed) => list.filter(x => norm(x).startsWith(norm(typed)));
const milestoneIds = () => [...new Set(Object.values(ACT_DEFINITIONS).map(d => d.milestone).filter(Boolean))];

const LISTABLE = {
    items: () => Object.keys(ItemDefinitions),
    entities: () => Object.keys(ENTITY_DEFINITIONS),
    encounters: () => Object.keys(encounterDefinitions),
    milestones: () => milestoneIds(),
};

const COMMANDS = {
    help: {
        usage: '/help [command]',
        summary: 'List the commands, or explain one.',
        run(args) {
            if (args[0]) {
                const name = norm(args[0]).replace(/^\//, '');
                const c = COMMANDS[name];
                return c ? [info(c.usage), info(c.summary)] : [fail(`Unknown command "${name}". Type /help for the list.`)];
            }
            return [info('Commands (Tab completes, Up / Down repeat the last ones):'), ...Object.values(COMMANDS).map(c => info(`  ${c.usage}  ${c.summary}`))];
        },
        complete: (i, typed) => (i === 0 ? starting(Object.keys(COMMANDS), typed) : []),
    },

    additem: {
        usage: '/additem <itemId> [quantity]',
        summary: 'Put an item in the party inventory.',
        run(args) {
            if (!args[0]) return [fail('Usage: /additem <itemId> [quantity]')];
            const id = resolveId(ItemDefinitions, args[0]);
            if (!id) return [fail(`No item "${args[0]}". Try /list items ${args[0]}`)];
            const qty = args[1] === undefined ? 1 : toInt(args[1]);
            if (qty === null || qty < 1) return [fail('The quantity must be a whole number of at least 1.')];
            InventorySystem.addItem(id, qty);
            return [ok(`Added ${qty} x ${id}.`)];
        },
        complete: (i, typed) => (i === 0 ? starting(LISTABLE.items(), typed) : []),
    },

    addentity: {
        usage: '/addentity <entityId> [level]',
        summary: 'Add a character to the party (the party holds 6).',
        run(args) {
            if (!args[0]) return [fail('Usage: /addentity <entityId> [level]')];
            const id = resolveId(ENTITY_DEFINITIONS, args[0]);
            if (!id) return [fail(`No entity "${args[0]}". Try /list entities ${args[0]}`)];
            const overrides = {};
            if (args[1] !== undefined) {
                const level = toInt(args[1]);
                if (level === null || level < 1) return [fail('The level must be a whole number of at least 1.')];
                overrides.level = level;
            }
            // as the RECRUIT_CHARACTER result does it: the newcomer arrives rested and without the enemy-only level HP bonus
            const recruit = PartyManager.addMember(id, overrides);
            if (!recruit) return [fail('The party is full (6), or that entity could not be built.')];
            EntityFactory.removeLevelEdge(recruit);
            recruit.hp = recruit.maxHp;
            recruit.stamina = recruit.maxStamina;
            recruit.insight = recruit.maxInsight;
            return [ok(`${recruit.name} (level ${recruit.level}) joined the party as member ${members().length}.`)];
        },
        complete: (i, typed) => (i === 0 ? starting(LISTABLE.entities(), typed) : []),
    },

    awardxp: {
        usage: '/awardxp <amount> [member|all]',
        summary: 'Give XP to the leader, a member (a number, or part of the name) or everyone.',
        run(args) {
            const amount = toInt(args[0]);
            if (amount === null || amount < 1) return [fail('Usage: /awardxp <amount> [member|all]')];
            const who = pickMembers(args[1]);
            if (who.error) return [fail(who.error)];
            const lines = [];
            for (const m of who.list) {
                const levelled = ExperienceSystem.addXp(m, amount);
                lines.push(ok(`${m.name} gained ${amount} XP${levelled ? ` and reached level ${m.level}!` : ` (${m.xp}/${m.maxXp}).`}`));
            }
            return lines;
        },
        complete: (i, typed) => (i === 1 ? starting(['all', ...memberNames()], typed) : []),
    },

    gold: {
        usage: '/gold <amount>',
        summary: 'Add (or with a minus, take away) currency.',
        run(args) {
            const amount = toInt(args[0]);
            if (amount === null || amount === 0) return [fail('Usage: /gold <amount>   (a minus takes it away)')];
            if (typeof gameState.party.currency === 'undefined') gameState.party.currency = 0;
            gameState.party.currency = Math.max(0, gameState.party.currency + amount);
            return [ok(`The party now has ${gameState.party.currency} currency.`)];
        },
    },

    heal: {
        usage: '/heal [member|all]',
        summary: 'Fill health, stamina and insight. (A shackled member stays down until a meteorite frees them.)',
        run(args) {
            const who = pickMembers(args[0] === undefined ? 'all' : args[0]);
            if (who.error) return [fail(who.error)];
            return who.list.map(m => {
                m.hp = m.maxHp;
                m.stamina = m.maxStamina;
                m.insight = m.maxInsight;
                return CorruptionSystem.isShackled(m) ? info(`${m.name} is shackled and stays down.`) : ok(`${m.name} is fully restored.`);
            });
        },
        complete: (i, typed) => (i === 0 ? starting(['all', ...memberNames()], typed) : []),
    },

    corruption: {
        usage: '/corruption <amount> [member|all]',
        summary: 'Raise (or with a minus, lower) corruption. Before act 2 it stops at 49: use /milestone act2 first to go further.',
        run(args) {
            const amount = toInt(args[0]);
            if (amount === null || amount === 0) return [fail('Usage: /corruption <amount> [member|all]')];
            const who = pickMembers(args[1]);
            if (who.error) return [fail(who.error)];
            const lines = [];
            for (const m of who.list) {
                const change = CorruptionSystem.change(m, amount);
                lines.push(ok(`${m.name}: corruption ${change.before}% -> ${change.after}%.`));
                change.messages.forEach(text => lines.push(info(text)));
            }
            if (!CorruptionSystem.isRevealed() && amount > 0) lines.push(info(`Act 1: corruption cannot pass ${CorruptionSystem.ceiling()}% yet (/milestone act2).`));
            return lines;
        },
        complete: (i, typed) => (i === 1 ? starting(['all', ...memberNames()], typed) : []),
    },

    milestone: {
        usage: '/milestone [id]',
        summary: 'Grant a story milestone (act2 starts act 2). With no id, show the ones reached.',
        run(args) {
            if (!args[0]) {
                const reached = ActSystem.getMilestones();
                return [info(`Act ${ActSystem.getAct()}. Milestones reached: ${reached.length ? reached.join(', ') : 'none'}. Act milestones: ${milestoneIds().join(', ')}.`)];
            }
            const id = args[0];
            const first = ActSystem.grantMilestone(id);
            return [first ? ok(`Milestone "${id}" granted: now act ${ActSystem.getAct()}.`) : info(`The party already has "${id}".`),
                ...(milestoneIds().includes(id) ? [] : [info(`("${id}" is not an act milestone: ${milestoneIds().join(', ')}.)`)])];
        },
        complete: (i, typed) => (i === 0 ? starting(milestoneIds(), typed) : []),
    },

    encounter: {
        usage: '/encounter <encounterId>',
        summary: 'Start an encounter now, as if a step had triggered it.',
        run(args, host = {}) {
            if (!args[0]) return [fail('Usage: /encounter <encounterId>')];
            const id = resolveId(encounterDefinitions, args[0]);
            if (!id) return [fail(`No encounter "${args[0]}". Try /list encounters ${args[0]}`)];
            let context;
            if (id === 'shackled_betrayal') {
                // the same context BiomeModel.getEncounter gives it: who the shackled member is
                const betrayer = CorruptionSystem.pickBetrayer();
                if (!betrayer) return [fail('The Shackling needs a shackled member and someone else still standing (/corruption 100 after /milestone act2).')];
                context = { betrayerIndex: members().indexOf(betrayer), betrayerName: betrayer.name };
            }
            if (host.lockWorld) host.lockWorld();
            events.emit('START_ENCOUNTER', { encounterId: id, context });
            return { lines: [ok(`Starting ${id}.`)], closeConsole: true };
        },
        complete: (i, typed) => (i === 0 ? starting(LISTABLE.encounters(), typed) : []),
    },

    battle: {
        usage: '/battle <entityId> [entityId ...]',
        summary: 'Start a battle against those enemies now, as if an ambush had triggered it.',
        run(args, host = {}) {
            if (!args.length) return [fail('Usage: /battle <entityId> [entityId ...]')];
            const ids = [];
            for (const a of args) {
                const id = resolveId(ENTITY_DEFINITIONS, a);
                if (!id) return [fail(`No entity "${a}". Try /list entities ${a}`)];
                ids.push(id);
            }
            if (ids.length > 6) return [fail('At most 6 enemies.')];
            if (host.lockWorld) host.lockWorld();
            const setup = host.battleSetup ? host.battleSetup() : {};
            events.emit('START_BATTLE', { enemies: ids.map(id => ({ id })), background: setup.background, weather: setup.weather });
            return { lines: [ok(`Battle against ${ids.join(', ')}.`)], closeConsole: true };
        },
        complete: (i, typed) => starting(LISTABLE.entities(), typed),
    },

    list: {
        usage: '/list <items|entities|encounters|milestones> [filter]',
        summary: 'Show the ids you can use (only those containing the filter).',
        run(args) {
            const kind = args[0] && Object.keys(LISTABLE).find(k => k.startsWith(norm(args[0])));
            if (!kind) return [fail(`Usage: /list <${Object.keys(LISTABLE).join('|')}> [filter]`)];
            const filter = args[1] ? norm(args[1]) : '';
            const ids = LISTABLE[kind]().filter(id => norm(id).includes(filter));
            if (ids.length === 0) return [info(`No ${kind} contain "${args[1]}".`)];
            const shown = ids.slice(0, MAX_LISTED);
            return [info(`${ids.length} ${kind}${filter ? ` containing "${args[1]}"` : ''}:`), info(shown.join(', ') + (ids.length > shown.length ? `, ... (${ids.length - shown.length} more: add a filter)` : ''))];
        },
        complete: (i, typed) => (i === 0 ? starting(Object.keys(LISTABLE), typed) : []),
    },
};

export const DevCommands = {
    /** The command names, for completion and the help list. */
    names() { return Object.keys(COMMANDS); },

    /**
     * Runs one line ("/additem meteorite 2"; the slash is optional). Returns { lines: [{ kind: 'ok' | 'info' | 'error', text }], closeConsole }.
     * `host` is described at the top of this file.
     */
    run(line, host = {}) {
        const words = tokenize(String(line || '').trim().replace(/^\//, ''));
        if (words.length === 0) return { lines: [], closeConsole: false };
        const name = norm(words[0]);
        const command = COMMANDS[name];
        if (!command) return { lines: [fail(`Unknown command "${name}". Type /help for the list.`)], closeConsole: false };
        let result;
        try {
            result = command.run(words.slice(1), host);
        } catch (e) {
            console.error(`[DevCommands] /${name} failed:`, e);
            return { lines: [fail(`/${name} failed: ${e.message}`)], closeConsole: false };
        }
        const lines = Array.isArray(result) ? result : result.lines;
        return { lines, closeConsole: !!(result && result.closeConsole) };
    },

    /**
     * Tab completion for what has been typed so far. Returns { start, options }: `options` are the whole words that fit the word being typed (the word
     * that starts at index `start` of the line), or none.
     */
    complete(line) {
        const text = String(line || '');
        const withoutSlash = text.replace(/^\//, '');
        const offset = text.length - withoutSlash.length;
        const endsInSpace = /\s$/.test(withoutSlash);
        const words = tokenize(withoutSlash);
        const typed = endsInSpace ? '' : (words.length ? words[words.length - 1] : '');
        const index = endsInSpace ? words.length : Math.max(0, words.length - 1);
        const start = offset + withoutSlash.length - typed.length;
        if (index === 0) return { start, options: starting(Object.keys(COMMANDS), typed) };
        const command = COMMANDS[norm(words[0])];
        if (!command || !command.complete) return { start, options: [] };
        return { start, options: command.complete(index - 1, typed, words.slice(1)) };
    },
};
