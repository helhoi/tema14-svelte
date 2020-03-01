<script>
import Climb from './components/even/Climb.svelte'
import Jump from './components/even/Jump.svelte'
import KellyWorld from './components/kelly/KellyWorld.svelte'
import KellyUnderwater from './components/kelly/KellyUnderwater.svelte'
import IngridJump from './components/ingridmarie/IngridJump.svelte'
import { scrollStop } from './helpers/helpers.js'

let warning = ''


//add scenes here
let scenes = ['climb', 'jump', 'kellyworld', 'kellyunderwater', 'ingridjump']

//current scene is..
let sceneIndex = 1

//window properties
let y, x, h, w

//switch scenes by typing a number 0, 1, 2, 3 etc..
const handleKeydown = e => {
	if(!isNaN(e.key) && e.key < scenes.length) changeScene(e.key)
}

//scroll handlers - see the status window 
let isScrolling = false
window.addEventListener('scroll', () => isScrolling = true)
$: scrollStop( () => isScrolling = false )

//change scene function - is called either on keypress or by the modules, whenever they dispatch 'done'
const changeScene = nr => {
	console.log("scene index ",sceneIndex)
	//reset scroll
	y = 0
	window.scrollTo(0,0)
	if(!isNaN(nr)){sceneIndex=nr;return}
	sceneIndex = sceneIndex == scenes.length ? 0 : parseInt(sceneIndex) + 1
	console.log("scene index " + sceneIndex)
}


</script>

<!-- in Svelte you can get all sorts of bindings on the window - if needed save one in a variable and pass it down as a prop to the subcomponents -->
<svelte:window 
	on:keydown={handleKeydown} 
	bind:scrollX={x} 
	bind:scrollY={y} 
	bind:innerHeight={h} 
	bind:innerWidth={w} />

<main>
	<!-- display showing scroll, scene etc -->
	<div class='status'>
		<span>y pos</span><span>{Math.round(y)}</span>
		<span>scrolling</span><span>{isScrolling}</span>
		<span>scene</span><span>{ scenes[sceneIndex] }</span>
	</div>
	<!-- 
	depending on the current sceneIndex, show components 
	note the on:done={changeScene} on each component - check Climb.svelte to see how it works 
	-->
	{#if sceneIndex == 0}
		<Climb scroll={y} 	on:done={changeScene} isScrolling={isScrolling}/>
	{:else if sceneIndex == 1}
		<Jump scroll={y} 	on:done={changeScene} width={w}/>
	{:else if sceneIndex == 2}
		<KellyWorld scroll={y} 	on:done={changeScene}/>
	{:else if sceneIndex == 3}
		<KellyUnderwater scroll={y}	on:done={changeScene}/>
	{:else if sceneIndex == 4}
		<IngridJump scroll={y}	on:done={changeScene}/>
	{/if}

</main>
	{#if w < 1100}
		<div class='message'>
			 <h1>Best viewed on desktop</h1>
		</div>
	{/if}


<style>
	
	@import url('https://fonts.googleapis.com/css?family=Open+Sans&display=swap');
    .message{
		position:fixed;
		top:0;
		left:0;
		width:100vw;
		height:100vh;
		display:grid;
		place-items:center;
		font-size: 50px;
		text-align: center;
		color: white;
		background-color: black;
	}
	.status{
        position:fixed;
        left:2rem;
        top:2rem;
        background:rgba(0,0,0,.5);
		border-radius:1rem;
        display: grid;
		grid-template-columns:1fr 1fr;
		gap:0 1rem;
        padding:1rem;
        color:white;
		z-index: 10;
		/* display:none; */
    }
	main{
		min-height:9145px;
		overflow:scroll;
	}

	:global(section){
		position:fixed;
        top:0;
        left:0;
		width:100vw;
		height:100vh;
		display:grid;
		place-items:center;
		color:gray;
		font-weight:300;
	}

	:global(html, body){
		font-family:'Open Sans';
		margin:0;
		padding:0;		
	}
	:global(*){
		box-sizing:border-box;
	}
</style>