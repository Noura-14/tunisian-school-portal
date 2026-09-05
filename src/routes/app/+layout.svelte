<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getContext, onMount, setContext } from 'svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { clearAuthenticatedUser, getAuthenticatedUser } from '$lib/auth.js';

	let { children } = $props();

	const navigationItems = [
		{ href: '/app', icon: 'home', ar: 'الرئيسية', en: 'Home' },
		{ href: '/app/students', icon: 'students', ar: 'التلاميذ', en: 'Students' },
		{ href: '/app/classes', icon: 'classes', ar: 'الأقسام', en: 'Classes' },
		{ href: '/app/attendance', icon: 'attendance', ar: 'الحضور', en: 'Attendance' },
		{ href: '/app/behaviour', icon: 'notifications', ar: 'السلوك', en: 'Behaviour' },
		{ href: '/app/settings', icon: 'settings', ar: 'الإعدادات', en: 'Settings' }
	];

	/** @type {{ language: 'ar' | 'en', theme: 'light' | 'dark', user: { name: string, nameAr: string, role: string, roleAr: string } | null, ready: boolean, drawerOpen: boolean }} */
	let appState = $state({
		language: 'ar',
		theme: 'light',
		user: null,
		ready: false,
		drawerOpen: false
	});
	setContext('app-state', appState);

	const isArabic = $derived(appState.language === 'ar');
	const direction = $derived(isArabic ? 'rtl' : 'ltr');
	const currentPath = $derived(page.url.pathname);
	const currentUser = $derived(appState.user);

	onMount(() => {
		const savedTheme = window.localStorage.getItem('school-theme');
		appState.theme = savedTheme === 'dark' ? 'dark' : 'light';
		appState.user = getAuthenticatedUser();
		appState.ready = true;
		document.documentElement.lang = appState.language;
		document.documentElement.dir = direction;

		if (!appState.user) {
			goto('/login');
		}

		return () => {
			document.documentElement.lang = 'ar';
			document.documentElement.dir = 'rtl';
		};
	});

	/** @param {'ar' | 'en'} nextLanguage */
	function setLanguage(nextLanguage) {
		appState.language = nextLanguage;
		document.documentElement.lang = nextLanguage;
		document.documentElement.dir = nextLanguage === 'ar' ? 'rtl' : 'ltr';
	}

	function toggleTheme() {
		appState.theme = appState.theme === 'light' ? 'dark' : 'light';
		window.localStorage.setItem('school-theme', appState.theme);
	}

	/** @param {string} href */
	function isActive(href) {
		return href === '/app' ? currentPath === '/app' : currentPath.startsWith(href);
	}

	function closeDrawer() {
		appState.drawerOpen = false;
	}

	/** @param {KeyboardEvent} event */
	function handleWindowKeydown(event) {
		if (event.key === 'Escape') {
			closeDrawer();
		}
	}

	function signOut() {
		clearAuthenticatedUser();
		appState.user = null;
		closeDrawer();
		goto('/login');
	}
</script>

<svelte:head>
	<title>{isArabic ? 'فضاء المتابعة | المدرسة التونسية بالدوحة' : 'Follow-up Portal | Tunisian School in Doha'}</title>
</svelte:head>

<svelte:window onkeydown={handleWindowKeydown} />

