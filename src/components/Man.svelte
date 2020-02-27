<script>
    import { fade } from 'svelte/transition' 
    export let src, moveUp, moveForward
    export let scroll = 0
    let man

    $: {        
        if(man) {
            moveForward = moveForward ? moveForward : 0
            moveUp = moveUp ? moveUp : 0
            man.style.transform = `translate(${moveForward}px, ${moveUp}px)`
        }
        if(scroll > 7000){
            console.log(man.style.opacity)
            man.style.opacity = (8000 - scroll) / 1000;
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
        position:absolute;
    }
</style>