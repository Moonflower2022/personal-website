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
        align-items: center;
        padding: 1rem;
        gap: 1rem;
    }
    
    h1 {
        margin-left: 30px;
    }


    @media (max-width: 600px) {
        header {
            flex-direction: column;
        }

        h1 {
            margin-left: 0px;
        }
    }
</style>
