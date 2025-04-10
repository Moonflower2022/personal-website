<script>
    import ImageGallery from "$lib/ImageGallery.svelte"
    import info from "$lib/info.json"
    import icons from "$lib/icons.json"

    let n = 12
    let images = []

    for (let i = 1; i <= n; i++) {
        images.push(`collage_images/${i}.jpeg`)
    }

    let email = info.email
    let interests = info.interests
</script>

<svelte:head>
    <!-- import two different versions of font awesome so all the icons work -->
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
    />
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
    />
    <!-- Space Mono from google fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
        href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<main>
    <h1>Moonflower</h1>
    <section class="section">
        <h2>socials</h2>
        {#each icons as icon}
            <a href={icon.href} target="_blank" aria-label={icon.description}>
                <i
                    class="fa {icon.font_awesome_tag} fa-2x icon-3d"
                    role="presentation"
                ></i>
            </a>
        {/each}
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
    <h2><a href="./resume.pdf">resume</a></h2>
    <ImageGallery {images} />
</main>

<style>
    @import url("https://fonts.googleapis.com/css2?family=Font+Name:wght@400;700&display=swap");

    /* Global styles (dark theme) */
    :global(body) {
        background-color: #000;
        color: #fff;
        margin: 0;
        padding: 0;
    }

    :global(a) {
        color: #4da6ff;
    }

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

    ul {
        margin-top: 0px;
        padding-left: 25px;
    }

    p ~ ul {
        margin-top: -10px;
    }

    .section {
        margin-bottom: 1.5rem;
    }

    /* RED BLUE ICON STUFF (credit: https://codepen.io/miguelcast/pen/pwZMOJ)  */

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
