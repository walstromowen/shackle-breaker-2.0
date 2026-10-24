// frontend/src/ui/uiTextures.js
// The surfaces the dark UI is made of, generated once in code (no image files) and cached:
//   grain()      fine film grain, a tile that repeats without a seam
//   mottle()     soft low-frequency blotches (aged leather / stone), also a seamless tile
//   screenBase() the whole-screen background of a menu: near-black, mottled, with a lit middle and fallen-away corners
//   screenFx()   a vignette and grain laid over everything a menu draws as its background
//   backdrop     a blurred, darkened, drained copy of the game world that menus open over (captured from the canvas, see SceneManager)
// Every texture is made from a fixed seed, so the game looks the same on every machine and every run.

const SCREEN_W = 1920;
const SCREEN_H = 1080;

function makeCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
}

// mulberry32: a small seeded random number generator
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Value noise on a lattice that wraps around, so the result tiles. Returns a Float32Array of size*size values 0..1. */
function tileableNoise(size, cells, rand) {
    const lattice = new Float32Array(cells * cells);
    for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
    const out = new Float32Array(size * size);
    const smooth = (t) => t * t * (3 - 2 * t);
    for (let y = 0; y < size; y++) {
        const fy = (y / size) * cells, y0 = Math.floor(fy), ty = smooth(fy - y0);
        const ya = (y0 % cells) * cells, yb = ((y0 + 1) % cells) * cells;
        for (let x = 0; x < size; x++) {
            const fx = (x / size) * cells, x0 = Math.floor(fx), tx = smooth(fx - x0);
            const xa = x0 % cells, xb = (x0 + 1) % cells;
            const top = lattice[ya + xa] * (1 - tx) + lattice[ya + xb] * tx;
            const bottom = lattice[yb + xa] * (1 - tx) + lattice[yb + xb] * tx;
            out[y * size + x] = top * (1 - ty) + bottom * ty;
        }
    }
    return out;
}

