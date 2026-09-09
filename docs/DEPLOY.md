# Agent deploy guide

Publish the production build to GitHub Pages (`gh-pages` branch).

## Facts

| Item | Value |
| --- | --- |
| Source branch | `main` |
| Deploy branch | `gh-pages` (built site at **branch root**) |
| Live URL | https://Hu4k3n.github.io/arjun-portfolio/ |
| `homepage` | `/arjun-portfolio/` (CRA `PUBLIC_URL`) |

Do **not** commit `build/` to `main`. Do **not** edit Godot binaries (`public/index.wasm`, `public/index.pck`) during deploy.

## Steps (bash / Git Bash / WSL)

```bash
npm run build

git worktree add .deploy gh-pages
rsync -a --delete --exclude='.git' --exclude='.gitignore' build/ .deploy/
git -C .deploy add -A
git -C .deploy commit -m "Deploy from main $(git rev-parse --short main)"
git -C .deploy push origin gh-pages
git worktree remove .deploy
```

## Steps (PowerShell — this machine)

```powershell
npm run build

git fetch origin gh-pages
git worktree add .deploy gh-pages

$src = (Resolve-Path build).Path
$dst = (Resolve-Path .deploy).Path
Get-ChildItem -Force $dst | Where-Object { $_.Name -notin @('.git', '.gitignore') } | Remove-Item -Recurse -Force
robocopy $src $dst /E /NFL /NDL /NJH /NJS /nc /ns /np
if ($LASTEXITCODE -ge 8) { throw "robocopy failed: $LASTEXITCODE" }

$sha = git rev-parse --short main
$msg = "Deploy from main $sha"
Set-Content -Path .git\DEPLOY_MSG -Value $msg -NoNewline
Push-Location .deploy
git add -A
git commit -F ..\.git\DEPLOY_MSG
git push origin gh-pages
Pop-Location
Remove-Item .git\DEPLOY_MSG -ErrorAction SilentlyContinue
git worktree remove .deploy --force
```

If `git commit` fails with `unknown option trailer`, call `D:\Apps\Git\cmd\git.exe commit ...` directly (Cursor wrappers may inject unsupported flags on older Git).

## Verify after push

Wait for Pages to propagate, then cache-bust:

```bash
curl -s "https://Hu4k3n.github.io/arjun-portfolio/?cb=$(date +%s)" | grep -o 'main[^"]*\.js'
curl -o /dev/null -w '%{http_code}\n' https://Hu4k3n.github.io/arjun-portfolio/index.js
curl -o /dev/null -w '%{http_code}\n' https://Hu4k3n.github.io/arjun-portfolio/init_godot_game.js
```

Expect `200` for Godot loader scripts. Favicons cache aggressively — hard-refresh if icons look stale.

## Agent rules

1. Deploy only when the user asks.
2. Fresh chat for deploy if the current thread is already long.
3. Do not dump entire `build/` into context; run commands and summarize exit status.
4. If worktree `.deploy` already exists, remove it (`git worktree remove .deploy --force`) or use another path before adding again.
