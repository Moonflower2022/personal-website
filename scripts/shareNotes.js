import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

// shares obsidian notes (recursively, via wikilink closure) to harrisonqian.com/share/
// usage:
//   node scripts/shareNotes.js                       re-export everything in the manifest
//   node scripts/shareNotes.js "path/to/Note.md"     add a root note (vault-relative) and export
//   node scripts/shareNotes.js --remove "Note.md"    remove a root and re-export
//   node scripts/shareNotes.js --list                show manifest + current closure
//   node scripts/shareNotes.js --dry-run             compute closure, touch nothing
//   --yes                                            skip the >MAX_FILES safety abort

const VAULT = path.join(os.homedir(), 'obsidian_files/home');
const VAULT_NAME = 'home';
const PLUGIN_DATA = path.join(VAULT, '.obsidian/plugins/webpage-html-export/data.json');
const MANIFEST = path.resolve(process.cwd(), 'scripts/share-manifest.json');
const EXPORT_DIR = path.resolve(process.cwd(), 'static/share');
const SITE_BASE = 'https://harrisonqian.com/share';
const MAX_FILES = 30; // closure bigger than this aborts unless --yes, so a hub note can't drag half the vault onto the web

function loadManifest() {
  if (!fs.existsSync(MANIFEST)) return { roots: [] };
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  m.roots = m.roots || [];
  m.singles = m.singles || []; // shared WITHOUT following links (privacy: linked notes stay private)
  return m;
}

function walkVaultMarkdown() {
  const files = [];
  const skip = new Set(['.obsidian', '.trash', '.git']);
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
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

function extractLinks(markdown) {
  const targets = [];
  for (const m of markdown.matchAll(/!?\[\[([^\]]+)\]\]/g)) targets.push(m[1]);
  for (const m of markdown.matchAll(/\]\(([^)]+\.md)\)/g)) targets.push(decodeURIComponent(m[1]));
  return targets;
}

function computeClosure(roots, resolve) {
  const closure = new Set();
  const queue = [...roots];
  while (queue.length) {
    const rel = queue.shift();
    if (closure.has(rel)) continue;
    const full = path.join(VAULT, rel);
    if (!fs.existsSync(full)) {
      console.warn(`  ! missing from vault, skipping: ${rel}`);
      continue;
    }
    closure.add(rel);
    const md = fs.readFileSync(full, 'utf8');
    for (const target of extractLinks(md)) {
      const resolved = resolve(target);
      if (resolved && !closure.has(resolved)) queue.push(resolved);
    }
  }
  return [...closure].sort();
}

function slugify(p) {
  return p.replaceAll(' ', '-').replaceAll(/-{2,}/g, '-').toLowerCase();
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
  const positional = args.filter((a) => !a.startsWith('--') && a !== removeTarget);
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
  }

  const resolve = buildResolver(walkVaultMarkdown());
  const closure = computeClosure(manifest.roots, resolve);
  for (const s of manifest.singles) {
    if (!closure.includes(s)) {
      if (fs.existsSync(path.join(VAULT, s))) closure.push(s);
      else console.warn(`  ! single missing from vault, skipping: ${s}`);
    }
  }
  closure.sort();

  console.log(`recursive roots (${manifest.roots.length}):`);
  manifest.roots.forEach((r) => console.log(`  ${r}`));
  console.log(`singles, links not followed (${manifest.singles.length}):`);
  manifest.singles.forEach((r) => console.log(`  ${r}`));
  console.log(`closure (${closure.length} notes):`);
  closure.forEach((f) => console.log(`  ${f} -> ${SITE_BASE}/${slugify(f).replace(/\.md$/, '.html')}`));

  if (listOnly || dryRun) return;
  if (closure.length === 0) {
    console.error('nothing to export — closure is empty.');
    process.exit(1);
  }
  if (closure.length > MAX_FILES && !yes) {
    console.error(
      `\naborting: closure is ${closure.length} notes (> ${MAX_FILES}). ` +
        `check the list above for anything you don't want public, then re-run with --yes.`
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
  for (const page of expectedHtml) {
    const html = fs.readFileSync(page, 'utf8');
    for (const m of html.matchAll(refRe)) {
      const target = path.join(EXPORT_DIR, m[1].split('?')[0]);
      if (!fs.existsSync(target) && !stubbed.has(target)) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, '');
        stubbed.add(target);
      }
    }
  }
  if (stubbed.size) console.log(`stubbed missing assets: ${[...stubbed].join(', ')}`);

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
