// node chat/chat.check.mjs — cue data and the chat engine (no network).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkCues, runCues, chatNote } from './chat.mjs';

const { cards, cues } = JSON.parse(readFileSync(new URL('./sample.json', import.meta.url), 'utf8'));
assert.deepEqual(checkCues(cues, cards.map(c => c.id)), []);
assert.equal(checkCues([{ card: 'x', phase: 'later', role: 'toString', text: ' ', delay_ms: -1 }], []).length, 5);

// messages go out in delay order, waiting only the gap between them; the overlay and the batch match
const waits = [], posted = [];
const opts = { post: async m => posted.push(m), sleep: async ms => waits.push(ms) };
const batch = await runCues([...cues].reverse(), 'haiku', 'pause', opts);
assert.deepEqual(batch.map(m => m.role), ['backseater', 'troll', 'spoiler']);
assert.deepEqual(waits, [600, 1200, 1400]);
assert.deepEqual(posted, batch);
assert.ok(batch.every(m => m.user));

// a joke gets its own reaction, different from backseating and spoiling
const note = role => chatNote([{ user: 'a', role, text: 'x' }]);
assert.equal(new Set(['backseater', 'spoiler', 'joker'].map(note)).size, 3);
assert.match(note('joker'), /!laugh/);
assert.ok((await runCues(cues, 'grok', 'pause', opts)).some(m => m.role === 'joker'));

// a quiet card: empty batch, and the note asks for a story
assert.deepEqual(await runCues(cues, 'suno', 'pause', opts), []);
assert.match(chatNote([]), /story/);
assert.match(chatNote(batch), /tier_police|actually_andy|rank_coach/);

console.log('chat ok');
