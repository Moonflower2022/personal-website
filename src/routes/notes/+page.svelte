<script>
    import { onMount } from 'svelte';
    import Header from "$lib/Header.svelte";
    import StarBackground from "$lib/StarBackground.svelte";
    import ContactInfo from "$lib/ContactInfo.svelte";
    import websiteNotesData from '$lib/websiteNotes.json';
    import { essayNotePieces } from "$lib/writingPieces.js";

    // parse "YYYY-MM-DD" as a LOCAL date (plain new Date() treats it as UTC → off-by-one in PST).
    // matches the /writing index so the same piece shows the same date in both places.
    function fmtDate(value) {
        if (!value) return '';
        const parts = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        const d = parts ? new Date(+parts[1], +parts[2] - 1, +parts[3]) : new Date(value);
        return d.toLocaleDateString();
    }

    // ideaflow-sourced notes (rendered at /notes/<slug>)
    const ideaflowNotes = (websiteNotesData?.notes || []).map((note) => ({
        title: note.title,
        href: `/notes/${note.slug}`,
        date: note.date,
        edited: note.edited,
        star: false,
        subtitle: null,
        filteredTags: Array.isArray(note.tags) ? note.tags.filter((t) => t && t.trim()) : [],
        sortKey: note.createdAt || note.date || 0
    }));

    // start with just the ideaflow notes; essay-notes are merged in after their frontmatter loads
    let notes = [...ideaflowNotes].sort((a, b) => new Date(b.sortKey) - new Date(a.sortKey));

    // essays reclassified as notes still live at /writing/<slug> (rich renderer). pull their
    // frontmatter for the listing and merge them in, linking to their /writing page.
    onMount(async () => {
        const essayNotes = await Promise.all(essayNotePieces.map(async (piece) => {
            try {
                const res = await fetch(`/writing/${piece.slug}.md`);
                const text = await res.text();
                const meta = {};
                const fm = text.match(/^---\n([\s\S]*?)\n---/);
                if (fm) {
                    for (const line of fm[1].split('\n')) {
                        const trimmed = line.trim();
                        const idx = trimmed.indexOf(':');
                        if (idx === -1) continue;
                        const key = trimmed.slice(0, idx).trim();
                        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
                        if (['title', 'subtitle', 'date', 'edited'].includes(key)) meta[key] = val;
                    }
                }
                return {
                    title: meta.title || piece.slug.replace(/_/g, ' '),
                    href: `/writing/${piece.slug}`,
                    date: meta.date,
                    edited: meta.edited,
                    star: !!piece.star,
                    subtitle: meta.subtitle || null,
                    filteredTags: [],
                    sortKey: meta.date || 0
                };
            } catch (error) {
                return null;
            }
        }));
        notes = [...ideaflowNotes, ...essayNotes.filter(Boolean)]
            .sort((a, b) => new Date(b.sortKey) - new Date(a.sortKey));
    });
</script>

<StarBackground>
    <Header />
    <main>
        <div class="column">
            <section class="section">
                <h2>notes</h2>
                <p>quick thoughts, observations, and references</p>
                <ContactInfo let:toggle>
                    <p>if any of this resonates with you, <button class="say-hi-btn" on:click={toggle}>lmk</button>!</p>
                </ContactInfo>
                <hr class="horizontal-line">
            </section>
        {#if notes.length === 0}
            <p>no publishable notes yet</p>
        {:else}
            {#each notes as note}
                <article>
                    <div class="title-row">
                        <h3><a href={note.href}>{note.title}</a>{#if note.star}<span class="effort-star" title="high effort post">★</span>{/if}</h3>
                    </div>
                    <div class="meta-row">
                        {#if note.subtitle}
                            <span class="subtitle">{note.subtitle}</span>
                        {:else if note.filteredTags && note.filteredTags.length > 0}
                            <div class="tags">
                                {#each note.filteredTags as tag}
                                    <span class="tag">{tag}</span>
                                {/each}
                            </div>
                        {/if}
                        <time class="date">
                            {fmtDate(note.date)}
                            {#if note.edited}
                                <span class="edited">(edited {fmtDate(note.edited)})</span>
                            {/if}
                        </time>
                    </div>
                </article>
            {/each}
        {/if}
        </div>
    </main>
</StarBackground>


<style>
    article {
        margin-bottom: 2rem;
    }

    .meta-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .meta-row .date {
        margin-left: auto;
    }

    .subtitle {
        color: var(--text-muted);
        font-size: 0.9rem;
    }

    .title-row {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 0.5rem;
    }

    .title-row h3 {
        margin: 0;
        flex: 1;
    }

    .title-row h3 a {
        color: inherit;
        text-decoration: none;
        transition: all 0.5s ease;
    }

    .title-row h3 a:hover {
        color: var(--link-color, #0066cc);
        text-decoration: underline;
    }

    /* high-effort badge */
    .effort-star {
        color: var(--accent-yellow, #f5a623);
        font-size: 0.85em;
        margin-left: 0.4rem;
        vertical-align: 0.05em;
    }
</style>
