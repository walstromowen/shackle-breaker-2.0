/**
 * frontend/src/controllers/saves/savesController.js
 *
 * The Saves screen: a list of the player's saved games.
 *   - opened from the overworld's System button (mode 'game'): a "Save Game" tab (new named save, or overwrite one) and a "Load Game" tab,
 *     plus "Quit to Title"
 *   - opened from the title screen's Load Game (mode 'title'): the "Load Game" tab only
 * Saves live in the SaveStore (SaveManager): the browser, plus the player's account on the server when logged in.
 */
import { BaseController } from '../core/baseController.js';
import { events } from '../../core/eventBus.js';
import { UI_SFX } from '../../ui/uiSfx.js';
import { ScrollManager } from '../../ui/scrollManager.js';
import { TextEntry } from '../../../../shared/utils/textEntry.js';
import {
    SaveManager, AUTOSAVE_SLOT, BACKUP_SLOT, MAX_MANUAL_SAVES, MAX_SAVE_NAME, SAVE_NAME_KEY_PATTERN, isManualSlot
} from '../../../../shared/systems/saveManager.js';

const NEW_ROW = 'row_new';          // the "+ New Save" row at the top of the Save tab
const rowIdOf = (slot) => `row_${slot}`;

export class SavesController extends BaseController {
    constructor(input) {
        super(input);

        this.screenWidth = 1920;
        this.screenHeight = 1080;
        this.layout = {
            p: 48, panelY: 48, panelH: 888,
            leftW: 1004, rightW: 788, gap: 32,
            tabH: 64, rowH: 108, btnH: 76
        };

        this.scrollManager = new ScrollManager();
        this.scrollManager.registerZone('saveList', { viewportH: 700, maxScroll: 0 });

        this.mode = 'title';            // 'game' | 'title'
        this.tab = 'load';              // 'save' | 'load'
        this.entries = [];              // [{ slot, summary, savedAt }] from the store
        this.loading = true;
        this.busy = false;              // a save / load / delete is under way: ignore further clicks
        this.selectedId = null;         // row id (rowIdOf(slot) or NEW_ROW)
        this.kbFocus = null;            // the keyboard cursor (any hitbox id)
        this.pending = null;            // { type: 'delete' | 'overwrite', slot }: waiting for the second click
        this.notice = null;             // { text, kind: 'ok' | 'error' }

        this.nameInput = new TextEntry('', MAX_SAVE_NAME, SAVE_NAME_KEY_PATTERN);
        this.isEditingName = false;

        this.rows = [];                 // what the list shows right now (rebuilt by _buildRows)
        this.availableButtons = [];

        // O (the System key) closes the screen like Esc; while the name box is open it takes every key
        this.extraBindings = { KeyO: 'CANCEL' };

        events.on('LOAD_FAILED', ({ error }) => {
            if (!this.active) return;
            this.busy = false;
            this._say(error || 'The save could not be loaded.', 'error');
            this.playErrorSound();
        });
        this.active = false;

        this.updateHitboxes([]);
    }

    /** Called by SceneManager each time the screen opens. data: { mode: 'game' | 'title', tab? } */
    init(data = {}) {
        this.active = true;
        this.mode = data.mode === 'game' ? 'game' : 'title';
        const canSave = this.mode === 'game';
        this.tab = data.tab === 'load' || !canSave ? 'load' : 'save';
        this.busy = false;
        this.pending = null;
        this.notice = null;
        this.isEditingName = false;
        this.nameInput.reset('');
        this.selectedId = null;
        this.kbFocus = null;
        this.hoveredHitboxId = null;
        this.scrollManager.resetAllScrolls();
        this.startInKeyboardMode();
        this.entries = [];
        this.loading = true;
        this._refresh().then(() => {
            // open with the newest relevant row selected, so Enter does something useful straight away
            this.selectedId = this.rows.length ? this.rows[0].id : null;
            if (this.tab === 'save') this.selectedId = NEW_ROW;
            this.kbFocus = this.selectedId;
        });
    }

    // ========================================================
    // DATA
    // ========================================================
    async _refresh() {
        this.loading = true;
        try {
            this.entries = await SaveManager.list();
        } catch (e) {
            console.warn('[SavesController] Could not list the saves:', e);
            this.entries = [];
        }
        this.loading = false;
        this._buildRows();
    }

