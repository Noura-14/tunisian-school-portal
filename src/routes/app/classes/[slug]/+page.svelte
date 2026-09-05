<script>
	import { page } from '$app/state';
	import { getContext, onMount } from 'svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { loadAttendance, recordAttendance } from '$lib/data/attendance.js';
	import { getStudentAlertLevel, getStudentRecords, loadBehaviorRecords, saveBehaviorRecords } from '$lib/data/behavior.js';
	import { classOptions, importedStudents } from '$lib/data/students.js';

	const appState = getContext('app-state');
	const isArabic = $derived(appState.language === 'ar');
	/** @typedef {{ id: string, firstName: string, lastName: string, className: string }} Student */
	const className = $derived(classOptions.find((item) => item.replace('ème', 'eme').replaceAll(' ', '-') === page.params.slug) || (page.params.slug || '').replace(/^7eme-/, '7ème '));
	/** @type {Student[]} */
	let students = $state([]);
	let searchTerm = $state('');
	let attendanceFilter = $state('all');
	/** @type {'firstName' | 'lastName'} */
	let sortBy = $state('firstName');
	let sortDescending = $state(false);
	/** @type {{ current: Record<string, 'present' | 'absent'>, history: Array<{ id: string, studentId: string, date: string, session: number, status: 'present' | 'absent', recordedAt: string }> }} */
	let attendanceData = $state({ current: {}, history: [] });
	let selectedSession = $state(1);
	let selectedDate = $state(new Date().toISOString().slice(0, 10));
	/** @type {Array<{ id: string, studentId: string, behaviorTypes: string[], otherBehavior: string, notes: string, summary: string, createdAt: string }>} */
	let behaviorRecords = $state([]);
	/** @type {'view' | 'form' | 'delete' | null} */
	let activeModal = $state(null);
	/** @type {Student | null} */
	let selectedStudent = $state(null);
	let form = $state({ firstName: '', lastName: '', className: '' });
	let formError = $state('');
	const modalStudent = $derived(selectedStudent || { id: '', firstName: '', lastName: '', className });

	onMount(() => {
		students = importedStudents.filter((student) => student.className === className).map((student) => ({ ...student }));
		attendanceData = loadAttendance();
		behaviorRecords = loadBehaviorRecords();
	});

	const visibleStudents = $derived(students.filter((student) => {
		const query = searchTerm.trim().toLocaleLowerCase();
		const matchesSearch = !query || `${student.firstName} ${student.lastName}`.toLocaleLowerCase().includes(query);
		const status = attendanceData.history.find((record) => record.studentId === student.id && record.date === selectedDate && record.session === Number(selectedSession))?.status;
		const matchesAttendance = attendanceFilter === 'all' || (attendanceFilter === 'present' ? status === 'present' : status === 'absent');
		return matchesSearch && matchesAttendance;
	}).sort((left, right) => {
		const comparison = left[sortBy].localeCompare(right[sortBy], 'ar');
		return sortDescending ? -comparison : comparison;
	}));

	/** @param {string} studentId @param {'present' | 'absent'} status */
	function setAttendance(studentId, status) {
		attendanceData = recordAttendance(attendanceData, studentId, selectedDate, Number(selectedSession), status);
	}

	/** @param {number} level */
	function behaviorLabel(level) {
		if (level === 3) return isArabic ? 'التنبيه الثالث — إجراء إداري مطلوب' : 'Third alert — administrative action required';
		if (level === 2) return isArabic ? 'التنبيه الثاني' : 'Second alert';
		if (level === 1) return isArabic ? 'التنبيه الأول' : 'First alert';
		return isArabic ? 'لا توجد تنبيهات' : 'No alerts';
	}

	/** @param {string} studentId */
	function removeLatestBehavior(studentId) {
		const studentRecords = getStudentRecords(behaviorRecords, studentId);
		if (!studentRecords.length) return;
		const latestRecord = [...studentRecords].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
		const confirmed = window.confirm(
			isArabic
				? 'هل تريد حذف آخر تنبيه سلوكي لهذا التلميذ؟'
				: 'Do you want to remove the latest behaviour alert for this student?'
		);
		if (!confirmed) return;
		behaviorRecords = behaviorRecords.filter((record) => record.id !== latestRecord.id);
		saveBehaviorRecords(behaviorRecords);
	}

	/** @param {Student} student */
	function openView(student) { selectedStudent = student; activeModal = 'view'; }
	/** @param {Student} student */
	function openEdit(student) { selectedStudent = student; form = { firstName: student.firstName, lastName: student.lastName, className: student.className }; formError = ''; activeModal = 'form'; }
	function openAdd() { selectedStudent = null; form = { firstName: '', lastName: '', className }; formError = ''; activeModal = 'form'; }
	/** @param {Student} student */
	function openDelete(student) { selectedStudent = student; activeModal = 'delete'; }
	function closeModal() { activeModal = null; selectedStudent = null; formError = ''; }

	/** @param {SubmitEvent} event */
	function submitStudent(event) {
		event.preventDefault();
		if (!form.firstName.trim() || !form.lastName.trim()) { formError = isArabic ? 'يرجى إدخال الاسم واللقب.' : 'Please enter first and last name.'; return; }
		const selectedId = selectedStudent?.id;
		if (selectedId !== undefined) students = students.map((student) => student.id === selectedId ? { ...student, firstName: form.firstName.trim(), lastName: form.lastName.trim() } : student);
		else students = [...students, { id: `local-${Date.now()}`, firstName: form.firstName.trim(), lastName: form.lastName.trim(), className }];
		closeModal();
	}

	function confirmDelete() {
		const selectedId = selectedStudent?.id;
		if (selectedId === undefined) return;
		students = students.filter((student) => student.id !== selectedId);
		closeModal();
	}

	/** @param {KeyboardEvent} event */
	function handleKeydown(event) { if (event.key === 'Escape') closeModal(); }
