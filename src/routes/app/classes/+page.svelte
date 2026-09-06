<script>
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { classOptions, importedStudents } from '$lib/data/students.js';
	import { getContext } from 'svelte';

	const appState = getContext('app-state');
	const isArabic = $derived(appState.language === 'ar');

	let classes = $state([...classOptions]);

	/** @type {'add' | null} */
	let activeModal = $state(null);

	let newClassName = $state('');
	let formError = $state('');

	/** @param {string} className */
	function slugForClass(className) {
		return className.replace('ème', 'eme').replace(' ', '-');
	}

	/** @param {string} className */
	function studentCount(className) {
		return importedStudents.filter(
			(student) => student.className === className
		).length;
	}

	function closeModal() {
		activeModal = null;
		newClassName = '';
		formError = '';
	}

	/** @param {SubmitEvent} event */
	function addClass(event) {
		event.preventDefault();

		const value = newClassName.trim();

		if (!value) {
			formError = isArabic
				? 'يرجى إدخال اسم القسم.'
				: 'Please enter a class name.';
			return;
		}

		if (classes.includes(value)) {
			formError = isArabic
				? 'هذا القسم موجود بالفعل.'
				: 'This class already exists.';
			return;
		}

		classes = [...classes, value];
		closeModal();
	}

	/** @param {string} className */
	function deleteClass(className) {
		if (
			window.confirm(
				isArabic
					? `هل أنت متأكد من حذف قسم ${className}؟`
					: `Are you sure you want to delete ${className}?`
			)
		) {
			classes = classes.filter((item) => item !== className);
		}
	}

	const totalStudents = $derived(
		classes.reduce((total, className) => total + studentCount(className), 0)
	);
</script>

<svelte:head>
	<title>
		{isArabic
			? 'الأقسام | فضاء المتابعة'
			: 'Classes | Follow-up Portal'}
	</title>
</svelte:head>

<section
	class="classes-page"
	aria-labelledby="classes-title"
	dir={isArabic ? 'rtl' : 'ltr'}
