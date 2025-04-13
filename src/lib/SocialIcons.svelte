<script>
    export let size = "fa-2x";
    export let iconInfos;
</script>

<div class="social-icons">
    {#each iconInfos as iconInfo}
        <a href={iconInfo.href} target="_blank" aria-label={iconInfo.description}>
            <i
                class="fa {iconInfo.font_awesome_tag} {size} icon-3d"
                role="presentation"
            ></i>
        </a>
    {/each}
</div>

<style>
    /* credit: https://codepen.io/miguelcast/pen/pwZMOJ  */
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

    .social-icons {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    }
</style>