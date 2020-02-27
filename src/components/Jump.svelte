<script>
    import { createEventDispatcher } from 'svelte'      
    import Man from './Man.svelte'


    const dispatch = createEventDispatcher()

    export let scroll, width

    let man, manIsDangerouslyCloseToTheEnd = false

    let ladder
    let land


 $: {
        if(ladder && land){
            ladder.style.transform = `translateY(${scroll/8}px)`
            land.style.transform = `translateY(${scroll/12}px)`
            if(scroll >= 5000) {
                console.log('stige sin topp er nå: ', ladder.getBoundingClientRect().top)
                console.log('ready to jump..')
                dispatch('done')
            }
        }
    }

</script>

<section>

    {#if scroll <= 500}
        <Man src='./img/1.png' moveUp='100'/>
    {:else if scroll >= 501 && scroll <= 550 }
        <Man src='./img/2.png' />
    {:else if scroll >= 601 && scroll <= 701}
        <Man src='./img/3.png' moveForward='-100' />
    {:else if scroll >= 701 && scroll <= 801}
        <Man src='./img/4.png' moveForward='-130' />
    {:else if scroll >= 801 && scroll <= 901}
        <Man src='./img/5.png' moveForward='-130' />
    {:else if scroll >= 901 && scroll <= 1001}
        <Man src='./img/6.png' moveForward='-230' />
    {:else if scroll >= 1001 && scroll <= 1101}
        <Man src='./img/7.png' moveUp='250' moveForward='-400' />
    {:else if scroll >= 1101 && scroll <= 2101}
        <Man src='./img/8.png' moveUp='550' moveForward='-400' />
    {:else if scroll >= 2101 && scroll <= 2201}
        <Man src='./img/9.png' moveUp='850' moveForward='-400' />
    {/if}

    <img bind:this={ladder} src='./img/stige.png' class='stige' alt='title' />
    <img bind:this={land} src='./img/bkgr-land.jpg' alt='title' class='land' />

</section>



<style>
    
    h4{
        position:absolute;
    }
    .stige{
        width:600px;
        top:200px;
        position:absolute;
    }
   

    .land{
        width: 100vw;
        height: 100vh;
        overflow-y: auto;
        position: relative;
        z-index: -2;
        background-position: center;
        background-repeat: no-repeat;
        background-size: contain;
    }

</style>