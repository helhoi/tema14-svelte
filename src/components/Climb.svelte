<script>
    // when the scene is done we will 'dispatch' the event 'done' to App.svelte, therefore we import the event dispatcher
    import { createEventDispatcher } from 'svelte'
    const dispatch = createEventDispatcher()

    //props from App.js
    export let scroll, isScrolling

    //local vars bound to the two image elements
    let ladder, climber

    // a reactive var: src always checks whether isScrolling is true or false, and can thus be used to trigger shift between the images 
    $: src = isScrolling ? './img/climber.gif' : './img/climber_still.png'

    // an anonymous reactive variable checks the position of the two images and dispatches 'done', when the climber has reached a certain distance to the top of the latter (change 150 to something else to tweak)
    $: {
        if(ladder && climber){
            ladder.style.transform = `translateY(${scroll/8}px)`
            if((ladder.getBoundingClientRect().top - 150) > climber.getBoundingClientRect().top) {
                console.log('ready to jump..')
                dispatch('done')
            }
        }
    }

</script>

<section>
    <h3>scroll to climb..</h3>
    <img bind:this={ladder} src='./img/ladder.png' class='ladder' alt='title' />
    <img bind:this={climber} src={src} alt='climber' class='climber'/>
</section>



<style>
    h3{
        position:absolute;
        bottom:4rem;
    }
    .ladder{
        width:200px;
        position:absolute;
        bottom:50%;
    }
    .climber{
        width:400px;
    }
</style>