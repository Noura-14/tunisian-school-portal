<script>
	import { onMount } from 'svelte';

	let language = $state('ar');
	let theme = $state('light');

	const isArabic = $derived(language === 'ar');
	const pageDirection = $derived(isArabic ? 'rtl' : 'ltr');
	const documentTitle = $derived(isArabic ? 'المدرسة التونسية بالدوحة' : 'Tunisian School in Doha');

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

<main class:dark={theme === 'dark'} class="portal-page" dir={pageDirection}>
	<div class="page-frame">
		<header class="page-header">
			<a class="wordmark" href="/" aria-label={isArabic ? 'الصفحة الرئيسية' : 'Home'}>
				<span class="wordmark-seal" aria-hidden="true">ت</span>
				<span class="wordmark-text">
					<strong>{isArabic ? 'المدرسة التونسية' : 'Tunisian School'}</strong>
					<small>{isArabic ? 'بالدوحة' : 'in Doha'}</small>
				</span>
			</a>

			<div class="header-controls">
				<div class="identity-flags" aria-label={isArabic ? 'تونس وقطر' : 'Tunisia and Qatar'}>
					<span aria-hidden="true">🇹🇳</span>
					<span aria-hidden="true">🇶🇦</span>
				</div>
				<div class="language-control" aria-label={isArabic ? 'اختيار اللغة' : 'Language selection'}>
					<button class:active={isArabic} type="button" aria-pressed={isArabic} onclick={() => setLanguage('ar')}>العربية</button>
					<span aria-hidden="true">|</span>
					<button class:active={!isArabic} type="button" aria-pressed={!isArabic} onclick={() => setLanguage('en')}>English</button>
				</div>
				<button
					class="theme-control"
					type="button"
					aria-label={theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'}
					aria-pressed={theme === 'dark'}
					onclick={toggleTheme}
				>
					<span aria-hidden="true">{theme === 'light' ? '◐' : '○'}</span>
				</button>
			</div>
		</header>

		<div class="content-grid">
			<section class="welcome-panel" aria-labelledby="school-name">
				<div class="intro-block entrance intro-one">
					<p class="section-label">{isArabic ? 'فضاء المتابعة المدرسية' : 'School follow-up portal'}</p>
					<h1 id="school-name">{isArabic ? 'المدرسة التونسية بالدوحة' : 'Tunisian School in Doha'}</h1>
					<div class="school-details">
						<span>{isArabic ? 'فرع اللقطة' : 'Al-Luqta Branch'}</span>
						<span class="detail-divider" aria-hidden="true"></span>
						<span>{isArabic ? 'إعدادي و ثانوي' : 'Preparatory & Secondary'}</span>
					</div>
				</div>

				<div class="school-message entrance intro-two">
					<p class="supporting-text">
						{isArabic
							? 'متابعة التلاميذ والحضور والسلوك المدرسي في مكان واحد.'
							: 'Student attendance and behaviour follow-up, all in one place.'}
					</p>
				</div>

				<div class="action-block entrance intro-three">
					<a class="primary-button" href="/login">
						<span>{isArabic ? 'الدخول إلى فضاء المتابعة' : 'Go to the Follow-up Portal'}</span>
						<span class="arrow" aria-hidden="true">{isArabic ? '←' : '→'}</span>
					</a>
				</div>
			</section>

			<aside class="visual-panel entrance intro-visual" aria-label={isArabic ? 'معلومات المدرسة' : 'School information'}>
				<div class="grid-lines" aria-hidden="true"></div>
				<div class="emblem-card">
					<div class="emblem-topline"><span>TS</span><span>DOHA · 2026</span></div>
					<div class="emblem-rule"></div>
					<div class="emblem-mark" aria-hidden="true">
						<span class="book-page page-left"></span>
						<span class="book-page page-right"></span>
						<span class="book-spine"></span>
						<span class="book-line"></span>
					</div>
					<p class="emblem-name">المدرسة التونسية<br />بالدوحة</p>
					<p class="emblem-note">{isArabic ? 'فرع اللقطة' : 'Al-Luqta Branch'}</p>
				</div>
				<div class="visual-caption">
					<span class="caption-line" aria-hidden="true"></span>
					<p>{isArabic ? 'تعليم · متابعة · مسؤولية' : 'Learning · Follow-up · Responsibility'}</p>
				</div>
			</aside>
		</div>

		<footer class="page-footer">
			<span>{isArabic ? 'فرع اللقطة · الدوحة، قطر' : 'Al-Luqta Branch · Doha, Qatar'}</span>
			<span class="footer-mark" aria-hidden="true">—</span>
			<span>{isArabic ? 'منصة داخلية' : 'Internal platform'}</span>
		</footer>
	</div>
</main>

<style>
	.portal-page {
		--page-background: #f4f1ed;
		--panel: #fffdfb;
		--surface: #ffffff;
		--text: #302629;
		--muted: #827477;
		--border: #e4dcd8;
		--accent: #7b2638;
		--accent-dark: #5f1c2c;
		--accent-soft: #eadcdf;
		--shadow: 0 18px 50px rgba(75, 49, 47, 0.08);
		min-height: 100svh;
		background: var(--page-background);
		color: var(--text);
		transition: background-color 220ms ease, color 220ms ease;
	}

	.portal-page.dark {
		--page-background: #242021;
		--panel: #2d2829;
		--surface: #352e30;
		--text: #f5eeeb;
		--muted: #c3b3b0;
		--border: #514447;
		--accent: #bd7180;
		--accent-dark: #a95668;
		--accent-soft: #56373e;
		--shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
	}

	.page-frame {
		display: flex;
		width: min(100% - 2rem, 90rem);
		min-height: 100svh;
		margin: 0 auto;
		flex-direction: column;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.35rem 0;
		border-bottom: 1px solid var(--border);
	}

	.wordmark {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		color: var(--text);
		text-decoration: none;
	}

	.wordmark-seal {
		display: grid;
		width: 2.35rem;
		height: 2.35rem;
		place-items: center;
		border: 1px solid var(--accent);
		border-radius: 0.6rem 0.6rem 0.6rem 0.15rem;
		color: var(--accent);
		font-size: 1.2rem;
		font-weight: 700;
	}

	.wordmark-text {
		display: flex;
		flex-direction: column;
		line-height: 1.25;
	}

	.wordmark-text strong { font-size: 0.82rem; }
	.wordmark-text small { color: var(--muted); font-size: 0.7rem; }

	.header-controls,
	.language-control {
		display: flex;
		align-items: center;
	}

	.header-controls { gap: 0.8rem; }
	.language-control { gap: 0.38rem; color: var(--muted); font-size: 0.78rem; }
	.identity-flags { display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; line-height: 1; }

	.language-control button,
	.theme-control {
		border: 0;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
	}

	.language-control button { padding: 0.45rem 0.1rem; font-size: 0.78rem; }
	.language-control button.active { color: var(--accent); font-weight: 700; }

	.theme-control {
		display: grid;
		width: 2.3rem;
		height: 2.3rem;
		place-items: center;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		background: var(--surface);
		color: var(--accent);
		font-size: 1.1rem;
	}

	.language-control button:focus-visible,
	.theme-control:focus-visible,
	.primary-button:focus-visible,
	.wordmark:focus-visible {
		outline: 3px solid color-mix(in srgb, var(--accent) 35%, transparent);
		outline-offset: 3px;
	}

	.content-grid {
		display: grid;
		flex: 1;
		grid-template-columns: 1fr;
		align-items: stretch;
		gap: 1rem;
		padding: 1rem 0;
	}

	.welcome-panel,
	.visual-panel {
		border: 1px solid var(--border);
		background: var(--panel);
		box-shadow: var(--shadow);
	}

	.welcome-panel {
		display: flex;
		min-height: 38rem;
		flex-direction: column;
		justify-content: center;
		padding: 2rem 1.5rem;
	}

	.section-label { margin: 0 0 1.25rem; color: var(--accent); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; }
	h1, p { margin-top: 0; }

	h1 {
		max-width: 33rem;
		margin-bottom: 1rem;
		font-size: clamp(1.9rem, 7vw, 3.25rem);
		font-weight: 700;
		letter-spacing: -0.035em;
		line-height: 1.35;
	}

	.school-details { display: flex; flex-wrap: wrap; align-items: center; gap: 0.65rem; color: var(--muted); font-size: 0.95rem; }
	.detail-divider { width: 0.28rem; height: 0.28rem; border-radius: 50%; background: var(--accent); }

	.school-message { max-width: 33rem; margin-top: 4.2rem; padding-inline-start: 1rem; border-inline-start: 2px solid var(--accent); }
	.supporting-text { max-width: 28rem; margin-bottom: 0; color: var(--muted); font-size: 1.05rem; line-height: 1.9; }

	.action-block { width: min(100%, 24rem); margin-top: 2.5rem; }

	.primary-button {
		display: flex;
		width: 100%;
		min-height: 3.7rem;
		align-items: center;
		justify-content: space-between;
		padding: 0.9rem 1.25rem;
		border: 0;
		border-radius: 0.7rem;
		background: var(--accent);
		box-shadow: 0 9px 18px color-mix(in srgb, var(--accent) 20%, transparent);
		color: #fff;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 700;
		text-decoration: none;
		transition: background-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
	}

	.primary-button:hover { background: var(--accent-dark); box-shadow: 0 12px 22px color-mix(in srgb, var(--accent) 25%, transparent); transform: translateY(-1px); }
	.primary-button:active { box-shadow: 0 5px 12px color-mix(in srgb, var(--accent) 20%, transparent); transform: translateY(1px); }
	.arrow { font-size: 1.2rem; font-weight: 400; }

	.visual-panel {
		position: relative;
		display: flex;
		min-height: 23rem;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		background: var(--accent);
		color: #fff;
	}

	.grid-lines {
		position: absolute;
		inset: 0;
		opacity: 0.16;
		background-image: linear-gradient(90deg, transparent 49%, #fff 50%, transparent 51%), linear-gradient(0deg, transparent 49%, #fff 50%, transparent 51%);
		background-size: 3rem 3rem;
		mask-image: linear-gradient(135deg, #000, transparent 72%);
	}

	.emblem-card {
		position: relative;
		z-index: 1;
		display: flex;
		width: min(76%, 18rem);
		min-height: 20rem;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.45);
		background: rgba(255, 253, 251, 0.96);
		box-shadow: 0 18px 35px rgba(55, 16, 26, 0.2);
		color: #4d252e;
		text-align: center;
	}

	.emblem-topline { display: flex; width: 100%; justify-content: space-between; color: var(--accent); font-family: Georgia, serif; font-size: 0.58rem; letter-spacing: 0.09em; }
	.emblem-rule { width: 100%; margin: 0.8rem 0 1.5rem; border-top: 1px solid #dcc8cb; }
	.emblem-mark { position: relative; display: flex; width: 5.5rem; height: 3.2rem; align-items: flex-end; justify-content: center; margin-bottom: 1.2rem; border-bottom: 2px solid var(--accent); }
	.book-page { width: 2.3rem; height: 2.6rem; border: 1px solid var(--accent); background: #f8efef; transform-origin: bottom center; }
	.page-left { border-radius: 0.2rem 0 0 0.2rem; animation: page-lift 7s ease-in-out 1.1s infinite; }
	.page-right { border-radius: 0 0.2rem 0.2rem 0; animation: page-lift-right 7s ease-in-out 1.45s infinite; }
	.book-spine { position: absolute; bottom: 0; width: 1px; height: 2.5rem; background: var(--accent); }
	.book-line { position: absolute; top: 0.25rem; right: 0.15rem; width: 1.1rem; border-top: 1px solid var(--accent); opacity: 0; animation: line-reveal 7s ease-in-out 1.7s infinite; }
	.emblem-name { margin-bottom: 0.75rem; font-size: 1.1rem; font-weight: 700; line-height: 1.7; }
	.emblem-note { margin-bottom: 0; color: #98747a; font-size: 0.82rem; }

	.visual-caption { position: absolute; bottom: 1.5rem; left: 1.5rem; display: flex; align-items: center; gap: 0.6rem; color: rgba(255, 255, 255, 0.78); }
	.visual-caption p { margin: 0; font-size: 0.72rem; }
	.caption-line { width: 1.8rem; border-top: 1px solid rgba(255, 255, 255, 0.65); }
	.page-footer { display: flex; align-items: center; justify-content: center; gap: 0.65rem; padding: 0.2rem 0 1.35rem; color: var(--muted); font-size: 0.72rem; }
	.footer-mark { color: var(--accent); }

	.entrance { animation: enter 650ms cubic-bezier(0.22, 1, 0.36, 1) both; }
	.intro-one { animation-delay: 80ms; }
	.intro-two { animation-delay: 200ms; }
	.intro-three { animation-delay: 320ms; }
	.intro-visual { animation-delay: 0ms; }

	@keyframes enter {
		from { opacity: 0; transform: translateY(0.8rem); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes page-lift {
		0%, 72%, 100% { transform: skewY(-8deg) rotateX(0deg); }
		82% { transform: skewY(-5deg) rotateX(-18deg) translateY(-0.18rem); }
	}

	@keyframes page-lift-right {
		0%, 72%, 100% { transform: skewY(8deg) rotateX(0deg); }
		82% { transform: skewY(5deg) rotateX(14deg) translateY(-0.14rem); }
	}

	@keyframes line-reveal {
		0%, 72%, 100% { opacity: 0; transform: translateX(0); }
		82% { opacity: 0.8; transform: translateX(-0.35rem); }
	}

	@media (min-width: 700px) {
		.page-frame { width: min(100% - 4rem, 90rem); }
		.page-header { padding: 1.65rem 0; }
		.content-grid { grid-template-columns: minmax(0, 1.15fr) minmax(20rem, 0.85fr); gap: 1.25rem; padding: 1.25rem 0; }
		.welcome-panel { padding: 4rem clamp(2.5rem, 7vw, 6.5rem); }
		.visual-panel { min-height: 38rem; }
		.page-footer { justify-content: flex-start; padding-bottom: 1.65rem; }
	}

	@media (min-width: 1100px) {
		.content-grid { grid-template-columns: minmax(0, 1.2fr) minmax(23rem, 0.8fr); }
		.visual-panel { min-height: 42rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		*, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
	}
</style>
