<script>
    import info from "$lib/info.json"
    import icons from "$lib/icons.json"

    let email = info.email
    let interests = info.interests
</script>

<main>
    <h1><a href="/">Moonflower</a></h1>
    <section class="section">
        <h2>socials</h2>
        {#each icons as icon}
            <a href={icon.href} target="_blank" aria-label={icon.description}>
                <i
                    class="fa {icon.font_awesome_tag} fa-2x icon-3d"
                    role="presentation"
                ></i>
            </a>
        {/each}
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
    /* RED BLUE ICON STUFF (credit: https://codepen.io/miguelcast/pen/pwZMOJ)  */

    .icon-3d {
        padding: 10px;
        animation: icon3d 200ms 10;
        color: #fff;
    }

    .icon-3d:hover {
        animation: icon3d 200ms infinite;
    }

    @keyframes icon3d {
        0% {
            text-shadow:
                5px 4px rgba(244, 67, 54, 1),
                -5px -6px rgba(33, 150, 243, 1);
        }
        25% {
            text-shadow:
                -5px -6px rgba(244, 67, 54, 1),
                5px 4px rgba(33, 150, 243, 1);
        }
        50% {
            text-shadow:
                5px -4px rgba(244, 67, 54, 1),
                -8px 4px rgba(33, 150, 243, 1);
        }
        75% {
            text-shadow:
                -8px -4px rgba(244, 67, 54, 1),
                -5px -4px rgba(33, 150, 243, 1);
        }
        100% {
            text-shadow:
                -5px 0 rgba(244, 67, 54, 1),
                5px -4px rgba(33, 150, 243, 1);
        }
    }
</style>
