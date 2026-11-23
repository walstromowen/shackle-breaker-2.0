// tools/voice/generateVoices.mjs: records the voiced encounters' lines with ElevenLabs, only the ones that have no clip yet.
//
//   node tools/voice/generateVoices.mjs                 a dry run: what would be recorded, and how many characters it costs (nothing is sent)
//   node tools/voice/generateVoices.mjs --generate      record the missing clips (and drop clips no line uses any more)
//   node tools/voice/generateVoices.mjs --generate --only STRANGER     one voice only
//   node tools/voice/generateVoices.mjs --align [--only DARIUS]      word timings for clips that have none (each new clip gets them as it is made)
//   node tools/voice/generateVoices.mjs --generate --raw <dir>   use <dir>/<line key>.mp3 (an untreated take, e.g. downloaded from the
//                                                    ElevenLabs history) instead of recording: re-treats a take without paying for it again
//   node tools/voice/generateVoices.mjs --sample "Some words." --voice <voiceId> --out sample.mp3      try a voice on one line
//   node tools/voice/generateVoices.mjs --level         level every clip already recorded to the same loudness (LEVEL), in place: nothing is sent
//
// Every clip is levelled as it is made (after its "fx"): the whole clip is turned up or down to LEVEL's loudness (EBU R128, two passes, linear,
// so the acting inside a line keeps its rise and fall), and its peaks are kept under LEVEL.tp, so no line plays much louder than another.
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
//                 A direction can also be a list of parts, each read by its own voice: a string is read by the line's voice, { "voice": "OTHER",
//                 "text": "..." } by voices.OTHER (its own model, settings and fx). The parts are recorded one by one, their silent ends trimmed,
//                 and crossfaded into the line's one clip (BLEND seconds), so the voices run into each other: a speaker with another self inside
//                 him (the Madman, and Dolos breaking through him at an eerie moment). Together the parts must say exactly
//                 the words on screen, in order (the clip's word timings are taken from them). Each part is levelled on its own before the join,
//                 so no voice of a line comes out louder than another.
//   "hush"        true: when this voice speaks as a part of a line, the world is muffled around it (Dolos): a moment of dead silence comes
//                 before it instead of a crossfade, and the clip's manifest entry gets "h": [[start, end], ...] (seconds: from his first word to his
//                 last), when the game muffles every other sound (the music, the effects, the ambience) and clears them after
//                 (engine/audioManager.js playVoice)
// voices.json can also have "pronounce": { "word": "how the voices should say it" } for every voice (Panzeria: "Panzeeria": one word, said like Algeria).
//   "fx"          a sound treatment run on each clip with ffmpeg after recording (FX below, e.g. "ghost") The API key is read from ELEVENLABS_API_KEY (a cloud session's network proxy puts
// it in for you: any value works there).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
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
    // deeper: the voice a semitone or so lower at the same speed (asetrate lowers the pitch and slows it, atempo brings the speed back)
    deeper: 'asetrate=44100*0.94,aresample=44100,atempo=1.0638',
    hall: 'aecho=0.8:0.75:70|160|300:0.35|0.25|0.18,highpass=f=80,lowpass=f=9000,volume=1.1',
    // nightmare: the hall echo, darker, with a faint copy of the voice a fourth lower under it (same timing): the shrill mania stays on top,
    // something deeper speaks along beneath it
    // cursed: the voices in a madman's head speaking along with him: faint copies of his voice, one higher and one lower and a little behind,
    // with a short close echo (the words stay clear on top)
    cursed: 'asplit=3[v][hi][lo];[hi]asetrate=44100*1.12,aresample=44100,atempo=0.8929,adelay=35|35,highpass=f=300,volume=0.16[h];[lo]asetrate=44100*0.84,aresample=44100,atempo=1.1905,adelay=60|60,lowpass=f=2200,volume=0.22[l];[v][h][l]amix=inputs=3:normalize=0,aecho=0.8:0.6:45|110:0.22|0.12,highpass=f=70,lowpass=f=8500',
    // possessed: something deeper speaking along under him: a faint copy of his voice about four semitones lower, a breath behind, its top cut off,
    // and only a close, small-room reflection (no hall: he is out in the grass), the words clear on top
    // close: only the possessed treatment's small-room reflection (a voice meant to stand in the same place as a possessed one)
    close: 'aecho=0.8:0.5:25|55:0.18|0.1,highpass=f=60,lowpass=f=8500',
    // dolos: Dolos speaking through someone (the unknown antagonist, story/dolos.js), rare and deafening: the voice with an octave-down copy and a
    // fifth-down copy beneath it, only a faint short ring (two close reflections, no echo tail), compressed (no louder than whoever he speaks
    // through: the world muffled around him is what makes him heard, voices.json "hush")
    dolos: 'asplit=3[v][o][f];[o]asetrate=44100*0.5,aresample=44100,atempo=2.0,lowpass=f=900,volume=0.9[oct];[f]asetrate=44100*0.667,aresample=44100,atempo=1.5,lowpass=f=1800,volume=0.45[fif];[v][oct][fif]amix=inputs=3:normalize=0,aecho=0.8:0.7:9|14:0.22|0.12,highpass=f=35,lowpass=f=6500,acompressor=threshold=0.1:ratio=4:attack=5:release=120:makeup=2',
    // ghoul: a man turning into a beast (the anguished madman): the voice about two semitones lower and a little faster (frantic), the possessed
    // treatment's deeper copy under it, and a growl riding beneath every word (a copy an octave down, its top cut off, driven into a soft clip)
    ghoul: 'asetrate=44100*0.9,aresample=44100,atempo=1.2,asplit=3[v][d][g];[d]asetrate=44100*0.79,aresample=44100,atempo=1.2658,adelay=28|28,lowpass=f=1800,volume=0.3[low];[g]asetrate=44100*0.5,aresample=44100,atempo=2.0,lowpass=f=650,volume=3,asoftclip=type=tanh,volume=0.32[growl];[v][low][growl]amix=inputs=3:normalize=0,aecho=0.8:0.5:25|55:0.18|0.1,highpass=f=60,lowpass=f=8500',
    // helm: a voice inside a great iron helm (an Arc Knight): a close metallic ring (three very short reflections), the low end thinned and a nasal
    // ring brought up, no room echo
    helm: 'aecho=0.8:0.6:6|11|17:0.35|0.25|0.15,highpass=f=90,lowpass=f=6500,equalizer=f=1200:t=q:w=1:g=4',
    // raspy: an old hunter's worn throat (Osric), dry and close, no echo at all: the voice a semitone and a half lower and a little slower, and a rough,
    // saturated copy of its throat range (1.2 to 5.5 kHz, driven into a soft clip) mixed in low under it, for the rasp
    raspy: 'asetrate=44100*0.917,aresample=44100,atempo=1.058,asplit=2[v][g];[g]highpass=f=1200,lowpass=f=5500,volume=6,asoftclip=type=tanh,volume=0.12[grit];[v][grit]amix=inputs=2:normalize=0,highpass=f=50,lowpass=f=9000',
    possessed: 'asplit=2[v][d];[d]asetrate=44100*0.79,aresample=44100,atempo=1.2658,adelay=28|28,lowpass=f=1800,volume=0.3[low];[v][low]amix=inputs=2:normalize=0,aecho=0.8:0.5:25|55:0.18|0.1,highpass=f=60,lowpass=f=8500',
    nightmare: 'asplit=2[v][d];[d]asetrate=44100*0.75,aresample=44100,atempo=1.3333,lowpass=f=2500,volume=0.3[low];[v][low]amix=inputs=2:normalize=0,aecho=0.8:0.85:80|190|340|520:0.32|0.23|0.16|0.09,highpass=f=60,lowpass=f=7000,volume=1.0'
};
/* Every clip's loudness: integrated loudness (LUFS) and true peak (dBTP). Speech in a game sits well at about -19 LUFS. */
const LEVEL = { i: -19, tp: -1.5, lra: 11 };
/** How loud a clip is: loudnorm's measurement ({ input_i, input_tp, ... }), or null when it cannot be measured (too short or silent). */
function measure(audio) {
    const m = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-f', 'mp3', '-i', 'pipe:0', '-af', `loudnorm=I=${LEVEL.i}:TP=${LEVEL.tp}:LRA=${LEVEL.lra}:print_format=json`, '-f', 'null', '-'], { input: audio, maxBuffer: 64 << 20 });
    const json = /\{[\s\S]*\}/.exec(String(m.stderr || ''));
    if (m.status !== 0 || !json) return null;
    const s = JSON.parse(json[0]);
    return Number.isFinite(Number(s.input_i)) && Number(s.input_i) > -60 ? s : null;
}
function ffmpegAf(audio, af) {
    const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'mp3', '-i', 'pipe:0', '-af', af, '-ar', '44100', '-b:a', '128k', '-f', 'mp3', 'pipe:1'], { input: audio, maxBuffer: 64 << 20 });
    if (r.status !== 0 || !r.stdout || !r.stdout.length) throw new Error(`ffmpeg (level): ${String(r.stderr || r.error).slice(0, 300)}`);
    return r.stdout;
}
/** The clip turned up or down to LEVEL: loudnorm, measured first, then applied linearly (the line's own rise and fall kept). A clip whose peaks
 *  stop the linear pass short of LEVEL (a sharp shout in a quiet line) is lifted the rest of the way with a gentle limiter on those peaks.
 *  A clip too short or quiet to measure is kept as it is. */
