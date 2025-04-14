<script>
    // Any layout logic
</script>

<slot />

<svelte:head>
    <!-- import two different versions of font awesome so all the icons work -->
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
    />
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
    />
    <!-- Space Mono from google fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
        href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<style>
    /* Global styles (dark theme) */
    :global(body, html) {
        background-color: #000;
        color: #fff;
        margin: 0;
        padding: 0;
        font-family: "Space Mono", monospace;
    }

    :global(a) {
        color: #4da6ff;
    }

    :global(h1) {
        text-align: left;
    }
</style>
