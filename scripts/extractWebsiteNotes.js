import fs from 'fs';
import path from 'path';

const DEFAULT_INPUT_PATH = path.resolve(
  process.env.HOME || '',
  'Downloads/personal-2026-2-21.if.json'
);
const DEFAULT_OUTPUT_PATH = path.resolve(process.cwd(), 'src/lib/websiteNotes.json');
const LEGACY_NOTES_DIR = path.resolve(process.cwd(), 'static/notes');
const PUBLISH_TAG = 'publishonwebsite';

// ideaflow notes explicitly unpublished from the site. ids are stable, so without this a future
// re-export + regenerate would resurrect them (the tag can't be removed from ideaflow here).
const SUPPRESSED_IDS = new Set([
  'mDl1nG_N0t3', // on modeling
  'T1z7HRjKKn', // poorly vibe coded apps are bad
  'YWtzu4HKbA', // operation big items
  'lxdyZ3xlQa', // wow
  'OQdPDgNpRW', // episodic memory builder
  '1D9KLo_A6n' // idea of "things ... impact people differently"
]);

function normalizeTag(rawTag) {
  return String(rawTag || '')
    .trim()
    .replace(/^#+/, '')
    .toLowerCase();
}

function sanitizeSlug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function inlineToText(inlineContent = []) {
  return inlineContent
    .map((node) => {
      if (!node || typeof node !== 'object') return '';
      if (node.type === 'text') return node.content || '';
      if (node.type === 'hashtag') return node.content || '';
      if (node.type === 'link') {
        const label = node.content || node.slug || '';
        const url = node.slug || node.content || '';
        if (!url) return label;
        if (!label) return url;
        return `[${label}](${url})`;
      }
      if (node.type === 'checkbox') return node.isChecked ? '[x] ' : '[ ] ';
      return '';
    })
    .join('');
}

function renderTokensToMarkdown(tokens = [], indent = 0) {
  const lines = [];

  for (const token of tokens) {
    if (!token || typeof token !== 'object') continue;

    if (token.type === 'paragraph') {
      const text = inlineToText(token.content).trim();
      lines.push(text);
      continue;
    }

    if (token.type === 'list') {
      const listItems = Array.isArray(token.content) ? token.content : [];
      for (const listItem of listItems) {
        if (!listItem || listItem.type !== 'listItem') continue;
        const listItemContent = Array.isArray(listItem.content) ? listItem.content : [];
        let firstLineWritten = false;

        for (const nestedToken of listItemContent) {
          if (!nestedToken || typeof nestedToken !== 'object') continue;

          if (nestedToken.type === 'paragraph') {
            const text = inlineToText(nestedToken.content).trim();
            const prefix = `${'  '.repeat(indent)}- `;
            lines.push(`${prefix}${text}`);
            firstLineWritten = true;
          } else if (nestedToken.type === 'list') {
            if (!firstLineWritten) {
              lines.push(`${'  '.repeat(indent)}-`);
              firstLineWritten = true;
            }
            const nestedLines = renderTokensToMarkdown([nestedToken], indent + 1);
            lines.push(...nestedLines);
          }
        }
      }
      continue;
    }
  }

  return lines;
}

function collectHashtags(value, tags = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectHashtags(item, tags));
    return tags;
  }

  if (!value || typeof value !== 'object') return tags;

  if (value.type === 'hashtag' && value.content) {
    tags.push(value.content);
  }

  for (const childValue of Object.values(value)) {
    collectHashtags(childValue, tags);
  }

  return tags;
}

function hasPublishTag(note, markdownText) {
  const tags = collectHashtags(note.tokens || []).map(normalizeTag);
  const hasMatchingHashtag = tags.some((tag) => tag === PUBLISH_TAG);

  if (hasMatchingHashtag) return true;

  const textMatch = /(^|[\s])#publishonwebsite(?=$|[^a-z0-9_])/i.test(markdownText);
  return textMatch;
}

function pickTitle(markdownText) {
  const firstMeaningfulLine = markdownText
    .split('\n')
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .find((line) => line.length > 0);

  return firstMeaningfulLine || 'untitled note';
}

