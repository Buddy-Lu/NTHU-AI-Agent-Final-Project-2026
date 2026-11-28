// node persona/persona.check.mjs — persona data and picking (no network).
import assert from 'node:assert/strict';
import { loadPersona, checkPersona, pickStory, pickJokes, storyNote, jokeNote } from './persona.mjs';

const p = loadPersona();
assert.deepEqual(checkPersona(p), []);
assert.ok(checkPersona({ stories: [{ id: 'a' }], jokes: [{}] }).length > 0);

// best tag match first; no story repeats until all have been told
const first = pickStory(p, ['music']);
assert.equal(first.id, 'elevator-song');
const rest = p.stories.slice(1).map(() => pickStory(p, ['music']).id);
assert.equal(new Set([first.id, ...rest]).size, p.stories.length);
assert.equal(pickStory({ stories: [] }), null);

// jokes need a shared tag and are offered once
const a = pickJokes(p, ['music', 'maker']);
assert.ok(a.length >= 1 && a.length <= 2);
assert.ok(a.every(j => j.tags.some(t => ['music', 'maker'].includes(t))));
assert.ok(pickJokes(p, ['music', 'maker']).every(j => !a.includes(j)));
assert.deepEqual(pickJokes(p, ['nothing']), []);

// counts are per load: a new stream starts fresh
assert.ok(loadPersona().stories.every(s => s.told_count === 0));

assert.match(storyNote(first), /elevator/i);
assert.equal(jokeNote([]), '');

console.log('persona ok');
