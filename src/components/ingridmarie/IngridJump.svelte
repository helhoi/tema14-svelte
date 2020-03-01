<script>
    import { createEventDispatcher } from 'svelte'      
    import IngridMan from './IngridMan.svelte'


    const dispatch = createEventDispatcher()

    export let scroll

    let ingridman, manIsDangerouslyCloseToTheEnd = false

    let land
    let ladder

$: {
        if(scroll > 266){
            ladder.style.transform = `translateY(-${(scroll-266) *.6}px)`
            land.style.transform = `translateY(-${scroll-2350}px)`
        }
        if(scroll > 1000){
            ladder.style.opacity = (2000 - scroll) / 1000;
        }
    }

   $: {
        if(scroll >= 2000){
            dispatch('done')
        }
    }


</script>

<section>

    {#if scroll <= 50}
        <IngridMan src='./img/ingridmarie/1lander.png' moveUp='-100' moveForward='-130' />
    {:else if scroll >= 50 && scroll <= 100 }
        <IngridMan src='./img/ingridmarie/2lander.png' moveUp='60' moveForward='-35' />
    {:else if scroll >= 101 && scroll <= 150}
        <IngridMan src='./img/ingridmarie/3stupebrett.png' moveUp='55' moveForward='-35' />
    {:else if scroll >= 151 && scroll <= 200}
        <IngridMan src='./img/ingridmarie/4stupebrett.png' moveUp='40' moveForward='-100'/>
    {:else if scroll >= 201 && scroll <= 250}
        <IngridMan src='./img/ingridmarie/5stupebrett.png' moveUp='90' moveForward='-210' />
    {:else if scroll >= 301 && scroll <= 1000}
        <IngridMan src='./img/ingridmarie/6faller.png' moveUp='150' moveForward='-300'/>
    {:else if scroll > 1051 && scroll <= 1200}
        <IngridMan src='./img/ingridmarie/7faller.png' moveUp='150' moveForward='-300'  />
    {:else if scroll > 1201 && scroll <= 1600}
        <IngridMan src='./img/ingridmarie/9faller.png' moveUp='150' moveForward='-300'  />
    {:else if scroll > 1601}
        <IngridMan src='./img/ingridmarie/8faller.png' moveUp='150' moveForward='-300'  />
    {/if}

    <img bind:this={ladder} src='./img/ingridmarie/langstige.png' class='stige' alt='stige' />
    <img bind:this={land} src='./img/ingridmarie/bkgr.png' class='land' alt='background' />
    
</section>



<style>
    .stige{
        width:450px;
        top:200px;
        position: fixed;
        z-index: -1;  
        margin-left: 45%;
        /*height: 1000px;*/
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
        z-index: -3;
        max-width:1450px;
        min-height: 3300px;
    }
    


    :global(body) {
        height: auto;
    }

</style>