<script>
    import Gallery from "$lib/Gallery.svelte"
    import Header from "$lib/Header.svelte"
    import StarBackground from "$lib/StarBackground.svelte"

    let n = 19
    let imagePaths = []

    for (let i = 1; i <= n; i++) {
        imagePaths.push(`collage_images/${i}.jpeg`)
    }
</script>

<StarBackground>

<Header />
<main>
    <Gallery images={imagePaths} gap={10} maxColumnWidth={250} hover={true} />
</main>
</StarBackground>


<style>
</style>
