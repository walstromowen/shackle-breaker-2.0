// frontend/src/auth/cloudSaveStore.js
//
// The SaveStore for a logged-in player (see SaveManager.setStore). The game never waits for the network:
//   write  -> the browser copy is written first (instant, and safe even when the tab is closing), then the server copy follows in the background
//   read   -> asks the server; if it cannot be reached the browser copy is used; if both exist the NEWER one wins
//   so playing offline (or while a free server is still waking up) loses nothing: the next read/write catches the server up.
import { createLocalSaveStore } from '../../../shared/systems/saveManager.js';
import { AuthService, ApiError } from './authService.js';

const timeOf = (save) => (save && Date.parse(save.savedAt)) || 0;

export class HybridSaveStore {
    constructor(user) {
        this.userId = user.id;
        this.local = createLocalSaveStore(`shackle-breaker:save:${user.id}:`);

        /* 'idle' | 'ok' | 'failed' | 'auth': what happened to the last server call. 'auth' = the server no longer accepts this login. */
        this.syncStatus = 'idle';
        this._pending = new Map();    // slot -> newest save waiting to be sent
        this._sending = new Set();    // slots with a request in flight
    }

    // ---------------------------------------------------------------------------------------------------------------------
    async list() {
        const merged = new Map();
        for (const entry of await this.local.list()) merged.set(entry.slot, entry);
        try {
            const { saves } = await AuthService.request('GET', '/api/saves');
            this._mark('ok');
            for (const entry of saves) {
                const mine = merged.get(entry.slot);
                if (!mine || Date.parse(entry.savedAt) > timeOf(mine)) merged.set(entry.slot, entry);
            }
        } catch (e) {
            this._markFailure(e);
        }
        return [...merged.values()].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
    }

    async read(slot) {
        const local = await this.local.read(slot);

        let remote = null;
        let reached = false;
        try {
            const result = await AuthService.request('GET', `/api/saves/${encodeURIComponent(slot)}`);
            remote = result.save;
            reached = true;
            this._mark('ok');
        } catch (e) {
            if (e instanceof ApiError && e.status === 404) { reached = true; this._mark('ok'); }   // reachable, just no save there yet
            else this._markFailure(e);
        }

        if (remote && timeOf(remote) >= timeOf(local)) {
            await this.local.write(slot, remote);      // keep the browser copy current
            return remote;
        }
        if (local && reached && timeOf(local) > timeOf(remote)) this._queue(slot, local);   // progress made offline: catch the server up
        return local || remote || null;
    }

    async write(slot, save) {
        const saved = await this.local.write(slot, save);   // synchronous inside: lands even if the page is closing right now
        this._queue(slot, save);
        return saved;
    }

    async remove(slot) {
        const ok = await this.local.remove(slot);
        this._pending.delete(slot);
        AuthService.request('DELETE', `/api/saves/${encodeURIComponent(slot)}`).then(() => this._mark('ok'), (e) => this._markFailure(e));
        return ok;
    }

    // ---------------------------------------------------------------------------------------------------------------------
    /* Sends the newest save of a slot; saves that arrive while one is in flight replace each other (only the last one matters). */
    _queue(slot, save) {
        this._pending.set(slot, save);
        this._flush(slot);
    }

    async _flush(slot) {
        if (this._sending.has(slot) || !this._pending.has(slot)) return;
        this._sending.add(slot);
        try {
            while (this._pending.has(slot)) {
                const save = this._pending.get(slot);
                this._pending.delete(slot);
                try {
                    await AuthService.request('PUT', `/api/saves/${encodeURIComponent(slot)}`, { body: { save } });
                    this._mark('ok');
                } catch (e) {
                    // 409: the server already has a newer save of this slot (played on another device). Keep it; the next read() pulls it down.
                    if (e instanceof ApiError && e.status === 409) { this._mark('ok'); continue; }
                    this._markFailure(e);
                    break;     // the next autosave tries again
                }
            }
        } finally {
            this._sending.delete(slot);
        }
    }

    _mark(status) { this.syncStatus = status; }

    _markFailure(error) {
        const status = error instanceof ApiError && error.status === 401 ? 'auth' : 'failed';
        if (status !== this.syncStatus) console.warn(`[CloudSaveStore] ${status === 'auth' ? 'The server no longer accepts this login' : 'Could not reach the server'}: saves are kept on this device. (${error.message})`);
        this.syncStatus = status;
    }
}
