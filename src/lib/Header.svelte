<script>
    import iconInfos from "$lib/iconInfos.json"
    import SocialIcons from "$lib/SocialIcons.svelte"
    import { page } from "$app/stores"

    // linkedin icon commented out for now (json can't hold comments, so filter it here)
    const shownIcons = iconInfos.filter((icon) => icon.description !== "linkedin link")

    const navLinks = [
        { href: "/", label: "home" },
        { href: "/writing", label: "writing" },
        { href: "/poetry", label: "poetry" },
        { href: "/vibes", label: "vibes" },
        { href: "/projects", label: "projects" },
        { href: "/other", label: "other" },
    ]

    // active on the section page itself or any nested route under it; home matches only exactly
    $: pathname = $page.url.pathname
    const isActive = (href, path) =>
        href === "/" ? path === "/" : path === href || path.startsWith(href + "/")
</script>

<header>
    <SocialIcons iconInfos={shownIcons} size="fa-2x"></SocialIcons>
    <nav>
        <ul class="nav-links">
            {#each navLinks as { href, label }}
                <a {href} class:active={isActive(href, pathname)}>{label}</a>
            {/each}
            <!-- <a href="/app_reviews">app reviews</a>  -->
            <!-- <a href="resume.pdf" target="_blank" rel="noopener noreferrer">outdated resume</a> -->
        </ul>
    </nav>
    <hr class="horizontal-line" />
</header>

<style>
    header {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-top: 1.5rem;
    }

    ul {
        padding: 0;
    }

    .nav-links {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 2rem;
        list-style: none;
        margin: 0;
        padding: 0 3rem 0;
        transition: gap 0.2s;
    }

    .nav-links a {
        transition: opacity 0.2s;
        font-size: 1.1rem;
    }

    .nav-links a:hover {
        opacity: 0.7;
    }

    a.active {
        font-weight: 700;
    }

    @media (max-width: 768px) {
        .nav-links {
            gap: 0.5rem;
        }

        .nav-links a {
            font-size: 1rem;
        }
    }
</style>
