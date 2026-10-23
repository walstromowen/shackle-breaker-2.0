// backend/test/architecture.test.js: `npm test`. The folder rules in ARCHITECTURE.md, checked, so a file put in the wrong place (or an import that
// reaches across the wrong line) fails here instead of confusing the next person.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKIP = new Set(['node_modules', '.git', 'assets']);
const SHARED_DOMAINS = ['abilities', 'battle', 'characters', 'core', 'items', 'story', 'world'];
const SCREENS = fs.readdirSync(path.join(ROOT, 'frontend/src/screens'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP.has(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out); else if (/\.(js|mjs)$/.test(e.name)) out.push(p);
    }
    return out;
}
/* a folder with no files in it (git does not keep those, an unzipped old layout may leave them behind) does not count */
const hasFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).some(e => e.isFile() || (e.isDirectory() && hasFiles(path.join(dir, e.name))));
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const code = (file) => fs.readFileSync(file, 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');   // no comment lines
const IMPORT = /(?:import|export)\s[^'"`;]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)|(?:^|\n)\s*import\s+['"](\.{1,2}\/[^'"]+)['"]/g;
const importsOf = (file) => [...code(file).matchAll(IMPORT)].map(m => m[1] || m[2] || m[3]).map(spec => path.resolve(path.dirname(file), spec));

const shared = walk(path.join(ROOT, 'shared'));
const frontend = walk(path.join(ROOT, 'frontend/src'));
const area = (file) => { const r = rel(file).split('/'); return r[0] === 'shared' ? `shared/${r[1]}` : r[2] === 'screens' ? `screens/${r[3]}` : `frontend/${r[2]}`; };

test('every relative import in the game resolves to a file, with the exact case (Linux hosts care)', () => {
    const missing = [];
    for (const file of [...shared, ...frontend, ...walk(path.join(ROOT, 'backend/src')), ...walk(path.join(ROOT, 'backend/test'))]) {
        for (const target of importsOf(file)) {
            const dir = path.dirname(target);
            const exact = fs.existsSync(dir) && fs.readdirSync(dir).includes(path.basename(target));
            if (!exact) missing.push(`${rel(file)} -> ${rel(target)}`);
        }
    }
    assert.deepEqual(missing, []);
});

test('shared/ is the game without a screen: it imports nothing from frontend/ or backend/ and touches no browser API', () => {
    const bad = [];
    for (const file of shared) {
        for (const target of importsOf(file)) if (!rel(target).startsWith('shared/')) bad.push(`${rel(file)} imports ${rel(target)}`);
        const text = code(file);
        if (/\b(document|window|localStorage|sessionStorage|requestAnimationFrame|navigator)\./.test(text) || /new (Audio|Image)\(/.test(text)) bad.push(`${rel(file)} uses a browser API`);
    }
    assert.deepEqual(bad, []);
});

test('shared/ has only the documented feature folders, and every file sits in one', () => {
    const top = fs.readdirSync(path.join(ROOT, 'shared'), { withFileTypes: true });
    assert.deepEqual(top.filter(e => e.isDirectory() && !SKIP.has(e.name) && hasFiles(path.join(ROOT, 'shared', e.name))).map(e => e.name).sort(), SHARED_DOMAINS);
    for (const f of top.filter(e => e.isFile())) assert.ok(['package.json'].includes(f.name), `${f.name} is loose in shared/`);
});

test('frontend/src has engine, screens, ui and auth, and the old controllers / renderers / core folders are gone', () => {
    const dirs = fs.readdirSync(path.join(ROOT, 'frontend/src'), { withFileTypes: true }).filter(e => e.isDirectory() && hasFiles(path.join(ROOT, 'frontend/src', e.name))).map(e => e.name).sort();
    assert.deepEqual(dirs, ['assets', 'auth', 'engine', 'screens', 'ui']);
    for (const old of ['shared/systems', 'shared/data', 'shared/models', 'shared/utils', 'shared/state', 'shared/generators', 'shared/frontend', 'tools/frontend']) {
        assert.ok(!fs.existsSync(path.join(ROOT, old)) || !hasFiles(path.join(ROOT, old)), `${old} should not hold files any more`);
    }
});

test('a screen never reaches into another screen: shared pieces live in ui/ or engine/, and only the scene manager wires screens together', () => {
    const bad = [];
    for (const file of frontend) {
        const a = area(file);
        for (const target of importsOf(file)) {
            const b = area(target);
            if (a.startsWith('screens/') && b.startsWith('screens/') && a !== b) bad.push(`${rel(file)} imports ${rel(target)}`);
            if (b.startsWith('screens/') && !a.startsWith('screens/') && !['frontend/src/engine/sceneManager.js', 'frontend/src/main.js'].includes(rel(file))) bad.push(`${rel(file)} imports ${rel(target)}`);
        }
    }
    assert.deepEqual(bad, []);
});

test('every screen folder is a screen the scene manager knows, and the engine and ui toolkit never import a screen', () => {
    assert.ok(SCREENS.includes('battle') && SCREENS.includes('overworld'));
    const scene = fs.readFileSync(path.join(ROOT, 'frontend/src/engine/sceneManager.js'), 'utf8');
    for (const s of SCREENS) assert.ok(scene.includes(`/screens/${s}/`), `sceneManager does not import screens/${s}`);
    for (const file of frontend.filter(f => /\/frontend\/src\/(engine|ui|auth)\//.test(f.split(path.sep).join('/')) && !f.endsWith('sceneManager.js'))) {
        for (const target of importsOf(file)) assert.ok(!rel(target).startsWith('frontend/src/screens/'), `${rel(file)} imports a screen`);
    }
});
