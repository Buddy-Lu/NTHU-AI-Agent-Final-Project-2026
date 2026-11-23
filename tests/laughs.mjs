// Records Shiori's laugh clips once, in her own voice, through the running avatar server.
// Saves them to avatar/voice/laugh/ (what !laugh plays) and lists them in tts-samples/index.html to rate.
// Delete the ones you don't like from avatar/voice/laugh/.
//   node tests/laughs.mjs
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const AVATAR = process.env.AVATAR_URL || 'http://localhost:8080';
const out = join(import.meta.dirname, '..', 'avatar', 'voice', 'laugh');
const samples = join(import.meta.dirname, '..', 'tts-samples');
const LAUGHS = [
  ['laughing hysterically, out of breath', 'Ahahahaha! Ahahahaha!'],
  ['bursting out laughing', 'Pfft, hahahahaha!'],
  ['evil giggle turning into a cackle', 'Hehehe, ahahahaha!'],
  ['can\'t stop laughing', 'Ahaha, hahaha, oh my god, hahaha!'],
  ['shrill, bratty cackle', 'Kyahahahaha!'],
  ['loud, mocking laugh', 'Hahahahaha!'],
];

mkdirSync(out, { recursive: true });
const entries = [];
for (const [i, [style, text]] of LAUGHS.entries()) {
  const r = await (await fetch(`${AVATAR}/say`, { method: 'POST', body: JSON.stringify({ text, style, voice: 'shiori' }) })).json();
  if (!r.id) { console.log(`${i + 1}: FAILED ${r.error}`); continue; }
  const a = await fetch(`${AVATAR}/audio/${r.id}`);
  if (a.headers.get('content-type') !== 'audio/ogg') { console.log(`${i + 1}: fell back to SAPI, skipped`); continue; }
  const file = `laugh-${i + 1}-${r.ms}ms.ogg`;
  writeFileSync(join(out, file), Buffer.from(await a.arrayBuffer()));
  console.log(`${i + 1} (${style}) ${text}: ${r.ms} ms -> avatar/voice/laugh/${file}`);
  entries.push({ file: `../avatar/voice/laugh/${file}`, engine: 'laugh (shiori)', voice: `${i + 1}. (${style}) ${text}`, device: `${r.ms} ms` });
}
const page = join(samples, 'index.html');
if (entries.length) writeFileSync(page, readFileSync(page, 'utf8').replace('const CLIPS=[', `const CLIPS=[${entries.map(e => JSON.stringify(e)).join(',')},`));
console.log(`${entries.length} laughs saved`);
