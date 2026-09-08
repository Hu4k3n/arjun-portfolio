# Arjun Syam — Portfolio

A game-styled personal portfolio: a React front end wrapping a Godot 4 web export, so the
site opens like a game menu (start screen → main menu → playable game).

**Live:** [Hu4k3n.github.io/arjun-portfolio](https://Hu4k3n.github.io/arjun-portfolio/)

## Stack

- React 19 + `react-router-dom` (`HashRouter`), bootstrapped with Create React App 5
- Godot 4 WebAssembly export, served as static files from `public/`
- GSAP and OGL for menu animation and background effects
- Deployed to GitHub Pages from the `gh-pages` branch

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:3000/arjun-portfolio/** — note the path, not bare
`localhost:3000`. See [Serving from a sub-path](#serving-from-a-sub-path) for why.

### Optional: the Ask bar

The Ask bar runs a small LLM **entirely in the browser** via
[`@mlc-ai/web-llm`](https://github.com/mlc-ai/web-llm) (WebGPU + a web worker). No backend
and no API keys.

- **One question → one answer.** Nothing is held between asks (no chat history, no context files).
- Replies are capped at **100 words**; generation is interrupted if the model exceeds that.
- Requires **Chrome or Edge 113+** (WebGPU). Model download starts when the start page loads; later visits use the browser cache.
- Implementation notes: `docs/webllm-askbar-implementation.md`

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload, at `/arjun-portfolio/` |
| `npm run build` | Production build into `build/` |
| `npm test` | Test runner in watch mode |
| `npm start` | Serves `build/` at the domain root — see the caveat below |

`npm start` runs `serve -s build`, which serves at `/`. Because the build's assets are
prefixed with `/arjun-portfolio/`, they will 404 there. Use `npm run dev` for day-to-day
work. To preview a real production build under the correct prefix:

```bash
npm run build
rm -rf /tmp/pages && mkdir -p /tmp/pages/arjun-portfolio
cp -R build/ /tmp/pages/arjun-portfolio/
npx serve /tmp/pages -l 3000    # then open http://localhost:3000/arjun-portfolio/
```

## Serving from a sub-path

This is a GitHub Pages **project** site, so it is served from `/arjun-portfolio/` rather than
a domain root. `package.json` sets:

```json
"homepage": "https://Hu4k3n.github.io/arjun-portfolio"
```

Create React App turns that into `PUBLIC_URL === "/arjun-portfolio"` and applies it in both
development and production, so the prefix behaves identically in both. Keeping it in
`package.json` rather than an ambient `PUBLIC_URL` environment variable means a build is
correct no matter who or what runs it.

### The rule

> Anything referenced from `public/` by a literal URL must be prefixed with
> `process.env.PUBLIC_URL`. Never hardcode a root-absolute path like `/index.js`.

```js
// correct — resolves to /arjun-portfolio/index.js in dev and production
script.src = `${process.env.PUBLIC_URL}/index.js`;

// broken — requests https://Hu4k3n.github.io/index.js, which 404s
script.src = '/index.js';
```

Assets brought in through `import` (images, audio, video under `src/assets/`) are exempt:
webpack rewrites those to hashed, correctly-prefixed URLs. The rule applies to files in
`public/`, which webpack copies verbatim and never rewrites.

This is worth being strict about because the failure is silent. The Godot loader chains
through `script.onload`, and a 404 fires `onerror` instead, so a missing prefix produces no
console error from the app itself — just a game that never starts.

## The Godot game

The export lives in `public/` and is loaded at runtime rather than bundled:

| File | Role |
| --- | --- |
| `public/index.js` | Godot's engine loader; defines `window.Engine` |
| `public/init_godot_game.js` | Defines `window.init_godot_game()`, which configures and starts the engine |
| `public/index.wasm` | The engine binary (~44 MB) |
| `public/index.pck` | Packed game data (~4 MB) |

`src/packages/GameInit/GameCanvas/GodotGame.js` injects the two scripts in order, calling
`init_godot_game()` only once the engine script has loaded. Both `src` values must carry the
`PUBLIC_URL` prefix.

### Notes for future changes

**How `index.wasm` and `index.pck` get found.** `GODOT_CONFIG.executable` is `"index"`, and
the engine fetches `index.wasm` / `index.pck` as URLs relative to the current document. The
app uses `HashRouter`, so the document URL stays `/arjun-portfolio/` (routes live in the
fragment, as `#/game`), and those relative fetches resolve correctly with no extra
configuration. Switching to `BrowserRouter` would break this, because a route such as
`/arjun-portfolio/game/play` would change the base that relative URLs resolve against.

**`locateFile` in `GODOT_CONFIG` does nothing.** The engine's `Config.prototype.update`
copies only a fixed allowlist of keys — `executable`, `mainPack`, `canvas`, `fileSizes`, and
friends — and `locateFile` is not among them; `getModuleConfig` then supplies its own. If you
ever do need explicit asset paths, set `executable` and `mainPack` instead.

**`fileSizes` is progress-bar cosmetics only.** The values currently declared in
`init_godot_game.js` are stale and larger than the real files, which only makes the loading
bar under-report. It is not a correctness problem.

## Deploying

`main` holds the source; the `gh-pages` branch holds the built site at its root. There is no
`gh-pages` npm package wired up — publish the build explicitly:

```bash
npm run build

git worktree add .deploy gh-pages
rsync -a --delete --exclude='.git' --exclude='.gitignore' build/ .deploy/
git -C .deploy add -A
git -C .deploy commit -m "Deploy from main $(git rev-parse --short main)"
git -C .deploy push origin gh-pages
git worktree remove .deploy
```

The `rsync --delete` prunes stale hashed bundles; excluding `.git` and `.gitignore` keeps the
branch's own files intact. Pages takes a minute or so to propagate, and the CDN caches
`index.html`, so verify with a cache-busting request:

```bash
curl -s "https://Hu4k3n.github.io/arjun-portfolio/?cb=$(date +%s)" | grep -o 'main[^"]*\.js'
```

Then confirm the loader files resolve, since these are exactly what breaks when a prefix is
missing:

```bash
curl -o /dev/null -w '%{http_code}\n' https://Hu4k3n.github.io/arjun-portfolio/index.js
curl -o /dev/null -w '%{http_code}\n' https://Hu4k3n.github.io/arjun-portfolio/init_godot_game.js
```

### Branches

`main` is the source of truth and is deployable as-is. The older `for-deploy`, `for-deploy-1`,
and `next` branches contain divergent copies of `GodotGame.js` and `init_godot_game.js` from
before the `PUBLIC_URL` handling was settled. Don't deploy from them; prefer deleting or
rebasing them onto `main`.

## Project layout

```
public/            Godot export (index.js, index.wasm, index.pck, init_godot_game.js) + icons
scripts/           (optional tooling)
src/
  App.js           HashRouter routes: / (start), /main (menu), /game
  assets/          images, audio and video, imported through webpack
  context/         shared React context (background audio)
  hooks/           React hooks (Ask bar WebLLM bridge)
  services/        standalone services (in-browser WebLLM)
  packages/
    AskBar/        the ask-anything input and answer panel
    GameInit/      Godot canvas, loader, in-game UI and how-to-play
    StartPage/     landing screen
    MainMenu/      menu screen and background video
    ProfileCard/   profile summary card
    Socials/       social links
    Button/        button variants (plain, glass, icon, back, game)
    BgWaves/       OGL background effect
    ScrollReveal/  scroll-triggered reveal animation
    utils/         constants and helpers
docs/              implementation notes (e.g. Ask bar × WebLLM)
```
