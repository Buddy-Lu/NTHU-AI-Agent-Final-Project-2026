# Neuro-sama: what is publicly known about how she works

Collected 2026-11-18. Vedal has never published a full architecture. This file keeps every claim we found, graded by how much to trust it.

- **A**: official VedalAI code or docs
- **B**: Vedal's own words, but through a journalist or an auto-generated stream transcript
- **C**: fan wiki or third-party guess, unverified

## A. Official VedalAI GitHub

### neuro-sdk: the protocol Neuro uses to play games [1][2][3][4]
- **Transport:** WebSocket, JSON messages `{command, game, data}`.
- **Messages:**
  - Game → Neuro:
    - `startup`
    - `context` (with a `silent` flag)
    - `actions/register` / `actions/unregister`: name, description, JSON schema
    - `actions/force`: `query`, `state`, `action_names`, `priority`, `ephemeral_context`, `silent`
    - `action/result` (`success`, `message`)
  - Neuro → Game: `action` (id, name, JSON string of params).
- **Who decides:** Neuro picks an action from the registered set. The game validates it, because the params "might be malformed", and replies with a result before running it in game.
- **Scope:** the SDK was "built and optimized for turn-based games" (Inscryption, Liar's Bar, Buckshot Roulette).
  - High-APM games don't work well unless Neuro controls only high-level actions and another system handles the low-level ones [2].
  - Game state must be describable in text.
- **`actions/force` priority** (added 2025-12-17) [4]:
  - `low` (default): waits until she finishes speaking.
  - `medium`: she finishes the current utterance sooner.
  - `high`: she shortens the utterance, then responds.
  - `critical`: interrupts her speech immediately. The changelog warns this can be abrupt.
- **Timing:**
  - Only one force can be in flight at a time.
  - `action/result` times out after about 20 s and the action counts as failed [4].
  - Send the result as soon as the action is validated, because she waits for it [3].
- **`speech/started` / `speech/ended`** (2026-11-10): the game reports in-game dialogue so she hears it and doesn't talk over it [3][4].
  - Each line carries `reply: never | maybe | always`, which controls whether she comments.
  - Include `expected_duration_ms` when it is known.
- **Voice chat side channel** (2026-08-19), at `/game/<name>/voice` [5]:
  - Upstream: per-speaker PCM audio, so STT can attribute who said what.
  - Downstream: her voice as 48 kHz mono Float32 PCM.
  - The doc says the hear → STT → decide → TTS cycle takes "seconds, not milliseconds".
  - `voice/speaking` and `voice/cancelled` events mark when she starts, stops or is cut off.

### BEST_PRACTICES.md: what Neuro is bad at [3]
- **Many small messages:** a constant stream of small `context` updates makes her react poorly. Send fewer, meaningful ones.
- **Amount of information:** a moderate amount works, roughly a list of 20 items.
- **Unstated facts:** she reads explicit information well but does not infer what is left unsaid.
- **Changing action sets:** frequent register/unregister slows her responses. Register once at startup.
- **Similar actions:** with many near-identical actions she fixates on a few. Use one action with an `enum` instead.
- **Games without a force:** she forgets a game when nothing forces a decision.
- **Bad calls:** she attempts impossible actions or sends malformed data, so always validate.
- **Useful knobs:**
  - `silent: true` for routine decisions she shouldn't narrate.
  - `ephemeral_context: true` for bulky per-turn state that shouldn't stay in memory.
  - Success results should describe state changes in `message`.
- **Fair play:** give her only the information a human player would have.

### Official game integrations [6]
- **Turn-based:**
  - Inscryption (C#)
  - Buckshot Roulette (GDScript)
  - Liar's Bar (C#)
  - Who Wants to be a Millionaire (C#)
  - Slay the Spire 2 (C#)
- **Real-time:**
  - **Hollow Knight (F#):** pathfinding uses Hollow Knight Randomizer data to work out which room transitions are reachable. This is a deterministic layer under the LLM [7].
  - **Cyberpunk 2077:** a C++ RED4ext plugin that exposes "Neuro-sama bindings" [8].
  - **Among Us (C#):** plan is to record game data and train a neural network that Neuro uses [9].
  - **Pokémon Platinum (Lua)**
- **Other:**
  - `swarm-control`: an audience control plane for Subnautica (viewers trigger events).
  - Test agents for integrations: Randy (random actions), Tony (manual GUI), Jippity (OpenAI), Gary (local LLM) [2].

## B. Vedal's own words

| When / where | Claim |
|---|---|
| 2022-12 Dexerto [10] | Neuro started as an osu! AI, finished in 2022, then merged with an LLM after a friend suggested an AI streamer. He chose a VTuber body because "it's much easier to control an avatar than try to generate a video of a real person". |
| 2023-01 Kotaku [11] | He strengthened the filters "since the first few streams". Training data is "manually curated to mitigate negative biases". A team of moderators "check everything she says". "She picks what to respond to within a limited window." |
| Wikipedia [12] | Blocked output is replaced by the word "filtered", not silently dropped. |
| 2024-07-22 dev stream (fan wiki summary) [13] | Average delay cut from 900 ms–1 s to about 700 ms or lower, Evil Neuro included. Vision could take up to 5 s, and work to shorten it was planned. |
| 2026-04-27 dev stream (auto transcript) [14] | All of her code was rewritten, the trigger being Unity memory leaks. A self-hosted server is planned (Threadripper Pro, "a couple 4090s"). A V3 voice is a 2026 goal. |
| 2026-07-13 dev stream (auto transcript) [15] | The new model adds reasoning ("think before they respond"). It is sometimes faster, but slower when it stops to think. Internal Wordle test went from 65–70 % to about 95 %. She has tools for Wordle and drawing, and a time limit stopped a drawing. |
| Undated clip (auto transcript) [16] | She has a web search tool with an NSFW query filter. Memories and context are stored server-side and can be "nuked". Logs go to the server, with a file as fallback. |

## C. Fan claims, unverified
- **TTS:** Azure "Ashley" voice with +25 % pitch [17]. No Vedal quote found.
- **Model:** about 2B parameters with q2_k quantization. The research page that repeats this marks it UNVERIFIED and traces it only to Fandom [18].
- **Personality:** since v3 the personality is fine-tuned into the weights and the system prompt carries only situational context [18]. It cites a Vedal interview, but not the exact words.
- **Memory:** a major update in 2023-12 let her recall jokes from days earlier [13].
- **History:** v2 (Dec 2022) ran on the GPT-3 API, and mid-2023 moved to a custom fine-tuned open model [18].

## Not public
- The base model.
- The TTS provider.
- The memory design (what is stored, how it is retrieved).
- How the filter works (model or word list).
- How Minecraft is controlled: no source links her to Mineflayer or Baritone.

**Sources we could not read:**
- Fandom (HTTP 402)
- moegirl (title only)
- KAI-YOU interview [19] (paywalled)
- Bloomberg 2023-06 [20] (paywalled)

## What this means for Shiori
- **Game adapters:** use the neuro-sdk message set (D6), including the four priority levels. D1's "no barge-in" becomes: only `critical` may interrupt speech.
- **Video and cutscene reactions:** copy `speech/started|ended` with `reply: never|maybe|always`.
- **Context rules:** keep game context sparse and explicit, about 20 items at most, and keep the action set stable. Neuro's own weaknesses apply to any LLM.
- **Latency:** Neuro averages about 700 ms. Our D7 target of 1.5 s or less is a sane first step. Reasoning models cost latency, and Vedal hit the same trade-off.
- **Filter:** saying "filtered" out loud turns a block into a bit. That is cheaper than a repair loop and stays on-brand.
- **Personality:** Neuro's lives in fine-tuned weights, and we can't fine-tune now. Instead, stream transcripts become few-shot examples in the system prompt, and later fine-tune data.

## Sources
1. VedalAI/neuro-sdk `API/SPECIFICATION.md`. https://github.com/VedalAI/neuro-sdk/blob/main/API/SPECIFICATION.md
2. VedalAI/neuro-sdk README. https://github.com/VedalAI/neuro-sdk
3. VedalAI/neuro-sdk `API/BEST_PRACTICES.md` and `API/README.md`. https://github.com/VedalAI/neuro-sdk/blob/main/API/BEST_PRACTICES.md
4. VedalAI/neuro-sdk `CHANGELOG.md`. https://github.com/VedalAI/neuro-sdk/blob/main/CHANGELOG.md
5. VedalAI/neuro-sdk `API/VOICE_CHAT.md`. https://github.com/VedalAI/neuro-sdk/blob/main/API/VOICE_CHAT.md
6. VedalAI repositories. https://github.com/orgs/VedalAI/repositories
7. VedalAI/neuro-hollow-knight. https://github.com/VedalAI/neuro-hollow-knight
8. VedalAI/neuro-cyberpunk. https://github.com/VedalAI/neuro-cyberpunk
9. VedalAI/neuro-amongus. https://github.com/VedalAI/neuro-amongus
10. Dexerto, 2022-12-29. https://www.dexerto.com/entertainment/ai-vtuber-neuro-sama-future-twitch-streaming-gaming-2019378/
11. Kotaku, 2023-01-06. https://kotaku.com/vtuber-twitch-holocaust-denial-minecraft-ai-chatgpt-1849960527
12. Wikipedia, Neuro-sama. https://en.wikipedia.org/wiki/Neuro-sama
13. Neuro-sama Fandom, Dev Stream 2024-07-22 (read via search summary). https://neurosama.fandom.com/wiki/Dev_Stream/July_22,_2024
14. sozai.app transcript, dev stream 2026-04-27. https://sozai.app/transcript/dev-stream-27-april-2026/
15. sozai.app transcript, Development w/ Evil 2026-07-13. https://sozai.app/transcript/neurosama-development-evil-2026/
16. sozai.app transcript, "Vedal exposes Neuro's embarrassing search history". https://sozai.app/transcript/vedal-exposes-neuro-embarrassing-search-history/
17. Neuro-sama Fandom wiki (via search summary). https://neurosama.fandom.com/wiki/Neuro-sama
18. lin-guanguo, "Neuro-sama: Weight-Based Personality in Production". https://lin-guanguo.github.io/llm-memory-research/neuro-sama.research/
19. KAI-YOU Premium, Vedal interview, 2023-04-30. https://premium.kai-you.net/article/655
20. Bloomberg, 2023-06-16. https://www.bloomberg.com/news/newsletters/2023-06-16/neuro-sama-an-ai-twitch-influencer-plays-minecraft-sings-karaoke-loves-art
