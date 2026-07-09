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
  return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
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

async function run() {
  const args = process.argv.slice(2);
  const yes = args.includes('--yes');
  const dryRun = args.includes('--dry-run');
  const listOnly = args.includes('--list');
  const removeIdx = args.indexOf('--remove');
  const removeTarget = removeIdx !== -1 ? args[removeIdx + 1] : null;
  const positional = args.filter((a) => !a.startsWith('--') && a !== removeTarget);

  const manifest = loadManifest();
  if (removeTarget) {
    manifest.roots = manifest.roots.filter((r) => r !== removeTarget);
    console.log(`removed root: ${removeTarget}`);
  }
  for (const p of positional) {
    if (!manifest.roots.includes(p)) manifest.roots.push(p);
  }

  const resolve = buildResolver(walkVaultMarkdown());
  const closure = computeClosure(manifest.roots, resolve);

  console.log(`roots (${manifest.roots.length}):`);
  manifest.roots.forEach((r) => console.log(`  ${r}`));
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
  fs.writeFileSync(PLUGIN_DATA, `${JSON.stringify(pluginData, null, 2)}\n`);

  // the plugin holds settings in memory, so cycle it to pick up the external edit
  console.log('\nreloading plugin + triggering export in obsidian...');
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

  console.log(`\nexport complete. live after deploy at:`);
  closure.forEach((f) => console.log(`  ${SITE_BASE}/${slugify(f).replace(/\.md$/, '.html')}`));
  console.log(`\nnext: commit static/share + scripts/share-manifest.json and push to deploy.`);
}

run();
