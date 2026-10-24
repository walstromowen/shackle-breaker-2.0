#!/bin/sh
# Run from the repo root after unzipping tooltips-respawn-saves.zip over it.
git rm -f frontend/src/screens/battle/particle.js \
          frontend/src/screens/battle/VFXRenderer.js \
          frontend/src/ui/embers.js \
          frontend/src/ui/smoke.js \
          frontend/src/assets/icons/particles.png
