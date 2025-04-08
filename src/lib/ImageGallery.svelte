<script>
  export let images = [];
  
  import { onMount } from 'svelte';
  
  let container;
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;
  let windowHalfX = 0;
  let windowHalfY = 0;
  let hoveredIndex = -1;
  
  // Configuration - Adjusted for higher quality
  const rowSize = 3; // Number of images per row
  const zDistance = 800; // Reduced depth for better visibility
  const gridSpacing = 200; // Increased spacing
  const perspective = 1500; // Increased perspective
  const imageSize = 220; // Larger image size
  
  onMount(() => {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove);
    
    // Start animation loop
    animate();
    
    return () => {
      window.removeEventListener('resize', onWindowResize);
      document.removeEventListener('mousemove', onMouseMove);
    };
  });
  
  function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
  }
  
  function onMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) * 0.5;
    mouseY = (event.clientY - windowHalfY) * 0.5;
  }
  
  function animate() {
    requestAnimationFrame(animate);
    
    // Smooth movement
    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;
    
    if (container) {
      container.style.transform = `rotateY(${targetX * 0.0008}rad) rotateX(${-targetY * 0.0008}rad)`;
    }
  }
  
  // Calculate positions for images in a grid
  function calculateImagePositions(imageCount) {
    const positions = [];
    
    // Calculate how many rows we'll need
    const totalRows = Math.ceil(imageCount / rowSize);
    
    for (let i = 0; i < imageCount; i++) {
      // Calculate row and column
      const row = Math.floor(i / rowSize);
      const col = i % rowSize;
      
      // Calculate center offset to center the grid
      const rowOffset = (totalRows - 1) * gridSpacing / 2;
      const colOffset = (rowSize - 1) * gridSpacing / 2;
            
      // Calculate position
      const x = (col * gridSpacing) - colOffset;
      const y = (row * gridSpacing) - rowOffset;
      
      // Calculate z position (staggered depth)
      // Create a wave pattern for z positions
      const zPattern = Math.sin((row * 0.5) + (col * 0.5)) * 0.5 + 0.5; // Value between 0-1
      const z = -zPattern * zDistance;
      
      // Calculate a subtle random rotation for each image
      // Small enough to look organized but with variation
      const rotateX = (Math.random() - 0.5) * 8;
      const rotateY = (Math.random() - 0.5) * 8;
      
      positions.push({ x, y, z, rotateX, rotateY });
    }
    
    return positions;
  }
  
  $: imagePositions = calculateImagePositions(images.length);
</script>

<style>
  .gallery-container {
    position: relative;
    width: 100%;
    height: 80vh;
    margin: 40px 0;
    overflow: hidden;
    background: linear-gradient(to bottom, #f8f8f8, #e8e8e8);
    border-radius: 12px;
    perspective: 1500px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  }
  
  .gallery-content {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.1s ease-out;
  }
  
  .gallery-item {
    position: absolute;
    top: 50%;
    left: 50%;
    transform-style: preserve-3d;
    transition: transform 0.5s ease;
    cursor: pointer;
    transform-origin: center center;
    will-change: transform; /* Performance optimization */
  }
  
  .gallery-item img {
    z-index: 1;
    width: 220px;
    height: 220px;
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
    object-fit: cover;
    transform-origin: center center;
    backface-visibility: hidden;
    transition: all 0.3s ease;
    will-change: transform; /* Performance optimization */
    image-rendering: high-quality; /* For modern browsers */
    backface-visibility: visible;
  }

  /* Key fix: Move hover styles to separate element */
  .hover-layer {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .hover-image {
    transform: scale(2.5);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    max-width: 20vw;
    max-height: 20vh;
    border-radius: 8px;
    object-fit: cover;
  }
  
  /* Media queries for responsive adjustments */
  @media (max-width: 768px) {
    .gallery-item img, .hover-image {
      width: 180px;
      height: 180px;
    }
  }
  
  @media (max-width: 480px) {
    .gallery-item img, .hover-image {
      width: 150px;
      height: 150px;
    }
  }
</style>

<div class="gallery-container">
  <div class="gallery-content" bind:this={container}>
    {#each images as image, i}
      {@const pos = imagePositions[i]}
      <div 
        class="gallery-item"
        style="
          transform: translate3d(
            calc(-50% + {pos.x}px), 
            calc(-50% + {pos.y}px), 
            {pos.z}px
          ) rotateX({pos.rotateX}deg) rotateY({pos.rotateY}deg);
          z-index: {2000 - Math.floor(Math.abs(pos.z))};
        "
        role="img"
        on:mouseenter={() => hoveredIndex = i}
        on:mouseleave={() => hoveredIndex = -1}
      >
        <img 
          src={image} 
          alt={`Image ${i + 1}`}
          loading="eager" 
          style="opacity: {hoveredIndex === i ? 0.3 : 1};"
        />
      </div>
    {/each}
  </div>
</div>

<!-- Completely separate hover layer -->
{#if hoveredIndex >= 0 && hoveredIndex < images.length}
  <div class="hover-layer">
    <img 
      class="hover-image"
      src={images[hoveredIndex]} 
      alt={`Image ${hoveredIndex + 1}`} 
    />
  </div>
{/if}