<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { setAuthenticatedUser } from '$lib/auth.js';

	let language = $state('ar');
	let theme = $state('light');
	let username = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let errorMessage = $state('');
	let isLoading = $state(false);
	let isSuccess = $state(false);

	const isArabic = $derived(language === 'ar');
	const pageDirection = $derived(isArabic ? 'rtl' : 'ltr');
	const documentTitle = $derived(isArabic ? 'تسجيل الدخول | المدرسة التونسية بالدوحة' : 'Sign in | Tunisian School in Doha');

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

	function submitLogin() {
		errorMessage = '';

		if (!username.trim()) {
			errorMessage = isArabic ? 'يرجى إدخال اسم المستخدم.' : 'Please enter your username.';
			return;
		}

		if (!password) {
			errorMessage = isArabic ? 'يرجى إدخال كلمة المرور.' : 'Please enter your password.';
			return;
		}

		if (username !== 'admin' || password !== 'admin123') {
			errorMessage = isArabic
				? 'بيانات الحساب التجريبي غير صحيحة.'
				: 'The demo account details are incorrect.';
			return;
		}

		isLoading = true;
		window.setTimeout(() => {
			setAuthenticatedUser();
			isLoading = false;
			isSuccess = true;
			window.setTimeout(() => goto('/app'), 1200);
		}, 650);
	}
</script>

<svelte:head>
	<title>{documentTitle}</title>
	<meta
		name="description"
		content={isArabic ? 'تسجيل الدخول إلى فضاء المتابعة المدرسية' : 'Sign in to the school follow-up portal'}
	/>
</svelte:head>

