// shared/core/multiplayerParty.js: who fights when several players are in one party (multiplayer).
//
// Two players: the first three of each party on their feet. Three players: the first two of each. When a party has fewer than its share,
// the others' next members take the empty places, so the line-up is as full as it can be (six at most). The line-up alternates between the
// players (A1, B1, A2, B2, ...), so the three who open the fight belong to different players.

export const MAX_LINEUP = 6;

/**
 * @param {Array<{ id: string, members: Array<{ alive: boolean }> }>} players  in party order (the leader first)
 * @returns {Array<{ owner: string, idx: number }>}  idx = the member's place in that player's own party
 */
export function buildLineup(players, cap = MAX_LINEUP) {
    const list = (players || []).filter(p => p && Array.isArray(p.members));
    if (!list.length) return [];
    const share = list.length >= 3 ? 2 : list.length === 2 ? 3 : cap;
    const standing = list.map(p => p.members.map((m, idx) => ({ owner: p.id, idx, alive: !!(m && m.alive) })).filter(x => x.alive));
    const picked = standing.map(s => s.slice(0, share));
    let total = picked.reduce((n, p) => n + p.length, 0);
    // a party short of its share: the others' next members step in, one player at a time
    while (total < cap) {
        let added = false;
        for (let k = 0; k < list.length && total < cap; k++) {
            if (standing[k].length > picked[k].length) { picked[k].push(standing[k][picked[k].length]); total++; added = true; }
        }
        if (!added) break;
    }
    const out = [];
    const longest = Math.max(...picked.map(p => p.length));
    for (let r = 0; r < longest; r++) for (let k = 0; k < picked.length; k++) if (picked[k][r]) out.push({ owner: picked[k][r].owner, idx: picked[k][r].idx });
    return out.slice(0, cap);
}
