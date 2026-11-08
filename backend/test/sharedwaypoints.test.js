// backend/test/sharedwaypoints.test.js: `npm test`. In a party of players the waypoints are shared: the world map lists the other players'
// beside this player's own (ids 'owner:n', named after their owner), and fast travel finds them by id.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../../shared/core/gameState.js';
import { WAYPOINT_SHARING, allWaypoints, findWaypoint, waypointName } from '../../shared/world/waypoints.js';

test('the party\'s waypoints are listed with this player\'s own, named after their owner, and found by id', () => {
    gameState.world.waypoints = [{ id: 1, col: 10, row: 20, biome: 'PLAINS', origin: 'ALTERIAN' }];
    const before = WAYPOINT_SHARING.others;
    try {
        assert.deepEqual(allWaypoints().map(w => w.id), [1], 'alone: only my own');
        WAYPOINT_SHARING.others = () => [{ owner: 'p2', ownerName: 'Guesty', waypoints: [{ id: 1, col: 300, row: -40, biome: 'SNOWY_MOUNTAINS' }, { id: 2, col: 5 }] }];
        const list = allWaypoints();
        assert.deepEqual(list.map(w => w.id), [1, 'p2:1'], 'theirs too (one without a row is skipped)');
        assert.equal(findWaypoint('p2:1').col, 300);
        assert.equal(findWaypoint(1).col, 10, 'mine by its own id');
        assert.equal(waypointName(findWaypoint('p2:1')), "Guesty's Waypoint 1 · Snowy Mountains");
        assert.equal(waypointName(findWaypoint(1)), 'Waypoint 1 · Plains');
        assert.equal(gameState.world.waypoints.length, 1, 'my own list is untouched');
    } finally {
        WAYPOINT_SHARING.others = before;
    }
});
