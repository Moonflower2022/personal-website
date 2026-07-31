<script>
    let open = false;
    const toggle = () => (open = !open);
</script>

<slot {toggle} />

<div class="contact-info" class:open aria-hidden={!open}>
    <div class="contact-item" style="--i: 0">
        <i class="fa fa-envelope"></i>
        <span><a href="mailto:harrisonq125@gmail.com">harrisonq125@gmail.com</a></span>
    </div>
    <div class="contact-item" style="--i: 1">
        <i class="fa-brands fa-discord"></i>
        <span><a href="https://discord.com/users/1297739861649920053">harqian</a></span>
    </div>
    <div class="contact-item" style="--i: 2">
        <i class="fa fa-video"></i>
        <span><a href="https://calendar.app.google/RJPd9A49VgwTbQWdA">meeting link</a></span>
    </div>
</div>

<style>
    /* trigger buttons live in each page's slot markup, so this has to be global */
    :global(.say-hi-btn) {
        background: none;
        border: none;
        color: var(--link-color);
        text-decoration: underline;
        cursor: pointer;
        font-size: inherit;
        font-family: inherit;
        padding: 0;
        margin: 0;
        transition: opacity 0.3s;
    }

    :global(.say-hi-btn:hover) {
        opacity: 0.7;
    }

    .contact-info {
        padding: 1rem;
        background: var(--surface-2);
        border-radius: 8px;
        box-shadow:
            0 0 0 1px var(--border),
            0 1px 2px var(--shadow-strong);
        overflow: hidden;

        max-height: 0;
        margin-top: 0;
        padding-top: 0;
        padding-bottom: 0;
        opacity: 0;
        transition:
            max-height 0.35s ease,
            margin-top 0.35s ease,
            padding-top 0.35s ease,
            padding-bottom 0.35s ease,
            opacity 0.25s ease;
    }

    .contact-info.open {
        max-height: 400px;
        margin-top: 1rem;
        padding-top: 1rem;
        padding-bottom: 1rem;
        opacity: 1;
    }

    .contact-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        font-size: 1.1rem;

        opacity: 0;
        transform: translateY(8px);
        filter: blur(4px);
        transition:
            opacity 0.3s ease,
            transform 0.3s ease,
            filter 0.3s ease;
        transition-delay: 0s;
    }

    .contact-info.open .contact-item {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
        transition-delay: calc(120ms + var(--i) * 80ms);
    }

    .contact-item:last-child {
        margin-bottom: 0;
    }

    .contact-item i {
        color: var(--link-color);
        width: 20px;
        /* optical nudge: icon glyphs often sit slightly above the text baseline */
        transform: translateY(1px);
    }
</style>
