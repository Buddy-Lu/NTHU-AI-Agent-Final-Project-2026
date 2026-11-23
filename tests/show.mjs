// Talk test: several talk() turns on one topic, one shared history so she remembers.
//   node tests/show.mjs [--dry] [--record] "topic"                    generic 7 beats, ~3 min
//   node tests/show.mjs [--dry] [--record] tests/scripts/<name>.json  a written script: { topic, facts[]?, beats[] }
//     a beat is a direction string, or { direction, facts[]?, laugh? }: facts only for that part, laugh = laugh in this part
//   --record: also writes tests/recordings/<name>.wav (what the page played, pauses and stalls included)
//             and <name>.txt (a timestamped transcript), to hand to Gemini with tests/recordings/gemini-prompt.md.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { talk } from '../agent/voice.mjs';

const flags = new Set(process.argv.slice(2).filter(a => a.startsWith('--')));
const dry = flags.has('--dry'), rec = flags.has('--record') && !dry;
const arg = process.argv.slice(2).filter(a => !a.startsWith('--')).join(' ');
const script = arg.endsWith('.json') ? JSON.parse(readFileSync(arg, 'utf8')) : null;
const TOPIC = script?.topic || arg || 'humans need to sleep 8 hours a day, and you, an AI, never do';
const FACTS = script?.facts?.length ? `\nFacts you can use. They are true; don't invent others:\n${script.facts.map(f => `- ${f}`).join('\n')}` : '';
const BEATS = script?.beats || [
  'Open the stream. Greet chat like they are late, then announce today\'s topic.',
  'Give your first hot take on the topic and diagnose what is wrong with it.',
  'Roast the details: pick the dumbest specific part of it and tear it apart.',
  'Chat pushes back and says you are just jealous. Lose it, then deny it.',
  'Rank the topic against two other things of its kind, worst to best.',
  'Go off on a tangent somewhere related, then drag yourself back.',
  'Wrap it up: final verdict, insult chat one last time, say bye.',
];

const history = [], record = rec ? [] : undefined, start = Date.now();
for (const [i, beat] of BEATS.entries()) {
  const elapsed = (Date.now() - start) / 1000;
  if (!script && !dry && elapsed > 170 && i < BEATS.length - 1) continue;   // generic run: skip to the ending once ~3 min are used
  const b = typeof beat === 'string' ? { direction: beat } : beat;
  const note = [
    i ? '' : `Topic of this stream: ${TOPIC}.${FACTS}`,
    b.direction,
    b.facts?.length ? `Facts for this part (react to them, don't recite them):\n${b.facts.map(f => `- ${f}`).join('\n')}` : '',
    b.laugh ? 'This part needs a laugh. Right after your best line, write !laugh on its own line. Required.' : '',
  ].filter(Boolean).join('\n');
  console.log(`\n### beat ${i + 1} at ${elapsed.toFixed(0)} s: ${b.direction}`);
  record?.push({ beat: i + 1 });
  await talk(note, { dry, history, record });
}
console.log(`\n### done, ${((Date.now() - start) / 1000).toFixed(0)} s`);
if (rec) mixdown(record);

// Rebuilds what the avatar page played: a clip starts once the previous one ended AND it was ready,
// plus its pause_ms. A clip that wasn't ready in time is a stall (dead air) and shows in the transcript.
function mixdown(items) {
  const name = `${(script ? basename(arg, '.json') : TOPIC.replace(/\W+/g, '-').slice(0, 30))}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}`;
  const out = join(import.meta.dirname, 'recordings'), tmp = mkdtempSync(join(tmpdir(), 'shiori-rec-'));
  mkdirSync(out, { recursive: true });
  const fmt = ms => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${(ms % 60000 / 1000).toFixed(1).padStart(4, '0')}`;
  const clips = items.filter(x => x.audio), t0 = Math.min(...clips.map(c => c.readyAt));
  const lines = [`# ${TOPIC}`, `first audio ready ${((t0 - start) / 1000).toFixed(1)} s after the start (not in the recording)`, ''];
  let end = 0, stalls = 0;
  const inputs = [];
  for (const x of items) {
    if (x.beat) { lines.push(`\n## beat ${x.beat}`); continue; }
    if (!x.audio) continue;
    const ready = x.readyAt - t0, begin = Math.max(end, ready);
    if (ready > end + 100 && end > 0) { lines.push(`[${fmt(end)}] -- stall: ${((ready - end) / 1000).toFixed(1)} s of dead air, TTS not ready --`); stalls++; }
    const at = begin + (x.body.pause_ms || 0);
    end = at + x.ms;
    const file = join(tmp, `${inputs.length}.${x.type === 'audio/ogg' ? 'ogg' : 'wav'}`);
    writeFileSync(file, x.audio);
    inputs.push({ file, at });
    lines.push(x.body.sfx ? `[${fmt(at)}] *laughs*` : `[${fmt(at)}] (${x.body.style}) ${x.body.text}`);
  }
  lines.push('', `length ${fmt(end)}, ${stalls} stall(s)`);
  const filter = inputs.map((x, i) => `[${i}]aresample=24000,aformat=channel_layouts=mono,adelay=${Math.round(x.at)}:all=1[a${i}]`).join(';')
    + `;${inputs.map((_, i) => `[a${i}]`).join('')}amix=inputs=${inputs.length}:normalize=0[out]`;
  const wav = join(out, `${name}.wav`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs.flatMap(x => ['-i', x.file]), '-filter_complex', filter, '-map', '[out]', wav]);
  writeFileSync(join(out, `${name}.txt`), lines.join('\n') + '\n');
  rmSync(tmp, { recursive: true, force: true });
  console.log(`recorded ${fmt(end)}, ${stalls} stall(s) -> tests/recordings/${name}.wav + .txt`);
}
