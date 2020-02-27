<script>
    import { createEventDispatcher } from 'svelte'      
    import KellyMan from './KellyMan.svelte'


    const dispatch = createEventDispatcher()

    export let scroll, width

    let kellyman, manIsDangerouslyCloseToTheEnd = false

    let land
    let ladder

   $: {
        if(scroll >= 3000){
            dispatch('done')
        }
    }


</script>

<section>

    {#if scroll <= 500}
        <KellyMan src='./img/kelly/1lander.png' moveUp='-100' moveForward='-130' />
    {:else if scroll >= 501 && scroll <= 1000 }
        <KellyMan src='./img/kelly/2lander.png' moveUp='80' moveForward='-200' />
    {:else if scroll >= 1001 && scroll <= 1500}
        <KellyMan src='./img/kelly/3står.png' moveUp='80' moveForward='-200' />
    {:else if scroll >= 1501 && scroll <= 2000}
        <KellyMan src='./img/kelly/4frykt.png' moveUp='80' moveForward='-200'/>
    {:else if scroll >= 2001 && scroll <= 2500}
        <KellyMan src='./img/kelly/5Ser.png' moveUp='80' moveForward='-230' />
    {:else if scroll >= 2501 && scroll <= 3000}
        <KellyMan src='./img/kelly/6sklir.png' moveUp='150' moveForward='-300'/>
    {:else if scroll > 4601}
        <KellyMan src='./img/kelly/7klein.png' moveUp='400' moveForward='-600'  />
    {/if}

    <img bind:this={ladder} src='./img/kelly/langstige.png' class='stige' alt='title' />
    <img bind:this={land} src='./img/kelly/bkgr-land.png' class='land' alt='background' />
    
</section>



<style>
    .stige{
        width:600px;
        top:300px;
        position: fixed;
        z-index: -1;  
        margin-left: 25%;
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
        max-width:6000px;
        min-height: 3300px;
    }


    :global(body) {
        height: auto;
    }

</style>