<script>
    import { onMount, tick } from "svelte";
    import Header from "$lib/Header.svelte";
    import StarBackground from "$lib/StarBackground.svelte";
    import Carousel from "$lib/Carousel.svelte";
    import ContactInfo from "$lib/ContactInfo.svelte";
    import durations from "$lib/assets/carouselDurations.json";

    let hoveredInterest = null;

    // carousel deep-linking: a link on the page whooshes toward the carousel,
    // which then spins to the target item
    let carouselRef;
    let carouselWrap;

    function vibeJump(event, slug) {
        event?.preventDefault();
        whoosh(event?.currentTarget, carouselWrap, () => carouselRef?.spinTo(slug));
    }

    function whoosh(sourceEl, targetEl, onArrive) {
        const reduce =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce || !sourceEl || !targetEl) {
            onArrive?.();
            return;
        }
        const s = sourceEl.getBoundingClientRect();
        const t = targetEl.getBoundingClientRect();
        const sx = s.left + s.width / 2;
        const sy = s.top + s.height / 2;
        const tx = t.left + t.width / 2;
        const ty = t.top + t.height / 2;
        const angle = (Math.atan2(ty - sy, tx - sx) * 180) / Math.PI;

        const dot = document.createElement("div");
        dot.className = "vibe-whoosh";
        document.body.appendChild(dot);
        const base = `translate(-50%, -50%) rotate(${angle}deg)`;
        const anim = dot.animate(
            [
                { transform: `translate(${sx}px, ${sy}px) ${base} scaleX(0.6)`, opacity: 0 },
                { opacity: 1, offset: 0.2 },
                {
                    transform: `translate(${(sx + tx) / 2}px, ${(sy + ty) / 2}px) ${base} scaleX(2.6)`,
                    opacity: 1,
                    offset: 0.55,
                },
                { transform: `translate(${tx}px, ${ty}px) ${base} scaleX(0.5)`, opacity: 0 },
            ],
            { duration: 440, easing: "cubic-bezier(0.5, 0, 0.2, 1)" }
        );
        let fired = false;
        const fire = () => {
            if (fired) return;
            fired = true;
            onArrive?.();
        };
        // kick the spin off slightly before the streak lands so they overlap
        setTimeout(fire, 260);
        anim.onfinish = () => {
            dot.remove();
            fire();
        };
    }

    function vibeFromHash() {
        const m = location.hash.match(/vibe=([\w-]+)/);
        if (m) carouselRef?.spinTo(m[1]);
    }
    function songFromHash() {
        const m = location.hash.match(/song=([\w-]+)/);
        if (m) musicSpinTo(m[1]);
    }
    function fromHash() {
        vibeFromHash();
        songFromHash();
    }

    onMount(() => {
        // deep link on load (give the carousel a beat to mount its slides)
        if (location.hash.includes("vibe=")) setTimeout(vibeFromHash, 650);
        if (location.hash.includes("song=")) setTimeout(songFromHash, 650);
        window.addEventListener("hashchange", fromHash);
        return () => window.removeEventListener("hashchange", fromHash);
    });

    const ASSETS = "https://assets.harrisonqian.com";
    const tracks = [
        { src: `${ASSETS}/audio/piano_recital/02_city of stars.m4a`, caption: "city of stars by Justin Hurwitz", slug: "city-of-stars" },
        { src: `${ASSETS}/audio/peace_and_love.m4a`, caption: "peace and love on the planet earth by Steven Universe", slug: "peace-and-love" },
        { src: `${ASSETS}/audio/dumb_derivatives/contemplation.m4a`, caption: "contemplation by me", slug: "contemplation" },
        { src: `${ASSETS}/audio/piano_recital/05_merry go round of life.m4a`, caption: "merry go round of life by Joe Hisaishi", slug: "merry-go-round" },
        { src: `${ASSETS}/audio/always.m4a`, caption: "always by Daniel Caesar", slug: "always" },
        { src: `${ASSETS}/audio/dumb_derivatives/the edge of chaos.m4a`, caption: "the edge of chaos by me", slug: "edge-of-chaos" },
    ];
    let trackIndex = 0;
    const prevTrack = () => { trackIndex = (trackIndex - 1 + tracks.length) % tracks.length; };
    const nextTrack = () => { trackIndex = (trackIndex + 1) % tracks.length; };
    $: currentTrack = tracks[trackIndex];

    // music "spin": flip through tracks toward a target with deceleration
    // (the audio player's analogue of the carousel turn)
    let musicWrap;        // whoosh lands here
    let musicAudioEl;     // re-bound each track via {#key}; played on landing
    let musicSpinning = false;
    let musicLanded = false;
    let musicSpinTimer = null;
    let musicLandTimer = null;

    function trackIndexForSlug(slug) {
        return tracks.findIndex((t) => t.slug === slug);
    }

    function pulseMusic() {
        musicLanded = true;
        clearTimeout(musicLandTimer);
        musicLandTimer = setTimeout(() => (musicLanded = false), 1100);
    }

    async function playLanded() {
        await tick();
        try { await musicAudioEl?.play(); } catch { /* autoplay may be blocked; track is selected regardless */ }
    }

    function musicSpinTo(slug) {
        const target = trackIndexForSlug(slug);
        if (target < 0) return;
        clearTimeout(musicSpinTimer);
        const reduce =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce || target === trackIndex) {
            trackIndex = target;
            musicSpinning = false;
            pulseMusic();
            playLanded();
            return;
        }
        // shortest direction around the ring
        const n = tracks.length;
        const fwd = (target - trackIndex + n) % n;
        const dir = fwd <= n - fwd ? 1 : -1;
        const count = dir === 1 ? fwd : n - fwd;
        musicSpinning = true;
        let i = 0;
        const step = () => {
            trackIndex = (trackIndex + dir + n) % n;
            i++;
            if (i >= count) {
                musicSpinning = false;
                pulseMusic();
                playLanded();
                return;
            }
            // intervals grow as we near the target -> decelerating inertia
            const t = i / count;
            musicSpinTimer = setTimeout(step, 70 + 240 * t * t);
        };
        musicSpinTimer = setTimeout(step, 70);
    }

    function musicJump(event, slug) {
        event?.preventDefault();
        whoosh(event?.currentTarget, musicWrap, () => musicSpinTo(slug));
    }

    // auto-import carousel media using Vite's import.meta.glob
    // keep both the original filename and the built asset url
    const modules = import.meta.glob("$lib/assets/carousel_media/*", { eager: true, query: '?url', import: 'default' });

    // sort by filename before creating the carousel items array
    const carouselItems = Object.entries(modules)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([path, src]) => ({
            name: path.split('/').pop(),
            src
        }));