    _buildRows() {
        const byTimeDesc = (a, b) => String(b.savedAt).localeCompare(String(a.savedAt));
        const manual = this.entries.filter(e => isManualSlot(e.slot)).sort(byTimeDesc);

        if (this.tab === 'save') {
            this.rows = [
                { id: NEW_ROW, type: 'new' },
                ...manual.map(e => ({ id: rowIdOf(e.slot), type: 'manual', slot: e.slot, entry: e }))
            ];
        } else {
            const auto = this.entries.find(e => e.slot === AUTOSAVE_SLOT);
            const prev = this.entries.find(e => e.slot === BACKUP_SLOT);
            const others = this.entries.filter(e => e.slot !== AUTOSAVE_SLOT && e.slot !== BACKUP_SLOT && !isManualSlot(e.slot)).sort(byTimeDesc);
            this.rows = [
                ...(auto ? [{ id: rowIdOf(auto.slot), type: 'auto', slot: auto.slot, entry: auto }] : []),
                ...manual.map(e => ({ id: rowIdOf(e.slot), type: 'manual', slot: e.slot, entry: e })),
                ...others.map(e => ({ id: rowIdOf(e.slot), type: 'other', slot: e.slot, entry: e })),
                ...(prev ? [{ id: rowIdOf(prev.slot), type: 'previous', slot: prev.slot, entry: prev }] : [])
            ];
        }
        if (this.selectedId && !this.rows.some(r => r.id === this.selectedId)) {
            this.selectedId = this.rows.length ? this.rows[0].id : null;
        }
        if (this.kbFocus && this.kbFocus.startsWith('row_') && !this.rows.some(r => r.id === this.kbFocus)) {
            this.kbFocus = this.selectedId;
        }
    }

    _rowById(id) { return this.rows.find(r => r.id === id) || null; }
    _say(text, kind = 'ok') { this.notice = text ? { text, kind } : null; }

    // ========================================================
    // FOCUS (shared standard, see BaseController)
    // ========================================================
    getKeyboardFocusId() { return this.kbFocus; }

    setFocusFromPointer(hitboxId) {
        this.kbFocus = hitboxId;
    }

    // ========================================================
    // ACTIONS
    // ========================================================
    _switchTab(tab) {
        if (tab === this.tab) return;
        if (tab === 'save' && this.mode !== 'game') return;
        this.tab = tab;
        this.pending = null;
        this.isEditingName = false;
        this.notice = null;
        this.scrollManager.setOffset('saveList', 0, true);
        this._buildRows();
        this.selectedId = this.tab === 'save' ? NEW_ROW : (this.rows[0] ? this.rows[0].id : null);
    }

    _select(rowId) {
        if (this.selectedId !== rowId) {
            this.pending = null;
            this.isEditingName = false;
            this.notice = null;
        }
        this.selectedId = rowId;
    }

    _scrollToRow(rowId) {
        const index = this.rows.findIndex(r => r.id === rowId);
        const zone = this.scrollManager.zones.get('saveList');
        if (index < 0 || !zone) return;
        const top = index * this.layout.rowH;
        if (top < zone.offset) this.scrollManager.setOffset('saveList', top, true);
        else if (top + this.layout.rowH > zone.offset + zone.viewportH) this.scrollManager.setOffset('saveList', top + this.layout.rowH - zone.viewportH, true);
    }

    async _doSave(row) {
        if (this.busy) return;
        this.busy = true;
        this.isEditingName = false;
        this._say('Saving...', 'ok');

        const result = row.type === 'new'
            ? await SaveManager.saveManual(this.nameInput.value)
            : await SaveManager.saveManual(row.entry.summary?.saveName || '', row.slot);   // overwriting keeps the name

        this.busy = false;
        if (!result.ok) {
            this._say(result.error, 'error');
            this.playErrorSound();
            return;
        }
        this.playSfx(UI_SFX.success, 0.8);
        this.nameInput.reset('');
        await this._refresh();
        this.selectedId = rowIdOf(result.slot);
        this.kbFocus = this.selectedId;
        this._scrollToRow(this.selectedId);
        this._say(`Saved as "${result.name}".`, 'ok');
    }

