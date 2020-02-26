<script>
    import { fade } from 'svelte/transition' 
    export let src, moveUp, moveForward
    let man

    $: {        
        if(moveForward && man) {
            man.style.transform = `translateX(${moveForward}px)`
        }
    }

     $: {        
        if(moveUp && man){
            man.style.transform = `translateY(${moveUp}px)`
        }
     }

</script>

<div in:fade out:fade>
    <img bind:this={man} src='{src}' class='man' alt='manny' />
</div>

<style>
    .man{
        width:300px;
        top:123px;
        position:fixed;
    }
</style>