# Arjun Syam — Portfolio

A game-styled personal portfolio: a React front end wrapping a Godot 4 web export, so the site opens like a game menu (start screen → main menu → playable game).

**Live:** [Hu4k3n.github.io/arjun-portfolio](https://Hu4k3n.github.io/arjun-portfolio/)

## Stack

- React 19 + `react-router-dom` (`HashRouter`), Create React App 5
- Godot 4 WebAssembly export, served as static files from `public/`
- GSAP and OGL for menu animation and background effects
- In-browser Ask bar via `@mlc-ai/web-llm` (WebGPU, no backend)
- Deployed to GitHub Pages from the `gh-pages` branch

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:3000/arjun-portfolio/** — the path prefix is required. See [Serving from a sub-path](#serving-from-a-sub-path).

### Optional: the Ask bar

The Ask bar runs a small LLM **entirely in the browser** with [`@mlc-ai/web-llm`](https://github.com/mlc-ai/web-llm) (WebGPU + a web worker). No backend and no API keys.

- One question → one answer (no chat history)
- Replies capped at **100 words**
- Needs **Chrome or Edge 113+** (WebGPU); the model downloads on first load of the start page and is cached afterward
- Implementation notes: `docs/webllm-askbar-implementation.md`

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload at `/arjun-portfolio/` |
| `npm run build` | Production build into `build/` |
| `npm test` | Test runner in watch mode |
| `npm start` | Serves `build/` at the domain root — see caveat below |

`npm start` uses `serve -s build`, which serves at `/`. The build’s assets are prefixed with `/arjun-portfolio/`, so they 404 there. Prefer `npm run dev` day to day. To preview a production build under the correct prefix:

```bash
npm run build
rm -rf /tmp/pages && mkdir -p /tmp/pages/arjun-portfolio
cp -R build/ /tmp/pages/arjun-portfolio/
npx serve /tmp/pages -l 3000    # then open http://localhost:3000/arjun-portfolio/
```

## Serving from a sub-path

This is a GitHub Pages **project** site, served from `/arjun-portfolio/` rather than a domain root. `package.json` sets:

```json
"homepage": "https://Hu4k3n.github.io/arjun-portfolio"
```

Create React App turns that into `PUBLIC_URL === "/arjun-portfolio"` in both development and production.

### The rule

> Anything referenced from `public/` by a literal URL must be prefixed with `process.env.PUBLIC_URL`. Never hardcode a root-absolute path like `/index.js`.

```js
// correct — resolves to /arjun-portfolio/index.js in dev and production
script.src = `${process.env.PUBLIC_URL}/index.js`;

// broken — requests https://Hu4k3n.github.io/index.js, which 404s
script.src = '/index.js';
```

Assets brought in through `import` (under `src/assets/`) are exempt — webpack rewrites those. The rule applies to files in `public/`, which webpack copies as-is.

A missing prefix fails silently: the Godot loader chains through `script.onload`, and a 404 fires `onerror` instead, so the game never starts and the app itself logs nothing useful.

## The Godot game

The export lives in `public/` and is loaded at runtime:

| File | Role |
| --- | --- |
| `public/index.js` | Godot engine loader; defines `window.Engine` |
| `public/init_godot_game.js` | Defines `window.init_godot_game()`, which configures and starts the engine |
| `public/index.wasm` | Engine binary (~44 MB) |
| `public/index.pck` | Packed game data (~4 MB) |

`src/packages/GameInit/GameCanvas/GodotGame.js` injects the two scripts in order and calls `init_godot_game()` only after the engine script has loaded. Both `src` values must use the `PUBLIC_URL` prefix.

### Notes for future changes

**How `index.wasm` and `index.pck` are found.** `GODOT_CONFIG.executable` is `"index"`, and the engine fetches those files as URLs relative to the current document. With `HashRouter`, the document URL stays `/arjun-portfolio/` (routes live in the fragment, e.g. `#/game`), so relative fetches resolve correctly. Switching to `BrowserRouter` would break this on routes like `/arjun-portfolio/game`.

**`locateFile` in `GODOT_CONFIG` does nothing.** The engine’s config allowlist does not include it. Prefer `executable` and `mainPack` if you need explicit asset paths.

**`fileSizes` is progress-bar cosmetics only.** Stale values only make the loading bar under-report; they are not a correctness issue.

## Deploying

Agent-oriented steps (bash + PowerShell): [`docs/DEPLOY.md`](docs/DEPLOY.md). Project map for agents: [`AGENTS.md`](AGENTS.md).

`main` holds the source; `gh-pages` holds the built site at its root. Publish the build explicitly:

```bash
npm run build

git worktree add .deploy gh-pages
rsync -a --delete --exclude='.git' --exclude='.gitignore' build/ .deploy/
git -C .deploy add -A
git -C .deploy commit -m "Deploy from main $(git rev-parse --short main)"
git -C .deploy push origin gh-pages
git worktree remove .deploy
```

`rsync --delete` prunes stale hashed bundles; excluding `.git` and `.gitignore` keeps the branch’s own files intact. After Pages propagates, cache-bust and confirm the loader files:

```bash
curl -s "https://Hu4k3n.github.io/arjun-portfolio/?cb=$(date +%s)" | grep -o 'main[^"]*\.js'
curl -o /dev/null -w '%{http_code}\n' https://Hu4k3n.github.io/arjun-portfolio/index.js
curl -o /dev/null -w '%{http_code}\n' https://Hu4k3n.github.io/arjun-portfolio/init_godot_game.js
```

## Project layout

```
public/            Godot export + icons
docs/              implementation notes (e.g. Ask bar × WebLLM)
src/
  App.js           HashRouter routes: / (start), /main (menu), /game
  assets/          images, audio, video (webpack-imported)
  context/         shared React context (background audio)
  hooks/           React hooks (Ask bar WebLLM bridge)
  services/        in-browser WebLLM
  packages/
    AboutSections/ about / experience content sections
    AskBar/        ask-anything input and answer panel
    BgWaves/       OGL background effect
    Button/        button variants (plain, glass, icon, back, game)
    GameInit/      Godot canvas, loader, in-game UI, how-to-play
    GlassNav/      glass-style navigation
    MainMenu/      menu screen and background video
    ProfileCard/   profile summary
    ScrollReveal/  scroll-triggered reveal
    Socials/       social links
    StartPage/     landing screen
    utils/         constants and helpers
```
