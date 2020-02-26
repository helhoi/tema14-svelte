<script>
    import { createEventDispatcher } from 'svelte'      
    import Man from './Man.svelte'


    const dispatch = createEventDispatcher()

    export let scroll, width

    let man, manIsDangerouslyCloseToTheEnd = false

    let ladder, land

</script>

<section>
    <h3>Jump</h3>

    {#if scroll <= 500}
        <Man src='./img/1.png' moveUp='100'/>
        {:else if scroll >= 501 && scroll <= 550 }
        <Man src='./img/2.png' />
    {:else if scroll >= 601 && scroll <= 701}
        <Man src='./img/3.png' moveForward='-100' />
    {:else if scroll >= 701 && scroll <= 801}
        <Man src='./img/4.png' moveForward='-130' />
    {:else if scroll >= 801 && scroll <= 901}
        <Man src='./img/5.png' moveForward='-130' />
    {:else if scroll >= 901 && scroll <= 1001}
        <Man src='./img/6.png' moveForward='-230' />
    {:else if scroll >= 1001 && scroll <= 1101}
        <Man src='./img/7.png' moveUp='250' moveForward='-800' />
    {:else if scroll >= 1101 && scroll <= 2101}
        <Man src='./img/8.png' moveUp='200' moveForward='-200' />
    {:else if scroll >= 2101 && scroll <= 2201}
        <Man src='./img/9.png' moveUp='200' moveForward='-200' />
    
    {/if}
    <img bind:this={land} src='./img/bkgr-land.jpg' class='land' alt='title' />
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
        top:200px;
        position:absolute;

    }

    .land {
        background-size: cover;
        width: 100vw;
        bottom:-550px;
        overflow: scroll;
        position: relative;
        z-index: -2;
    }
    

</style>