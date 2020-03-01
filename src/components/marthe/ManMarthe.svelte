<script>
    import { fade } from 'svelte/transition' 
    export let src, moveUp, moveForward
    let manMarthe

    $: {        
        if(manMarthe){
            moveForward = moveForward ? moveForward : 0 
            moveUp = moveUp ? moveUp : 0
            manMarthe.style.transform = `translate(${moveForward}px, ${moveUp}px)`
        }     
    } 

</script>

<div>
    <img bind:this={manMarthe} src='{src}' class='man-marthe' alt='figure' />
</div>

<style>
    .man-marthe{
        width:200px;
        top:123px;
        position: fixed;
        z-index: 15;
    }
</style>
