<script>
    import iconInfos from "$lib/iconInfos.json"
    import SocialIcons from "$lib/SocialIcons.svelte"
</script>

<header>
    <h1><a href="/">Moonflower</a></h1>
    <SocialIcons {iconInfos} size="fa-2x"></SocialIcons>
</header>

<style>
    header {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    h1 {
        margin-bottom: 0;
    }
</style>
