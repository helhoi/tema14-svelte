<script>
    import { createEventDispatcher } from 'svelte'      
    import Man from './Man.svelte'


    const dispatch = createEventDispatcher()

    export let scroll, width

    let man, manIsDangerouslyCloseToTheEnd = false

    let backgroundWater
    let ladder
    let detailOne
    let detailTwo
    let details

</script>

<section>

    {#if scroll >= 10}
        <Man src='./img/Kelly/5Ser.png' moveUp='130' />
    {/if}

    <img bind:this={backgroundWater} src='./img/Kelly/kelly-underwater.png' class='backgroundKelly' alt='Background' />
    <img bind:this={detailOne} src='./img/Kelly/parallax1.png' class='parallax1' alt='Background' />
    <img bind:this={detailTwo} src='./img/Kelly/parallax2.png' class='parallax2' alt='Background' />
    <img bind:this={details} src='./img/Kelly/details.png' class='details' alt='Background' />
    
</section>

<style>
    h3{
        position:absolute;
        bottom:4rem;
    }
    
    h4{
        position:absolute;
    }
    .stige{
        width:600px;
        top:300px;
        position: fixed;
        z-index: 1;  
        margin-left: 25%;
    }
   section{
        min-width: 90vw;
        min-height: 4000px;
        overflow-y: auto;
        position: relative;
        z-index: -2;
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
    }

    img.backgroundKelly{
        top: 0px;
        position: absolute;
        z-index: -3;
        height: 4000px;
         background-attachment: fixed;
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
    }

    img.parallax1{
        z-index: 2;
        position: fixed;
        width: 100vw;
        float: left;
        left: -100px;
        top: -50px;
    }

     img.parallax2{
        z-index: 3;
        position: fixed;
        width: 100vw;
        float: right;
        right: -100px;
        top: -50px;
    }
    .man {
        position: fixed;
        
    }

    img.details {
        width: 50vw;
        z-index: 5;
        position: fixed;
        justify-content: center;
        margin-left: 30%;
    }
    :global(body) {
        height: auto;
    }

</style>