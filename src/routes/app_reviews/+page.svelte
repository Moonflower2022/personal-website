<script>
    import Header from "$lib/Header.svelte"
    import StarBackground from "$lib/StarBackground.svelte"
    import appReviews from "$lib/appReviews.json"
</script>

<StarBackground>

<Header />
<main>
    <div class="column">
        <section class="section">
            <h2>app reviews</h2>
            <p>this is a list of some apps that I use or have used, and my thhoughts on them </p>
        </section>
        {#each appReviews as appReview}
            <h3><a href="{appReview.link}" target="_blank">{appReview.text}</a> {appReview.outsideLink}</h3>
            <p>{appReview.review}</p>
        {/each}
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
