// tools/voice/generateVoices.mjs: records the voiced encounters' lines with ElevenLabs, only the ones that have no clip yet.
//
//   node tools/voice/generateVoices.mjs                 a dry run: what would be recorded, and how many characters it costs (nothing is sent)
//   node tools/voice/generateVoices.mjs --generate      record the missing clips (and drop clips no line uses any more)
//   node tools/voice/generateVoices.mjs --generate --only STRANGER     one voice only
//   node tools/voice/generateVoices.mjs --sample "Some words." --voice <voiceId> --out sample.mp3      try a voice on one line
//
// Which encounters are voiced, and who speaks what: shared/story/voiceLines.js (VOICED, SPEAKERS). The voices: tools/voice/voices.json.
// Clips go to frontend/src/assets/audio/voice/, named by the line's key and the voice that read it, with manifest.json mapping each line's
// key to its file (the game looks the clip up from the words on screen). A changed line is a new key, so only it is recorded again; changing
// a voice in voices.json re-records that voice's lines.
//
// A voice in voices.json can also have:
//   "model"       its own model (e.g. "eleven_v3", which takes acting cues), instead of the top-level one
//   "settings"    its own voice settings
//   "directions"  { "the line as it reads on screen": "what the voice is given instead" }: the same words with acting cues in square brackets
//                 ("[voice breaking] No, you are not him."), for eleven_v3. Only the recording hears them; the screen shows the line as written.
//                 Changing a line's direction records that line again.
//   "fx"          a sound treatment run on each clip with ffmpeg after recording (FX below, e.g. "ghost") The API key is read from ELEVENLABS_API_KEY (a cloud session's network proxy puts
// it in for you: any value works there).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Behind an HTTPS proxy (a cloud session), Node's fetch only uses it with NODE_USE_ENV_PROXY=1: run again with it set.
if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
    const r = spawnSync(process.execPath, ['--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
    process.exit(r.status ?? 1);
}
import { encounterDefinitions } from '../../shared/story/encounterDefinitions.js';
import { VOICED, linesOf } from '../../shared/story/voiceLines.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'frontend', 'src', 'assets', 'audio', 'voice');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'voice', 'voices.json'), 'utf8'));
const API = 'https://api.elevenlabs.io/v1/text-to-speech';
const KEY = process.env.ELEVENLABS_API_KEY || 'proxy-injected';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

/* Sound treatments (ffmpeg -af). ghost: a touch deeper and slower, a hollow stone-chamber echo, the top end softened. */
const FX = {
    ghost: 'asetrate=44100*0.94,aresample=44100,aecho=0.8:0.7:60|140|260:0.35|0.25|0.15,highpass=f=90,lowpass=f=7500,volume=1.1',
    // hall: the same stone-chamber echo with the voice's own pitch kept (a shrill voice stays shrill), a little longer, like a preacher in an empty nave
    hall: 'aecho=0.8:0.75:70|160|300:0.35|0.25|0.18,highpass=f=80,lowpass=f=9000,volume=1.1',
    // nightmare: the hall echo, darker, with a faint copy of the voice a fourth lower under it (same timing): the shrill mania stays on top,
    // something deeper speaks along beneath it
    nightmare: 'asplit=2[v][d];[d]asetrate=44100*0.75,aresample=44100,atempo=1.3333,lowpass=f=2500,volume=0.3[low];[v][low]amix=inputs=2:normalize=0,aecho=0.8:0.8:80|190|340|520:0.4|0.3|0.22|0.14,highpass=f=60,lowpass=f=7000,volume=1.0'
};
function applyFx(name, audio) {
    if (!name) return audio;
    if (!FX[name]) throw new Error(`No sound treatment "${name}" (FX in generateVoices.mjs)`);
    const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'mp3', '-i', 'pipe:0', '-af', FX[name], '-b:a', '128k', '-f', 'mp3', 'pipe:1'], { input: audio, maxBuffer: 64 << 20 });
    if (r.status !== 0) throw new Error(`ffmpeg (${name}): ${String(r.stderr || r.error).slice(0, 300)}`);
    return r.stdout;
}

async function tts(voiceId, text, settings, model = CONFIG.model) {
    const res = await fetch(`${API}/${voiceId}?output_format=${CONFIG.outputFormat || 'mp3_44100_128'}`, {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: model, voice_settings: settings || CONFIG.defaultSettings })
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return Buffer.from(await res.arrayBuffer());
}

