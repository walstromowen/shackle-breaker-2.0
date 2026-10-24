#!/bin/sh
# Run from the repository root AFTER extracting story-folders-smoke.zip over it.
# A zip can only add files, so the old copies of the moved story files have to be removed by hand: this does it with git.
set -e
git rm -q --ignore-unmatch \
  shared/story/encounters/prologue.js \
  shared/story/encounters/actTwo.js \
  shared/story/encounters/shackledBetrayal.js \
  shared/story/encounters/mysteriousAltar.js \
  frontend/src/assets/icons/encounters/prologue.png \
  frontend/src/assets/icons/encounters/mysterious_altar.png \
  frontend/src/assets/audio/sfx/encounters/altar_drone.wav
git rm -rq --ignore-unmatch frontend/src/assets/audio/sfx/prologue
# Also dead (nothing imports them any more); remove them too if you agree:
git rm -q --ignore-unmatch shared/story/encounters/crimsonVigil.js backend/test/camouflage.test.js
echo "done: now run  npm test  in backend/"
