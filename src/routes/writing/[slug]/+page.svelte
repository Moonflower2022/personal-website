<script>
    import { page } from '$app/stores';
    import { marked } from 'marked';
    import Header from "$lib/Header.svelte"
    import StarBackground from "$lib/StarBackground.svelte"
    import { writingPieceSet } from "$lib/writingPieces.js";

    const ASSETS = "https://assets.harrisonqian.com";
    const SITE = "https://harrisonqian.com";

    const IMG_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    let piece = null;
    let content = '';
    let toc = [];
    let loading = true;
    let articleEl;
    let previewHTML = '';
    let previewVisible = false;
    let previewX = 0;
    let previewY = 0;

    function slugify(text) {
        return text
            .toLowerCase()
            .replace(/&#?\w+;/g, '')
            .replace(/[^\w\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
    }

    // configure marked once at module level; calling marked.use repeatedly accumulates extensions
    marked.setOptions({
        gfm: true,
        breaks: false,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: false
    });

    marked.use({
        renderer: {
            heading({ tokens, depth }) {
                const text = this.parser.parseInline(tokens);
                const plain = text.replace(/<[^>]+>/g, '').trim();
                const id = slugify(plain);
                // trailing "#" lets readers copy a direct link to this section (click handler attached post-render)
                const anchor = `<a class="heading-anchor" href="#${id}" data-heading-id="${id}" aria-label="copy link to this section" title="copy link to this section">#</a>`;
                return `<h${depth} id="${id}">${text}${anchor}</h${depth}>\n`;
            }
        },
        extensions: [{
            name: 'footnote',
            level: 'inline',
            start(src) { return src.match(/^\[\^/)?.index; },
            tokenizer(src) {
                const m = src.match(/^\[\^([^\]]+)\]/);
                if (m) return { type: 'footnote', raw: m[0], text: m[1] };
            },
            renderer(token) {
                return `<sup><a href="#fn-${token.text}" id="fnref-${token.text}" class="footnote-ref">${token.text}</a></sup>`;
            }
        }, {
            name: 'wikilink',
            level: 'inline',
            start(src) { return src.match(/\[\[/)?.index; },
            tokenizer(src) {
                // [[target]] or [[target|alias]]. target may be:
                //   #heading            -> same-page anchor
                //   essay  /  essay#h   -> link to another published essay
                //   file.png|500        -> image embed (left untouched here)
                //   private note        -> plain text (no page to link to)
                const m = src.match(/^\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/);
                if (m) {
                    return {
                        type: 'wikilink',
                        raw: m[0],
                        target: m[1].trim(),
                        alias: m[2] ? m[2].trim() : null
                    };
                }
            },
            renderer(token) {
                const { target, alias, raw } = token;

                // 1) same-page anchor: [[#heading]]
                if (target.startsWith('#')) {
                    const anchor = target.slice(1);
                    const id = slugify(anchor);
                    return `<a class="wikilink" href="#${id}" data-target="${id}">${alias ?? anchor}</a>`;
                }

                const [notePart, headingPart] = target.split('#');
                const note = notePart.trim();

                // 2) image embed without '!' (e.g. [[foo.png|520]]) — not a note link,
                //    leave exactly as-is so nothing about image handling changes
                if (IMG_EXT.test(note)) return raw;

                // 3) cross-essay link -> /writing/<slug>(#heading)
                const key = note.toLowerCase().replace(/\s+/g, '_');
                if (writingPieceSet.has(key)) {
                    const hash = headingPart ? `#${slugify(headingPart)}` : '';
                    const shown = alias ?? note.replace(/_/g, ' ');
                    return `<a class="wikilink-note" href="/writing/${key}${hash}">${escapeHtml(shown)}</a>`;
                }

                // 4) private / unpublished note: nothing to link to on the site
                return `<span class="wikilink-missing" title="not published on the site">${escapeHtml(alias ?? target)}</span>`;
            }
        }, {
            // ~[content] from obsidian → visible redaction bar; content never reaches the DOM
            name: 'redaction',
            level: 'inline',
            start(src) { return src.match(/~\[/)?.index; },
            tokenizer(src) {
                const m = src.match(/^~\[([^\]]+)\]/);
                if (m) return { type: 'redaction', raw: m[0], text: m[1] };
            },
            renderer(token) {
                // bucket width so original length doesn't leak; only "short / medium / long" survives
                const len = token.text.length;
                const size = len < 12 ? 'short' : len < 50 ? 'med' : 'long';
                return `<span class="redaction redaction-${size}" aria-label="redacted"></span>`;
            }
        }]
    });

    // re-load when slug changes (SPA nav between posts). guard so hash-only
    // changes (clicking an in-page anchor) don't trigger a content reload —
    // that would wipe the anchor target before the browser can scroll to it.
    let currentSlug = null;
    $: if ($page.params.slug !== currentSlug) {
        currentSlug = $page.params.slug;
        loadPiece(currentSlug);
    }

    async function loadPiece(slug) {
        loading = true;
        piece = null;
        content = '';
        toc = [];
        try {
            const response = await fetch(`/writing/${slug}.md`);

            if (!response.ok) {
                throw new Error('Piece not found');
            }

            const rawContent = await response.text();


            // Parse frontmatter
            const frontmatterMatch = rawContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
            
            if (frontmatterMatch) {
                const frontmatter = frontmatterMatch[1];
                const markdownContent = frontmatterMatch[2];
                
                const metadata = {};
                const lines = frontmatter.split('\n');
                let currentKey = '';
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;
                    
                    // Check if it's a key-value pair
                    if (trimmedLine.includes(':')) {
                        const [key, ...valueParts] = trimmedLine.split(':');
                        currentKey = key.trim();
                        let value = valueParts.join(':').trim();
                        
                        // Remove surrounding quotes if present
                        value = value.replace(/^["']|["']$/g, '');
                        
                        if (currentKey === 'title') {
                            metadata.title = value;
                        } else if (currentKey === 'published') {
                            metadata.published = value === 'true';
                        } else if (currentKey === 'toc') {
                            metadata.toc = value === 'true';
                        } else if (currentKey === 'subtitle') {
                            metadata.subtitle = value;
                        } else if (currentKey === 'tags') {
                            metadata.tags = [];
                        } else if (currentKey === 'date' || currentKey === 'edited') {
                            metadata[currentKey] = value;
                        }
                    } 
                    // Handle array items (tags with hyphens)
                    else if (trimmedLine.startsWith('-') && currentKey === 'tags') {
                        const tag = trimmedLine.substring(1).trim();
                        if (!metadata.tags) metadata.tags = [];
                        metadata.tags.push(tag);
                    }
                }
                
                // Use title from metadata if available, otherwise derive from filename
                const titleFromSlug = slug.replace(/\.md$/, '').replace(/_/g, ' ');
                piece = { ...metadata, title: metadata.title || titleFromSlug };
                
                // Process footnote definitions and convert to HTML
                let processedContent = markdownContent.replace(/^\[\^([^\]]+)\]:\s*(.+)$/gm, (match, id, text) => {
                    return `<div class="footnote-def" id="fn-${id}">
                        <a href="#fnref-${id}" class="footnote-number">${id}</a>
                        <span class="footnote-text">${marked.parseInline(text)}</span>
                    </div>`;
                });

                // obsidian image embeds: ![[file.png|500]] or ![[file.png|500x300]] -> <img>
                // resolved to R2 (writing/attachments/) so pasting in obsidian + `npm run sync-media` just works.
                // the part after | is a size hint if numeric (WxH), otherwise alt text.
                processedContent = processedContent.replace(/!\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g, (match, file, opt) => {
                    const src = `${ASSETS}/writing/attachments/${encodeURIComponent(file.trim())}`;
                    const hint = opt?.trim();
                    if (hint && /^\d+(x\d+)?$/.test(hint)) {
                        const [w, h] = hint.split('x');
                        return `<img class="embed-img" src="${src}" alt="" width="${w}"${h ? ` height="${h}"` : ''} loading="lazy" />`;
                    }
                    return `<img class="embed-img" src="${src}" alt="${hint || ''}" loading="lazy" />`;
                });

                // Parse the markdown content
                content = marked.parse(processedContent);

                // Build TOC from h2/h3 in the rendered html
                const doc = new DOMParser().parseFromString(content, 'text/html');
                toc = Array.from(doc.querySelectorAll('h2, h3')).map(h => {
                    // clone-and-strip so the trailing "#" copy-anchor doesn't leak into the TOC label
                    const clone = h.cloneNode(true);
                    clone.querySelector('.heading-anchor')?.remove();
                    return {
                        id: h.id,
                        level: parseInt(h.tagName[1], 10),
                        text: clone.textContent.trim()
                    };
                });
            }
        } catch (error) {
            console.error('Error loading piece:', error);
        } finally {
            loading = false;
        }
    }

    // After content renders, attach hover handlers, heading copy-anchors, and
    // honor any #hash in the URL (the browser's native scroll fires before the
    // markdown is rendered, so deep links would otherwise land at the top).
    $: if (articleEl && content) {
        Promise.resolve().then(() => {
            attachHoverPreviews();
            attachHeadingAnchors();
            scrollToHashIfPresent();
        });
    }

    function attachHoverPreviews() {
        const links = articleEl?.querySelectorAll('a.wikilink, a[data-toc-link]');
        if (!links) return;
        for (const a of links) {
            a.addEventListener('mouseenter', onLinkHover);
            a.addEventListener('mouseleave', onLinkLeave);
            a.addEventListener('mousemove', onLinkMove);
            a.addEventListener('focus', onLinkHover);
            a.addEventListener('blur', onLinkLeave);
        }
    }

    // copy-a-link-to-this-section: clicking the trailing "#" copies the heading's canonical URL
    function attachHeadingAnchors() {
        const anchors = articleEl?.querySelectorAll('a.heading-anchor');
        if (!anchors) return;
        for (const a of anchors) a.addEventListener('click', onHeadingAnchorClick);
    }

    function onHeadingAnchorClick(e) {
        e.preventDefault();
        const a = e.currentTarget;
        const id = a.dataset.headingId;
        if (!id) return;
        const url = `${SITE}/writing/${currentSlug}#${id}`;
        const done = () => {
            history.replaceState(null, '', `#${id}`);
            a.classList.add('copied');
            setTimeout(() => a.classList.remove('copied'), 1200);
        };
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).then(done).catch(done);
        } else {
            done();
        }
    }

    // jump to the heading named by location.hash once content exists in the DOM
    function scrollToHashIfPresent() {
        const raw = window.location.hash.replace(/^#/, '');
        if (!raw) return;
        const id = decodeURIComponent(raw);
        const el = articleEl?.querySelector(`#${CSS.escape(id)}`);
        if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
    }

    // Collect a heading and the following section content for the popover preview
    function gatherSectionPreview(id) {
        const target = articleEl?.querySelector(`#${CSS.escape(id)}`);
        if (!target) return '';
        const level = parseInt(target.tagName[1], 10);
        const parts = [target.outerHTML];
        let charBudget = 400;
        let node = target.nextElementSibling;
        while (node && charBudget > 0) {
            if (/^H[1-6]$/.test(node.tagName)) {
                const nl = parseInt(node.tagName[1], 10);
                if (nl <= level) break;
            }
            parts.push(node.outerHTML);
            charBudget -= node.textContent.length;
            node = node.nextElementSibling;
        }
        return parts.join('\n');
    }

    function onLinkHover(e) {
        const a = e.currentTarget;
        const id = a.dataset.target || a.getAttribute('href')?.replace(/^#/, '');
        if (!id) return;
        const html = gatherSectionPreview(id);
        if (!html) return;
        previewHTML = html;
        positionPreview(e);
        previewVisible = true;
    }
    function onLinkLeave() {
        previewVisible = false;
    }
    function onLinkMove(e) {
        if (previewVisible) positionPreview(e);
    }
    function positionPreview(e) {
        const margin = 14;
        const popoverW = 420;
        let x = e.clientX + margin;
        let y = e.clientY + margin;
        if (x + popoverW > window.innerWidth) x = window.innerWidth - popoverW - 8;
        previewX = x;
        previewY = y;
    }

    function scrollToHeading(id, ev) {
        ev?.preventDefault();
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', `#${id}`);
        }
    }

    function goBack() {
        if (typeof window !== 'undefined') {
            window.history.back();
        }
    }

    function formatDate(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString();
    }
</script>

<StarBackground>

<Header />
<main>
    <div class="column">
        <a href="/writing"><h2>back</h2></a>
        <hr class="horizontal-line">
        
        {#if loading}
            <p>Loading...</p>
        {:else if piece}
            <article bind:this={articleEl}>
                <header>
                    <h2 class="title">{piece.title}</h2>
                    <div class="meta-row">
                        {#if piece.subtitle}
                            <span class="subtitle">{piece.subtitle}</span>
                        {/if}
                        <time class="date">
                            {formatDate(piece.date)}
                            {#if piece.edited}
                                <span class="edited">(edited {formatDate(piece.edited)})</span>
                            {/if}
                        </time>
                    </div>
                </header>
                {#if piece.toc && toc.length > 1}
                    <nav class="toc" aria-label="table of contents">
                        <div class="toc-label">contents</div>
                        <ol class="toc-list">
                            {#each toc as item}
                                <li class="toc-item toc-l{item.level}">
                                    <a
                                        href="#{item.id}"
                                        class="wikilink"
                                        data-toc-link="1"
                                        data-target={item.id}
                                        on:click={(e) => scrollToHeading(item.id, e)}
                                    >{item.text}</a>
                                </li>
                            {/each}
                        </ol>
                    </nav>
                {/if}
                <div class="content">
                    {@html content}
                </div>
            </article>

            {#if previewVisible}
                <div
                    class="link-preview"
                    style="left:{previewX}px; top:{previewY}px;"
                    role="tooltip"
                >
                    {@html previewHTML}
                </div>
            {/if}
        {:else}
            <p>Piece not found</p>
        {/if}
    </div>
</main>
</StarBackground>

<style>    
    header {
        margin-bottom: 2rem;
    }
    
    .title {
        margin-bottom: 0.5rem;
    }
    
    .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        color: var(--text-faint);
        font-size: 0.9rem;
    }
    
    .content {
        line-height: 1.6;
        margin-bottom: 3rem;
    }

    .content :global(p) {
        margin-bottom: 1rem;
    }
    
    .content :global(blockquote) {
        border-left: 3px solid var(--border-strong);
        padding-left: 1rem;
        margin: 1rem 0;
        font-style: italic;
    }
    
    /* Link styles */
    .content :global(a) {
        color: var(--link-color, #0066cc);
        text-decoration: underline;
        transition: all 0.2s ease;
    }
    
    .content :global(a:hover) {
        opacity: 0.8;
    }
    
    /* Emphasis styles */
    .content :global(em) {
        font-style: italic;
    }
    
    .content :global(strong) {
        font-weight: bold;
    }
    
    /* Footnote reference styles (in main text) */
    .content :global(.footnote-ref) {
        text-decoration: none;
        font-size: 0.8em;
        color: var(--link-color, #0066cc);
        transition: all 0.2s ease;
    }
    
    .content :global(.footnote-ref:hover) {
        text-decoration: underline;
    }
    
    /* Footnote definition styles */
    .content :global(.footnote-def) {
        display: flex;
        align-items: flex-start;
        margin-top: 1rem;
        padding-top: 0.5rem;
        font-size: 0.9em;
        line-height: 1.4;
    }
    
    .content :global(.footnote-def:first-of-type) {
        border-top: 2px solid var(--border-strong);
        margin-top: 3rem;
        padding-top: 1rem;
    }
    
    .content :global(.footnote-number) {
        display: inline-block;
        min-width: 1.5rem;
        text-align: center;
        color: var(--link-color, #0066cc);
        text-decoration: none;
        cursor: pointer;
    }
    
    .content :global(.footnote-number:hover) {
        text-decoration: underline;
    }
    
    .content :global(.footnote-text a) {
        color: var(--link-color, #0066cc);
    }
    
    /* Responsive images */
    .content :global(img) {
        display: block;
        margin: 1.5rem auto;
        max-width: 100%;
        height: auto;
        border-radius: 4px;
    }

    /* Table of contents */
    .toc {
        margin: 0 0 2rem 0;
        padding: 1rem 1.25rem;
        background: var(--surface-1);
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 0.95rem;
    }

    .toc-label {
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
    }

    .toc-list {
        list-style: none;
        padding: 0;
        margin: 0;
        counter-reset: toc-counter;
    }

    .toc-item {
        padding: 0.2rem 0;
        counter-increment: toc-counter;
    }

    .toc-item a {
        color: inherit;
        text-decoration: none;
        transition: color 0.15s ease;
    }

    .toc-item a:hover {
        color: var(--link-color, #0066cc);
    }

    .toc-item.toc-l2::before {
        content: counter(toc-counter) ".";
        display: inline-block;
        min-width: 1.6rem;
        color: var(--text-faint);
    }

    .toc-item.toc-l3 {
        padding-left: 1.75rem;
        font-size: 0.9rem;
        color: var(--text-muted);
    }

    /* redactions — solid bar; content is stripped before rendering */
    .content :global(.redaction) {
        display: inline-block;
        height: 0.95em;
        vertical-align: -0.1em;
        background: currentColor;
        opacity: 0.78;
        border-radius: 2px;
        user-select: none;
        margin: 0 0.15em;
    }
    .content :global(.redaction-short) { width: 2.2em; }
    .content :global(.redaction-med)   { width: 4.5em; }
    .content :global(.redaction-long) {
        width: 100%;
        height: 2.4em;
        display: block;
        margin: 0.4em 0;
    }

    /* wikilinks in body */
    .content :global(a.wikilink) {
        color: var(--link-color, #0066cc);
        text-decoration: none;
        border-bottom: 1px dashed currentColor;
    }

    .content :global(a.wikilink:hover) {
        opacity: 0.85;
    }

    /* cross-essay [[links]] — solid link, no dashed anchor styling */
    .content :global(a.wikilink-note) {
        color: var(--link-color, #0066cc);
        text-decoration: none;
        border-bottom: 1px solid currentColor;
    }

    .content :global(a.wikilink-note:hover) {
        opacity: 0.85;
    }

    /* [[private note]] that isn't published — reads as plain text, not a broken link */
    .content :global(.wikilink-missing) {
        color: var(--text-muted, #888);
        border-bottom: 1px dotted var(--text-faint, #bbb);
        cursor: help;
    }

    /* hover-preview popover */
    .link-preview {
        position: fixed;
        z-index: 50;
        width: 420px;
        max-height: 60vh;
        overflow: auto;
        background: var(--surface-solid);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0.9rem 1rem;
        font-size: 0.9rem;
        line-height: 1.5;
        box-shadow: 0 8px 24px var(--shadow-strong);
        pointer-events: none;
    }

    .link-preview :global(h1),
    .link-preview :global(h2),
    .link-preview :global(h3) {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
    }

    .link-preview :global(p) {
        margin: 0 0 0.5rem 0;
    }

    .link-preview :global(a) {
        color: var(--link-color, #0066cc);
    }

    /* copy-link affordance on headings: hidden until you hover the heading */
    .content :global(.heading-anchor) {
        position: relative;
        margin-left: 0.35em;
        font-weight: normal;
        text-decoration: none;
        color: var(--text-faint);
        opacity: 0;
        transition: opacity 0.15s ease;
    }
    .content :global(:is(h1, h2, h3, h4, h5, h6):hover .heading-anchor) {
        opacity: 1;
    }
    .content :global(.heading-anchor:hover),
    .content :global(.heading-anchor:focus) {
        opacity: 1;
        color: var(--link-color, #0066cc);
    }
    .content :global(.heading-anchor.copied) {
        opacity: 1;
    }
    .content :global(.heading-anchor.copied::after) {
        content: "copied!";
        position: absolute;
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        margin-left: 6px;
        padding: 2px 6px;
        font-size: 0.7rem;
        font-weight: normal;
        white-space: nowrap;
        background: var(--surface-solid);
        color: var(--text);
        border-radius: 4px;
    }
    /* the copy-anchor is noise inside the hover-preview popover */
    .link-preview :global(.heading-anchor) {
        display: none;
    }

    /* compensate for the floating star-background offset when jumping to a heading */
    :global(html) {
        scroll-padding-top: 80px;
    }
</style>