    _doLoad(row) {
        if (this.busy) return;
        this.busy = true;
        this._say('Loading...', 'ok');
        // SceneManager restores the save and enters the overworld; a failure comes back as LOAD_FAILED
        events.emit('LOAD_GAME', { slot: row.slot, fromGame: this.mode === 'game' });
    }

    async _doDelete(row) {
        if (this.busy) return;
        this.busy = true;
        const ok = await SaveManager.deleteSlot(row.slot);
        this.busy = false;
        this.pending = null;
        await this._refresh();
        if (ok) { this.playSfx(UI_SFX.success, 0.6); this._say('Save deleted.', 'ok'); }
        else { this.playErrorSound(); this._say('The save could not be deleted.', 'error'); }
        this.kbFocus = this.selectedId;
    }

    _quitToTitle() {
        if (this.busy) return;
        this.busy = true;
        this.playConfirmSound();
        // keep the latest position before leaving (does nothing inside a building)
        SaveManager.autosave().finally(() => events.emit('CHANGE_SCENE', { scene: 'title' }));
    }

    _exit() {
        this.active = false;
        events.emit('CHANGE_SCENE', this.mode === 'game' ? { scene: 'overworld' } : { scene: 'title' });
    }

    // ---- the two-step buttons: first click arms ("Really delete?"), second click does it --------------------------------------
    _armOrRun(type, row, run) {
        if (this.pending && this.pending.type === type && this.pending.slot === row.slot) {
            this.pending = null;
            run();
        } else {
            this.pending = { type, slot: row.slot };
            this.playNavSound();
            this._say(type === 'delete' ? 'Click again to delete this save for good.' : 'Click again to overwrite this save.', 'error');
        }
    }

    // ========================================================
    // INPUT
    // ========================================================
    onClick(hitboxId, fromKeyboard = false) {
        if (!hitboxId || this.busy && hitboxId !== 'btn_back') return;

        // Clicking anywhere but the name box ends typing
        if (this.isEditingName && hitboxId !== 'input_name') this.isEditingName = false;
        // Anything but its own button disarms a pending delete / overwrite
        if (this.pending && hitboxId !== 'btn_delete' && hitboxId !== 'btn_primary') this.pending = null;

        if (!fromKeyboard) this.kbFocus = hitboxId;

        if (hitboxId === 'tab_save' || hitboxId === 'tab_load') {
            if (hitboxId === 'tab_save' && !this._canSaveNow()) { this.playErrorSound(); return; }
            this.playConfirmSound();
            this._switchTab(hitboxId === 'tab_save' ? 'save' : 'load');
        } else if (hitboxId.startsWith('row_')) {
            this.playConfirmSound();
            this._select(hitboxId);
            if (hitboxId === NEW_ROW && fromKeyboard) this.isEditingName = true;
        } else if (hitboxId === 'input_name') {
            this.playConfirmSound();
            this.isEditingName = true;
        } else if (hitboxId === 'btn_primary') {
            this._onPrimary();
        } else if (hitboxId === 'btn_delete') {
            const row = this._rowById(this.selectedId);
            if (row && row.slot && row.slot !== AUTOSAVE_SLOT) this._armOrRun('delete', row, () => { this.playConfirmSound(); this._doDelete(row); });
        } else if (hitboxId === 'btn_back') {
            this.playCancelSound();
            this._exit();
        } else if (hitboxId === 'btn_settings') {
            this.playConfirmSound();
            this.active = false;
            events.emit('CHANGE_SCENE', { scene: 'settings', data: { from: 'game' } });
        } else if (hitboxId === 'btn_quit_title') {
            this._quitToTitle();
        }
    }

    _onPrimary() {
        const row = this._rowById(this.selectedId);
        if (!row) { this.playErrorSound(); return; }
        if (this.tab === 'load') {
            this.playConfirmSound();
            this._doLoad(row);
        } else if (row.type === 'new') {
            this.playConfirmSound();
            this._doSave(row);
        } else {
            this._armOrRun('overwrite', row, () => { this.playConfirmSound(); this._doSave(row); });
        }
    }

    onRightClick() {
        this._back();
    }

