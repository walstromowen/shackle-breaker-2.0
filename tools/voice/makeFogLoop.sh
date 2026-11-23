#!/usr/bin/env bash
# The fog's ambient loop (frontend/src/assets/audio/sfx/weather_fog.wav, key weatherFog in frontend/src/main.js; also the sandstorm's and the
# blizzard's on the overworld). Three 30-second looping ElevenLabs ambiences of wind in fog, chained with 6-second equal-power crossfades and
# closed into a seamless 72-second loop, levelled to -17 LUFS. Mono 24 kHz WAV: an MP3's encoder padding would put a gap in the loop.
#   ELEVENLABS_API_KEY=... bash tools/voice/makeFogLoop.sh      (in a cloud session the network proxy supplies the key)
# The generations differ every run: listen, and run again if one comes back near-silent.
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=frontend/src/assets/audio/sfx/weather_fog.wav
TMP=$(mktemp -d)
KEY=${ELEVENLABS_API_KEY:-proxy-injected}
PROMPTS=(
  "Dense fog over a moor at dusk: hushed low wind drifting through tall grass, occasional soft gusts swelling and fading, damp heavy air, very subtle, no birds, no voices, no music, continuous ambient bed"
  "Audible low moaning wind in thick fog, hollow breathy gusts rising and falling slowly over open land, damp and cold, no animals, no voices, no music, continuous ambient bed"
  "Steady audible breeze in mist, soft rustle of distant grass, airy wind texture with occasional slow gust, calm and mysterious, no birds, no voices, no music, continuous ambient bed"
)
for i in "${!PROMPTS[@]}"; do
  curl -sS -f -o "$TMP/c$i.mp3" -X POST https://api.elevenlabs.io/v1/sound-generation \
    -H "xi-api-key: $KEY" -H "Content-Type: application/json" \
    -d "{\"text\": \"${PROMPTS[$i]}\", \"duration_seconds\": 30, \"prompt_influence\": 0.6, \"loop\": true, \"model_id\": \"eleven_text_to_sound_v2\"}"
  ffmpeg -hide_banner -loglevel error -y -i "$TMP/c$i.mp3" -af "highpass=f=50,lowpass=f=7000" -ac 2 -ar 44100 -f f32le "$TMP/c$i.f32"
done
python3 - "$TMP" <<'EOF'
import sys, numpy as np
tmp = sys.argv[1]; SR = 44100; X = 6 * SR
clips = [np.fromfile(f'{tmp}/c{i}.f32', dtype=np.float32).reshape(-1, 2).astype(np.float64) for i in range(3)]
clips = [c / np.sqrt(np.mean(c ** 2)) for c in clips]   # each as loud as the others
t = np.linspace(0, np.pi / 2, X)[:, None]; fin, fout = np.sin(t), np.cos(t)
out = clips[0]
for c in clips[1:]:
    out = np.concatenate([out[:-X], out[-X:] * fout + c[:X] * fin, c[X:]])
loop = np.concatenate([out[-X:] * fout + out[:X] * fin, out[X:-X]])   # the tail fades into the head: no seam
loop /= np.max(np.abs(loop)) * 1.05
loop.astype(np.float32).tofile(f'{tmp}/loop.f32')
EOF
ffmpeg -hide_banner -loglevel error -y -f f32le -ar 44100 -ac 2 -i "$TMP/loop.f32" \
  -af "loudnorm=I=-17:TP=-2:LRA=11:linear=true,aresample=24000" -ac 1 -ar 24000 -c:a pcm_s16le "$OUT"
rm -rf "$TMP"
echo "$OUT"