>
	<!-- HEADER -->
	<header class="page-header">
		<div class="heading-copy">
			<div class="title-mark" aria-hidden="true">
				<AppIcon name="classes" size={22} />
			</div>

			<div>
				<p class="eyebrow">
					{isArabic
						? 'تنظيم الفضاء المدرسي'
						: 'School organisation'}
				</p>

				<h1 id="classes-title">
					{isArabic ? 'الأقسام' : 'Classes'}
				</h1>

				<p class="heading-description">
					{isArabic
						? 'استعرض الأقسام واطلع على التلاميذ المنتمين إلى كل قسم.'
						: 'Browse classes and view the students belonging to each one.'}
				</p>
			</div>
		</div>

		<button
			class="add-class-button"
			type="button"
			onclick={() => (activeModal = 'add')}
		>
			<span class="add-icon" aria-hidden="true">+</span>

			<span>
				{isArabic ? 'إضافة قسم' : 'Add Class'}
			</span>
		</button>
	</header>

	<!-- QUICK SUMMARY -->
	<section class="summary-grid" aria-label={isArabic ? 'ملخص الأقسام' : 'Classes overview'}>
		<div class="summary-card">
			<div class="summary-icon">
				<AppIcon name="classes" size={20} />
			</div>

			<div>
				<span>{isArabic ? 'الأقسام' : 'Classes'}</span>
				<strong>{classes.length}</strong>
			</div>
		</div>

		<div class="summary-card">
			<div class="summary-icon students-summary">
				<AppIcon name="students" size={20} />
			</div>

			<div>
				<span>{isArabic ? 'إجمالي التلاميذ' : 'Total students'}</span>
				<strong>{totalStudents}</strong>
			</div>
		</div>

		<div class="summary-card info-summary">
			<div class="summary-icon">
				<span aria-hidden="true">→</span>
			</div>

			<div>
				<span>
					{isArabic ? 'الوصول السريع' : 'Quick access'}
				</span>

				<strong>
					{isArabic ? 'اختر قسماً' : 'Choose a class'}
				</strong>
			</div>
		</div>
	</section>

	<!-- SECTION HEADER -->
	<div class="section-heading">
		<div>
			<h2>
				{isArabic ? 'قائمة الأقسام' : 'Class list'}
			</h2>

			<p>
				{isArabic
					? 'اضغط على أي قسم لعرض تلاميذه.'
					: 'Select a class to view its students.'}
			</p>
		</div>

		<span class="class-count">
			{classes.length}
			{isArabic ? ' أقسام' : classes.length === 1 ? ' class' : ' classes'}
		</span>
	</div>

	<!-- CLASS GRID -->
	<div class="class-grid">
		{#each classes as className, index}
			<div class="class-card">
				<a
					class="class-card-link"
					href={`/app/classes/${slugForClass(className)}`}
				>
					<div class="class-number" aria-hidden="true">
						{String(index + 1).padStart(2, '0')}
					</div>

					<div class="class-icon">
						<AppIcon name="classes" size={21} />
					</div>

					<div class="class-copy">
						<strong>{className}</strong>

						<span>
							{studentCount(className)}
							{isArabic
								? studentCount(className) === 1
									? ' تلميذ'
									: ' تلاميذ'
								: studentCount(className) === 1
									? ' student'
									: ' students'}
						</span>
					</div>

					<div class="class-arrow" aria-hidden="true">
						{isArabic ? '←' : '→'}
					</div>
				</a>

				{#if !classOptions.includes(className)}
					<button
						class="delete-class"
						type="button"
						aria-label={
							isArabic
								? `حذف ${className}`
								: `Delete ${className}`
						}
						onclick={() => deleteClass(className)}
					>
						<AppIcon name="delete" size={15} />
					</button>
				{/if}
			</div>
		{/each}
	</div>

	<!-- EMPTY STATE -->
	{#if !classes.length}
		<div class="empty-state">
			<div class="empty-icon">
				<AppIcon name="classes" size={28} />
			</div>

			<h2>
				{isArabic
					? 'لا توجد أقسام حالياً'
					: 'No classes yet'}
			</h2>

			<p>
				{isArabic
					? 'أضف قسماً جديداً للبدء.'
					: 'Add a new class to get started.'}
			</p>

			<button
				class="empty-add-button"
				type="button"
				onclick={() => (activeModal = 'add')}
			>
				+
				{isArabic ? 'إضافة قسم' : 'Add Class'}
			</button>
		</div>
	{/if}
</section>

<!-- ADD CLASS MODAL -->
{#if activeModal === 'add'}
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={(event) =>
			event.target === event.currentTarget && closeModal()}
	>
		<dialog open class="modal" aria-labelledby="add-class-title">
			<button
				class="modal-close"
				type="button"
				aria-label={isArabic ? 'إغلاق' : 'Close'}
				onclick={closeModal}
			>
				×
			</button>

			<div class="modal-heading">
				<div class="modal-icon">
					<AppIcon name="classes" size={20} />
				</div>

				<div>
					<p class="eyebrow">
						{isArabic ? 'قسم جديد' : 'New class'}
					</p>

					<h2 id="add-class-title">
						{isArabic ? 'إضافة قسم' : 'Add Class'}
					</h2>
				</div>
			</div>

			<form onsubmit={addClass}>
				<label for="new-class">
					{isArabic ? 'اسم القسم' : 'Class name'}

					<input
						id="new-class"
						bind:value={newClassName}
						placeholder="7ème 11"
						autocomplete="off"
					/>
				</label>

				{#if formError}
					<p class="form-error" role="alert">
						{formError}
					</p>
				{/if}

				<div class="modal-actions">
					<button
						class="secondary-button"
						type="button"
						onclick={closeModal}
					>
						{isArabic ? 'إلغاء' : 'Cancel'}
					</button>

					<button
						class="primary-button"
						type="submit"
					>
						{isArabic ? 'إضافة القسم' : 'Add class'}
					</button>
				</div>
			</form>
		</dialog>
	</div>
{/if}

<style>
	.classes-page {
		animation: page-enter 380ms ease both;
		padding-bottom: 2rem;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.heading-copy {
		display: flex;
		align-items: flex-start;
		gap: 0.9rem;
	}

	.title-mark {
		display: grid;
		width: 3rem;
		height: 3rem;
		flex: 0 0 3rem;
		place-items: center;
		margin-top: 0.1rem;
		border-radius: 0.75rem;
		background: var(--app-accent);
		color: #fff;
		box-shadow: 0 8px 18px color-mix(
			in srgb,
			var(--app-accent) 18%,
			transparent
		);
	}

	.eyebrow {
		margin: 0 0 0.3rem;
		color: var(--app-accent);
		font-size: 0.78rem;
		font-weight: 800;
	}

	h1,
	h2,
	p {
		margin-top: 0;
	}

	h1 {
		margin-bottom: 0.3rem;
		color: var(--app-text);
		font-size: clamp(1.8rem, 4vw, 2.35rem);
		line-height: 1.25;
		letter-spacing: -0.025em;
	}

	.heading-description {
		max-width: 650px;
		margin: 0;
		color: var(--app-muted);
		font-size: 0.95rem;
		line-height: 1.7;
	}

	.add-class-button {
		display: inline-flex;
		min-height: 2.85rem;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 1rem;
		border: 0;
		border-radius: 0.55rem;
		background: var(--app-accent);
		color: #fff;
		cursor: pointer;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 800;
		box-shadow: 0 8px 18px color-mix(
			in srgb,
			var(--app-accent) 17%,
			transparent
		);
		transition:
			transform 160ms ease,
			background 160ms ease;
	}

	.add-class-button:hover {
		background: var(--app-accent-dark);
		transform: translateY(-1px);
	}

	.add-icon {
		display: grid;
		width: 1.25rem;
		height: 1.25rem;
		place-items: center;
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 50%;
		font-size: 1rem;
		font-weight: 400;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.summary-card {
		position: relative;
		display: flex;
		min-height: 5rem;
		align-items: center;
		gap: 0.75rem;
		padding: 0.9rem 1rem;
		overflow: hidden;
		border: 1px solid var(--app-border);
		border-radius: 0.65rem;
		background: var(--app-surface);
		box-shadow: var(--app-shadow);
	}

	.summary-card::after {
		position: absolute;
		right: -1.5rem;
		bottom: -1.7rem;
		width: 4.5rem;
		height: 4.5rem;
		border-radius: 50%;
		background: var(--app-accent-soft);
		content: '';
		opacity: 0.7;
	}

	.summary-icon {
		position: relative;
		z-index: 1;
		display: grid;
		width: 2.35rem;
		height: 2.35rem;
		flex: 0 0 2.35rem;
		place-items: center;
		border-radius: 0.6rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	.students-summary {
		background: rgba(39, 150, 90, 0.1);
		color: #27965a;
	}

	.info-summary .summary-icon {
		background: rgba(193, 132, 22, 0.1);
		color: #c18416;
	}

	.summary-card > div:last-child {
		position: relative;
		z-index: 1;
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 0.15rem;
	}

	.summary-card span {
		color: var(--app-muted);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.summary-card strong {
		color: var(--app-text);
		font-size: 1.25rem;
		line-height: 1.15;
	}

	.info-summary strong {
		font-size: 0.9rem;
	}

	.section-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.7rem;
	}

	.section-heading h2 {
		margin-bottom: 0.15rem;
		color: var(--app-text);
		font-size: 1.05rem;
	}

	.section-heading p {
		margin: 0;
		color: var(--app-muted);
		font-size: 0.78rem;
	}

	.class-count {
		padding: 0.3rem 0.55rem;
		border-radius: 0.35rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
		font-size: 0.72rem;
		font-weight: 800;
		white-space: nowrap;
	}

	.class-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.class-card {
		position: relative;
		display: flex;
		min-height: 6rem;
		overflow: hidden;
		border: 1px solid var(--app-border);
		border-radius: 0.65rem;
		background: var(--app-surface);
		box-shadow: var(--app-shadow);
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			box-shadow 180ms ease;
	}

	.class-card:hover {
		border-color: color-mix(
			in srgb,
			var(--app-accent) 45%,
			var(--app-border)
		);
		transform: translateY(-2px);
		box-shadow: 0 12px 26px color-mix(
			in srgb,
			var(--app-text) 8%,
			transparent
		);
	}

	.class-card-link {
		display: flex;
		min-width: 0;
		flex: 1;
		align-items: center;
		gap: 0.7rem;
		padding: 0.85rem;
		color: inherit;
		text-decoration: none;
	}

	.class-number {
		align-self: flex-start;
		color: var(--app-muted);
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.04em;
	}

	.class-icon {
		display: grid;
		width: 2.6rem;
		height: 2.6rem;
		flex: 0 0 2.6rem;
		place-items: center;
		border-radius: 0.6rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	.class-copy {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		gap: 0.25rem;
	}

	.class-copy strong {
		overflow: hidden;
		color: var(--app-text);
		font-size: 1rem;
		font-weight: 850;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.class-copy span {
		color: var(--app-muted);
		font-size: 0.72rem;
	}

	.class-arrow {
		display: grid;
		width: 1.9rem;
		height: 1.9rem;
		flex: 0 0 1.9rem;
		place-items: center;
		border-radius: 50%;
		background: var(--app-surface-strong);
		color: var(--app-accent);
		font-size: 1rem;
		transition:
			transform 160ms ease,
			background 160ms ease;
	}

	.class-card:hover .class-arrow {
		background: var(--app-accent-soft);
		transform: translateX(2px);
	}

	[dir='rtl'] .class-card:hover .class-arrow {
		transform: translateX(-2px);
	}

	.delete-class {
		position: absolute;
		top: 0.55rem;
		inset-inline-end: 0.55rem;
		display: grid;
		width: 1.8rem;
		height: 1.8rem;
		place-items: center;
		border: 0;
		border-radius: 0.35rem;
		background: transparent;
		color: var(--app-muted);
		cursor: pointer;
	}

	.delete-class:hover {
		background: rgba(180, 61, 76, 0.08);
		color: #b43d4c;
	}

	.empty-state {
		display: flex;
		min-height: 16rem;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		border: 1px dashed var(--app-border);
		border-radius: 0.65rem;
		background: var(--app-surface);
		text-align: center;
	}

	.empty-icon {
		display: grid;
		width: 3.4rem;
		height: 3.4rem;
		margin-bottom: 0.8rem;
		place-items: center;
		border-radius: 0.75rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	.empty-state h2 {
		margin-bottom: 0.3rem;
		color: var(--app-text);
		font-size: 1rem;
	}

	.empty-state p {
		margin-bottom: 1rem;
		color: var(--app-muted);
		font-size: 0.82rem;
	}

	.empty-add-button {
		min-height: 2.4rem;
		padding: 0.5rem 0.8rem;
		border: 0;
		border-radius: 0.45rem;
		background: var(--app-accent);
		color: #fff;
		cursor: pointer;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 800;
	}

	/* MODAL */

	.modal-backdrop {
		position: fixed;
		z-index: 50;
		inset: 0;
		display: grid;
		overflow-y: auto;
		padding: 1rem;
		place-items: center;
		background: rgba(39, 30, 31, 0.48);
		backdrop-filter: blur(3px);
	}

	.modal {
		position: relative;
		width: min(100%, 28rem);
		padding: 1.5rem;
		border: 1px solid var(--app-border);
		border-radius: 0.75rem;
		background: var(--app-surface);
		color: var(--app-text);
		box-shadow: 0 24px 70px rgba(39, 30, 31, 0.2);
		animation: modal-enter 180ms ease both;
	}

	.modal-close {
		position: absolute;
		top: 0.75rem;
		inset-inline-end: 0.75rem;
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border: 0;
		border-radius: 0.35rem;
		background: transparent;
		color: var(--app-muted);
		cursor: pointer;
		font: inherit;
		font-size: 1.35rem;
	}

	.modal-close:hover {
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	.modal-heading {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
		padding-inline-end: 2rem;
	}

	.modal-icon {
		display: grid;
		width: 2.8rem;
		height: 2.8rem;
		flex: 0 0 2.8rem;
		place-items: center;
		border-radius: 0.6rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	.modal h2 {
		margin: 0;
		color: var(--app-text);
		font-size: 1.25rem;
	}

	.modal form {
		display: grid;
		gap: 0.75rem;
	}

	.modal label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		color: var(--app-text);
		font-size: 0.8rem;
		font-weight: 800;
	}

	.modal input {
		width: 100%;
		min-height: 2.8rem;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--app-border);
		border-radius: 0.45rem;
		outline: 0;
		background: var(--app-surface-strong);
		color: var(--app-text);
		font: inherit;
		font-size: 0.9rem;
	}

	.modal input:focus {
		border-color: color-mix(
			in srgb,
			var(--app-accent) 55%,
			var(--app-border)
		);
		box-shadow: 0 0 0 3px color-mix(
			in srgb,
			var(--app-accent) 10%,
			transparent
		);
	}

	.form-error {
		margin: 0;
		padding: 0.6rem 0.7rem;
		border-radius: 0.4rem;
		background: rgba(180, 61, 76, 0.08);
		color: #b43d4c;
		font-size: 0.78rem;
		line-height: 1.5;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.primary-button,
	.secondary-button {
		min-height: 2.7rem;
		padding: 0.6rem 0.9rem;
		border-radius: 0.45rem;
		cursor: pointer;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 800;
	}

	.primary-button {
		border: 0;
		background: var(--app-accent);
		color: #fff;
	}

	.primary-button:hover {
		background: var(--app-accent-dark);
	}

	.secondary-button {
		border: 1px solid var(--app-border);
		background: var(--app-surface-strong);
		color: var(--app-text);
	}

	.secondary-button:hover {
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	@keyframes page-enter {
		from {
			opacity: 0;
			transform: translateY(0.35rem);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes modal-enter {
		from {
			opacity: 0;
			transform: translateY(0.35rem) scale(0.99);
		}

		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@media (max-width: 900px) {
		.class-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 700px) {
		.page-header {
			flex-direction: column;
		}

		.add-class-button {
			width: 100%;
			justify-content: center;
		}

		.summary-grid {
			grid-template-columns: 1fr 1fr;
		}

		.info-summary {
			display: none;
		}

		.class-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 480px) {
		.heading-copy {
			gap: 0.65rem;
		}

		.title-mark {
			width: 2.6rem;
			height: 2.6rem;
			flex-basis: 2.6rem;
		}

		h1 {
			font-size: 1.65rem;
		}

		.heading-description {
			font-size: 0.85rem;
		}

		.summary-card {
			min-height: 4.5rem;
			padding: 0.7rem;
		}

		.summary-icon {
			width: 2rem;
			height: 2rem;
			flex-basis: 2rem;
		}

		.summary-card strong {
			font-size: 1.1rem;
		}

		.section-heading {
			align-items: center;
		}

		.class-count {
			display: none;
		}

		.class-card-link {
			padding: 0.8rem;
		}

		.modal {
			padding: 1.1rem;
		}

		.modal-actions {
			flex-direction: column-reverse;
		}

		.modal-actions button {
			width: 100%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.classes-page,
		.modal,
		.class-card,
		.add-class-button {
			animation: none;
			transition: none;
		}
	}
</style>