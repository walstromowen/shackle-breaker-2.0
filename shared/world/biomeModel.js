import { CONFIG, CORRUPTION } from '../core/constants.js';
import { gameState } from '../core/gameState.js';
import { SpawnTableFactory } from '../battle/spawnTableFactory.js';
import { ActSystem } from '../story/actSystem.js';
import { Dolos } from '../story/dolos.js';
import { CorruptionSystem } from '../characters/corruptionSystem.js';
import { storyAmbush } from '../story/storyAmbush.js';

/* How often a step out in the open starts an ambush, in every outdoor biome: 1 in 200 by day (dusk counts as day), 1 in 100 at night. */
export const OUTDOOR_BATTLE_RATE = { day: 1 / 200, night: 1 / 100 };

export class BiomeModel {
    constructor(definition) {
        this.id = definition.id;
        this.name = definition.name || String(definition.id || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); // the display name
        this.defaultLootTable = definition.defaultLootTable || 'basic_loot'; // Provide a safe fallback
        this.blobTileset = definition.blobTileset || null; // generated blob-47 tilesets (see blobTerrainRenderer.js)
        this.objectSheetId = definition.objectSheetId;
        this.allowedWeather = definition.allowedWeather || [];
        this.ambientLight = definition.ambientLight || null; // natural darkness { r, g, b, a } of the biome, see MapRenderer.naturalAmbient
        this.battleBackgrounds = definition.battleBackgrounds || { day: null, dusk: null, night: null };
        this.music = definition.music || { day: null, night: null, battle: null };
        this.shapeElevation = definition.shapeElevation || ((noise) => noise);
        this.plateauWidth = definition.plateauWidth !== undefined ? definition.plateauWidth : 2;
        this.mapObjects = definition.mapObjects;
        this.battles = definition.battles;
        this.encounters = definition.encounters;
        this.structures = definition.structures;
        this.landmarks = definition.landmarks || null; // small stand-alone structures (graveyards) that appear in chunks without a village
    }

    /* the landmark (a PREFAB id) a chunk gets, or null: `landmarks.rate` is the share of chunks that get one, `pools` picks which */
    getLandmarkId(rngValue) {
        const lm = this.landmarks;
        if (!lm || !lm.rate || !lm.pools || lm.pools.length === 0) return null;
        if (rngValue > lm.rate) return null;
        const poolRng = rngValue / lm.rate;
        let cumulativeChance = 0;
        for (const pool of lm.pools) {
            cumulativeChance += pool.chance;
            if (poolRng <= cumulativeChance) return pool.id;
        }
        return lm.pools[0].id;
    }

    getStructureId(rngValue) {
        if (!this.structures) return null;
        if (rngValue > this.structures.rate) return null;
        const poolRng = rngValue / this.structures.rate;
        let cumulativeChance = 0;
        for (const pool of this.structures.pools) {
            cumulativeChance += pool.chance;
            if (poolRng <= cumulativeChance) {
                return pool.id;
            }
        }
        return this.structures.pools[0].id;
    }

    getSpawnId(tileId, rngValue) {
        const rules = this.mapObjects[tileId];
        if (!rules) return null;
        // One roll (rngValue, 0..1) picks at most one rule. A rule with `rangeStart` owns the band [rangeStart, chance).
        // Every other rule owns the next `chance`-wide slice after the rules above it, so its `chance` really is its share
        // (before, `rngValue < chance` made a rule listed after a bigger one unreachable: rocks / boulders listed after a
        // pine tree with the same or a larger chance never spawned).
        let used = 0;
        for (const rule of rules) {
            let lo, hi;
            if (rule.rangeStart) {
                lo = rule.rangeStart;
                hi = rule.chance;
            } else {
                lo = used;
                hi = used + rule.chance;
                used = hi;
            }
            if (rngValue < lo || rngValue >= hi) continue;
            let spawnId = rule.id;
            if (rule.pool) {
                spawnId = rule.pool[Math.floor(rngValue * 1000) % rule.pool.length];
            }
            return { id: spawnId, footprint: rule.footprint || null };
        }
        return null;
    }

