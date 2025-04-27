<script>
    import Gallery from "$lib/Gallery.svelte"
    import Header from "$lib/Header.svelte"
    import StarBackground from "$lib/StarBackground.svelte"

    const numImages = 17
    const imagePaths = []

    for (let i = 1; i <= numImages; i++) {
        imagePaths.push(`animal_images/${i}.jpeg`)
    }

    const numGifs = 14
    const gifPaths = []

    for (let i = 1; i <= numGifs; i++) {
        gifPaths.push(`animal_gifs/${i}.gif`)
    }

    const mediaPaths = imagePaths.concat(gifPaths).sort(() => Math.random() - 0.5)
</script>

<StarBackground>

<Header />
<main>
    <h1>animal media</h1>
    <Gallery images={mediaPaths} gap={10} maxColumnWidth={250} hover={true} />
</main>
</StarBackground>


<style>
    h1 {
        text-align: center;
    }
</style>
