import { gameState } from '../core/gameState.js';
import { MAP_OBJECTS_DEFINITIONS } from './mapObjectDefinitions.js';
import { isPlateau } from './biomeDefinitions.js';

/* WAYPOINTS - banners the party plants in the world (the Waypoint item) and fast-travels back to from the world map.
 *
 * A waypoint is a banner map object (one per origin, see ORIGINS: the player's origin decides which) standing on the tile in front of the player, plus an entry in gameState.world.waypoints ({ id, col, row, biome, origin }), which is what the map
 * lists and the save keeps (the banner itself is kept by the world's changes, like every other object a village or a player puts down). Only the overworld has them: not inside a cave
 * or a house.
 *
 * Fast travel costs currency and time, both by the straight-line distance in tiles between where the party stands and the waypoint:
 *     cost    = BASE_COST + ceil(tiles * PER_TILE + tiles^2 * PER_TILE_SQUARED)     (so a far waypoint costs more than its distance alone: 100 tiles 55, 500 tiles 335, 1000 tiles 910)
 *     minutes = ceil(tiles * MINUTES_PER_TILE)                                       (walking pace: a tile takes about half a game minute)
 */

export const ORIGINS = {
    ALTERIAN:  { tag: 'LANG_ALTERIAN',  objectId: 'WAYPOINT_BANNER_ALTERIAN',  sheet: 'objWaypointAlterian',  label: 'Alterian' },
    PANZERIAN: { tag: 'LANG_PANZERIAN', objectId: 'WAYPOINT_BANNER_PANZERIAN', sheet: 'objWaypointPanzerian', label: 'Panzerian' },
    NAMUH:     { tag: 'LANG_NAMUH',     objectId: 'WAYPOINT_BANNER_NAMUH',     sheet: 'objWaypointNamuh',     label: 'Namuh' },
};

/** The origin the player picked at the creator ('ALTERIAN' | 'PANZERIAN' | 'NAMUH'): the main character's LANG_ tag. Alterian when there is none (older saves). */
export function playerOrigin() {
    const hero = gameState.party && gameState.party.members && gameState.party.members[0];
    const tags = (hero && hero.tags) || [];
    for (const [key, o] of Object.entries(ORIGINS)) if (tags.includes(o.tag)) return key;
    return 'ALTERIAN';
}

/** The origin a waypoint belongs to; ones planted before banners had origins are Alterian. */
export function waypointOrigin(wp) {
    return wp && ORIGINS[wp.origin] ? wp.origin : 'ALTERIAN';
}

export const WAYPOINT = {
    OBJECT_ID: 'WAYPOINT_BANNER',
    ITEM_ID: 'waypoint',
    BASE_COST: 10,
    PER_TILE: 0.4,
    PER_TILE_SQUARED: 1 / 2000,
    MINUTES_PER_TILE: 0.5,
    MAX: 30,                      // waypoints a world can hold
};

const FRONT = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** The tile in front of a player at (col, row) facing `direction` ('up' | 'down' | 'left' | 'right', any case). */
export function frontTile(col, row, direction) {
    const d = FRONT[String(direction || 'down').toLowerCase()] || FRONT.down;
    return { col: col + d[0], row: row + d[1] };
}

export function getWaypoints(world = gameState.world) {
    if (!Array.isArray(world.waypoints)) world.waypoints = [];
    return world.waypoints;
}

/** Whole tiles between two spots, in a straight line. */
export function tilesBetween(a, b) {
    return Math.round(Math.hypot((a.col ?? a.x) - (b.col ?? b.x), (a.row ?? a.y) - (b.row ?? b.y)));
}

export function fastTravelCost(tiles) {
    const t = Math.max(0, tiles);
    return WAYPOINT.BASE_COST + Math.ceil(t * WAYPOINT.PER_TILE + t * t * WAYPOINT.PER_TILE_SQUARED);
}

export function fastTravelMinutes(tiles) {
    return Math.ceil(Math.max(0, tiles) * WAYPOINT.MINUTES_PER_TILE);
}

/** 95 -> "1h 35m", 40 -> "40m", 1500 -> "1d 1h". */
export function formatDuration(minutes) {
    const m = Math.max(0, Math.round(minutes));
    const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), r = m % 60;
    if (d) return h ? `${d}d ${h}h` : `${d}d`;
    if (h) return r ? `${h}h ${r}m` : `${h}h`;
    return `${r}m`;
}

