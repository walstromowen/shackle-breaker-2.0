// Run once from the repository root after unzipping fences.zip: removes the six old fence pictures that the new objWoodenFence.png replaces.
import fs from 'fs';
const OLD = ['H', 'V', 'TlCorner', 'TrCorner', 'BlCorner', 'BrCorner'].map(n => `frontend/src/assets/mapObjects/objWoodenFence${n}.png`);
if (!fs.existsSync('frontend/src/assets/mapObjects/objWoodenFence.png')) { console.error('Unzip fences.zip into the repository root first.'); process.exit(1); }
let n = 0;
for (const f of OLD) if (fs.existsSync(f)) { fs.rmSync(f); n++; }
console.log(`removed ${n} old fence picture${n === 1 ? '' : 's'}`);
