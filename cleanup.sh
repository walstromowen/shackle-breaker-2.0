#!/bin/sh
# Run from the repo root after unzipping over it. Removes stray / stale copies (safe to run twice).
rm -rf tools/backend tools/frontend tools/shared
rm -f frontend/src/screens/overworld/minimapRenderer.js
rm -f frontend/src/assets/sprites/shady_merchant/shady_merchsant.png
rm -f shared/story/encounters/prologue.js shared/story/encounters/actTwo.js shared/story/encounters/shackledBetrayal.js shared/story/encounters/mysteriousAltar.js
rm -f frontend/src/assets/mapObjects/objAbandonedHouse2.png
echo "cleanup done"
rm -f backend/test/encountertapskip.test.js
