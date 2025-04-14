<script>
    import Gallery from "$lib/Gallery.svelte"
    import Header from "$lib/Header.svelte"
    import { onMount } from "svelte";
    let imagePaths;

    onMount(async () => {
      const imageFiles = import.meta.glob('$lib/collage_images/*.jpeg', { eager: true });
       imagePaths = Object.keys(imageFiles)
    });


    
</script>

<Header/>
<main>
    <Gallery 
  images={imagePaths} 
  gap={10} 
  maxColumnWidth={250} 
  hover={true} 
/>
</main>

<style>
</style>