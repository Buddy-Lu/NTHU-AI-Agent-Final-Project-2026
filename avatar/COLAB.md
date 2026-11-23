# Shiori's voice on Colab (testing)

Shiori's voice is Qwen3-TTS, running in your Google Colab notebook `tts`. The avatar server types each line into that notebook and runs it, and the audio comes back to the avatar page.
This setup is for testing. The product will run on glows.ai.

## Every time you start

1. **Open Colab.** Open your **tts** bookmark in Chrome. It's the one with `#mcpProxyToken=...` at the end; a plain Drive link won't work.
2. **Use a GPU.** At the top, click **Runtime → Change runtime type → T4 GPU → Save**. Then click **Connect** (top right).
3. **Load the voice.** Click ▶ on the first cell, the one starting `# shiori-tts setup`. Wait 1–3 min until it prints `setup done`.
   You only need to do this once per Colab session. If Colab says the runtime disconnected, run this cell again.
4. **Free the connection.** In Claude Code, type `/mcp`, choose **colab-mcp**, then **Disable**.
   Only one program can talk to the notebook at a time: either Claude Code or the avatar.
5. **Start the avatar.** In a terminal, in the project folder:
   ```
   node avatar/serve.mjs
   ```
   The terminal says `Reload (F5) the tts notebook tab now`. Do that.
   Then it prints `tts: Colab connected`, uploads Shiori's voice, and prints `tts: ready` (about 30 s the first time in a Colab session).
   Open http://localhost:8080 and click the page once.
6. **Talk.** Type a line in the **Say** box and press Enter, or run `node agent/voice.mjs "what to talk about"`.
   - A 10 s line takes about 7 s to make.

**Keep the Colab tab open** while streaming. Closing it cuts the voice.

## Change the voice

Her voice is **`shiori`** (the default): one fixed girl, cloned from `avatar/voice/shiori_ref.ogg`, so her timbre stays the same when her mood changes. To try another voice, run this in the terminal before step 5:
```
$env:QWEN_VOICE="a_bright"
```
Other voices:
- **Designed voices:** `a_bright`, `b_soft`, `c_energetic` (the timbre drifts from line to line)
- **Preset voices:** `Sohee`, `Vivian`, `Serena`, `Ono_anna`

## When Claude Code should use Colab again

In Claude Code, type `/mcp`, choose **colab-mcp**, then **Enable**. Stop the avatar server first (Ctrl+C).

## Problems

| What you see | Do this |
|---|---|
| Terminal repeats `waiting for Colab` | Reload the Colab tab (F5). Make sure it's the **tts bookmark**. |
| She speaks in a robotic Windows voice | Colab failed for that line; the terminal says why. Usually the runtime disconnected: do steps 2–3 again. |
| `NameError: say` in the terminal | The setup cell wasn't run in this session. Do step 3. |
| Setup cell fails during install | Make sure the runtime is a GPU (step 2), then click **Runtime → Restart session** and run it again. |
| No T4 available | Any GPU works (L4 and A100 are faster). The CPU does not work. Wait and try again later. |

## Fixed parts (already set up, don't touch)

- **The connector:** `~/.claude/colab-mcp` is a modified copy of colab-mcp with a fixed token and port.
  Its settings are under `mcpServers.colab-mcp` in `~/.claude.json`, and they must match your bookmark.
- **The setup cell:** it pins `transformers==5.15.1`, because newer versions break Qwen. On a T4 it uses fp16, the only number format that card handles quickly.
