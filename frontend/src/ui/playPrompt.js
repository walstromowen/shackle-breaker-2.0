// frontend/src/ui/playPrompt.js: a multiplayer question asked in the middle of an encounter or a fight ("Ann wants to join your fight": Let them
// in / Not now). It is engine/multiplayerSocial.js's prompt with `inPlay` set; SceneManager draws it over the encounter or battle screen and gives
// it the keys and clicks while it is up (the overworld draws and drives its own prompts). It looks like the overworld's question box.
import { CanvasUI } from './canvasUI.js';
import { UITheme } from './UITheme.js';
import { multiplayerSocial } from '../engine/multiplayerSocial.js';

const BOX = { w: 640, optH: 58, gap: 10, pad: 36 };
export const PLAY_PROMPT_SCENES = new Set(['encounter', 'battle', 'party']);

/** The question up now on this scene, or null. */
export function activePlayPrompt(scene) {
    const p = multiplayerSocial.prompt;
    return p && p.inPlay && PLAY_PROMPT_SCENES.has(scene) ? p : null;
}

/** Where the box and its buttons are, on a canvas `W` x `H`. */
export function playPromptLayout(p, W, H) {
    const h = BOX.pad * 2 + 110 + p.options.length * (BOX.optH + BOX.gap);
    const x = (W - BOX.w) / 2, y = (H - h) / 2;
    const options = p.options.map((o, i) => ({
        ...o, i, hitId: `mp_play_opt_${i}`, x: x + BOX.pad, y: y + BOX.pad + 110 + i * (BOX.optH + BOX.gap), w: BOX.w - BOX.pad * 2, h: BOX.optH,
    }));
    return { x, y, w: BOX.w, h, title: p.title, text: p.text, options };
}

/** The option under the point, or null. */
export function playPromptHit(p, W, H, mx, my) {
    const L = playPromptLayout(p, W, H);
    return L.options.find(o => mx >= o.x && mx <= o.x + o.w && my >= o.y && my <= o.y + o.h) || null;
}

/** A key while it is up: arrows move, Enter / Space picks, Escape says no. Every key is the question's. */
export function playPromptKey(p, code) {
    const n = p.options.length;
    if (code === 'ArrowUp' || code === 'ArrowLeft' || code === 'KeyW' || code === 'KeyA') p.focus = (p.focus - 1 + n) % n;
    else if (code === 'ArrowDown' || code === 'ArrowRight' || code === 'KeyS' || code === 'KeyD') p.focus = (p.focus + 1) % n;
    else if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') multiplayerSocial.pickPrompt(p.focus);
    else if (code === 'Escape') multiplayerSocial.cancelPrompt();
}

export function drawPlayPrompt(ctx, p, mouse) {
    const ui = new CanvasUI(ctx);
    const L = playPromptLayout(p, ctx.canvas.width, ctx.canvas.height);
    const hovered = mouse && L.options.find(o => mouse.x >= o.x && mouse.x <= o.x + o.w && mouse.y >= o.y && mouse.y <= o.y + o.h);
    if (hovered) p.focus = hovered.i;
    const focusId = `mp_play_opt_${p.focus}`;
    ui.drawRect(0, 0, ctx.canvas.width, ctx.canvas.height, 'rgba(4, 4, 7, 0.45)', true);
    ui.drawPanel(L.x, L.y, L.w, L.h, UITheme.colors.bgScale[0]);
    ui.drawText(L.title, L.x + L.w / 2, L.y + 70, UITheme.fonts.sectionHeading, UITheme.colors.textHighlight, 'center', 'alphabetic', L.w - 60);
    ui.drawText(L.text, L.x + L.w / 2, L.y + 118, UITheme.fonts.small, UITheme.colors.textMain, 'center', 'alphabetic', L.w - 60);
    for (const o of L.options) ui.drawButton(o.x, o.y, o.w, o.h, o.label, ui.flags(o.hitId, focusId), { font: UITheme.fonts.medium });
}
