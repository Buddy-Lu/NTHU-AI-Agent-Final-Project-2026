// node avatar/catalog.check.mjs — sanity check for the tool catalog and validator.
import assert from 'node:assert/strict';
import { TOOLS, EMOTIONS, GESTURES, validate } from './catalog.mjs';

assert.equal(TOOLS.length, 7);
assert.equal(validate('avatar_express', { emotion: 'laugh', intensity: 1 }), null);
assert.equal(validate('avatar_reset', {}), null);
assert.match(validate('avatar_express', { emotion: 'furious' }), /must be one of/);
assert.match(validate('avatar_express', {}), /missing emotion/);
assert.match(validate('avatar_look', { x: 3, y: 0 }), /<= 1/);
assert.match(validate('avatar_effect', { effect: 'blush', on: 'yes' }), /boolean/);
assert.match(validate('avatar_express', { emotion: 'sad', duration_ms: 1.5 }), /integer/);
assert.match(validate('avatar_mouth', { open: 0.5, extra: 1 }), /unknown argument/);
assert.match(validate('rm_rf', {}), /unknown tool/);
for (const g of Object.values(GESTURES)) for (const t of [0, 0.5, 1]) for (const v of Object.values(g.f(t))) assert.ok(Number.isFinite(v));
assert.equal(Object.keys(EMOTIONS).length, 19);
console.log('catalog ok');
