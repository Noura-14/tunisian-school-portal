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

<svelte:head>
	<title>{isArabic ? 'الإعدادات | فضاء المتابعة' : 'Settings | Follow-up Portal'}</title>
</svelte:head>

<section class="settings-page" aria-labelledby="settings-title">
	<header class="page-heading">
		<div class="heading-copy">
			<div class="heading-icon" aria-hidden="true">
				<span>⚙</span>
			</div>

			<div>
				<p class="eyebrow">
					{isArabic ? 'تخصيص الفضاء' : 'Portal preferences'}
				</p>

				<h1 id="settings-title">
					{isArabic ? 'الإعدادات' : 'Settings'}
				</h1>

				<p class="heading-description">
					{isArabic
						? 'إدارة اللغة والمظهر ومعلومات الحساب.'
						: 'Manage language, appearance, and account information.'}
				</p>
			</div>
		</div>
	</header>

	<div class="settings-layout">
		<section class="settings-card" aria-label={isArabic ? 'إعدادات الفضاء' : 'Portal settings'}>
			<div class="card-header">
				<div>
					<p class="card-eyebrow">{isArabic ? 'التفضيلات' : 'Preferences'}</p>
					<h2>{isArabic ? 'تفضيلات الفضاء' : 'Portal preferences'}</h2>
				</div>

				<div class="card-mark" aria-hidden="true">TSD</div>
			</div>

			<div class="settings-list">
				<section class="setting-row" aria-labelledby="language-setting">
					<div class="setting-info">
						<div class="setting-icon language-icon" aria-hidden="true">
							<span>文</span>
						</div>

						<div>
							<h3 id="language-setting">
								{isArabic ? 'اللغة' : 'Language'}
							</h3>

							<p>
								{isArabic
									? 'اختر لغة فضاء المتابعة.'
									: 'Choose the portal language.'}
							</p>
						</div>
					</div>

					<div class="setting-control">
						<div class="segmented-control" aria-label={isArabic ? 'اختيار اللغة' : 'Language selection'}>
							<button
								class:active={isArabic}
								type="button"
								aria-pressed={isArabic}
								onclick={() => setLanguage('ar')}
							>
								العربية
							</button>

							<button
								class:active={!isArabic}
								type="button"
								aria-pressed={!isArabic}
								onclick={() => setLanguage('en')}
							>
								English
							</button>
						</div>
					</div>
				</section>

				<section class="setting-row" aria-labelledby="theme-setting">
					<div class="setting-info">
						<div class="setting-icon theme-icon" aria-hidden="true">
							<span>{appState.theme === 'dark' ? '☾' : '☀'}</span>
						</div>

						<div>
							<h3 id="theme-setting">
								{isArabic ? 'المظهر' : 'Theme'}
							</h3>

							<p>
								{isArabic
									? 'اختر المظهر الفاتح أو الداكن.'
									: 'Choose a light or dark appearance.'}
							</p>
						</div>
					</div>

					<div class="setting-control">
						<div class="segmented-control" aria-label={isArabic ? 'اختيار المظهر' : 'Theme selection'}>
							<button
								class:active={appState.theme === 'light'}
								type="button"
								aria-pressed={appState.theme === 'light'}
								onclick={() => setTheme('light')}
							>
								<span class="control-symbol" aria-hidden="true">☀</span>
								{isArabic ? 'فاتح' : 'Light'}
							</button>

							<button
								class:active={appState.theme === 'dark'}
								type="button"
								aria-pressed={appState.theme === 'dark'}
								onclick={() => setTheme('dark')}
							>
								<span class="control-symbol" aria-hidden="true">☾</span>
								{isArabic ? 'داكن' : 'Dark'}
							</button>
						</div>
					</div>
				</section>
			</div>
		</section>

		<section class="account-card" aria-labelledby="account-setting">
			<div class="account-top">
				<div class="account-icon" aria-hidden="true">
					<span>
						{isArabic
							? (appState.user?.nameAr?.charAt(0) || 'أ')
							: (appState.user?.name?.charAt(0) || 'A')}
					</span>
				</div>

				<div class="account-copy">
					<p class="card-eyebrow">{isArabic ? 'الحساب' : 'Account'}</p>

					<h2 id="account-setting">
						{isArabic ? 'معلومات الحساب' : 'Account information'}
					</h2>

					<p>
						{isArabic
							? 'المستخدم المسجل حالياً.'
							: 'Currently signed-in user.'}
					</p>
				</div>
			</div>

			<div class="account-detail">
				<div class="account-name">
					<span class="detail-label">
						{isArabic ? 'الاسم' : 'Name'}
					</span>

					<strong>
						{isArabic ? appState.user.nameAr : appState.user.name}
					</strong>
				</div>

				<div class="account-role">
					<span class="detail-label">
						{isArabic ? 'الدور' : 'Role'}
					</span>

					<span class="role-badge">
						{isArabic ? appState.user.roleAr : appState.user.role}
					</span>
				</div>
			</div>

			<div class="account-footer">
				<span class="status-dot" aria-hidden="true"></span>

				<span>
					{isArabic ? 'الحساب نشط' : 'Account active'}
				</span>
			</div>
		</section>
	</div>

	<div class="settings-note">
		<div class="note-icon" aria-hidden="true">✓</div>

		<div>
			<strong>
				{isArabic ? 'إعداداتك محفوظة تلقائياً' : 'Your preferences are saved automatically'}
			</strong>

			<p>
				{isArabic
					? 'سيتم الاحتفاظ باللغة والمظهر الذي اخترتهما عند العودة إلى فضاء المتابعة.'
					: 'Your selected language and appearance will be remembered when you return to the portal.'}
			</p>
		</div>
	</div>