</script>

<StarBackground>
    <Header />
    <div class="hero">
        <div class="hero-text">
            <p>hey there, im harrison (bay area)</p>
            
            <ul class="bio-list">
                <li>i <a href="/projects#math-speed-learning">learned four years of hs math</a> in 8th grade, then made <a href="/projects#ml-from-scratch">neural networks</a>, <a href="/projects#rl-snake">reinforcement learning</a> algs, <a href="/projects#databox">data logger gadget</a> from scratch & more stuff like <a href="/projects#piano-culmination">piano</a>, <a href="#song=peace-and-love" class="vibe-link" on:click={(e) => musicJump(e, 'peace-and-love')}>ukulele</a>, <a href="/projects#learn-chess">chess</a>, <a href="#vibe=neurotech" class="vibe-link" on:click={(e) => vibeJump(e, 'neurotech')}>neuro</a>, <a href="#vibe=frisbee" class="vibe-link" on:click={(e) => vibeJump(e, 'frisbee')}>frisbee</a>, <a href="#song=contemplation" class="vibe-link" on:click={(e) => musicJump(e, 'contemplation')}>music production</a>, <a href="/projects#pause">film making</a>, etc; generally very self taught</li>
                <li>last summer i helped engineer vestibular stimulation at <a href="https://orbit.engineering/" target="_blank" rel="noopener">orbit engineering</a>, a neurotech startup. i got someone from fully awake to nearly asleep in three minutes while talking to them in broad daylight! also was <a href="#vibe=vestibular" class="vibe-link" on:click={(e) => vibeJump(e, 'vestibular')}>measuring</a> <a href="https://en.wikipedia.org/wiki/Visual_evoked_potential" target="_blank" rel="noopener">VEP</a> with <a href="https://en.wikipedia.org/wiki/Electroencephalography" target="_blank" rel="noopener">EEG</a> and pupil dialition under <a href="https://en.wikipedia.org/wiki/Caloric_reflex_test" target="_blank" rel="noopener">CVS</a></li>
                <li>this year ive been <a href="/projects#discord-friends-graph">shipping apps</a> and training CNNs to read consciousness states from brain waves. i once spent 30 hours debugging a mug warmer in my ee phase :)</li>
                <li>i hate to talk about competitions because lowkey they are super fake but for the sake of sharing more about myself: this year my school placed 2nd in <a href="https://www.usaypt.org/" target="_blank" rel="noopener">USAYPT</a> (a national physics comp) and my team of 4 placed top 5 in the country out of 1091 teams in <a href="https://www.comap.com/contests/himcm-midmcm" target="_blank" rel="noopener">HiMCM</a> and then <a href="https://www.immchallenge.org/" target="_blank" rel="noopener">immc</a> nationals</li>
            </ul>
            <p>some of what ive built is in <a href="/projects">my projects page</a>. i like writing down my thoughts a lot, so i have posted some in a <a href="/writing">writing page</a> and a <a href="/poetry">poetry page</a></p>
            <p>(if you want a fast track to getting to know me more i have put some media that represents me well in a <a href="/vibes">vibes page</a>)</p>
            <ContactInfo let:toggle>
                <p>feel free to look around or <button class="say-hi-btn" on:click={toggle}>say hi</button>! i respond to everyone :)</p>
            </ContactInfo>

        </div>
        <div class="hero-side">
            <div class="hero-carousel" bind:this={carouselWrap}>
                <Carousel bind:this={carouselRef} items={carouselItems} intervalMs={3000} autoplay={true} durations={durations} />
            </div>
            <section class="music">
                <h2 class="music-heading">I LOVE MUSIC</h2>
                <div class="music-row" bind:this={musicWrap}>
                    <button class="music-arrow" on:click={prevTrack} aria-label="previous track">
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </button>
                    {#key trackIndex}
                        <figure class="music-card {musicLanded ? 'landed' : ''} {musicSpinning ? 'spinning' : ''}">
                            <audio bind:this={musicAudioEl} controls preload="metadata" src={currentTrack.src}></audio>
                            <figcaption>{currentTrack.caption}</figcaption>
                        </figure>
                    {/key}
                    <button class="music-arrow" on:click={nextTrack} aria-label="next track">
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </button>
                </div>
                <p class="music-indicator">{trackIndex + 1} / {tracks.length}</p>
            </section>
        </div>
    </div>

    <section class="friends-section">
        <h2 class="friends-heading">here are some of my friends on discord</h2>
        <p class="friends-tag">i like to be connected 😊</p>
        <div class="friends-frame">
            <iframe src="/discord-friends-graph-demo.html" title="my discord friends graph" loading="lazy"></iframe>
        </div>
        <p class="friends-caption">
            click a node, drag to pan, scroll to zoom
        </p>
    </section>

</StarBackground>

<style>
    /* a link that jumps the carousel — share the look of normal links but
       hint it's a vibe trigger with a tiny carousel-y underline color */
    .vibe-link {
        text-decoration: underline;
        text-decoration-color: rgba(var(--accent-yellow-rgb), 0.7);
        text-underline-offset: 2px;
        cursor: pointer;
    }

    /* the streak that flies from a vibe-link toward the carousel.
       lives on <body>, so it must be global */
    :global(.vibe-whoosh) {
        position: fixed;
        left: 0;
        top: 0;
        width: 46px;
        height: 7px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(var(--accent-yellow-rgb), 0) 0%, rgba(var(--accent-yellow-rgb), 0.95) 70%, #fff 100%);
        box-shadow: 0 0 14px 4px rgba(var(--accent-yellow-rgb), 0.55);
        pointer-events: none;
        z-index: 9999;
        will-change: transform, opacity;
    }

    .hero {
        width: 90%;
        max-width: 1100px;
        margin: 0 auto 2rem auto;
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.9fr);
        gap: 2rem;
        align-items: start;
    }

    .hero-text {
        min-width: 0;
    }

    .hero-text p {
        margin-bottom: 0.6rem;
    }

    .bio-list {
        margin: 0 0 0.6rem 0;
        padding-left: 0rem;
        list-style: disc;
    }

    .bio-list li {
        margin-bottom: 0.5rem;
        padding-left: 0.3rem;
    }

    .hero-side {
        min-width: 0;
    }

    .hero-carousel {
        width: 100%;
        aspect-ratio: 1 / 1;
    }

    .hero-carousel :global(img),
    .hero-carousel :global(video) {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 8px;
        outline: 1px solid var(--border);
        outline-offset: -1px;
    }

    .music {
        margin: 1.5rem 0 0 0;
    }

    .music-heading {
        font-size: 1.3rem;
        letter-spacing: 0.05em;
        margin: 0 0 0.75rem 0;
    }

    .music-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .music-arrow {
        width: 28px;
        height: 40px;
        display: grid;
        place-items: center;
        background: var(--surface-2);
        border: none;
        border-radius: 6px;
        color: var(--text);
        cursor: pointer;
        opacity: 0.7;
        flex-shrink: 0;
        padding: 0;
        transition: opacity 160ms ease, background 160ms ease;
    }

    .music-arrow:hover {
        opacity: 1;
        background: var(--surface-3);
    }

    .music-arrow:focus-visible {
        opacity: 1;
        outline: 2px solid var(--text);
        outline-offset: 2px;
    }

    .music-card {
        flex: 1;
        min-width: 0;
        margin: 0;
        position: relative;
        border-radius: 8px;
    }
    /* quick flip feel while spinning through tracks */
    .music-card.spinning {
        animation: music-flip 110ms ease;
    }
    @keyframes music-flip {
        from { opacity: 0.45; transform: translateY(-3px); }
        to { opacity: 1; transform: translateY(0); }
    }
    /* yellow pulse on the track we land on, matching the carousel */
    .music-card.landed::after {
        content: "";
        position: absolute;
        inset: -6px;
        border-radius: 10px;
        box-shadow: 0 0 0 2px rgba(var(--accent-yellow-rgb), 0.9);
        animation: landed-pulse 1.1s ease-out forwards;
        pointer-events: none;
    }
    @keyframes landed-pulse {
        0% { opacity: 0; }
        18% { opacity: 1; }
        100% { opacity: 0; }
    }

    .music-card audio {
        width: 100%;
        display: block;
    }

    .music-card figcaption {
        margin-top: 0.4rem;
        font-size: 0.8rem;
        color: var(--text-muted);
        text-align: center;
    }

    .music-indicator {
        margin: 0.4rem 0 0 0;
        font-size: 0.8rem;
        color: var(--text-faint);
        text-align: center;
    }

    .friends-section {
        width: 90%;
        max-width: 1100px;
        margin: 3rem auto 4rem auto;
    }

    .friends-heading {
        font-size: 1.3rem;
        color: var(--text);
        margin: 0 0 0.35rem 0;
        font-weight: 600;
    }

    .friends-tag {
        color: var(--text-muted);
        margin: 0 0 1rem 0;
    }

    .friends-frame {
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid var(--border);
        background: var(--surface-solid);
        height: 500px;
    }

    .friends-frame iframe {
        width: 100%;
        height: 100%;
        display: block;
        border: 0;
    }

    .friends-caption {
        margin-top: 0.75rem;
        font-size: 0.85rem;
        color: var(--text-faint);
        text-align: center;
    }

    .friends-caption a {
        color: var(--text-muted);
    }

    @media (max-width: 768px) {
        .hero {
            grid-template-columns: 1fr;
            gap: 1.5rem;
        }
        .hero-side {
            order: -1;
        }
        .hero-carousel {
            aspect-ratio: 4 / 3;
        }
        .friends-frame {
            height: 380px;
        }
    }
</style>
