<script>
    import ImageGallery from "$lib/ImageGallery.svelte"

    const imageFiles = import.meta.glob('/static/collage_images/*.jpeg', { eager: true });
    const numberOfImages = Object.keys(imageFiles).length;
    
    // Get array of image paths
    const imagePaths = Object.keys(imageFiles).map(path => path.replace('/static', ''));
</script>

<main>
    <h1><a href="/">Moonflower</a></h1>
    <ImageGallery backgroundColor="#000" images={imagePaths} />
</main>