<script>
    // ##########################
    // CREDIT: Claude 3.7 and https://github.com/BerkinAKKAYA/svelte-image-gallery
    // ##########################
    import { onMount, createEventDispatcher } from "svelte";

    /**
     * @type {string[]} - Array of image paths
     */
    export let images = [];

    /**
     * @type {number}
     */
    export let gap = 10;

    /**
     * @type {number}
     */
    export let maxColumnWidth = 250;

    /**
     * @type {boolean}
     */
    export let hover = false;

    /**
     * @type {'eager' | 'lazy'}
     */
    export let loading = 'lazy';

    const dispatch = createEventDispatcher();

    /**
     * @type {number}
     */
    let galleryWidth = 0;

    /**
     * @type {number}
     */
    let columnCount = 0;

    /**
     * @type {string[][]}
     */
    let columns = [];

    // Calculate column count based on gallery width and max column width
    $: columnCount = Math.max(1, Math.floor(galleryWidth / maxColumnWidth));
    
    // Re-organize images when column count changes or images array changes
    $: if (columnCount && images.length) {
        organizeImagesIntoColumns();
    }
    
    $: galleryStyle = `grid-template-columns: repeat(${columnCount}, 1fr); --gap: ${gap}px`;

    onMount(() => {
        if (images.length) {
            organizeImagesIntoColumns();
        }
    });

    function organizeImagesIntoColumns() {
        columns = [];

        // Initialize the column arrays
        for (let i = 0; i < columnCount; i++) {
            columns[i] = [];
        }

        // Fill the columns with image paths
        for (let i = 0; i < images.length; i++) {
            const idx = i % columnCount;
            columns[idx].push(images[i]);
        }
    }
    
    function handleClick(path) {
        dispatch("click", { path });
    }
</script>

<div id="gallery" bind:clientWidth={galleryWidth} style={galleryStyle}>
    {#each columns as column}
        <div class="column">
            {#each column as imagePath}
                <img
                    src={imagePath}
                    alt=""
                    on:click={() => handleClick(imagePath)}
                    on:keydown={() => handleClick(imagePath)}
                    class={hover ? "img-hover" : ""}
                    loading={loading}
                />
            {/each}
        </div>
    {/each}
</div>

<style>
    #gallery {
        width: 100%;
        display: grid;
        gap: var(--gap);
    }
    #gallery .column {
        display: flex;
        flex-direction: column;
    }
    #gallery .column * {
        width: 100%;
        margin-top: var(--gap);
    }
    #gallery .column *:nth-child(1) {
        margin-top: 0;
    }
    .img-hover {
        opacity: 0.9;
        transition: all 0.2s;
    }
    .img-hover:hover {
        opacity: 1;
        transform: scale(1.05);
    }
</style>