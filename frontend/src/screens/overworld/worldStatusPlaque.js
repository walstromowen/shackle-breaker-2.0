import { UITheme } from '../../ui/UITheme.js';

/* WorldStatusPlaque - the small panel at the top centre of the overworld: where you are (the biome), the day, the clock, the weather,
 * and a dial that shows the sun or the moon crossing the sky. Purely a picture of the state it is given (see OverworldController.getWorldInfo):
 *   { biomeName, sheltered, day, minutes, weatherId, weatherName, bloodMoon }
 * `describeWorld` turns that into the words, so they can be tested without a canvas. */

export const PLAQUE = { w: 500, h: 124, top: 24 };

/** The clock as the plaque shows it: "10:24 AM". `minutes` is the minute of the day, 0..1439. */
export function formatClock(minutes) {
    const m = Math.floor(((minutes % 1440) + 1440) % 1440);
    const h24 = Math.floor(m / 60), mm = m % 60;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(mm).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** The part of the day: Dawn 5-8, Morning 8-12, Afternoon 12-17, Dusk 17-20, Night after (the colours of TimeSystem's keyframes). */
export function periodOfDay(minutes) {
    const h = (((minutes % 1440) + 1440) % 1440) / 60;
    if (h >= 5 && h < 8) return 'Dawn';
    if (h >= 8 && h < 12) return 'Morning';
    if (h >= 12 && h < 17) return 'Afternoon';
    if (h >= 17 && h < 20) return 'Dusk';
    return 'Night';
}

export function describeWorld(info) {
    const i = info || {};
    const minutes = Number.isFinite(i.minutes) ? i.minutes : 0;
    const period = periodOfDay(minutes);
    return {
        place: i.biomeName || 'Unknown Lands',
        day: `Day ${Math.max(1, Math.floor(i.day || 1))}`,
        clock: formatClock(minutes),
        period: i.bloodMoon && period === 'Night' ? 'Blood Moon' : period,
        weather: i.sheltered ? 'Sheltered' : (i.weatherName || 'Clear Skies'),
        weatherId: i.sheltered ? 'sheltered' : String(i.weatherId || 'clear').toLowerCase()
    };
}

// ---- the sky dial ---------------------------------------------------------------------------------------------------------------------------
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => c1.map((v, k) => Math.round(lerp(v, c2[k], t)));
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

// [hour, top of the sky, bottom of the sky]
const SKY = [
    [0, [8, 10, 22], [18, 22, 40]], [5, [8, 10, 22], [18, 22, 40]], [6.5, [58, 50, 84], [200, 128, 88]], [9, [92, 124, 150], [168, 188, 190]],
    [16, [92, 124, 150], [168, 188, 190]], [18, [96, 80, 110], [206, 112, 62]], [20, [10, 12, 26], [30, 24, 42]], [24, [8, 10, 22], [18, 22, 40]]
];
const BLOOD_SKY = [[56, 8, 10], [112, 24, 20]];

export function skyColors(hour, bloodMoon = false) {
    const h = ((hour % 24) + 24) % 24;
    let a = SKY[0], b = SKY[SKY.length - 1];
    for (let k = 0; k < SKY.length - 1; k++) if (h >= SKY[k][0] && h <= SKY[k + 1][0]) { a = SKY[k]; b = SKY[k + 1]; break; }
    const t = b[0] === a[0] ? 0 : (h - a[0]) / (b[0] - a[0]);
    let top = mix(a[1], b[1], t), bottom = mix(a[2], b[2], t);
    if (bloodMoon && (h >= 20 || h < 5.5)) { top = mix(top, BLOOD_SKY[0], 0.85); bottom = mix(bottom, BLOOD_SKY[1], 0.85); }
    return { top, bottom };
}

/** Where the sun (6 to 18) or the moon (18 to 6) is on its arc: t 0..1 from the left horizon to the right, up is the arc height 0..1. */
export function bodyPosition(hour) {
    const h = ((hour % 24) + 24) % 24;
    const sun = h >= 6 && h < 18;
    const t = sun ? (h - 6) / 12 : (h >= 18 ? h - 18 : h + 6) / 12;
    return { sun, t, up: Math.sin(Math.PI * t) };
}

const STARS = [[-0.52, -0.5, 1.4], [0.18, -0.68, 1.1], [0.55, -0.34, 1.5], [-0.2, -0.22, 1], [0.72, 0.02, 1.1], [-0.68, -0.02, 1.2], [0.02, -0.46, 1]];

function drawDial(ctx, cx, cy, r, minutes, bloodMoon) {
    const hour = minutes / 60;
    const { top, bottom } = skyColors(hour, bloodMoon);
    const horizon = cy + r * 0.34;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(0, cy - r, 0, horizon);
    g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bottom));
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    const body = bodyPosition(hour);
    const dark = !body.sun || hour < 6.5 || hour > 17.5;
    // stars fade in with the dark
    const night = (hour >= 20 || hour < 5) ? 1 : (hour >= 18.5 ? (hour - 18.5) / 1.5 : (hour < 6.5 && hour >= 5 ? (6.5 - hour) / 1.5 : 0));
    if (night > 0) {
        ctx.fillStyle = `rgba(232, 226, 210, ${0.8 * night})`;
        for (const [sx, sy, sr] of STARS) { ctx.beginPath(); ctx.arc(cx + sx * r, cy + sy * r, sr, 0, Math.PI * 2); ctx.fill(); }
    }

    // the sun or moon rides an arc that starts and ends below the horizon line
    const R = r * 0.86;
    const bx = cx - R + 2 * R * body.t;
    const by = horizon + r * 0.12 - (r * 0.12 + R * 0.78) * body.up;
    if (body.sun) {
        const glow = ctx.createRadialGradient(bx, by, 2, bx, by, r * 0.62);
        glow.addColorStop(0, 'rgba(255, 214, 120, 0.55)'); glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
        ctx.fillStyle = glow; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = '#f2d684'; ctx.beginPath(); ctx.arc(bx, by, r * 0.17, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.fillStyle = bloodMoon ? '#b3261e' : '#dfe2ee';
        ctx.beginPath(); ctx.arc(bx, by, r * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgb(top);   // a bite out of it: a crescent
        ctx.beginPath(); ctx.arc(bx + r * 0.09, by - r * 0.04, r * 0.14, 0, Math.PI * 2); ctx.fill();
    }

    // the ground: two dark hills, and a bright line where sky meets land
    ctx.fillStyle = dark ? '#07080b' : '#0c0e12';
    ctx.beginPath();
    ctx.moveTo(cx - r, cy + r);
    ctx.lineTo(cx - r, horizon + r * 0.06);
    ctx.quadraticCurveTo(cx - r * 0.5, horizon - r * 0.2, cx - r * 0.06, horizon + r * 0.04);
    ctx.quadraticCurveTo(cx + r * 0.4, horizon + r * 0.2, cx + r, horizon - r * 0.1);
    ctx.lineTo(cx + r, cy + r);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(194, 161, 79, 0.75)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
}

// ---- weather glyphs (about 26 px wide, drawn around 0,0) ------------------------------------------------------------------------------------
function cloud(ctx) {
    ctx.beginPath();
    ctx.arc(-6, 1, 4.5, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(-1, -3.5, 5.5, Math.PI, Math.PI * 2);
    ctx.arc(6, 1, 4.5, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
}

export function drawWeatherGlyph(ctx, id, x, y, night = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2;
    const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    switch (id) {
        case 'rain':
            ctx.strokeStyle = '#a9b6c4'; ctx.translate(0, -3); cloud(ctx); ctx.stroke();
            ctx.strokeStyle = '#6f9bd0'; line(-6, 7, -8, 12); line(0, 7, -2, 12); line(6, 7, 4, 12);
            break;
        case 'fog':
            ctx.strokeStyle = '#a7a79f'; line(-10, -6, 8, -6); line(-7, 0, 11, 0); line(-10, 6, 6, 6);
            break;
        case 'sandstorm':
            ctx.strokeStyle = '#c9a66a';
            for (const dy of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(-11, dy); ctx.bezierCurveTo(-6, dy - 4, -2, dy + 4, 3, dy); ctx.bezierCurveTo(6, dy - 3, 9, dy - 1, 11, dy - 3); ctx.stroke(); }
            break;
        case 'blizzard':
            ctx.strokeStyle = '#b6e3ee';
            for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; line(Math.cos(a) * -11, Math.sin(a) * -11, Math.cos(a) * 11, Math.sin(a) * 11); }
            break;
        case 'sheltered':
            ctx.strokeStyle = '#a7a79f';
            ctx.beginPath(); ctx.moveTo(-11, 1); ctx.lineTo(0, -9); ctx.lineTo(11, 1); ctx.stroke();
            ctx.strokeRect(-7, 1, 14, 9);
            break;
        default:   // clear skies: a sun by day, a crescent by night
            if (night) {
                // the moon with a bite out of it (clipped, so nothing is erased from what is under it)
                ctx.beginPath(); ctx.rect(-14, -14, 28, 28); ctx.arc(4.5, -3, 7, 0, Math.PI * 2); ctx.clip('evenodd');
                ctx.fillStyle = '#dfe2ee'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.strokeStyle = '#e6c46a'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke();
                for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; line(Math.cos(a) * 8, Math.sin(a) * 8, Math.cos(a) * 11, Math.sin(a) * 11); }
            }
    }
    ctx.restore();
}

export class WorldStatusPlaque {
    /** Draws the plaque at the top centre of the canvas. `ui` is the CanvasUI of the frame. */
    render(ctx, ui, info) {
        if (!info) return;
        const d = describeWorld(info);
        const { w, h, top } = PLAQUE;
        const x = Math.round((ctx.canvas.width - w) / 2), y = top;
        ui.drawPanel(x, y, w, h, 'rgba(15, 15, 18, 0.88)');

        const r = 44, cx = x + 24 + r, cy = y + h / 2;
        drawDial(ctx, cx, cy, r, info.minutes || 0, !!info.bloodMoon);

        // a hairline between the dial and the words
        const tx = cx + r + 24, tr = x + w - 24;
        ctx.save();
        ctx.strokeStyle = 'rgba(194, 161, 79, 0.28)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(tx - 12.5, y + 20); ctx.lineTo(tx - 12.5, y + h - 20); ctx.stroke();
        ctx.restore();

        ui.drawText(d.place, tx, y + 46, '600 40px "Cormorant Garamond", Georgia, serif', UITheme.colors.textMain, 'left', 'alphabetic', tr - tx);
        ui.drawText(d.day, tx, y + 80, UITheme.fonts.small, UITheme.colors.textMuted, 'left');
        ui.drawText(d.clock, tr, y + 80, UITheme.fonts.monoSmall, UITheme.colors.textHighlight, 'right');

        const night = periodOfDay(info.minutes || 0) === 'Night';
        drawWeatherGlyph(ctx, d.weatherId, tx + 13, y + 103, night);
        ctx.save(); ctx.font = UITheme.fonts.italic;
        const periodW = Math.ceil(ctx.measureText(d.period).width);
        ctx.restore();
        ui.drawText(d.weather, tx + 34, y + 110, UITheme.fonts.small, UITheme.colors.textMain, 'left', 'alphabetic', Math.max(60, tr - tx - 34 - periodW - 16));
        ui.drawText(d.period, tr, y + 110, UITheme.fonts.italic, d.period === 'Blood Moon' ? '#d9534f' : UITheme.colors.textMuted, 'right');
    }
}
