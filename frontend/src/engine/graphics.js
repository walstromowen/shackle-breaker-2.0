/**
 * engine/graphics.js
 *
 * Is the browser drawing the game with the graphics card, and how much should the game draw?
 *
 *   detect()      once at start: asks WebGL for a context that refuses to fall back to software (failIfMajorPerformanceCaveat). When only a
 *                 software one can be had, or the renderer is a known software one (Microsoft Basic Render Driver, SwiftShader, llvmpipe),
 *                 the browser is drawing on the CPU: hardware acceleration is off, the driver is missing or blocked, or the GPU process gave up.
 *                 A web page cannot switch the graphics card on, so the title screen tells the player how to (ui/graphicsNotice.js).
 *   mode          the player's choice in Settings > Display, kept in this browser: 'auto' (Light only when drawing in software), 'full', 'light'.
 *   light         is Light graphics on now. Light graphics: no canvas shadows on the screen (the shadow blur under text, panels, embers and
 *                 particles is the costliest thing a 2D canvas draws, and in software it is most of the frame), no smoke, a third of the embers.
 *   applyTo(ctx)  makes the screen's context follow `light` (its shadow settings are ignored while it is on); done once by main.js.
 */
const MODE_KEY = 'shackle-breaker:graphics';
const NOTICE_KEY = 'shackle-breaker:gpu-notice-hidden';
const SOFTWARE_RENDERER = /swiftshader|basic render|llvmpipe|softpipe|software|mesa offscreen|microsoft basic/i;
export const GRAPHICS_MODES = ['auto', 'full', 'light'];

const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode: lasts until the tab closes */ } },
};

export const graphics = {
    info: null,      // { software, renderer, known } once detect() has run
    mode: GRAPHICS_MODES.includes(store.get(MODE_KEY)) ? store.get(MODE_KEY) : 'auto',
    noticeShown: false,   // the title screen's notice is shown once per visit

    detect() {
        if (this.info) return this.info;
        let renderer = '', software = false, known = false;
        try {
            const strict = document.createElement('canvas').getContext('webgl', { failIfMajorPerformanceCaveat: true });
            const gl = strict || document.createElement('canvas').getContext('webgl');
            if (gl) {
                known = true;
                const ext = gl.getExtension('WEBGL_debug_renderer_info');
                renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || '');
                renderer = renderer.replace(/^ANGLE \((.*)\)$/, '$1');
                software = !strict || SOFTWARE_RENDERER.test(renderer);
                for (const c of [strict, gl]) { const lose = c && c.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); }
            }
        } catch (e) { /* no WebGL at all: we cannot tell, so assume the best */ }
        this.info = { software, renderer: renderer || 'unknown', known };
        return this.info;
    },

    get software() { return !!(this.detect() && this.info.software); },
    get light() { return this.mode === 'light' || (this.mode === 'auto' && this.software); },

    setMode(mode) {
        if (!GRAPHICS_MODES.includes(mode)) return;
        this.mode = mode;
        store.set(MODE_KEY, mode);
    },

    /** Should the title screen explain that the graphics card is not in use? (software drawing, not hidden for good, not shown yet this visit) */
    get noticeWanted() { return this.software && !this.noticeShown && store.get(NOTICE_KEY) !== '1'; },
    hideNoticeForGood() { store.set(NOTICE_KEY, '1'); },

    /** The screen's 2D context ignores shadows while Light graphics is on (they are restored as set the moment it is switched off again). */
    applyTo(ctx) {
        if (!ctx || ctx.__graphicsApplied) return;
        const proto = Object.getPrototypeOf(ctx);
        const blur = Object.getOwnPropertyDescriptor(proto, 'shadowBlur');
        const color = Object.getOwnPropertyDescriptor(proto, 'shadowColor');
        if (!blur || !color) return;
        const self = this;
        Object.defineProperty(ctx, 'shadowBlur', {
            configurable: true,
            get() { return blur.get.call(this); },
            set(v) { blur.set.call(this, self.light ? 0 : v); },
        });
        Object.defineProperty(ctx, 'shadowColor', {
            configurable: true,
            get() { return color.get.call(this); },
            set(v) { color.set.call(this, self.light ? 'rgba(0,0,0,0)' : v); },
        });
        ctx.__graphicsApplied = true;
    },
};

/** Which browser this is, for the steps the notice gives: 'edge' | 'chrome' | 'firefox' | 'safari' | 'other' */
export function browserKind(ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '')) {
    if (/Edg\//.test(ua)) return 'edge';
    if (/OPR\/|Opera/.test(ua)) return 'chrome';   // Opera is Chromium: the same switches
    if (/Firefox\//.test(ua)) return 'firefox';
    if (/Chrome\//.test(ua)) return 'chrome';
    if (/Safari\//.test(ua)) return 'safari';
    return 'other';
}

/** The steps that bring the graphics card back, for a browser (shown by the title screen's notice). */
export function gpuFixSteps(kind = browserKind()) {
    const common = [
        'Update your graphics driver (NVIDIA, AMD or Intel), then restart the computer.',
        'On a laptop: plug it in, and in Windows Settings > Display > Graphics set your browser to "High performance".',
    ];
    switch (kind) {
        case 'chrome': return [
            'Open Settings > System and turn on "Use graphics acceleration when available", then press Relaunch.',
            'In Settings > Performance, turn off Energy saver.',
            ...common,
        ];
        case 'edge': return [
            'Open Settings > System and performance and turn on "Use graphics acceleration when available", then restart Edge.',
            'In Settings > System and performance, turn off Efficiency mode.',
            ...common,
        ];
        case 'firefox': return [
            'Open Settings > General > Performance, untick "Use recommended performance settings", tick "Use hardware acceleration when available", then restart Firefox.',
            ...common,
        ];
        case 'safari': return [
            'Update macOS: Safari always uses the graphics card when the system lets it.',
            'Quit and reopen Safari.',
        ];
        default: return [
            'Turn on hardware (graphics) acceleration in your browser\'s settings, then restart it.',
            ...common,
        ];
    }
}
