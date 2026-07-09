# personal-website

harrison's personal site at harrisonqian.com. SvelteKit + Svelte 5 + Vite. fully static (no SSR), deployed via cloudflare pages.

(migrated off moonflowers.xyz 2026-06-01; moonflowers.xyz now 301-redirects to harrisonqian.com.)

harrison's YouTube channel is **Dumb Derivatives** (https://www.youtube.com/@DumbDerivatives). his usual usernames are **Trospector** or **Moonflowers**. project demo/launch videos (e.g. the Pause launch video) live there.

## deploy architecture

two pieces, decoupled:

- **site shell + JS** → cloudflare pages, project `personal-website`, custom domain `harrisonqian.com` (also `www.harrisonqian.com`; `moonflowers.xyz`/`www` still resolve and 301-redirect here). adapter is `@sveltejs/adapter-static` with `fallback: 'index.html'` (SPA mode — every URL serves the shell, client router takes over).
- **media** (audio, video, images) → cloudflare R2 bucket `personal-website-media`, public via custom domain `assets.harrisonqian.com`. all media URLs in code use `https://assets.harrisonqian.com/<path>` via a per-file `const ASSETS = "https://assets.harrisonqian.com"`. (the bucket is unchanged; only the public hostname moved off `assets.moonflowers.xyz`, which now 301-redirects and will NOT serve images — never reintroduce it.)

a Vercel project also exists but is not the production deploy. harrisonqian.com only points at cloudflare pages.

cloudflare account id: `b5767c459ae1102e08c8dd559b76ee15`. you almost always need this as an env var since wrangler sees multiple accounts.

## deploys

**auto-deploy on push to main** via GitHub Actions (`.github/workflows/deploy.yml`). every push to main runs `npm ci && npm run build && wrangler pages deploy build` on a github runner. takes ~1min total.

cloudflare pages itself has `Git Provider: No` — the GH Actions workflow is the only thing that talks to cloudflare. wrangler auths via the `CLOUDFLARE_API_TOKEN` GitHub repo secret (scoped to `Account:Cloudflare Pages:Edit` only).

**manual deploy** still works if you ever need to push a build from your laptop (e.g. testing a local change without committing):

```
npm run build
CLOUDFLARE_ACCOUNT_ID=b5767c459ae1102e08c8dd559b76ee15 \
  wrangler pages deploy build --project-name=personal-website --branch=main --commit-dirty=true
```

future code-only deploys take ~10s on cloudflare's side (dedupes by file hash). first deploys after a long gap are slow because nothing is cached.

## adding new media

new media must go to R2, not `static/`. workflow:

1. drop the file somewhere local
2. `rclone copy <file-or-dir> r2:personal-website-media/<remote-path> --transfers 8 --checkers 8`
3. reference it in code as `${ASSETS}/<remote-path>`
4. don't put it in `static/` — keeping that directory tiny is what makes pages deploys fast

**obsidian wikilink images inside writing posts.** the writing vault is an obsidian vault at `static/writing/` (its `.obsidian/` config and `static/writing/attachments/` are gitignored). pasting an image in obsidian drops it in `static/writing/attachments/` and writes an `![[file.png|500]]` embed. the writing renderer (`src/routes/writing/[slug]/+page.svelte`) converts that obsidian embed syntax to `<img src="${ASSETS}/writing/attachments/<file>" width="...">` at load time — so the image is served from R2, same as all other media. the `|500` (or `|500x300`) part is an optional width/height hint; a non-numeric part becomes alt text. workflow: paste in obsidian → `npm run sync-media` (rclone-copies `static/writing/attachments/` → `r2:personal-website-media/writing/attachments/`) → commit the `.md` + push. (the attachments dir is NOT committed; the image lives on R2.) also note: same-page anchor links `[[#heading]]` are rendered as in-page nav by an existing marked extension in that file.

