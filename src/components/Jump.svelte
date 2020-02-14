<script>
    import { createEventDispatcher } from 'svelte'      
    import { fade } from 'svelte/transition' 

    const dispatch = createEventDispatcher()

    export let scroll, width

    let man, manIsDangerouslyCloseToTheEnd = false

    $: {
        if(man){
            man.style.transform = `translateX(${scroll/6}px)`
            console.log(man.getBoundingClientRect().right, width)
            if(man.getBoundingClientRect().right > width){
                manIsDangerouslyCloseToTheEnd=true
            }else{
                manIsDangerouslyCloseToTheEnd=false
            }
        }
    }

</script>

<section>
    <h3>scroll to jump →</h3>

    {#if manIsDangerouslyCloseToTheEnd}
        <h4 transition:fade>Oh, the man is getting close to the wall, you may wanna do something about that...</h4>
    {/if}

    <img bind:this={man} src='./img/man.gif' alt='man' class='man' />
</section>



<style>
    h3{
        position:absolute;
        bottom:4rem;
    }
    h4{
        position:absolute;
    }
    .man{
        width:300px;
        position:absolute;
        left:4rem;
    }
</style>