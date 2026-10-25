// frontend/src/engine/saveManager.js
//
// Turns the live `gameState` into a plain-JSON save and back again.
//
//   const save = SaveManager.createSnapshot();   // a plain object, safe to JSON.stringify / send to a server
//   SaveManager.applySnapshot(save);             // puts it back into `gameState` (in place; the gameState object itself is never replaced)
//
// WHERE a save lives is a separate, swappable thing: the SaveStore (see LocalSaveStore below). Every store method returns a Promise so a
// cloud store (login + server) can replace the local one without touching the game code:
//
//   SaveManager.setStore(myCloudStore);
//
// What is saved: the seed and difficulty, quests, the player's position / hotbar / world buffs, the world (time, day, weather, every change the
// player made to the map), the party (entities with gear, traits and status effects), the inventory (with item levels), currency, recipes, shops.
// What is NOT saved (rebuilt fresh on load): an encounter or battle in progress, open menus, toasts. Saves are made from the overworld or
// from inside a house / cave (see canSaveNow), never mid-encounter, so none of that transient state ever needs restoring.

import { gameState } from '../../../shared/core/gameState.js';
import { ActSystem } from '../../../shared/story/actSystem.js';
import { EntityModel } from '../../../shared/characters/entityModel.js';
import { ItemFactory } from '../../../shared/items/itemFactory.js';
import { StatusEffectFactory } from '../../../shared/abilities/statusEffectFactory.js';
import { WeatherFactory } from '../../../shared/world/weatherFactory.js';

const SAVE_FORMAT = 'shackle-breaker-save';

/* Bump this when the saved shape changes and add a migration below, so saves from older builds keep loading. */
const SAVE_VERSION = 2;

/* MIGRATIONS[n] upgrades the `data` of a version-n save to version n + 1. Example for the day it is needed:
     MIGRATIONS[1] = (data) => { data.party.somethingNew = 0; return data; };                                                            */
const MIGRATIONS = {
    // v1 -> v2: the Bandage item was replaced by the Healing Herb. Every "bandage" in the save (inventory, hotbar, quest rewards) becomes "healing_herb".
    1: (data) => renameStrings(data, { bandage: 'healing_herb' })
};

function renameStrings(node, map) {
    if (typeof node === 'string') return Object.prototype.hasOwnProperty.call(map, node) ? map[node] : node;
    if (Array.isArray(node)) return node.map(v => renameStrings(v, map));
    if (node && typeof node === 'object') {
        const out = {};
        for (const k of Object.keys(node)) out[k] = renameStrings(node[k], map);
        return out;
    }
    return node;
}

export const AUTOSAVE_SLOT = 'autosave';
export const BACKUP_SLOT = 'previous';   // the autosave that a New Game (or loading another save) replaced, so starting over never destroys progress for good