function toWebsiteNote(note) {
  const markdownLines = renderTokensToMarkdown(note.tokens || []);
  const markdown = markdownLines.join('\n').trim();
  const tags = [...new Set(collectHashtags(note.tokens || []).map(normalizeTag).filter(Boolean))];
  const title = pickTitle(markdown);
  const createdAt = note.created_at || null;
  const updatedAt = note.updated_at || null;
  const date = createdAt ? createdAt.slice(0, 10) : null;
  const edited = updatedAt && updatedAt !== createdAt ? updatedAt.slice(0, 10) : null;
  const slugTitle = sanitizeSlug(title);
  const slug = slugTitle ? `${note.id}-${slugTitle}` : note.id;

  return {
    id: note.id,
    slug,
    title,
    date,
    edited,
    createdAt,
    updatedAt,
    tags: tags.filter((tag) => tag !== PUBLISH_TAG),
    content: markdown
  };
}

function parseFrontmatter(frontmatter) {
  const metadata = {};
  const lines = String(frontmatter || '').split('\n');
  let currentKey = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    if (trimmedLine.includes(':')) {
      const [key, ...valueParts] = trimmedLine.split(':');
      currentKey = key.trim();
      let value = valueParts.join(':').trim();
      value = value.replace(/^["']|["']$/g, '');

      if (currentKey === 'title') {
        metadata.title = value;
      } else if (currentKey === 'published') {
        metadata.published = value === 'true';
      } else if (currentKey === 'tags') {
        metadata.tags = [];
      } else if (currentKey === 'date' || currentKey === 'edited') {
        metadata[currentKey] = value;
      }
    } else if (trimmedLine.startsWith('-') && currentKey === 'tags') {
      const tag = normalizeTag(trimmedLine.substring(1).trim());
      if (!metadata.tags) metadata.tags = [];
      if (tag) metadata.tags.push(tag);
    }
  }

  return metadata;
}

function loadLegacyMarkdownNotes() {
  if (!fs.existsSync(LEGACY_NOTES_DIR)) return [];

  const files = fs
    .readdirSync(LEGACY_NOTES_DIR)
    .filter((file) => file.endsWith('.md'))
    .sort();

  return files
    .map((file) => {
      const fullPath = path.join(LEGACY_NOTES_DIR, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (!match) return null;

      const metadata = parseFrontmatter(match[1]);
      if (!metadata.published) return null;

      const slug = file.replace(/\.md$/, '');
      const date = metadata.date || null;
      const edited = metadata.edited || null;

      return {
        id: `legacy-${slug}`,
        slug,
        title: metadata.title || slug.replace(/_/g, ' '),
        date,
        edited,
        createdAt: date ? `${date}T00:00:00.000Z` : null,
        updatedAt: edited ? `${edited}T00:00:00.000Z` : (date ? `${date}T00:00:00.000Z` : null),
        tags: Array.isArray(metadata.tags) ? metadata.tags.filter(Boolean) : [],
        content: (match[2] || '').trim()
      };
    })
    .filter(Boolean);
}

function run() {
  const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_INPUT_PATH;
  const outputPath = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_OUTPUT_PATH;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input export file not found: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const parsed = JSON.parse(raw);
  const notesObject = parsed?.notes;

  if (!notesObject || typeof notesObject !== 'object') {
    throw new Error('Invalid IF export format: missing top-level "notes" object.');
  }

  const exportNotes = Object.values(notesObject)
    .filter((note) => note && !note.deleted_at)
    .map((note) => {
      const markdown = renderTokensToMarkdown(note.tokens || []).join('\n').trim();
      return { note, markdown };
    })
    .filter(({ note, markdown }) => hasPublishTag(note, markdown))
    .map(({ note }) => toWebsiteNote(note))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const legacyNotes = loadLegacyMarkdownNotes();

  const websiteNotes = [...legacyNotes, ...exportNotes]
    .filter((note) => !SUPPRESSED_IDS.has(note.id))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const outputData = {
    generatedAt: new Date().toISOString(),
    source: inputPath,
    count: websiteNotes.length,
    notes: websiteNotes
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(outputData, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${websiteNotes.length} publishable notes to ${outputPath}`);
}

run();
