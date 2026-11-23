// node avatar/tts.check.mjs — the Colab TTS client: AUDIO parser + MCP handshake with colab-mcp (no Colab tab needed).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mcpClient, parseAudio } from './tts.mjs';

const a = parseAudio([{ output_type: 'stream', name: 'stdout', text: ['AUDIO 1234 ', 'T2dnUw==\n'] }]);
assert.equal(a.ms, 1234); assert.equal(a.type, 'audio/ogg'); assert.equal(a.body.toString(), 'OggS');
assert.throws(() => parseAudio([{ text: ['NameError: say'] }]), /no audio/);

const cfg = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8')).mcpServers['colab-mcp'];
const c = mcpClient(cfg.command, cfg.args, { ...cfg.env, COLAB_MCP_PORT: '0' });   // spare port: Claude Code may hold the fixed one
await c.ready;
const { tools } = await c.request('tools/list', {});
assert.ok(tools.some(t => t.name === 'open_colab_browser_connection'));
c.close();
console.log('tts check ok');
