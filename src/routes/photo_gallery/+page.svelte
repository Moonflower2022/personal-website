<script>
    import Gallery from "$lib/Gallery.svelte"

    const imageFiles = import.meta.glob('/static/collage_images/*.jpeg', { eager: true });
    const numberOfImages = Object.keys(imageFiles).length;
    
    // Get array of image paths
    const imagePaths = Object.keys(imageFiles).map(path => path.replace('/static', ''));
</script>

<main>
    <h1><a href="/">Moonflower</a></h1>
    <Gallery 
  images={imagePaths} 
  gap={10} 
  maxColumnWidth={250} 
  hover={true} 
/>
</main>

<style>
    h1 {
      text-align: center;
    }
</style>