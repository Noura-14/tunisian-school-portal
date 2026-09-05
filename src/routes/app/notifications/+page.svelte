<script>
	import { getContext } from 'svelte';
	import { temporaryNotifications } from '$lib/data/school.js';

	const appState = getContext('app-state');
	const isArabic = $derived(appState.language === 'ar');
</script>

<svelte:head><title>{isArabic ? 'التنبيهات | فضاء المتابعة' : 'Notifications | Follow-up Portal'}</title></svelte:head>

<section class="notifications-page" aria-labelledby="notifications-title">
	<header class="page-heading"><div><p class="eyebrow">{isArabic ? 'المتابعة المدرسية' : 'School follow-up'}</p><h1 id="notifications-title">{isArabic ? 'التنبيهات' : 'Notifications'}</h1><p>{isArabic ? 'اطلع على التنبيهات والملاحظات المهمة.' : 'Review important school notifications and notes.'}</p></div></header>
	<div class="notification-list">
		{#each temporaryNotifications as notification}
			<article class="notification-item"><span class="notification-marker" aria-hidden="true"></span><div><h2>{isArabic ? notification.arTitle : notification.enTitle}</h2><p>{isArabic ? notification.arText : notification.enText}</p><small>{notification.date}</small></div></article>
		{/each}
	</div>
</section>

<style>
	.notifications-page { animation: page-enter 400ms ease both; }
	.page-heading { margin-bottom: 1.5rem; }
	.eyebrow { margin: 0 0 0.45rem; color: var(--app-accent); font-size: 0.8rem; font-weight: 700; }
	h1, h2, p { margin-top: 0; }
	h1 { margin-bottom: 0.45rem; font-size: clamp(1.8rem, 5vw, 2.5rem); }
	.page-heading p:last-child { margin: 0; color: var(--app-muted); font-size: 1rem; line-height: 1.7; }
	.notification-list { display: grid; max-width: 56rem; border: 1px solid var(--app-border); background: var(--app-surface); box-shadow: var(--app-shadow); }
	.notification-item { display: flex; gap: 0.8rem; padding: 1.1rem; border-bottom: 1px solid var(--app-border); }
	.notification-item:last-child { border-bottom: 0; }
	.notification-marker { width: 0.55rem; height: 0.55rem; flex: 0 0 0.55rem; margin-top: 0.45rem; border-radius: 50%; background: var(--app-accent); }
	.notification-item h2 { margin-bottom: 0.35rem; font-size: 1rem; }
	.notification-item p { margin-bottom: 0.5rem; color: var(--app-muted); line-height: 1.7; }
	.notification-item small { color: var(--app-muted); font-size: 0.75rem; }
	@keyframes page-enter { from { opacity: 0; transform: translateY(0.45rem); } to { opacity: 1; transform: translateY(0); } }
	@media (prefers-reduced-motion: reduce) { .notifications-page { animation: none; } }
</style>