<main class:dark={theme === 'dark'} class="login-page" dir={pageDirection}>
	<div class="login-frame">
		<header class="login-header">
			<a class="wordmark" href="/" aria-label={isArabic ? 'العودة إلى الصفحة الرئيسية' : 'Back to home'}>
				<span class="wordmark-seal" aria-hidden="true">ت</span>
				<span class="wordmark-text">
					<strong>{isArabic ? 'المدرسة التونسية' : 'Tunisian School'}</strong>
					<small>{isArabic ? 'بالدوحة' : 'in Doha'}</small>
				</span>
			</a>

			<div class="header-controls">
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

		<div class="login-grid">
			<section class="login-card entrance-card" aria-labelledby="login-title">
				<div class="card-heading">
					<p class="section-label">{isArabic ? 'فضاء المتابعة المدرسية' : 'School follow-up portal'}</p>
					<h1 id="login-title">{isArabic ? 'تسجيل الدخول' : 'Sign in'}</h1>
					<p>{isArabic ? 'سجّل الدخول للمتابعة إلى فضاء المتابعة المدرسية.' : 'Sign in to continue to the school follow-up portal.'}</p>
				</div>

				{#if isSuccess}
					<div class="success-state" role="status" aria-live="polite">
						<div class="success-mark" aria-hidden="true">✓</div>
						<p class="success-label">{isArabic ? 'تم تسجيل الدخول بنجاح' : 'Login successful'}</p>
						<h2>{isArabic ? 'مرحباً بك، أبو بكر بابي' : 'Welcome, Abu Bakr Babay'}</h2>
						<p>{isArabic ? 'القيّم' : 'Qayyim'}</p>
					</div>
				{:else}
					<form class="login-form" onsubmit={(event) => { event.preventDefault(); submitLogin(); }} novalidate>
						<div class="field-group">
							<label for="username">{isArabic ? 'اسم المستخدم' : 'Username'}</label>
							<input id="username" bind:value={username} autocomplete="username" placeholder={isArabic ? 'أدخل اسم المستخدم' : 'Enter your username'} aria-invalid={Boolean(errorMessage)} />
						</div>

						<div class="field-group">
							<label for="password">{isArabic ? 'كلمة المرور' : 'Password'}</label>
							<div class="password-field">
								<input id="password" bind:value={password} type={showPassword ? 'text' : 'password'} autocomplete="current-password" placeholder={isArabic ? 'أدخل كلمة المرور' : 'Enter your password'} aria-invalid={Boolean(errorMessage)} />
								<button class="password-toggle" type="button" aria-label={showPassword ? (isArabic ? 'إخفاء كلمة المرور' : 'Hide password') : (isArabic ? 'إظهار كلمة المرور' : 'Show password')} aria-pressed={showPassword} onclick={() => showPassword = !showPassword}>
									<span aria-hidden="true">{showPassword ? 'إخفاء' : 'إظهار'}</span>
								</button>
							</div>
						</div>

						{#if errorMessage}
							<p class="error-message" role="alert">{errorMessage}</p>
						{/if}

						<div class="form-options">
							<a href="/login" onclick={(event) => event.preventDefault()}>{isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password?'}</a>
						</div>

						<button class="submit-button" type="submit" disabled={isLoading}>
							{#if isLoading}
								<span class="loading-dot" aria-hidden="true"></span>
								<span>{isArabic ? 'جارٍ تسجيل الدخول...' : 'Signing in...'}</span>
							{:else}
								<span>{isArabic ? 'تسجيل الدخول' : 'Sign in'}</span>
								<span class="submit-arrow" aria-hidden="true">{isArabic ? '←' : '→'}</span>
							{/if}
						</button>
					</form>

					<div class="demo-account">
						<div class="demo-heading"><span class="demo-dot" aria-hidden="true"></span><strong>{isArabic ? 'حساب تجريبي' : 'Demo Account'}</strong></div>
						<p>{isArabic ? 'للتجربة فقط، وليس حساباً مدرسياً فعلياً.' : 'For development only, not a real school account.'}</p>
						<div class="demo-details">
							<span>{isArabic ? 'اسم المستخدم: admin' : 'Username: admin'}</span>
							<span>{isArabic ? 'كلمة المرور: admin123' : 'Password: admin123'}</span>
						</div>
					</div>
				{/if}
			</section>

			<aside class="education-panel entrance-visual" aria-label={isArabic ? 'رمز تعليمي' : 'Educational visual'}>
				<div class="education-topline"><span>TS</span><span>{isArabic ? 'فرع اللقطة' : 'Al-Luqta Branch'}</span></div>
				<div class="education-book" aria-hidden="true">
					<span class="book-page page-left"></span>
					<span class="book-page page-right"></span>
					<span class="book-spine"></span>
				</div>
				<p>{isArabic ? 'تعليم · متابعة · مسؤولية' : 'Learning · Follow-up · Responsibility'}</p>
			</aside>
		</div>

		<footer class="login-footer">
			<a href="/">{isArabic ? 'العودة إلى الصفحة الرئيسية' : 'Back to home'}</a>
			<span aria-hidden="true">—</span>
			<span>{isArabic ? 'الدوحة، قطر' : 'Doha, Qatar'}</span>
		</footer>
	</div>
</main>

<style>
	.login-page {
		--page-background: #f4f1ed;
		--panel: #fffdfb;
		--surface: #ffffff;
		--text: #302629;
		--muted: #827477;
		--border: #e4dcd8;
		--accent: #7b2638;
		--accent-dark: #5f1c2c;
		--support: #8a1538;
		--shadow: 0 18px 50px rgba(75, 49, 47, 0.08);
		min-height: 100svh;
		background: var(--page-background);
		color: var(--text);
		transition: background-color 220ms ease, color 220ms ease;
	}

	.login-page.dark {
		--page-background: #242021;
		--panel: #2d2829;
		--surface: #352e30;
		--text: #f5eeeb;
		--muted: #c3b3b0;
		--border: #514447;
		--accent: #bd7180;
		--accent-dark: #a95668;
		--support: #bd7180;
		--shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
	}

	.login-frame { display: flex; width: min(100% - 2rem, 90rem); min-height: 100dvh; margin: 0 auto; flex-direction: column; }
	.login-header { display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 0; border-bottom: 1px solid var(--border); }
	.wordmark { display: flex; align-items: center; gap: 0.7rem; color: var(--text); text-decoration: none; }
	.wordmark-seal { display: grid; width: 2.35rem; height: 2.35rem; place-items: center; border: 1px solid var(--accent); border-radius: 0.6rem 0.6rem 0.6rem 0.15rem; color: var(--accent); font-size: 1.2rem; font-weight: 700; }
	.wordmark-text { display: flex; flex-direction: column; line-height: 1.25; }
	.wordmark-text strong { font-size: 0.82rem; }
	.wordmark-text small { color: var(--muted); font-size: 0.7rem; }
	.header-controls, .language-control { display: flex; align-items: center; }
	.header-controls { gap: 0.8rem; }
	.language-control { gap: 0.38rem; color: var(--muted); font-size: 0.78rem; }
	.language-control button, .theme-control { border: 0; background: transparent; color: var(--muted); cursor: pointer; }
	.language-control button { padding: 0.45rem 0.1rem; font-size: 0.78rem; }
	.language-control button.active { color: var(--accent); font-weight: 700; }
	.theme-control { display: grid; width: 2.3rem; height: 2.3rem; place-items: center; border: 1px solid var(--border); border-radius: 0.6rem; background: var(--surface); color: var(--accent); font-size: 1.1rem; }
	.language-control button:focus-visible, .theme-control:focus-visible, .submit-button:focus-visible, .password-toggle:focus-visible, .wordmark:focus-visible, .login-footer a:focus-visible, .form-options a:focus-visible { outline: 3px solid color-mix(in srgb, var(--accent) 35%, transparent); outline-offset: 3px; }

	.login-grid { display: grid; flex: 1; grid-template-columns: 1fr; align-items: center; gap: 0.8rem; padding: 0.8rem 0; }
	.login-card { border: 1px solid var(--border); background: var(--panel); box-shadow: var(--shadow); }
	.login-card { padding: 1.5rem 1.1rem; }
	.card-heading { margin-bottom: 1.3rem; }
	.section-label { margin: 0 0 0.85rem; color: var(--accent); font-size: 0.78rem; font-weight: 700; }
	h1, h2, p { margin-top: 0; }
	h1 { margin-bottom: 0.7rem; font-size: clamp(1.8rem, 8vw, 2.45rem); font-weight: 700; line-height: 1.35; }
	.card-heading > p:last-child { max-width: 28rem; margin-bottom: 0; color: var(--muted); font-size: 1rem; line-height: 1.8; }

	.login-form { display: flex; flex-direction: column; gap: 1.15rem; }
	.field-group { display: flex; flex-direction: column; gap: 0.45rem; }
	.field-group label { font-size: 1rem; font-weight: 600; }
	.field-group input { width: 100%; min-height: 3.25rem; padding: 0.75rem 0.9rem; border: 1px solid var(--border); border-radius: 0.55rem; outline: none; background: var(--surface); color: var(--text); font-size: 1rem; transition: border-color 180ms ease, box-shadow 180ms ease; }
	.field-group input::placeholder { color: var(--muted); opacity: 0.8; }
	.field-group input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }
	.password-field { position: relative; }
	.password-field input { padding-inline-end: 4.8rem; }
	.password-toggle { position: absolute; top: 50%; inset-inline-end: 0.65rem; min-width: 3.5rem; min-height: 2.2rem; padding: 0.3rem; border: 0; background: transparent; color: var(--accent); cursor: pointer; font-size: 0.82rem; transform: translateY(-50%); }
	.error-message { margin: -0.2rem 0 0; color: #a23443; font-size: 0.9rem; }
	.dark .error-message { color: #e28c98; }
	.form-options { display: flex; justify-content: flex-start; margin-top: -0.2rem; }
	.form-options a, .login-footer a { color: var(--accent); font-size: 0.9rem; }
	.submit-button { display: flex; width: 100%; min-height: 3.55rem; align-items: center; justify-content: space-between; padding: 0.85rem 1.15rem; border: 0; border-radius: 0.65rem; background: var(--accent); box-shadow: 0 9px 18px color-mix(in srgb, var(--accent) 20%, transparent); color: #fff; cursor: pointer; font-size: 1rem; font-weight: 700; transition: background-color 180ms ease, box-shadow 180ms ease, transform 180ms ease; }
	.submit-button:hover:not(:disabled) { background: var(--accent-dark); box-shadow: 0 12px 22px color-mix(in srgb, var(--accent) 25%, transparent); transform: translateY(-1px); }
	.submit-button:active:not(:disabled) { transform: translateY(1px); }
	.submit-button:disabled { cursor: wait; opacity: 0.82; }
	.submit-arrow { font-size: 1.2rem; font-weight: 400; }
	.loading-dot { width: 0.9rem; height: 0.9rem; margin-inline-end: 0.5rem; border: 2px solid rgba(255, 255, 255, 0.45); border-top-color: #fff; border-radius: 50%; animation: spin 800ms linear infinite; }

	.demo-account { margin-top: 1.25rem; padding: 0.85rem; border: 1px solid color-mix(in srgb, var(--support) 25%, var(--border)); border-radius: 0.55rem; background: color-mix(in srgb, var(--support) 5%, var(--surface)); }
	.demo-heading { display: flex; align-items: center; gap: 0.45rem; color: var(--support); font-size: 0.9rem; }
	.demo-dot { width: 0.42rem; height: 0.42rem; border-radius: 50%; background: var(--support); }
	.demo-account p { margin: 0.45rem 0 0.75rem; color: var(--muted); font-size: 0.82rem; }
	.demo-details { display: flex; flex-wrap: wrap; gap: 0.35rem 1rem; color: var(--text); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.78rem; }

	.success-state { display: flex; min-height: 23rem; flex-direction: column; align-items: center; justify-content: center; text-align: center; animation: success-in 500ms ease both; }
	.success-mark { display: grid; width: 3.4rem; height: 3.4rem; margin-bottom: 1.2rem; place-items: center; border: 1px solid var(--support); border-radius: 50%; color: var(--support); font-size: 1.6rem; }
	.success-label { margin-bottom: 0.8rem; color: var(--accent); font-weight: 700; }
	.success-state h2 { margin-bottom: 0.25rem; font-size: clamp(1.35rem, 6vw, 1.8rem); }
	.success-state > p:last-child { margin: 0; color: var(--muted); }

	.education-panel { position: relative; display: flex; min-height: 12rem; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--border); background: var(--surface); color: var(--accent); box-shadow: var(--shadow); animation: visual-in 700ms cubic-bezier(0.22, 1, 0.36, 1) both; }
	.education-panel::before { position: absolute; inset: 0; opacity: 0.35; background-image: linear-gradient(90deg, transparent 49%, var(--border) 50%, transparent 51%), linear-gradient(0deg, transparent 49%, var(--border) 50%, transparent 51%); background-size: 3rem 3rem; content: ''; mask-image: linear-gradient(135deg, #000, transparent 72%); }
	.education-topline { position: absolute; top: 1rem; display: flex; width: calc(100% - 2rem); justify-content: space-between; color: var(--muted); font-family: Georgia, serif; font-size: 0.65rem; letter-spacing: 0.08em; }
	.education-book { position: relative; z-index: 1; display: flex; width: 6rem; height: 3.9rem; align-items: flex-end; justify-content: center; border-bottom: 2px solid #fff; }
	.education-book .book-page { width: 2.5rem; height: 3.1rem; border: 1px solid var(--accent); background: var(--surface-soft, #f5f1ee); transform-origin: bottom center; }
	.education-book .page-left { border-radius: 0.25rem 0 0 0.25rem; transform: skewY(-8deg); animation: page-lift 7s ease-in-out 1s infinite; }
	.education-book .page-right { border-radius: 0 0.25rem 0.25rem 0; transform: skewY(8deg); animation: page-lift-right 7s ease-in-out 1.35s infinite; }
	.education-book .book-spine { position: absolute; bottom: 0; width: 1px; height: 3rem; background: var(--accent); }
	.education-panel > p { position: relative; z-index: 1; margin: 1rem 0 0; color: var(--muted); font-size: 0.8rem; }
	.login-footer { display: flex; align-items: center; justify-content: center; gap: 0.65rem; padding: 0.2rem 0 0.9rem; color: var(--muted); font-size: 0.72rem; }

	@keyframes visual-in { from { opacity: 0; transform: translateY(0.7rem); } to { opacity: 1; transform: translateY(0); } }
	@keyframes success-in { from { opacity: 0; transform: translateY(0.6rem); } to { opacity: 1; transform: translateY(0); } }
	@keyframes spin { to { transform: rotate(360deg); } }
	@keyframes page-lift { 0%, 72%, 100% { transform: skewY(-8deg) rotateX(0deg); } 82% { transform: skewY(-5deg) rotateX(-18deg) translateY(-0.18rem); } }
	@keyframes page-lift-right { 0%, 72%, 100% { transform: skewY(8deg) rotateX(0deg); } 82% { transform: skewY(5deg) rotateX(14deg) translateY(-0.14rem); } }

	@media (min-width: 700px) {
		.login-frame { width: min(100% - 4rem, 90rem); }
		.login-header { padding: 1.1rem 0; }
		.login-grid { grid-template-columns: minmax(0, 1.05fr) minmax(20rem, 0.75fr); gap: 1rem; padding: 1rem 0; }
		.login-card { padding: 3rem clamp(2rem, 5vw, 4.5rem); }
		.education-panel { min-height: 28rem; }
		.login-footer { justify-content: flex-start; padding-bottom: 1.65rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		*, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
	}
</style>
