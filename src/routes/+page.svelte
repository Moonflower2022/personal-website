<script>
    import ImageGallery from "$lib/ImageGallery.svelte"
    import info from "$lib/info.json"

    let n = 12
    let images = []

    for (let i = 1; i <= n; i++) {
        images.push(`collage_images/${i}.jpeg`)
    }

    let email = info.email
    let interests = info.interests
</script>

<svelte:head>
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
    />
</svelte:head>

<main>
    <h1>Moonflower</h1>
    <section class="section">
        <h2>socials</h2>
        <a class="fa fa-envelope fa-2x icon-3d" href="mailto:dumbderivatives@gmail.com" role="button" aria-label="email link"></a>
        <a class="fa fa-youtube fa-2x icon-3d" href="https://www.youtube.com/@DumbDerivatives" role="button" aria-label="youtube link"></a>
        <a class="fa fa-github fa-2x icon-3d" href="https://github.com/Moonflower2022" role="button" aria-label="github link"></a>
        <a class="fa fa-spotify fa-2x icon-3d" href="https://open.spotify.com/user/31u2cwuyeyr56ntpdz4kdbnewhqe" role="button" aria-label="spotify link"></a>
    </section>

    <section class="section">
        <h2>about</h2>
        <p>I am a student that loves</p>
        <ul>
            {#each interests as interest}
                <li>{interest}</li>
            {/each}
        </ul>
    </section>
    <ImageGallery {images} />
</main>

<style>
    @import url("https://fonts.googleapis.com/css2?family=Font+Name:wght@400;700&display=swap");

    /* Global styles for dark theme */
    :global(body) {
        background-color: #000;
        color: #fff;
        margin: 0;
        padding: 0;
    }

    :global(a) {
        color: #4da6ff;
    }

    /* Your modified styles */
    main {
        font-family: "Space Mono", monospace;
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem;
        color: #fff;
    }

    h1 {
        text-align: center;
    }

    .section {
        margin-bottom: 1.5rem;
    }

    .icon-3d {
        padding: 10px;
        animation: icon3d 200ms 10;
        color: #fff;
    }

    .icon-3d:hover {
        animation: icon3d 200ms infinite;
    }

    @keyframes icon3d {
        0% {
            text-shadow:
                5px 4px rgba(244, 67, 54, 1),
                -5px -6px rgba(33, 150, 243, 1);
        }
        25% {
            text-shadow:
                -5px -6px rgba(244, 67, 54, 1),
                5px 4px rgba(33, 150, 243, 1);
        }
        50% {
            text-shadow:
                5px -4px rgba(244, 67, 54, 1),
                -8px 4px rgba(33, 150, 243, 1);
        }
        75% {
            text-shadow:
                -8px -4px rgba(244, 67, 54, 1),
                -5px -4px rgba(33, 150, 243, 1);
        }
        100% {
            text-shadow:
                -5px 0 rgba(244, 67, 54, 1),
                5px -4px rgba(33, 150, 243, 1);
        }
    }
</style>
