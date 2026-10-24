// Run once from the repo root: node apply_npc_objects.mjs
// Three files in this change are also changed by the other zips, so they are edited in place here instead of replaced:
//   frontend/src/main.js                              the shady merchant's character sheet key (and drops the old object-sheet key if apply_shady_merchant.mjs added it)
//   shared/world/mapObjectDefinitions.js              the NPCS block: SHADY_MERCHANT_NPC, DOG_NPC, MADMAN_NPC (replaces the old merchant-only block)
//   frontend/src/screens/overworld/overworldController.js   `triggerRadius`: an ENCOUNTER object starts when you come within N tiles of it, in every direction
// Safe to run twice. Line endings of each file are kept.
import fs from 'node:fs';

function load(file) {
    const raw = fs.readFileSync(file, 'utf8');
    const nl = raw.includes('\r\n') ? '\r\n' : '\n';
    return { s: raw.replace(/\r\n/g, '\n'), nl };
}
function save(file, s, nl) { fs.writeFileSync(file, nl === '\r\n' ? s.replace(/\n/g, '\r\n') : s); console.log(`${file}: done`); }

// ---- main.js
{
    const f = 'frontend/src/main.js';
    const { s: src, nl } = load(f);
    let s = src;
    s = s.replace('./assets/sprites/shady_merchant/shady_merchant.png', './assets/sprites/shady_merchant/shady_merchant_spritesheet.png'); // the sheet was renamed
    if (!s.includes('shadyMerchantSprite:')) {
        const a = "    madmanSprite: './assets/sprites/madman/madman_sprite.png',\n";
        if (!s.includes(a)) throw new Error(f + ': cannot find madmanSprite');
        s = s.replace(a, a + "    shadyMerchantSprite: './assets/sprites/shady_merchant/shady_merchant_spritesheet.png',\n");
    }
    s = s.replace(/^ *objShadyMerchant: .*\n/m, '');
    if (s !== src) save(f, s, nl); else console.log(`${f}: already done`);
}

// ---- mapObjectDefinitions.js
{
    const f = 'shared/world/mapObjectDefinitions.js';
    const { s: src, nl } = load(f);
    if (src.includes('MADMAN_NPC:')) console.log(`${f}: already done`);
    else {
        const block = `    // --- NPCS ---
    /* People and animals standing in the world. They are map objects (placed by a biome's mapObjects rules like a tree, see PLAINS / DESERT / SNOWY_MOUNTAINS), but they have no
       picture of their own: \`character: { sheet, facing }\` draws the idle row of the creature's character sheet (the one it walks and runs from) facing South / East / North / West
       ('DOWN' / 'RIGHT' / 'UP' / 'LEFT'), standing on the tile exactly as a character does (MapRenderer.drawCharacterObject). Face one and interact to start its encounter; the
       encounter takes the object off the map (DESTROY_OBJECT) when the creature leaves, flees, is fought or joins you.
         interaction.triggerRadius: the encounter also starts by itself when you step within that many tiles of it, in every direction (a square, diagonals too), once each time
                                    you come into range (OverworldController.findEncounterZones, the same as the scarecrow's \`triggerLine\` but all around). */
    SHADY_MERCHANT_NPC: { character: { sheet: 'shadyMerchantSprite', facing: 'DOWN' }, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'suspicious_merchant' } },
    DOG_NPC: { character: { sheet: 'germanSheepherdSprite', facing: 'DOWN' }, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'wounded_mutt' } },
    MADMAN_NPC: { character: { sheet: 'madmanSprite', facing: 'DOWN' }, width: 1, height: 1, isSolid: true, isGround: false, isAnchor: true, hitbox: { xOffset: 0, yOffset: 0, w: 1, h: 1 }, interaction: { type: 'ENCOUNTER', id: 'a_disturbing_sight', triggerRadius: 2 } },

`;
        let s = src;
        const start = s.indexOf('    // --- NPCS ---\n');
        const end = s.indexOf('    // --- ANIMATED ---\n');
        if (end < 0) throw new Error(f + ': cannot find the ANIMATED block');
        s = start >= 0 && start < end ? s.slice(0, start) + block + s.slice(end) : s.slice(0, end) + block + s.slice(end);
        save(f, s, nl);
    }
}

// ---- overworldController.js
{
    const f = 'frontend/src/screens/overworld/overworldController.js';
    const { s: src, nl } = load(f);
    if (src.includes('triggerRadius')) console.log(`${f}: already done`);
    else {
        const a = "        if (!wm || !wm.getObject) return zones;\n";
        if (!src.includes(a)) throw new Error(f + ': cannot find findEncounterZones');
        const add = `        /* Circles of unease (\`triggerRadius\` on an ENCOUNTER, e.g. MADMAN_NPC: 2): coming within that many tiles of the object, in any direction (a square around it,
           diagonals included), is in its zone. */
        const MAX_RADIUS = 4;
        if (wm.ensureChunkLoaded) {
            wm.ensureChunkLoaded(col - MAX_RADIUS, row - MAX_RADIUS);
            wm.ensureChunkLoaded(col + MAX_RADIUS, row - MAX_RADIUS);
            wm.ensureChunkLoaded(col - MAX_RADIUS, row + MAX_RADIUS);
            wm.ensureChunkLoaded(col + MAX_RADIUS, row + MAX_RADIUS);
        }
        for (let dy = -MAX_RADIUS; dy <= MAX_RADIUS; dy++) {
            for (let dx = -MAX_RADIUS; dx <= MAX_RADIUS; dx++) {
                const obj = wm.getObject(col + dx, row + dy);
                const radius = obj && !obj.isFading && obj.interaction && obj.interaction.type === 'ENCOUNTER' && obj.interaction.triggerRadius;
                if (radius && Math.max(Math.abs(dx), Math.abs(dy)) <= radius) zones.set(\`\${obj.col},\${obj.row}\`, obj);
            }
        }
`;
        save(f, src.replace(a, a + add), nl);
    }
}