    /** Back, one layer at a time: stop typing -> drop a pending delete -> leave the screen. */
    _back() {
        if (this.isEditingName) { this.isEditingName = false; this.playCancelSound(); return; }
        if (this.pending) { this.pending = null; this._say(null); this.playCancelSound(); return; }
        this.playCancelSound();
        this._exit();
    }

    _canSaveNow() { return this.mode === 'game' && SaveManager.canSaveNow(); }

    handleKeyDown(code, e) {
        // While the name box is open it takes every key (WASD must type, not move)
        if (this.isEditingName) {
            this.noteKeyboardInput();
            if (e.code === 'Enter') {
                const row = this._rowById(this.selectedId);
                this.isEditingName = false;
                if (row && row.type === 'new') { this.playConfirmSound(); this._doSave(row); }
            } else if (e.code === 'Escape') {
                this.isEditingName = false;
                this.playCancelSound();
            } else {
                if (e.key === ' ' && e.preventDefault) e.preventDefault();
                this.nameInput.handleEvent(e);
            }
            return;
        }

        const intent = this.resolveIntent(code, e);
        if (!intent) return;
        if (intent === 'CANCEL') { this._back(); return; }

        const focus = this.kbFocus && this.getHitboxes().some(h => h.id === this.kbFocus) ? this.kbFocus : (this.selectedId || null);

        if (intent === 'CONFIRM') {
            if (focus) this.onClick(focus, true);
            return;
        }

        // The list moves row by row (and scrolls); everything else moves to the nearest element in that direction
        if (focus && focus.startsWith('row_')) {
            const index = this.rows.findIndex(r => r.id === focus);
            if (intent === 'DOWN' && index < this.rows.length - 1) { this._moveToRow(this.rows[index + 1].id); return; }
            if (intent === 'UP' && index > 0) { this._moveToRow(this.rows[index - 1].id); return; }
        }
        const next = this.findSpatialNeighbor(intent, focus);
        if (next && next !== focus) {
            this.kbFocus = next;
            if (next.startsWith('row_')) this._moveToRow(next);
            this.playNavSound();
        }
    }

    _moveToRow(rowId) {
        this._select(rowId);
        this.kbFocus = rowId;
        this._scrollToRow(rowId);
        this.playNavSound();
    }

