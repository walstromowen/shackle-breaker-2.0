import { gameState } from '../core/gameState.js';

/* MAP MARKERS - pins the player puts on their own map (the world map screen: the Add Marker button or K), to find a place again. They mark nothing
 * in the world itself: no object, nothing another player sees. Each is { id, col, row, color, label, map }: `map` is null on the overworld, or the
 * interior's map id when it was put on a cave's or a house's map (it shows only on that map). They live in gameState.world.mapMarkers, which the
 * save keeps with the player (like the waypoints), not with a shared world.
 */

export const MARKER_COLORS = [
    { id: 'red',    fill: '#d9493a', label: 'Red' },
    { id: 'gold',   fill: '#e8c04a', label: 'Gold' },
    { id: 'green',  fill: '#5fbf5a', label: 'Green' },
    { id: 'blue',   fill: '#4a9de8', label: 'Blue' },
    { id: 'violet', fill: '#b06ae8', label: 'Violet' },
];
export const MARKER_MAX = 50;

export function markerColor(m) {
    return MARKER_COLORS.find(c => c.id === (m && m.color)) || MARKER_COLORS[0];
}

export function getMarkers(world = gameState.world) {
    if (!Array.isArray(world.mapMarkers)) world.mapMarkers = [];
    return world.mapMarkers;
}

/** The markers on one map: the overworld (mapId null) or an interior's. */
export function markersOn(mapId = null, world = gameState.world) {
    return getMarkers(world).filter(m => (m.map || null) === (mapId || null));
}

export function findMarker(id, world = gameState.world) {
    return getMarkers(world).find(m => m.id === id) || null;
}

/** A new marker on the tile (col, row) of a map; null when the map is full or a marker is already on that tile. It takes the colour after the last one's. */
export function addMarker(col, row, { mapId = null, color = null } = {}, world = gameState.world) {
    const list = getMarkers(world);
    col = Math.floor(col); row = Math.floor(row);
    if (!Number.isFinite(col) || !Number.isFinite(row) || list.length >= MARKER_MAX) return null;
    if (list.some(m => m.col === col && m.row === row && (m.map || null) === (mapId || null))) return null;
    const id = list.reduce((n, m) => Math.max(n, m.id), 0) + 1;
    const last = list[list.length - 1];
    const next = color || (last ? MARKER_COLORS[(MARKER_COLORS.findIndex(c => c.id === last.color) + 1) % MARKER_COLORS.length].id : MARKER_COLORS[0].id);
    const m = { id, col, row, color: next, label: `Marker ${id}`, map: mapId || null };
    list.push(m);
    return m;
}

export function removeMarker(id, world = gameState.world) {
    const list = getMarkers(world);
    const i = list.findIndex(m => m.id === id);
    if (i < 0) return false;
    list.splice(i, 1);
    return true;
}

/** The marker's next colour (round MARKER_COLORS); the marker, or null. */
export function cycleMarkerColor(id, world = gameState.world) {
    const m = findMarker(id, world);
    if (!m) return null;
    m.color = MARKER_COLORS[(MARKER_COLORS.findIndex(c => c.id === m.color) + 1) % MARKER_COLORS.length].id;
    return m;
}
