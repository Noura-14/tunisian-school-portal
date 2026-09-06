<script>
	import { onMount } from 'svelte';

	let language = $state('ar');
	let theme = $state('light');

	const isArabic = $derived(language === 'ar');
	const pageDirection = $derived(isArabic ? 'rtl' : 'ltr');
	const documentTitle = $derived(
		isArabic ? 'المدرسة التونسية بالدوحة' : 'Tunisian School in Doha'
	);

	onMount(() => {
		const savedTheme = window.localStorage.getItem('school-theme');
		theme = savedTheme === 'dark' ? 'dark' : 'light';
		document.documentElement.lang = language;
		document.documentElement.dir = pageDirection;

		return () => {
			document.documentElement.lang = 'ar';
			document.documentElement.dir = 'rtl';
		};
	});

	/** @param {'ar' | 'en'} nextLanguage */
	function setLanguage(nextLanguage) {
		language = nextLanguage;
		document.documentElement.lang = nextLanguage;
		document.documentElement.dir = nextLanguage === 'ar' ? 'rtl' : 'ltr';
	}

	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
		window.localStorage.setItem('school-theme', theme);
	}
</script>

<svelte:head>
	<title>{documentTitle}</title>
	<meta
		name="description"
		content={isArabic
			? 'المدرسة التونسية بالدوحة، فرع اللقطة، إعدادي و ثانوي'
			: 'Tunisian School in Doha, Al-Luqta Branch, Preparatory & Secondary'}
	/>
</svelte:head>

