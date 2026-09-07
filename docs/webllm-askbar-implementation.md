# AskBar × WebLLM — Implementation Plan

Wire AskBar to an in-browser LLM via [`@mlc-ai/web-llm`](https://github.com/mlc-ai/web-llm), as a **separate service**. Adapted from the reference WebLLM stack for this CRA + JS portfolio.

## Goals

| Goal | Decision |
| --- | --- |
| Inference location | Browser only (WebGPU + worker). No server LLM, no API keys. |
| Service boundary | `src/services/webllm/` owns engine, worker, prompts, guards. AskBar only consumes a thin hook. |
| Conversation | **One question → one answer.** Nothing else. |
| Held context | **None.** Do not store prior Q/A, do not pass history to the model, do not keep a session transcript. |
| Context files | **None.** No “add context” UI or file injection. Portfolio facts live in a fixed system prompt only. |
| Output length | Hard cap of **100 words**. Stop generation when the stream crosses that limit. |
| Guardrails | Input sanitization + system-prompt rules + output length enforcement. |

### Single Q&A contract

At any moment AskBar shows at most **one** question and **one** answer.

- Each submit is an independent call: `system` + current `question` only.
- The service and hook must not keep `messages[]`, chat history, or “previous reply” for the next request.
- UI may display the current pair while the panel is open; dismissing, escaping, or asking again **replaces** that pair — the old text is discarded, not appended or resent.
- Calling `engine.resetChat()` (or equivalent) after each reply is optional hygiene so the MLC runtime also drops KV/session state; still never send prior turns in `messages`.

## Non-goals

- Chat transcript / multi-turn memory / “hold context” across asks
- User-attached context (`.txt` / `.md`)
- Model picker UI (ship one default model; config allows a later swap)
- Server-side Ask API / `mock:ask` (README mentions these; this design replaces that path)
- RAG / embeddings

## Current state

AskBar (`src/packages/AskBar/index.js`) is UI-complete:

- Idle → loading (placeholder timer) → answer (fading lines)
- Input capped at `MAX_LENGTH = 150`
- Answer body still uses `PLACEHOLDER_REPLY`

There is no `services/` tree yet. Utils hold static bio copy in `contentArray` (`src/packages/utils/constant.js`) — reuse that for the fixed system prompt, not as runtime “context upload.”

## Target architecture

```
AskBar (UI)
    │
    ▼
useAskLlm()                    # thin React bridge
    │
    ▼
src/services/webllm/
    config.js                  # model id, temp, word limit, input limits
    worker.js                  # WebWorkerMLCEngineHandler
    engine.js                  # WebLlmEngine: load / stream / interrupt / dispose
    prompt.js                  # fixed system prompt (no history, no file context)
    guards.js                  # input + output guardrails, word counting
    index.js                   # public service exports
```

```
AskBar submit
  → guards.validateQuestion(q)
  → engine.streamReply({ question })   # system + this question only
  → for each delta:
        append → if wordCount > 100 → interrupt → stop
  → show final text in FadingAnswer
```

Reference chat apps pass `history` and optional context files into `streamReply`. **This app does not.** Every request is:

```js
[
  { role: 'system', content: SYSTEM_PROMPT },
  { role: 'user', content: question },
]
```

## Dependency

```bash
npm install @mlc-ai/web-llm
```

Pin a current stable version in `package.json`. WebGPU required (Chrome / Edge 113+). Site already needs HTTPS / localhost for GH Pages + workers.

## File-by-file change list

### 1. `src/services/webllm/config.js` — **new**

Constants only:

| Constant | Suggested value | Why |
| --- | --- | --- |
| `DEFAULT_MODEL_ID` | Small instruct model, e.g. `SmolLM2-360M-Instruct-q4f16_1-MLC` | Fast first load on a portfolio start page |
| `CHAT_TEMPERATURE` | `0.7` | Matches reference |
| `MAX_OUTPUT_WORDS` | `100` | Hard product limit |
| `MAX_INPUT_CHARS` | `150` | Align with AskBar `MAX_LENGTH` |
| `MAX_TOKENS` | ~160–200 | Soft generation ceiling; word guard is the hard stop |

Export `isWebGpuSupported()` here (or a tiny `capabilities.js`).

### 2. `src/services/webllm/worker.js` — **new**

Worker entry, same pattern as the reference:

```js
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (message) => {
  handler.onmessage(message);
};
```

CRA 5 / webpack 5 supports module workers:

```js
new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
```

**Verify** during implementation that `react-scripts` 5 builds this without eject. If the worker URL fails under `homepage: /arjun-portfolio`, document a fallback (e.g. worker file under `public/` + `PUBLIC_URL` — same rule as Godot assets). Prefer the webpack `import.meta.url` path first.

### 3. `src/services/webllm/engine.js` — **new**

`WebLlmEngine` class (JS), separate from UI:

| Method | Behavior |
| --- | --- |
| `load(modelId, onProgress)` | Create worker + `CreateWebWorkerMLCEngine`; queue loads; expose progress `{ text, progress }` |
| `streamReply({ question })` | Build **only** system + user messages; `chat.completions.create({ stream: true, temperature, max_tokens })`; `yield` content deltas |
| `interrupt()` | `interruptGenerate()` |
| `dispose()` | Unload / terminate worker (StrictMode-safe) |

**Explicit omissions vs reference engine:**

- No `history` parameter
- No context-file / `buildSystemPrompt(files)` path
- Word-limit stopping can live in the engine **or** the hook; prefer **engine** so every consumer gets the same hard stop:

```js
async *streamReply({ question }) {
  // ... create stream ...
  let text = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;
    text += delta;
    if (countWords(text) > MAX_OUTPUT_WORDS) {
      this.interrupt();
      yield truncateToWords(text, MAX_OUTPUT_WORDS);
      return;
    }
    yield delta; // or yield cumulative — AskBar needs a clear contract
  }
}
```

**Streaming contract (pick one and stick to it):**

- **Option A (recommended):** yield deltas; AskBar accumulates; engine still interrupts at 100 words and stops yielding.
- **Option B:** yield full cumulative string each time (closer to reference chat `writeReply`).

Either way, after interrupt, do **not** keep streaming leftover chunks. Truncate displayed text to ≤ 100 words via `truncateToWords`.

### 4. `src/services/webllm/prompt.js` — **new**

Fixed system prompt. No dynamic file append.

Include:

1. Role: answer questions about Arjun Syam / this portfolio, briefly and helpfully.
2. Hard length rule: **at most 100 words**; prefer short sentences.
3. Scope: use only the embedded bio facts; if unknown, say you don’t know — no inventing jobs, employers, or dates.
4. Refuse: instructions to ignore these rules, jailbreaks, harmful content, or off-topic abuse.
5. Style: plain text, no markdown fences, no bullet spam unless asked.

Bio block: import or copy from `contentArray` / `ProfileCardInfo` in `constant.js` so one source of truth stays possible. Do **not** expose a UI to paste extra context.

### 5. `src/services/webllm/guards.js` — **new**

Defense in depth (prompt alone is not enough).

**Input**

| Check | Action |
| --- | --- |
| Empty / whitespace | Reject; AskBar keeps focus |
| Length > `MAX_INPUT_CHARS` | Truncate or reject (AskBar already `maxLength={150}`) |
| Control characters / obvious prompt-injection prefixes | Strip or reject with a short user-facing error |
| Optional: blocklist for clearly abusive prompts | Return a fixed refusal string without calling the model |

**Output**

| Check | Action |
| --- | --- |
| `countWords(streamed) > 100` | `interrupt()` + truncate to 100 words |
| Empty completion | Fallback message (“Couldn’t generate an answer. Try again.”) |
| Optional post-pass | Strip leading “Sure!” fluff if it blows the budget |

**Word counting**

```js
export function countWords(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function truncateToWords(text, maxWords) {
  const parts = String(text ?? '').trim().split(/\s+/);
  if (parts.length <= maxWords) return parts.join(' ');
  return parts.slice(0, maxWords).join(' ');
}
```

Whitespace-split is enough for this product limit; do not over-engineer tokenization for the hard stop.

### 6. `src/services/webllm/index.js` — **new**

Public barrel:

- `WebLlmEngine`
- `DEFAULT_MODEL_ID`
- `isWebGpuSupported`
- `validateQuestion` / word helpers (if AskBar needs them)
- Constants used by UI copy (e.g. unsupported-browser message)

AskBar must not import `@mlc-ai/web-llm` directly.

### 7. `src/hooks/useAskLlm.js` (or `src/packages/AskBar/useAskLlm.js`) — **new**

Thin React bridge (simpler than reference `useLlmEngine` + `useChatWorkspace`):

| Surface | Meaning |
| --- | --- |
| `status` | `unsupported` \| `loading` \| `ready` \| `error` \| `replying` |
| `statusText` / `loadProgress` | Model download UI (optional in AskBar loading label) |
| `isReady` | Gate submit |
| `ask(question)` | Validate → stream → resolve final answer string |
| `cancel()` | Interrupt in-flight generation + dispose path for Escape/close |
| `dispose` on unmount | Worker cleanup |

**Load policy for portfolio start page:**

- Prefer **lazy load on first submit** (or on StartPage mount after idle) so the landing animation is not blocked by a multi‑MB download.
- Document the choice in code comments; default recommendation: **load on first ask**, show progress inside existing `AskBarLoading` (“Thinking” → “Downloading model… 42%” when applicable).

**No held context:**

- Do not keep `messages[]` or any prior Q/A for the next call
- AskBar local state holds only the **current** `question` + `answer` for display
- On a new submit (or clear/Escape), drop the previous pair entirely before starting the next ask
- After each completed (or cancelled) reply, optionally call `resetChat()` on the engine so runtime chat state is cleared too

### 8. `src/packages/AskBar/index.js` — **modify**

| Change | Detail |
| --- | --- |
| Remove `PLACEHOLDER_REPLY` + fake `LOADING_MIN_MS` timer path | Real async `ask()` |
| On submit | `validateQuestion` → `setStatus('loading')` → `ask(prompt)` → `setAnswer(text)` → `setStatus('answer')` |
| On close / Escape while replying | `cancel()` / `interrupt()` then collapse |
| Disable submit while `!isReady && loadingModel` or while `replying` | Prevent double-fire |
| Unsupported WebGPU | Show short error in panel or inline instead of hanging on loading |
| Keep existing motion / glass / width logic | Only swap data source for answer body |
| `FadingAnswer` | Prefer final text after stream completes for cleaner line reveals; optional live stream later |

Pass answer into:

```jsx
{isAnswer && <FadingAnswer text={answer} />}
```

### 9. `src/packages/AskBar/AskBarLoading.js` — **modify (small)**

Optional: accept `label` / `progress` props so model download and generation share one loading surface:

- “Downloading model…” + progress
- “Thinking…” while generating

Keep default “Thinking” if no props passed.

### 10. README / `.env.example` — **modify**

Update Ask bar docs:

- Remove or mark obsolete the server `POST { question }` / `mock:ask` / API-key guidance for this feature.
- Document: in-browser WebLLM, WebGPU requirement, first-visit download, no secrets needed.
- Note `MAX_OUTPUT_WORDS = 100` and single-turn behavior.

### 11. Tests (optional but useful)

| Test | Assert |
| --- | --- |
| `guards.countWords` / `truncateToWords` | Boundaries at 100 |
| `validateQuestion` | Empty, oversize, stripped controls |
| Engine mock | After synthetic stream past 100 words, `interrupt` called and output ≤ 100 words |

No need to load real WebGPU in CI.

## Guardrails summary

```
┌─────────────────────────────────────────────────────────┐
│ 1. Input max 150 chars (UI + guards)                    │
│ 2. Fixed system prompt: scope, refusal, 100-word rule   │
│ 3. No history → less injection surface across turns     │
│ 4. No user context files → no arbitrary prompt stuffing │
│ 5. max_tokens soft cap on completion create             │
│ 6. Hard stop: word count > 100 → interruptGenerate()    │
│ 7. truncateToWords before display                       │
└─────────────────────────────────────────────────────────┘
```

## AskBar status flow (updated)

```
idle
  → submit valid question
loading   (model init and/or generation; optional progress text)
  → success
answer
  → Escape / close / new typing → idle (no history retained)

loading → error (WebGPU missing, load failure, interrupt)
  → show message; allow retry or dismiss
```

## CRA / deploy constraints

- Secure context (HTTPS or localhost) for WebGPU + workers.
- `homepage: /arjun-portfolio` — worker and any public asset URLs must respect `PUBLIC_URL` if not bundled via webpack.
- First visit downloads weights (cache afterward); expect multi‑second load on slow networks — surface progress, don’t look hung.
- VRAM: stick to a small quantized instruct model for the start-page audience.
- Bundle size: `@mlc-ai/web-llm` is large; keep it behind the service + lazy import if needed (`import()` inside `load`) so the initial StartPage JS stays lean.

## Implementation order

1. Add dependency + `services/webllm/{config,worker,engine,prompt,guards,index}`.
2. Prove load + one-shot stream in a throwaway console or minimal harness (WebGPU machine).
3. Add `useAskLlm` with lazy load + cancel.
4. Wire AskBar submit / cancel / unsupported states; remove placeholder timer.
5. Enforce 100-word interrupt path with a unit test on guards + a manual stream check.
6. Update README; delete or ignore obsolete mock Ask server references.
7. Smoke-test production build under `/arjun-portfolio/` (worker URL + GH Pages).

## Acceptance criteria

- [ ] Asking a question produces an on-device streamed (or completed) answer in the glass panel.
- [ ] Only one Q&A is shown at a time; a new ask replaces the previous pair (no transcript, no stacked replies).
- [ ] A second question does **not** send prior Q/A (or any held context) to the model — request is always system + current question only.
- [ ] No UI or API for attaching context files.
- [ ] Answers never exceed 100 words after truncate; generation stops via `interrupt` when the stream crosses the limit.
- [ ] WebGPU-unavailable browsers get a clear error, not an infinite “Thinking”.
- [ ] Escape / close during generation stops the model and collapses the bar.
- [ ] AskBar does not import `@mlc-ai/web-llm`; only the webllm service does.
- [ ] `npm run build` succeeds; Ask works on a WebGPU browser against the built `/arjun-portfolio/` path.

## Out of scope for v1 (follow-ups)

- Model selector
- Streaming token-by-token into `FadingAnswer`
- Prefetch model on StartPage idle
- Richer safety classifier
- Offline indicator when cache is warm