function levelClip(audio) {
    const s = measure(audio);
    if (!s) return audio;
    let out = ffmpegAf(audio, `loudnorm=I=${LEVEL.i}:TP=${LEVEL.tp}:LRA=${LEVEL.lra}:measured_I=${s.input_i}:measured_TP=${s.input_tp}:measured_LRA=${s.input_lra}:measured_thresh=${s.input_thresh}:offset=${s.target_offset}:linear=true`);
    const after = measure(out);
    const short = after ? LEVEL.i - Number(after.input_i) : 0;
    if (short > 1.5) out = ffmpegAf(out, `volume=${short.toFixed(2)}dB,alimiter=limit=${Math.pow(10, LEVEL.tp / 20).toFixed(3)}:attack=5:release=60:level=disabled`);
    return out;
}

function applyFx(name, audio) {
    if (!name) return audio;
    if (!FX[name]) throw new Error(`No sound treatment "${name}" (FX in generateVoices.mjs)`);
    const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'mp3', '-i', 'pipe:0', '-af', FX[name], '-b:a', '128k', '-f', 'mp3', 'pipe:1'], { input: audio, maxBuffer: 64 << 20 });
    if (r.status !== 0) throw new Error(`ffmpeg (${name}): ${String(r.stderr || r.error).slice(0, 300)}`);
    return r.stdout;
}

