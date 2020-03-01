<script>
    import { createEventDispatcher } from 'svelte'      
    import ManMarthe from './ManMarthe.svelte'


    const dispatch = createEventDispatcher()

    export let scroll, width

    let manMarthe, manIsDangerouslyCloseToTheEnd = false

    let land
    let ladder

     $: {
        if(scroll > 1501){
            ladder.style.transform = `translateY(-${(scroll - 951) *.6}px)`
            /*land.style.transform = `translateY(-${scroll-2001}px)`*/
        }
        if(scroll > 2001){
            ladder.style.opacity = (3000 - scroll) / 1000;
        }
    }

</script>

<section>
    <!--landing-->
    {#if scroll <= 100}
        <ManMarthe src='./img/Marthe/Lande/lande1.png'  class='man-marthe' moveForward='44' />
    {:else if scroll >= 100 && scroll <= 200 }
        <ManMarthe src='./img/Marthe/Lande/lande2.png' moveUp='50' moveForward='44'/>
    {:else if scroll >= 201 && scroll <= 300}
        <ManMarthe src='./img/Marthe/Lande/lande3.png' moveUp='-50'moveForward='44'/>
    {:else if scroll >= 301 && scroll <= 400}
        <ManMarthe src='./img/Marthe/Lande/lande4.png' moveUp='-60' moveForward='44'/>
    {:else if scroll >= 401 && scroll <= 500}
        <ManMarthe src='./img/Marthe/Stå/standing.png' moveUp='-55' moveForward='44' />
    
    <!--walking-->
    {:else if scroll >= 501 && scroll <= 600}
        <ManMarthe src='./img/Marthe/Walk/walk1.png' moveUp='-60'moveForward='44'/>
    {:else if scroll >= 601 && scroll <= 700}
        <ManMarthe src='./img/Marthe/Walk/walk2.png' moveUp='50' moveForward='50' />
    {:else if scroll >= 701 && scroll <= 800}
        <ManMarthe src='./img/Marthe/Walk/walk3.png' moveUp='90' moveForward='50'/>
    {:else if scroll >= 801 && scroll <= 1000}
        <ManMarthe src='./img/Marthe/Walk/walk4.png' moveUp='20' moveForward='38'/>

    <!--tripping-->
    {:else if scroll >= 1001 && scroll <= 1100}
        <ManMarthe src='./img/Marthe/tripping/tripping1.png' moveUp='-50' moveForward='11'/>
    {:else if scroll >= 1101 && scroll <= 1200}
        <ManMarthe src='./img/Marthe/tripping/tripping2.png' moveUp='62' moveForward='-30'/>
    {:else if scroll >= 1201 && scroll <= 1300}
        <ManMarthe src='./img/Marthe/tripping/tripping3.png' moveUp='95' moveForward='-12'/>
    {:else if scroll >= 1301 && scroll <= 1500}
        <ManMarthe src='./img/Marthe/tripping/tripping4.png' moveUp='20' moveForward='-45'/>
    {:else if scroll >= 1501 && scroll <= 1600}
        <ManMarthe src='./img/Marthe/tripping/tripping5.png' moveUp='160' moveForward='-284'/>
    {:else if scroll >= 1601 && scroll <= 1700}
        <ManMarthe src='./img/Marthe/tripping/tripping6.png' moveUp='160' moveForward='-284'/>
    {:else if scroll >= 1701 && scroll <= 1800}
        <ManMarthe src='./img/Marthe/tripping/tripping7.png' moveUp='160' moveForward='-284'/>
    {:else if scroll >= 1801 && scroll <= 1900}
        <ManMarthe src='./img/Marthe/tripping/tripping8.png' moveUp='160' moveForward='-284'/>
    {:else if scroll >= 1901 && scroll <= 2000}
        <ManMarthe src='./img/Marthe/tripping/tripping9.png' moveUp='160' moveForward='-284'/>

    <!--falling-->
    {:else if scroll >= 2001 && scroll <= 2100}
        <ManMarthe src='./img/Marthe/falling/falling1.png' moveUp='160' moveForward='-284'/>
    {:else if scroll >= 2101 && scroll <= 2200}
        <ManMarthe src='./img/Marthe/falling/falling2.png' moveUp='160' moveForward='-284'/>
    {:else if scroll >= 2201 && scroll <= 2300}
        <ManMarthe src='./img/Marthe/falling/falling3.png' moveUp='160' moveForward='-284'/>

    <!--splash-->
    {:else if scroll >= 2301 && scroll <= 2400}
        <ManMarthe src='./img/Marthe/falling/falling1.png' moveUp='160' moveForward='-284'/>
        <img src='./img/Marthe/splash/splash1.png' class='splash' alt='title' style='transform: translateX(-206px)' />
    {:else if scroll >= 2401 && scroll <= 2500}
        <ManMarthe src='./img/Marthe/falling/falling2.png' moveUp='160'moveForward='-284'/>
        <img src='./img/Marthe/splash/splash2.png' class='splash' alt='title' style='transform: translateX(-206px)'/>
    {:else if scroll >= 2501 && scroll <= 2600}
        <ManMarthe src='./img/Marthe/falling/falling3.png' moveUp='160'moveForward='-284'/>
        <img src='./img/Marthe/splash/splash3.png' class='splash' alt='title' style='transform: translateX(-206px)' />

    <!--underwater-->
    {:else if scroll >= 2601 && scroll <= 3211}
        <ManMarthe src='./img/Marthe/underwater/underwater.png' moveUp='160' moveForward='-284' />
    
    {/if}

    <img bind:this={ladder} src='./img/Marthe/longestladder.png' class='ladder' alt='title' />
    <img bind:this={land} src='./img/Marthe/background.png' class='land' alt='title' />

</section>



<style>
  
    .ladder{
        width: 1000px;
        top:400px;
        position: fixed;
        z-index: 11;  
        margin-left: 25%;
    }

   section{
        min-width: 90vw;
        min-height: 4000px;
        overflow-y: auto;
        position: relative;
        z-index: -2;
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
    }

     .land{
        top: 0px;
        position: absolute;
        z-index: 1;
        width: 100vw;
        height: 100%;
    }

    .splash {
        z-index: 15;
        width: 50vw;
    }

    :global(body) {
        height: auto;
    }

</style>