// Manual saves: any number of named slots, 's-' + a short id (the server accepts a-z, 0-9, '-' and '_', up to 32 characters)
export const MANUAL_SLOT_PREFIX = 's-';
export const MAX_MANUAL_SAVES = 15;          // the server keeps at most 20 slots per player (MAX_SAVES_PER_USER): these 15 + autosave + previous
export const MAX_SAVE_NAME = 30;
export const SAVE_NAME_KEY_PATTERN = /^[A-Za-z0-9 '\-_.,!:()#&]$/;   // keys the name box accepts while typing

export const isManualSlot = (slot) => typeof slot === 'string' && slot.startsWith(MANUAL_SLOT_PREFIX);

/** Tidies a name typed by the player: only the characters the name box allows, single spaces, trimmed, at most MAX_SAVE_NAME. */
export function cleanSaveName(name) {
    return String(name ?? '')
        .replace(/[^A-Za-z0-9 '\-_.,!:()#&]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_SAVE_NAME)
        .trim();
}

function newManualSlotId(taken) {
    let id;
    do {
        id = MANUAL_SLOT_PREFIX + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
    } while (taken.includes(id));
    return id;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------------------------

const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

/* Replaces the contents of `target` with `source` without replacing the object itself (other modules hold references to it). */
function replaceContents(target, source) {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, source);
}

function serializeStatusEffect(effect) {
    // A StatusEffectModel carries its whole definition (and who inflicted it, which leads back to an entity): save only what changes.
    return { id: effect.id, charges: effect.charges, stacks: effect.stacks || 1 };
}

function serializeEntity(entity) {
    const state = { ...entity.state, statusEffects: (entity.state.statusEffects || []).map(serializeStatusEffect) };
    // JSON.stringify calls ItemModel.toJSON() for the equipped / carried items.
    const saved = clone(state);
    saved.templateId = entity.templateId || state.templateId || null;
    saved.definitionKey = entity.definitionKey || state.definitionKey || saved.templateId;
    return saved;
}

function hydrateItem(saved) {
    if (!saved || !saved.defId) return null;
    return ItemFactory.createItem(saved.defId, saved);   // null (and a warning) if the item no longer exists in this build
}

/* An entity's gear / carried items are ItemModels, OR plain item-id strings: a companion defined in entityDefinitions.js with
   `equipment: { mainHand: "shortsword" }` keeps the string until a battle turns it into an item (see CombatantModel). Strings are kept as they are. */
function hydrateGear(value) {
    return typeof value === 'string' ? value : hydrateItem(value);
}

function hydrateEntity(saved) {
    const state = clone(saved);

    // Gear and carried items go back to real ItemModels (an item that no longer exists in this build is dropped, not fatal).
    const equipment = {};
    for (const [slot, item] of Object.entries(state.equipment || {})) {
        equipment[slot] = hydrateGear(item);
    }
    state.equipment = equipment;
    state.inventory = (state.inventory || []).map(hydrateGear).filter(Boolean);

    const savedEffects = state.statusEffects || [];
    state.statusEffects = [];

    const entity = new EntityModel(state);

    // Properties EntityFactory sets on the model itself (they are also in `state`, but the combat code reads them off the model).
    entity.templateId = state.templateId || null;
    entity.definitionKey = state.definitionKey || entity.templateId;
    if (state.currencyReward) entity.currencyReward = state.currencyReward;
    if (state.xpReward) entity.xpReward = state.xpReward;

    // Status effects are rebuilt from their definitions, then given their saved charges / stacks.
    for (const saved of savedEffects) {
        const effect = StatusEffectFactory.createEffect(saved.id, saved.charges, null);
        if (!effect) continue;                       // the effect was removed from the game: skip it
        effect.stacks = saved.stacks || 1;
        entity.state.statusEffects.push(effect);
    }
    return entity;
}

function serializeWeather(weather) {
    if (!weather) return null;
    return {
        id: weather.id,
        timeRemaining: weather.timeRemaining,
        totalDuration: weather.totalDuration,
        intensity: weather.intensity
    };
}

function hydrateWeather(saved) {
    if (!saved || !saved.id) return null;
    const weather = WeatherFactory.createWeather(saved.id);   // unknown id -> CLEAR (the factory warns)
    weather.timeRemaining = saved.timeRemaining;
    weather.totalDuration = saved.totalDuration;
    weather.intensity = saved.intensity;
    return weather;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Local storage (the default SaveStore)
// ---------------------------------------------------------------------------------------------------------------------------------

const LOCAL_PREFIX = 'shackle-breaker:save:';

/* The SaveStore contract (every method async):
     list()               -> [{ slot, summary, savedAt }]   (newest first)
     read(slot)           -> save | null
     write(slot, save)    -> true / false
     remove(slot)         -> true / false

   createLocalSaveStore(prefix) keeps saves in localStorage under `prefix`. A logged-in player gets their own prefix (one per account), so two
   people sharing a browser never see each other's saves. The cloud store (frontend/src/auth/cloudSaveStore.js) keeps a local copy this way too. */
export function createLocalSaveStore(prefix = LOCAL_PREFIX) {
    return {
        async list() {
            const found = [];
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!key || !key.startsWith(prefix)) continue;
                    try {
                        const save = JSON.parse(localStorage.getItem(key));
                        found.push({ slot: key.slice(prefix.length), summary: save.summary || null, savedAt: save.savedAt || null });
                    } catch (e) { /* a corrupt slot is simply not listed */ }
                }
            } catch (e) {
                console.warn('[SaveManager] localStorage is not available:', e);
            }
            return found.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
        },

        async read(slot) {
            try {
                const raw = localStorage.getItem(prefix + slot);
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                console.warn(`[SaveManager] Could not read slot '${slot}':`, e);
                return null;
            }
        },

        async write(slot, save) {
            try {
                localStorage.setItem(prefix + slot, JSON.stringify(save));
                return true;
            } catch (e) {
                console.warn(`[SaveManager] Could not write slot '${slot}' (storage full or blocked):`, e);
                return false;
            }
        },

        async remove(slot) {
            try {
                localStorage.removeItem(prefix + slot);
                return true;
            } catch (e) {
                return false;
            }
        }
    };
}

export const LocalSaveStore = createLocalSaveStore();

// ---------------------------------------------------------------------------------------------------------------------------------
// SaveManager
// ---------------------------------------------------------------------------------------------------------------------------------

let store = LocalSaveStore;
let lastAutosaveAt = 0;

export const SaveManager = {
    SAVE_VERSION,

    /** Swap where saves go (e.g. a store that talks to the server). */
    setStore(newStore) { store = newStore || LocalSaveStore; },
    getStore() { return store; },

    /**
     * Saving is allowed with a started game, anywhere: on the overworld, or inside a house or cave. Inside, the world seed is temporarily shifted
     * (see SceneManager's WARP handling) and the way back out is kept in world.savedOverworld, so a snapshot keeps both (`world.interior`) and a load
     * puts the player back in the same room, with the door still leading out to the same spot.
     */
    canSaveNow() {
        if (gameState.seed === null || gameState.seed === undefined) return false;
        if (!gameState.party.members || gameState.party.members.length === 0) return false;
        if (gameState.world.isInterior && !gameState.world.savedOverworld) return false;   // inside, but with no way out recorded: a save could never find the door
        return true;
    },

    // ----- snapshot / restore -----------------------------------------------------------------------------------------------

    /** @param {{name?: string}} options  name: the player's name for a manual save (stored in summary.saveName) */
    createSnapshot(options = {}) {
        if (!gameState.party.members.length) throw new Error('[SaveManager] There is no party to save.');

        const members = gameState.party.members;
        const leader = members[0];
        const world = gameState.world;

        const data = {
            seed: gameState.seed,
            difficulty: gameState.difficulty,
            cheats: gameState.cheats === true,   // chosen when the game was created: may the developer console and the battle debugger be used
            milestones: clone(gameState.milestones || []),
            quests: clone({
                active: gameState.quests.active,
                completed: gameState.quests.completed,
                trackedIds: gameState.quests.trackedIds
            }),
            player: clone({
                col: gameState.player.col,
                row: gameState.player.row,
                direction: gameState.player.direction,
                hotbar: gameState.player.hotbar || [],
                buffs: gameState.player.buffs || {}
            }),
            world: {
                time: world.time,
                day: world.day,
                currentBiome: world.currentBiome || null,
                changes: clone(world.changes || {}),
                terrainOverrides: clone(world.terrainOverrides || {}),
                discoveredChunks: clone(world.discoveredChunks || []),
                weather: serializeWeather(world.currentWeather),
                // inside a house or cave: which one, and the overworld seed and spot to return to (`data.seed` is then the interior's shifted seed)
                interior: world.isInterior ? clone({
                    type: world.interiorType,
                    id: world.interiorId,
                    mapId: world.interiorMapId || null,
                    savedOverworld: world.savedOverworld
                }) : null
            },
            party: {
                members: members.map(serializeEntity),
                inventory: clone(gameState.party.inventory),   // ItemModel.toJSON() -> { defId, instanceId, qty, level }
                currency: gameState.party.currency || 0,
                unlockedCraftingRecipes: clone(gameState.party.unlockedCraftingRecipes || [])
            },
            shops: clone(gameState.shops || {})
        };

        return {
            format: SAVE_FORMAT,
            saveVersion: SAVE_VERSION,
            savedAt: new Date().toISOString(),
            summary: {
                name: leader.name,
                level: leader.level,
                partySize: members.length,
                day: world.day,
                difficulty: gameState.difficulty,
                ...(options.name ? { saveName: String(options.name).slice(0, 40) } : {})
            },
            data
        };
    },

    /** Throws a readable Error if `save` is not something this build can load. Upgrades older saves. Returns the usable `data`. */
    validateAndMigrate(save) {
        if (!save || save.format !== SAVE_FORMAT) throw new Error('This is not a Shackle-breaker save file.');
        let version = save.saveVersion;
        if (!Number.isInteger(version) || version < 1) throw new Error('The save has no valid version.');
        if (version > SAVE_VERSION) throw new Error('This save was made by a newer version of the game. Refresh the page to get the latest build.');

        let data = clone(save.data);
        while (version < SAVE_VERSION) {
            const migrate = MIGRATIONS[version];
            if (!migrate) throw new Error(`No migration from save version ${version}.`);
            data = migrate(data);
            version++;
        }

        if (!data || typeof data.seed !== 'number') throw new Error('The save is missing its world seed.');
        if (!data.party || !Array.isArray(data.party.members) || data.party.members.length === 0) throw new Error('The save has no party.');
        return data;
    },

    /**
     * Puts a save into `gameState`. Everything that can fail (building entities and items) is built FIRST; gameState is only touched once
     * all of it worked, so a damaged save can never leave the game half-loaded.
     * The caller then has to build the world and enter the overworld (SceneManager does, on the 'LOAD_GAME' event).
     */
    applySnapshot(save) {
        const data = this.validateAndMigrate(save);

        const members = data.party.members.map(hydrateEntity);
        const inventory = (data.party.inventory || []).map(hydrateItem).filter(Boolean);
        const weather = hydrateWeather(data.world && data.world.weather);

        // ---- commit -----------------------------------------------------------------------------------------------------
        gameState.seed = data.seed;
        gameState.mode = 'overworld';
        gameState.difficulty = data.difficulty || 'normal';
        gameState.cheats = data.cheats === true;   // a save from before the toggle has cheats off

        gameState.milestones = Array.isArray(data.milestones) ? data.milestones : [];   // a save from before the acts: act 1

        gameState.quests = {
            active: data.quests?.active || {},
            completed: data.quests?.completed || [],
            trackedIds: data.quests?.trackedIds || []
        };
        ActSystem.catchUp(gameState);   // a save that had already beaten Darius before the acts existed goes into act 2

        replaceContents(gameState.player, {
            col: data.player.col,
            row: data.player.row,
            direction: data.player.direction || 'DOWN',
            hotbar: data.player.hotbar || [],
            buffs: data.player.buffs || {}
        });

        const interior = data.world.interior && data.world.interior.savedOverworld ? data.world.interior : null;   // saved inside a house or cave
        replaceContents(gameState.world, {
            currentBiomeId: null,
            currentBiome: data.world.currentBiome || null,
            isInterior: !!interior,
            interiorType: interior ? interior.type : null,
            ...(interior ? { interiorId: interior.id, interiorMapId: interior.mapId || null, savedOverworld: interior.savedOverworld } : {}),
            time: data.world.time,
            day: data.world.day,
            changes: data.world.changes || {},
            terrainOverrides: data.world.terrainOverrides || {},
            discoveredChunks: data.world.discoveredChunks || [],
            currentWeather: weather            // null -> WorldManager creates clear skies
        });

        replaceContents(gameState.party, {
            inventory,
            currency: data.party.currency || 0,
            unlockedCraftingRecipes: data.party.unlockedCraftingRecipes || [],
            members
        });

        gameState.shops = data.shops || {};

        // Transient state always starts clean.
        gameState.encounter = { activeData: null, currentStageId: null, history: [], context: { col: null, row: null, objectId: null } };
        gameState.battle = { isActive: false, enemies: [], turnQueue: [], roundNumber: 1 };
        gameState.ui = { selectedDecisionIndex: 0, isMenuOpen: false };
        delete gameState.tempShopId;
        delete gameState.tempShopWares;

        return true;
    },

    // ----- saving / loading through the store -------------------------------------------------------------------------------

    /** Saves into `slot`. Resolves true on success. Never throws (a failed save must not crash the game). */
    async saveToSlot(slot = AUTOSAVE_SLOT) {
        if (!this.canSaveNow()) return false;
        try {
            const ok = await store.write(slot, this.createSnapshot());
            if (ok) lastAutosaveAt = Date.now();
            return ok;
        } catch (e) {
            console.error('[SaveManager] Save failed:', e);
            return false;
        }
    },

    /** Autosave, at most once every `minGapMs` (a burst of scene changes does not rewrite the save each time). */
    async autosave(minGapMs = 0) {
        if (Date.now() - lastAutosaveAt < minGapMs) return false;
        return this.saveToSlot(AUTOSAVE_SLOT);
    },

    /** A suggestion for the name box: "Leader - Day 4". */
    defaultSaveName() {
        const leader = gameState.party.members && gameState.party.members[0];
        return cleanSaveName(`${leader ? leader.name : 'Save'} - Day ${gameState.world.day ?? 1}`);
    },

    /**
     * A manual, named save. With no `slot` it takes a new slot (refused past MAX_MANUAL_SAVES); with a manual `slot` it overwrites that one.
     * Resolves { ok: true, slot, name } or { ok: false, error } (never throws).
     */
    async saveManual(name, slot = null) {
        if (!this.canSaveNow()) return { ok: false, error: 'There is no game to save yet.' };
        try {
            const entries = await store.list();
            let target = slot;
            if (target) {
                if (!isManualSlot(target)) return { ok: false, error: 'That slot cannot be overwritten.' };
            } else {
                if (entries.filter(e => isManualSlot(e.slot)).length >= MAX_MANUAL_SAVES) {
                    return { ok: false, error: `You can keep up to ${MAX_MANUAL_SAVES} saves. Delete one first.` };
                }
                target = newManualSlotId(entries.map(e => e.slot));
            }
            const finalName = cleanSaveName(name) || this.defaultSaveName();
            const ok = await store.write(target, this.createSnapshot({ name: finalName }));
            return ok ? { ok: true, slot: target, name: finalName } : { ok: false, error: 'The save could not be written (browser storage is full or blocked).' };
        } catch (e) {
            console.error('[SaveManager] Manual save failed:', e);
            return { ok: false, error: e.message || String(e) };
        }
    },

    /** Reads a slot and applies it. Resolves { ok: true } or { ok: false, error } (never throws). */
    async loadFromSlot(slot = AUTOSAVE_SLOT) {
        try {
            const save = await store.read(slot);
            if (!save) return { ok: false, error: 'There is no saved game.' };
            this.validateAndMigrate(save);   // refuse a damaged save before anything is touched
            // Loading another save is about to replace the autosave with it: keep what the autosave held in 'previous' first
            // (the save is already in memory, so loading 'previous' itself is safe).
            if (slot !== AUTOSAVE_SLOT) await this.backupAutosave();
            this.applySnapshot(save);
            return { ok: true };
        } catch (e) {
            console.error('[SaveManager] Load failed:', e);
            return { ok: false, error: e.message || String(e) };
        }
    },

    /** Keeps a copy of the current autosave in the 'previous' slot. Call it before a New Game starts writing autosaves. */
    async backupAutosave() {
        try {
            const current = await store.read(AUTOSAVE_SLOT);
            if (current) await store.write(BACKUP_SLOT, current);
        } catch (e) {
            console.warn('[SaveManager] Could not back up the autosave:', e);
        }
    },

    async hasSave(slot = AUTOSAVE_SLOT) {
        return !!(await store.read(slot));
    },

    list() { return store.list(); },

    deleteSlot(slot) { return store.remove(slot); },

    // ----- save files (browser only) ----------------------------------------------------------------------------------------

    /** Downloads the current game as a .json file (a backup, or something a tester can send you to reproduce a bug). */
    downloadCurrent(filename) {
        if (!this.canSaveNow()) return false;
        const save = this.createSnapshot();
        const name = filename || `shackle-breaker-${save.summary.name || 'save'}-day${save.summary.day}.json`.replace(/[^\w.\-]+/g, '_');
        const blob = new Blob([JSON.stringify(save)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
    },

    /** Opens a file picker and resolves the parsed save (or null if cancelled). The caller applies it with applySnapshot(). */
    pickSaveFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.onchange = () => {
                const file = input.files && input.files[0];
                if (!file) return resolve(null);
                file.text().then(text => {
                    try { resolve(JSON.parse(text)); } catch (e) { reject(new Error('That file is not valid JSON.')); }
                }, reject);
            };
            input.click();
        });
    }
};