</section>

<style>
	.settings-page {
		width: 100%;
		max-width: 72rem;
		margin: 0 auto;
		padding-bottom: 2rem;
		animation: page-enter 400ms ease both;
	}

	.page-heading {
		margin-bottom: 1.5rem;
	}

	.heading-copy {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.heading-icon {
		display: grid;
		flex: 0 0 auto;
		width: 3.15rem;
		height: 3.15rem;
		place-items: center;
		border: 1px solid rgba(139, 30, 63, 0.14);
		border-radius: 14px;
		background: var(--app-accent-soft);
		color: var(--app-accent);
		box-shadow: 0 8px 20px rgba(139, 30, 63, 0.08);
	}

	.heading-icon span {
		font-size: 1.35rem;
		line-height: 1;
	}

	.eyebrow {
		margin: 0 0 0.35rem;
		color: var(--app-accent);
		font-size: 0.76rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	h1,
	h2,
	h3,
	p {
		margin-top: 0;
	}

	h1 {
		margin-bottom: 0.35rem;
		color: var(--app-text);
		font-size: clamp(1.85rem, 4vw, 2.55rem);
		font-weight: 850;
		letter-spacing: -0.035em;
		line-height: 1.15;
	}

	.heading-description {
		max-width: 42rem;
		margin: 0;
		color: var(--app-muted);
		font-size: 0.95rem;
		line-height: 1.7;
	}

	.settings-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.55fr) minmax(18rem, 0.75fr);
		gap: 1rem;
		align-items: stretch;
	}

	.settings-card,
	.account-card {
		overflow: hidden;
		border: 1px solid var(--app-border);
		border-radius: 18px;
		background: var(--app-surface);
		box-shadow: var(--app-shadow);
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 1.35rem;
		border-bottom: 1px solid var(--app-border);
		background: var(--app-surface-soft);
	}

	.card-eyebrow {
		margin: 0 0 0.25rem;
		color: var(--app-accent);
		font-size: 0.7rem;
		font-weight: 850;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.card-header h2,
	.account-copy h2 {
		margin: 0;
		color: var(--app-text);
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: -0.015em;
	}

	.card-mark {
		display: grid;
		width: 2.55rem;
		height: 2.55rem;
		place-items: center;
		border-radius: 10px;
		background: var(--app-accent);
		color: #fff;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.03em;
	}

	.settings-list {
		display: flex;
		flex-direction: column;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		min-height: 6.6rem;
		padding: 1.25rem 1.35rem;
		border-bottom: 1px solid var(--app-border);
	}

	.setting-row:last-child {
		border-bottom: 0;
	}

	.setting-info {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.85rem;
	}

	.setting-icon {
		display: grid;
		flex: 0 0 auto;
		width: 2.7rem;
		height: 2.7rem;
		place-items: center;
		border: 1px solid var(--app-border);
		border-radius: 11px;
		background: var(--app-surface-strong);
		color: var(--app-accent);
	}

	.setting-icon span {
		font-size: 1rem;
		font-weight: 800;
	}

	.language-icon span {
		font-size: 1.05rem;
	}

	.theme-icon span {
		font-size: 1.2rem;
	}

	.setting-info h3 {
		margin: 0 0 0.25rem;
		color: var(--app-text);
		font-size: 0.92rem;
		font-weight: 800;
	}

	.setting-info p {
		max-width: 26rem;
		margin: 0;
		color: var(--app-muted);
		font-size: 0.8rem;
		line-height: 1.55;
	}

	.setting-control {
		flex: 0 0 auto;
	}

	.segmented-control {
		display: flex;
		gap: 0.2rem;
		padding: 0.2rem;
		border: 1px solid var(--app-border);
		border-radius: 11px;
		background: var(--app-surface-strong);
	}

	.segmented-control button {
		display: inline-flex;
		min-width: 4.6rem;
		min-height: 2.35rem;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.45rem 0.7rem;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: var(--app-muted);
		cursor: pointer;
		font: inherit;
		font-size: 0.78rem;
		font-weight: 700;
		transition:
			background 160ms ease,
			color 160ms ease,
			transform 160ms ease;
	}

	.segmented-control button:hover {
		color: var(--app-text);
	}

	.segmented-control button.active {
		background: var(--app-accent);
		color: #fff;
		box-shadow: 0 4px 12px rgba(139, 30, 63, 0.18);
	}

	.segmented-control button.active:hover {
		background: var(--app-accent-dark);
		color: #fff;
		transform: translateY(-1px);
	}

	.control-symbol {
		font-size: 0.85rem;
		line-height: 1;
	}

	.segmented-control button:focus-visible {
		outline: 3px solid color-mix(in srgb, var(--app-accent) 30%, transparent);
		outline-offset: 2px;
	}

	.account-card {
		display: flex;
		flex-direction: column;
		padding: 1.35rem;
	}

	.account-top {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding-bottom: 1.15rem;
		border-bottom: 1px solid var(--app-border);
	}

	.account-icon {
		display: grid;
		flex: 0 0 auto;
		width: 3.25rem;
		height: 3.25rem;
		place-items: center;
		border-radius: 50%;
		background: var(--app-accent);
		color: #fff;
		box-shadow: 0 8px 18px rgba(139, 30, 63, 0.2);
	}

	.account-icon span {
		font-size: 1.25rem;
		font-weight: 850;
	}

	.account-copy {
		min-width: 0;
	}

	.account-copy h2 {
		margin-bottom: 0.2rem;
	}

	.account-copy > p:last-child {
		margin: 0;
		color: var(--app-muted);
		font-size: 0.76rem;
		line-height: 1.5;
	}

	.account-detail {
		display: grid;
		gap: 0.85rem;
		padding: 1.15rem 0;
	}

	.account-name,
	.account-role {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.detail-label {
		color: var(--app-muted);
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.account-name strong {
		color: var(--app-text);
		font-size: 0.95rem;
		font-weight: 800;
		line-height: 1.45;
	}

	.role-badge {
		display: inline-flex;
		width: fit-content;
		align-items: center;
		min-height: 1.8rem;
		padding: 0.3rem 0.65rem;
		border: 1px solid rgba(139, 30, 63, 0.15);
		border-radius: 8px;
		background: var(--app-accent-soft);
		color: var(--app-accent);
		font-size: 0.75rem;
		font-weight: 800;
	}

	.account-footer {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin-top: auto;
		padding-top: 0.9rem;
		border-top: 1px solid var(--app-border);
		color: var(--app-muted);
		font-size: 0.73rem;
		font-weight: 700;
	}

	.status-dot {
		width: 0.48rem;
		height: 0.48rem;
		border-radius: 50%;
		background: #31966b;
		box-shadow: 0 0 0 4px rgba(49, 150, 107, 0.1);
	}

	.settings-note {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-top: 1rem;
		padding: 0.95rem 1.1rem;
		border: 1px solid rgba(139, 30, 63, 0.12);
		border-radius: 14px;
		background: var(--app-accent-soft);
		color: var(--app-text);
	}

	.note-icon {
		display: grid;
		flex: 0 0 auto;
		width: 1.85rem;
		height: 1.85rem;
		place-items: center;
		border-radius: 8px;
		background: var(--app-accent);
		color: #fff;
		font-size: 0.78rem;
		font-weight: 900;
	}

	.settings-note strong {
		display: block;
		margin-bottom: 0.15rem;
		font-size: 0.8rem;
		font-weight: 800;
	}

	.settings-note p {
		margin: 0;
		color: var(--app-muted);
		font-size: 0.74rem;
		line-height: 1.55;
	}

	@keyframes page-enter {
		from {
			opacity: 0;
			transform: translateY(0.45rem);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 900px) {
		.settings-layout {
			grid-template-columns: 1fr;
		}

		.account-card {
			min-height: auto;
		}

		.account-footer {
			margin-top: 0;
		}
	}

	@media (max-width: 600px) {
		.heading-copy {
			gap: 0.75rem;
		}

		.heading-icon {
			width: 2.8rem;
			height: 2.8rem;
		}

		h1 {
			font-size: 1.85rem;
		}

		.card-header {
			padding: 1rem;
		}

		.setting-row {
			align-items: stretch;
			flex-direction: column;
			gap: 0.9rem;
			padding: 1rem;
		}

		.setting-control {
			width: 100%;
		}

		.segmented-control {
			width: 100%;
		}

		.segmented-control button {
			flex: 1;
		}

		.account-card {
			padding: 1rem;
		}

		.settings-note {
			padding: 0.85rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.settings-page {
			animation: none;
		}

		.segmented-control button {
			transition: none;
		}
	}
</style>