<script>
    import Header from "$lib/Header.svelte"
    import StarBackground from "$lib/StarBackground.svelte"
</script>

<StarBackground>

<Header />
<main>
    <div class="column">
        <section class="section">
            <h2>app reviews</h2>
            <p>this is a list of some apps that I use or have used, and my thhoughts on them </p>
        </section>
        <h3><a href="https://code.visualstudio.com/" target="_blank">vscode</a> 🤩</h3>
        <p>might not be as techy as neovim or emacs but still a phenomenal ide that is exceptionally intuitive and thorough </p>
        <h3><a href="https://arc.net" target="_blank">arc</a> 🥵</h3>
        <p>still new but already has tons of great features like easy split screen manipulation, in-depth customization, integration with websites like gmail and google calendar, spaces, and arc max</p>
    </div>
</main>
</StarBackground>

<style>
    .column {
        justify-content: space-between;
        margin: auto;
        width: 60%;
    }
</style>