export const UITextures = {
    _grain: null,
    _mottle: null,
    _screenBase: null,
    _screenFx: null,
    backdrop: null,          // the captured world, or null: menus then draw their plain background
    _backdropSmall: null,

    /** Film grain: black and white specks of random strength, mostly transparent. Tile size 256. */
    grain() {
        if (this._grain) return this._grain;
        const size = 256, rand = rng(0x51ed);
        const c = makeCanvas(size, size);
        const g = c.getContext('2d');
        const img = g.createImageData(size, size);
        for (let i = 0; i < size * size; i++) {
            const v = rand();
            const light = v > 0.5;
            const strength = Math.abs(v - 0.5) * 2;               // 0..1, most grains are faint
            img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = light ? 255 : 0;
            img.data[i * 4 + 3] = Math.round(strength * strength * 80);
        }
        g.putImageData(img, 0, 0);
        this._grain = c;
        return c;
    },

    /** Soft blotches in several sizes plus a few hair-thin scratches. Greys with alpha; tile size 512. */
    mottle() {
        if (this._mottle) return this._mottle;
        const size = 512, rand = rng(0xb100d);
        const octaves = [[3, 0.30], [8, 0.30], [18, 0.22], [40, 0.18]];
        const field = new Float32Array(size * size);
        for (const [cells, weight] of octaves) {
            const n = tileableNoise(size, cells, rand);
            for (let i = 0; i < field.length; i++) field[i] += n[i] * weight;
        }
        const c = makeCanvas(size, size);
        const g = c.getContext('2d');
        const img = g.createImageData(size, size);
        for (let i = 0; i < field.length; i++) {
            const v = field[i];                                    // about 0.2 .. 0.8
            const dark = v < 0.5;
            const amount = Math.min(1, Math.abs(v - 0.5) * 2.4);
            img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = dark ? 0 : 205;
            img.data[i * 4 + 3] = Math.round(amount * 110);
        }
        g.putImageData(img, 0, 0);
        // scratches and fibres: short, faint, mostly one way, drawn twice across the edges so the tile still wraps
        g.lineCap = 'round';
        for (let i = 0; i < 70; i++) {
            const x = rand() * size, y = rand() * size;
            const len = 14 + rand() * 60, ang = (rand() - 0.5) * 0.9 + (rand() < 0.2 ? Math.PI / 2 : 0);
            g.strokeStyle = rand() < 0.6 ? `rgba(0,0,0,${0.10 + rand() * 0.18})` : `rgba(215,205,185,${0.025 + rand() * 0.05})`;
            g.lineWidth = rand() < 0.85 ? 1 : 2;
            for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
                g.beginPath();
                g.moveTo(x + ox, y + oy);
                g.lineTo(x + ox + Math.cos(ang) * len, y + oy + Math.sin(ang) * len);
                g.stroke();
            }
        }
        this._mottle = c;
        return c;
    },

    /** The plain menu background: near-black, mottled, lit from within, 1920 x 1080. */
    screenBase() {
        if (this._screenBase) return this._screenBase;
        const c = makeCanvas(SCREEN_W, SCREEN_H);
        const g = c.getContext('2d');
        g.fillStyle = '#05060a';
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
        const lift = g.createRadialGradient(SCREEN_W / 2, SCREEN_H * 0.42, SCREEN_H * 0.1, SCREEN_W / 2, SCREEN_H * 0.5, SCREEN_W * 0.75);
        lift.addColorStop(0, 'rgba(46, 44, 50, 0.34)');
        lift.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.fillStyle = lift;
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
        g.globalAlpha = 0.6;
        g.fillStyle = g.createPattern(this.mottle(), 'repeat');
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
        this._screenBase = c;
        return c;
    },

    /** A vignette and grain, drawn last over a menu's background (before its panels). 1920 x 1080. */
    screenFx() {
        if (this._screenFx) return this._screenFx;
        const c = makeCanvas(SCREEN_W, SCREEN_H);
        const g = c.getContext('2d');
        const v = g.createRadialGradient(SCREEN_W / 2, SCREEN_H / 2, SCREEN_H * 0.35, SCREEN_W / 2, SCREEN_H / 2, SCREEN_W * 0.66);
        v.addColorStop(0, 'rgba(0, 0, 0, 0)');
        v.addColorStop(0.6, 'rgba(0, 0, 0, 0.32)');
        v.addColorStop(1, 'rgba(0, 0, 0, 0.78)');
        g.fillStyle = v;
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
        g.globalAlpha = 0.3;
        g.fillStyle = g.createPattern(this.grain(), 'repeat');
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
        // a thin rule near the top and the bottom edge of the screen, fading out toward the sides (the frame menus sit inside)
        g.globalAlpha = 1;
        const rule = g.createLinearGradient(0, 0, SCREEN_W, 0);
        rule.addColorStop(0, 'rgba(184, 173, 150, 0)');
        rule.addColorStop(0.15, 'rgba(184, 173, 150, 0.2)');
        rule.addColorStop(0.85, 'rgba(184, 173, 150, 0.2)');
        rule.addColorStop(1, 'rgba(184, 173, 150, 0)');
        g.fillStyle = rule;
        g.fillRect(0, 20, SCREEN_W, 1.5);
        g.fillRect(0, SCREEN_H - 21.5, SCREEN_W, 1.5);
        this._screenFx = c;
        return c;
    },

    /**
     * Keeps a blurred, darkened, drained copy of what `source` (the game canvas) shows now, for the menus to open over.
     * The blur is made by shrinking the picture and stretching it back, which looks the same in every browser and costs almost nothing.
     */
    captureBackdrop(source) {
        if (!source || !source.width || !source.height) return;
        if (!this._backdropSmall) this._backdropSmall = makeCanvas(120, 68);
        const small = this._backdropSmall.getContext('2d');
        small.imageSmoothingEnabled = true;
        small.imageSmoothingQuality = 'high';
        small.clearRect(0, 0, 120, 68);
        small.drawImage(source, 0, 0, source.width, source.height, 0, 0, 120, 68);
        if (!this.backdrop) this.backdrop = makeCanvas(480, 270);
        const g = this.backdrop.getContext('2d');
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
        g.drawImage(this._backdropSmall, 0, 0, 120, 68, 0, 0, 480, 270);
        g.globalCompositeOperation = 'saturation';               // drain most of the colour ...
        g.fillStyle = 'rgba(120, 120, 120, 0.5)';
        g.fillRect(0, 0, 480, 270);
        g.globalCompositeOperation = 'source-over';              // ... and sink it into the dark
        g.fillStyle = 'rgba(5, 6, 9, 0.6)';
        g.fillRect(0, 0, 480, 270);
    },

    clearBackdrop() {
        this.backdrop = null;
    },

    /** Draws the menu background: the blurred world when there is one, else the plain mottled one, then vignette and grain. */
    drawScreenBackground(ctx, width, height) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        if (this.backdrop) {
            ctx.fillStyle = '#040508';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(this.backdrop, 0, 0, width, height);
            ctx.globalAlpha = 0.32;
            ctx.drawImage(this.screenBase(), 0, 0, width, height);   // the mottle sits on the picture too, so it reads as a surface
        } else {
            ctx.drawImage(this.screenBase(), 0, 0, width, height);
        }
        ctx.globalAlpha = 1;
        ctx.drawImage(this.screenFx(), 0, 0, width, height);
        ctx.restore();
    }
};
