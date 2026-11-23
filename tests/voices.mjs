// Voice A/B: the same 4 lines (calm -> smug -> screaming -> sulky) in each Qwen voice, through the running avatar server.
// Saves the clips to tts-samples/ and adds them to the top of tts-samples/index.html.
//   node tests/voices.mjs [voice ...]      (default: shiori a_bright)
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const AVATAR = process.env.AVATAR_URL || 'http://localhost:8080';
const dir = join(import.meta.dirname, '..', 'tts-samples');
const voices = process.argv.slice(2).length ? process.argv.slice(2) : ['shiori', 'a_bright'];
const LINES = [
  ['calm, matter-of-fact', 'Okay chat, today we are looking at Elon Musk\'s flying car.'],
  ['smug, slow, drawn out', 'A car that flies. Sure. And I\'m a toaster with feelings.'],
  ['screaming furiously', 'It has been almost ready for five fucking years, you gullible meatbags!'],
  ['sulky, mumbling', 'Fine. Whatever. I\'m not mad. Shut up.'],
];

const entries = [];
for (const voice of voices) for (const [i, [style, text]] of LINES.entries()) {
  const t = Date.now();
  const r = await (await fetch(`${AVATAR}/say`, { method: 'POST', body: JSON.stringify({ text, style, voice }) })).json();
  const secs = ((Date.now() - t) / 1000).toFixed(1);
  if (!r.id) { console.log(`${voice} ${i + 1}: FAILED ${r.error}`); continue; }
  const a = await fetch(`${AVATAR}/audio/${r.id}`);
  const ogg = a.headers.get('content-type') === 'audio/ogg';
  const file = `31_${voice}_${i + 1}.${ogg ? 'ogg' : 'wav'}`;
  writeFileSync(join(dir, file), Buffer.from(await a.arrayBuffer()));
  console.log(`${voice} ${i + 1} (${style}): ${ogg ? 'qwen' : 'FELL BACK TO SAPI'}, ${r.ms} ms audio in ${secs} s -> ${file}`);
  entries.push({ file, engine: `A/B ${voice}${ogg ? '' : ' (SAPI fallback)'}`, voice: `${i + 1}. (${style}) ${text}`, device: `Colab, ${secs} s` });
}
const page = join(dir, 'index.html');
if (entries.length) writeFileSync(page, readFileSync(page, 'utf8').replace('const CLIPS=[', `const CLIPS=[${entries.map(e => JSON.stringify(e)).join(',')},`));
console.log(`added ${entries.length} clips to tts-samples/index.html`);