</script>

<svelte:window onkeydown={handleKeydown} />
<svelte:head><title>{className ? `${isArabic ? 'تلاميذ' : 'Students'} — ${className}` : (isArabic ? 'القسم غير موجود' : 'Class not found')}</title></svelte:head>

<section class="class-students-page" aria-labelledby="class-students-title">
	<a class="back-button" href="/app/classes">← {isArabic ? 'العودة إلى الأقسام' : 'Back to Classes'}</a>
	{#if className}
		<header class="page-heading">
			<div><p class="eyebrow">{isArabic ? 'القسم' : 'Class'}</p><h1 id="class-students-title">{className}</h1><p>{students.length} {isArabic ? 'تلميذاً' : 'students'}</p></div>
			<button class="add-button" type="button" onclick={openAdd}>+ {isArabic ? 'إضافة تلميذ' : 'Add Student'}</button>
		</header>
		<section class="student-toolbar" aria-label={isArabic ? 'أدوات التلاميذ' : 'Student tools'}>
			<label><span>{isArabic ? 'الحصة' : 'Session'}</span><select bind:value={selectedSession}>{#each [1, 2, 3, 4, 5, 6, 7] as session}<option value={session}>{isArabic ? `الحصة ${session}` : `Session ${session}`}</option>{/each}</select></label>
			<label><span>{isArabic ? 'التاريخ' : 'Date'}</span><input type="date" bind:value={selectedDate} /></label>
			<label class="search-field" for="class-student-search"><AppIcon name="students" size={18} /><input id="class-student-search" bind:value={searchTerm} type="search" placeholder={isArabic ? 'البحث عن تلميذ...' : 'Search for a student...'} /></label>
			<label><span>{isArabic ? 'الحضور' : 'Attendance'}</span><select bind:value={attendanceFilter}><option value="all">{isArabic ? 'الكل' : 'All'}</option><option value="present">{isArabic ? 'حاضر' : 'Present'}</option><option value="absent">{isArabic ? 'غائب' : 'Absent'}</option></select></label>
			<label><span>{isArabic ? 'ترتيب' : 'Sort by'}</span><select bind:value={sortBy}><option value="firstName">{isArabic ? 'الاسم' : 'First Name'}</option><option value="lastName">{isArabic ? 'اللقب' : 'Last Name'}</option></select></label>
			<button class="sort-button" type="button" aria-label={isArabic ? 'تغيير اتجاه الترتيب' : 'Toggle sort direction'} onclick={() => sortDescending = !sortDescending}>{sortDescending ? '↓' : '↑'}</button>
		</section>
		<div class="student-table-wrap">
			<table>
				<thead><tr><th>{isArabic ? 'الاسم' : 'First Name'}</th><th>{isArabic ? 'اللقب' : 'Last Name'}</th><th>{isArabic ? 'الحضور' : 'Attendance'}</th><th>{isArabic ? 'السلوك' : 'Behaviour'}</th><th>{isArabic ? 'الإجراءات' : 'Actions'}</th></tr></thead>
				<tbody>
					{#each visibleStudents as student (student.id)}
						<tr>
							<td>{student.firstName}</td><td>{student.lastName}</td>
							<td><div class="attendance-control"><button class="present-button" class:chosen={attendanceData.history.find((record) => record.studentId === student.id && record.date === selectedDate && record.session === Number(selectedSession))?.status === 'present'} type="button" aria-label={isArabic ? 'حاضر' : 'Present'} onclick={() => setAttendance(student.id, 'present')}>{isArabic ? 'حاضر' : 'P — Present'}</button><button class="absent-button" class:chosen={attendanceData.history.find((record) => record.studentId === student.id && record.date === selectedDate && record.session === Number(selectedSession))?.status === 'absent'} type="button" aria-label={isArabic ? 'غائب' : 'Absent'} onclick={() => setAttendance(student.id, 'absent')}>{isArabic ? 'غائب' : 'A — Absent'}</button></div></td>
							<td>
								<div class="behavior-cell" title={behaviorLabel(getStudentAlertLevel(behaviorRecords, student.id))}>
									<span class:level-one={getStudentAlertLevel(behaviorRecords, student.id) === 1} class:level-two={getStudentAlertLevel(behaviorRecords, student.id) === 2} class:level-three={getStudentAlertLevel(behaviorRecords, student.id) >= 3} class="behavior-dot" aria-label={behaviorLabel(getStudentAlertLevel(behaviorRecords, student.id))}></span>
									<small>{getStudentAlertLevel(behaviorRecords, student.id) ? getStudentAlertLevel(behaviorRecords, student.id) : (isArabic ? 'لا توجد تنبيهات' : 'No alerts')}</small>
									<div class="behavior-actions">
										<a class="alert-button add-alert" aria-label={isArabic ? 'إضافة تنبيه سلوكي' : 'Add behaviour alert'} href={`/app/behaviour?student=${encodeURIComponent(student.id)}&action=add`}>+</a>
										<button class="alert-button remove-alert" type="button" disabled={getStudentAlertLevel(behaviorRecords, student.id) === 0} aria-label={isArabic ? 'حذف آخر تنبيه سلوكي' : 'Remove latest behaviour alert'} onclick={() => removeLatestBehavior(student.id)}>−</button>
									</div>
								</div>
							</td>
							<td><div class="row-actions"><button type="button" aria-label={isArabic ? `عرض ${student.firstName}` : `View ${student.firstName}`} onclick={() => openView(student)}><AppIcon name="view" size={16} /></button><button type="button" aria-label={isArabic ? `تعديل ${student.firstName}` : `Edit ${student.firstName}`} onclick={() => openEdit(student)}><AppIcon name="edit" size={16} /></button><button class="delete-action" type="button" aria-label={isArabic ? `حذف ${student.firstName}` : `Delete ${student.firstName}`} onclick={() => openDelete(student)}><AppIcon name="delete" size={16} /></button></div></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if !visibleStudents.length}<div class="empty-state">{isArabic ? 'لم يتم العثور على أي تلميذ.' : 'No students found.'}</div>{/if}
	{:else}
		<div class="empty-state"><h1 id="class-students-title">{isArabic ? 'القسم غير موجود' : 'Class not found'}</h1></div>
	{/if}
</section>

{#if activeModal}
	<div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeModal()}>
		<dialog open class="modal" aria-labelledby="modal-title">
			<button class="modal-close" type="button" aria-label={isArabic ? 'إغلاق' : 'Close'} onclick={closeModal}>×</button>
			{#if activeModal === 'view'}<p class="eyebrow">{isArabic ? 'بيانات التلميذ' : 'Student details'}</p><h2 id="modal-title">{modalStudent.firstName} {modalStudent.lastName}</h2><div class="detail-list"><span>{isArabic ? 'الاسم' : 'First Name'}: <b>{modalStudent.firstName}</b></span><span>{isArabic ? 'اللقب' : 'Last Name'}: <b>{modalStudent.lastName}</b></span><span>{isArabic ? 'القسم' : 'Class'}: <b>{modalStudent.className}</b></span><span>{isArabic ? 'مستوى التنبيهات' : 'Alert level'}: <b>{getStudentAlertLevel(behaviorRecords, modalStudent.id) || (isArabic ? 'لا توجد تنبيهات' : 'No alerts')}</b></span></div>{#if getStudentRecords(behaviorRecords, modalStudent.id).length}<div class="history-list">{#each getStudentRecords(behaviorRecords, modalStudent.id) as record}<article><strong>{record.summary}</strong><small>{record.createdAt.slice(0, 10)}</small></article>{/each}</div>{/if}
			{:else if activeModal === 'delete'}<p class="eyebrow">{isArabic ? 'تأكيد الحذف' : 'Confirm deletion'}</p><h2 id="modal-title">{isArabic ? 'هل أنت متأكد من حذف هذا التلميذ؟' : 'Are you sure you want to delete this student?'}</h2><div class="modal-actions"><button class="secondary-button" type="button" onclick={closeModal}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button class="danger-button" type="button" onclick={confirmDelete}>{isArabic ? 'حذف' : 'Delete'}</button></div>
			{:else}<p class="eyebrow">{selectedStudent ? (isArabic ? 'تعديل بيانات التلميذ' : 'Edit student') : (isArabic ? 'إضافة تلميذ' : 'Add student')}</p><h2 id="modal-title">{selectedStudent ? (isArabic ? 'تعديل البيانات' : 'Edit information') : (isArabic ? 'إضافة تلميذ' : 'Add student')}</h2><form onsubmit={submitStudent}><label for="first-name">{isArabic ? 'الاسم' : 'First Name'}<input id="first-name" bind:value={form.firstName} required /></label><label for="last-name">{isArabic ? 'اللقب' : 'Last Name'}<input id="last-name" bind:value={form.lastName} required /></label>{#if formError}<p class="form-error" role="alert">{formError}</p>{/if}<div class="modal-actions"><button class="secondary-button" type="button" onclick={closeModal}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button class="primary-button" type="submit">{selectedStudent ? (isArabic ? 'حفظ' : 'Save') : (isArabic ? 'إضافة' : 'Add')}</button></div></form>
			{/if}
		</dialog>
	</div>
{/if}

<style>
	.class-students-page { animation: page-enter 300ms ease both; }
	.back-button { display: inline-flex; min-height: 2.5rem; align-items: center; margin-bottom: 1rem; padding: 0.5rem 0.75rem; border: 1px solid var(--app-border); background: var(--app-surface); color: var(--app-accent); text-decoration: none; }
	.back-button:hover, .back-button:focus-visible { border-color: var(--app-accent); outline: 3px solid color-mix(in srgb, var(--app-accent) 25%, transparent); outline-offset: 2px; }
	.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
	.eyebrow { margin: 0 0 0.35rem; color: var(--app-accent); font-size: 0.78rem; font-weight: 700; }
	h1, h2, p { margin-top: 0; }
	h1 { margin-bottom: 0.25rem; font-size: clamp(1.6rem, 4vw, 2.2rem); }
	.page-heading p:last-child { margin: 0; color: var(--app-muted); font-size: 0.9rem; }
	.add-button, .primary-button, .secondary-button, .danger-button { min-height: 2.7rem; padding: 0.6rem 0.85rem; border-radius: 0.45rem; cursor: pointer; font: inherit; font-weight: 700; }
	.add-button, .primary-button { border: 0; background: var(--app-accent); color: #fff; }
	.add-button:hover, .primary-button:hover { background: var(--app-accent-dark); }
	.student-toolbar { display: flex; align-items: end; gap: 0.55rem; margin-bottom: 0.7rem; padding: 0.7rem; border: 1px solid var(--app-border); background: var(--app-surface); }
	.search-field { display: flex; min-height: 2.55rem; flex: 1; align-items: center; gap: 0.45rem; padding: 0 0.65rem; border: 1px solid var(--app-border); color: var(--app-accent); }
	.search-field input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--app-text); font: inherit; }
	.student-toolbar label:not(.search-field) { display: flex; min-width: 7rem; flex-direction: column; gap: 0.2rem; color: var(--app-muted); font-size: 0.72rem; }
	.student-toolbar select, .student-toolbar input, .modal input { min-height: 2.55rem; padding: 0.45rem; border: 1px solid var(--app-border); background: var(--app-surface-strong); color: var(--app-text); font: inherit; }
	.sort-button { min-height: 2.55rem; min-width: 2.55rem; border: 1px solid var(--app-border); background: var(--app-surface); color: var(--app-accent); cursor: pointer; font-size: 1.1rem; }
	.student-table-wrap { overflow-x: auto; border: 1px solid var(--app-border); background: var(--app-surface); box-shadow: var(--app-shadow); }
	table { width: 100%; min-width: 760px; border-collapse: collapse; }
	th, td { padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--app-border); text-align: start; white-space: nowrap; }
	th { background: var(--app-surface-soft); color: var(--app-muted); font-size: 0.75rem; }
	td { font-size: 0.86rem; }
	tbody tr:last-child td { border-bottom: 0; }
	.attendance-control { display: flex; gap: 0.25rem; }
	.attendance-control button { min-height: 1.95rem; padding: 0.25rem 0.4rem; border: 1px solid var(--app-border); background: var(--app-surface-strong); color: var(--app-muted); cursor: pointer; font: inherit; font-size: 0.72rem; }
	.attendance-control button.chosen { font-weight: 700; }
	.attendance-control button.present-button.chosen { border-color: #2e7d32; background: #e8f5e9; color: #2e7d32; }
	.attendance-control button.absent-button.chosen { border-color: #c62828; background: #ffebee; color: #c62828; }
	.behavior-cell { display: inline-flex; align-items: center; gap: 0.45rem; }
	.behavior-dot { width: 0.65rem; height: 0.65rem; flex: 0 0 0.65rem; border-radius: 50%; background: var(--app-border); }
	.behavior-dot.level-one { background: #2e7d5b; }.behavior-dot.level-two { background: #b7791f; }.behavior-dot.level-three { background: #c62828; }
	.behavior-cell small { color: var(--app-muted); font-size: 0.72rem; }
	.behavior-actions { display: inline-flex; align-items: center; gap: 0.3rem; }
	.alert-button { display: grid; width: 1.55rem; height: 1.55rem; flex: 0 0 1.55rem; place-items: center; border: 1px solid var(--app-border); border-radius: 50%; background: var(--app-surface); color: var(--app-accent); cursor: pointer; font: inherit; font-size: 1rem; font-weight: 700; line-height: 1; text-decoration: none; }
	.alert-button:hover:not(:disabled), .alert-button:focus-visible:not(:disabled) { border-color: var(--app-accent); background: var(--app-accent-soft); color: var(--app-accent); }
	.alert-button:disabled { cursor: not-allowed; opacity: 0.4; }
	.remove-alert { color: var(--app-muted); }
	.row-actions { display: flex; gap: 0.2rem; }
	.row-actions button { display: grid; width: 2rem; height: 2rem; place-items: center; border: 0; background: transparent; color: var(--app-muted); cursor: pointer; }
	.row-actions button:hover { background: var(--app-accent-soft); color: var(--app-accent); }.row-actions .delete-action:hover { color: var(--app-danger, #c62828); }
	.empty-state { padding: 1.5rem; border: 1px dashed var(--app-border); color: var(--app-muted); text-align: center; }
	.modal-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; padding: 1rem; place-items: center; background: rgba(39, 30, 31, 0.42); }.modal { position: relative; width: min(100%, 28rem); padding: 1.4rem; border: 1px solid var(--app-border); background: var(--app-surface); box-shadow: var(--app-shadow); }.modal-close { position: absolute; top: 0.5rem; inset-inline-end: 0.5rem; border: 0; background: transparent; color: var(--app-muted); cursor: pointer; font-size: 1.3rem; }.modal h2 { margin-bottom: 1rem; font-size: 1.2rem; }.modal form { display: grid; gap: 0.7rem; }.modal label { display: grid; gap: 0.25rem; font-weight: 700; }.detail-list { display: grid; gap: 0.65rem; margin-bottom: 1rem; }.detail-list span { color: var(--app-muted); }.detail-list b { color: var(--app-text); }.modal-actions { display: flex; justify-content: flex-end; gap: 0.45rem; margin-top: 0.8rem; }.secondary-button { border: 1px solid var(--app-border); background: var(--app-surface-strong); color: var(--app-text); }.danger-button { border: 0; background: var(--app-danger, #c62828); color: #fff; }.form-error { color: var(--app-danger, #c62828); font-size: 0.8rem; }
	@keyframes page-enter { from { opacity: 0; transform: translateY(0.35rem); } to { opacity: 1; transform: translateY(0); } }
	@media (max-width: 700px) { .page-heading { flex-direction: column; }.add-button { width: 100%; }.student-toolbar { align-items: stretch; flex-direction: column; }.student-toolbar label:not(.search-field) { min-width: 0; }.sort-button { align-self: flex-start; }.student-table-wrap { overflow: visible; border: 0; box-shadow: none; background: transparent; }table { display: block; min-width: 0; }.student-table-wrap thead { display: none; }tbody { display: grid; gap: 0.35rem; }tbody tr { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem 0.6rem; padding: 0.65rem; border: 1px solid var(--app-border); background: var(--app-surface); }tbody td { display: block; padding: 0.15rem 0; border: 0; white-space: normal; }tbody td:nth-child(3), tbody td:nth-child(4), tbody td:nth-child(5) { grid-column: 1 / -1; }.attendance-control { width: fit-content; }.row-actions button { width: 2.3rem; height: 2.3rem; } }
	@media (prefers-reduced-motion: reduce) { .class-students-page { animation: none; } }
</style>
