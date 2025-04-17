<script>
    import info from "$lib/info.json";
    import Header from "$lib/Header.svelte";
    import StarBackground from "$lib/StarBackground.svelte";

    let email = info.email;
    let interests = info.interests;
    
    let hoveredInterest = null;

    function setHoveredInterest(interest) {
        hoveredInterest = interest;
    }
    
    const interestImages = {
    };
    
    interests.forEach(interest => {
        interestImages[interest.toLowerCase()] = `/interests_images/${interest.toLowerCase()}.jpeg`;
    });
</script>

<StarBackground>
    <Header />
    <div class="two-column-layout">
        <div class="left-column">
            <section class="section">
                <h2>about</h2>
                <p>I am a student that loves</p>
                <ul>
                    {#each interests as interest}
                        <li 
                            class="hover-item"
                            on:mouseenter={() => setHoveredInterest(interest)}
                        >
                            {interest}
                        </li>
                    {/each}
                </ul>
            </section>
            <h2><a href="resume.pdf" target="_blank">resume</a></h2>
            <h2><a href="/photo_gallery">photos</a></h2>
        </div>
        
        <div class="right-column">
            <div class="image-container">
                {#each interests as interest}
                    <img 
                        src={interestImages[interest.toLowerCase()] || `/api/placeholder/400/300`} 
                        alt={interest}
                        class="hover-image"
                        class:visible={hoveredInterest === interest}
                    />
                {/each}
            </div>
        </div>
    </div>
</StarBackground>

<style>
    .two-column-layout {
        display: flex;
        width: 100%;
        position: relative;
    }
    
    .left-column {
        flex: 1;
        padding-left: 6rem;
        z-index: 10;
    }
    
    .right-column {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
    }
    
    .image-container {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    .hover-image {
        max-width: 80%;
        max-height: 80%;
        border-radius: 8px;
        opacity: 0;
        position: absolute;
        transition: opacity 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    }
    
    .hover-image.visible {
        opacity: 1;
    }
    
    .hover-item {
        cursor: pointer;
        padding: 5px 0;
        transition: color 0.3s;
    }
    
    .hover-item:hover {
        color: #64b5f6;
    }
    
    ul {
        margin-top: 0px;
        padding-left: 25px;
    }
    
    p ~ ul {
        margin-top: -10px;
    }
    
    .section {
        margin-bottom: 1.5rem;
    }
    
    /* Media queries for responsiveness */
    @media (max-width: 768px) {
        .two-column-layout {
            flex-direction: column;
        }
        
        .left-column {
            max-width: 100%;
        }
        
        .right-column {
            min-height: 300px;
        }
    }
</style>