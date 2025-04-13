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
    /* Your shared styles */
    @import url("https://fonts.googleapis.com/css2?family=Font+Name:wght@400;700&display=swap");
  
    /* Global styles (dark theme) */
    :global(body) {
      background-color: #000;
      color: #fff;
      margin: 0;
      padding: 0;
    }
  
    :global(a) {
      color: #4da6ff;
    }
  
    :global(main) {
      font-family: "Space Mono", monospace;
      max-width: 600px;
      margin: 0 auto;
      color: #fff;
    }
  
    :global(h1) {
      text-align: center;
    }
  
    :global(ul) {
      margin-top: 0px;
      padding-left: 25px;
    }
  
    :global(p ~ ul) {
      margin-top: -10px;
    }
  
    :global(.section) {
      margin-bottom: 1.5rem;
    }
  </style>