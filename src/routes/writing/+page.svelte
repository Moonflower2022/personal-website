<script>
    import { onMount } from 'svelte';
    import { parseISO } from 'date-fns';
    import Header from "$lib/Header.svelte";
    import StarBackground from "$lib/StarBackground.svelte";
    import ContactInfo from "$lib/ContactInfo.svelte";
    import { writingIndexPieces } from "$lib/writingPieces.js";

    // essays shown on this index live in $lib/writingPieces.js (note-category ones are shown on /notes instead)
    const pieceFilenames = writingIndexPieces;

    let writing = [];

    onMount(async () => {
        try {
            // Fetch and parse each piece's metadata
            const writingPromises = pieceFilenames.map(async (piece) => {
                const filename = piece.slug;
                const writingResponse = await fetch(`/writing/${filename}.md`);
                const content = await writingResponse.text();

                // Parse frontmatter
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (frontmatterMatch) {
                    const frontmatter = frontmatterMatch[1];
                    const metadata = {};

                        // Parse YAML-like frontmatter with hyphen-based tags
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
                            } else if (currentKey === 'url') {
                                metadata.url = value;
                            } else if (currentKey === 'published') {
                                metadata.published = value === 'true';
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
                    const titleFromFilename = filename.replace(/\.md$/, '').replace(/_/g, ' ');
                    return {
                        filename,
                        star: piece.star,
                        title: metadata.title || titleFromFilename,
                        ...metadata
                    };
                }
                return null;
            });

            const allWriting = await Promise.all(writingPromises);
            writing = allWriting
                .filter(writing => writing && writing.published)
                .sort((a, b) => parseISO(b.date) - parseISO(a.date));

        } catch (error) {
            console.error('Error loading writing:', error);
        }
    });
</script>

<StarBackground>
    <Header />
    <main>
        <div class="column">
            <section class="section">
                <h2>writing</h2>
                <ContactInfo let:toggle>
                    <p>if any of this resonates with you, <button class="say-hi-btn" on:click={toggle}>lmk</button>!</p>
                </ContactInfo>
                <hr class="horizontal-line">
            </section>
        {#each writing as piece}
            <article>
                <div class="title-row">
                    <h3>
                        <a
                            href={piece.url || `/writing/${piece.filename}`}
                            target={piece.url ? '_blank' : undefined}
                            rel={piece.url ? 'noopener noreferrer' : undefined}
                        >
                            {piece.title}
                        </a>
                        {#if piece.star}<span class="effort-star" title="high effort post">★</span>{/if}
                    </h3>
                </div>
                <div class="meta-row">
                    {#if piece.subtitle}
                        <span class="subtitle">{piece.subtitle}</span>
                    {/if}
                    <time class="date">
                        {(() => {
                            const [year, month, day] = piece.date.split('-').map(Number);
                            return new Date(year, month - 1, day).toLocaleDateString();
                        })()}
                        {#if piece.edited}
                            <span class="edited">(edited {(() => {
                                const [year, month, day] = piece.edited.split('-').map(Number);
                                return new Date(year, month - 1, day).toLocaleDateString();
                            })()})</span>
                        {/if}
                    </time>
                </div>
            </article>
        {/each}
        </div>
    </main>
</StarBackground>


<style>
    article {
        margin-bottom: 2rem;
    }
    
    .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
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
