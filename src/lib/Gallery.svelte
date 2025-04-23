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
    export let loading = "eager"

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

    /**
     * @type {Set<string>}
     */
    let clickedImages = new Set()

    function handleClick(path, event) {
        // Toggle clicked state without recreating the entire Set
        if (clickedImages.has(path)) {
            clickedImages.delete(path);
        } else {
            clickedImages.add(path);
        }
        clickedImages = clickedImages;
        
        // Dispatch event with path
        dispatch("click", { path });
    }

    function handleMouseLeave(path, event) {
        if (clickedImages.has(path)) {
            clickedImages.delete(path)
        }
        clickedImages = clickedImages;
    }

    // Calculate column count based on gallery width and max column width
    $: columnCount = Math.max(1, Math.floor(galleryWidth / maxColumnWidth));

    // Only reorganize columns when necessary
    $: if (columnCount > 0 && images.length > 0) {
        // Create new columns only when count changes
        columns = Array.from({ length: columnCount }, () => []);
        
        // Fill columns with even distribution
        images.forEach((img, i) => {
            const columnIndex = i % columnCount;
            columns[columnIndex].push(img);
        });
    }

    $: galleryStyle = `grid-template-columns: repeat(${columnCount}, 1fr); --gap: ${gap}px`;
</script>

<div id="gallery" bind:clientWidth={galleryWidth} style={galleryStyle}>
    {#each columns as column, columnIndex}
        <div class="column">
            {#each column as imagePath}
                <button
                    on:click={(event) => { if (columnCount !== 1) handleClick(imagePath, event)}}
                    on:mouseleave={(event) => handleMouseLeave(imagePath, event)}
                    class="photo-wrapper-button"
                    aria-label="enlarge image"
                    class:active={clickedImages.has(imagePath)}
                    data-column-position={columnIndex === 0 ? "first" : columnIndex === columnCount - 1 ? "last" : "middle"}
                >
                    <img
                        src={imagePath}
                        alt=""
                        class:img-hover={hover}
                        class:clicked={clickedImages.has(imagePath)}
                        class:right-shift={clickedImages.has(imagePath) && columnIndex === 0}
                        class:left-shift={clickedImages.has(imagePath) && columnIndex === columnCount - 1}
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
    
    .blank-wrapper-button.active {
        z-index: 1000;
        transition: z-index 0s 0s; /* Apply z-index immediately when active */
    }
    
    /* Image hover effects */
    .img-hover {
        opacity: 0.9;
        transition: all 0.5s;
        will-change: transform, opacity; /* Hint browser for optimization */
    }
    
    .img-hover:hover {
        opacity: 1;
        transform: scale(1.05);
    }
    
    /* Clicked state animations - hardware accelerated */
    .clicked.img-hover:hover {
        transform: scale(2);
    }
    
    .clicked.right-shift.img-hover:hover {
        transform: scale(2) translateX(25%);
    }
    
    .clicked.left-shift.img-hover:hover {
        transform: scale(2) translateX(-25%);
    }
</style>