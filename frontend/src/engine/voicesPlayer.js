// frontend/src/engine/voicesPlayer.js
//
// The voices, heard (shared/story/voices.js has the rules): on the overworld, now and then, a whisper from one side or the other, and now and then
// words with it, drifting in at the edge of the screen on that side. The louder Dolos makes them (Voices.level), the more often, the louder, and the
// plainer the words. Silent while he has looked away.

import { gameState } from '../../../shared/core/gameState.js';
import { Voices } from '../../../shared/story/voices.js';
import { Dolos } from '../../../shared/story/dolos.js';
import { ActSystem } from '../../../shared/story/actSystem.js';
import { audioManager } from './audioManager.js';

export const WHISPER_SHOWN_MS = 5200;   // how long the words stay (fading in and out)

export class VoicesPlayer {
    constructor({ rand = Math.random, play = (v, r, p) => audioManager.playWhisper(v, r, p) } = {}) {
        this.rand = rand;
        this.play = play;
        this.wait = null;          // seconds until the next whisper
        this.current = null;       // { text, pan, level, born } the words on screen
        this.heard = 0;
    }

    /** Called every frame while the party walks the overworld. */
    update(dt, now = performance.now()) {
        if (this.current && now - this.current.born > WHISPER_SHOWN_MS) this.current = null;
        const level = Voices.level(gameState, ActSystem.isBloodMoon((gameState.world.time || 0) / 60));
        if (level <= 0) { this.wait = null; return; }
        if (this.wait === null) this.wait = Voices.nextWhisper(level, this.rand);
        this.wait -= dt;
        if (this.wait > 0) return;
        this.wait = Voices.nextWhisper(level, this.rand);
        this.whisper(level, now);
    }

    /** One whisper: heard from one side, at a pitch of its own; and now and then (more often when they are loud) words on that side. */
    whisper(level, now = performance.now()) {
        const pan = (this.rand() < 0.5 ? -1 : 1) * (0.35 + 0.65 * this.rand());
        this.play(0.12 + 0.55 * level, 0.8 + 0.4 * this.rand(), pan);
        this.heard++;
        if (!this.current && this.rand() < 0.25 + 0.5 * level) {
            const text = Voices.line(level, this.rand, Dolos.named());
            if (text) this.current = { text, pan, level, born: now };
        }
    }

    /** The words on screen now, with how far they have come (0..1), for the overworld's renderer; null when nothing is said. */
    shown(now = performance.now()) {
        if (!this.current) return null;
        return { ...this.current, t: Math.min(1, (now - this.current.born) / WHISPER_SHOWN_MS) };
    }
}