rclone is pre-configured (remote name `r2`). credentials in 1password item `do63matvylpmx2h45g2copha3m` ("Cloudflare API token", Private vault) — that item now holds:
- `notesPlain`: R2 S3 access key + secret + endpoint (what rclone uses)
- `credential`: a CF API token scoped to R2 Object R/W on this bucket
- `pages_token`: a CF API token scoped to `Account:Cloudflare Pages:Edit` (mirrored to the `CLOUDFLARE_API_TOKEN` GitHub secret on `harqian/personal-website` — rotate both together)

source media backed up at `~/Desktop/personal-website-media-backup/`; R2 is canonical.

## verifying a live deploy

`curl https://harrisonqian.com` returns the SPA shell, not page content. headings like "I LOVE MUSIC" exist only after JS runs. **use `agent-browser` for verification**, not curl/grep against the HTML.

## theming (light/dark + font)

dark is the default; light is opt-in. two independent axes, each an attribute on `<html>`:

- **`data-theme`** = `dark` (default, no attribute) | `light`
- **`data-font`** = `mono` (default, no attribute) | `serif`

how it fits together:

- **all colors are semantic CSS variables** defined once in `src/routes/+layout.svelte`'s `:root` (the dark palette). `:global(html[data-theme="light"])` overrides only the tokens that change; `:global(html[data-font="serif"])` swaps `--font-body`. tokens are grouped by ROLE, not value: a 4-step text scale (`--text` → `--text-secondary` → `--text-muted` → `--text-faint`), surfaces (`--surface-1/2/3`, `--surface-solid`), borders (`--border`, `--border-strong`), shadows (`--shadow`, `--shadow-strong`), accents (`--link-color`, `--accent-blue[-rgb]`, `--accent-yellow[-rgb]`, `--accent-green`), and media scrims. when adding UI, reach for a token, don't hardcode a hex.
- **media-control scrims stay fixed in BOTH themes** (the dark `rgba(0,0,0,…)` pills/captions in `Carousel.svelte` + `Gallery.svelte`). they ride over photos/video, which are theme-independent, so they're deliberately NOT tokenized. don't "fix" them.
- **the yellow accent deepens to gold in light** (`--accent-yellow` → `#c8860b`) because bright `#ffd43b` washes out on a light page. it's the one accent with a light override.
- **code stays monospace even in serif mode** via `:global(code, pre, kbd, samp) { font-family: var(--font-mono) }`. only body prose + headings switch to serif.
- **no-FOUC:** an inline script in `src/app.html` applies the saved `data-theme`/`data-font` before first paint (reads `localStorage` keys `theme` / `font`). first-time visitors get the CSS default (dark + mono) with no flash.
- **the toggles live in `src/lib/ThemeControls.svelte`** (fixed top-right, global, rendered once in the root layout). the **Euler eye** is the theme toggle — open eye = light, closed/"lost" eye = dark (nods to the homepage Euler quote). the **`Aa`** button toggles font (its glyph renders in the active font). both persist to `localStorage` and set the `<html>` attributes.
- **`src/lib/theme.js`** is a tiny writable store (`"dark"|"light"`) that `ThemeControls` writes and `StarBackground` reads, so the sky reacts to the eye without prop-drilling.

### StarBackground day/night (stars ↔ clouds)

`StarBackground.svelte` reads the `theme` store. **night** (dark) = the full starfield. **day** (light) = all stars fade out and a separate `.cloud-layer` of soft white clouds fades in and drifts. notes:

- clouds are independent of the stars (big + few): `generateClouds()` makes a handful (count ∝ page height, capped at 14), each a cluster of overlapping `<ellipse>`s + a flat base, softened with `blur` + `drop-shadow`. they drift horizontally in the rAF loop (only when `isDay`), wrapping at the edges. gated by a `reduceMotion` flag.
- `.day .star { opacity: 0 !important }` fades every star; the `!important` beats the per-frame inline `opacity` the twinkle loop writes. small/medium carry a per-star `transition-delay` keyed to seed-Y so the fade sweeps top→bottom like dawn; large stars twinkle, so they get a fast transition and NO delay (a delay would lag the twinkle).
- the day sky gradient (`--bg-gradient` in the light block) is a soft blue so white clouds read against it; `--cloud-color` is the fill.
- day is LIGHTER than night (stars hidden, no box-shadow glow), which also dodges the headless-screenshot crash below.