    handleScroll(delta) {
        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta * 2);
    }

    update(dt) {
        this.scrollManager.update(dt);
    }

    onDragStart(hitboxId) {
        if (hitboxId === 'SCROLL_THUMB_SAVES') this.scrollManager.handleDragStart(hitboxId, this.mouse.y);
    }
    onDragMove(x, y) {
        if (this.scrollManager.isDragging) this.scrollManager.handleDragMove(y);
    }
    onDrop() {
        if (this.scrollManager.isDragging) this.scrollManager.handleDragEnd();
    }

    // ========================================================
    // STATE for the renderer (also builds the hitboxes)
    // ========================================================
    getState() {
        const L = this.layout;
        const hitboxes = [];
        const leftX = L.p;
        const rightX = L.p + L.leftW + L.gap;
        const canSaveTab = this.mode === 'game';

        // tabs
        const tabW = (L.leftW - 48 - 16) / (canSaveTab ? 2 : 1);
        const tabY = L.panelY + 24;
        if (canSaveTab) hitboxes.push({ id: 'tab_save', x: leftX + 24, y: tabY, w: tabW, h: L.tabH, zIndex: 10 });
        hitboxes.push({ id: 'tab_load', x: leftX + 24 + (canSaveTab ? tabW + 16 : 0), y: tabY, w: tabW, h: L.tabH, zIndex: 10 });

        // list
        const footerY = L.panelY + L.panelH + 20;        // the bottom row, under the panels: Back sits in the standard bottom-left corner
        const listY = tabY + L.tabH + 40;
        const listH = L.panelY + L.panelH - 24 - listY;
        const offset = this.scrollManager.getOffset('saveList');
        this.rows.forEach((row, i) => {
            const y = listY + i * L.rowH - offset;
            if (y + L.rowH > listY - 4 && y < listY + listH + 4) {
                hitboxes.push({ id: row.id, x: leftX + 24, y, w: L.leftW - 48 - 28, h: L.rowH - 8, zIndex: 10 });
            }
        });
        const totalH = this.rows.length * L.rowH;
        const zone = this.scrollManager.zones.get('saveList');
        zone.viewportH = listH;
        zone.maxScroll = Math.max(0, totalH - listH);
        zone.bounds = { x: leftX, y: listY, w: L.leftW, h: listH };

        // footer buttons (left panel)
        hitboxes.push({ id: 'btn_back', x: 48, y: footerY, w: 300, h: L.btnH, zIndex: 10 });
        if (this.mode === 'game') {
            hitboxes.push({ id: 'btn_settings', x: 48 + 300 + 24, y: footerY, w: 240, h: L.btnH, zIndex: 10 });
            hitboxes.push({ id: 'btn_quit_title', x: 48 + 300 + 24 + 240 + 24, y: footerY, w: 360, h: L.btnH, zIndex: 10 });
        }

        // right panel: the row shown (the hovered row previews in mouse mode, like the journal), its buttons and the name box
        let shownId = this.selectedId;
        if (this.inputMode === 'mouse' && this.hoveredHitboxId && this.hoveredHitboxId.startsWith('row_')) shownId = this.hoveredHitboxId;
        const shown = this._rowById(shownId);
        const selected = this._rowById(this.selectedId);

        const buttons = [];
        let nameBox = null;
        if (selected) {
            const btnW = 340;
            const btnY = L.panelY + L.panelH - 24 - 84;
            const canDelete = selected.slot && selected.slot !== AUTOSAVE_SLOT;
            const primaryLabel = this.tab === 'load' ? 'Load'
                : selected.type === 'new' ? 'Save'
                : (this.pending && this.pending.type === 'overwrite' && this.pending.slot === selected.slot ? 'Really Overwrite?' : 'Overwrite');
            const rowW = canDelete ? btnW * 2 + 24 : btnW;
            const startX = rightX + (L.rightW - rowW) / 2;
            buttons.push({ id: 'btn_primary', x: startX, y: btnY, w: btnW, h: 84, label: primaryLabel });
            if (canDelete) {
                const deleteLabel = this.pending && this.pending.type === 'delete' && this.pending.slot === selected.slot ? 'Really Delete?' : 'Delete';
                buttons.push({ id: 'btn_delete', x: startX + btnW + 24, y: btnY, w: btnW, h: 84, label: deleteLabel });
            }
            if (this.tab === 'save' && selected.type === 'new') {
                nameBox = { id: 'input_name', x: rightX + 48, y: btnY - 24 - 84 - 24, w: L.rightW - 96, h: 84 };
                hitboxes.push({ ...nameBox, zIndex: 10 });
            }
            buttons.forEach(b => hitboxes.push({ id: b.id, x: b.x, y: b.y, w: b.w, h: b.h, zIndex: 10 }));
        }
        this.availableButtons = buttons;

        // the scrollbar thumb is a drag target (same maths as CanvasUI.drawScrollbar)
        if (zone.maxScroll > 0) {
            const thumbH = Math.max(36, Math.min(listH, listH * (listH / totalH)));
            const thumbY = listY + (listH - thumbH) * Math.max(0, Math.min(1, offset / zone.maxScroll));
            hitboxes.push({ id: 'SCROLL_THUMB_SAVES', x: leftX + L.leftW - 24 - 14, y: thumbY, w: 14, h: thumbH, zIndex: 11 });
        }

        this.updateHitboxes(hitboxes);

        return {
            layout: { ...L, leftX, rightX, tabY, listY, listH, footerY },
            mode: this.mode,
            tab: this.tab,
            canSaveNow: this._canSaveNow(),
            rows: this.rows,
            loading: this.loading,
            scrollOffset: offset,
            totalH,
            selectedId: this.selectedId,
            shown,
            selected,
            buttons,
            nameBox,
            nameText: this.nameInput.value,
            namePlaceholder: SaveManager.canSaveNow() ? SaveManager.defaultSaveName() : '',
            isEditingName: this.isEditingName,
            notice: this.notice,
            busy: this.busy,
            manualCount: this.entries.filter(e => isManualSlot(e.slot)).length,
            maxManual: MAX_MANUAL_SAVES,
            focusId: this.getFocusId(),
            hitboxes
        };
    }
}
