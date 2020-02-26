<script>
    import { createEventDispatcher } from 'svelte'      
    import Man from './Man.svelte'


    const dispatch = createEventDispatcher()

    export let scroll, width

    let man, manIsDangerouslyCloseToTheEnd = false

    let water
    let ladder

</script>

<section class="fall">

    {#if scroll <= 1000}
        <Man src='./img/vann1.png' moveForward='-400' class='man-falling' />
    {:else if scroll >= 2000 && scroll <= 3000 }
        <Man src='./img/vann2.png' moveForward='-400' class='man'/>
    {:else if scroll >= 4000 && scroll <= 5000}
        <Man src='./img/vann3.png' moveForward='-400' class='man'/>
    {:else }
        <Man src='./img/vann4.png' moveForward='-400' class="man" />
    {/if}

    <img bind:this={ladder} src='./img/stige.png' class='stige' alt='title' />
    <img bind:this={water} src='./img/bkgr-vann.png' class='bkgr-water' alt='Background' />
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
        top:-500px;
        position: fixed;
        z-index: -1;  
        margin-left: 25%;
    }

   section{
        min-width: 90vw;
        height: 7321px;
        overflow-y: auto;
        position: relative;
        z-index: -2;
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
    }

    .bkgr-water{
        margin-top: 0px;
        position: absolute;
        z-index: -3;
    }

    .man {
        position: fixed;
    }

    :global(body) {
        height: auto;
    }

</style>