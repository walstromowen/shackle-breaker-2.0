#!/usr/bin/env node
// Run from the repository root:
//   node delete_tests.mjs --dry     prints what would be deleted and changes nothing
//   node delete_tests.mjs           deletes every test in backend/test except the ones worth keeping (listed below)
// Safe to delete this script afterwards.
import fs from 'fs';
import path from 'path';

const DIR = 'backend/test';
const KEEP = new Set([
    'architecture.test.js',     // shared/ stays free of browser code; file-name case for Linux hosting
    'api.test.js',              // login, saves, the server
    'battle.test.js',           // combat rules
    'acts.test.js',             // story acts
    'questTracking.test.js',    // quests
    'scaling.test.js',          // Strength / Intelligence damage, Dexterity / Attunement pools
    'statdescriptions.test.js', // the in-game stat help matches the real numbers
]);
const DRY = process.argv.includes('--dry');
if (!fs.existsSync(DIR)) { console.error(`Run this from the repository root (no ${DIR} here).`); process.exit(1); }

let removed = 0, kept = 0;
for (const f of fs.readdirSync(DIR)) {
    if (KEEP.has(f)) { kept++; continue; }
    if (DRY) console.log('would delete', `${DIR}/${f}`); else fs.rmSync(path.join(DIR, f), { recursive: true });
    removed++;
}
console.log(`${DRY ? 'would delete' : 'deleted'} ${removed} files, kept ${kept}`);
