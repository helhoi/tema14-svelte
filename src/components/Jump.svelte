<script>
    import { createEventDispatcher } from 'svelte'      
    import Man from './Man.svelte'


    const dispatch = createEventDispatcher()

    export let scroll, width

    let man, manIsDangerouslyCloseToTheEnd = false

    let ladder

</script>

<section>
    <h3>scroll to jump →</h3>

    {#if scroll <= 1000}
        <Man src='./img/1.png' moveUp='100'/>
        {:else if scroll >= 1501 && scroll <= 2000 }
        <Man src='./img/2.png' />
    {:else if scroll >= 2001 && scroll <= 2500}
        <Man src='./img/3.png' moveForward='-100' />
    {:else if scroll >= 2501 && scroll <=2800}
        <Man src='./img/4.png' moveForward='-130' />
    {:else if scroll >= 2001 && scroll <=3200}
        <Man src='./img/5.png' moveForward='-130' />
    {:else if scroll >= 3501 && scroll <=3800}
        <Man src='./img/6.png' moveForward='-230' />
    {:else if scroll >= 4000 && scroll <=4500}
        <Man src='./img/7.png' class='seven' moveUp='200' moveForward='-200'  />
    {:else}
        <Man src='./img/8.png' moveForward='-130' />
    
    {/if}
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
    .seven {
        bottom: 700px;
    }
    

</style>