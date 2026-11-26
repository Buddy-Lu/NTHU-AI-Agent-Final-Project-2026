// Text -> audio clip for the avatar page. synth(text) resolves { body, type, ms }.
// TTS_ENGINE=colab (default): Qwen3-TTS in the user's Colab `tts` notebook, driven through the colab-mcp connector
//   (same command/env as Claude Code's, from ~/.claude.json). Run the notebook's `# shiori-tts setup` cell first.
//   Voice: QWEN_VOICE (shiori, the default | a_bright | b_soft | c_energetic | Sohee | Vivian | Serena | Ono_anna). Falls back to SAPI per line.
// TTS_ENGINE=sapi: Windows built-in voice through PowerShell. Robotic, offline.
// TTS_ENGINE=mac: macOS built-in `say` voice (MAC_VOICE, default Samantha). Robotic, offline.
// TTS_ENGINE=edge: Edge read-aloud voice via npm msedge-tts. Opt-in only.
import { execFile, spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';

const EDGE_VOICE = process.env.TTS_VOICE || 'zh-TW-HsiaoYuNeural';
const SAPI_VOICE = process.env.TTS_SAPI_VOICE || 'Microsoft Zira Desktop';   // English, she speaks English
const xml = s => s.replace(/[<>&"']/g, c => `&#${c.charCodeAt(0)};`);

let edge;   // shared MsEdgeTTS instance, created on first use
async function edgeSynth(text) {
  if (!edge) {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
    edge = new MsEdgeTTS();
    await edge.setMetadata(EDGE_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  }
  const { audioStream } = await edge.toStream(xml(text));
  const chunks = [];
  for await (const c of audioStream) chunks.push(c);
  const body = Buffer.concat(chunks);
  return { body, type: 'audio/mpeg', ms: Math.round(body.length / 6) };   // 48 kbit/s CBR = 6 bytes per ms
}

function sapiSynth(text) {
  const file = join(tmpdir(), `shiori-${randomUUID()}.wav`);
  const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer;
    $s.SelectVoice($env:TTS_VOICE_NAME); $s.SetOutputToWaveFile($env:TTS_FILE); $s.Speak($env:TTS_TEXT); $s.Dispose()`;
  return new Promise((resolve, reject) => execFile('powershell.exe', ['-NoProfile', '-Command', ps],
    { env: { ...process.env, TTS_TEXT: text, TTS_FILE: file, TTS_VOICE_NAME: SAPI_VOICE } },   // text via env: no quoting/injection issues
    async err => {
      if (err) return reject(err);
      const body = await readFile(file); rm(file).catch(() => {});
      const byteRate = body.readUInt32LE(28);
      resolve({ body, type: 'audio/wav', ms: Math.round((body.length - 44) / byteRate * 1000) });
    }));
}

// macOS built-in `say` -> 16-bit WAV via afconvert. Voice: MAC_VOICE (default Samantha). Text goes after `--` so it can't be read as a flag.
function macSynth(text) {
  const base = join(tmpdir(), `shiori-${randomUUID()}`);
  const run = (cmd, args) => new Promise((res, rej) => execFile(cmd, args, err => err ? rej(err) : res()));
  return (async () => {
    try {
      await run('say', ['-v', process.env.MAC_VOICE || 'Samantha', '-o', `${base}.aiff`, '--', text]);
      await run('afconvert', ['-f', 'WAVE', '-d', 'LEI16', `${base}.aiff`, `${base}.wav`]);
      const body = await readFile(`${base}.wav`);
      const dataAt = body.indexOf('data') + 8;   // WAV header ends after the "data" chunk size
      return { body, type: 'audio/wav', ms: Math.round((body.length - dataAt) / body.readUInt32LE(28) * 1000) };
    } finally { rm(`${base}.aiff`, { force: true }).catch(() => {}); rm(`${base}.wav`, { force: true }).catch(() => {}); }
  })();
}

// ---- colab: minimal MCP stdio client (newline-delimited JSON-RPC) ----
export function mcpClient(cmd, args = [], env = {}) {
  const child = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'ignore'] });
  const waiting = new Map(); let nextId = 1;
  createInterface({ input: child.stdout }).on('line', line => {
    let m; try { m = JSON.parse(line); } catch { return; }
    const w = waiting.get(m.id); if (!w) return;   // notifications (progress, list_changed) are ignored
    waiting.delete(m.id); m.error ? w.reject(new Error(m.error.message)) : w.resolve(m.result);
  });
  child.on('exit', code => { client.dead = true; for (const w of waiting.values()) w.reject(new Error(`colab-mcp exited (${code})`)); waiting.clear(); });
  const send = msg => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n');
  const request = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++; waiting.set(id, { resolve, reject }); send({ id, method, params });
  });
  const call = async (name, args = {}) => {
    const r = await request('tools/call', { name, arguments: args });
    const data = r.structuredContent ?? JSON.parse(r.content?.[0]?.text || '{}');
    if (r.isError) throw new Error(`${name}: ${r.content?.[0]?.text}`);
    return data;
  };
  const ready = request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'shiori-avatar', version: '1' } })
    .then(() => send({ method: 'notifications/initialized' }));
  const client = { dead: false, ready, request, call, close: () => child.kill() };
  return client;
}

// "AUDIO <ms> <base64 ogg>" printed by say() in the notebook
export function parseAudio(outputs) {
  const text = (outputs || []).flatMap(o => [].concat(o.text ?? [])).join('');
  const m = text.match(/AUDIO (\d+) ([A-Za-z0-9+/=]+)/);
  if (!m) throw new Error(`no audio in cell output: ${text.slice(0, 300)}`);
  return { body: Buffer.from(m[2], 'base64'), type: 'audio/ogg', ms: +m[1] };
}

const QWEN_VOICE = process.env.QWEN_VOICE || 'shiori';
// Shiori's voice: the Base model clones avatar/voice/shiori_ref.ogg (picked by ear on 2026-11-23), so every
// line is the same girl. The clip is uploaded to /content/shiori_ref.wav on connect; REF_TEXT is what it says.
const REF_FILE = join(import.meta.dirname, 'voice', 'shiori_ref.ogg');
const REF_TEXT = "Okay chat, today we are looking at Elon Musk's flying car.";
// say() with a per-line delivery style, sent with every line so the setup cell needn't be re-run.
// Design voices: the style is appended to the voice description (so the timbre drifts with it).
// shiori and the presets keep one fixed speaker and get the style as instruct.
const SAY_DEF = `def say(text, voice="shiori", style=""):
    ins = {"instruct": style} if style else {}
    if voice in DESIGNS: w, sr = _model("VoiceDesign").generate_voice_design(text=text, language="English", instruct=(DESIGNS[voice] + " Delivery: " + style) if style else DESIGNS[voice])
    elif voice in SPK: w, sr = _model("CustomVoice").generate_custom_voice(text=text, language="English", speaker=voice, **ins)
    elif voice == "shiori": w, sr = _model("Base").generate_voice_clone(text=text, language="English", ref_audio="/content/shiori_ref.wav", ref_text=${JSON.stringify(REF_TEXT)}, **ins)
    else: raise ValueError(f"unknown voice {voice}")
    buf = io.BytesIO(); sf.write(buf, w[0], sr, format="OGG", subtype="VORBIS")
    print(f"AUDIO {round(len(w[0]) / sr * 1000)} {base64.b64encode(buf.getvalue()).decode()}")`;
let colab, sayCell, queue = Promise.resolve();
async function colabConnect() {
  const cfg = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8')).mcpServers['colab-mcp'];
  // ponytail: fixed port shared with Claude Code's colab-mcp; disable that one (/mcp) while the avatar runs
  colab = mcpClient(cfg.command, cfg.args, cfg.env);
  await colab.ready;
  console.log('tts: connecting to Colab. Reload (F5) the tts notebook tab now.');
  while (!(await colab.call('open_colab_browser_connection')).result)
    console.warn('tts: waiting for Colab, open (or reload) the tts notebook bookmark');
  const { cells } = await colab.call('get_cells');
  sayCell = cells.find(c => [].concat(c.source).join('').startsWith('# shiori-say'))?.id
    ?? (await colab.call('add_code_cell', { cellIndex: cells.length, language: 'python', code: '# shiori-say' })).newCellId;
  console.log('tts: Colab connected, uploading her voice and warming up (first time per Colab session ~30 s)');
  const ref = readFileSync(REF_FILE).toString('base64');
  await colab.call('update_cell', { cellId: sayCell, content: `# shiori-say
w, sr = sf.read(io.BytesIO(base64.b64decode("${ref}"))); sf.write("/content/shiori_ref.wav", w, sr)
${SAY_DEF}
say("Hi chat.", ${JSON.stringify(QWEN_VOICE)})` });
  parseAudio((await colab.call('run_code_cell', { cellId: sayCell })).outputs);   // throws if the warm-up line failed
  console.log('tts: ready');
}
const ensureColab = () => (colab && !colab.dead) || colabConnect().catch(e => { colab?.close(); colab = null; throw e; });
function colabSynth(text, style, voice) {
  // ponytail: one notebook cell, so lines are generated one at a time
  const job = queue.then(async () => {
    await ensureColab();
    await colab.call('update_cell', { cellId: sayCell, content: `# shiori-say\n${SAY_DEF}\nsay(${JSON.stringify(text)}, ${JSON.stringify(voice || QWEN_VOICE)}, ${JSON.stringify(style)})` });
    return parseAudio((await colab.call('run_code_cell', { cellId: sayCell })).outputs);
  });
  queue = job.catch(() => {});
  return job;
}
// Connect at server start instead of on the first line, so the "reload the tab" hint shows up right away.
export function warmup() {
  if (engine === 'colab') queue = queue.then(ensureColab).catch(e => console.warn(`tts: Colab connect failed (${e.message})`));
}

let engine = process.env.TTS_ENGINE || 'colab';
// style: how to say it ("screaming furiously", "flat and bored"). voice: overrides QWEN_VOICE for this line.
// Only the Qwen engine uses them.
export async function synth(text, style = '', voice = '') {
  if (engine === 'colab') {
    try { return await colabSynth(text, style, voice); }
    catch (e) { console.warn(`tts: Colab failed (${e.message}), using Windows SAPI for this line`); return sapiSynth(text); }
  }
  if (engine === 'mac') return macSynth(text);
  if (engine === 'edge') {
    try { return await edgeSynth(text); }
    catch (e) {
      if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
      console.warn('tts: msedge-tts not installed (npm i msedge-tts), using Windows SAPI');
      engine = 'sapi';
    }
  }
  return sapiSynth(text);
}
export const engineName = () => engine;
