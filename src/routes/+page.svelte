<script>
    import ImageGallery from "$lib/ImageGallery.svelte"
    import info from "$lib/info.json"

    let n = 12;
    let images = [];

    for (let i = 1; i <= n; i++) {
        images.push(`collage_images/${i}.jpeg`);
    }

    let email = info.email
    let interests = info.interests
</script>

<main>
    <h1>Moonflower2022</h1>
    <section class="section">
        <h2>Contact Information</h2>
        <p>Email: <a href="mailto:{email}">{email}</a></p>
    </section>

    <section class="section">
        <h2>About</h2>
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
    @import url('https://fonts.googleapis.com/css2?family=Font+Name:wght@400;700&display=swap');

    main {
        font-family: 'Space Mono', monospace;
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem;
        color: #333;
    }

    h1 {
        text-align: center;
        font-size: 2rem;
        margin-bottom: 1.5rem;
    }

    .section {
        margin-bottom: 1.5rem;
    }
</style>
