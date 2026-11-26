// Chat test run: for each sample card she rants, the bots chat, then she answers.
//   node chat/demo.mjs [--dry] [card id ...]     --dry: no avatar server needed (still calls the LLM)
import { readFileSync } from 'node:fs';
import { talk } from '../agent/voice.mjs';
import { runCues, chatNote, checkCues } from './chat.mjs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const only = args.filter(a => a !== '--dry');
const { cards, cues } = JSON.parse(readFileSync(new URL('./sample.json', import.meta.url), 'utf8'));
const problems = checkCues(cues, cards.map(c => c.id));
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

// dry: print the chat instead of posting it, without the real delays
const show = m => console.log(`  [chat] ${m.user} (${m.role}): ${m.text}`);
const opts = dry ? { post: async m => show(m), sleep: async () => {} } : {};

const history = [];
for (const card of cards.filter(c => !only.length || only.includes(c.id))) {
  console.log(`\n### ${card.name}`);
  const [, rant] = await Promise.all([
    talk(`Next card on your AI tier list: ${card.name}. Rant about it (your angle: ${card.angle}) and put it in ${card.first_tier} tier.`, { dry, history }),
    runCues(cues, card.id, 'rant', opts),
  ]);
  const batch = [...rant, ...await runCues(cues, card.id, 'pause', opts)];
  const move = card.final_tier === card.first_tier ? `The card stays in ${card.first_tier}.`
    : `Give in angrily and move it to ${card.final_tier} tier, inventing an insulting reason.`;
  await talk(`${chatNote(batch)}\n${move}`, { dry, history });
}
