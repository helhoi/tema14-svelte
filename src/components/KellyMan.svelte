<script>
    import { fade } from 'svelte/transition' 
    export let src, moveUp, moveForward
    let kellyman

    $: {        
        if(kellyman){
            moveForward = moveForward ? moveForward : 0 
            moveUp = moveUp ? moveUp : 0
            kellyman.style.transform = `translate(${moveForward}px, ${moveUp}px)`
        }
    }

</script>

<div in:fade out:fade>
    <img bind:this={kellyman} src='{src}' class='man' alt='manny' />
</div>

<style>
    .man{
        width:300px;
        top:123px;
        position: fixed;
    }
</style>