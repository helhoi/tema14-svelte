<script>
    import { fade } from 'svelte/transition' 
    export let src, moveUp, moveForward

    let ingridman

    $: {        
        if(ingridman){
            moveForward = moveForward ? moveForward : 0 
            moveUp = moveUp ? moveUp : 0
            ingridman.style.transform = `translate(${moveForward}px, ${moveUp}px)`
        }

         if(scroll > 1000){
            ingridman.style.opacity = (2000 - scroll) / 1000;
        }
    }

</script>

<div in:fade out:fade>
    <img bind:this={ingridman} src='{src}' class='man' alt='manny' />
</div>

<style>
    .man{
        width:200px;
        top:113px;
        position: fixed;
    }
</style>