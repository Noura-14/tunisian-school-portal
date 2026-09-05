
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
		return importedStudents.filter((student) => student.className === className).length;
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
			formError = isArabic ? 'يرجى إدخال اسم القسم.' : 'Please enter a class name.';
			return;
		}
		if (classes.includes(value)) {
			formError = isArabic ? 'هذا القسم موجود بالفعل.' : 'This class already exists.';
			return;
		}
		classes = [...classes, value];
		closeModal();
	}

	/** @param {string} className */
	function deleteClass(className) {
		if (window.confirm(isArabic ? `هل أنت متأكد من حذف قسم ${className}؟` : `Are you sure you want to delete ${className}?`)) {
			classes = classes.filter((item) => item !== className);
		}
	}
</script>

<svelte:head><title>{isArabic ? 'الأقسام | فضاء المتابعة' : 'Classes | Follow-up Portal'}</title></svelte:head>

<section class="classes-page" aria-labelledby="classes-title">
	<header class="page-heading">
		<div><p class="eyebrow">{isArabic ? 'تنظيم الفضاء المدرسي' : 'School organisation'}</p><h1 id="classes-title">{isArabic ? 'الأقسام' : 'Classes'}</h1><p>{isArabic ? 'استعرض الأقسام واطلع على التلاميذ المنتمين إلى كل قسم.' : 'Browse classes and view the students belonging to each one.'}</p></div>
		<button class="add-class-button" type="button" onclick={() => activeModal = 'add'}>+ {isArabic ? 'إضافة قسم' : 'Add Class'}</button>
	</header>

	<div class="class-grid">
		{#each classes as className}
			<div class="class-card">
			<a class="class-card-link" href={`/app/classes/${slugForClass(className)}`}>
				<span class="class-icon" aria-hidden="true"><AppIcon name="classes" size={22} /></span>
				<span class="class-copy"><strong>{className}</strong><small>{studentCount(className)} {isArabic ? (studentCount(className) === 1 ? 'تلميذ' : 'تلاميذ') : (studentCount(className) === 1 ? 'student' : 'students')}</small></span>
				<span class="class-arrow" aria-hidden="true">{isArabic ? '←' : '→'}</span>
			</a>
			{#if !classOptions.includes(className)}<button class="delete-class" type="button" aria-label={isArabic ? `حذف ${className}` : `Delete ${className}`} onclick={() => deleteClass(className)}><AppIcon name="delete" size={16} /></button>{/if}
			</div>
		{/each}
	</div>
</section>

{#if activeModal === 'add'}
	<div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeModal()}>
		<dialog open class="modal" aria-labelledby="add-class-title">
			<button class="modal-close" type="button" aria-label={isArabic ? 'إغلاق' : 'Close'} onclick={closeModal}>×</button>
			<p class="eyebrow">{isArabic ? 'قسم جديد' : 'New class'}</p>
			<h2 id="add-class-title">{isArabic ? 'إضافة قسم' : 'Add Class'}</h2>
			<form onsubmit={addClass}><label for="new-class">{isArabic ? 'اسم القسم' : 'Class name'}<input id="new-class" bind:value={newClassName} placeholder="7ème 11" /></label>{#if formError}<p class="form-error" role="alert">{formError}</p>{/if}<div class="modal-actions"><button class="secondary-button" type="button" onclick={closeModal}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button class="primary-button" type="submit">{isArabic ? 'إضافة القسم' : 'Add class'}</button></div></form>
		</dialog>
	</div>
{/if}

<style>
	.classes-page { animation: page-enter 400ms ease both; }
	.page-heading { margin-bottom: 1.75rem; }
	.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
	.eyebrow { margin: 0 0 0.45rem; color: var(--app-accent); font-size: 0.8rem; font-weight: 700; }
	h1, p { margin-top: 0; }
	h1 { margin-bottom: 0.45rem; font-size: clamp(1.8rem, 5vw, 2.5rem); }
	.page-heading p:last-child { margin: 0; color: var(--app-muted); font-size: 1rem; line-height: 1.7; }
	.class-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; max-width: 62rem; }
	.add-class-button, .primary-button, .secondary-button { min-height: 2.8rem; padding: 0.65rem 0.9rem; border-radius: 0.5rem; cursor: pointer; font: inherit; font-weight: 700; }
	.add-class-button, .primary-button { border: 0; background: var(--app-accent); color: #fff; }
	.add-class-button:hover, .primary-button:hover { background: var(--app-accent-dark); }
	.class-card { display: flex; min-height: 5.8rem; align-items: center; gap: 0.8rem; padding: 0.8rem; border: 1px solid var(--app-border); background: var(--app-surface); box-shadow: var(--app-shadow); color: var(--app-text); transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease; }
	.class-card:hover { border-color: var(--app-accent); box-shadow: 0 12px 22px rgba(75, 49, 47, 0.1); transform: translateY(-1px); }
	.class-card-link { display: flex; min-width: 0; flex: 1; align-items: center; gap: 0.8rem; color: inherit; text-decoration: none; }
	.class-icon { display: grid; width: 2.5rem; height: 2.5rem; flex: 0 0 2.5rem; place-items: center; background: var(--app-accent-soft); color: var(--app-accent); }
	.class-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 0.25rem; }
	.class-copy strong { font-size: 1.05rem; }
	.class-copy small { color: var(--app-muted); font-size: 0.78rem; }
	.class-arrow { color: var(--app-accent); font-size: 1.15rem; }
	.class-card:focus-visible { outline: 3px solid color-mix(in srgb, var(--app-accent) 35%, transparent); outline-offset: 3px; }
	.delete-class { display: grid; width: 2rem; height: 2rem; place-items: center; border: 0; background: transparent; color: var(--app-muted); cursor: pointer; }
	.delete-class:hover { color: var(--app-danger, #c62828); }
	.modal-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; padding: 1rem; place-items: center; background: rgba(39, 30, 31, 0.42); }
	.modal { position: relative; width: min(100%, 28rem); padding: 1.5rem; border: 1px solid var(--app-border); background: var(--app-surface); box-shadow: var(--app-shadow); }
	.modal-close { position: absolute; top: 0.6rem; inset-inline-end: 0.6rem; border: 0; background: transparent; color: var(--app-muted); cursor: pointer; font-size: 1.4rem; }
	.modal h2 { margin: 0 0 1rem; }
	.modal label { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 700; }
	.modal input { min-height: 2.8rem; padding: 0.6rem; border: 1px solid var(--app-border); background: var(--app-surface-strong); color: var(--app-text); font: inherit; }
	.form-error { color: var(--app-danger, #c62828); font-size: 0.85rem; }
	.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
	.secondary-button { border: 1px solid var(--app-border); background: var(--app-surface-strong); color: var(--app-text); }
	@keyframes page-enter { from { opacity: 0; transform: translateY(0.45rem); } to { opacity: 1; transform: translateY(0); } }
	@media (max-width: 900px) { .class-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
	@media (max-width: 480px) { .page-heading { flex-direction: column; } .add-class-button { width: 100%; } .class-grid { grid-template-columns: 1fr; } }
	@media (prefers-reduced-motion: reduce) { .classes-page { animation: none; } }
</style>
