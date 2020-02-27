<script>
    import { createEventDispatcher } from 'svelte'      
    import Man from './Man.svelte'


    const dispatch = createEventDispatcher()

    export let scroll, width

    let man, manIsDangerouslyCloseToTheEnd = false

    let ladder
    let land

    $: {
        if(scroll > 2001){
            ladder.style.transform = `translateY(-${(scroll-2001) *.6}px)`
            land.style.transform = `translateY(-${scroll-2001}px)`
        }
        if(scroll > 5000){
            ladder.style.opacity = (6000 - scroll) / 1000;
        }
    }

</script>

<section>

    {#if scroll <= 500}
        <Man src='./img/even/1.png' moveUp='100'/>
    {:else if scroll >= 500 && scroll <= 800}
        <Man src='./img/even/2.png' />
    {:else if scroll >= 801 && scroll <= 1000}
        <Man src='./img/even/3.png' moveForward='-100' />
    {:else if scroll >= 1001 && scroll <= 1300 }
        <Man src='./img/even/4.png' moveForward='-130' moveUp='-25' />
    {:else if scroll >= 1301 && scroll <= 1500 }
        <Man src='./img/even/5.png' moveForward='-130' moveUp='-25'/>
    {:else if scroll >= 1501 && scroll <= 1800}
        <Man src='./img/even/6.png' moveForward='-230' moveUp='-25'/>
    {:else if scroll >= 1801 && scroll <= 2000 }
        <Man src='./img/even/7.png' moveUp='250' moveForward='-400' />
    {:else if scroll >= 2001 && scroll <= 2300}
        <Man src='./img/even/8.png' moveUp='250' moveForward='-400' />
    {:else if scroll >= 2301 && scroll <= 2600 }
        <Man src='./img/even/9.png' moveUp='250' moveForward='-400' />
    {:else if scroll >= 2600 && scroll <= 3959 }
        <Man src='./img/even/9.png' moveUp='250' moveForward='-400' />

    {:else if scroll >= 3960 && scroll <= 4100}
        <Man src='./img/even/vann1.png' moveUp='250' moveForward='-400' />
    {:else if scroll >= 4001 && scroll <= 4300}
        <Man src='./img/even/vann2.png' moveUp='250' moveForward='-400' />
    {:else if scroll >= 4301 && scroll <= 4600 }
        <Man src='./img/even/vann3.png' moveUp='250' moveForward='-400' />
    {:else if scroll > 4601}
        <Man scroll={scroll} src='./img/even/vann4.png' moveUp='250' moveForward='-400' />


    {/if}

    <img bind:this={ladder} src='./img/even/langstige.png' class='stige' alt='title' />
    <img bind:this={land} src='./img/even/bakgrunn.png' alt='title' class='land' />

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
        max-width: 100vw;
        overflow: scroll;    
        z-index: -2;
        align-self:start;
        object-position: 0 -1450px;
    }

</style>