/* When each word of a line is said in its clip: ElevenLabs' forced alignment of the words on screen to the finished clip. Returns the start times
   (seconds) of the line's words, split at spaces as the screen splits them, or null when the words do not line up (the text reveal then
   falls back to an even pace over the clip). A stage direction ("[Deep breathing]") has no words to time. */
async function wordTimes(audio, text) {
    if (/^\[[^\]]*\]$/.test(text.trim())) return null;
    const form = new FormData();
    form.append('file', new Blob([audio], { type: 'audio/mpeg' }), 'clip.mp3');
    form.append('text', text);
    const res = await fetch('https://api.elevenlabs.io/v1/forced-alignment', { method: 'POST', headers: { 'xi-api-key': KEY }, body: form });
    if (!res.ok) { console.warn(`  (alignment failed: ${res.status} ${(await res.text()).slice(0, 160)})`); return null; }
    const words = ((await res.json()).words || []).filter(w => w.text.trim());
    const want = text.split(/\s+/).filter(Boolean);
    if (words.length !== want.length) { console.warn(`  (alignment gave ${words.length} words for ${want.length}: left untimed)`); return null; }
    return words.map(w => Math.round(w.start * 100) / 100);
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

/* "pronounce" in voices.json: { "Panzeria": "Panzeeria" }: a word the voices would say wrong, respelled for them (whole words, any voice); the
   screen still shows the real spelling. */
const PRONOUNCE = Object.entries(CONFIG.pronounce || {}).sort((a, b) => b[0].length - a[0].length);
const respell = (text) => PRONOUNCE.reduce((t, [word, said]) => t.replace(new RegExp(`\\b${word}\\b`, 'g'), said), text);

/** The parts a line is read in: [{ voice, text }], one part (the line's voice) unless its direction is a list of parts (a part's voice reads it). */
const partsOf = (l) => {
    const dir = (CONFIG.voices[l.speaker].directions || {})[l.text];
    const list = Array.isArray(dir) ? dir : [dir || l.text];
    return list.map(p => (typeof p === 'string' ? { voice: l.speaker, text: p } : { voice: p.voice || l.speaker, text: p.text }));
};
/** What the voices are given for a line: its direction (the words with acting cues), else the words; with the respellings. */
const spokenText = (l) => partsOf(l).map(p => respell(p.text)).join(' ');

