import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

// shares obsidian notes (recursively, via wikilink closure) to harrisonqian.com/share/
// usage:
//   node scripts/shareNotes.js                       re-export everything in the manifest
//   node scripts/shareNotes.js "path/to/Note.md"     add a root note (vault-relative) and export
//   node scripts/shareNotes.js "Note.md" --depth 1   share the note + its direct links only
//   node scripts/shareNotes.js "Note.md" --depth 2   ...+ one more hop. depth 0 = note only.
//   node scripts/shareNotes.js --remove "Note.md"    remove a root and re-export
//   node scripts/shareNotes.js --list                show manifest + current closure
//   node scripts/shareNotes.js --dry-run             compute closure, touch nothing
//   --yes                                            skip the >MAX_FILES safety abort
//   --depth N                                        bound link-following to N hops (per root);
//                                                    also opts out of the MAX_FILES guard
//   --single                                         share the note WITHOUT following any links
//
// privacy — three ways to keep things out of a shared note:
//   ~[[Private Note]]   a private LINK: still clickable in obsidian, but the target
//                       is never published and the link is redacted (blur bar).
//   %%private text%%    an obsidian comment: hidden in reading view, so it never
//                       reaches the web at all. use for anything you don't need to see rendered.
//   > [!private]        a private CALLOUT block: a normal, visible box in obsidian,
//                       but the whole block is stripped from the exported page.
// all three also stop any [[link]] inside them from being pulled into the share.

const VAULT = path.join(os.homedir(), 'obsidian_files/home');
const VAULT_NAME = 'home';
const PLUGIN_DATA = path.join(VAULT, '.obsidian/plugins/webpage-html-export/data.json');
const MANIFEST = path.resolve(process.cwd(), 'scripts/share-manifest.json');
const EXPORT_DIR = path.resolve(process.cwd(), 'static/share');
const SITE_BASE = 'https://harrisonqian.com/share';
const MAX_FILES = 30; // closure bigger than this aborts unless --yes, so a hub note can't drag half the vault onto the web

function loadManifest() {
  if (!fs.existsSync(MANIFEST)) return { roots: [], singles: [], depths: {} };
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  m.roots = m.roots || [];
  m.singles = m.singles || []; // shared WITHOUT following links (privacy: linked notes stay private)
  m.depths = m.depths || {}; // per-root max link-follow depth (absent = unlimited)
  return m;
}

function walkVaultMarkdown() {
  const files = [];
  const skip = new Set(['.obsidian', '.trash', '.git']);
  const seen = new Set(); // guard against symlink loops
  (function walk(dir) {
    const real = fs.realpathSync(dir);
    if (seen.has(real)) return;
    seen.add(real);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      // follow symlinked dirs too (e.g. writing/ -> another vault): isDirectory()
      // is false for a symlink, so stat the resolved target to decide.
      let isDir = entry.isDirectory();
      if (entry.isSymbolicLink()) {
        try { isDir = fs.statSync(full).isDirectory(); } catch { continue; }
      }
      if (isDir) walk(full);
      else if (entry.name.endsWith('.md')) files.push(path.relative(VAULT, full));
    }
  })(VAULT);
  return files;
}

