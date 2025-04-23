<script>
    import info from "$lib/info.json";
    import interestsInfo from "$lib/interestsInfo.json";
    import Header from "$lib/Header.svelte";
    import StarBackground from "$lib/StarBackground.svelte";

    let email = info.email;
    
    let hoveredInterest = null;

    function handleHover(interest) {
        hoveredInterest = interest;
        interestsInfo[interest].index = (interestsInfo[interest].index + 1) % interestsInfo[interest].media.length
    }

    function handleClick(interest) {
        interestsInfo[interest].index = (interestsInfo[interest].index + 1) % interestsInfo[interest].media.length
    }
</script>

<StarBackground>
    <Header />
    <div class="two-column-layout">
        <div class="left-column">
            <section class="section">
                <h2>about</h2>
                <p>I am a student that loves</p>
                <ul>
                    {#each Object.entries(interestsInfo) as [interest, info]}
                    <li 
                        class="hover-item"
                        on:mouseenter={() => handleHover(interest)}
                    >
                        <button
                            class="blank-wrapper-button"
                            on:click={() => handleClick(interest)}
                        >
                            {interest}
                        </button>
                    </li>
                    {/each}
                </ul>
            </section>
            <h2><a href="resume.pdf" target="_blank">resume</a></h2>
            <h2><a href="/photo_gallery">photos</a></h2>
        </div>
        
        <div class="right-column">
            <div class="image-container">
                {#each Object.entries(interestsInfo) as [interest, info]}
                    <img 
                        src={info.media[info.index] || `/api/placeholder/400/300`} 
                        alt="{interest} media"
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
        width: 85%;
        margin: auto;
    }
    
    .left-column {
        flex: 1;
        padding-left: 3rem;
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