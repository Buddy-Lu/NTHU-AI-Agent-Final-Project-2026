// Stories and jokes from persona.json, picked to fit the moment.
//   story = { id, title, beats[], tags[], told_count }   joke = { text, source, tags[], used_count }
// Counts live in the loaded object for one stream and are never saved (no cross-stream memory in the demo).
import { readFileSync } from 'node:fs';

export const loadPersona = (file = new URL('./persona.json', import.meta.url)) => JSON.parse(readFileSync(file, 'utf8'));

const strings = a => Array.isArray(a) && a.length > 0 && a.every(s => typeof s === 'string' && s.trim());
const count = n => Number.isInteger(n) && n >= 0;

// -> list of problems ([] = fine)
export function checkPersona({ stories = [], jokes = [] }) {
  const ids = stories.map(s => s.id);
  return [
    ...stories.flatMap((s, i) => [
      !(s.id && s.title) && 'needs id and title',
      ids.indexOf(s.id) !== i && `duplicate id ${s.id}`,
      !strings(s.beats) && 'needs beats',
      !strings(s.tags) && 'needs tags',
      !count(s.told_count) && 'told_count must be a whole number >= 0',
    ].filter(Boolean).map(p => `story ${i}: ${p}`)),
    ...jokes.flatMap((j, i) => [
      !(j.text && j.source) && 'needs text and source',
      !strings(j.tags) && 'needs tags',
      !count(j.used_count) && 'used_count must be a whole number >= 0',
    ].filter(Boolean).map(p => `joke ${i}: ${p}`)),
  ];
}

const overlap = (item, tags) => item.tags.filter(t => tags.includes(t)).length;

// The story told least often; among those, the best tag match. Counts it as told. null if there are none.
export function pickStory({ stories }, tags = []) {
  const [best] = [...stories].sort((a, b) => a.told_count - b.told_count || overlap(b, tags) - overlap(a, tags));
  if (!best) return null;
  best.told_count++;
  return best;
}

// Up to max unused jokes that share a tag, best match first. Each is offered once per stream.
export function pickJokes({ jokes }, tags = [], max = 2) {
  const picked = jokes.filter(j => !j.used_count && overlap(j, tags))
    .sort((a, b) => overlap(b, tags) - overlap(a, tags)).slice(0, max);
  for (const j of picked) j.used_count++;
  return picked;
}

// Director's notes for talk() in agent/voice.mjs.
export const storyNote = story => [
  `Chat has gone silent. Fill the quiet by telling your story "${story.title}" in your own words, as something that happened to you. Hit these beats in order:`,
  ...story.beats.map(b => `- ${b}`),
].join('\n');

export const jokeNote = jokes => jokes.length
  ? ['Jokes you may work in, reworded to fit. Skip any that do not fit:', ...jokes.map(j => `- ${j.text}`)].join('\n')
  : '';
