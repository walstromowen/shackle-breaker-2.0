import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

const C = UITheme.colors;
const F = UITheme.fonts;

const HINTS = {
    master:  'Everything at once.',
    music:   'The background score.',
    sfx:     'Battle cries, blows and clicks.',
    ambient: 'Wind, rain and nature.'
};

export class SettingsRenderer {
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

        // Background: the title art, dimmed so the panel reads well (same as the Saves screen)
        const bg = this.loader.getImage ? this.loader.getImage('title_bg') : this.loader.get('title_bg');
        if (bg) {
            ctx.drawImage(bg, 0, 0, w, h);
            ui.drawRect(0, 0, w, h, 'rgba(4, 4, 7, 0.86)', true);
        } else {
            ui.clearScreen(w, h);
        }

        ui.drawPanel(L.panelX, L.panelY, L.panelW, L.panelH, C.bgScale[0]);

        const cx = L.panelX + L.panelW / 2;
        ui.drawText('SETTINGS', cx, L.panelY + 112, F.header, C.textMain, 'center', 'alphabetic');
        ui.drawLineWithGothicFlourish(cx - 150, L.panelY + 142, 300, C.borderHighlight);
        ui.drawText('Sound', cx, L.panelY + 200, F.italic, C.textMuted, 'center', 'alphabetic');

        for (const row of state.channels) this._renderSlider(ui, state, row, focus);

        for (const b of state.buttons) {
            ui.drawButton(b.x, b.y, b.w, b.h, b.label, ui.flags(b.id, focus), { font: F.body });
        }
    }

    _renderSlider(ui, state, row, focus) {
        const L = state.layout;
        const t = row.track;
        const lit = focus === row.id;
        const flags = ui.flags(row.id, focus);
        const labelX = L.panelX + L.labelX;
        const midY = t.y + t.h / 2;

        // a soft highlight behind the whole row when it is the one in focus
        if (lit) ui.drawStateBox(L.panelX + 48, t.y - 14, L.panelW - 96, t.h + 28, flags, { inset: true });

        ui.drawText(row.label, labelX, midY - 2, F.bold, ui.stateTextColor(flags, C.textMain), 'left', 'alphabetic');
        ui.drawText(HINTS[row.channel] || '', labelX, midY + 28, F.cardSmall, C.textMuted, 'left', 'alphabetic', t.x - labelX - 24);

        // track
        const trackH = 14;
        const ty = midY - trackH / 2;
        ui.drawRect(t.x, ty, t.w, trackH, C.bgScale[3], true);
        ui.drawRect(t.x, ty, t.w, trackH, C.border, false);
        const fillW = Math.round(t.w * row.value);
        if (fillW > 0) ui.drawRect(t.x + 1, ty + 1, Math.max(0, fillW - 2), trackH - 2, lit ? C.borderHighlight : C.xp, true);

        // handle
        const hx = t.x + fillW;
        const handleColor = lit ? C.borderHighlight : C.selectedWhite;
        ui.drawRect(hx - 9, midY - 24, 18, 48, C.bgScale[1], true);
        ui.drawRect(hx - 9, midY - 24, 18, 48, handleColor, false);
        ui.drawLine(hx, midY - 14, hx, midY + 14, handleColor, 2);

        ui.drawText(`${Math.round(row.value * 100)}%`, L.panelX + L.valueX, midY + 2, F.body,
            ui.stateTextColor(flags, C.textMain), 'left', 'middle');
    }
}
