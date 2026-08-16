<script>
    import { onMount, onDestroy } from 'svelte';
    import { theme } from '$lib/theme.js';

    // day = light theme. in day the whole starfield fades out (small/medium swept
    // top->bottom via a per-star delay) and a separate layer of soft white clouds
    // drifts across the sky. night reverses it.
    $: isDay = $theme === 'light';

    // Props with defaults
    export let backgroundColor;
    export let starsPerScreen = {
      small: 80,    // per 1000px of height
      medium: 40,   // per 1000px of height
      large: 16     // per 1000px of height
    };

    let starSize = {
      small: [2, 3],
      medium: [3, 4],
      large: [4, 5]
    };

    let starBaseSpeed = [0, 2];

    let starOpacity = {
      small: [0.1, 0.5],
      medium: [0.5, 0.8],
      large: [0.8, 1]
    };
    
    // Will be calculated based on page height
    let starCount = {
      small: 100,
      medium: 50,
      large: 20
    };
    export let parallaxSpeed = {
      small: 0.2,
      medium: 0.4,
      large: 0.8
    };
    export let starMovementSpeed = {
      small: 0.48,
      medium: 0.28,
      large: 0.12
    };
    export let directionChangeFrequency = { // per frame
      small: 0.001,  
      medium: 0.005,
      large: 0.002  
    };
    
    // Internal state
    let mounted = false;
    let reduceMotion = false;
    let container;
    let width = 0;
    let height = 0;
    let scrollY = 0;
    let vh = 0;
    let animationFrameId;
    let time = 0;
    let centerX = 0;
    let centerY = 0;
    
    // Star layers
    let stars = {
      small: [],
      medium: [],
      large: []
    };

    // day-mode clouds (independent of stars: big, few, slow-drifting)
    let clouds = [];

    function generateClouds() {
      if (!mounted || !width || !height) return;
      const count = Math.min(14, Math.round(height / 480) + 2);
      clouds = Array(count).fill().map(() => ({
        x: random(0, width),
        y: random(24, Math.max(40, height - 60)),
        scale: random(0.6, 1.7),
        // slow horizontal drift, random direction; gives a sense of weather
        speed: random(0.06, 0.26) * (Math.random() > 0.5 ? 1 : -1),
        opacity: random(0.55, 0.92),
      }));
    }
    
    // Handle scroll events
    function handleScroll() {
      scrollY = window.scrollY;
    }
    
    // Generate a random number between min and max
    function random(min, max) {
      return Math.random() * (max - min) + min;
    }
    
    // Create a new angle with bias toward the center
    function newAngleTowardCenterAndCurrentDirection(x, y, currentAngle, centerBias = 0.05, currentDirectionBias = 0.7) {
      // Calculate angle to center
      const dx = centerX - x;
      const dy = centerY - y;
      const angleToCenter = Math.atan2(dy, dx);
      
      // Random angle component (full circle)
      const randomAngle = random(0, Math.PI * 2);
      
      // Mix between random angle and angle toward center
      // Higher centerBias means more tendency toward center
      return angleToCenter * centerBias + randomAngle * (1 - centerBias - currentDirectionBias) + currentAngle * currentDirectionBias;
    }
    
    // one star of a given layer, randomly placed within the current field
    function makeStar(layer) {
      const x = random(0, width);
      const y = random(0, height);
      const star = {
        x,
        y,
        seedY: y,
        size: random(starSize[layer][0], starSize[layer][1]),
        opacity: random(starOpacity[layer][0], starOpacity[layer][1]),
        speed: random(starBaseSpeed[0], starBaseSpeed[1]),
        angle: newAngleTowardCenterAndCurrentDirection(x, y, 0, 0, 0),
        changeDirectionCounter: 0
      };
      if (layer === 'large') star.twinkleSpeed = random(0.01, 0.05);
      return star;
    }

    // full (re)generation — only used for the initial field
    function generateStars() {
      if (!mounted || !width || !height) return;
      centerX = width / 2;
      centerY = height / 2;
      stars = {
        small: Array.from({ length: starCount.small }, () => makeStar('small')),
        medium: Array.from({ length: starCount.medium }, () => makeStar('medium')),
        large: Array.from({ length: starCount.large }, () => makeStar('large'))
      };
    }

    // grow/shrink the field to match starCount WITHOUT disturbing existing stars.
    // this is what page-height changes (e.g. the "say hi" dropdown expanding) use, so the
    // starfield never flickers/regenerates — it just gains or drops a few stars at the tail.
    function reconcileStars() {
      if (!mounted || !width || !height) return;
      centerX = width / 2;
      centerY = height / 2;
      if (!stars.small.length && !stars.medium.length && !stars.large.length) {
        generateStars();
        return;
      }
      for (const layer of ['small', 'medium', 'large']) {
        const target = starCount[layer];
        const arr = stars[layer];
        if (arr.length < target) {
          for (let i = arr.length; i < target; i++) arr.push(makeStar(layer));
          stars[layer] = arr; // reassign for svelte reactivity
        } else if (arr.length > target) {
          stars[layer] = arr.slice(0, target);
        }
      }
    }
    
    // Animate stars
    function animateStars() {
      time += 0.01;
      
      // Update center coordinates in case of resize
      centerX = width / 2;
      centerY = height / 2;
      
      // Update small stars
      stars.small = stars.small.map(star => {
        // Occasionally change direction
        if (Math.random() < directionChangeFrequency.small) {
          star.angle = newAngleTowardCenterAndCurrentDirection(star.x, star.y, star.angle);
        }
        
        let x = star.x + Math.cos(star.angle) * star.speed * starMovementSpeed.small;
        let y = star.y + Math.sin(star.angle) * star.speed * starMovementSpeed.small;
        
        // Wrap around edges
        if (x < 0) x = width;
        if (x > width) x = 0;
        if (y < 0) y = height;
        if (y > height) y = 0;
        
        return { ...star, x, y };
      });
      
      // Update medium stars
      stars.medium = stars.medium.map(star => {
        // Occasionally change direction
        if (Math.random() < directionChangeFrequency.medium) {
          star.angle = newAngleTowardCenterAndCurrentDirection(star.x, star.y, star.angle);
        }
        
        let x = star.x + Math.cos(star.angle) * star.speed * starMovementSpeed.medium;
        let y = star.y + Math.sin(star.angle) * star.speed * starMovementSpeed.medium;
        
        // Wrap around edges
        if (x < 0) x = width;
        if (x > width) x = 0;
        if (y < 0) y = height;
        if (y > height) y = 0;
        
        return { ...star, x, y };
      });
      
      // Update large stars with twinkling
      stars.large = stars.large.map(star => {
        // Occasionally change direction
        if (Math.random() < directionChangeFrequency.large) {
          star.angle = newAngleTowardCenterAndCurrentDirection(star.x, star.y, star.angle);
        }

        let x = star.x + Math.cos(star.angle) * star.speed * starMovementSpeed.large;
        let y = star.y + Math.sin(star.angle) * star.speed * starMovementSpeed.large;
        
        // Wrap around edges
        if (x < 0) x = width;
        if (x > width) x = 0;
        if (y < 0) y = height;
        if (y > height) y = 0;
        
        // Add twinkling effect
        const twinkle = (Math.sin(time * star.twinkleSpeed * 10) + 1) / 2 * 0.5 + 0.5;
        const currentOpacity = star.opacity * twinkle;
        
        return { ...star, x, y, currentOpacity };
      });

      // drift clouds horizontally (only matters in day; cheap, a handful of them)
      if (isDay && !reduceMotion && clouds.length) {
        clouds = clouds.map(c => {
          const margin = 160 * c.scale;
          let x = c.x + c.speed;
          if (x < -margin) x = width + margin;
          if (x > width + margin) x = -margin;
          return { ...c, x };
        });
      }

      animationFrameId = requestAnimationFrame(animateStars);
    }
    
    function updateStarCount() {
      const pageHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      
      // Calculate stars based on page height (per 1000px of height)
      const heightFactor = pageHeight / 1000;
      
      starCount = {
        small: Math.ceil(starsPerScreen.small * heightFactor),
        medium: Math.ceil(starsPerScreen.medium * heightFactor),
        large: Math.ceil(starsPerScreen.large * heightFactor)
      };
      
      if (mounted) {
        reconcileStars();
        generateClouds();
      }
    }

    // debounce resize-driven recounts so a height animation (e.g. the "say hi" dropdown
    // sliding open over 0.35s) collapses to a single settled update instead of firing per-frame
    let starUpdateTimer;
    function scheduleStarUpdate() {
      clearTimeout(starUpdateTimer);
      starUpdateTimer = setTimeout(updateStarCount, 150);
    }

    let resizeObserver;
    
    onMount(() => {
      mounted = true;
      reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.addEventListener('scroll', handleScroll);
      
      // Initialize star count and set up resize observer
      updateStarCount();
      
      // Observe body for size changes (debounced; reconciles rather than regenerates)
      resizeObserver = new ResizeObserver(scheduleStarUpdate);
      resizeObserver.observe(document.body);
      
      // Start animation after initial setup
      animationFrameId = requestAnimationFrame(animateStars);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        clearTimeout(starUpdateTimer);
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    });
    
    onDestroy(() => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    });
    
    // Re-count stars when dimensions change (debounced + reconciled, so it never flickers)
    $: if (mounted && width && height) {
      scheduleStarUpdate();
    }
    
    // Calculate parallax positions for each layer
    $: smallStarsY = -scrollY * parallaxSpeed.small;
    $: mediumStarsY = -scrollY * parallaxSpeed.medium;
    $: largeStarsY = -scrollY * parallaxSpeed.large;

    // viewport culling: stars span the full page height, but only a viewport band
    // is ever visible. a star at top:y inside a layer translated by -scrollY*p, on a
    // page scrolled by scrollY, sits at viewport-y = y - scrollY*(1+p). render only
    // those within [0, vh] (+ margin so they don't pop in at the edges).
    const CULL_MARGIN = 200;
    function cullStars(arr, p, sy, vhh) {
      if (!vhh) return arr;
      const lo = sy * (1 + p) - CULL_MARGIN;
      const hi = sy * (1 + p) + vhh + CULL_MARGIN;
      return arr.filter(s => s.y >= lo && s.y <= hi);
    }
    $: visSmall = cullStars(stars.small, parallaxSpeed.small, scrollY, vh);
    $: visMedium = cullStars(stars.medium, parallaxSpeed.medium, scrollY, vh);
    $: visLarge = cullStars(stars.large, parallaxSpeed.large, scrollY, vh);
  </script>

  <svelte:window bind:scrollY bind:innerHeight={vh} />
  
  <div
    class="parallax-starry-sky"
    class:day={isDay}
    bind:this={container}
    bind:clientWidth={width}
    bind:clientHeight={height}
    style="background: {backgroundColor || 'var(--default-background)'};"
  >
    <!-- Small stars layer (fades out in day) -->
    <div class="star-layer layer-small" style="transform: translateY({smallStarsY}px);">
      {#each visSmall as star}
        <div
          class="star"
          style="
            left: {star.x}px;
            top: {star.y}px;
            width: {star.size}px;
            height: {star.size}px;
            opacity: {star.opacity};
            transition-delay: {Math.min(star.seedY * 0.35, 1400)}ms;
          "
        ></div>
      {/each}
    </div>

    <!-- Medium stars layer (fades out in day) -->
    <div class="star-layer layer-medium" style="transform: translateY({mediumStarsY}px);">
      {#each visMedium as star}
        <div
          class="star"
          style="
            left: {star.x}px;
            top: {star.y}px;
            width: {star.size}px;
            height: {star.size}px;
            opacity: {star.opacity};
            transition-delay: {Math.min(star.seedY * 0.35, 1400)}ms;
          "
        ></div>
      {/each}
    </div>

    <!-- Large stars layer (fades out in day) -->
    <div class="star-layer layer-large" style="transform: translateY({largeStarsY}px);">
      {#each visLarge as star}
        <div
          class="star star-twinkle"
          style="
            left: {star.x}px;
            top: {star.y}px;
            width: {star.size}px;
            height: {star.size}px;
            opacity: {star.currentOpacity || star.opacity};
            box-shadow: 0 0 {star.size * 2}px rgba(var(--star-rgb), {(star.currentOpacity || star.opacity) * 0.7});
          "
        ></div>
      {/each}
    </div>

    <!-- Clouds: hidden at night, drift across the day sky -->
    <div class="cloud-layer">
      {#each clouds as c}
        <div class="cloud" style="left: {c.x}px; top: {c.y}px; width: {120 * c.scale}px; opacity: {c.opacity};">
          <svg viewBox="0 0 120 64" aria-hidden="true">
            <g fill="var(--cloud-color)">
              <ellipse cx="38" cy="42" rx="26" ry="19" />
              <ellipse cx="62" cy="31" rx="31" ry="25" />
              <ellipse cx="87" cy="42" rx="24" ry="18" />
              <rect x="18" y="42" width="84" height="20" rx="11" />
            </g>
          </svg>
        </div>
      {/each}
    </div>

    <!-- Content slot -->
    <div class="content">
      <slot></slot>
    </div>
  </div>
  
  <style>
    .parallax-starry-sky {
      position: relative;
      width: 100%;
      min-height: 100vh;
      overflow: hidden;
    }
    
    .star-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      will-change: transform;
    }
    
    .star {
      position: absolute;
      background-color: rgb(var(--star-rgb));
      border-radius: 50%;
      will-change: transform, opacity;
      /* small + medium have a static opacity, so this gives the dawn-sweep fade */
      transition: opacity 0.6s ease;
    }
    /* large stars twinkle (opacity updated every frame), so they need a fast
       transition and NO per-star delay or the twinkle would lag */
    .star-twinkle {
      transition: opacity 0.18s ease-out;
    }

    /* DAY: all stars fade out (small/medium sweep top->bottom via their delay) */
    .day .star {
      opacity: 0 !important;
    }

    /* clouds: a separate layer, hidden at night, faded + drifting in day */
    .cloud-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 0.8s ease;
      pointer-events: none;
      will-change: opacity;
    }
    .day .cloud-layer {
      opacity: 1;
    }
    .cloud {
      position: absolute;
      transform: translate(-50%, -50%);
      /* soften the edges + a faint shadow so they read as fluff, not blobs */
      filter: blur(0.5px) drop-shadow(0 7px 9px rgba(90, 120, 165, 0.18));
      will-change: transform;
    }
    .cloud svg {
      width: 100%;
      height: auto;
      display: block;
    }

    .content {
      position: relative;
      z-index: 10;
      height: 100%;
    }
  </style>