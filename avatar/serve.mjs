// Avatar server: static files + tool endpoint.
//   GET  /tools   -> tool definitions (MCP shape)
//   POST /cmd     -> {"tool": "...", "args": {...}}, validated, then pushed to every open avatar page
//   POST /say     -> {"text": "...", "style": "...", "voice": "...", "cmds": [{tool,args}], "flush": false}: synthesize speech
//                    (style = how to say it, voice = Qwen voice for this line; Qwen only), queue it on the page, run cmds when the clip starts,
//                    show text as the subtitle. Replies {id, ms} once the audio is ready (ms = clip length).
//                    "sfx": "laugh" plays a random pre-recorded clip from avatar/voice/laugh/ instead of TTS (no wait).
//                    "pause_ms": silence on the page before this clip starts (after the previous one ends).
//   GET  /audio/:id -> the synthesized clip
//   GET  /events  -> Server-Sent Events stream the avatar page listens on
//   POST /chat    -> {"user": "...", "text": "..."}: show one chat message on the overlay (chat.html)
//   GET  /chat-events -> Server-Sent Events stream the chat overlay listens on
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { TOOLS, validate } from './catalog.mjs';
import { synth, engineName, warmup } from './tts.mjs';

const root = import.meta.dirname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.moc3': 'application/octet-stream' };
const port = process.env.PORT || 8080;
const pages = new Set();
const chatPages = new Set();

const clips = new Map();   // id -> { body, type, ms }, dropped after 2 min
let nextId = 1;
const push = msg => { for (const p of pages) p.write(`data: ${JSON.stringify(msg)}\n\n`); };

const json = (res, code, body) => res.writeHead(code, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));

// A pre-recorded clip, e.g. a laugh: a random .ogg from avatar/voice/<name>/. Files are named <anything>-<ms>ms.ogg.
async function sfxClip(name) {
  const dir = join(root, 'voice', name);
  const files = (await readdir(dir).catch(() => [])).filter(f => f.endsWith('.ogg'));
  if (!files.length) return null;
  const f = files[Math.floor(Math.random() * files.length)];
  return { body: await readFile(join(dir, f)), type: 'audio/ogg', ms: +(f.match(/(\d+)ms\.ogg$/)?.[1] ?? 0) };
}

async function readBody(req) {
  let s = '';
  for await (const chunk of req) { s += chunk; if (s.length > 1e5) throw new Error('body too large'); }
  return JSON.parse(s);
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    pages.add(res);
    req.on('close', () => pages.delete(res));
    return;
  }
  if (url.pathname === '/chat-events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    chatPages.add(res);
    req.on('close', () => chatPages.delete(res));
    return;
  }
  if (url.pathname === '/chat') {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
    let body;
    try { body = await readBody(req); } catch { return json(res, 400, { error: 'invalid JSON' }); }
    const { user, text } = body ?? {};
    if (typeof user !== 'string' || !user || user.length > 25) return json(res, 400, { error: 'user must be 1-25 chars' });
    if (typeof text !== 'string' || !text || text.length > 200) return json(res, 400, { error: 'text must be 1-200 chars' });
    for (const p of chatPages) p.write(`data: ${JSON.stringify({ user, text })}\n\n`);
    return json(res, 200, { ok: true, pages: chatPages.size });
  }
  if (url.pathname === '/tools') return json(res, 200, TOOLS);
  if (url.pathname === '/cmd') {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
    let cmd;
    try { cmd = await readBody(req); } catch { return json(res, 400, { error: 'invalid JSON' }); }
    const args = cmd?.args ?? {};
    const err = validate(cmd?.tool, args);
    if (err) return json(res, 400, { error: err });
    push({ tool: cmd.tool, args });
    return json(res, 200, { ok: true, pages: pages.size });
  }
  if (url.pathname === '/say') {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
    let body;
    try { body = await readBody(req); } catch { return json(res, 400, { error: 'invalid JSON' }); }
    const { text = '', style = '', voice = '', sfx = '', cmds = [], flush = false, pause_ms = 0 } = body ?? {};
    if (!Number.isInteger(pause_ms) || pause_ms < 0 || pause_ms > 5000) return json(res, 400, { error: 'pause_ms must be an integer 0-5000' });
    if (typeof style !== 'string' || style.length > 200) return json(res, 400, { error: 'style must be a string of at most 200 chars' });
    if (typeof voice !== 'string' || !/^\w{0,40}$/.test(voice)) return json(res, 400, { error: 'voice must be a voice name' });
    if (typeof sfx !== 'string' || !/^\w{0,40}$/.test(sfx)) return json(res, 400, { error: 'sfx must be a clip folder name' });
    if (typeof text !== 'string' || text.length > 500) return json(res, 400, { error: 'text must be a string of at most 500 chars' });
    if (!Array.isArray(cmds)) return json(res, 400, { error: 'cmds must be an array' });
    for (const c of cmds) { const err = validate(c?.tool, c?.args ?? {}); if (err) return json(res, 400, { error: err }); }
    let id = null, ms = 0, clip = null;
    if (sfx) {
      clip = await sfxClip(sfx);
      if (!clip) return json(res, 400, { error: `no clips in avatar/voice/${sfx}` });
    } else if (text.trim()) {
      try { clip = await synth(text, style, voice); }
      catch (e) { return json(res, 502, { error: `tts failed: ${e.message}` }); }
    }
    if (clip) {
      id = String(nextId++); ms = clip.ms;
      clips.set(id, clip);
      setTimeout(() => clips.delete(id), 120_000);
    }
    push({ say: { id, text, cmds, ms, flush, pause_ms } });
    return json(res, 200, { ok: true, id, ms, engine: engineName(), pages: pages.size });
  }
  if (url.pathname.startsWith('/audio/')) {
    const clip = clips.get(url.pathname.slice(7));
    if (!clip) return res.writeHead(404).end('not found');
    return res.writeHead(200, { 'Content-Type': clip.type }).end(clip.body);
  }

  let path = normalize(decodeURIComponent(url.pathname)).replace(/^([\\/]\.\.)+/, '');
  if (/[\\/]$/.test(path)) path += 'index.html';
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, '127.0.0.1', () => { console.log(`http://localhost:${port}/`); warmup(); });
