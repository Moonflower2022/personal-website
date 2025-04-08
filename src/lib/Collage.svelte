<script>
  export let images = [];
  
  // Helper functions
  const randomAngle = () => Math.random() * 30 - 15;
  const randomXOffset = () => Math.random() * 400 - 200; // Spread images left/right
  const randomYOffset = () => Math.random() * 400 - 200; // Spread images up/down
</script>

<style>
  .collage {
      position: relative;
      width: 800px;
      height: 800px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
  }

  .collage-image {
      position: absolute;
      width: 180px;
      height: auto;
      transform-origin: center center;
      transition: transform 0.3s ease, box-shadow 0.3s ease, z-index 0s;
      z-index: calc(10 - var(--index));
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      cursor: pointer;
      transform: translate(var(--xOffset), var(--yOffset)) rotate(var(--rotation));
  }

  .collage-image:hover {
      transform: translate(var(--xOffset), var(--yOffset)) scale(1.1) rotate(var(--rotation));
      box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
      z-index: 100; /* Ensure hovered image is on top */
  }
</style>

<div class="collage">
  {#each images as image, i}
      <img 
          src={image} 
          alt={`Image ${i + 1}`} 
          class="collage-image" 
          style="--rotation: {randomAngle()}deg; --index: {i}; --xOffset: {randomXOffset()}px; --yOffset: {randomYOffset()}px;" 
      />
  {/each}
</div>