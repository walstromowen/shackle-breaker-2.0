// frontend/src/auth/apiConfig.js: where the game finds its server.
//
// Normally the server (backend/) also serves the game, so the API is on the same address (the base is '').
// If the game page is hosted somewhere else, put the server's address in index.html:  <meta name="api-base" content="https://my-server.onrender.com">
// While developing with a plain dev server (VS Code Live Server on :5500...) there is no API on the page's own address: on localhost the game then
// uses the backend on localhost:3000 (`npm run dev`).

let resolved = null;

/** Resolves the base URL for API calls ('' = same address as the page). Worked out once, then remembered. */
export function resolveApiBase() {
    if (resolved) return resolved;
    resolved = (async () => {
        const meta = document.querySelector('meta[name="api-base"]');
        if (meta && meta.content && meta.content.trim()) return meta.content.trim().replace(/\/+$/, '');

        const { protocol, hostname } = window.location;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        if (!isLocal) return '';

        // Is this page served by the backend itself? (a plain dev server answers /api/health with 404 or an HTML page)
        try {
            const res = await fetch('/api/health', { cache: 'no-store' });
            const json = res.ok ? await res.json() : null;
            if (json && json.ok) return '';
        } catch { /* not the backend */ }
        return `${protocol}//${hostname}:3000`;
    })();
    return resolved;
}
