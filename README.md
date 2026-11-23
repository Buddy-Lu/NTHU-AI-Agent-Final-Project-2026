# Shiori

An AI VTuber that streams games on her own. Final project for *Hands-on Introduction to Agentic AI* (NTHU, Fall 2026).

Shiori is a bratty, foul-mouthed AI streamer with a Live2D avatar and a young English voice. The demo stream is a tier list of 25 AI models: she ranks them with biased hot takes and fights with chat. The full demo plan is in [`spec/spec.pdf`](spec/spec.pdf).

## What's here

| Folder | What it is |
|---|---|
| `agent/` | The voice LLM (Claude Haiku 5.5). It takes a prompt and writes Shiori's lines with emotion and gesture tags, then sends them to the avatar server. |
| `avatar/` | The avatar server (`serve.mjs`), the Live2D page (`index.html`), the tool catalog (`catalog.mjs`) and TTS (`tts.mjs`). |
| `avatar/models/` | The Alexia Live2D model. |
| `avatar/voice/` | The reference clip for her voice clone and her pre-recorded laughs. |
| `tests/` | Talk tests (`show.mjs`), voice and laugh generators, scripts, logs and recordings. |
| `tts-samples/` | TTS engine and voice comparisons. Open `index.html` to listen. |
| `spec/` | The demo spec (LaTeX). Build it with `build.cmd` (XeLaTeX). |
| `research/`, `transcript/` | Notes on Neuro-sama and the streamer transcripts used for her speaking style. |

## Run

Needs Node 24 and an Anthropic API key.

```
npm install
echo ANTHROPIC_API_KEY=sk-ant-... > .env
```

1. Start Shiori's voice (Qwen3-TTS in Google Colab): follow [`avatar/COLAB.md`](avatar/COLAB.md). Set `TTS_ENGINE=sapi` to skip Colab and use the Windows voice.
2. Start the avatar: `node avatar/serve.mjs`, then open http://localhost:8080 and click the page once.
3. Make her talk:
   ```
   node agent/voice.mjs "rant about Grok 4.7"
   node tests/show.mjs tests/scripts/flying-car.json        # a multi-part talk; add --record to save a .wav
   ```
   Add `--dry` to either one to print her lines without speaking.

## Checks

```
node avatar/catalog.check.mjs
node agent/voice.check.mjs
node avatar/tts.check.mjs
```
