<script>
    import info from "$lib/info.json"
    import iconInfos from "$lib/iconInfos.json"
    import SocialIcons from "$lib/SocialIcons.svelte"

    let email = info.email
    let interests = info.interests
</script>

<main>
    <h1><a href="/">Moonflower</a></h1>
    <section class="section">
        <h2>socials</h2>
        <SocialIcons iconInfos={iconInfos}></SocialIcons>
    </section>

    <section class="section">
        <h2>about</h2>
        <p>I am a student that loves</p>
        <ul>
            {#each interests as interest}
                <li>{interest}</li>
            {/each}
        </ul>
    </section>
    <h2><a href="resume.pdf" target="_blank">resume</a></h2>
    <h2><a href="/photo_gallery">photos</a></h2>
</main>

<style>
</style>
