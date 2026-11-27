#!/usr/bin/env bash
# The snow trio's two new cries (frontend/src/assets/audio/sfx/cries/: frostbitten_warrior_cry.mp3 and rime_hermit_cry.mp3; frostbittenWarriorCry and
# rimeHermitCry in frontend/src/main.js, each entity's crySound and deathSound both): ElevenLabs sound effects, cut to 2.04 s like every other cry,
# faded out and levelled to -10 LUFS.
#   ELEVENLABS_API_KEY=... bash tools/voice/makeSnowTrioCries.sh      (in a cloud session the network proxy supplies the key)
set -euo pipefail
cd "$(dirname "$0")/../.."
TMP=$(mktemp -d)
KEY=${ELEVENLABS_API_KEY:-proxy-injected}
# out file | prompt
SOUNDS=(
  "frontend/src/assets/audio/sfx/cries/frostbitten_warrior_cry.mp3|a huge man frozen inside a shell of ice letting out one deep, pained, guttural groan as the ice around him cracks and splinters, heavy chains rattling, close up, no music"
  "frontend/src/assets/audio/sfx/cries/rime_hermit_cry.mp3|a gaunt old hermit's eerie rasping hiss that turns into a whispered shriek, with a gust of howling freezing wind and the crackle of frost spreading, close up, no music"
)
for entry in "${SOUNDS[@]}"; do
  out="${entry%%|*}"; prompt="${entry#*|}"
  curl -sS -f -o "$TMP/raw.mp3" -X POST https://api.elevenlabs.io/v1/sound-generation \
    -H "xi-api-key: $KEY" -H "Content-Type: application/json" \
    -d "{\"text\": \"$prompt\", \"duration_seconds\": 2.5, \"prompt_influence\": 0.6}"
  ffmpeg -hide_banner -loglevel error -y -i "$TMP/raw.mp3" \
    -af "silenceremove=start_periods=1:start_threshold=-45dB,atrim=0:2.04,afade=t=out:st=1.7:d=0.34,loudnorm=I=-10:TP=-1:LRA=11" \
    -ar 44100 -ac 2 -b:a 128k "$out"
  echo "$out"
done
rm -rf "$TMP"
