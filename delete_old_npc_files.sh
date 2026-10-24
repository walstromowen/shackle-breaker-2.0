#!/bin/sh
# Run from the repo root. The merchant no longer has a separate object picture (he is drawn from his character sheet), and his old test is replaced by npcobjects.test.js.
rm -f frontend/src/assets/mapObjects/objShadyMerchant.png backend/test/shadymerchant.test.js apply_shady_merchant.mjs