/** The length of an MP3 in seconds, from its frame headers (MPEG-1/2 Layer III; skips an ID3v2 tag). */
export function mp3Duration(buf) {
    let i = 0;
    if (buf.length > 10 && buf.toString('latin1', 0, 3) === 'ID3') {
        i = 10 + ((buf[6] & 0x7f) << 21 | (buf[7] & 0x7f) << 14 | (buf[8] & 0x7f) << 7 | (buf[9] & 0x7f));
    }
    const BITRATES = { 1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] };
    const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
    let seconds = 0;
    while (i + 4 <= buf.length) {
        if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) { i++; continue; }
        const ver = (buf[i + 1] >> 3) & 3, layer = (buf[i + 1] >> 1) & 3, br = (buf[i + 2] >> 4) & 15, sr = (buf[i + 2] >> 2) & 3, pad = (buf[i + 2] >> 1) & 1;
        if (ver === 1 || layer !== 1 || br === 0 || br === 15 || sr === 3) { i++; continue; }
        const mpeg1 = ver === 3;
        const bitrate = BITRATES[mpeg1 ? 1 : 2][br] * 1000, rate = RATES[ver][sr];
        const samples = mpeg1 ? 1152 : 576;
        const len = Math.floor((samples / 8) * bitrate / rate) + pad;
        if (len < 4) { i++; continue; }
        seconds += samples / rate;
        i += len;
    }
    return Math.round(seconds * 1000) / 1000;
}

/** What the voice is given for a line: its direction (the words with acting cues), else the words. */
const spokenText = (l) => ((CONFIG.voices[l.speaker].directions || {})[l.text]) || l.text;

/** A short tag for the voice and the way it reads the line: a clip made with another voice, model, settings, treatment or direction has another
    file name (and is recorded again). */
const voiceTag = (l) => {
    const v = CONFIG.voices[l.speaker];
    const parts = [v.id, v.model || CONFIG.model, v.settings || CONFIG.defaultSettings];
    const dir = (v.directions || {})[l.text];
    if (v.fx || dir) parts.push(v.fx || null, dir || null);
    return crypto.createHash('sha1').update(JSON.stringify(parts)).digest('hex').slice(0, 8);
};

async function main() {
    if (opt('--sample')) {
        const out = opt('--out') || 'sample.mp3';
        fs.writeFileSync(out, await tts(opt('--voice'), opt('--sample'), CONFIG.defaultSettings));
        console.log(`wrote ${out}`);
        return;
    }
    const only = opt('--only');
    const lines = [];
    const seen = new Set();
    for (const id of Object.keys(VOICED)) {
        if (!encounterDefinitions[id]) { console.warn(`(no encounter ${id})`); continue; }
        for (const l of linesOf(id, encounterDefinitions[id])) if (!seen.has(l.key)) { seen.add(l.key); lines.push(l); }
    }
    for (const l of lines) if (!CONFIG.voices[l.speaker]) throw new Error(`No voice for ${l.speaker} in tools/voice/voices.json`);

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
    const fileOf = (l) => `${l.key}-${voiceTag(l)}.mp3`;
    // a direction must still match a line (a line rewritten on screen leaves its old direction behind)
    for (const [who, v] of Object.entries(CONFIG.voices)) for (const t of Object.keys(v.directions || {})) {
        if (!lines.some(l => l.speaker === who && l.text === t)) console.warn(`(${who}: no line reads "${t.slice(0, 60)}", its direction is unused)`);
    }
    const fileIn = (e) => (typeof e === 'string' ? e : e && e.f);
    // an older manifest (key -> file name): each clip's length is measured now
    for (const [k, e] of Object.entries(manifest)) if (typeof e === 'string' && fs.existsSync(path.join(OUT_DIR, e))) manifest[k] = { f: e, d: mp3Duration(fs.readFileSync(path.join(OUT_DIR, e))) };
    const missing = lines.filter(l => (!only || l.speaker === only) && !(fileIn(manifest[l.key]) === fileOf(l) && fs.existsSync(path.join(OUT_DIR, fileOf(l)))));
    const chars = missing.reduce((n, l) => n + spokenText(l).length, 0);
    const bySpeaker = {};
    for (const l of missing) bySpeaker[l.speaker] = (bySpeaker[l.speaker] || 0) + spokenText(l).length;
    console.log(`${lines.length} voiced lines in ${Object.keys(VOICED).join(', ')}; ${missing.length} need recording: ${chars} characters ${JSON.stringify(bySpeaker)}`);

    if (!flag('--generate')) {
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));   // (only adds lengths to an older manifest)
        console.log('Dry run: nothing was sent. Add --generate to record them.');
        return;
    }
    let done = 0;
    for (const l of missing) {
        const v = CONFIG.voices[l.speaker];
        const audio = applyFx(v.fx, await tts(v.id, spokenText(l), v.settings || CONFIG.defaultSettings, v.model || CONFIG.model));
        fs.writeFileSync(path.join(OUT_DIR, fileOf(l)), audio);
        manifest[l.key] = { f: fileOf(l), d: mp3Duration(audio) };   // the file, and its length in seconds (the words on screen keep time with it)
        done++;
        console.log(`  [${done}/${missing.length}] ${l.speaker}: ${l.text.slice(0, 70)}${l.text.length > 70 ? '...' : ''}`);
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));   // after every clip: an interrupted run keeps what it made
    }
    // clips no line uses any more (the words changed, or the voice did)
    const used = new Set(lines.map(fileOf));
    for (const key of Object.keys(manifest)) if (!seen.has(key)) delete manifest[key];
    for (const f of fs.readdirSync(OUT_DIR)) if (f.endsWith('.mp3') && !used.has(f)) fs.unlinkSync(path.join(OUT_DIR, f));
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
    console.log(`Recorded ${done} clips.`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
