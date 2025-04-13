<script>
    import ImageGallery from "$lib/ImageGallery.svelte"

    let n = 12
    let images = []

    for (let i = 1; i <= n; i++) {
        images.push(`collage_images/${i}.jpeg`)
    }
</script>

<main>
    <h1><a href="/">Moonflower</a></h1>
    <ImageGallery backgroundColor="#000" {images} />
</main>