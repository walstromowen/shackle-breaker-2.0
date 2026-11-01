import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';
import { TIPS } from '../../ui/tutorialData.js';
import { measureTip, drawTip } from '../../ui/tutorialOverlay.js';

const C = UITheme.colors;
const F = UITheme.fonts;

const MODE_LABELS = { auto: 'Auto', full: 'Full', light: 'Light' };
const MODE_HINTS = {
    auto: 'Light graphics only when the browser is drawing without the graphics card.',
    full: 'Every effect: shadows, smoke and embers.',
    light: 'No shadows or smoke and fewer embers, for slower computers.',
};

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
        ui.drawStyled('title', 'Settings', cx, L.panelY + 112);
        ui.drawLineWithGothicFlourish(cx - 150, L.panelY + 142, 300, C.borderHighlight);

        for (const t of state.tabs) {
            ui.drawTab(t.x, t.y, t.w, t.h, t.label, ui.flags(t.id, focus, { selected: state.tab === t.tab }));
        }

        if (state.tab === 'sound') {
            for (const row of state.channels) this._renderSlider(ui, state, row, focus);
        } else if (state.tab === 'display') {
            this._renderDisplay(ui, state, focus);
        } else {
            this._renderControls(ctx, ui, state, focus);
        }

        for (const b of state.buttons) {
            ui.drawButton(b.x, b.y, b.w, b.h, b.label, ui.flags(b.id, focus), { font: F.medium });
        }
    }

    /** Controls tab: one tab per screen down the left, that screen's control card (the same rows as its first-visit tip) on the right. */
    _renderControls(ctx, ui, state, focus) {
        const L = state.layout;
        for (const p of state.pages) {
            ui.drawTab(p.x, p.y, p.w, p.h, TIPS[p.sceneId].label, ui.flags(p.id, focus, { selected: p.index === state.page }));
        }

        const tip = TIPS[state.pageSceneId];
        const x = L.panelX + L.cardX;
        const w = L.cardW;
        ui.drawText(tip.title, x + w / 2, L.cardY + 40, F.sectionHeading, C.textHighlight, 'center');
        ui.drawLineWithGothicFlourish(x, L.cardY + 66, w);

        // the card's rows at a size that fits the tab (the intro line is left to the first-visit card)
        const key = `${state.pageSceneId}:${w}`;
        if (!this._tipLayouts) this._tipLayouts = new Map();
        let m = this._tipLayouts.get(key);
        if (!m) {
            m = measureTip(ui, { ...tip, intro: '' }, { width: w, keyColW: 270, font: 26, lineH: 34, rowGap: 16, capH: 44, capFont: 23, showTitle: false });
            this._tipLayouts.set(key, m);
        }
        drawTip(ctx, ui, m, x, L.cardY + 100);
    }

    /** Display tab: Graphics (Auto / Full / Light), what each does, and whether the browser is drawing with the graphics card. */
    _renderDisplay(ui, state, focus) {
        const L = state.layout;
        const cx = L.panelX + L.panelW / 2;
        const g = state.graphics;
        ui.drawText('Graphics', cx, L.rowsY + 26, F.sectionHeading, C.textHighlight, 'center');
        for (const m of state.modes) {
            ui.drawTab(m.x, m.y, m.w, m.h, MODE_LABELS[m.mode], ui.flags(m.id, focus, { selected: g.mode === m.mode }));
        }
        let y = L.rowsY + 186;
        ui.drawText(MODE_HINTS[g.mode], cx, y, F.italic, C.textMain, 'center', 'alphabetic', L.panelW - 160);
        y += 70;
        ui.drawLineWithGothicFlourish(cx - 300, y, 600, C.border);
        y += 62;
        const onCard = g.info && g.info.known && !g.info.software;
        const status = !g.info || !g.info.known ? 'Could not tell whether the graphics card is in use'
            : onCard ? 'Your graphics card is in use' : 'Your browser is drawing without the graphics card';
        ui.drawText(status, cx, y, F.bold, onCard ? C.success : (g.info && g.info.known ? C.failure : C.textMuted), 'center');
        y += 44;
        ui.drawText(`Drawing with: ${g.info ? g.info.renderer : 'unknown'}`, cx, y, F.small, C.textMuted, 'center', 'alphabetic', L.panelW - 160);
        y += 44;
        ui.drawText(`Light graphics is ${g.light ? 'on' : 'off'} now.`, cx, y, F.small, C.textMain, 'center');
        if (g.info && g.info.software) {
            y += 56;
            ui.drawText('Turning on hardware acceleration in your browser and updating the graphics driver usually fixes this.', cx, y, F.italic, C.textHighlight, 'center', 'alphabetic', L.panelW - 160);
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

        ui.drawStyled('body', row.label, labelX, midY - 2, { font: F.bold, color: ui.stateTextColor(flags, C.textMain) });
        ui.drawStyled('cardLabel', HINTS[row.channel] || '', labelX, midY + 28, { maxWidth: t.x - labelX - 24 });

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

        ui.drawStyled('value', `${Math.round(row.value * 100)}%`, L.panelX + L.valueX, midY + 2,
            { baseline: 'middle', color: ui.stateTextColor(flags, C.textMain) });
    }
}
