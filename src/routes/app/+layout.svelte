<script>
	import { page } from '$app/state';
import { goto } from '$app/navigation';
import { getContext, onMount, setContext } from 'svelte';
import AppIcon from '$lib/components/AppIcon.svelte';

	let { children } = $props();

	const navigationItems = [
		{ href: '/app', icon: 'home', ar: 'الرئيسية', en: 'Home' },
		{ href: '/app/classes', icon: 'classes', ar: 'الأقسام', en: 'Classes' },
		{ href: '/app/absences', icon: 'attendance', ar: 'الغيابات', en: 'Absences' },
		{ href: '/app/behaviour', icon: 'notifications', ar: 'السلوك', en: 'Behaviour' },
		{ href: '/app/history', icon: 'attendance', ar: 'السجل', en: 'History' }
	];

	/** @type {{ language: 'ar' | 'en', theme: 'light' | 'dark', user: { name: string, nameAr: string, role: string, roleAr: string } | null, ready: boolean, drawerOpen: boolean }} */
	let appState = $state({
		language: 'ar',
		theme: 'light',
		user: null,
		ready: false,
		drawerOpen: false,
	});

	setContext('app-state', appState);

	const isArabic = $derived(appState.language === 'ar');
	const direction = $derived(isArabic ? 'rtl' : 'ltr');
	const currentPath = $derived(page.url.pathname);
	const currentUser = $derived(appState.user);

	onMount(() => {
	const savedTheme = window.localStorage.getItem('school-theme');
	appState.theme = savedTheme === 'dark' ? 'dark' : 'light';

	document.documentElement.lang = appState.language;
	document.documentElement.dir = direction;

	async function checkSession() {
		try {
			const response = await fetch('/api/auth/session');
			const result = await response.json();

			if (response.ok && result.authenticated) {
				appState.user = result.user;
			} else {
				appState.user = null;
				goto('/login');
			}
		} catch (error) {
			console.error('Session check failed:', error);
			appState.user = null;
			goto('/login');
		} finally {
			appState.ready = true;
		}
	}

	checkSession();

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

async function signOut() {
	try {
		await fetch('/api/auth/logout', {
			method: 'POST'
		});
	} catch (error) {
		console.error('Logout error:', error);
	} finally {
		appState.user = null;
		closeDrawer();
		goto('/login');
	}
}

</script>

<svelte:head>
	<title>
		{isArabic
			? 'فضاء المتابعة | المدرسة التونسية بالدوحة'
			: 'Follow-up Portal | Tunisian School in Doha'}
	</title>
</svelte:head>

<svelte:window onkeydown={handleWindowKeydown} />

{#if appState.ready && currentUser}
	<main
		class:dark={appState.theme === 'dark'}
		class="application-shell"
		dir={direction}
	>
		<!-- DRAWER BACKDROP -->
		<div
			class:open={appState.drawerOpen}
			class="drawer-backdrop"
			aria-hidden={!appState.drawerOpen}
			onclick={closeDrawer}
		></div>

		<!-- SLIDE-OUT SIDEBAR -->
		<aside
			class:open={appState.drawerOpen}
			class="application-sidebar"
			aria-label={isArabic ? 'التنقل الرئيسي' : 'Main navigation'}
		>
			<div class="sidebar-brand">
				<a
					href="/app"
					class="sidebar-brand-link"
					onclick={closeDrawer}
				>
					<div class="sidebar-logo">
						<img src="/images/school-logo.png" alt="TSD" />
					</div>

					<div class="sidebar-brand-text">
						<strong>
							{isArabic ? 'المدرسة التونسية بالدوحة' : 'Tunisian School in Doha'}
						</strong>

						<span>
							{isArabic
								? 'فرع اللقطة — إعدادي وثانوي'
								: 'Al-Luqta Branch — Preparatory & Secondary'}
						</span>
					</div>
				</a>

				<button
					class="drawer-close"
					type="button"
					aria-label={isArabic ? 'إغلاق القائمة' : 'Close menu'}
					onclick={closeDrawer}
				>
					<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path
							d="M6 6L18 18"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
						/>
						<path
							d="M18 6L6 18"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</div>

			<div class="sidebar-branch">
				<span>{isArabic ? 'فرع اللقطة' : 'AL-LUQTA BRANCH'}</span>
			</div>

			<div class="sidebar-divider"></div>

			<nav
				class="main-nav"
				aria-label={isArabic ? 'أقسام التطبيق' : 'Application sections'}
			>
				<div class="nav-label">
					{isArabic ? 'القائمة الرئيسية' : 'MAIN MENU'}
				</div>

				{#each navigationItems as item}
					<a
						class:active={isActive(item.href)}
						class="nav-item"
						href={item.href}
						aria-current={isActive(item.href) ? 'page' : undefined}
						onclick={closeDrawer}
					>
						<span class="nav-icon">
							<AppIcon name={item.icon} size={19} />
						</span>

						<span class="nav-text">
							{isArabic ? item.ar : item.en}
						</span>

						{#if isActive(item.href)}
							<span class="nav-active-dot"></span>
						{/if}
					</a>
				{/each}
			</nav>

			<div class="sidebar-bottom">
				<div class="sidebar-user">
					<div class="sidebar-user-avatar">
						{isArabic ? 'أ' : 'A'}
					</div>

					<div>
						<strong>
							{isArabic ? currentUser.nameAr : currentUser.name}
						</strong>

						<span>
							{isArabic ? currentUser.roleAr : currentUser.role}
						</span>
					</div>
				</div>
			</div>
		</aside>

		<!-- APPLICATION -->
		<div class="application-main">
			<header class="application-header">
				<!-- MENU -->
				<button
					class="menu-button"
					type="button"
					aria-label={isArabic ? 'فتح القائمة' : 'Open menu'}
					aria-expanded={appState.drawerOpen}
					onclick={() => (appState.drawerOpen = true)}
				>
					<span></span>
					<span></span>
					<span></span>
				</button>

				<!-- SCHOOL BRAND -->
				<a class="header-brand" href="/app">
					<div class="header-logo">
						<img src="/images/school-logo.png" alt="TSD" />
					</div>

					<div class="header-school">
						<strong>
							{isArabic
								? 'المدرسة التونسية بالدوحة'
								: 'Tunisian School in Doha'}
						</strong>

						<span>
							{isArabic ? 'فرع اللقطة' : 'Al-Luqta Branch'}
						</span>
					</div>
				</a>

				<div class="header-spacer"></div>

				<!-- HEADER ACTIONS -->
				<div class="header-actions">
					<div
						class="language-control"
						aria-label={isArabic ? 'اختيار اللغة' : 'Language selection'}
					>
						<button
							class:active={isArabic}
							type="button"
							aria-pressed={isArabic}
							onclick={() => setLanguage('ar')}
						>
							العربية
						</button>

						<span aria-hidden="true">•</span>

						<button
							class:active={!isArabic}
							type="button"
							aria-pressed={!isArabic}
							onclick={() => setLanguage('en')}
						>
							English
						</button>
					</div>

					<button
						class="theme-button"
						type="button"
						aria-label={
							isArabic
								? appState.theme === 'light'
									? 'تفعيل الوضع الداكن'
									: 'تفعيل الوضع الفاتح'
								: appState.theme === 'light'
									? 'Enable dark mode'
									: 'Enable light mode'
						}
						aria-pressed={appState.theme === 'dark'}
						onclick={toggleTheme}
					>
						{#if appState.theme === 'light'}
							<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path
									d="M12 3v2"
									stroke="currentColor"
									stroke-width="1.7"
									stroke-linecap="round"
								/>
								<path
									d="M12 19v2"
									stroke="currentColor"
									stroke-width="1.7"
									stroke-linecap="round"
								/>
								<path
									d="M3 12h2"
									stroke="currentColor"
									stroke-width="1.7"
									stroke-linecap="round"
								/>
								<path
									d="M19 12h2"
									stroke="currentColor"
									stroke-width="1.7"
									stroke-linecap="round"
								/>
								<circle
									cx="12"
									cy="12"
									r="4"
									stroke="currentColor"
									stroke-width="1.7"
								/>
							</svg>
						{:else}
							<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path
									d="M20 15.4A8.5 8.5 0 0 1 8.6 4a8.5 8.5 0 1 0 11.4 11.4Z"
									stroke="currentColor"
									stroke-width="1.7"
									stroke-linejoin="round"
								/>
							</svg>
						{/if}
					</button>

					<div class="profile-identity" aria-label={`${isArabic ? currentUser.nameAr : currentUser.name}, ${isArabic ? currentUser.roleAr : currentUser.role}`}>
						<div class="profile-avatar" aria-hidden="true">{isArabic ? 'أ' : 'A'}</div>
						<div class="profile-text"><strong>{isArabic ? currentUser.nameAr : currentUser.name}</strong><small>{isArabic ? currentUser.roleAr : currentUser.role}</small></div>
					</div>
					<button class="logout-button" type="button" aria-label={isArabic ? 'تسجيل الخروج' : 'Sign out'} title={isArabic ? 'تسجيل الخروج' : 'Sign out'} onclick={signOut}><AppIcon name="logout" size={18} /></button>
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
		--app-background: #f7f3ef;
		--app-surface: #ffffff;
		--app-surface-strong: #ffffff;
		--app-surface-soft: #f3eeea;
		--app-text: #2e292a;
		--app-muted: #766c6d;
		--app-border: #e3d9d4;
		--app-accent: #8a1538;
		--app-accent-dark: #6f102d;
		--app-accent-soft: #f3e5e9;
		--app-success: #4d8a68;
		--app-danger: #b33d4e;
		--app-shadow: 0 10px 30px rgba(67, 42, 43, 0.055);

		display: flex;
		width: 100%;
		min-height: 100dvh;
		overflow-x: clip;
		background: var(--app-background);
		color: var(--app-text);
		transition:
			background-color 220ms ease,
			color 220ms ease;
	}

	.application-shell.dark {
		--app-background: #252122;
		--app-surface: #302a2c;
		--app-surface-strong: #382f31;
		--app-surface-soft: #3b3234;
		--app-text: #f7efec;
		--app-muted: #c5b7b4;
		--app-border: #514547;
		--app-accent: #c57989;
		--app-accent-dark: #d08a99;
		--app-accent-soft: #4b3037;
		--app-success: #78ae8e;
		--app-danger: #e18b99;
		--app-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
	}

	/* ================================
	   SIDEBAR
	================================ */

	.application-sidebar {
		position: fixed;
		z-index: 100;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		width: min(19rem, 86vw);
		flex-direction: column;
		border-inline-start: 1px solid var(--app-border);
		background: var(--app-surface);
		box-shadow: -18px 0 50px rgba(43, 27, 30, 0.12);
		transform: translateX(105%);
		pointer-events: none;
		transition:
			transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
			box-shadow 300ms ease;
	}

	[dir='ltr'] .application-sidebar {
		right: auto;
		left: 0;
		border-inline-start: 0;
		border-inline-end: 1px solid var(--app-border);
		box-shadow: 18px 0 50px rgba(43, 27, 30, 0.12);
		transform: translateX(-105%);
	}

	.application-sidebar.open {
		transform: translateX(0);
		pointer-events: auto;
	}

	.sidebar-brand {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.35rem 1.2rem 1rem;
	}

	.sidebar-brand-link {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.7rem;
		color: var(--app-text);
		text-decoration: none;
	}

	.sidebar-logo {
		display: grid;
		width: 2.9rem;
		height: 2.9rem;
		flex: 0 0 2.9rem;
		place-items: center;
		width: 1rem;
		height: 1rem;
	}

	.drawer-close:hover {
		border-color: var(--app-accent);
		color: var(--app-accent);
	}

	.sidebar-branch {
		padding: 0 1.2rem 0.9rem;
		color: var(--app-accent);
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.06em;
	}

	.sidebar-divider {
		margin: 0 1.2rem 1rem;
		border-top: 1px solid var(--app-border);
	}

	.main-nav {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0 0.7rem;
	}

	.nav-label {
		padding: 0.2rem 0.65rem 0.55rem;
		color: var(--app-muted);
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.12em;
	}

	.nav-item {
		position: relative;
		display: flex;
		min-height: 3rem;
		align-items: center;
		gap: 0.7rem;
		padding: 0.65rem 0.7rem;
		border: 1px solid transparent;
		border-radius: 0.65rem;
		background: transparent;
		color: var(--app-muted);
		cursor: pointer;
		font: inherit;
		font-size: 0.9rem;
		text-decoration: none;
		transition:
			background-color 170ms ease,
			border-color 170ms ease,
			color 170ms ease,
			transform 170ms ease;
	}

	.nav-item:hover {
		border-color: var(--app-border);
		background: var(--app-surface-soft);
		color: var(--app-text);
		transform: translateX(-1px);
	}

	[dir='ltr'] .nav-item:hover {
		transform: translateX(1px);
	}

	.nav-item.active {
		border-color: color-mix(in srgb, var(--app-accent) 12%, var(--app-border));
		background: var(--app-accent-soft);
		color: var(--app-accent);
		font-weight: 750;
	}

	.nav-icon {
		display: grid;
		width: 2.15rem;
		height: 2.15rem;
		flex: 0 0 2.15rem;
		place-items: center;
		border-radius: 0.5rem;
		background: transparent;
		transition: background-color 170ms ease;
	}

	.nav-item.active .nav-icon {
		background: var(--app-surface);
		box-shadow: 0 3px 10px rgba(70, 35, 44, 0.06);
	}

	.nav-text {
		flex: 1;
	}

	.nav-active-dot {
		width: 0.35rem;
		height: 0.35rem;
		flex: 0 0 0.35rem;
		border-radius: 50%;
		background: var(--app-accent);
	}

	.sidebar-bottom {
		margin-top: auto;
		padding: 1rem 0.8rem 1.1rem;
	}

	.sidebar-user {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.75rem;
		border: 1px solid var(--app-border);
		border-radius: 0.7rem;
		background: var(--app-surface-soft);
	}

	.sidebar-user-avatar {
		display: grid;
		width: 2.35rem;
		height: 2.35rem;
		flex: 0 0 2.35rem;
		place-items: center;
		border-radius: 50%;
		background: var(--app-accent-soft);
		color: var(--app-accent);
		font-weight: 800;
	}

	.sidebar-user > div:last-child {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 0.15rem;
	}

	.sidebar-user strong {
		overflow: hidden;
		font-size: 0.75rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sidebar-user span {
		color: var(--app-muted);
		font-size: 0.66rem;
	}


	/* ================================
	   BACKDROP
	================================ */

	.drawer-backdrop {
		position: fixed;
		z-index: 90;
		inset: 0;
		visibility: hidden;
		background: rgba(39, 27, 29, 0.34);
		opacity: 0;
		pointer-events: none;
		backdrop-filter: blur(2px);
		transition:
			opacity 300ms ease,
			visibility 300ms ease;
	}

	.drawer-backdrop.open {
		visibility: visible;
		opacity: 1;
		pointer-events: auto;
	}

	/* ================================
	   HEADER
	================================ */

	.application-main {
		min-width: 0;
		flex: 1;
	}

	.application-header {
		position: sticky;
		z-index: 20;
		top: 0;
		display: flex;
		min-height: 4.35rem;
		align-items: center;
		gap: 0.85rem;
		padding: 0 1.35rem;
		border-bottom: 1px solid var(--app-border);
		background: color-mix(in srgb, var(--app-surface) 94%, transparent);
		box-shadow: 0 4px 18px rgba(55, 37, 39, 0.025);
		backdrop-filter: blur(14px);
	}

	.menu-button {
		display: flex;
		width: 2.55rem;
		height: 2.55rem;
		flex: 0 0 2.55rem;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.27rem;
		border: 1px solid var(--app-border);
		border-radius: 0.65rem;
		background: var(--app-surface);
		color: var(--app-text);
		cursor: pointer;
		transition:
			border-color 170ms ease,
			color 170ms ease,
			transform 170ms ease;
	}

	.menu-button:hover {
		border-color: var(--app-accent);
		color: var(--app-accent);
		transform: translateY(-1px);
	}

	.menu-button span {
		width: 1rem;
		height: 1.5px;
		border-radius: 2px;
		background: currentColor;
	}

	.header-brand {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.65rem;
		color: var(--app-text);
		text-decoration: none;
	}

	.header-logo {
		display: grid;
		width: 2.45rem;
		height: 2.45rem;
		flex: 0 0 2.45rem;
		place-items: center;
		overflow: hidden;
		border: 1px solid var(--app-border);
		border-radius: 0.6rem;
		background: #ffffff;
	}

	.header-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 0.12rem;
	}

	.header-school {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 0.12rem;
		line-height: 1.25;
	}

	.header-school strong {
		overflow: hidden;
		font-size: 0.84rem;
		font-weight: 800;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.header-school span {
		color: var(--app-muted);
		font-size: 0.66rem;
	}

	.header-spacer {
		flex: 1;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}

	.language-control {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--app-muted);
		font-size: 0.72rem;
	}

	.language-control button {
		padding: 0.35rem 0.1rem;
		border: 0;
		background: transparent;
		color: var(--app-muted);
		cursor: pointer;
		font: inherit;
		transition: color 170ms ease;
	}

	.language-control button:hover,
	.language-control button.active {
		color: var(--app-accent);
	}

	.language-control button.active {
		font-weight: 800;
	}

	.theme-button {
		display: grid;
		width: 2.4rem;
		height: 2.4rem;
		flex: 0 0 2.4rem;
		place-items: center;
		border: 1px solid var(--app-border);
		border-radius: 0.65rem;
		background: var(--app-surface);
		color: var(--app-accent);
		cursor: pointer;
		transition:
			border-color 170ms ease,
			transform 170ms ease;
	}

	.theme-button svg {
		width: 1rem;
		height: 1rem;
	}

	.theme-button:hover {
		border-color: var(--app-accent);
		transform: translateY(-1px);
	}

	.profile-identity {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		color: var(--app-text);
	}
	.logout-button { display:grid; width:2.35rem; height:2.35rem; flex:0 0 2.35rem; place-items:center; border:1px solid transparent; border-radius:.5rem; background:transparent; color:var(--app-muted); cursor:pointer; }
	.logout-button:hover { background:var(--app-accent-soft); color:var(--app-accent); }

	.profile-avatar {
		display: grid;
		width: 2.4rem;
		height: 2.4rem;
		flex: 0 0 2.4rem;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--app-accent) 15%, var(--app-border));
		border-radius: 50%;
		background: var(--app-accent-soft);
		color: var(--app-accent);
		font-size: 0.82rem;
		font-weight: 800;
	}

	.profile-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		line-height: 1.25;
	}

	.profile-text strong {
		font-size: 0.75rem;
		white-space: nowrap;
	}

	.profile-text small {
		color: var(--app-muted);
		font-size: 0.64rem;
	}

	/* ================================
	   CONTENT
	================================ */

	.application-content {
		width: min(100% - 2.5rem, 76rem);
		margin: 0 auto;
		padding: 1.8rem 0 3rem;
	}

	.auth-check {
		min-height: 100dvh;
		background: #f7f3ef;
	}

	/* ================================
	   FOCUS
	================================ */

	.language-control button:focus-visible,
	.theme-button:focus-visible,
	.nav-item:focus-visible,
	.drawer-close:focus-visible,
	.menu-button:focus-visible,
	.sidebar-brand-link:focus-visible,
	.header-brand:focus-visible,
	.logout-button:focus-visible {
		outline: 3px solid color-mix(in srgb, var(--app-accent) 30%, transparent);
		outline-offset: 3px;
	}

	/* ================================
	   MOBILE
	================================ */

	@media (max-width: 699px) {
		.application-header {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr);
			grid-template-areas: 'menu brand' 'actions actions';
			min-height: 0;
			gap: 0.35rem 0.55rem;
			padding: 0.5rem 0.65rem;
		}

		.menu-button { grid-area: menu; }

		.header-brand {
			grid-area: brand;
			justify-content: flex-start;
			gap: 0.5rem;
		}

		.header-spacer { display: none; }

		.header-logo {
			width: 2.25rem;
			height: 2.25rem;
			flex-basis: 2.25rem;
		}

		.header-school {
			max-width: none;
		}

		.header-school strong {
			font-size: 0.84rem;
			line-height: 1.3;
			white-space: normal;
		}

		.header-school span {
			font-size: 0.75rem;
			display: block;
		}

		.header-actions {
			grid-area: actions;
			justify-content: space-between;
			gap: 0.45rem;
			padding-top: 0.35rem;
			border-top: 1px solid var(--app-border);
		}

		.language-control {
			display: flex;
			gap: 0.25rem;
			font-size: 1rem;
		}
		.language-control button { min-height: 2.2rem; padding: 0.35rem 0.25rem; font-size: 1rem; }

		.theme-button {
			width: 2.25rem;
			height: 2.25rem;
			flex-basis: 2.25rem;
		}

		.profile-text {
			display: flex;
		}
		.profile-text strong { font-size: 0.85rem; }
		.profile-text small { font-size: 0.72rem; }

		.profile-avatar {
			width: 2.25rem;
			height: 2.25rem;
			flex-basis: 2.25rem;
		}

		.application-content {
			width: min(100% - 1.25rem, 42rem);
			padding: 1.15rem 0 2rem;
		}

		.application-sidebar {
			width: min(86vw, 20rem);
		}
	}

	@media (max-width: 420px) {
		.header-school {
			max-width: none;
		}

		.header-school strong {
			font-size: 0.8rem;
		}

		.header-school span {
			display: block;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
			scroll-behavior: auto !important;
		}
	}
</style>