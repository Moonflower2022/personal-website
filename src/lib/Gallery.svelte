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
    let zIndexTimeouts = {}
    let buttonRefs = {} // Store references to buttons

    function handleClick(path, event) {
        const button = event.currentTarget;
        buttonRefs[path] = button; // Store reference to the button
        
        // Always clear any existing timeout for this image
        if (zIndexTimeouts[path]) {
            clearTimeout(zIndexTimeouts[path]);
            zIndexTimeouts[path] = null;
        }
        
        if (clickedImages.has(path)) {
            // Image is being unclicked
            clickedImages.delete(path)
            
            // Set timeout to remove z-index after 0.5s
            zIndexTimeouts[path] = setTimeout(() => {
                // Check if button reference still exists
                if (buttonRefs[path]) {
                    buttonRefs[path].style.zIndex = '';
                }
                zIndexTimeouts[path] = null;
            }, 500);
        } else {
            // Image is being clicked
            clickedImages.add(path)
            
            // Apply high z-index immediately
            button.style.zIndex = '1000';
        }
        
        clickedImages = new Set(clickedImages)
        dispatch("click", { path })
    }

    function handleMouseEnter(path, event) {
        const button = event.currentTarget
        if (clickedImages.has(path)) {

            button.style.zIndex = '1000';
        }

        if (zIndexTimeouts[path]) {
            clearTimeout(zIndexTimeouts[path]);
            zIndexTimeouts[path] = null;
        }

    }

    function handleMouseLeave(path, event) {
        const button = event.currentTarget
        zIndexTimeouts[path] = setTimeout(() => {
  // your code here
  button.style.zIndex = '';
}, 500);
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

        // Clean up any remaining timeouts on component destroy
        return () => {
            Object.values(zIndexTimeouts).forEach(timeout => {
                if (timeout) clearTimeout(timeout);
            });
        };
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
                    on:click={(event) => handleClick(imagePath, event)}
                    on:mouseenter={(event) => handleMouseEnter(imagePath, event)}
                    on:mouseleave={(event) => handleMouseLeave(imagePath, event)}
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
        position: relative; /* Needed for z-index to work properly */
    }
</style>