// obsidian resolves [[Name]] by basename, case-insensitively
function buildResolver(allFiles) {
  const byBasename = new Map();
  const byPath = new Map();
  for (const rel of allFiles) {
    byPath.set(rel.toLowerCase(), rel);
    const base = path.basename(rel, '.md').toLowerCase();
    if (!byBasename.has(base)) byBasename.set(base, rel);
  }
  return (target) => {
    const clean = target.split(/[#^|]/)[0].trim();
    if (!clean) return null;
    const lower = clean.toLowerCase();
    return (
      byPath.get(lower.endsWith('.md') ? lower : `${lower}.md`) ||
      byBasename.get(path.basename(lower, '.md')) ||
      null
    );
  };
}

// strip content that must never be shared BEFORE scanning for links, so any
// [[link]] inside it is never followed into the closure. two forms:
//   %%...%%        obsidian comments — also never render on the web (reading view hides them)
//   > [!private]   a private callout block — rendered in obsidian, stripped from the export html
function stripPrivateForClosure(markdown) {
  let s = markdown.replace(/%%[\s\S]*?%%/g, ''); // obsidian comments (inline or block)
  const out = [];
  let inCallout = false;
  for (const line of s.split('\n')) {
    if (!inCallout && /^\s*>\s*\[!private\][-+]?/i.test(line)) {
      inCallout = true;
      continue;
    }
    if (inCallout) {
      if (/^\s*>/.test(line)) continue; // still inside the blockquote/callout
      inCallout = false; // a non-'>' line ends it
    }
    out.push(line);
  }
  return out.join('\n');
}

// remove a `> [!private]` callout from exported html. the callout div nests other
// divs (title/content), so match its close by counting div depth from the opener.
function stripPrivateCalloutHtml(html) {
  const re = /<div\b|<\/div>/gi;
  let result = html;
  let guard = 0;
  while (guard++ < 1000) {
    const at = result.indexOf('data-callout="private"');
    if (at === -1) break;
    const start = result.lastIndexOf('<div', at);
    if (start === -1) break;
    re.lastIndex = start;
    let depth = 0;
    let end = -1;
    let m;
    while ((m = re.exec(result))) {
      if (m[0][1] !== '/') depth++;
      else depth--;
      if (depth === 0) {
        end = re.lastIndex;
        break;
      }
    }
    if (end === -1) break;
    result = result.slice(0, start) + result.slice(end);
  }
  return result;
}

// a leading ~ marks a PRIVATE link: `~[[note]]` stays a normal clickable link in
// obsidian, but is excluded from the share closure (target never published) and
// redacted from the exported html. isPrivate rides along so the caller can do both.
function extractLinks(markdown) {
  const links = [];
  for (const m of markdown.matchAll(/(~)?!?\[\[([^\]]+)\]\]/g)) {
    links.push({ target: m[2], isPrivate: m[1] === '~' });
  }
  for (const m of markdown.matchAll(/\]\(([^)]+\.md)\)/g)) {
    links.push({ target: decodeURIComponent(m[1]), isPrivate: false });
  }
  return links;
}

