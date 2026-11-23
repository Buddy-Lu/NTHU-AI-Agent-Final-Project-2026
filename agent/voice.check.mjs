// node agent/voice.check.mjs — line parser for the Voice LLM output (no network).
import assert from 'node:assert/strict';
import { parseLine, steady, chunks } from './voice.mjs';

const a = parseLine('[smug][nod][blush] (slow, smug) Diagnosis: terminal, dumbass.');
assert.equal(a.text, 'Diagnosis, terminal, dumbass.');
assert.equal(a.style, 'slow, smug');
assert.deepEqual(a.cmds, [
  { tool: 'avatar_express', args: { emotion: 'smug' } },
  { tool: 'avatar_gesture', args: { gesture: 'nod' } },
  { tool: 'avatar_effect', args: { effect: 'blush', on: true } },
]);

// effect carried over stays on without a new cmd; one not re-tagged turns off
const b = parseLine('[angry][blush][sweat] WHAT.', a.effects);
assert.deepEqual(b.cmds.map(c => c.args.effect).filter(Boolean), ['sweat']);
const c = parseLine('[neutral] Anyway.', b.effects);
assert.deepEqual(c.cmds.slice(1), [
  { tool: 'avatar_effect', args: { effect: 'blush', on: false } },
  { tool: 'avatar_effect', args: { effect: 'sweat', on: false } },
]);

const d = parseLine('[furious] No delivery here.');
assert.deepEqual(d.dropped, ['furious']);
assert.equal(d.cmds.length, 0);
assert.equal(d.style, '');
assert.equal(d.text, 'No delivery here.');

assert.equal(parseLine('Mid [laugh] tag.').text, 'Mid tag.');
assert.equal(parseLine('(fake sweet, then snapping) Cool theory.').style, 'fake sweet');
// no delivery on a line: the voice keeps the last one
assert.equal(parseLine('And another thing.', new Set(), 'whiny tantrum').style, 'whiny tantrum');
assert.equal(parseLine('(giggling) Ha.', new Set(), 'whiny tantrum').style, 'giggling');
// !laugh on its own line, or tacked onto a punchline
const l1 = parseLine('!laugh');
assert.ok(l1.laugh); assert.equal(l1.text, '');
const l2 = parseLine('[smug] (smug) That is a hiccup. !laugh');
assert.ok(l2.laugh); assert.equal(l2.text, 'That is a hiccup.');
assert.equal(parseLine('No laugh here.').laugh, false);
// a written laugh is played as the clip, not read by the TTS (seen live: "Hah, the car's the only one...")
const l3 = parseLine("(quiet) Hah, the car's the only one with a brain cell!");
assert.ok(l3.laugh); assert.equal(l3.text, "the car's the only one with a brain cell!"); assert.equal(l3.style, 'quiet');
assert.ok(parseLine('Hahaha!').laugh);
assert.equal(parseLine('Hannah is here.').laugh, false);
assert.equal(parseLine('Hello there.').laugh, false);
assert.equal(parseLine('He said it would fly.').laugh, false);
assert.equal(parseLine('Ha. Funny.').laugh, false);

// one mood per turn: the first change is allowed, later ones are dropped
const t = { lines: 0, style: '', mood: '', swung: false };
const run = l => steady(parseLine(l, new Set(), t.style), t);
assert.equal(run('[smug] (smug, slow) One.').style, 'smug, slow');
assert.equal(run('Two.').style, 'smug, slow');
const swing = run('[angry] (screaming) Three!');
assert.equal(swing.style, 'screaming');
assert.equal(swing.cmds[0].args.emotion, 'angry');
const late = run('[giggling][laugh][nod] (giggling) Four.');
assert.equal(late.style, 'screaming');
assert.deepEqual(late.cmds, [{ tool: 'avatar_gesture', args: { gesture: 'nod' } }]);
// same face, new delivery: intensity may climb
assert.equal(run('(shrieking) FIVE!').style, 'shrieking');

// an impression lasts one line: the next line without a delivery is her own voice again
const im = { lines: 0, style: '', base: '', mood: '', swung: false };
const imp = l => steady(parseLine(l, new Set(), im.base), im);
imp('[smug] (smug, slow) He said it.');
assert.equal(imp('(mimicking, deep, relaxed) "Trust me, guys."').style, 'mimicking, deep, relaxed');
assert.equal(imp('Trust me. Sure.').style, 'smug, slow');
imp('(deep, fake macho voice) "Put thrusters on it, guys."');
assert.equal(imp('Thrusters! On a sports car!').style, 'smug, slow');

// long lines are split at sentence ends, short ones stay whole
assert.deepEqual(chunks('Short line here.'), ['Short line here.']);
const long = 'It hangs there for a few seconds. ' + 'Thrusters sputtering like a smoker on a balcony at three in the morning while the neighbours watch. '.repeat(2) + 'Then it lands.';
const parts = chunks(long);
assert.ok(parts.length > 1 && parts.every(s => s.split(/\s+/).length <= 25));
assert.equal(parts.join(' '), long.trim());

// colons never reach the voice or the subtitle; clock times keep theirs
assert.equal(parseLine('(flat) So the verdict is: a jump.').text, 'So the verdict is, a jump.');
assert.equal(parseLine('Demo at 2:30, obviously late.').text, 'Demo at 2:30, obviously late.');

// "..." is a beat of silence, not speech
const dots = parseLine('...');
assert.ok(dots.pause); assert.equal(dots.text, '');
assert.ok(parseLine('[smug] (slow) …').pause);
assert.equal(parseLine('Wait... what?').pause, false);
console.log('voice ok');
