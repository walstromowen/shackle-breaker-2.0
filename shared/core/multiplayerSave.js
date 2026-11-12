// shared/core/multiplayerSave.js: a save, split between the world everyone shares and what belongs to one player.
//
// In multiplayer each player's browser runs the game with that player's own party; the host's browser holds the shared world. A save's
// `data` (frontend/src/engine/saveManager.js createSnapshot) is cut along that line:
//   worldPart(data)       what everyone in the world sees alike: the seed, difficulty, the clock, every change made to the map, shops
//   playerPart(data)      what is one player's own: party, inventory, purse, position, quests, story progress, banners, explored map
//   mergeParts(w, p)      the two put back together as one `data` that SaveManager.applySnapshot can load
// The host keeps each guest's player part in its own save, under data.multiplayer.guests[accountId] (like a Minecraft world keeps every
// player who has visited it), so a guest who comes back finds their characters where they left them, and the host can play the world alone.

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/** The overworld seed, also when the save was made inside a house or cave (data.seed is then the interior's shifted seed). */
export function overworldSeed(data) {
    const inside = data && data.world && data.world.interior && data.world.interior.savedOverworld;
    return inside && typeof inside.seed === 'number' ? inside.seed : data.seed;
}

export function worldPart(data) {
    const w = data.world || {};
    return clone({
        seed: overworldSeed(data),
        difficulty: data.difficulty || 'normal',
        cheats: data.cheats === true,
        shops: data.shops || {},
        world: {
            time: w.time,
            day: w.day,
            changes: w.changes || {},
            terrainOverrides: w.terrainOverrides || {},
            villageStairs: w.villageStairs || [],
            levelPaths: w.levelPaths || {},
            structureChunks: w.structureChunks,
            weather: w.weather || null,
            strangerHome: w.strangerHome || null,   // the one workshop the Hooded Stranger lives in: the host's world decides it for everyone
            strangerDesertHome: w.strangerDesertHome || null,   // and the others of InteriorFactory.STORY_HOMES
            nikoliCampfire: w.nikoliCampfire || null,
            jaegerCatacomb: w.jaegerCatacomb || null,
            strangerSnowHome: w.strangerSnowHome || null,
        },
    });
}

export function playerPart(data) {
    const w = data.world || {};
    return clone({
        seed: data.seed,   // only used when the player is inside a house or cave (the interior's seed)
        milestones: data.milestones || [],
        quests: data.quests || { active: {}, completed: [], trackedIds: [] },
        player: data.player,
        party: data.party,
        world: {
            currentBiome: w.currentBiome || null,
            waypoints: w.waypoints || [],
            discoveredChunks: w.discoveredChunks || [],
            interior: w.interior || null,
        },
    });
}

/** One loadable `data` from a world part and a player part. */
export function mergeParts(world, player) {
    const interior = player.world && player.world.interior && player.world.interior.savedOverworld ? clone(player.world.interior) : null;
    if (interior) interior.savedOverworld.seed = world.seed;   // the house or cave is in THIS world
    return clone({
        seed: interior && typeof player.seed === 'number' ? player.seed : world.seed,
        difficulty: world.difficulty,
        cheats: world.cheats === true,
        milestones: player.milestones || [],
        quests: player.quests,
        player: player.player,
        world: {
            ...world.world,
            currentBiome: player.world ? player.world.currentBiome : null,
            waypoints: player.world ? player.world.waypoints : [],
            discoveredChunks: player.world ? player.world.discoveredChunks : [],
            interior,
        },
        party: player.party,
        shops: world.shops || {},
    });
}

/** A player part with its position moved to (col, row) on the overworld, out of any house or cave (a new guest, or one placed by the host). */
export function placeOnOverworld(player, col, row, direction = 'DOWN') {
    const p = clone(player);
    p.player = { ...(p.player || {}), col, row, direction };
    p.world = { ...(p.world || {}), interior: null };
    return p;
}
