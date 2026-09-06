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
	const documentTitle = $derived(
		isArabic
			? 'تسجيل الدخول | المدرسة التونسية بالدوحة'
			: 'Sign in | Tunisian School in Doha'
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

	function submitLogin() {
		errorMessage = '';

		if (!username.trim()) {
			errorMessage = isArabic
				? 'يرجى إدخال اسم المستخدم.'
				: 'Please enter your username.';
			return;
		}

		if (!password) {
			errorMessage = isArabic
				? 'يرجى إدخال كلمة المرور.'
				: 'Please enter your password.';
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
		content={
			isArabic
				? 'تسجيل الدخول إلى فضاء المتابعة المدرسية'
				: 'Sign in to the school follow-up portal'
		}
	/>
</svelte:head>

<main class:dark={theme === 'dark'} class="login-page" dir={pageDirection}>
	<div class="background-decoration background-decoration-one"></div>
	<div class="background-decoration background-decoration-two"></div>

	<div class="login-shell">
		<!-- HEADER -->
		<header class="login-header">
			<a
				class="brand"
				href="/"
				aria-label={isArabic ? 'العودة إلى الصفحة الرئيسية' : 'Back to home'}
			>
				<div class="brand-logo">
					<img src="/images/school-logo.png" alt="TSD" />
				</div>

				<div class="brand-text">
					<strong>{isArabic ? 'المدرسة التونسية بالدوحة' : 'Tunisian School in Doha'}</strong>
					<span>{isArabic ? 'فرع اللقطة — إعدادي وثانوي' : 'Al-Luqta Branch — Preparatory & Secondary'}</span>
				</div>
			</a>

			<div class="header-controls">
				<div
					class="language-switcher"
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
					aria-label={theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'}
					aria-pressed={theme === 'dark'}
					onclick={toggleTheme}
				>
					<span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
				</button>
			</div>
		</header>

		<!-- MAIN -->
		<div class="login-content">
			<!-- LOGIN CARD -->
			<section class="login-card" aria-labelledby="login-title">
				<div class="card-accent"></div>

				<div class="card-content">
					<div class="welcome-icon" aria-hidden="true">
						<span>🏫</span>
					</div>

					<div class="heading">
						<p class="eyebrow">
							{isArabic ? 'فضاء المتابعة المدرسية' : 'School Follow-up Portal'}
						</p>

						<h1 id="login-title">
							{isArabic ? 'مرحباً بك' : 'Welcome'}
						</h1>

						<p class="subtitle">
							{isArabic
								? 'سجّل الدخول للمتابعة إلى فضاء المدرسة.'
								: 'Sign in to continue to your school portal.'}
						</p>
					</div>

					{#if isSuccess}
						<div class="success-state" role="status" aria-live="polite">
							<div class="success-circle" aria-hidden="true">
								✓
							</div>

							<p class="success-eyebrow">
								{isArabic ? 'تم تسجيل الدخول بنجاح' : 'Login successful'}
							</p>

							<h2>
								{isArabic ? 'مرحباً بك، أبو بكر بابي' : 'Welcome, Abu Bakr Babay'}
							</h2>

							<p>
								{isArabic ? 'القيّم' : 'Qayyim'}
							</p>

							<div class="success-line">
								<span></span>
								<span></span>
								<span></span>
							</div>
						</div>
					{:else}
						<form
							class="login-form"
							onsubmit={(event) => {
								event.preventDefault();
								submitLogin();
							}}
							novalidate
						>
							<!-- USERNAME -->
							<div class="field">
								<label for="username">
									{isArabic ? 'اسم المستخدم' : 'Username'}
								</label>

								<div class="input-wrapper">
									<span class="input-icon" aria-hidden="true">
										<svg viewBox="0 0 24 24" fill="none">
											<path
												d="M20 21a8 8 0 0 0-16 0"
												stroke="currentColor"
												stroke-width="1.7"
												stroke-linecap="round"
											/>
											<circle
												cx="12"
												cy="7"
												r="4"
												stroke="currentColor"
												stroke-width="1.7"
											/>
										</svg>
									</span>

									<input
										id="username"
										bind:value={username}
										autocomplete="username"
										placeholder={isArabic ? 'أدخل اسم المستخدم' : 'Enter your username'}
										aria-invalid={Boolean(errorMessage)}
									/>
								</div>
							</div>

							<!-- PASSWORD -->
							<div class="field">
								<label for="password">
									{isArabic ? 'كلمة المرور' : 'Password'}
								</label>

								<div class="input-wrapper password-wrapper">
									<span class="input-icon" aria-hidden="true">
										<svg viewBox="0 0 24 24" fill="none">
											<rect
												x="5"
												y="10"
												width="14"
												height="10"
												rx="2"
												stroke="currentColor"
												stroke-width="1.7"
											/>
											<path
												d="M8 10V7a4 4 0 0 1 8 0v3"
												stroke="currentColor"
												stroke-width="1.7"
												stroke-linecap="round"
											/>
										</svg>
									</span>

									<input
										id="password"
										bind:value={password}
										type={showPassword ? 'text' : 'password'}
										autocomplete="current-password"
										placeholder={isArabic ? 'أدخل كلمة المرور' : 'Enter your password'}
										aria-invalid={Boolean(errorMessage)}
									/>

									<button
										class="password-toggle"
										type="button"
										aria-label={
											showPassword
												? isArabic
													? 'إخفاء كلمة المرور'
													: 'Hide password'
												: isArabic
													? 'إظهار كلمة المرور'
													: 'Show password'
										}
										aria-pressed={showPassword}
										onclick={() => (showPassword = !showPassword)}
									>
										{showPassword
											? isArabic
												? 'إخفاء'
												: 'Hide'
											: isArabic
												? 'إظهار'
												: 'Show'}
									</button>
								</div>
							</div>

							{#if errorMessage}
								<div class="error-message" role="alert">
									<span aria-hidden="true">!</span>
									<p>{errorMessage}</p>
								</div>
							{/if}

							<div class="form-options">
								<a
									href="/login"
									onclick={(event) => event.preventDefault()}
								>
									{isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
								</a>
							</div>

							<button
								class="submit-button"
								type="submit"
								disabled={isLoading}
							>
								{#if isLoading}
									<span class="button-loading">
										<span></span>
										<span></span>
										<span></span>
									</span>

									<span>
										{isArabic ? 'جارٍ تسجيل الدخول...' : 'Signing in...'}
									</span>
								{:else}
									<span>
										{isArabic ? 'تسجيل الدخول' : 'Sign in'}
									</span>

									<span class="button-arrow" aria-hidden="true">
										{isArabic ? '←' : '→'}
									</span>
								{/if}
							</button>
						</form>

						<!-- DEVELOPMENT ACCOUNT -->
						<div class="development-account">
							<div class="development-title">
								<span class="development-dot"></span>
								<strong>
									{isArabic ? 'حساب التطوير' : 'Development Account'}
								</strong>
							</div>

							<p>
								{isArabic
									? 'للاستخدام أثناء تطوير المشروع فقط.'
									: 'For development use only.'}
							</p>

							<div class="credentials">
								<span>
									{isArabic ? 'اسم المستخدم' : 'Username'}:
									<code>admin</code>
								</span>

								<span>
									{isArabic ? 'كلمة المرور' : 'Password'}:
									<code>admin123</code>
								</span>
							</div>
						</div>
					{/if}
				</div>
			</section>

			<!-- EDUCATION VISUAL -->
			<aside
				class="education-panel"
				aria-label={isArabic ? 'رمز تعليمي' : 'Educational visual'}
			>
				<div class="visual-glow"></div>

				<div class="visual-header">
					<span class="visual-label">TSD</span>

					<span>
						{isArabic ? 'فرع اللقطة' : 'AL-LUQTA BRANCH'}
					</span>
				</div>

				<div class="book-scene">
					<div class="floating-mark mark-one">ت</div>
					<div class="floating-mark mark-two">ع</div>
					<div class="floating-mark mark-three">Q</div>

					<div class="book-shadow"></div>

					<div class="book">
						<div class="book-cover cover-left"></div>

						<div class="book-cover cover-right"></div>

						<div class="book-pages pages-left">
							<span></span>
							<span></span>
							<span></span>
							<span></span>
						</div>

						<div class="book-pages pages-right">
							<span></span>
							<span></span>
							<span></span>
							<span></span>
						</div>

						<div class="book-spine"></div>
					</div>

					<div class="book-line"></div>
				</div>

				<div class="visual-copy">
					<p class="arabic-quote">
						{isArabic ? 'العلم أساس المستقبل' : 'Knowledge builds the future'}
					</p>

					<p class="visual-description">
						{isArabic
							? 'هوية تونسية، تعليم متميز، في قلب الدوحة.'
							: 'Tunisian identity, excellent education, at the heart of Doha.'}
					</p>
				</div>

				<div class="visual-footer">
					<span>{isArabic ? 'تعليم' : 'LEARNING'}</span>
					<span class="footer-dot"></span>
					<span>{isArabic ? 'متابعة' : 'FOLLOW-UP'}</span>
					<span class="footer-dot"></span>
					<span>{isArabic ? 'مسؤولية' : 'RESPONSIBILITY'}</span>
				</div>
			</aside>
		</div>

		<!-- FOOTER -->
		<footer class="login-footer">
			<a href="/">
				{isArabic ? 'العودة إلى الصفحة الرئيسية' : 'Back to home'}
			</a>

			<span aria-hidden="true">·</span>

			<span>
				{isArabic ? 'الدوحة، قطر' : 'Doha, Qatar'}
			</span>
		</footer>
	</div>
</main>

<style>
	.login-page {
		--background: #f4f0eb;
		--surface: #fffdfb;
		--surface-soft: #f8f4f0;
		--text: #302528;
		--muted: #7f7173;
		--border: #e5dbd5;
		--burgundy: #861f3b;
		--burgundy-dark: #67152d;
		--burgundy-soft: #f3e6e9;
		--cream: #efe7df;
		--success: #4d8a68;
		--error: #b33d4e;
		--shadow: 0 24px 70px rgba(70, 39, 42, 0.11);

		position: relative;
		min-height: 100svh;
		overflow: hidden;
		background:
			radial-gradient(circle at 15% 20%, rgba(134, 31, 59, 0.055), transparent 28rem),
			radial-gradient(circle at 85% 80%, rgba(134, 31, 59, 0.045), transparent 30rem),
			var(--background);
		color: var(--text);
		transition:
			background-color 250ms ease,
			color 250ms ease;
	}

	.login-page.dark {
		--background: #241f20;
		--surface: #30292b;
		--surface-soft: #382f31;
		--text: #f7efeb;
		--muted: #c3b3b0;
		--border: #514346;
		--burgundy: #c47788;
		--burgundy-dark: #d18b99;
		--burgundy-soft: #493136;
		--cream: #3a3030;
		--success: #76ad8c;
		--error: #e18b99;
		--shadow: 0 24px 70px rgba(0, 0, 0, 0.25);
	}

	.background-decoration {
		position: absolute;
		border: 1px solid color-mix(in srgb, var(--burgundy) 8%, transparent);
		border-radius: 50%;
		pointer-events: none;
	}

	.background-decoration-one {
		width: 35rem;
		height: 35rem;
		top: -22rem;
		inset-inline-start: -16rem;
	}

	.background-decoration-two {
		width: 28rem;
		height: 28rem;
		right: -16rem;
		bottom: -18rem;
	}

	.login-shell {
		position: relative;
		z-index: 1;
		display: flex;
		width: min(100% - 2rem, 88rem);
		min-height: 100svh;
		margin: 0 auto;
		flex-direction: column;
	}

	/* HEADER */

	.login-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 0;
		border-bottom: 1px solid var(--border);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		color: var(--text);
		text-decoration: none;
	}

	.brand-logo {
		display: grid;
		width: 3rem;
		height: 3rem;
		flex: 0 0 3rem;
		place-items: center;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		background: white;
		box-shadow: 0 5px 15px rgba(70, 39, 42, 0.07);
	}

	.brand-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 0.25rem;
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		gap: 0.18rem;
		line-height: 1.2;
	}

	.brand-text strong {
		font-size: 0.86rem;
		font-weight: 800;
	}

	.brand-text span {
		color: var(--muted);
		font-size: 0.7rem;
	}

	.header-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.language-switcher {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--muted);
		font-size: 0.75rem;
	}

	.language-switcher button {
		padding: 0.4rem 0.15rem;
		border: 0;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		font: inherit;
		transition: color 180ms ease;
	}

	.language-switcher button:hover,
	.language-switcher button.active {
		color: var(--burgundy);
	}

	.language-switcher button.active {
		font-weight: 800;
	}

	.theme-button {
		display: grid;
		width: 2.4rem;
		height: 2.4rem;
		place-items: center;
		border: 1px solid var(--border);
		border-radius: 0.7rem;
		background: var(--surface);
		color: var(--burgundy);
		cursor: pointer;
		font-size: 1rem;
		transition:
			transform 180ms ease,
			border-color 180ms ease;
	}

	.theme-button:hover {
		border-color: var(--burgundy);
		transform: translateY(-1px);
	}

	/* CONTENT */

	.login-content {
		display: grid;
		flex: 1;
		grid-template-columns: 1fr;
		align-items: center;
		gap: 1.25rem;
		padding: 1.25rem 0;
	}

	.login-card {
		position: relative;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 1.25rem;
		background: var(--surface);
		box-shadow: var(--shadow);
		animation: card-in 650ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.card-accent {
		position: absolute;
		top: 0;
		inset-inline: 0;
		height: 0.3rem;
		background: linear-gradient(
			90deg,
			var(--burgundy-dark),
			var(--burgundy),
			#9f5267
		);
	}

	.card-content {
		padding: 2rem 1.3rem;
	}

	.welcome-icon {
		display: grid;
		width: 3.2rem;
		height: 3.2rem;
		margin-bottom: 1.15rem;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--burgundy) 28%, var(--border));
		border-radius: 0.9rem 0.9rem 0.9rem 0.25rem;
		background: var(--burgundy-soft);
		color: var(--burgundy);
		font-family: Georgia, serif;
		font-size: 1.35rem;
		font-weight: 700;
	}

	.heading {
		margin-bottom: 1.7rem;
	}

	.eyebrow {
		margin: 0 0 0.45rem;
		color: var(--burgundy);
		font-size: 0.76rem;
		font-weight: 800;
		letter-spacing: 0.03em;
	}

	h1,
	h2,
	p {
		margin-top: 0;
	}

	h1 {
		margin-bottom: 0.4rem;
		font-size: clamp(2rem, 8vw, 2.65rem);
		font-weight: 800;
		line-height: 1.2;
		letter-spacing: -0.035em;
	}

	.subtitle {
		max-width: 30rem;
		margin-bottom: 0;
		color: var(--muted);
		font-size: 0.96rem;
		line-height: 1.8;
	}

	/* FORM */

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 1.15rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.field label {
		font-size: 0.88rem;
		font-weight: 750;
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.input-icon {
		position: absolute;
		inset-inline-start: 0.9rem;
		display: grid;
		width: 1.25rem;
		height: 1.25rem;
		place-items: center;
		color: var(--muted);
		pointer-events: none;
		transition: color 180ms ease;
	}

	.input-icon svg {
		width: 100%;
		height: 100%;
	}

	.input-wrapper:focus-within .input-icon {
		color: var(--burgundy);
	}

	.field input {
		width: 100%;
		min-height: 3.35rem;
		padding: 0.8rem 0.95rem;
		padding-inline-start: 2.75rem;
		border: 1px solid var(--border);
		border-radius: 0.7rem;
		outline: none;
		background: var(--surface-soft);
		color: var(--text);
		font-family: inherit;
		font-size: 0.96rem;
		transition:
			border-color 180ms ease,
			box-shadow 180ms ease,
			background-color 180ms ease;
	}

	.field input::placeholder {
		color: var(--muted);
		opacity: 0.78;
	}

	.field input:focus {
		border-color: var(--burgundy);
		background: var(--surface);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--burgundy) 13%, transparent);
	}

	.password-wrapper input {
		padding-inline-end: 4.5rem;
	}

	.password-toggle {
		position: absolute;
		inset-inline-end: 0.65rem;
		top: 50%;
		min-width: 3.3rem;
		padding: 0.35rem;
		border: 0;
		background: transparent;
		color: var(--burgundy);
		cursor: pointer;
		font-family: inherit;
		font-size: 0.76rem;
		font-weight: 700;
		transform: translateY(-50%);
	}

	.password-toggle:hover {
		color: var(--burgundy-dark);
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: -0.25rem 0 0;
		padding: 0.7rem 0.8rem;
		border: 1px solid color-mix(in srgb, var(--error) 25%, var(--border));
		border-radius: 0.65rem;
		background: color-mix(in srgb, var(--error) 6%, var(--surface));
		color: var(--error);
	}

	.error-message span {
		display: grid;
		width: 1.35rem;
		height: 1.35rem;
		flex: 0 0 1.35rem;
		place-items: center;
		border-radius: 50%;
		background: var(--error);
		color: white;
		font-size: 0.72rem;
		font-weight: 800;
	}

	.error-message p {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.5;
	}

	.form-options {
		display: flex;
		justify-content: flex-start;
		margin-top: -0.2rem;
	}

	.form-options a {
		color: var(--burgundy);
		font-size: 0.8rem;
		font-weight: 650;
		text-decoration: none;
	}

	.form-options a:hover {
		text-decoration: underline;
	}

	.submit-button {
		display: flex;
		width: 100%;
		min-height: 3.5rem;
		align-items: center;
		justify-content: space-between;
		padding: 0.8rem 1.1rem;
		border: 0;
		border-radius: 0.7rem;
		background: var(--burgundy);
		box-shadow: 0 10px 25px color-mix(in srgb, var(--burgundy) 22%, transparent);
		color: white;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 800;
		transition:
			background-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	.submit-button:hover:not(:disabled) {
		background: var(--burgundy-dark);
		box-shadow: 0 14px 30px color-mix(in srgb, var(--burgundy) 27%, transparent);
		transform: translateY(-2px);
	}

	.submit-button:active:not(:disabled) {
		transform: translateY(0);
	}

	.submit-button:disabled {
		cursor: wait;
		opacity: 0.82;
	}

	.button-arrow {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.45rem;
		font-size: 1rem;
	}

	.button-loading {
		display: flex;
		gap: 0.25rem;
		align-items: center;
	}

	.button-loading span {
		width: 0.35rem;
		height: 0.35rem;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.9);
		animation: loading-bounce 700ms ease-in-out infinite alternate;
	}

	.button-loading span:nth-child(2) {
		animation-delay: 140ms;
	}

	.button-loading span:nth-child(3) {
		animation-delay: 280ms;
	}

	/* DEVELOPMENT */

	.development-account {
		margin-top: 1.15rem;
		padding: 0.85rem;
		border: 1px dashed color-mix(in srgb, var(--burgundy) 28%, var(--border));
		border-radius: 0.7rem;
		background: color-mix(in srgb, var(--burgundy) 3%, var(--surface));
	}

	.development-title {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--burgundy);
		font-size: 0.78rem;
	}

	.development-dot {
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 50%;
		background: var(--burgundy);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--burgundy) 10%, transparent);
	}

	.development-account p {
		margin: 0.45rem 0 0.7rem;
		color: var(--muted);
		font-size: 0.73rem;
	}

	.credentials {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 1rem;
		color: var(--muted);
		font-size: 0.7rem;
	}

	.credentials code {
		color: var(--text);
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: 0.7rem;
	}

	/* EDUCATION PANEL */

	.education-panel {
		position: relative;
		display: flex;
		min-height: 22rem;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 1.25rem;
		background:
			linear-gradient(
				145deg,
				var(--surface) 0%,
				var(--surface-soft) 100%
			);
		box-shadow: var(--shadow);
		animation: visual-in 750ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both;
	}

	.education-panel::before {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(
				90deg,
				transparent 49.5%,
				color-mix(in srgb, var(--burgundy) 7%, transparent) 50%,
				transparent 50.5%
			),
			linear-gradient(
				0deg,
				transparent 49.5%,
				color-mix(in srgb, var(--burgundy) 7%, transparent) 50%,
				transparent 50.5%
			);
		background-size: 3.5rem 3.5rem;
		mask-image: linear-gradient(135deg, #000, transparent 75%);
		content: '';
		opacity: 0.5;
		pointer-events: none;
	}

	.visual-glow {
		position: absolute;
		width: 17rem;
		height: 17rem;
		top: 25%;
		left: 50%;
		border-radius: 50%;
		background: color-mix(in srgb, var(--burgundy) 7%, transparent);
		filter: blur(35px);
		transform: translate(-50%, -50%);
	}

	.visual-header {
		position: relative;
		z-index: 2;
		display: flex;
		width: calc(100% - 2rem);
		align-items: center;
		justify-content: space-between;
		padding-top: 1rem;
		color: var(--muted);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
	}

	.visual-label {
		color: var(--burgundy);
		font-size: 0.85rem;
		letter-spacing: 0.04em;
	}

	.book-scene {
		position: relative;
		z-index: 2;
		display: flex;
		width: 17rem;
		height: 12rem;
		align-items: flex-end;
		justify-content: center;
		perspective: 800px;
	}

	.book-shadow {
		position: absolute;
		bottom: 1.5rem;
		width: 12rem;
		height: 1.3rem;
		border-radius: 50%;
		background: rgba(60, 36, 39, 0.13);
		filter: blur(10px);
	}

	.book {
		position: relative;
		display: flex;
		width: 12rem;
		height: 7.5rem;
		align-items: flex-end;
		justify-content: center;
		transform: rotateX(8deg) rotateZ(-1deg);
		transform-style: preserve-3d;
		animation: book-float 5s ease-in-out infinite;
	}

	.book-cover {
		position: absolute;
		bottom: 0;
		width: 5.9rem;
		height: 7.1rem;
		border: 1px solid var(--burgundy);
		background: var(--burgundy);
		box-shadow: 0 10px 25px rgba(70, 30, 42, 0.13);
	}

	.cover-left {
		left: 0;
		border-radius: 0.45rem 0 0 0.25rem;
		transform: skewY(-7deg);
	}

	.cover-right {
		right: 0;
		border-radius: 0 0.45rem 0.25rem 0;
		transform: skewY(7deg);
	}

	.book-pages {
		position: absolute;
		bottom: 0.25rem;
		width: 5.25rem;
		height: 6.65rem;
		overflow: hidden;
		background: #fffdf8;
	}

	.dark .book-pages {
		background: #eee5df;
	}

	.pages-left {
		left: 0.55rem;
		border-radius: 0.2rem 0 0 0.2rem;
		transform: skewY(-7deg);
	}

	.pages-right {
		right: 0.55rem;
		border-radius: 0 0.2rem 0.2rem 0;
		transform: skewY(7deg);
	}

	.book-pages::after {
		position: absolute;
		inset: 0.8rem;
		background:
			repeating-linear-gradient(
				0deg,
				transparent 0 0.75rem,
				rgba(134, 31, 59, 0.12) 0.76rem 0.8rem
			);
		content: '';
		opacity: 0.8;
	}

	.book-pages span {
		position: absolute;
		z-index: 1;
		display: block;
		width: 0.25rem;
		height: 0.25rem;
		border-radius: 50%;
		background: var(--burgundy);
		opacity: 0.7;
	}

	.book-pages span:nth-child(1) {
		top: 1.05rem;
		left: 1rem;
	}

	.book-pages span:nth-child(2) {
		top: 2.2rem;
		right: 1.2rem;
	}

	.book-pages span:nth-child(3) {
		bottom: 1.6rem;
		left: 1.4rem;
	}

	.book-pages span:nth-child(4) {
		right: 1rem;
		bottom: 0.9rem;
	}

	.book-spine {
		position: absolute;
		z-index: 5;
		bottom: 0.1rem;
		left: 50%;
		width: 0.18rem;
		height: 7rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--burgundy-dark) 85%, black);
		transform: translateX(-50%);
	}

	.book-line {
		position: absolute;
		bottom: 0.85rem;
		width: 14rem;
		height: 1px;
		background: var(--border);
	}

	.floating-mark {
		position: absolute;
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border: 1px solid var(--border);
		border-radius: 0.55rem;
		background: color-mix(in srgb, var(--surface) 92%, transparent);
		box-shadow: 0 7px 20px rgba(70, 39, 42, 0.08);
		color: var(--burgundy);
		font-family: Georgia, serif;
		font-size: 0.8rem;
		font-weight: 700;
		backdrop-filter: blur(8px);
	}

	.mark-one {
		top: 1rem;
		left: 1.5rem;
		animation: mark-float 4s ease-in-out infinite;
	}

	.mark-two {
		top: 0.5rem;
		right: 1.5rem;
		animation: mark-float 4.5s ease-in-out 500ms infinite;
	}

	.mark-three {
		top: 4.7rem;
		right: 0.5rem;
		animation: mark-float 5s ease-in-out 1s infinite;
	}

	.visual-copy {
		position: relative;
		z-index: 2;
		padding: 0 1.25rem 0.75rem;
		text-align: center;
	}

	.arabic-quote {
		margin-bottom: 0.45rem;
		color: var(--burgundy);
		font-family: Georgia, serif;
		font-size: 1.2rem;
		font-weight: 700;
	}

	.visual-description {
		max-width: 26rem;
		margin-bottom: 0;
		color: var(--muted);
		font-size: 0.76rem;
		line-height: 1.7;
	}

	.visual-footer {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding-bottom: 1.1rem;
		color: var(--muted);
		font-size: 0.53rem;
		font-weight: 700;
		letter-spacing: 0.1em;
	}

	.footer-dot {
		width: 0.2rem;
		height: 0.2rem;
		border-radius: 50%;
		background: var(--burgundy);
	}

	/* SUCCESS */

	.success-state {
		display: flex;
		min-height: 22rem;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		animation: success-in 500ms ease both;
	}

	.success-circle {
		display: grid;
		width: 4.3rem;
		height: 4.3rem;
		margin-bottom: 1.1rem;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--success) 35%, var(--border));
		border-radius: 50%;
		background: color-mix(in srgb, var(--success) 8%, var(--surface));
		color: var(--success);
		font-size: 1.8rem;
		font-weight: 600;
		animation: success-pop 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.success-eyebrow {
		margin-bottom: 0.5rem;
		color: var(--success);
		font-size: 0.8rem;
		font-weight: 800;
	}

	.success-state h2 {
		margin-bottom: 0.2rem;
		font-size: clamp(1.35rem, 6vw, 1.8rem);
	}

	.success-state > p:last-of-type {
		margin-bottom: 0;
		color: var(--muted);
		font-size: 0.85rem;
	}

	.success-line {
		display: flex;
		gap: 0.3rem;
		margin-top: 1.5rem;
	}

	.success-line span {
		width: 0.3rem;
		height: 0.3rem;
		border-radius: 50%;
		background: var(--burgundy);
		animation: success-dots 1s ease-in-out infinite;
	}

	.success-line span:nth-child(2) {
		animation-delay: 120ms;
	}

	.success-line span:nth-child(3) {
		animation-delay: 240ms;
	}

	/* FOOTER */

	.login-footer {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		padding: 0.15rem 0 1rem;
		color: var(--muted);
		font-size: 0.7rem;
	}

	.login-footer a {
		color: var(--burgundy);
		text-decoration: none;
	}

	.login-footer a:hover {
		text-decoration: underline;
	}

	/* FOCUS */

	.language-switcher button:focus-visible,
	.theme-button:focus-visible,
	.password-toggle:focus-visible,
	.submit-button:focus-visible,
	.form-options a:focus-visible,
	.login-footer a:focus-visible,
	.brand:focus-visible {
		outline: 3px solid color-mix(in srgb, var(--burgundy) 25%, transparent);
		outline-offset: 3px;
	}

	/* ANIMATIONS */

	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateY(0.8rem);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes visual-in {
		from {
			opacity: 0;
			transform: translateY(1rem);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes book-float {
		0%,
		100% {
			transform: rotateX(8deg) rotateZ(-1deg) translateY(0);
		}

		50% {
			transform: rotateX(8deg) rotateZ(-1deg) translateY(-0.35rem);
		}
	}

	@keyframes mark-float {
		0%,
		100% {
			transform: translateY(0);
		}

		50% {
			transform: translateY(-0.45rem);
		}
	}

	@keyframes loading-bounce {
		from {
			transform: translateY(0);
			opacity: 0.5;
		}

		to {
			transform: translateY(-0.25rem);
			opacity: 1;
		}
	}

	@keyframes success-in {
		from {
			opacity: 0;
			transform: translateY(0.6rem);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes success-pop {
		from {
			opacity: 0;
			transform: scale(0.7);
		}

		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes success-dots {
		0%,
		100% {
			opacity: 0.35;
			transform: translateY(0);
		}

		50% {
			opacity: 1;
			transform: translateY(-0.2rem);
		}
	}

	@media (min-width: 700px) {
		.login-shell {
			width: min(100% - 4rem, 88rem);
		}

		.login-header {
			padding: 1.15rem 0;
		}

		.login-content {
			grid-template-columns: minmax(0, 1.02fr) minmax(22rem, 0.82fr);
			gap: 1.5rem;
			padding: 1.5rem 0;
		}

		.card-content {
			padding: clamp(2.25rem, 4vw, 4rem);
		}

		.education-panel {
			min-height: 34rem;
		}

		.book-scene {
			width: 22rem;
			height: 15rem;
		}

		.book {
			width: 14rem;
			height: 8.5rem;
		}

		.book-cover {
			width: 6.9rem;
			height: 8.1rem;
		}

		.book-pages {
			width: 6.25rem;
			height: 7.65rem;
		}

		.pages-left {
			left: 0.65rem;
		}

		.pages-right {
			right: 0.65rem;
		}

		.book-spine {
			height: 8rem;
		}

		.book-line {
			width: 17rem;
		}

		.login-footer {
			justify-content: flex-start;
			padding-bottom: 1.25rem;
		}
	}

	@media (max-width: 520px) {
		.brand-text span {
			display: none;
		}

		.brand-text strong {
			font-size: 0.76rem;
		}

		.language-switcher {
			font-size: 0.68rem;
		}

		.header-controls {
			gap: 0.45rem;
		}

		.card-content {
			padding: 1.75rem 1.1rem;
		}

		.education-panel {
			min-height: 19rem;
		}

		.visual-footer {
			font-size: 0.46rem;
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