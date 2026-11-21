#!/usr/bin/env bash
# The Insights' newer spells' own sounds (frontend/src/assets/audio/sfx/abilities/insight/, registered in frontend/src/main.js and used by
# shared/battle/animation/battleAnimationDefinition.js): ElevenLabs sound effects, trimmed, faded and levelled to -14 LUFS.
#   ELEVENLABS_API_KEY=... bash tools/voice/makeInsightSfx.sh [name ...]      (in a cloud session the network proxy supplies the key)
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=frontend/src/assets/audio/sfx/abilities/insight
TMP=$(mktemp -d)
mkdir -p "$OUT"
KEY=${ELEVENLABS_API_KEY:-proxy-injected}
# name | seconds | prompt
SOUNDS=(
  "gust|1.2|a single sharp whoosh of a hard gust of wind thrown forward, fast air blast rushing past, short, no music"
  "downwind|2.2|a steady rising wind sweeping past from behind, soft rushing air with rustling leaves carried along, airy and light, no music"
  "tempest|3|a howling violent storm wind roaring up into a whirlwind, swirling gale with rattling debris, powerful and wild, no music"
  "tidal_wave|3|a huge ocean wave rising with a deep roar and crashing down hard, heavy water slam and spray, powerful, no music"
  "mending_tide|2.2|gentle flowing water welling up softly with bubbling and a soft shimmering magical chime, calm and soothing, no music"
  "glacial_spike_cast|1.6|ice crystallising and cracking as a large icicle forms, creaking groaning ice growing, cold glassy crackle, no music"
  "glacial_spike_impact|1.4|a heavy ice spike slamming into a target and shattering, deep impact with breaking glassy ice shards, no music"
  "frost_ward|2|ice crystals spreading and freezing over a surface with a delicate crackle, ending in a clear cold glassy ring, no music"
  "chain_lightning|1.6|crackling electric arcs jumping rapidly from point to point, three fast sharp electric zaps in a row, sizzling, no music"
  "lightning_strike_charge|1.4|static electricity building in the air, rising electric hum and crackle before a lightning strike, tense, no music"
  "lightning_strike_impact|2.2|a huge lightning bolt striking the ground right here, blinding explosive crack of thunder then a deep rumble, no music"
)
for entry in "${SOUNDS[@]}"; do
  IFS='|' read -r name secs prompt <<< "$entry"
  if [ $# -gt 0 ] && [[ " $* " != *" $name "* ]]; then continue; fi
  curl -sS -f -o "$TMP/$name.mp3" -X POST https://api.elevenlabs.io/v1/sound-generation \
    -H "xi-api-key: $KEY" -H "Content-Type: application/json" \
    -d "{\"text\": \"$prompt\", \"duration_seconds\": $secs, \"prompt_influence\": 0.6}"
  fade=$(python3 -c "print(max(0.0, $secs - 0.3))")
  ffmpeg -hide_banner -loglevel error -y -i "$TMP/$name.mp3" \
    -af "silenceremove=start_periods=1:start_threshold=-50dB,afade=t=out:st=$fade:d=0.3,loudnorm=I=-14:TP=-1.5:LRA=11" \
    -ar 44100 -ac 2 -b:a 128k "$OUT/$name.mp3"
  echo "$name.mp3"
done
rm -rf "$TMP"
