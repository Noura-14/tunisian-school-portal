<script>
	import { getContext } from 'svelte';

	const appState = getContext('app-state');
	const isArabic = $derived(appState.language === 'ar');

	/** @param {'ar' | 'en'} language */
	function setLanguage(language) {
		appState.language = language;
		document.documentElement.lang = language;
		document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
	}

	/** @param {'light' | 'dark'} theme */
	function setTheme(theme) {
		appState.theme = theme;
		window.localStorage.setItem('school-theme', theme);
	}
</script>

<svelte:head><title>{isArabic ? 'الإعدادات | فضاء المتابعة' : 'Settings | Follow-up Portal'}</title></svelte:head>

<section class="settings-page" aria-labelledby="settings-title">
	<header class="page-heading"><div><p class="eyebrow">{isArabic ? 'تخصيص الفضاء' : 'Portal preferences'}</p><h1 id="settings-title">{isArabic ? 'الإعدادات' : 'Settings'}</h1><p>{isArabic ? 'إدارة اللغة والمظهر ومعلومات الحساب.' : 'Manage language, appearance, and account information.'}</p></div></header>
	<div class="settings-list">
		<section class="setting-row" aria-labelledby="language-setting"><div><h2 id="language-setting">{isArabic ? 'اللغة' : 'Language'}</h2><p>{isArabic ? 'اختر لغة فضاء المتابعة.' : 'Choose the portal language.'}</p></div><div class="segmented-control"><button class:active={isArabic} type="button" onclick={() => setLanguage('ar')}>العربية</button><button class:active={!isArabic} type="button" onclick={() => setLanguage('en')}>English</button></div></section>
		<section class="setting-row" aria-labelledby="theme-setting"><div><h2 id="theme-setting">{isArabic ? 'المظهر' : 'Theme'}</h2><p>{isArabic ? 'اختر المظهر الفاتح أو الداكن.' : 'Choose a light or dark appearance.'}</p></div><div class="segmented-control"><button class:active={appState.theme === 'light'} type="button" onclick={() => setTheme('light')}>{isArabic ? 'فاتح' : 'Light'}</button><button class:active={appState.theme === 'dark'} type="button" onclick={() => setTheme('dark')}>{isArabic ? 'داكن' : 'Dark'}</button></div></section>
		<section class="setting-row account-row" aria-labelledby="account-setting"><div><h2 id="account-setting">{isArabic ? 'الحساب' : 'Account'}</h2><p>{isArabic ? 'المستخدم المسجل حالياً.' : 'Currently signed-in user.'}</p></div><div class="account-detail"><strong>{isArabic ? appState.user.nameAr : appState.user.name}</strong><span>{isArabic ? appState.user.roleAr : appState.user.role}</span></div></section>
	</div>
</section>

<style>
	.settings-page { animation: page-enter 400ms ease both; }
	.page-heading { margin-bottom: 1.5rem; }
	.eyebrow { margin: 0 0 0.45rem; color: var(--app-accent); font-size: 0.8rem; font-weight: 700; }
	h1, h2, p { margin-top: 0; }
	h1 { margin-bottom: 0.45rem; font-size: clamp(1.8rem, 5vw, 2.5rem); }
	.page-heading p:last-child { margin: 0; color: var(--app-muted); font-size: 1rem; line-height: 1.7; }
	.settings-list { max-width: 62rem; border: 1px solid var(--app-border); background: var(--app-surface); box-shadow: var(--app-shadow); }
	.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; padding: 1.25rem; border-bottom: 1px solid var(--app-border); }
	.setting-row:last-child { border-bottom: 0; }
	.setting-row h2 { margin-bottom: 0.3rem; font-size: 1rem; }
	.setting-row p { margin: 0; color: var(--app-muted); font-size: 0.85rem; }
	.segmented-control { display: flex; gap: 0.25rem; padding: 0.2rem; border: 1px solid var(--app-border); background: var(--app-surface-strong); }
	.segmented-control button { min-height: 2.4rem; padding: 0.45rem 0.7rem; border: 0; background: transparent; color: var(--app-muted); cursor: pointer; font: inherit; font-size: 0.82rem; }
	.segmented-control button.active { background: var(--app-accent-soft); color: var(--app-accent); font-weight: 700; }
	.account-detail { display: flex; flex-direction: column; gap: 0.25rem; text-align: end; }
	.account-detail span { color: var(--app-muted); font-size: 0.8rem; }
	.segmented-control button:focus-visible { outline: 3px solid color-mix(in srgb, var(--app-accent) 35%, transparent); outline-offset: 2px; }
	@keyframes page-enter { from { opacity: 0; transform: translateY(0.45rem); } to { opacity: 1; transform: translateY(0); } }
	@media (max-width: 600px) { .setting-row { align-items: stretch; flex-direction: column; gap: 0.9rem; } .segmented-control { align-self: flex-start; } .account-detail { text-align: start; } }
	@media (prefers-reduced-motion: reduce) { .settings-page { animation: none; } }
</style>