// the raw wikilink target, minus any #heading / ^block / |alias — matches the
// data-href webpage-html-export writes, so we can redact these from the html.
function linkKey(target) {
  return target.split(/[#^|]/)[0].trim();
}

// BFS closure over wikilinks. each root carries its own maxDepth (from the
// manifest); depth 0 = the note itself, depth 1 = its direct links, etc.
// private (~) links are never followed but ARE collected for redaction.
function computeClosure(roots, depths, resolve) {
  const closure = new Set();
  const privateTargets = new Set();
  const queue = roots.map((r) => [r, 0, depths[r] ?? Infinity]);
  while (queue.length) {
    const [rel, depth, maxDepth] = queue.shift();
    if (closure.has(rel)) continue;
    const full = path.join(VAULT, rel);
    if (!fs.existsSync(full)) {
      console.warn(`  ! missing from vault, skipping: ${rel}`);
      continue;
    }
    closure.add(rel);
    const md = stripPrivateForClosure(fs.readFileSync(full, 'utf8'));
    for (const { target, isPrivate } of extractLinks(md)) {
      if (isPrivate) {
        privateTargets.add(linkKey(target));
        continue;
      }
      if (depth >= maxDepth) continue; // at the depth bound: don't follow further
      const resolved = resolve(target);
      if (resolved && !closure.has(resolved)) queue.push([resolved, depth + 1, maxDepth]);
    }
  }
  return { closure: [...closure].sort(), privateTargets };
}

// remove privately-marked links from an exported page: match the anchor by its
// data-href (the raw wikilink target) plus any tilde that rendered before it.
function redactPrivateLinks(html, privateTargets) {
  let out = html;
  for (const t of privateTargets) {
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`~?\\s*<a\\b[^>]*\\bdata-href="${esc}"[^>]*>.*?</a>`, 'gi');
    out = out.replace(re, '<span class="share-redacted" aria-hidden="true"></span>');
  }
  return out;
}

function slugify(p) {
  return p.replaceAll(' ', '-').replaceAll(/-{2,}/g, '-').toLowerCase();
}

// characters that break webpage-html-export / make an invalid web filename+URL.
// a note whose name contains one of these fails to export and errors the whole run.
const WEB_UNSAFE = /[?#%*:"<>|\\]|[\x00-\x1f]/;

// if any note in the closure has a web-unsafe filename, rename it (strip the bad
// chars) and rewrite the wikilinks pointing at it, so it publishes cleanly instead
// of failing the export. mutates the vault + manifest; returns the updated closure.
function sanitizeClosureFilenames(closure, manifest) {
  const renamed = [];
  for (const rel of closure) {
    const base = path.basename(rel, '.md');
    if (!WEB_UNSAFE.test(base)) continue;
    const dir = path.dirname(rel);
    const clean = base.replace(/[?#%*:"<>|\\]|[\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim() || 'untitled';
    const prefix = dir === '.' ? '' : `${dir}/`;
    let newRel = `${prefix}${clean}.md`;
    let n = 2;
    while (fs.existsSync(path.join(VAULT, newRel)) && newRel !== rel) newRel = `${prefix}${clean} ${n++}.md`;
    fs.renameSync(path.join(VAULT, rel), path.join(VAULT, newRel));
    renamed.push({ oldRel: rel, newRel, oldBase: base, newBase: path.basename(newRel, '.md') });
  }
  if (!renamed.length) return closure;

  // rewrite [[oldBase]] / [[oldBase|..]] / [[oldBase#..]] / [[dir/oldBase]] across the vault
  for (const r of walkVaultMarkdown()) {
    const full = path.join(VAULT, r);
    let txt = fs.readFileSync(full, 'utf8');
    let changed = false;
    for (const { oldBase, newBase } of renamed) {
      const esc = oldBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\[\\[((?:[^\\[\\]|#^]*\\/)?)${esc}(?=[\\]|#^])`, 'g');
      const next = txt.replace(re, `[[$1${newBase}`);
      if (next !== txt) { txt = next; changed = true; }
    }
    if (changed) fs.writeFileSync(full, txt);
  }
  // keep the manifest pointing at the new names
  const remap = (arr) => arr.map((x) => renamed.find((rn) => rn.oldRel === x)?.newRel || x);
  manifest.roots = remap(manifest.roots);
  manifest.singles = remap(manifest.singles);
  for (const { oldRel, newRel } of renamed) {
    if (manifest.depths[oldRel] != null) { manifest.depths[newRel] = manifest.depths[oldRel]; delete manifest.depths[oldRel]; }
  }
  renamed.forEach((r) => console.warn(`  ⚠ renamed web-unsafe note for export: "${r.oldBase}" → "${r.newBase}"`));
  return closure.map((rel) => renamed.find((r) => r.oldRel === rel)?.newRel || rel);
}

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// a simple landing page at /share/ listing every shared note. roots (the notes
// you shared on purpose) are featured on top; the rest of the closure below.
function buildShareIndexHtml(closure, roots) {
  const rootSet = new Set(roots);
  const toItem = (rel) => {
    const href = encodeURI(slugify(rel).replace(/\.md$/, '.html'));
    const title = path.basename(rel, '.md');
    return `<li><a href="${href}">${esc(title)}</a></li>`;
  };
  const rootLis = closure.filter((r) => rootSet.has(r)).map(toItem);
  const rest = closure
    .filter((r) => !rootSet.has(r))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
  const restLis = rest.map(toItem);
  const featured = rootLis.length
    ? `    <h2>featured</h2>\n    <ul>\n      ${rootLis.join('\n      ')}\n    </ul>\n`
    : '';
  const more = restLis.length
    ? `    <h2>${rootLis.length ? 'more' : 'notes'} <span class="count">(${rest.length})</span></h2>\n` +
      `    <ul>\n      ${restLis.join('\n      ')}\n    </ul>\n`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>notes — harrison qian</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#0d0d0f; color:#e8e8ea;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; line-height:1.65; }
  main { max-width:720px; margin:0 auto; padding:12vh 24px 20vh; }
  h1 { font-size:1.4rem; font-weight:600; margin:0 0 .2rem; letter-spacing:-.01em; }
  .sub { color:#7c7c85; margin:0 0 3rem; font-size:.85rem; }
  h2 { font-size:.72rem; text-transform:uppercase; letter-spacing:.1em;
    color:#7c7c85; font-weight:600; margin:2.5rem 0 .6rem; }
  ul { list-style:none; margin:0; padding:0; }
  li { margin:.1rem 0; }
  a { color:#7cb3ff; text-decoration:none; padding:.12rem 0; display:inline-block; }
  a:hover { text-decoration:underline; text-underline-offset:3px; }
  .count { color:#5a5a63; }
</style>
</head>
<body>
  <main>
    <h1>notes</h1>
    <p class="sub">harrisonqian.com</p>
${featured}${more}  </main>
</body>
</html>
`;
}

// a depth-0 exported page (its site-lib/ links are relative to the share root,
// which is where index.html lives, so they resolve unchanged)
function findTemplatePage() {
  if (!fs.existsSync(EXPORT_DIR)) return null;
  const files = fs
    .readdirSync(EXPORT_DIR)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .sort();
  return files.length ? path.join(EXPORT_DIR, files[0]) : null;
}

// clone an exported note page's Obsidian shell (sidebar file-tree, search, graph,
// theme toggle) and swap the note out for an empty landing — so /share/ feels like
// obsidian: no note shown, click one from the sidebar.
function buildShellLandingHtml(templateHtml) {
  let html = templateHtml.replace(/<title>[\s\S]*?<\/title>/, '<title>notes — harrison qian</title>');
  // clean link-preview metadata (but LEAVE <meta name="pathname"> as the cloned
  // note's real path: it keeps the shell from flashing "this page does not exist"
  // on load; the resulting active-highlight is neutralised in CSS below).
  html = html
    .replace(/(<meta name="description" content=")[^"]*(">)/, "$1harrison&#39;s notes$2")
    .replace(/(<meta property="og:title" content=")[^"]*(">)/, '$1notes$2')
    .replace(/(<meta property="og:description" content=")[^"]*(">)/, "$1harrison&#39;s notes$2")
    .replace(/(<meta property="og:url" content=")[^"]*(">)/, '$1https://harrisonqian.com/share/$2');
  // hide the per-note right sidebar (graph + outline are meaningless with no note
  // open) and neutralise the file-tree active-highlight so no note looks selected.
  const landingCss =
    '<style>#right-sidebar,#right-sidebar-gutter{display:none!important}' +
    '.tree-item-self.is-active{background:transparent!important;font-weight:inherit!important;' +
    'color:inherit!important;box-shadow:none!important}</style>';
  html = html.replace('</head>', `${landingCss}</head>`);
  const start = html.indexOf('<div id="center-content"');
  if (start === -1) return html;
  const re = /<div\b|<\/div>/gi;
  re.lastIndex = start;
  let depth = 0;
  let end = -1;
  let m;
  while ((m = re.exec(html))) {
    if (m[0][1] !== '/') depth++;
    else depth--;
    if (depth === 0) {
      end = re.lastIndex;
      break;
    }
  }
  if (end === -1) return html;
  // the shell's SPA router treats a click on the note whose pathname we cloned as
  // "already loaded" (and won't navigate). force a full page load for any note
  // link from the landing so every note is reachable, regardless of pathname.
  const forceNav =
    '<script>addEventListener("click",function(e){' +
    'var a=e.target.closest&&e.target.closest("a[href]");if(!a)return;' +
    'var h=a.getAttribute("href")||"";if(h.indexOf(".html")>-1){' +
    'e.stopImmediatePropagation();e.preventDefault();window.location.assign(h);}}' +
    ',true);</script>';
  html = html.replace('</body>', `${forceNav}</body>`);
  const placeholder =
    '<div id="center-content" class="leaf">' +
    '<div class="obsidian-document markdown-preview-view markdown-rendered is-readable-line-width" data-type="markdown">' +
    '<div class="markdown-preview-sizer markdown-preview-section">' +
    '<div class="header"><h1 class="page-title heading inline-title">notes</h1><div class="data-bar"></div></div>' +
    '<div class="el-p"><p style="opacity:.55">pick a note from the sidebar &larr;</p></div>' +
    '</div></div></div>';
  return html.slice(0, start) + placeholder + html.slice(end);
}

// write /share/index.html: prefer the obsidian-shell landing (needs an exported
// page to clone); fall back to the standalone list if nothing's exported yet.
function writeShareIndex(closure, roots) {
  const tmpl = findTemplatePage();
  const html = tmpl
    ? buildShellLandingHtml(fs.readFileSync(tmpl, 'utf8'))
    : buildShareIndexHtml(closure, roots);
  fs.writeFileSync(path.join(EXPORT_DIR, 'index.html'), html);
  return Boolean(tmpl);
}

function obsidianUri(params) {
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  execFileSync('open', [`obsidian://advanced-uri?vault=${VAULT_NAME}&${qs}`]);
}

function snapshotExportDir() {
  const snap = new Map();
  if (!fs.existsSync(EXPORT_DIR)) return snap;
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else snap.set(full, fs.statSync(full).mtimeMs);
    }
  })(EXPORT_DIR);
  return snap;
}

async function waitForExport(before, expectedHtml) {
  const deadline = Date.now() + 180_000;
  let lastChange = Date.now();
  let lastSnap = before;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    const now = snapshotExportDir();
    const changed =
      now.size !== lastSnap.size || [...now].some(([f, t]) => lastSnap.get(f) !== t);
    if (changed) lastChange = Date.now();
    lastSnap = now;
    const allPresent = expectedHtml.every((f) => now.has(f));
    // settled = all expected pages exist and nothing has changed for 6s
    if (allPresent && Date.now() - lastChange > 6000) return true;
  }
  return false;
}

// the note currently open in obsidian, from the workspace state on disk
function activeVaultFile() {
  const ws = JSON.parse(fs.readFileSync(path.join(VAULT, '.obsidian/workspace.json'), 'utf8'));
  let found = null;
  (function walk(node) {
    if (!node || found) return;
    if (node.id === ws.active && node.state?.state?.file) found = node.state.state.file;
    (node.children || []).forEach(walk);
  })(ws.main);
  if (!found) {
    const last = (ws.lastOpenFiles || [])[0];
    if (last) found = last;
  }
  if (!found) throw new Error('could not determine the active obsidian file');
  return found;
}

async function run() {
  const args = process.argv.slice(2);
  const yes = args.includes('--yes');
  const dryRun = args.includes('--dry-run');
  const listOnly = args.includes('--list');
  const deploy = args.includes('--deploy');
  const removeIdx = args.indexOf('--remove');
  const removeTarget = removeIdx !== -1 ? args[removeIdx + 1] : null;
  const depthIdx = args.indexOf('--depth');
  const depthArg = depthIdx !== -1 ? args[depthIdx + 1] : null;
  const depthFlag = depthArg != null ? parseInt(depthArg, 10) : null;
  if (depthArg != null && (Number.isNaN(depthFlag) || depthFlag < 0)) {
    console.error(`--depth needs a non-negative integer (got "${depthArg}")`);
    process.exit(1);
  }
  const positional = args.filter(
    (a) => !a.startsWith('--') && a !== removeTarget && a !== depthArg
  );
  if (args.includes('--current')) {
    const f = activeVaultFile();
    console.log(`current obsidian file: ${f}`);
    positional.push(f);
  }

  const manifest = loadManifest();
  if (removeTarget) {
    manifest.roots = manifest.roots.filter((r) => r !== removeTarget);
    manifest.singles = manifest.singles.filter((r) => r !== removeTarget);
    console.log(`removed: ${removeTarget}`);
  }
  const single = args.includes('--single');
  for (const p of positional) {
    const list = single ? manifest.singles : manifest.roots;
    if (!list.includes(p)) list.push(p);
    if (depthFlag != null && !single) manifest.depths[p] = depthFlag;
  }
  // prune stale depth entries for roots that no longer exist
  for (const k of Object.keys(manifest.depths)) {
    if (!manifest.roots.includes(k)) delete manifest.depths[k];
  }

  const resolve = buildResolver(walkVaultMarkdown());
  let { closure, privateTargets } = computeClosure(manifest.roots, manifest.depths, resolve);
  for (const s of manifest.singles) {
    if (fs.existsSync(path.join(VAULT, s))) {
      if (!closure.includes(s)) closure.push(s);
      // singles are exported too, so collect their private links for redaction
      const smd = stripPrivateForClosure(fs.readFileSync(path.join(VAULT, s), 'utf8'));
      for (const { target, isPrivate } of extractLinks(smd)) {
        if (isPrivate) privateTargets.add(linkKey(target));
      }
    } else console.warn(`  ! single missing from vault, skipping: ${s}`);
  }
  closure.sort();

  // privacy failsafe: a note referenced with ~ anywhere must never be published,
  // even if it's ALSO reachable via a normal link. drop it and warn loudly (a
  // false-positive exclusion is fine; a leaked private note is not).
  if (privateTargets.size) {
    const privateResolved = new Set();
    for (const t of privateTargets) {
      const r = resolve(t);
      if (r) privateResolved.add(r);
    }
    const leaked = closure.filter((f) => privateResolved.has(f));
    if (leaked.length) {
      console.warn(
        `  ⚠ ${leaked.length} private (~) note(s) were also reached via a normal link — excluding from the share:`
      );
      leaked.forEach((f) => console.warn(`    ${f}`));
      closure = closure.filter((f) => !privateResolved.has(f));
    }
  }

  console.log(`recursive roots (${manifest.roots.length}):`);
  manifest.roots.forEach((r) =>
    console.log(`  ${r}${manifest.depths[r] != null ? ` (depth ${manifest.depths[r]})` : ''}`)
  );
  console.log(`singles, links not followed (${manifest.singles.length}):`);
  manifest.singles.forEach((r) => console.log(`  ${r}`));
  console.log(`closure (${closure.length} notes):`);
  closure.forEach((f) => console.log(`  ${f} -> ${SITE_BASE}/${slugify(f).replace(/\.md$/, '.html')}`));
  if (privateTargets.size) {
    console.log(`private (~) links, redacted + not shared (${privateTargets.size}):`);
    privateTargets.forEach((t) => console.log(`  ${t}`));
  }

  if (listOnly || dryRun) return;

  // regenerate just the /share landing page from the current closure, no export
  if (args.includes('--index-only')) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    const shell = writeShareIndex(closure, manifest.roots);
    console.log(`wrote ${path.relative(process.cwd(), EXPORT_DIR)}/index.html ` +
      `(${shell ? 'obsidian-shell' : 'standalone list'}, ${closure.length} notes) -> ${SITE_BASE}/`);
    return;
  }

  // rename any web-unsafe filenames (e.g. a "?" in the name) + fix their links, so
  // one bad filename publishes cleanly instead of erroring the whole export
  closure = sanitizeClosureFilenames(closure, manifest);

  if (closure.length === 0) {
    console.error('nothing to export — closure is empty.');
    process.exit(1);
  }
  // --depth is an explicit scope bound, so it opts out of the >MAX_FILES guard
  if (closure.length > MAX_FILES && !yes && depthFlag == null) {
    console.error(
      `\naborting: closure is ${closure.length} notes (> ${MAX_FILES}). ` +
        `check the list above for anything you don't want public, then re-run with --yes ` +
        `(or bound it with --depth N).`
    );
    process.exit(1);
  }

  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  const pluginData = JSON.parse(fs.readFileSync(PLUGIN_DATA, 'utf8'));
  pluginData.exportOptions.filesToExport = closure;
  pluginData.exportOptions.exportPath = EXPORT_DIR;
  pluginData.onlyExportModified = false; // deterministic full re-render; share sets are small
  // custom-head emits a reference to a file the plugin never writes (upstream #650);
  // on the live site that fetch 404s into the SPA fallback and injects the whole site shell
  pluginData.exportOptions.customHeadOptions.enabled = false;
  // export with stock obsidian styling: vault themes (Border etc.) degrade in export —
  // heading accent bars render as floating red marks, math sizing gets interfered with
  pluginData.exportOptions.themeName = 'Default';
  pluginData.exportOptions.addPageIcon = true; // title text generation is coupled to the icon builder — false leaves every page-title h1 empty
  fs.writeFileSync(PLUGIN_DATA, `${JSON.stringify(pluginData, null, 2)}\n`);

  // the plugin holds settings in memory, so cycle it to pick up the external edit
  console.log('\nreloading plugin + triggering export in obsidian...');
  // wipe the export dir first: the plugin skips re-rendering pages whose source notes
  // haven't changed (even with onlyExportModified off), so settings changes never
  // propagate to existing pages. a missing page always re-renders.
  fs.rmSync(EXPORT_DIR, { recursive: true, force: true });
  fs.mkdirSync(EXPORT_DIR, { recursive: true }); // export silently no-ops if the target dir is missing
  const before = snapshotExportDir();
  const previousApp = execFileSync('osascript', [
    '-e',
    'tell application "System Events" to get name of first application process whose frontmost is true',
  ])
    .toString()
    .trim();
  obsidianUri({ 'disable-plugin': 'webpage-html-export' });
  await new Promise((r) => setTimeout(r, 2000));
  obsidianUri({ 'enable-plugin': 'webpage-html-export' });
  await new Promise((r) => setTimeout(r, 2000));
  // the render window only paints while obsidian is frontmost — unfocused exports stall silently
  execFileSync('osascript', ['-e', 'tell application "Obsidian" to activate']);
  obsidianUri({ commandid: 'webpage-html-export:export-html-vault' });

  const expectedHtml = closure.map((f) =>
    path.join(EXPORT_DIR, slugify(f).replace(/\.md$/, '.html'))
  );
  const ok = await waitForExport(before, expectedHtml);
  if (previousApp && previousApp !== 'Obsidian') {
    try {
      execFileSync('osascript', ['-e', `tell application "${previousApp.replaceAll('"', '')}" to activate`]);
    } catch {
      // restoring focus is best-effort
    }
  }
  if (!ok) {
    console.error('export did not settle within 3 minutes — check obsidian for errors.');
    process.exit(1);
  }

  // every asset referenced by a page must exist on disk — a missing one gets the SPA
  // fallback (the full site shell) served in its place, which injects the site into the
  // note (includes) or applies garbage (css/js). stub anything absent with an empty file.
  const refRe = /(?:href|src)="(site-lib\/[^"]+)"/g;
  const stubbed = new Set();
  let redactedCount = 0;
  let calloutCount = 0;
  for (const page of expectedHtml) {
    let html = fs.readFileSync(page, 'utf8');
    const orig = html;
    for (const m of html.matchAll(refRe)) {
      const target = path.join(EXPORT_DIR, m[1].split('?')[0]);
      if (!fs.existsSync(target) && !stubbed.has(target)) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, '');
        stubbed.add(target);
      }
    }
    // strip [!private] callouts so private prose never appears on the shared page
    const afterCallout = stripPrivateCalloutHtml(html);
    if (afterCallout !== html) calloutCount++;
    html = afterCallout;
    // redact privately-marked (~) links so they never appear on the shared page
    if (privateTargets.size) {
      const before = (html.match(/share-redacted/g) || []).length;
      html = redactPrivateLinks(html, privateTargets);
      redactedCount += (html.match(/share-redacted/g) || []).length - before;
    }
    if (html !== orig) fs.writeFileSync(page, html);
  }
  if (stubbed.size) console.log(`stubbed missing assets: ${[...stubbed].join(', ')}`);
  if (redactedCount) console.log(`redacted ${redactedCount} private (~) link(s) from exported pages`);
  if (calloutCount) console.log(`stripped [!private] callout(s) from ${calloutCount} page(s)`);

  // flexbox min-height:auto lets #main-horizontal expand to content height inside the
  // centered #main column, which clips the page top unreachably (can't scroll up to the
  // title) and breaks the layout the sidebars/graph expect. exports regenerate this file,
  // so re-append the fix every run.
  const mainStyles = path.join(EXPORT_DIR, 'site-lib/styles/main-styles.css');
  const fixRule = '\n/* share-fix */ #main-horizontal{min-height:0}\n';
  if (fs.existsSync(mainStyles) && !fs.readFileSync(mainStyles, 'utf8').includes('share-fix')) {
    fs.appendFileSync(mainStyles, fixRule);
    console.log('applied share-fix layout rule to main-styles.css');
  }
  // blur-bar styling for redacted (~) links; regenerated every export like share-fix
  const redactCss =
    '\n/* share-redact */ .share-redacted{display:inline-block;min-width:4ch;height:1em;' +
    'vertical-align:text-bottom;margin:0 .1em;border-radius:3px;' +
    'background:var(--background-modifier-border,rgba(128,128,128,.4));filter:blur(2px)}\n';
  if (fs.existsSync(mainStyles) && !fs.readFileSync(mainStyles, 'utf8').includes('share-redact')) {
    fs.appendFileSync(mainStyles, redactCss);
  }

  // regenerate the /share landing page so it stays in sync with what's shared
  writeShareIndex(closure, manifest.roots);
  console.log(`wrote share index -> ${SITE_BASE}/`);

  console.log(`\nexport complete. live after deploy at:`);
  closure.forEach((f) => console.log(`  ${SITE_BASE}/${slugify(f).replace(/\.md$/, '.html')}`));

  if (!deploy) {
    console.log(`\nnext: commit static/share + scripts/share-manifest.json and push to deploy.`);
    return;
  }
  console.log('\ndeploying...');
  execFileSync('git', ['add', 'static/share', 'scripts/share-manifest.json'], { cwd: process.cwd() });
  const staged = execFileSync('git', ['status', '--porcelain', 'static/share', 'scripts/share-manifest.json'], { cwd: process.cwd() }).toString().trim();
  if (!staged) {
    console.log('no changes vs last deploy — already live at the urls above.');
    return;
  }
  execFileSync('git', ['commit', '--quiet', '-m', `share: ${manifest.roots.length} roots, ${closure.length} notes`], { cwd: process.cwd() });
  execFileSync('git', ['push', '--quiet', 'origin', 'main'], { cwd: process.cwd() });
  console.log('pushed — live in ~1 minute at the urls above.');
}

run();
