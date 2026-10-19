// tools/checkPaths.mjs
//
// Windows and macOS ignore upper / lower case in file names; Linux (Render, Netlify, GitHub Pages, itch.io, ...) does not.
// A game that runs fine locally can therefore break the moment it is hosted: `import './HouseGenerator.js'` for a file called
// houseGenerator.js, or './assets/mapobjects/x.png' for a folder called mapObjects. This script finds every such path.
//
//   node tools/checkPaths.mjs          list the problems (exit code 1 if there are any)
//   node tools/checkPaths.mjs --fix    rewrite the paths in the source to the real case on disk (line endings are untouched)
//
// It checks relative imports in frontend/src and shared, and './assets/...' file paths written in the code (the asset manifest in main.js).
// Paths that match nothing at all (even ignoring case) are listed as MISSING: the file is not there, so no rename can fix them.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = path.join(ROOT, 'frontend', 'src');
const FIX = process.argv.includes('--fix');

const SCAN_DIRS = [FRONTEND, path.join(ROOT, 'shared')];
const SKIP_DIRS = new Set(['node_modules', '.git', path.join(FRONTEND, 'assets')]);

function* walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (SKIP_DIRS.has(entry.name) || SKIP_DIRS.has(full)) continue;
        if (entry.isDirectory()) yield* walk(full);
        else if (entry.name.endsWith('.js')) yield full;
    }
}

/* Walks `target` one segment at a time. Returns the path with the real on-disk case, or null if some segment has no match even ignoring case. */
function resolveCaseInsensitive(target) {
    const parsed = path.parse(target);
    const segments = path.relative(parsed.root, target).split(path.sep).filter(Boolean);
    let current = parsed.root;
    for (const segment of segments) {
        let names;
        try { names = fs.readdirSync(current); } catch { return null; }
        const exact = names.find(n => n === segment);
        const hit = exact || names.find(n => n.toLowerCase() === segment.toLowerCase());
        if (!hit) return null;
        current = path.join(current, hit);
    }
    return current;
}

const toPosix = (p) => p.split(path.sep).join('/');

const IMPORT_RE = /((?:import|export)\s[^'"`;]*?from\s*|import\s*\(\s*|import\s+)(['"])(\.{1,2}\/[^'"\n]+)\2/g;
const ASSET_RE = /(['"`])(\.\/assets\/[^'"`\s]+?\.(?:png|jpe?g|gif|webp|mp3|wav|ogg|json|ttf|woff2?))\1/g;

const problems = [];
let checked = 0;
let fixedFiles = 0;

for (const dir of SCAN_DIRS) {
    for (const file of walk(dir)) {
        const source = fs.readFileSync(file, 'utf8');
        let updated = source;

        const check = (spec, resolveFrom, rewrite) => {
            checked++;
            const wanted = path.resolve(resolveFrom, spec);
            if (fs.existsSync(wanted) && resolveCaseInsensitive(wanted) === wanted) return;   // exact match on disk
            const real = resolveCaseInsensitive(wanted);
            if (!real) {
                problems.push({ kind: 'MISSING', file, spec });
                return;
            }
            let fixedSpec = toPosix(path.relative(resolveFrom, real));
            if (spec.startsWith('./') && !fixedSpec.startsWith('.')) fixedSpec = './' + fixedSpec;
            problems.push({ kind: 'CASE', file, spec, fixedSpec });
            if (FIX) rewrite(spec, fixedSpec);
        };

        for (const m of source.matchAll(IMPORT_RE)) {
            // Skip commented-out imports
            const lineStart = source.lastIndexOf('\n', m.index) + 1;
            if (/^\s*\/\//.test(source.slice(lineStart, m.index + 2))) continue;
            check(m[3], path.dirname(file), (from, to) => { updated = updated.split(`'${from}'`).join(`'${to}'`).split(`"${from}"`).join(`"${to}"`); });
        }
        for (const m of source.matchAll(ASSET_RE)) {
            check(m[2], FRONTEND, (from, to) => { updated = updated.split(from).join(to); });
        }

        if (FIX && updated !== source) {
            fs.writeFileSync(file, updated);
            fixedFiles++;
        }
    }
}

const rel = (f) => toPosix(path.relative(ROOT, f));
const caseProblems = problems.filter(p => p.kind === 'CASE');
const missing = problems.filter(p => p.kind === 'MISSING');

for (const p of caseProblems) console.log(`${FIX ? 'FIXED  ' : 'CASE   '} ${rel(p.file)}: ${p.spec}  ->  ${p.fixedSpec}`);
for (const p of missing) console.log(`MISSING ${rel(p.file)}: ${p.spec}`);

console.log(`\n${checked} paths checked: ${caseProblems.length} with the wrong case${FIX ? ` (rewritten in ${fixedFiles} file(s))` : ''}, ${missing.length} pointing at files that do not exist.`);
if (!FIX && caseProblems.length) console.log('Run again with --fix to rewrite the wrong-case paths.');
process.exit((FIX ? 0 : caseProblems.length) + missing.length > 0 ? 1 : 0);