/** A short tag for the voice and the way it reads the line: a clip made with another voice, model, settings, treatment or direction has another
    file name (and is recorded again). */
const voiceTag = (l) => {
    const v = CONFIG.voices[l.speaker];
    const parts = [v.id, v.model || CONFIG.model, v.settings || CONFIG.defaultSettings];
    const dir = (v.directions || {})[l.text];
    if (v.fx || dir) parts.push(v.fx || null, dir || null);
    if (v.fx) parts.push(FX[v.fx] || null);   // the treatment itself: retuning it (less echo) makes new clips
    const plain = (v.directions || {})[l.text] || l.text;
    const said = typeof plain === 'string' ? plain : JSON.stringify(plain);
    if (respell(said) !== said) parts.push(['say', respell(said)]);   // a respelled word: a line it changes is recorded again
    for (const p of partsOf(l)) if (p.voice !== l.speaker) {          // a part read by another voice: that voice as it is
        const o = CONFIG.voices[p.voice] || {};
        parts.push([p.voice, o.id, o.model || CONFIG.model, o.settings || CONFIG.defaultSettings, o.fx || null, FX[o.fx] || null, o.hush ? ['hush', HUSH_GAP, HUSH_AFTER] : null]);
    }
    return crypto.createHash('sha1').update(JSON.stringify(parts)).digest('hex').slice(0, 8);
};

/** How long one part of a line fades into the next (seconds): the voices overlap that long, so one runs into the other. */
const BLEND = 0.12;
/** The silence at both ends of a take cut off (a part joined to the next). */
function trimmed(audio) {
    return ffmpegAf(audio, 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse');
}
/** The dead silence before a hushing voice (voices.json "hush") speaks, and after it if the line goes on (seconds). */
const HUSH_GAP = 0.45, HUSH_AFTER = 0.3;
/** When the sound really starts near `t` seconds in a clip: the first 10 ms that rises within 30 dB of the clip's loudest, from a little before
 *  `t` (the computed start of a part lands off by the encoder's padding and a voice's soft first breath). */
function onsetNear(audio, t) {
    const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'mp3', '-i', 'pipe:0', '-ac', '1', '-ar', '16000', '-f', 's16le', 'pipe:1'], { input: audio, maxBuffer: 64 << 20 });
    if (r.status !== 0 || !r.stdout) return t;
    const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 2));
    const N = 160, db = [];
    for (let i = 0; i + N <= pcm.length; i += N) { let s = 0; for (let j = i; j < i + N; j++) s += (pcm[j] / 32768) ** 2; db.push(10 * Math.log10(s / N + 1e-12)); }
    const floor = Math.max(...db) - 30;
    for (let k = Math.max(0, Math.floor((t - 0.25) * 100)); k < Math.min(db.length, Math.ceil((t + 0.5) * 100)); k++) if (db[k] > floor) return Math.round(k) / 100;
    return t;
}
/** The parts' takes, one after another, as one clip: each crossfades into the next, except into and out of a hushing voice (silence between).
 *  takes: [{ audio, hush }]. Returns { audio, hush: [[start, end], ...] }: when the hushing parts sound, from their first word to their last. */
