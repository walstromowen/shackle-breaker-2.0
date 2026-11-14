// frontend/src/engine/voicesPlayer.js
//
// The voices, heard (shared/story/voices.js has the rules): on the overworld, now and then, a whisper from one side or the other, at a pitch of its
// own. The louder Dolos makes them (Voices.level), the more often and the louder. Silent while he has looked away. Sound only: nothing is drawn.

import { gameState } from '../../../shared/core/gameState.js';
import { Voices } from '../../../shared/story/voices.js';
import { ActSystem } from '../../../shared/story/actSystem.js';
import { audioManager } from './audioManager.js';

export class VoicesPlayer {
    constructor({ rand = Math.random, play = (v, r, p) => audioManager.playWhisper(v, r, p) } = {}) {
        this.rand = rand;
        this.play = play;
        this.wait = null;          // seconds until the next whisper
        this.heard = 0;
    }

    /** Called every frame while the party walks the overworld. */
    update(dt) {
        const level = Voices.level(gameState, ActSystem.isBloodMoon((gameState.world.time || 0) / 60));
        if (level <= 0) { this.wait = null; return; }
        if (this.wait === null) this.wait = Voices.nextWhisper(level, this.rand);
        this.wait -= dt;
        if (this.wait > 0) return;
        this.wait = Voices.nextWhisper(level, this.rand);
        this.whisper(level);
    }

    /** One whisper: from one side or the other, at a pitch of its own, louder the louder the voices are. */
    whisper(level) {
        const pan = (this.rand() < 0.5 ? -1 : 1) * (0.35 + 0.65 * this.rand());
        this.play(0.12 + 0.55 * level, 0.8 + 0.4 * this.rand(), pan);
        this.heard++;
    }
}
