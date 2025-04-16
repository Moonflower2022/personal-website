<script>
    // ##########################
    // CREDIT: Claude 3.7, ChatGPT, and https://github.com/BerkinAKKAYA/svelte-image-gallery
    // ##########################
    import { onMount, createEventDispatcher } from "svelte"

    /**
     * @type {string[]} - Array of image paths
     */
    export let images = []

    /**
     * @type {number}
     */
    export let gap = 10

    /**
     * @type {number}
     */
    export let maxColumnWidth = 250

    /**
     * @type {boolean}
     */
    export let hover = false

    /**
     * @type {'eager' | 'lazy'}
     */
    export let loading = "lazy"

    const dispatch = createEventDispatcher()

    /**
     * @type {number}
     */
    let galleryWidth = 0

    /**
     * @type {number}
     */
    let columnCount = 0

    /**
     * @type {string[][]}
     */
    let columns = []

    let clickedImages = new Set()

    function handleClick(path) {
        if (clickedImages.has(path)) {
            clickedImages.delete(path)
        } else {
            clickedImages.add(path)
        }
        clickedImages = new Set(clickedImages)
        dispatch("click", { path })
    }

    // Calculate column count based on gallery width and max column width
    $: columnCount = Math.max(1, Math.floor(galleryWidth / maxColumnWidth))

    // Re-organize images when column count changes or images array changes
    $: if (columnCount && images.length) {
        organizeImagesIntoColumns()
    }

    $: galleryStyle = `grid-template-columns: repeat(${columnCount}, 1fr); --gap: ${gap}px`

    onMount(() => {
        if (images.length) {
            organizeImagesIntoColumns()
        }
    })

    function organizeImagesIntoColumns() {
        columns = []

        // Initialize the column arrays
        for (let i = 0; i < columnCount; i++) {
            columns[i] = []
        }

        // Fill the columns with image paths
        for (let i = 0; i < images.length; i++) {
            const idx = i % columnCount
            columns[idx].push(images[i])
        }
    }
</script>

<div id="gallery" bind:clientWidth={galleryWidth} style={galleryStyle}>
    {#each columns as column, columnIndex}
        <div class="column">
            {#each column as imagePath}
                <button
                    on:click={() => handleClick(imagePath)}
                    class="image-wrapper-button"
                    aria-label="enlarge image"
                >
                    <img
                        src={imagePath}
                        alt=""
                        class={`${hover ? "img-hover" : ""} ${clickedImages.has(imagePath) ? "clicked" : ""} 
                                ${clickedImages.has(imagePath) && columnIndex === 0 ? "right-shift" : ""}
                                ${clickedImages.has(imagePath) && columnIndex === columnCount - 1 ? "left-shift" : ""}`}
                        {loading}
                    />
                </button>
            {/each}
        </div>
    {/each}
</div>

<style>
    #gallery {
        width: calc(100% - 2 * var(--gap));
        display: grid;
        gap: var(--gap);
        margin: 0 var(--gap) 0;
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
        transition: all 0.5s;
    }
    .img-hover:hover {
        opacity: 1;
        transform: scale(1.05);
    }

    .clicked.img-hover:hover {
        transform: scale(2);
    }

    .clicked.right-shift.img-hover:hover {
        transform: scale(2) translateX(25%);
    }

    .clicked.left-shift.img-hover:hover {
        transform: scale(2) translateX(-25%);
    }

    /* i love monkey patching */
    .image-wrapper-button:has(.clicked.img-hover:hover) {
        z-index: 1000;
    }

    .image-wrapper-button {
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        font: inherit;
        color: inherit;
        cursor: pointer;
        display: inline-block;
        line-height: 0; /* Removes extra space under image */
        outline: none; /* Remove focus outline - add custom focus style for accessibility */
    }
</style>
