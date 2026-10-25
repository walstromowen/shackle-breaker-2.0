// frontend/src/screens/overworld/partyFollowers.js: the party members who walk behind the player on the overworld (the follower Pokemon of HeartGold / SoulSilver, only two of them).
//
// The party's first three members who are still on their feet (more than 0 hp) are on the map: the first is the player, the next two follow in a line behind. They are
// scenery with feet: not solid, no hitbox of their own, no light. This file holds the part that needs no browser:
//   PartyFollowers.lineup(members, hasSheet)   who is on the map, in walking order (the first one IS the player)
//   new PartyFollowers(tileSize).sync(player, dt, canStep)   works out where the followers stand and how they move, once per update
//
// The trail: the tiles the player has stood on, newest first. trail[0] is the tile the player is on (or is leaving, in the middle of a step), trail[1] the one before,
// and so on. The first follower stands on trail[1], the second on trail[2]. While the player is in the middle of a step, progress t (0..1), follower k is that same
// fraction of the way from trail[k] to trail[k - 1]: every one of them takes the same step at the same time, so the line moves as one and stops as one.
// The trail needs no hook into the player's movement: sync() looks at where the player is, and a new tile next to trail[0] is a step. Anything else (a warp, a door, a
// loaded game, a fall back to the start) is a jump: the trail is laid out again behind the player, on whatever free tiles lie there.

const DIRECTIONS = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };

const dirOf = (dx, dy) => (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP'));
const isDown = (m) => m && m.hp !== undefined && m.hp <= 0;

export class PartyFollowers {
    /** How many walk behind the player (the player is the first of the three). */
    static get COUNT() { return 2; }

    /**
     * The members on the map, in walking order: the first three who have more than 0 hp (and a sheet to be drawn from, when `hasSheet` is given).
     * With nobody on their feet the first member with a sheet stands in, so the player never vanishes.
     */
    static lineup(members, hasSheet = null) {
        const list = Array.isArray(members) ? members : [];
        const drawable = (m) => !!m && !!m.spriteOverworld && (!hasSheet || hasSheet(m.spriteOverworld));
        const out = list.filter(m => !isDown(m) && drawable(m)).slice(0, PartyFollowers.COUNT + 1);
        if (!out.length) {
            const any = list.find(drawable);
            if (any) out.push(any);
        }
        return out;
    }

    constructor(tileSize, count = PartyFollowers.COUNT) {
        this.T = tileSize;
        this.count = count;
        this.trail = null;     // [{ col, row }, ...], newest first
        this.entities = [];    // one per follower: the same fields MapRenderer.drawEntity reads from the player
        for (let k = 1; k <= count; k++) {
            this.entities.push({
                id: `follower_${k}`, isFollower: true, followerSlot: k,
                x: 0, y: 0, prevX: 0, prevY: 0,
                hitbox: { y: 0.5, h: 0.5 },   // the player's: they sort against trees and walls from the same line
                direction: 'DOWN', animState: 'idle', animPhase: 0, idleTimer: k * 0.37   // not breathing in step
            });
        }
    }

    /** Forget the trail: the next sync lays it out again behind the player. */
    reset() { this.trail = null; }

    /**
     * Lay the trail out behind a player standing on (col, row) and facing `direction`: one tile back for each follower while the tiles are free, the player's own tile
     * after that. `canStep(fromCol, fromRow, toCol, toRow, direction)` says whether a character can walk from one tile to the next (WorldManager.canMove); without it every tile is free.
     */
    layOut(col, row, direction, canStep = null) {
        direction = String(direction || 'DOWN').toUpperCase();   // a saved game may hold it in lower case
        const [dx, dy] = DIRECTIONS[direction] || DIRECTIONS.DOWN;
        const trail = [{ col, row }];
        for (let k = 1; k <= this.count; k++) {
            const prev = trail[k - 1];
            const next = { col: prev.col - dx, row: prev.row - dy };
            const free = !canStep || canStep(next.col, next.row, prev.col, prev.row, direction);
            trail.push(free ? next : { col: prev.col, row: prev.row });
        }
        this.trail = trail;
        for (let k = 1; k <= this.count; k++) {
            const e = this.entities[k - 1], t = trail[k];
            e.x = e.prevX = t.col * this.T;
            e.y = e.prevY = t.row * this.T;
            e.direction = direction;
            e.animState = 'idle';
            e.animPhase = 0;
        }
    }

    /**
     * Once per update, after the player has moved. `player` is the overworld's player entity (x, y in pixels; while it walks: isMoving, sourceX/Y, moveProgress, animState,
     * animPhase). Fills this.entities.
     */
    sync(player, dt = 0, canStep = null) {
        const T = this.T;
        const moving = !!player.isMoving;
        // the tile the player is on, or the one it is leaving in the middle of a step
        const col = Math.floor(Math.round(moving ? player.sourceX : player.x) / T);
        const row = Math.floor(Math.round(moving ? player.sourceY : player.y) / T);

        if (!this.trail) {
            this.layOut(col, row, player.direction, canStep);
        } else if (this.trail[0].col !== col || this.trail[0].row !== row) {
            const head = this.trail[0];
            if (Math.abs(head.col - col) + Math.abs(head.row - row) === 1) {
                this.trail.unshift({ col, row });                  // a step finished: the line moves up
                if (this.trail.length > this.count + 1) this.trail.length = this.count + 1;
            } else {
                this.layOut(col, row, player.direction, canStep);  // a jump: warp, door, loaded game
            }
        }

        const t = moving ? Math.max(0, Math.min(1, player.moveProgress || 0)) : 0;
        for (let k = 1; k <= this.count; k++) {
            const e = this.entities[k - 1];
            const from = this.trail[k], to = this.trail[k - 1];
            e.prevX = e.x;
            e.prevY = e.y;
            e.x = (from.col + (to.col - from.col) * t) * T;
            e.y = (from.row + (to.row - from.row) * t) * T;
            const walking = moving && (from.col !== to.col || from.row !== to.row);
            if (walking) {
                e.direction = dirOf(to.col - from.col, to.row - from.row);
                e.animState = player.animState === 'run' ? 'run' : 'walk';
                e.animPhase = player.animPhase || 0;               // the player's own cycle: they all keep the same step
                e.idleTimer = 0;
            } else {
                if (e.animState !== 'idle') { e.animState = 'idle'; e.animPhase = 0; e.idleTimer = k * 0.37; }
                e.idleTimer += dt;
            }
        }
        return this.entities;
    }
}
