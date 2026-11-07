// backend/test/encounterpace.test.js: `npm test`. Encounters move quickly: a roll is not narrated before it is thrown (the player just chose it),
// and XP, items and coin gained float up as toasts instead of stopping the story for a screen of their own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gameState } from '../../shared/core/gameState.js';

const ROOT = new URL('../../shared/story/encounters/', import.meta.url).pathname;
const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const encounterFiles = () => {
    const out = [];
    (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && out.push(p); } })(ROOT);
    return out;
};

test('no skill-check decision narrates what the player does before the roll', async () => {
    const offenders = [];
    for (const f of encounterFiles()) {
        const mod = await import(f);
        const seen = new Set();
        const walk = (o) => {
            if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o);
            if (o.type === 'skill_check' && o.customActionText) offenders.push(`${path.basename(f)}: ${o.text}`);
            Object.values(o).forEach(walk);
        };
        Object.values(mod).forEach(walk);
    }
    assert.deepEqual(offenders, []);
});

test('encounter XP, items and coin go to toasts, not to a reward screen', () => {
    const logic = read('frontend/src/screens/encounter/encounterLogic.js');
    assert.ok(!/Obtained Items/.test(logic), 'no "Obtained Items" screen');
    assert.ok(!/response\.messages\.push\(xpEarned/.test(logic) && !/response\.messages\.push\(currencyFound/.test(logic));
    assert.match(logic, /pushItemToast\(id, qty\)/);
    assert.match(read('frontend/src/screens/encounter/encounterRenderer.js'), /drawToasts\(ctx, ui, this\.loader, toasts/, 'the encounter screen draws them');
});

test('a toast raised for an item carries its icon; a batch staggers in', async () => {
    const { pushItemToast, pushTextToast } = await import('../../frontend/src/ui/toasts.js');
    gameState.ui = { toasts: [] };
    pushItemToast('healing_herb', 2);
    pushTextToast('+20 XP');
    const [item, xp] = gameState.ui.toasts;
    assert.equal(item.itemId, 'healing_herb');
    assert.equal(item.amount, 2);
    assert.ok(item.iconSheet && Number.isInteger(item.iconCol) && Number.isInteger(item.iconRow));
    assert.equal(xp.label, '+20 XP');
    assert.ok(xp.createdAt > item.createdAt, 'the second one rises a moment later');
});

test('a roll with no narration keeps the stage on screen under the dice (it does not draw a blank screen)', () => {
    const c = read('frontend/src/screens/encounter/encounterController.js');
    assert.match(c, /this\.actionMessage = this\.lastText;\s*\r?\n\s*this\.skipMessageAnimation = true;\s*\r?\n\s*this\.rollData = this\._takeRoll/);
});

test('no encounter line that will be read aloud carries a player-chosen name (a recorded voice cannot say it)', async () => {
    const offenders = [];
    for (const f of encounterFiles()) {
        if (/testEncounter/.test(f)) continue;
        const mod = await import(f);
        const seen = new Set();
        const walk = (o) => {
            if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o);
            if (o.stages) for (const [id, st] of Object.entries(o.stages)) if (/{name}|{betrayer}/.test(st.text || '')) offenders.push(`${path.basename(f)} ${id}`);
            if (/{name}|{betrayer}/.test(o.customActionText || '')) offenders.push(`${path.basename(f)}: ${o.text}`);
            Object.values(o).forEach(walk);
        };
        Object.values(mod).forEach(walk);
    }
    assert.deepEqual(offenders, []);
});
