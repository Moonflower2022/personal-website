<script>
    import { onMount, onDestroy } from 'svelte';
    
    // Props with defaults
    export let backgroundColor = 'linear-gradient(to bottom, #050E1F, #1A0B2E)'; // Blue to purple gradient
    export let starCount = {
      small: 100,
      medium: 50,
      large: 20
    };
    export let parallaxSpeed = {
      small: 0.05,
      medium: 0.1,
      large: 0.2
    };
    export let starMovementSpeed = {
      small: 0.024,
      medium: 0.014,
      large: 0.006
    };
    export let directionChangeFrequency = { // per frame
      small: 0.01,  
      medium: 0.005,
      large: 0.002  
    };
    
    // Internal state
    let mounted = false;
    let container;
    let width = 0;
    let height = 0;
    let scrollY = 0;
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
    
    // Handle scroll events
    function handleScroll() {
      scrollY = window.scrollY;
    }
    
    // Generate a random number between min and max
    function random(min, max) {
      return Math.random() * (max - min) + min;
    }
    
    // Create a new angle with bias toward the center
    function newAngleTowardCenter(x, y, centerBias = 0.7) {
      // Calculate angle to center
      const dx = centerX - x;
      const dy = centerY - y;
      const angleToCenter = Math.atan2(dy, dx);
      
      // Random angle component (full circle)
      const randomAngle = random(0, Math.PI * 2);
      
      // Mix between random angle and angle toward center
      // Higher centerBias means more tendency toward center
      return angleToCenter * centerBias + randomAngle * (1 - centerBias);
    }
    
    // Generate stars for each layer
    function generateStars() {
      if (!mounted || !width || !height) return;
      
      // Update center coordinates
      centerX = width / 2;
      centerY = height / 2;
      
      stars = {
        small: Array(starCount.small).fill().map(() => {
          const x = random(0, width);
          const y = random(0, height);
          return {
            x,
            y,
            size: random(1, 1.5),
            opacity: random(0.1, 0.5),
            speed: random(0.7, 2.0),
            angle: newAngleTowardCenter(x, y, 0.3), // Small bias to center
            changeDirectionCounter: 0
          };
        }),
        medium: Array(starCount.medium).fill().map(() => {
          const x = random(0, width);
          const y = random(0, height);
          return {
            x,
            y,
            size: random(1.5, 2.5),
            opacity: random(0.5, 0.8),
            speed: random(0.5, 1.2),
            angle: newAngleTowardCenter(x, y, 0.5), // Medium bias to center
            changeDirectionCounter: 0
          };
        }),
        large: Array(starCount.large).fill().map(() => {
          const x = random(0, width);
          const y = random(0, height);
          return {
            x,
            y,
            size: random(2.5, 4),
            opacity: random(0.8, 1),
            speed: random(0.3, 0.8),
            angle: newAngleTowardCenter(x, y, 0.7), // Strong bias to center
            twinkleSpeed: random(0.01, 0.05),
            changeDirectionCounter: 0
          };
        })
      };
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
          star.angle = newAngleTowardCenter(star.x, star.y, 0.3);
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
          star.angle = newAngleTowardCenter(star.x, star.y, 0.5);
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
          star.angle = newAngleTowardCenter(star.x, star.y, 0.7);
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
      
      animationFrameId = requestAnimationFrame(animateStars);
    }
    
    onMount(() => {
      mounted = true;
      window.addEventListener('scroll', handleScroll);
      generateStars();
      animationFrameId = requestAnimationFrame(animateStars);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
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
    
    // Re-generate stars when dimensions change
    $: if (mounted && width && height) {
      generateStars();
    }
    
    // Calculate parallax positions for each layer
    $: smallStarsY = -scrollY * parallaxSpeed.small;
    $: mediumStarsY = -scrollY * parallaxSpeed.medium;
    $: largeStarsY = -scrollY * parallaxSpeed.large;
  </script>
  
  <svelte:window bind:scrollY />
  
  <div 
    class="parallax-starry-sky"
    bind:this={container}
    bind:clientWidth={width}
    bind:clientHeight={height}
    style="background: {backgroundColor};"
  >
    <!-- Small stars layer -->
    <div class="star-layer" style="transform: translateY({smallStarsY}px);">
      {#each stars.small as star}
        <div 
          class="star" 
          style="
            left: {star.x}px; 
            top: {star.y}px; 
            width: {star.size}px; 
            height: {star.size}px; 
            opacity: {star.opacity};
          "
        ></div>
      {/each}
    </div>
    
    <!-- Medium stars layer -->
    <div class="star-layer" style="transform: translateY({mediumStarsY}px);">
      {#each stars.medium as star}
        <div 
          class="star" 
          style="
            left: {star.x}px; 
            top: {star.y}px; 
            width: {star.size}px; 
            height: {star.size}px; 
            opacity: {star.opacity};
          "
        ></div>
      {/each}
    </div>
    
    <!-- Large stars layer -->
    <div class="star-layer" style="transform: translateY({largeStarsY}px);">
      {#each stars.large as star}
        <div 
          class="star star-twinkle" 
          style="
            left: {star.x}px; 
            top: {star.y}px; 
            width: {star.size}px; 
            height: {star.size}px; 
            opacity: {star.currentOpacity || star.opacity};
            box-shadow: 0 0 {star.size * 2}px rgba(255, 255, 255, {(star.currentOpacity || star.opacity) * 0.7});
          "
        ></div>
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
      background-color: white;
      border-radius: 50%;
      will-change: transform, opacity;
    }
    
    .star-twinkle {
      transition: opacity 0.1s ease-out;
    }
    
    .content {
      position: relative;
      z-index: 10;
      height: 100%;
    }
  </style>