<script>
    import iconInfos from "$lib/iconInfos.json"
    import SocialIcons from "$lib/SocialIcons.svelte"
</script>

<header>
    <h1><a href="/">Moonflower</a></h1>
    <SocialIcons iconInfos={iconInfos} size="fa-2x"></SocialIcons>
  </header>

<style>
    header {
        display: flex;
        align-items: center;
        padding: 1rem;
        gap: 1rem;
    }

    @media (max-width: 530px) {
        header {
            flex-direction: column;
        }
    }
</style>