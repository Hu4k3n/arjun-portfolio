# AGENTS.md — Arjun portfolio

Short map for coding agents. Prefer this over scanning the whole repo.

## What this is

Game-styled personal portfolio: **React 19 (CRA 5) + HashRouter** wraps a **Godot 4** web export. Live at `/arjun-portfolio/` on GitHub Pages.

## Layout

| Path | Purpose |
| --- | --- |
| `src/App.js` | Routes / shell |
| `src/packages/*` | UI features (StartPage, MainMenu, GameInit, AskBar, …) |
| `src/services/webllm/` | In-browser Ask LLM (`@mlc-ai/web-llm`) |
| `src/assets/` | Imported images/icons/sounds |
| `public/` | Static copy-as-is: favicons, Godot export |
| `docs/` | Deeper notes (`DEPLOY.md`, webllm impl) |
| `build/` | Production output — **do not commit to `main`** |

## Critical constraints

1. **Sub-path hosting** — `PUBLIC_URL` is `/arjun-portfolio`. Any literal URL into `public/` must use `` `${process.env.PUBLIC_URL}/...` ``. Never hardcode `/index.js`.
2. **HashRouter required** for Godot — relative fetches of `index.wasm` / `index.pck` break under `BrowserRouter` on nested paths.
3. **Godot load order** — `GodotGame.js` injects `index.js` then `init_godot_game.js`, then calls `init_godot_game()`. Touch carefully.
4. **Do not open** `public/index.wasm`, `public/index.pck`, or large media unless the task is about those assets (see `.cursorignore`).

## Where to edit (by task)

| Task | Start here |
| --- | --- |
| Start / menu UI | `src/packages/StartPage`, `MainMenu`, `GlassNav` |
| About / profile | `AboutSections`, `ProfileCard` |
| Game canvas / loader | `src/packages/GameInit/**`, `public/init_godot_game.js` |
| Ask bar / LLM | `src/packages/AskBar`, `src/services/webllm/`, `docs/webllm-askbar-implementation.md` |
| Favicons / PWA icons | `public/favicon.ico`, `logo192.png`, `logo512.png`, `manifest.json`, `index.html` |
| Copy / constants | `src/packages/utils/constant.js` |

## Commands

```bash
npm run dev      # http://localhost:3000/arjun-portfolio/
npm run build    # → build/
```

## Deploy

Follow **`docs/DEPLOY.md`** (bash + PowerShell). Only when the user asks. Source = `main`, site = `gh-pages`.

## Efficiency

- One task per chat; `@` specific files instead of whole folders.
- Ask mode for questions; Agent mode for edits/commands.
- Ignore noise under `.cursorignore` (`node_modules`, `build`, Godot binaries, media).
- Do not re-read README end-to-end if this file + the relevant package already answer the question.
