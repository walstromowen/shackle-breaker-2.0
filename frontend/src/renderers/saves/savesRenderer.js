import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { AUTOSAVE_SLOT, BACKUP_SLOT } from '../../../../shared/systems/saveManager.js';

const C = UITheme.colors;
const F = UITheme.fonts;

const when = (iso) => {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return '';
    return new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/** What a row is called: the player's name for it, or "Autosave" / "Previous Autosave". */
export function titleOfEntry(entry) {
    const s = (entry && entry.summary) || {};
    if (s.saveName) return s.saveName;
    if (entry.slot === AUTOSAVE_SLOT) return 'Autosave';
    if (entry.slot === BACKUP_SLOT) return 'Previous Autosave';
    return s.name ? `${s.name}'s save` : 'Saved game';
}

/** One line about the game inside: "Shackle Breaker  -  Lv 3  -  Day 4  -  2 in party". */
function describe(summary) {
    const s = summary || {};
    const parts = [];
    if (s.name) parts.push(s.name);
    if (s.level != null) parts.push(`Lv ${s.level}`);
    if (s.day != null) parts.push(`Day ${s.day}`);
    if (s.partySize != null) parts.push(s.partySize === 1 ? 'alone' : `${s.partySize} in party`);
    return parts.join('  -  ');
}

export class SavesRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
    }

    render(ctx, state) {
        const ui = new CanvasUI(ctx);
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const L = state.layout;
        const focus = state.focusId;

        // Background: the title art, dimmed so the panels read well
        const bg = this.loader.getImage ? this.loader.getImage('title_bg') : this.loader.get('title_bg');
        if (bg) {
            ctx.drawImage(bg, 0, 0, w, h);
            ui.drawRect(0, 0, w, h, 'rgba(4, 4, 7, 0.86)', true);
        } else {
            ui.clearScreen(w, h);
        }

        ui.drawPanel(L.leftX, L.panelY, L.leftW, L.panelH, C.bgScale[0]);
        ui.drawPanel(L.rightX, L.panelY, L.rightW, L.panelH, C.bgScale[1]);

        this._renderTabs(ui, state, focus);
        this._renderList(ui, state, focus);
        this._renderFooter(ui, state, focus);
        this._renderDetails(ui, state, focus);
    }

    // ------------------------------------------------------------------------------------------------------------------
    _box(state, id) { return state.hitboxes.find(b => b.id === id); }

    _renderTabs(ui, state, focus) {
        const L = state.layout;
        const tabs = [];
        if (state.mode === 'game') tabs.push(['tab_save', 'save', 'Save Game']);
        tabs.push(['tab_load', 'load', 'Load Game']);

        for (const [id, key, label] of tabs) {
            const b = this._box(state, id);
            if (!b) continue;
            const disabled = id === 'tab_save' && !state.canSaveNow;
            ui.drawRow(b.x, b.y, b.w, b.h, label,
                ui.flags(id, focus, { selected: state.tab === key, disabled }),
                { align: 'center', inset: true });
        }

        ui.drawLineWithGothicFlourish(L.leftX + L.leftW / 4, L.tabY + L.tabH + 18, L.leftW / 2, C.borderHighlight);

        if (state.mode === 'game' && !state.canSaveNow) {
            ui.drawText('You can only save outdoors. Step out of the building first.', L.leftX + L.leftW / 2, L.tabY + L.tabH + 52,
                F.italic, C.textMuted, 'center', 'middle');
        }
    }

    _renderList(ui, state, focus) {
        const L = state.layout;
        const x = L.leftX + 24;
        const listW = L.leftW - 48 - 28;      // room for the scrollbar

        ui.startClip(x - 6, L.listY - 6, listW + 12, L.listH + 12);

        if (state.loading) {
            ui.drawText('Loading saves...', x + listW / 2, L.listY + 60, F.italic, C.textMuted, 'center', 'middle');
        } else if (state.rows.length === 0) {
            ui.drawText(state.tab === 'load' ? 'No saved games yet.' : 'Nothing to save over yet.', x + listW / 2, L.listY + 60,
                F.italic, C.textMuted, 'center', 'middle');
        }

        for (const row of state.rows) {
            const box = this._box(state, row.id);
            if (!box) continue;

            const flags = ui.flags(row.id, focus, { selected: row.id === state.selectedId });
            ui.drawStateBox(box.x, box.y, box.w, box.h, flags, { inset: true });
            const titleColor = ui.stateTextColor(flags, C.textMain);

            if (row.type === 'new') {
                ui.drawText('+  New Save', box.x + 28, box.y + 46, F.bold, ui.stateTextColor(flags, C.textHighlight), 'left', 'alphabetic');
                ui.drawText(`${state.manualCount} of ${state.maxManual} slots used`, box.x + 28, box.y + 84, F.small, C.textMuted, 'left', 'alphabetic');
                continue;
            }

            const entry = row.entry;
            ui.drawText(titleOfEntry(entry), box.x + 28, box.y + 46, F.bold, titleColor, 'left', 'alphabetic', box.w - 330);
            ui.drawText(describe(entry.summary), box.x + 28, box.y + 84, F.small, C.textMuted, 'left', 'alphabetic', box.w - 330);
            ui.drawText(when(entry.savedAt), box.x + box.w - 28, box.y + 46, F.small, C.textMuted, 'right', 'alphabetic');
            const tag = row.type === 'auto' ? 'AUTO' : row.type === 'previous' ? 'BACKUP' : '';
            if (tag) ui.drawText(tag, box.x + box.w - 28, box.y + 84, F.cardSmall, C.textHighlight, 'right', 'alphabetic');
        }

        ui.endClip();

        // scrollbar (the same maths as the hitbox the controller registers)
        if (state.totalH > L.listH) {
            const maxScroll = state.totalH - L.listH;
            const dragging = focus === 'SCROLL_THUMB_SAVES';
            ui.drawScrollbar(L.leftX + L.leftW - 24 - 14, L.listY, 14, L.listH, state.scrollOffset, maxScroll, L.listH, { highlighted: dragging });
        }
    }

    _renderFooter(ui, state, focus) {
        const back = this._box(state, 'btn_back');
        if (back) ui.drawButton(back.x, back.y, back.w, back.h, 'Back', ui.flags('btn_back', focus), { font: F.body });
        const quit = this._box(state, 'btn_quit_title');
        if (quit) ui.drawButton(quit.x, quit.y, quit.w, quit.h, 'Quit to Title', ui.flags('btn_quit_title', focus, { disabled: state.busy }), { font: F.body });
    }

    _renderDetails(ui, state, focus) {
        const L = state.layout;
        const cx = L.rightX + L.rightW / 2;
        const shown = state.shown;
        let y = L.panelY + 84;

        if (!shown) {
            ui.drawText(state.tab === 'load' ? 'Pick a save to load.' : 'Pick New Save, or a save to write over.', cx, L.panelY + L.panelH / 2 - 60,
                F.italic, C.textMuted, 'center', 'middle');
        } else if (shown.type === 'new') {
            ui.drawText('NEW SAVE', cx, y, F.header, C.textMain, 'center', 'alphabetic', L.rightW - 64);
            ui.drawLineWithGothicFlourish(cx - 150, y + 28, 300, C.borderHighlight);
            ui.drawWrappedText('Give this moment a name, then save. You can keep as many as the list allows, and loading one never touches the others.',
                L.rightX + 48, y + 90, L.rightW - 96, 40, F.body, C.textMuted);
        } else {
            const entry = shown.entry;
            const s = entry.summary || {};
            ui.drawText(titleOfEntry(entry).toUpperCase(), cx, y, F.header, C.textMain, 'center', 'alphabetic', L.rightW - 64);
            ui.drawLineWithGothicFlourish(cx - 150, y + 28, 300, C.borderHighlight);

            const lines = [
                ['Leader', s.name || '-'],
                ['Level', s.level ?? '-'],
                ['Party', s.partySize ?? '-'],
                ['Day', s.day ?? '-'],
                ['Difficulty', cap(s.difficulty) || '-'],
                ['Saved', when(entry.savedAt) || '-']
            ];
            let ly = y + 100;
            for (const [label, value] of lines) {
                ui.drawText(label, L.rightX + 64, ly, F.body, C.textMuted, 'left');
                ui.drawText(String(value), L.rightX + L.rightW - 64, ly, F.body, C.textMain, 'right', 'alphabetic', L.rightW - 300);
                ly += 56;
            }

            const note = shown.type === 'auto' ? 'Saved for you as you play.'
                : shown.type === 'previous' ? 'What the autosave held before you last started a new game or loaded another save.'
                : '';
            if (note) ui.drawWrappedText(note, L.rightX + 64, ly + 20, L.rightW - 128, 38, F.italic, C.textMuted);
        }

        // the name box (New Save)
        const nb = state.nameBox;
        if (nb) {
            ui.drawText('Save name', nb.x, nb.y - 14, F.small, C.textMuted, 'left');
            ui.drawPanel(nb.x, nb.y, nb.w, nb.h, state.isEditingName ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.4)');
            ui.drawStateBox(nb.x, nb.y, nb.w, nb.h, ui.flags('input_name', state.isEditingName ? 'input_name' : focus));

            let text = state.nameText;
            let color = C.textMain;
            if (state.isEditingName) {
                if (Math.floor(Date.now() / 500) % 2 === 0) text += '|';
            } else if (!text) {
                text = state.namePlaceholder || 'Name your save...';
                color = C.textMuted;
            }
            ui.startClip(nb.x, nb.y, nb.w, nb.h);
            ui.drawText(text, nb.x + nb.w / 2, nb.y + nb.h / 2, F.body, color, 'center', 'middle');
            ui.endClip();
        }

        // a one-line message above the buttons
        if (state.notice) {
            const my = (nb ? nb.y - 56 : L.panelY + L.panelH - 24 - 84 - 40);
            ui.drawWrappedText(state.notice.text, L.rightX + 48, my, L.rightW - 96, 36, F.small,
                state.notice.kind === 'error' ? C.error : C.success);
        }

        // buttons
        for (const b of state.buttons) {
            const isDanger = b.id === 'btn_delete';
            ui.drawButton(b.x, b.y, b.w, b.h, b.label, ui.flags(b.id, focus, { disabled: state.busy }),
                { font: F.body, color: isDanger ? C.error : undefined });
        }
    }
}
