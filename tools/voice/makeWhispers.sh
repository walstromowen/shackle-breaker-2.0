#!/usr/bin/env bash
# The voices' whispers (frontend/src/assets/audio/sfx/voices/whisper_N.mp3, engine/voicesPlayer.js): ElevenLabs sound effects, darkened and levelled.
#   ELEVENLABS_API_KEY=... bash tools/voice/makeWhispers.sh        (in a cloud session the network proxy supplies the key)
# Each prompt is generated (4.5 s), then pitched down a touch, its brightest highs cut, given a soft echo and fades, and levelled to a faint -27 LUFS.
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=frontend/src/assets/audio/sfx/voices
TMP=$(mktemp -d)
mkdir -p "$OUT"
KEY=${ELEVENLABS_API_KEY:-proxy-injected}
PROMPTS=(
  "faint ghostly whispering, several unintelligible voices murmuring at once in a cold empty dark, breathy, distant, eerie, reverberant, no music"
  "a single faint dark whisper close to the ear, breathy and unintelligible, ghostly, cold, slow, fading away, no music"
  "distant layered whispers of the dead, unintelligible hushed voices overlapping, hollow cavern reverb, dark and haunting, very quiet, no music"
  "sinister faint whispering that swells and fades, many hushed breathy voices, unintelligible words, ghostly, dark ambience, no music"
  "a faint raspy whisper drawn out on a long breath, unintelligible, ghostly and cold, echoing softly in darkness, no music"
  "quiet ghostly murmuring voices chanting under their breath, unintelligible, slow, dark, haunted, distant echo, no music"
)
for i in "${!PROMPTS[@]}"; do
  n=$((i + 1))
  curl -sS -f -o "$TMP/raw_$n.mp3" -X POST https://api.elevenlabs.io/v1/sound-generation \
    -H "xi-api-key: $KEY" -H "Content-Type: application/json" \
    -d "{\"text\": \"${PROMPTS[$i]}\", \"duration_seconds\": 4.5, \"prompt_influence\": 0.55}"
  ffmpeg -hide_banner -loglevel error -y -i "$TMP/raw_$n.mp3" \
    -af "highpass=f=120,lowpass=f=3800,asetrate=44100*0.92,aresample=44100,aecho=0.8:0.6:70|160:0.32|0.18,afade=t=in:d=0.35,afade=t=out:st=4.1:d=0.8,loudnorm=I=-27:TP=-6:LRA=7" \
    -ar 44100 -ac 2 -b:a 128k "$OUT/whisper_$n.mp3"
  echo "whisper_$n.mp3"
done
rm -rf "$TMP"