<main class:dark={theme === 'dark'} class="welcome-page" dir={pageDirection}>
	<div class="hero-background" aria-hidden="true"></div>
	<div class="hero-overlay" aria-hidden="true"></div>
	<div class="hero-grain" aria-hidden="true"></div>

	<header class="site-header entrance header-entrance">
		<a class="brand" href="/" aria-label={isArabic ? 'الصفحة الرئيسية' : 'Home'}>
			<span class="brand-logo-wrap">
				<img
					class="brand-logo"
					src="/images/school-logo.png"
					alt={isArabic ? 'شعار المدرسة التونسية بالدوحة' : 'Tunisian School in Doha logo'}
				/>
			</span>
			<span class="brand-copy">
				<strong>{isArabic ? 'المدرسة التونسية بالدوحة' : 'Tunisian School in Doha'}</strong>
				<small>{isArabic ? 'فرع اللقطة · إعدادي وثانوي' : 'Al-Luqta Branch · Preparatory & Secondary'}</small>
			</span>
		</a>

		<div class="header-controls">
			<div class="country-pills" aria-label={isArabic ? 'تونس وقطر' : 'Tunisia and Qatar'}>
				<span>🇹🇳</span>
				<span>🇶🇦</span>
			</div>

			<div class="language-control" aria-label={isArabic ? 'اختيار اللغة' : 'Language selection'}>
				<button
					class:active={isArabic}
					type="button"
					aria-pressed={isArabic}
					onclick={() => setLanguage('ar')}
				>العربية</button>
				<span aria-hidden="true">|</span>
				<button
					class:active={!isArabic}
					type="button"
					aria-pressed={!isArabic}
					onclick={() => setLanguage('en')}
				>English</button>
			</div>

			<button
				class="theme-control"
				type="button"
				aria-label={theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'}
				aria-pressed={theme === 'dark'}
				onclick={toggleTheme}
			>
				<span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
			</button>
		</div>
	</header>

	<section class="hero-content">
		<div class="hero-copy entrance copy-entrance">
			<div class="eyebrow">
				<span class="eyebrow-line" aria-hidden="true"></span>
				<span>{isArabic ? 'المدرسة التونسية بالدوحة' : 'Tunisian School in Doha'}</span>
			</div>

			<h2>
				{isArabic
					? 'هوية تونسية و تعليم متميز، في قلب الدوحة.'
					: 'Tunisian identity, distinguished education, at the heart of Doha.'}
			</h2>

			<p class="hero-description">
				{isArabic
					? 'فضاء مدرسي يجمع بين أصالة التعليم التونسي وروح الدوحة، لمتابعة التلاميذ والحضور والسلوك المدرسي في مكان واحد.'
					: 'A school space that brings together the spirit of Tunisian education and Doha, with student attendance and behaviour follow-up in one place.'}
			</p>

			<div class="hero-actions">
				<a class="primary-button" href="/login">
					<span>{isArabic ? 'الدخول إلى فضاء المتابعة' : 'Enter the Follow-up Portal'}</span>
					<span class="button-arrow" aria-hidden="true">{isArabic ? '←' : '→'}</span>
				</a>

				<div class="location-note">
					<span class="location-dot" aria-hidden="true"></span>
					<span>{isArabic ? 'فرع اللقطة · الدوحة، قطر' : 'Al-Luqta Branch · Doha, Qatar'}</span>
				</div>
			</div>
		</div>

		<div class="hero-brand-card entrance card-entrance">
			<div class="card-glow" aria-hidden="true"></div>

			<div class="card-top">
				<span>TS · DOHA</span>
				<span>1988</span>
			</div>

			<div class="card-logo">
				<img
					src="/images/school-logo.png"
					alt={isArabic ? 'شعار المدرسة التونسية بالدوحة' : 'Tunisian School in Doha logo'}
				/>
			</div>

			<div class="card-divider" aria-hidden="true"></div>

			<p class="card-arabic">المدرسة التونسية<br />بالدوحة</p>
			<p class="card-english">Tunisian School in Doha</p>

			<div class="card-footer">
				<span>{isArabic ? 'فرع اللقطة' : 'Al-Luqta Branch'}</span>
				<span>{isArabic ? 'إعدادي وثانوي' : 'Preparatory & Secondary'}</span>
			</div>
		</div>
	</section>

	<footer class="site-footer entrance footer-entrance">
		<div>
			<span class="footer-brand">TSD</span>
			<span>{isArabic ? 'تعليم · متابعة · مسؤولية' : 'Learning · Follow-up · Responsibility'}</span>
		</div>
		<span>{isArabic ? 'منصة داخلية' : 'Internal platform'}</span>
	</footer>
</main>

<style>
	.welcome-page {
		--burgundy: #7b2638;
		--burgundy-dark: #5e1b2b;
		--burgundy-light: #a94d60;
		--cream: #f6f0eb;
		--cream-soft: rgba(255, 252, 249, 0.93);
		--white: #fffdfb;
		--text: #302429;
		--muted: #6f6265;
		--border: rgba(255, 255, 255, 0.42);
		position: relative;
		display: flex;
		min-height: 100svh;
		flex-direction: column;
		overflow: hidden;
		background: #2d2023;
		color: var(--white);
		isolation: isolate;
	}

	.welcome-page.dark {
		--cream-soft: rgba(42, 31, 34, 0.93);
		--text: #f8f0ec;
		--muted: #d0bfba;
		background: #21191c;
	}

	.hero-background {
		position: absolute;
		z-index: -4;
		inset: 0;
		background-image: url('/images/tunisia-qatar.png');
		background-position: center;
		background-size: cover;
		transform: scale(1.02);
		animation: background-breathe 16s ease-in-out infinite alternate;
	}

	.hero-overlay {
		position: absolute;
		z-index: -3;
		inset: 0;
		background:
			linear-gradient(90deg, rgba(43, 24, 28, 0.84) 0%, rgba(69, 31, 39, 0.67) 42%, rgba(55, 25, 31, 0.34) 100%),
			linear-gradient(180deg, rgba(34, 18, 22, 0.34) 0%, rgba(73, 30, 39, 0.22) 50%, rgba(28, 18, 21, 0.62) 100%);
	}

	.welcome-page[dir='rtl'] .hero-overlay {
		background:
			linear-gradient(270deg, rgba(43, 24, 28, 0.84) 0%, rgba(69, 31, 39, 0.67) 42%, rgba(55, 25, 31, 0.34) 100%),
			linear-gradient(180deg, rgba(34, 18, 22, 0.34) 0%, rgba(73, 30, 39, 0.22) 50%, rgba(28, 18, 21, 0.62) 100%);
	}

	.hero-grain {
		position: absolute;
		z-index: -2;
		inset: 0;
		pointer-events: none;
		opacity: 0.08;
		background-image: radial-gradient(rgba(255, 255, 255, 0.9) 0.6px, transparent 0.6px);
		background-size: 6px 6px;
	}

	.site-header {
		display: flex;
		width: min(100% - 2rem, 88rem);
		margin: 0 auto;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.1rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.18);
	}

	.brand {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.8rem;
		color: white;
		text-decoration: none;
	}

	.brand-logo-wrap {
		display: grid;
		width: 3.35rem;
		height: 3.35rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid rgba(255, 255, 255, 0.34);
		border-radius: 0.9rem;
		background: rgba(255, 253, 251, 0.96);
		box-shadow: 0 8px 25px rgba(25, 8, 12, 0.18);
		overflow: hidden;
	}

	.brand-logo {
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 0.25rem;
	}

	.brand-copy {
		display: flex;
		min-width: 0;
		flex-direction: column;
		line-height: 1.3;
	}

	.brand-copy strong {
		font-size: clamp(0.88rem, 1.4vw, 1.05rem);
		font-weight: 750;
	}

	.brand-copy small {
		margin-top: 0.12rem;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.72rem;
	}

	.header-controls {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}

	.country-pills {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.45rem 0.55rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 999px;
		background: rgba(55, 24, 30, 0.25);
		backdrop-filter: blur(10px);
		font-size: 0.88rem;
	}

	.language-control {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		color: rgba(255, 255, 255, 0.65);
		font-size: 0.76rem;
	}

	.language-control button {
		padding: 0.4rem 0.1rem;
		border: 0;
		background: transparent;
		color: inherit;
		cursor: pointer;
		font: inherit;
	}

	.language-control button.active {
		color: white;
		font-weight: 750;
	}

	.theme-control {
		display: grid;
		width: 2.35rem;
		height: 2.35rem;
		place-items: center;
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 0.7rem;
		background: rgba(55, 24, 30, 0.25);
		color: white;
		cursor: pointer;
		font-size: 1rem;
		backdrop-filter: blur(10px);
	}

	.hero-content {
		display: grid;
		width: min(100% - 2rem, 88rem);
		flex: 1;
		margin: 0 auto;
		align-items: center;
		gap: 2rem;
		padding: 3.5rem 0 4rem;
	}

	.hero-copy {
		max-width: 43rem;
	}

	.eyebrow {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-bottom: 1.25rem;
		color: #f0cfd5;
		font-size: 0.78rem;
		font-weight: 750;
		letter-spacing: 0.04em;
	}

	.eyebrow-line {
		width: 2.2rem;
		height: 1px;
		background: #e8aebb;
	}

	h2 {
		max-width: 42rem;
		margin: 0;
		font-size: clamp(2.4rem, 8vw, 5.6rem);
		font-weight: 760;
		letter-spacing: -0.045em;
		line-height: 1.2;
		text-wrap: balance;
	}

	.hero-description {
		max-width: 38rem;
		margin: 1.5rem 0 0;
		color: rgba(255, 249, 246, 0.82);
		font-size: clamp(1rem, 1.8vw, 1.16rem);
		line-height: 1.95;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin-top: 2rem;
	}

	.primary-button {
		display: inline-flex;
		min-height: 3.55rem;
		align-items: center;
		justify-content: space-between;
		gap: 2.2rem;
		padding: 0.8rem 1.2rem 0.8rem 1.35rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.85rem;
		background: var(--burgundy);
		box-shadow: 0 12px 30px rgba(32, 8, 15, 0.28);
		color: white;
		cursor: pointer;
		font-size: 0.98rem;
		font-weight: 750;
		text-decoration: none;
		transition: transform 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
	}

	.primary-button:hover {
		background: var(--burgundy-dark);
		box-shadow: 0 16px 35px rgba(32, 8, 15, 0.35);
		transform: translateY(-2px);
	}

	.primary-button:active {
		transform: translateY(1px);
	}

	.button-arrow {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.13);
		font-size: 1.15rem;
	}

	.location-note {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: rgba(255, 249, 246, 0.72);
		font-size: 0.78rem;
	}

	.location-dot {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 50%;
		background: #e8aebb;
		box-shadow: 0 0 0 5px rgba(232, 174, 187, 0.12);
	}

	.hero-brand-card {
		position: relative;
		width: min(100%, 24rem);
		justify-self: center;
		padding: 1.25rem;
		border: 1px solid rgba(255, 255, 255, 0.34);
		border-radius: 1.35rem;
		background: var(--cream-soft);
		box-shadow: 0 25px 65px rgba(26, 8, 13, 0.3);
		color: var(--text);
		backdrop-filter: blur(12px);
		overflow: hidden;
	}

	.card-glow {
		position: absolute;
		top: -8rem;
		right: -5rem;
		width: 15rem;
		height: 15rem;
		border-radius: 50%;
		background: rgba(123, 38, 56, 0.12);
		filter: blur(5px);
	}

	.card-top {
		position: relative;
		display: flex;
		justify-content: space-between;
		padding-bottom: 0.8rem;
		border-bottom: 1px solid rgba(123, 38, 56, 0.18);
		color: var(--burgundy);
		font-family: Georgia, serif;
		font-size: 0.64rem;
		letter-spacing: 0.12em;
	}

	.card-logo {
		position: relative;
		display: grid;
		width: 10.5rem;
		height: 10.5rem;
		margin: 1.35rem auto 0.8rem;
		place-items: center;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.72);
		box-shadow: 0 10px 25px rgba(75, 32, 39, 0.08);
		overflow: hidden;
	}

	.card-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 0.25rem;
	}

	.card-divider {
		width: 3.5rem;
		height: 2px;
		margin: 1rem auto;
		background: var(--burgundy);
	}

	.card-arabic {
		position: relative;
		margin: 0;
		color: var(--burgundy-dark);
		font-size: 1.18rem;
		font-weight: 800;
		line-height: 1.75;
		text-align: center;
	}

	.card-english {
		position: relative;
		margin: 0.35rem 0 1.2rem;
		color: var(--muted);
		font-family: Georgia, serif;
		font-size: 0.75rem;
		text-align: center;
	}

	.card-footer {
		position: relative;
		display: flex;
		justify-content: space-between;
		gap: 0.8rem;
		padding-top: 0.8rem;
		border-top: 1px solid rgba(123, 38, 56, 0.15);
		color: var(--muted);
		font-size: 0.68rem;
	}

	.site-footer {
		display: flex;
		width: min(100% - 2rem, 88rem);
		margin: 0 auto;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.9rem 0 1.2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.16);
		color: rgba(255, 249, 246, 0.65);
		font-size: 0.7rem;
	}

	.site-footer > div {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}

	.footer-brand {
		color: #f0cfd5;
		font-weight: 800;
		letter-spacing: 0.08em;
	}

	.entrance {
		animation: enter 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.header-entrance {
		animation-delay: 50ms;
	}

	.copy-entrance {
		animation-delay: 140ms;
	}

	.card-entrance {
		animation-delay: 260ms;
	}

	.footer-entrance {
		animation-delay: 380ms;
	}

	@keyframes enter {
		from {
			opacity: 0;
			transform: translateY(1rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes background-breathe {
		from {
			transform: scale(1.02);
		}
		to {
			transform: scale(1.07);
		}
	}

	.language-control button:focus-visible,
	.theme-control:focus-visible,
	.primary-button:focus-visible,
	.brand:focus-visible {
		outline: 3px solid rgba(255, 218, 225, 0.75);
		outline-offset: 3px;
	}

	@media (min-width: 760px) {
		.site-header,
		.hero-content,
		.site-footer {
			width: min(100% - 4rem, 88rem);
		}

		.site-header {
			padding: 1.25rem 0;
		}

		.hero-content {
			grid-template-columns: minmax(0, 1.25fr) minmax(20rem, 0.75fr);
			padding: 4rem 0 5rem;
		}

		.welcome-page[dir='rtl'] .hero-brand-card {
			justify-self: start;
		}

		.welcome-page[dir='ltr'] .hero-brand-card {
			justify-self: end;
		}
	}

	@media (min-width: 1100px) {
		.hero-content {
			gap: 5rem;
		}

		.hero-brand-card {
			width: min(100%, 27rem);
			padding: 1.5rem;
		}

		.card-logo {
			width: 12rem;
			height: 12rem;
		}
	}

	@media (max-width: 650px) {
		.site-header {
			align-items: flex-start;
		}

		.brand-copy small {
			display: none;
		}

		.header-controls {
			gap: 0.4rem;
		}

		.country-pills {
			display: none;
		}

		.language-control {
			font-size: 0.68rem;
		}

		.theme-control {
			width: 2.15rem;
			height: 2.15rem;
		}

		.hero-content {
			padding-top: 2.6rem;
		}

		h2 {
			font-size: clamp(2.25rem, 12vw, 3.5rem);
		}

		.hero-description {
			font-size: 0.96rem;
		}

		.hero-actions {
			align-items: stretch;
			flex-direction: column;
		}

		.primary-button {
			width: 100%;
		}

		.location-note {
			justify-content: center;
		}

		.hero-brand-card {
			width: min(100%, 20rem);
		}

		.site-footer {
			flex-direction: column;
			align-items: flex-start;
			padding-bottom: 1rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
