<script>
    // when the scene is done we will 'dispatch' the event 'done' to App.svelte, therefore we import the event dispatcher
    import { createEventDispatcher } from 'svelte'
    const dispatch = createEventDispatcher()

    //props from App.js
    export let scroll, isScrolling

    //local vars bound to the two image elements
    let ladder, diver

    // a reactive var: src always checks whether isScrolling is true or false, and can thus be used to trigger shift between the images 
    $: src = isScrolling ? './img/climber.gif' : './img/climber_still.png'

    // an anonymous reactive variable checks the position of the two images and dispatches 'done', when the climber has reached a certain distance to the top of the latter (change 150 to something else to tweak)
    $: {
        if(ladder){
            ladder.style.transform = `translateY(${scroll/12}px)`
            if(scroll >= 4179) {
                console.log('stige sin topp er nå: ', ladder.getBoundingClientRect().top)
                console.log('ready to jump..')
                dispatch('done')
            }
        }
    }

</script>

<section>
    <h3>scroll to climb..</h3>
    <img bind:this={ladder} src='./img/stige.png' class='stige' alt='title' />
</section>



<style>
    h3{
        position:absolute;
        bottom:4rem;
    }
    .stige{
        width:600px;
        bottom: -850px;
        position: absolute;
    }
</style>