/** What a fast travel from `from` ({ col, row } or { x, y }) to waypoint `wp` would take, and whether `currency` covers it. */
export function planFastTravel(from, wp, currency = gameState.party.currency || 0) {
    const tiles = tilesBetween(from, wp);
    const cost = fastTravelCost(tiles);
    return { tiles, cost, minutes: fastTravelMinutes(tiles), affordable: currency >= cost };
}

/* open ground for a banner: not water, not a cliff or the face of one, nothing solid standing there (a biome border does not matter) */
function open(wm, col, row) {
    const id = wm.getTileAt(col, row);
    if (id === wm.TILES.LAYER_0 || isPlateau(id)) return false;
    if (wm.isBlockedByFace(col, row) || wm.isCliffFace(col, row)) return false;
    return !wm.getSolidObjectAt(col, row);
}
/* dirt (level 1) and grass (level 2) are one walkable ground: a road never counts as a level of its own */
const ground = (elev) => Math.max(elev, 2);

/** Can a banner stand on (col, row)? `fromElevation` is the level the player stands on: the banner goes on the same level, on open ground. */
export function canPlaceWaypointAt(wm, col, row, fromElevation) {
    if (gameState.world.isInterior) return { ok: false, reason: 'A waypoint needs open ground: not in here.' };
    if (getWaypoints().length >= WAYPOINT.MAX) return { ok: false, reason: 'There are too many waypoints in the world already.' };
    if (!open(wm, col, row) || !open(wm, col, row - 1)) return { ok: false, reason: 'There is no room for a banner there.' };
    // something the world put there (a prop, a crop, a sign) is in the way; only a bit of ground cover (grass, a pebble, a flower) is trampled under the banner
    for (const r of [row, row - 1]) {
        const id = gameState.world.changes[col + ',' + r];
        const def = id && MAP_OBJECTS_DEFINITIONS[id];
        if (id && (!def || !def.isGround)) return { ok: false, reason: 'There is no room for a banner there.' };
    }
    if (fromElevation !== undefined && ground(wm.getElevation(col, row)) !== ground(fromElevation)) return { ok: false, reason: 'The banner has to stand on the ground you are on.' };
    if (wm._nearStair && wm._nearStair(col, row)) return { ok: false, reason: 'Not on a stair.' };
    if (getWaypoints().some((w) => w.col === col && w.row === row)) return { ok: false, reason: 'A banner already stands here.' };
    return { ok: true };
}

/** Plant a banner on (col, row): the object goes into the world (and its changes), the waypoint into the list. Returns { success, message, waypoint }. */
export function placeWaypoint(wm, col, row, fromElevation) {
    const check = canPlaceWaypointAt(wm, col, row, fromElevation);
    if (!check.ok) return { success: false, message: check.reason };
    const origin = playerOrigin();
    const objectId = ORIGINS[origin].objectId;
    wm.modifyWorld(col, row, objectId);
    wm._placeObject(col, row, objectId);
    const list = getWaypoints();
    const biome = wm.getBiomeAt ? wm.getBiomeAt(col, row) : null;
    const id = list.reduce((n, w) => Math.max(n, w.id), 0) + 1;
    const waypoint = { id, col, row, biome: (biome && biome.id) || null, origin };
    list.push(waypoint);
    return { success: true, message: 'You plant the banner. It will show on your map.', waypoint };
}

/** A name for a waypoint on the map: "Waypoint 3 · Snowy Mountains". */
export function waypointName(wp) {
    const biome = wp.biome ? String(wp.biome).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
    return `Waypoint ${wp.id}${biome ? ' · ' + biome : ''}`;
}

/** Pay for the fast travel and move the clock; returns the plan, or null when the party cannot pay. (Moving the party is the scene manager's job.) */
export function chargeFastTravel(plan) {
    const party = gameState.party;
    if ((party.currency || 0) < plan.cost) return null;
    party.currency -= plan.cost;
    return plan;
}

/** Where the party stands after a fast travel: the free tile nearest the banner, the one south of it (in front of it) first. */
export function landingTile(wm, wp) {
    const elev = wm.getElevation(wp.col, wp.row);
    for (let ring = 1; ring <= 4; ring++) {
        const spots = [];
        for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
            spots.push({ col: wp.col + dx, row: wp.row + dy, k: Math.abs(dx) * 2 + (dy > 0 ? 0 : 3) + Math.abs(dy) });
        }
        spots.sort((a, b) => a.k - b.k);
        const hit = spots.find((s) => open(wm, s.col, s.row) && ground(wm.getElevation(s.col, s.row)) === ground(elev));
        if (hit) return { col: hit.col, row: hit.row };
    }
    return { col: wp.col, row: wp.row + 1 };
}
