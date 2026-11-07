/**
 * ui/graphicsNotice.js
 *
 * The title screen's notice when the browser is drawing the game without the graphics card (engine/graphics.js): what is happening, the
 * steps for this browser that bring the card back, and that Light graphics is keeping the game playable meanwhile. Two buttons: Got it
 * (shown again next visit) and Don't show again.
 */
import { UITheme } from './UITheme.js';
import { CanvasUI } from './canvasUI.js';
import { graphics, gpuFixSteps } from '../engine/graphics.js';

const W = 1080;
const PAD = 56;
const STEP_FONT = '400 26px "Barlow", system-ui, sans-serif';
const TEXT_FONT = '400 28px "Barlow", system-ui, sans-serif';
const SMALL_FONT = 'italic 400 22px "Barlow", system-ui, sans-serif';
export const NOTICE_BUTTONS = [
    { id: 'gpu_ok', label: 'Got it' },
    { id: 'gpu_never', label: "Don't show again" },
];

/**
 * Draws the notice in the middle of the screen and returns its button hitboxes (zIndex above the menu, so they take the clicks).
 * @param {string|null} focusId  the button under the mouse / keyboard cursor
 */
export function drawGraphicsNotice(ctx, focusId = null) {
    const ui = new CanvasUI(ctx);
    const SW = ctx.canvas.width, SH = ctx.canvas.height;
    const steps = gpuFixSteps();
    const intro = 'Your browser is drawing the game on the processor instead of your graphics card, so everything runs far slower than it should. A web page cannot switch the graphics card on for you, but these steps usually do:';
    const introLines = ui.getWrappedLines(intro, W - PAD * 2, TEXT_FONT);
    const stepLines = steps.map(s => ui.getWrappedLines(s, W - PAD * 2 - 48, STEP_FONT));
    const stepsH = stepLines.reduce((h, l) => h + l.length * 34 + 14, 0);
    const H = 150 + introLines.length * 38 + 24 + stepsH + 96 + 130;
    const x = (SW - W) / 2, y = Math.max(30, (SH - H) / 2);

    ctx.save();
    ctx.fillStyle = 'rgba(4, 4, 7, 0.78)';
    ctx.fillRect(0, 0, SW, SH);
    ui.drawPanel(x, y, W, H, UITheme.colors.bgScale[0]);

    let cy = y + 86;
    ui.drawText('Your graphics card is not in use', SW / 2, cy, UITheme.fonts.header, UITheme.colors.textHighlight, 'center');
    cy += 30;
    ui.drawLineWithGothicFlourish(SW / 2 - 220, cy, 440, UITheme.colors.borderHighlight);
    cy += 52;

    for (const line of introLines) { ui.drawText(line, x + PAD, cy, TEXT_FONT, UITheme.colors.textMain, 'left'); cy += 38; }
    cy += 24;

    stepLines.forEach((lines, i) => {
        ui.drawText(`${i + 1}`, x + PAD + 14, cy, '600 28px "Cormorant Garamond", Georgia, serif', UITheme.colors.textHighlight, 'center');
        for (const line of lines) { ui.drawText(line, x + PAD + 48, cy, STEP_FONT, UITheme.colors.textMain, 'left'); cy += 34; }
        cy += 14;
    });

    cy += 18;
    ui.drawText(graphics.light
        ? 'Light graphics is on meanwhile, so the game stays playable (Settings > Display).'
        : 'Light graphics can keep the game playable meanwhile (Settings > Display).', SW / 2, cy, TEXT_FONT, UITheme.colors.textHighlight, 'center');
    cy += 36;
    ui.drawText(`Detected: ${graphics.info ? graphics.info.renderer : 'unknown'}`, SW / 2, cy, SMALL_FONT, UITheme.colors.textMuted, 'center', 'alphabetic', W - PAD * 2);
    cy += 44;

    const bw = 300, bh = 62, gap = 28;
    const bx = SW / 2 - (bw * 2 + gap) / 2;
    const hitboxes = NOTICE_BUTTONS.map((b, i) => {
        const box = { id: b.id, x: bx + i * (bw + gap), y: cy, w: bw, h: bh, zIndex: 100 };
        ui.drawButton(box.x, box.y, bw, bh, b.label, ui.flags(b.id, focusId), { font: UITheme.fonts.medium });
        return box;
    });
    ctx.restore();
    return hitboxes;
}