{#if appState.ready && currentUser}
	<main class:dark={appState.theme === 'dark'} class="application-shell" dir={direction}>
		<div class:open={appState.drawerOpen} class="drawer-backdrop" aria-hidden={!appState.drawerOpen} onclick={closeDrawer}></div>

		<aside class:open={appState.drawerOpen} class="application-sidebar" aria-label={isArabic ? 'التنقل الرئيسي' : 'Main navigation'}>
			<div class="sidebar-brand">
				<a href="/app" class="brand-link" onclick={closeDrawer}>
					<span><strong>{isArabic ? 'المدرسة التونسية' : 'Tunisian School'}</strong><small>{isArabic ? 'بالدوحة' : 'in Doha'}</small></span>
				</a>
				<button class="drawer-close" type="button" aria-label={isArabic ? 'إغلاق القائمة' : 'Close menu'} onclick={closeDrawer}>×</button>
			</div>

			<div class="branch-label">{isArabic ? 'فرع اللقطة' : 'Al-Luqta Branch'}</div>

			<nav class="main-nav" aria-label={isArabic ? 'أقسام التطبيق' : 'Application sections'}>
				{#each navigationItems as item}
					<a class:active={isActive(item.href)} class="nav-item" href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} onclick={closeDrawer}>
						<AppIcon name={item.icon} size={19} />
						<span>{isArabic ? item.ar : item.en}</span>
					</a>
				{/each}
			</nav>

			<div class="sidebar-bottom">
				<div class="sidebar-rule"></div>
				<button class="nav-item sign-out" type="button" onclick={signOut}>
					<AppIcon name="logout" size={19} />
					<span>{isArabic ? 'تسجيل الخروج' : 'Sign out'}</span>
				</button>
			</div>
		</aside>

		<div class="application-main">
			<header class="application-header">
				<button class="menu-button" type="button" aria-label={isArabic ? 'فتح القائمة' : 'Open menu'} aria-expanded={appState.drawerOpen} onclick={() => appState.drawerOpen = true}>
					<span></span><span></span><span></span>
				</button>

				<div class="header-school"><strong>{isArabic ? 'المدرسة التونسية بالدوحة' : 'Tunisian School in Doha'}</strong><span>{isArabic ? 'فرع اللقطة' : 'Al-Luqta Branch'}</span></div>

				<div class="header-actions">
					<div class="language-control" aria-label={isArabic ? 'اختيار اللغة' : 'Language selection'}>
						<button class:active={isArabic} type="button" aria-pressed={isArabic} onclick={() => setLanguage('ar')}>العربية</button>
						<span aria-hidden="true">|</span>
						<button class:active={!isArabic} type="button" aria-pressed={!isArabic} onclick={() => setLanguage('en')}>English</button>
					</div>
					<button class="theme-button" type="button" aria-label={isArabic ? (appState.theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح') : (appState.theme === 'light' ? 'Enable dark mode' : 'Enable light mode')} aria-pressed={appState.theme === 'dark'} onclick={toggleTheme}>
						<span aria-hidden="true">{appState.theme === 'light' ? '◐' : '○'}</span>
					</button>
					<div class="profile-summary">
						<span class="profile-initial" aria-hidden="true">{isArabic ? 'أ' : 'A'}</span>
						<span><strong>{isArabic ? currentUser.nameAr : currentUser.name}</strong><small>{isArabic ? currentUser.roleAr : currentUser.role}</small></span>
					</div>
				</div>
			</header>

			<section class="application-content">
				{@render children()}
			</section>
		</div>
	</main>
{:else}
	<div class="auth-check" aria-live="polite"></div>
{/if}

<style>
	.application-shell {
		--app-background: #faf8f5;
		--app-surface: #ffffff;
		--app-surface-strong: #ffffff;
		--app-surface-soft: #f5f1ee;
		--app-text: #292526;
		--app-muted: #756c6d;
		--app-border: #e5deda;
		--app-accent: #8a1538;
		--app-accent-dark: #6f102d;
		--app-accent-soft: #f5e9eb;
		--app-shadow: 0 12px 30px rgba(67, 42, 43, 0.06);
		display: flex;
		min-height: 100dvh;
		width: 100%;
		overflow-x: clip;
		background: var(--app-background);
		color: var(--app-text);
		transition: background-color 220ms ease, color 220ms ease;
	}

	.application-shell.dark {
		--app-background: #242021;
		--app-surface: #2d2829;
		--app-surface-strong: #352e30;
		--app-surface-soft: #3a3032;
		--app-text: #f5eeeb;
		--app-muted: #c3b3b0;
		--app-border: #514447;
		--app-accent: #bd7180;
		--app-accent-dark: #a95668;
		--app-accent-soft: #4a3037;
		--app-shadow: 0 12px 30px rgba(0, 0, 0, 0.16);
	}

	.application-sidebar {
		position: fixed;
		z-index: 10;
		top: 0;
		bottom: 0;
		right: 0;
		left: auto;
		display: flex;
		width: 16rem;
		flex-direction: column;
		box-shadow: 0 16px 40px rgba(39, 27, 29, 0.16);
		border-inline-start: 1px solid var(--app-border);
		background: var(--app-surface);
		transform: translateX(105%);
		pointer-events: none;
		transition: transform 220ms ease;
	}
	[dir='ltr'] .application-sidebar { right: auto; left: 0; border-inline-start: 0; border-inline-end: 1px solid var(--app-border); transform: translateX(-105%); }
	.application-sidebar.open { transform: translateX(0); pointer-events: auto; }

	.sidebar-brand { display: flex; align-items: center; justify-content: space-between; padding: 1.4rem 1.25rem 0.9rem; }
	.brand-link { display: flex; align-items: center; color: var(--app-text); text-decoration: none; }
	.brand-link span:last-child { display: flex; flex-direction: column; line-height: 1.25; }
	.brand-link strong { font-size: 0.8rem; }
	.brand-link small { color: var(--app-muted); font-size: 0.68rem; }
	.drawer-close { display: block; border: 0; background: transparent; color: var(--app-muted); cursor: pointer; font-size: 1.5rem; }
	.branch-label { padding: 0 1.25rem 1.4rem; color: var(--app-muted); font-size: 0.78rem; }
	.main-nav { display: flex; flex-direction: column; gap: 0.25rem; padding: 0 0.75rem; }
	.nav-item { display: flex; min-height: 2.9rem; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; border: 0; border-radius: 0.5rem; background: transparent; color: var(--app-muted); cursor: pointer; font: inherit; font-size: 0.93rem; text-decoration: none; transition: background-color 160ms ease, color 160ms ease; }
	.nav-item:hover { background: var(--app-accent-soft); color: var(--app-text); }
	.nav-item.active { background: color-mix(in srgb, var(--app-accent) 10%, var(--app-surface-strong)); color: var(--app-accent); font-weight: 700; }
	.nav-item.active::before { width: 0.2rem; height: 1.2rem; border-radius: 0.2rem; background: var(--app-accent); content: ''; }
	[dir='ltr'] .nav-item.active::before { order: 2; }
	.nav-item.active span { order: 2; }
	.sidebar-bottom { margin-top: auto; padding: 0 0.75rem 1.25rem; }
	.sidebar-rule { margin: 0 0 0.8rem; border-top: 1px solid var(--app-border); }
	.sign-out { width: 100%; }
	.sign-out:hover { color: var(--app-accent); }

	.application-main { min-width: 0; flex: 1; }
	.application-header { display: flex; min-height: 4.1rem; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0 1.25rem; border-bottom: 1px solid var(--app-border); background: var(--app-surface); }
	.header-school { display: flex; min-width: 0; flex-direction: column; line-height: 1.3; }
	.header-school strong { font-size: 0.95rem; }
	.header-school span { color: var(--app-muted); font-size: 0.75rem; }
	.header-actions, .language-control { display: flex; align-items: center; }
	.header-actions { gap: 1rem; }
	.language-control { gap: 0.35rem; color: var(--app-muted); font-size: 0.75rem; }
	.language-control button { padding: 0.4rem 0.1rem; border: 0; background: transparent; color: var(--app-muted); cursor: pointer; font: inherit; }
	.language-control button.active { color: var(--app-accent); font-weight: 700; }
	.theme-button { display: grid; width: 2.3rem; height: 2.3rem; place-items: center; border: 1px solid var(--app-border); border-radius: 0.5rem; background: var(--app-surface-strong); color: var(--app-accent); cursor: pointer; font-size: 1.1rem; }
	.profile-summary { display: flex; align-items: center; gap: 0.6rem; padding-inline-start: 1rem; border-inline-start: 1px solid var(--app-border); }
	.profile-summary > span:last-child { display: flex; flex-direction: column; line-height: 1.35; }
	.profile-summary strong { white-space: nowrap; font-size: 0.82rem; }
	.profile-summary small { color: var(--app-muted); font-size: 0.7rem; }
	.profile-initial { display: grid; width: 2.3rem; height: 2.3rem; place-items: center; border-radius: 50%; background: var(--app-accent-soft); color: var(--app-accent); font-weight: 700; }
	.menu-button { display: flex; width: 2.4rem; height: 2.4rem; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem; border: 1px solid var(--app-border); border-radius: 0.5rem; background: var(--app-surface-strong); color: var(--app-text); cursor: pointer; }
	.menu-button span { width: 1rem; border-top: 1.5px solid currentColor; }
	.application-content { width: min(100% - 2rem, 75rem); margin: 0 auto; padding: 1.5rem 0 2rem; }
	.drawer-backdrop { position: fixed; z-index: 9; inset: 0; display: block; visibility: hidden; pointer-events: none; background: rgba(35, 27, 29, 0.35); opacity: 0; transition: opacity 220ms ease, visibility 220ms ease; }
	.drawer-backdrop.open { visibility: visible; pointer-events: auto; opacity: 1; }
	.auth-check { min-height: 100dvh; background: var(--background); }

	.language-control button:focus-visible, .theme-button:focus-visible, .nav-item:focus-visible, .drawer-close:focus-visible, .menu-button:focus-visible, .brand-link:focus-visible { outline: 3px solid color-mix(in srgb, var(--app-accent) 35%, transparent); outline-offset: 3px; }

	@media (max-width: 699px) {
		.application-sidebar { width: min(84vw, 19rem); }
		.application-header { min-height: 3.8rem; padding: 0 0.75rem; }
		.header-school { flex: 1; text-align: center; }
		.header-school strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; }
		.header-actions { gap: 0.45rem; }
		.language-control { display: none; }
		.profile-summary { padding-inline-start: 0.45rem; border-inline-start: 0; }
		.profile-summary > span:last-child { display: none; }
		.profile-initial { width: 2.25rem; height: 2.25rem; }
		.application-content { width: min(100% - 1.25rem, 40rem); padding: 1rem 0 1.5rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		*, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: 0.01ms !important; }
	}
</style>