function joined(takes) {
    const hush = [];
    let prevEnd = 0;
    const steps = takes.map((tk, i) => {
        const d = mp3Duration(tk.audio);
        const into = i > 0 && tk.hush, outOf = i > 0 && takes[i - 1].hush;
        const how = i === 0 ? null : into ? { gap: HUSH_GAP } : outOf ? { gap: HUSH_AFTER } : { fade: BLEND };
        const start = i === 0 ? 0 : how.gap ? prevEnd + how.gap : prevEnd - BLEND;
        if (tk.hush) hush.push([Math.round(start * 100) / 100, Math.round((start + d) * 100) / 100]);
        prevEnd = start + d;
        return how;
    });
    if (takes.length === 1) return { audio: takes[0].audio, hush };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-parts-'));
    try {
        const ins = [];
        takes.forEach((tk, i) => { const f = path.join(dir, `${i}.mp3`); fs.writeFileSync(f, tk.audio); ins.push('-i', f); });
        let graph = takes.map((_, i) => `[${i}:a]aresample=44100,aformat=channel_layouts=mono[a${i}]`).join(';');
        let last = 'a0';
        for (let i = 1; i < takes.length; i++) {
            const out = i === takes.length - 1 ? 'out' : `x${i}`, how = steps[i];
            graph += how.gap ? `;[${last}]apad=pad_dur=${how.gap}[p${i}];[p${i}][a${i}]concat=n=2:v=0:a=1[${out}]`
                             : `;[${last}][a${i}]acrossfade=d=${BLEND}:c1=qsin:c2=qsin[${out}]`;
            last = out;
        }
        const r = spawnSync('ffmpeg', ['-loglevel', 'error', ...ins, '-filter_complex', graph, '-map', '[out]', '-ar', '44100', '-b:a', '128k', '-f', 'mp3', 'pipe:1'], { maxBuffer: 64 << 20 });
        if (r.status !== 0 || !r.stdout || !r.stdout.length) throw new Error(`ffmpeg (join): ${String(r.stderr || r.error).slice(0, 300)}`);
        return { audio: r.stdout, hush: hush.map(([a, b]) => [onsetNear(r.stdout, a), b]) };
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
/** A line recorded: each part by its voice, with that voice's treatment; a line read in more than one take has each take trimmed, levelled and
 *  joined. Returns { audio, hush } (joined). */
async function record(l) {
    const parts = partsOf(l);
    const takes = [];
    for (const p of parts) {
        const v = CONFIG.voices[p.voice];
        if (!v) throw new Error(`No voice ${p.voice} in tools/voice/voices.json (a part of ${l.speaker}'s "${l.text.slice(0, 40)}")`);
        const take = applyFx(v.fx, await tts(v.id, respell(p.text), v.settings || CONFIG.defaultSettings, v.model || CONFIG.model));
        takes.push({ audio: parts.length > 1 ? levelClip(trimmed(take)) : take, hush: !!v.hush });
    }
    return joined(takes);
}

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

    if (flag('--level')) {
        // every clip already made, levelled in place to LEVEL (the words keep their timings: the clip's length does not change)
        let n = 0;
        for (const e of Object.values(manifest)) {
            const f = e && typeof e === 'object' && e.f && path.join(OUT_DIR, e.f);
            if (!f || !fs.existsSync(f)) continue;
            const audio = levelClip(fs.readFileSync(f));
            fs.writeFileSync(f, audio);
            e.d = mp3Duration(audio);
            n++;
        }
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
        console.log(`Levelled ${n} clips to ${LEVEL.i} LUFS.`);
        return;
    }
    if (flag('--align')) {
        let n = 0;
        for (const l of lines) {
            const e = manifest[l.key];
            if ((only && l.speaker !== only) || !e || typeof e !== 'object' || e.w || fileIn(e) !== fileOf(l)) continue;
            const w = await wordTimes(fs.readFileSync(path.join(OUT_DIR, e.f)), l.text);
            if (w) { e.w = w; n++; console.log(`  timed ${l.speaker}: ${l.text.slice(0, 60)}`); }
        }
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
        console.log(`Word timings added to ${n} clips.`);
        return;
    }
    if (!flag('--generate')) {
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));   // (only adds lengths to an older manifest)
        console.log('Dry run: nothing was sent. Add --generate to record them.');
        return;
    }
    let done = 0;
    for (const l of missing) {
        const v = CONFIG.voices[l.speaker];
        const rawFile = opt('--raw') && path.join(opt('--raw'), `${l.key}.mp3`);
        const rec = rawFile && fs.existsSync(rawFile) ? { audio: applyFx(v.fx, fs.readFileSync(rawFile)), hush: [] } : await record(l);
        const audio = levelClip(rec.audio);
        fs.writeFileSync(path.join(OUT_DIR, fileOf(l)), audio);
        manifest[l.key] = { f: fileOf(l), d: mp3Duration(audio) };   // the file, and its length in seconds (the words on screen keep time with it)
        if (rec.hush.length) manifest[l.key].h = rec.hush;            // when the world falls silent around a hushing voice (voices.json "hush")
        const w = await wordTimes(audio, l.text);
        if (w) manifest[l.key].w = w;                                 // and when each word is said
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
