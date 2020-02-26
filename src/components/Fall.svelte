<script>
    import { createEventDispatcher } from 'svelte'      
    import Man from './Man.svelte'


    const dispatch = createEventDispatcher()

    export let scroll, width

    let man, manIsDangerouslyCloseToTheEnd = false

    let ladder, vann

</script>

<section>
    <h3>Fall</h3>

    {#if scroll <= 500}
        <Man src='./img/vann1.png' moveForward='-400'/>
        {:else if scroll >= 601 && scroll <= 801 }
        <Man src='./img/vann2.png' moveForward='-400' />
    {:else if scroll >= 801 && scroll <= 1001}
        <Man src='./img/vann3.png' moveForward='-400' />
    {:else if scroll >= 1001 && scroll <= 1200}
        <Man src='./img/vann4.png' moveForward='-400' />

    
    {/if}
    <img bind:this={vann} src='./img/bkgr-vann.png' class='vann' alt='title' />
    <img bind:this={ladder} src='./img/stige.png' class='stige' alt='title' />

</section>



<style>
    h3{
        position:absolute;
        bottom:4rem;
    }
    
    h4{
        position:absolute;
    }
    .stige{
        width:600px;
        bottom:-450px;
        position: absolute;
        z-index: -1;
    }

    .vann {
        background-size: cover;
        width: 100vw;
        bottom:-600px;
        overflow: scroll;
        position: relative;
         z-index: -2;
    }
    

</style>