    /* `size` = { fighters, players }: how many the party can put on the field (1-3) and how many players share it; a bigger party meets
       a bigger group (SpawnTableFactory, PARTY_SCALING). */
    /* `rateScale`: a party of players walks as several, each step of each player able to set off an ambush that pulls the others in, so each one's
       chance is divided by how many there are (1 / players): together they meet fights about as often as one player alone. */
    getBattle(difficulty = 'normal', currentHour = 12, size = {}, rateScale = 1) {
        if (!this.battles || !this.battles.tables) return null;
        const timeOfDay = this.getTimeOfDay(currentHour);
        // Out in the open an ambush is one step in 200 by day (and at dusk) and one in 100 at night, in every biome (OUTDOOR_BATTLE_RATE); a blood
        // moon night is more dangerous still (story/actDefinitions.js). Under ground (a cave) the biome's own rate, raised by the act, stands.
        const indoors = !!(gameState.world && gameState.world.isInterior);
        const rate = indoors
            ? this.battles.rate * ActSystem.getBattleRateMultiplier(currentHour)
            : (timeOfDay === 'night' ? OUTDOOR_BATTLE_RATE.night : OUTDOOR_BATTLE_RATE.day)
                * (ActSystem.isBloodMoon(currentHour) ? ActSystem.getBattleRateMultiplier(currentHour) : 1);
        const dolos = Dolos.effects(gameState, ActSystem.isBloodMoon(currentHour)).ambushRate;   // his attention (story/dolos.js)
        if (!(this.battles.rate > 0) || Math.random() > rate * rateScale * dolos) return null;
        // A blood moon night has a table of its own (`tables.bloodMoon`), the dead and the cursed that rise under it
        // in act 2 the night's enemies are sometimes abroad by day too (actDefinitions.js nightByDay)
        const nightByDay = timeOfDay !== 'night' && this.battles.tables.night && ActSystem.nightEnemiesByDay();
        const tableId = (ActSystem.isBloodMoon(currentHour) && this.battles.tables.bloodMoon)
            || (nightByDay ? this.battles.tables.night : null)
            || this.battles.tables[timeOfDay] || this.battles.tables.day;
        if (!tableId) return null;
        const spawnModel = SpawnTableFactory.generateBattle(tableId, difficulty, { ...size, ambush: true });   // an ambush: AMBUSH_SIZE
        return spawnModel.hasEnemies() ? { enemies: spawnModel.enemies } : null;
    }

    getTimeOfDay(currentHour) {
        if (currentHour >= 20 || currentHour < 6) return 'night';
        if (currentHour >= 6 && currentHour < 17) return 'day';
        return 'dusk';
    }

    getEncounter(currentHour, rateScale = 1) {   // rateScale: as for getBattle
        // a story scene whose time has come (the Dry Kraken, story/storyAmbush.js) springs before any roll of the biome's own
        const story = storyAmbush(this.id);
        if (story) return story;
        // Updated to read directly from the biome's inline encounter pools
        if (!this.encounters || !(this.encounters.rate > 0)) return null;
        if (Math.random() > this.encounters.rate * rateScale) return null;
        const timeOfDay = this.getTimeOfDay(currentHour);
        // Filter out encounters that don't match the current time
        // A pool can be limited to some acts with `minAct` / `maxAct` (an encounter that only exists after, or only before, a milestone)
        // a pool can also be limited to some weather (`weather: ['SANDSTORM']`: the desert's cyclone)
        const weather = String((gameState.world.currentWeather && gameState.world.currentWeather.id) || 'CLEAR').toUpperCase();
        const validPools = (this.encounters.pools || []).filter((pool) => (!pool.allowedTimes || pool.allowedTimes.includes(timeOfDay)) && (!pool.weather || pool.weather.includes(weather)) && ActSystem.isAvailable(pool));
        // The Shackling (story/encounters/story/shackledBetrayal.js) is an ordinary entry in every biome's pool, at any hour, but only while a party member is shackled
        // (and someone else is still standing to be turned on). It is as likely as CORRUPTION.BETRAYAL_WEIGHT says next to the biome's own weights.
        const entries = validPools.map((pool) => ({ weight: pool.weight, result: { id: pool.id } }));
        // In a party of players any player's shackled companion can turn (betrayerOwner: whose it is; null = this player's)
        const betrayer = CorruptionSystem.pickAnyBetrayer();
        if (betrayer) {
            entries.push({ weight: CORRUPTION.BETRAYAL_WEIGHT, result: { id: 'shackled_betrayal', context: { betrayerIndex: betrayer.idx, betrayerName: betrayer.name, betrayerOwner: betrayer.owner } } });
        }
        if (entries.length === 0) return null;
        // Perform a weighted random roll
        const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const entry of entries) {
            if (roll < entry.weight) {
                return entry.result;
            }
            roll -= entry.weight;
        }
        return null;
    }

    getBattleBackground(currentHour) {
        if (!this.battleBackgrounds) return null;
        const timeOfDay = this.getTimeOfDay(currentHour);
        return this.battleBackgrounds[timeOfDay];
    }

    getMusic(currentHour, isBattle = false) {
        if (!this.music) return null;
        if (isBattle) return this.music.battle;
        const timeOfDay = this.getTimeOfDay(currentHour);
        if (timeOfDay === 'night') {
            return this.music.night || this.music.day;
        }
        return this.music.day;
    }
}