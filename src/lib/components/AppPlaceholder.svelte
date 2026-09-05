<script>
	import { getContext } from 'svelte';

	let { titleAr, titleEn, descriptionAr, descriptionEn } = $props();
	const appState = getContext('app-state');
	const isArabic = $derived(appState.language === 'ar');
</script>

<section class="placeholder-view" aria-labelledby="placeholder-title">
	<p class="eyebrow">{isArabic ? 'قريباً' : 'Coming soon'}</p>
	<h1 id="placeholder-title">{isArabic ? titleAr : titleEn}</h1>
	<p>{isArabic ? descriptionAr : descriptionEn}</p>
</section>

<style>
	.placeholder-view { max-width: 42rem; padding: 2rem; border: 1px solid var(--app-border); background: var(--app-surface); box-shadow: var(--app-shadow); animation: placeholder-enter 400ms ease both; }
	.eyebrow { margin: 0 0 0.7rem; color: var(--app-accent); font-size: 0.82rem; font-weight: 700; }
	h1 { margin: 0 0 0.8rem; font-size: clamp(1.6rem, 5vw, 2.2rem); }
	p:last-child { margin: 0; color: var(--app-muted); font-size: 1rem; line-height: 1.8; }
	@keyframes placeholder-enter { from { opacity: 0; transform: translateY(0.5rem); } to { opacity: 1; transform: translateY(0); } }
	@media (max-width: 480px) { .placeholder-view { padding: 1.5rem; } }
	@media (prefers-reduced-motion: reduce) { .placeholder-view { animation: none; } }
</style>
