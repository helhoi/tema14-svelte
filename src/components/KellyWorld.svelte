<script>
    import { createEventDispatcher } from 'svelte'      
    import Man from './Man.svelte'


    const dispatch = createEventDispatcher()

    export let scroll, width

    let man, manIsDangerouslyCloseToTheEnd = false

    let land
    let ladder

</script>

<section>

    {#if scroll <= 500}
        <Man src='./img/kelly/1lander.png' moveUp='150' moveForward='-130' />
    {:else if scroll >= 501 && scroll <= 1000 }
        <Man src='./img/kelly/2lander.png' moveUp='130' />
    {:else if scroll >= 1001 && scroll <= 1500}
        <Man src='./img/kelly/3står.png' moveUp='130' />
    {:else if scroll >= 1501 && scroll <= 2000}
        <Man src='./img/kelly/4frykt.png' moveUp='130'/>
    {:else if scroll >= 2001 && scroll <= 2500}
        <Man src='./img/kelly/5Ser.png' moveUp='130' />
    {:else if scroll >= 2501 && scroll <= 3000}
        <Man src='./img/kelly/6sklir.png' moveUp='130' />
    {:else }
        <Man src='./img/kelly/7klein.png' moveUp='100' moveForward='-200'  />
    {/if}

    <img bind:this={ladder} src='./img/stige.png' class='stige' alt='title' />
    <img bind:this={land} src='./img/kelly/bkgr-over-vann.png' class='land' alt='Background' />
    
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
        top:300px;
        position: fixed;
        z-index: 1;  
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
        z-index: -3;
        height: 4000px;
    }
    .man {
        position: fixed;
    }

    :global(body) {
        height: auto;
    }

</style>