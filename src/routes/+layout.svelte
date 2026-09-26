<script>
	import '$lib/styles/global.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/images/school-logo.png" />
	<link rel="apple-touch-icon" href="/images/school-logo.png" />
</svelte:head>

{@render children()}