(an earlier version morphed ~10% of stars into flapping gull silhouettes; replaced with clouds — tiny SVG birds read as scribbles at that scale.)

### verifying the theme in a browser

the animated starfield **crashes headless screenshots on tall/dark pages** (hundreds of glowing animated divs OOM the GPU process — a pre-existing perf trait, not a regression). to screenshot a page in dark mode, first `agent-browser eval "document.querySelectorAll('.star-layer').forEach(e=>e.remove())"`. day mode (birds only) screenshots fine. toggle via clicking `.eye-toggle` / `.font-toggle` (don't just set the attribute — the eye writes the `theme` store that drives the bird morph).

## non-obvious gotchas

- **wrangler 4.x defaults to local-mock mode for r2 commands.** `wrangler r2 object put ...` silently uploads to a local mock instead of production. always pass `--remote`.
- **cloudflare REST API for R2 object PUT returns 500s** even on small files. use the S3-compatible API (rclone, aws cli, boto3) instead. the S3 endpoint is `https://b5767c459ae1102e08c8dd559b76ee15.r2.cloudflarestorage.com`.
- **Svelte's `muted={isMuted}` on `<video>` doesn't update the property after mount** (DOM `muted` attribute is sticky vs. property). both `Carousel.svelte` and `Gallery.svelte` work around this by binding videos via `bind:this` and imperatively setting `.muted` in the toggle handler.
- **`adapter-vercel` requires SvelteKit ≥ 2.27** (uses `kit.experimental.remoteFunctions`). older 2.x throws `Cannot read properties of undefined`.
- **transcoding small mp4s to webm usually makes them bigger.** social-media-sourced clips (TikTok/IG/YouTube rips) are already heavily compressed and don't benefit. only re-encode high-bitrate sources.

## sharing obsidian notes to /share (recursive note sharing)

`node scripts/shareNotes.js "path/to/Note.md"` shares a note from the home vault (`~/obsidian_files/home`) plus its full recursive wikilink closure at `harrisonqian.com/share/<slugified-path>.html`. exported via the webpage-html-export obsidian plugin into `static/share/` (committed to git — the site rebuilds from the repo on every push, so exports must be committed to survive deploys).

- `scripts/share-manifest.json` is the source of truth for what's shared. every run re-exports the union of all roots' closures; `--remove "Note.md"` unshares. `--dry-run` previews the closure without touching anything — use it before sharing anything link-heavy.
- closures >30 notes abort unless `--yes` (privacy guard: a hub note can drag half the vault onto the public web).
- **the export only works while obsidian is frontmost.** the plugin renders pages in a hidden window that never paints when the app is backgrounded — exports stall or silently no-op. the script activates Obsidian, exports, then restores the previous app. don't "fix" the activate call away.
- **the plugin's main.js is hand-patched**: render timeout `4e3` → `4e4` near "Waiting for all sections to be counted" (upstream bug KosmosisDire/obsidian-webpage-export#686, pages with embeds silently drop at 4s). a plugin update will overwrite the patch — if pages start missing from exports after an update, re-apply it.
- **the script appends `#main-horizontal{min-height:0}` to main-styles.css after every export** (marker: `share-fix`). without it, flexbox min-height:auto lets the content expand past the viewport inside the centered `#main` column, so the page top clips unreachably (can't scroll up to the title) and the sidebar/graph layout degrades. plugin CSS bug, present in stock 1.9.2 exports.
- after a share deploy, viewers with a cached `main-styles.css` see the broken layout until a hard refresh (the css URL never changes). if someone reports "can't scroll up," have them hard-refresh before debugging.
- export media (images embedded in shared notes) lands inside `static/share/` next to the pages. exception to the media-goes-to-R2 rule: the plugin manages these paths itself and share sets are small. if a share ever pulls in heavy media, reconsider.
- obsidian-side settings live in the vault at `.obsidian/plugins/webpage-html-export/data.json`; the script rewrites `filesToExport`/`exportPath` and reloads the plugin (via advanced-uri) each run, so manual edits there don't stick.
