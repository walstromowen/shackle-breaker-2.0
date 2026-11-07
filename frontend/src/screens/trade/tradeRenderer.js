/**
 * frontend/src/screens/trade/tradeRenderer.js
 *
 * Draws the trade screen (tradeController.js builds the state and hitboxes): the title art dimmed behind one wide panel, like the shop,
 * with the bag, your offer and theirs side by side, and under them each side's "yes".
 */
import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

const C = UITheme.colors;
const F = UITheme.fonts;

export class TradeRenderer {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;
    }

    render(ctx, state) {
        const ui = new CanvasUI(ctx);
        const w = ctx.canvas.width, h = ctx.canvas.height;
        const L = state.layout;
        const focus = state.focusId;
        ui.clearScreen(w, h);
        ui.drawPanel(L.panelX, L.panelY, L.panelW, L.panelH, C.bgScale[0]);
        ui.drawStyled('title', `Trade with ${state.partnerName}`, w / 2, L.panelY + 92);
        ui.drawLineWithGothicFlourish(w / 2 - 200, L.panelY + 120, 400, C.borderHighlight);

        this._column(ui, L.bag, 'Your bag', state.bag, focus, state.bag.length ? null : 'Nothing left to offer');
        this._column(ui, L.mine, 'You offer', state.mine, focus, state.mine.length ? null : 'Click an item in your bag');
        this._column(ui, L.theirs, `${state.partnerName} offers`, state.theirs, null, state.theirs.length ? null : 'Nothing yet');
        if (state.pages > 1) ui.drawText(`${state.page + 1} / ${state.pages}`, L.bag.x + L.bag.w / 2, state.listBottom + 40, F.small, C.textMuted, 'center');

        // coin
        ui.drawText(`Coin: ${state.myGold}`, L.mine.x, state.listBottom + 40, F.bold, C.textHighlight, 'left');
        ui.drawText(`you have ${state.purse}`, L.mine.x + L.mine.w, state.listBottom + 40, F.small, C.textMuted, 'right');
        ui.drawText(`Coin: ${state.theirGold}`, L.theirs.x, state.listBottom + 40, F.bold, C.textHighlight, 'left');

        // who has said yes
        const yes = (ok, who) => `${who} ${ok ? 'accepted' : 'not yet accepted'}`;
        ui.drawText(yes(state.iAccept, 'You:'), L.mine.x, state.listBottom + 160, F.body, state.iAccept ? C.success : C.textMuted, 'left');
        ui.drawText(yes(state.theyAccept, `${state.partnerName}:`), L.theirs.x, state.listBottom + 160, F.body, state.theyAccept ? C.success : C.textMuted, 'left');
        ui.drawText('Any change by either of you takes back both yeses.', L.theirs.x, state.listBottom + 100, F.italic, C.textMuted, 'left');

        for (const b of state.buttons) ui.drawButton(b.x, b.y, b.w, b.h, b.label, ui.flags(b.id, focus, { selected: !!b.lit }), { font: F.medium });
    }

    _column(ui, col, title, rows, focus, empty) {
        const L = { y: 230 };
        ui.drawText(title, col.x, L.y - 24, F.sectionHeading, C.textHighlight, 'left', 'alphabetic', col.w);
        if (empty) ui.drawText(empty, col.x + col.w / 2, L.y + 60, F.italic, C.textMuted, 'center', 'alphabetic', col.w - 20);
        for (const r of rows) {
            const flags = r.id ? ui.flags(r.id, focus) : {};
            ui.drawPanel(r.x, r.y, r.w, r.h, 'rgba(0, 0, 0, 0.35)');
            if (r.id) ui.drawStateBox(r.x, r.y, r.w, r.h, flags, { inset: true });
            ui.drawItemIcon(this.loader, r.def, r.x + 6, r.y + 5, r.h - 10);
            ui.drawText(r.name, r.x + r.h + 10, r.y + r.h / 2 + 9, F.body, ui.stateTextColor(flags, C.textMain), 'left', 'alphabetic', r.w - r.h - 90);
            if (r.stackable || r.qty > 1) ui.drawText(`x${r.qty}`, r.x + r.w - 16, r.y + r.h / 2 + 9, F.mono, C.textMuted, 'right');
        }
    }
}
