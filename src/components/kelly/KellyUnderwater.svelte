<script>
    import { createEventDispatcher } from 'svelte'      
    import KellyMan from './KellyMan.svelte'


    const dispatch = createEventDispatcher()

    export let scroll

    let kellyman, manIsDangerouslyCloseToTheEnd = false

    let vann
    let detailOne
    let detailTwo
    let details

  $: {
        if(scroll >= 4000){
            dispatch('done')
        }
    }

</script>

<section>

    {#if scroll >= 1}
        <KellyMan src='./img/kelly/5Ser.png' moveUp='130' />
    {/if}

    <img bind:this={vann} src='./img/kelly/bkgr-vann.png' class='vann' alt='Background' />
    <img bind:this={detailOne} src='./img/kelly/parallax1.png' class='parallax1' alt='Background' />
    <img bind:this={detailTwo} src='./img/kelly/parallax2.png' class='parallax2' alt='Background' />
    <img bind:this={details} src='./img/kelly/detaljer.png' class='details' alt='Background' />
    
</section>

<style>
   section{
        min-width: 90vw;
        min-height: 4000px;
        /*overflow-y: auto;*/
        position: relative;
        z-index: -2;
        background-position: center;
        background-repeat: repeat-y;
        width: 100vw;
        background-size: cover;
        background-image: url('./img/Kelly/detaljer.png');
    }

    .vann{
        top: 0px;
        position: absolute;
        z-index: -3;
        height: 000px;
        background-attachment: fixed;
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
    }

    img.parallax1{
        z-index: 2;
        position: fixed;
        width: 100vw;
        float: left;
        left: 50px;
        top: -50px;
    }

    img.parallax2{
        z-index: 3;
        position: fixed;
        width: 100vw;
        float: right;
        right: 50px;
        top: -50px;
    }

    img.details {
        width: 50vw;
        z-index: 5;
        position: relative;
        justify-content: center;
        transform: translateZ(-150px) scale(1.5);
        height:100vh;
    }
    :global(body) {
        height: auto;
    }

</style>