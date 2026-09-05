<script>
	import { getContext, onMount } from 'svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { classOptions, importedStudents } from '$lib/data/students.js';
	import { loadAttendance } from '$lib/data/attendance.js';
	import { loadBehaviorRecords } from '$lib/data/behavior.js';

	const appState = getContext('app-state');
	const isArabic = $derived(appState.language === 'ar');
	/** @typedef {{ id: string, firstName: string, lastName: string, className: string }} Student */

	let students = $state(importedStudents.map((student) => ({ ...student })));
	let searchTerm = $state('');
	let selectedClass = $state('all');
	/** @type {'form' | 'view' | 'delete' | null} */
	let activeModal = $state(null);
	/** @type {Student | null} */
	let selectedStudent = $state(null);
	let form = $state({ firstName: '', lastName: '', className: classOptions[0] });
	let formError = $state('');
	/** @type {Record<string, unknown>} */
	let attendanceRecords = $state({});
	/** @type {{ studentId: string, behaviorTypes?: string[], otherBehavior?: string, notes?: string, summary?: string, createdAt?: string }[]} */
	let behaviorRecords = $state([]);
	const todayKey = $derived(new Date().toISOString().slice(0, 10));
	const modalStudent = $derived(selectedStudent || { id: '', firstName: '', lastName: '', className: classOptions[0] });

	/** @param {unknown} value */
	function normalizeStatus(value) {
		if (typeof value !== 'string') return '';
		const normalized = value.trim().toLowerCase();
		if (['present', 'presente', 'حاضر', 'presented'].includes(normalized)) return 'present';
		if (['absent', 'absence', 'غائب', 'absente'].includes(normalized)) return 'absent';
		if (['late', 'متأخر', 'retard'].includes(normalized)) return 'late';
		return normalized;
	}

	/** @param {string} value */
	function isDateKey(value) {
		return /^\d{4}-\d{2}-\d{2}$/.test(value);
	}

	/** @param {Record<string, unknown>} source */
	function collectAttendanceEntries(source) {
		/** @type {{ date: string, studentId: string, status: string }[]} */
		const entries = [];
		if (!source || typeof source !== 'object') return entries;

		for (const [key, value] of Object.entries(source)) {
			if (typeof value === 'string') {
				const status = normalizeStatus(value);
				if (!status) continue;
				if (isDateKey(key)) {
					entries.push({ date: key, studentId: '', status });
				} else {
					entries.push({ date: todayKey, studentId: key, status });
				}
				continue;
			}

			if (value && typeof value === 'object') {
	/** @type {Record<string, unknown>} */
const objectValue = /** @type {Record<string, unknown>} */ (value);
	const date = objectValue.date || objectValue.day || objectValue.attendanceDate || (isDateKey(key) ? key : todayKey);
	const studentId = objectValue.studentId || objectValue.student || (isDateKey(key) ? '' : key);
	const status = normalizeStatus(objectValue.status || objectValue.state || objectValue.value);

	if (studentId && status) entries.push({
		date: String(date).slice(0, 10),
		studentId: String(studentId),
		status
	});
	else if (isDateKey(key)) {
		for (const [nestedStudentId, nestedValue] of Object.entries(objectValue)) {
			const nestedStatus = normalizeStatus(nestedValue);
			if (nestedStatus) entries.push({
				date: key,
				studentId: nestedStudentId,
				status: nestedStatus
			});
		}
	}
}
		}
		return entries;
	}

	const attendanceEntries = $derived(collectAttendanceEntries(attendanceRecords));

	/** @param {string} studentId */
	function getStudentAttendance(studentId) {
		const entries = attendanceEntries.filter((entry) => entry.studentId === studentId);
		const todayEntry = [...entries].reverse().find((entry) => entry.date === todayKey);
		const absenceCount = entries.filter((entry) => entry.status === 'absent').length;
		const lateCount = entries.filter((entry) => entry.status === 'late').length;
		const presentCount = entries.filter((entry) => entry.status === 'present').length;
		return { today: todayEntry?.status || '', absenceCount, lateCount, presentCount };
	}

	/** @param {string} status */
	function attendanceLabel(status) {
		if (status === 'present') return isArabic ? 'حاضر اليوم' : 'Present today';
		if (status === 'absent') return isArabic ? 'غائب اليوم' : 'Absent today';
		if (status === 'late') return isArabic ? 'متأخر اليوم' : 'Late today';
		return isArabic ? 'لم يسجل اليوم' : 'Not recorded today';
	}

	/** @param {string} studentId */
	function behaviorCount(studentId) {
		return behaviorRecords.filter((record) => record.studentId === studentId).length;
	}


	/** @param {number} count */
	function behaviourLabel(count) {
		if (count === 0) return isArabic ? 'لا توجد تنبيهات' : 'No alerts';
		return `${count} ${isArabic ? 'تنبيهات' : count === 1 ? 'alert' : 'alerts'}`;
	}

	/** @param {number} count */
	function behaviourClass(count) {
		return count >= 3 ? 'high' : count === 2 ? 'medium' : count === 1 ? 'low' : 'none';
	}

	const totalPresentToday = $derived(importedStudents.filter((student) => getStudentAttendance(student.id).today === 'present').length);
	const totalAbsentToday = $derived(importedStudents.filter((student) => getStudentAttendance(student.id).today === 'absent').length);
	const totalLateToday = $derived(importedStudents.filter((student) => getStudentAttendance(student.id).today === 'late').length);
	const totalBehaviourAlerts = $derived(behaviorRecords.length);

	onMount(() => {
		try {
			attendanceRecords = loadAttendance() || {};
		} catch {
			attendanceRecords = {};
		}
		try {
			behaviorRecords = loadBehaviorRecords() || [];
		} catch {
			behaviorRecords = [];
		}
	});

	const visibleStudents = $derived(
		students.filter((student) => {
			const query = searchTerm.trim().toLocaleLowerCase();
			const matchesSearch = !query || `${student.firstName} ${student.lastName}`.toLocaleLowerCase().includes(query);
			const matchesClass = selectedClass === 'all' || student.className === selectedClass;
			return matchesSearch && matchesClass;
		})
	);

	function openAddModal() {
		selectedStudent = null;
		form = { firstName: '', lastName: '', className: classOptions[0] };
		formError = '';
		activeModal = 'form';
	}

	/** @param {Student} student */
	function openEditModal(student) {
		selectedStudent = student;
		form = { firstName: student.firstName, lastName: student.lastName, className: student.className };
		formError = '';
		activeModal = 'form';
	}

	/** @param {Student} student */
	function openViewModal(student) {
		selectedStudent = student;
		activeModal = 'view';
	}

	/** @param {Student} student */
	function openDeleteModal(student) {
		selectedStudent = student;
		activeModal = 'delete';
	}

	function closeModal() {
		activeModal = null;
		selectedStudent = null;
		formError = '';
	}

	/** @param {SubmitEvent} event */
	function handleFormSubmit(event) {
		event.preventDefault();
		if (!form.firstName.trim() || !form.lastName.trim() || !form.className) {
			formError = isArabic ? 'يرجى إدخال جميع البيانات المطلوبة.' : 'Please complete all required fields.';
			return;
		}

		const selectedId = selectedStudent?.id;
		if (selectedId !== undefined) {
			students = students.map((student) => student.id === selectedId ? { ...student, ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim() } : student);
		} else {
			students = [...students, { id: `local-${Date.now()}`, firstName: form.firstName.trim(), lastName: form.lastName.trim(), className: form.className }];
		}
		closeModal();
	}

	function confirmDelete() {
		const selectedId = selectedStudent?.id;
		if (selectedId === undefined) return;
		students = students.filter((student) => student.id !== selectedId);
		closeModal();
	}

	/** @param {KeyboardEvent} event */
	function handleDialogKeydown(event) {
		if (event.key === 'Escape') closeModal();
	}
</script>

<svelte:window onkeydown={handleDialogKeydown} />

<svelte:head>
	<title>{isArabic ? 'التلاميذ | فضاء المتابعة' : 'Students | Follow-up Portal'}</title>
</svelte:head>

<section class="students-page" aria-labelledby="students-title">
	<header class="page-heading">
		<div>
			<p class="eyebrow">{isArabic ? 'إدارة التلاميذ' : 'Student management'}</p>
			<h1 id="students-title">{isArabic ? 'التلاميذ' : 'Students'}</h1>
			<p>{isArabic ? 'متابعة بيانات التلاميذ والاطلاع على أقسامهم.' : 'View and manage student information and classes.'}</p>
		</div>
		<button class="add-button" type="button" onclick={openAddModal}><span aria-hidden="true">+</span> {isArabic ? 'إضافة تلميذ' : 'Add Student'}</button>
	</header>

	<section class="filters" aria-label={isArabic ? 'البحث والتصفية' : 'Search and filters'}>
		<label class="search-field" for="student-search">
			<AppIcon name="students" size={19} />
			<input id="student-search" bind:value={searchTerm} type="search" placeholder={isArabic ? 'البحث عن تلميذ...' : 'Search for a student...'} />
		</label>
		<label class="class-filter" for="class-select">
			<span>{isArabic ? 'القسم' : 'Class'}</span>
			<select id="class-select" bind:value={selectedClass}>
				<option value="all">{isArabic ? 'جميع الأقسام' : 'All Classes'}</option>
				{#each classOptions as className}
					<option value={className}>{className}</option>
				{/each}
			</select>
		</label>
	</section>

	<section class="overview-grid" aria-label={isArabic ? 'ملخص التلاميذ اليوم' : "Today's student overview"}>
		<div class="overview-card">
			<span class="overview-icon">👥</span>
			<div><strong>{visibleStudents.length}</strong><span>{isArabic ? 'التلاميذ' : 'Students'}</span></div>
		</div>
		<div class="overview-card present-card">
			<span class="overview-icon">✓</span>
			<div><strong>{totalPresentToday}</strong><span>{isArabic ? 'حاضر اليوم' : 'Present today'}</span></div>
		</div>
		<div class="overview-card absent-card">
			<span class="overview-icon">!</span>
			<div><strong>{totalAbsentToday}</strong><span>{isArabic ? 'غائب اليوم' : 'Absent today'}</span></div>
		</div>
		<div class="overview-card late-card">
			<span class="overview-icon">◷</span>
			<div><strong>{totalLateToday}</strong><span>{isArabic ? 'متأخر اليوم' : 'Late today'}</span></div>
		</div>
	</section>

	<div class="list-summary" aria-live="polite">
		<strong>{visibleStudents.length}</strong> {isArabic ? (visibleStudents.length === 1 ? 'تلميذ' : 'تلاميذ') : (visibleStudents.length === 1 ? 'student' : 'students')}
	</div>

	{#if visibleStudents.length}
		<div class="desktop-table-wrap">
			<table>
				<thead>
					<tr>
						<th>{isArabic ? 'الاسم' : 'First Name'}</th>
						<th>{isArabic ? 'اللقب' : 'Last Name'}</th>
						<th>{isArabic ? 'القسم' : 'Class'}</th>
						<th>{isArabic ? 'الحضور' : 'Attendance'}</th>
						<th>{isArabic ? 'السلوك' : 'Behaviour'}</th>
						<th>{isArabic ? 'الإجراءات' : 'Actions'}</th>
					</tr>
				</thead>
				<tbody>
					{#each visibleStudents as student (student.id)}
						<tr>
							<td>{student.firstName}</td>
							<td>{student.lastName}</td>
							<td><span class="class-badge">{student.className}</span></td>
							<td>
								<div class="status-stack">
									<span class="status-badge status-{getStudentAttendance(student.id).today || 'none'}">{attendanceLabel(getStudentAttendance(student.id).today)}</span>
									{#if getStudentAttendance(student.id).absenceCount > 0}<small>{getStudentAttendance(student.id).absenceCount} {isArabic ? 'غيابات' : getStudentAttendance(student.id).absenceCount === 1 ? 'absence' : 'absences'}</small>{/if}
								</div>
							</td>
							<td>
								<span class="behaviour-badge behaviour-{behaviourClass(behaviorCount(student.id))}">
									{behaviourLabel(behaviorCount(student.id))}
								</span>
							</td>
							<td><div class="row-actions"><button class="view-action" type="button" aria-label={isArabic ? `عرض ${student.firstName} ${student.lastName}` : `View ${student.firstName} ${student.lastName}`} onclick={() => openViewModal(student)}><AppIcon name="view" size={17} /> <span>{isArabic ? 'عرض' : 'View'}</span></button><button type="button" aria-label={isArabic ? `تعديل ${student.firstName} ${student.lastName}` : `Edit ${student.firstName} ${student.lastName}`} onclick={() => openEditModal(student)}><AppIcon name="edit" size={17} /> <span>{isArabic ? 'تعديل' : 'Edit'}</span></button><button class="delete-action" type="button" aria-label={isArabic ? `حذف ${student.firstName} ${student.lastName}` : `Delete ${student.firstName} ${student.lastName}`} onclick={() => openDeleteModal(student)}><AppIcon name="delete" size={17} /> <span>{isArabic ? 'حذف' : 'Delete'}</span></button></div></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="mobile-list">
			{#each visibleStudents as student (student.id)}
				<article class="student-card">
					<div class="student-card-heading"><strong>{student.firstName} {student.lastName}</strong><span class="class-badge">{student.className}</span></div>
					<div class="student-card-details">
								<span><small>{isArabic ? 'الاسم' : 'First Name'}</small>{student.firstName}</span>
								<span><small>{isArabic ? 'اللقب' : 'Last Name'}</small>{student.lastName}</span>
								<span><small>{isArabic ? 'الحضور' : 'Attendance'}</small><b class="status-badge status-{getStudentAttendance(student.id).today || 'none'}">{attendanceLabel(getStudentAttendance(student.id).today)}</b>{#if getStudentAttendance(student.id).absenceCount > 0}<small>{getStudentAttendance(student.id).absenceCount} {isArabic ? 'غيابات' : getStudentAttendance(student.id).absenceCount === 1 ? 'absence' : 'absences'}</small>{/if}</span>
								<span><small>{isArabic ? 'السلوك' : 'Behaviour'}</small><b class="behaviour-badge behaviour-{behaviourClass(behaviorCount(student.id))}">{behaviourLabel(behaviorCount(student.id))}</b></span>
							</div>
					<div class="row-actions"><button class="view-action" type="button" onclick={() => openViewModal(student)}><AppIcon name="view" size={17} /> {isArabic ? 'عرض' : 'View'}</button><button type="button" onclick={() => openEditModal(student)}><AppIcon name="edit" size={17} /> {isArabic ? 'تعديل' : 'Edit'}</button><button class="delete-action" type="button" onclick={() => openDeleteModal(student)}><AppIcon name="delete" size={17} /> {isArabic ? 'حذف' : 'Delete'}</button></div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="empty-state"><div class="empty-icon" aria-hidden="true"><AppIcon name="students" size={26} /></div><h2>{isArabic ? 'لم يتم العثور على أي تلميذ.' : 'No students found.'}</h2><p>{isArabic ? 'جرّب تغيير كلمات البحث أو القسم المحدد.' : 'Try changing the search term or selected class.'}</p></div>
	{/if}
</section>

{#if activeModal}
	<div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeModal()}>
		<dialog open class="modal" aria-labelledby="modal-title">
			<button class="modal-close" type="button" aria-label={isArabic ? 'إغلاق' : 'Close'} onclick={closeModal}>×</button>
			{#if activeModal === 'view'}
				<p class="eyebrow">{isArabic ? 'بيانات التلميذ' : 'Student details'}</p>
				<h2 id="modal-title">{modalStudent.firstName} {modalStudent.lastName}</h2>
				<div class="detail-list">
					<div><span>{isArabic ? 'الاسم' : 'First Name'}</span><strong>{modalStudent.firstName}</strong></div>
					<div><span>{isArabic ? 'اللقب' : 'Last Name'}</span><strong>{modalStudent.lastName}</strong></div>
					<div><span>{isArabic ? 'القسم' : 'Class'}</span><strong>{modalStudent.className}</strong></div>
					<div><span>{isArabic ? 'حضور اليوم' : "Today's attendance"}</span><strong class="status-badge status-{getStudentAttendance(modalStudent.id).today || 'none'}">{attendanceLabel(getStudentAttendance(modalStudent.id).today)}</strong></div>
					<div><span>{isArabic ? 'إجمالي الغيابات' : 'Total absences'}</span><strong>{getStudentAttendance(modalStudent.id).absenceCount}</strong></div>
					<div><span>{isArabic ? 'التنبيهات السلوكية' : 'Behaviour alerts'}</span><strong>{behaviorCount(modalStudent.id)}</strong></div>
				</div>
				<button class="secondary-button" type="button" onclick={closeModal}>{isArabic ? 'إغلاق' : 'Close'}</button>
			{:else if activeModal === 'delete'}
				<p class="eyebrow delete-eyebrow">{isArabic ? 'تأكيد الحذف' : 'Confirm deletion'}</p>
				<h2 id="modal-title">{isArabic ? 'هل أنت متأكد من حذف هذا التلميذ؟' : 'Are you sure you want to delete this student?'}</h2>
				<p class="delete-name">{modalStudent.firstName} {modalStudent.lastName}</p>
				<div class="modal-actions"><button class="secondary-button" type="button" onclick={closeModal}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button class="danger-button" type="button" onclick={confirmDelete}>{isArabic ? 'حذف' : 'Delete'}</button></div>
			{:else}
				<p class="eyebrow">{selectedStudent ? (isArabic ? 'تعديل بيانات التلميذ' : 'Edit student') : (isArabic ? 'تلميذ جديد' : 'New student')}</p>
				<h2 id="modal-title">{selectedStudent ? (isArabic ? 'تعديل البيانات' : 'Edit information') : (isArabic ? 'إضافة تلميذ' : 'Add student')}</h2>
				<form class="student-form" onsubmit={handleFormSubmit}>
					<label for="first-name">{isArabic ? 'الاسم' : 'First Name'}<input id="first-name" bind:value={form.firstName} required /></label>
					<label for="last-name">{isArabic ? 'اللقب' : 'Last Name'}<input id="last-name" bind:value={form.lastName} required /></label>
					<label for="student-class">{isArabic ? 'القسم' : 'Class'}<select id="student-class" bind:value={form.className} required>{#each classOptions as className}<option value={className}>{className}</option>{/each}</select></label>
					{#if formError}<p class="form-error" role="alert">{formError}</p>{/if}
					<div class="modal-actions"><button class="secondary-button" type="button" onclick={closeModal}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button class="primary-button" type="submit">{selectedStudent ? (isArabic ? 'حفظ التعديلات' : 'Save changes') : (isArabic ? 'إضافة التلميذ' : 'Add student')}</button></div>
				</form>
			{/if}
		</dialog>
	</div>
{/if}

<style>
	.students-page { animation: page-enter 400ms ease both; }
	.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.75rem; }
	.eyebrow { margin: 0 0 0.45rem; color: var(--app-accent); font-size: 0.8rem; font-weight: 700; }
	h1, h2, p { margin-top: 0; }
	h1 { margin-bottom: 0.45rem; font-size: clamp(1.8rem, 5vw, 2.5rem); line-height: 1.35; }
	.page-heading > div > p:last-child { margin: 0; color: var(--app-muted); font-size: 1rem; line-height: 1.7; }
	.add-button, .primary-button, .secondary-button, .danger-button { min-height: 2.9rem; border-radius: 0.5rem; cursor: pointer; font: inherit; font-weight: 700; }
	.add-button { flex: 0 0 auto; padding: 0.7rem 1rem; border: 0; background: var(--app-accent); color: #fff; box-shadow: 0 8px 16px color-mix(in srgb, var(--app-accent) 18%, transparent); }
	.add-button:hover, .primary-button:hover { background: var(--app-accent-dark); }
	.add-button span { font-size: 1.2rem; font-weight: 400; }
	.filters { display: flex; align-items: end; gap: 0.8rem; margin-bottom: 1rem; padding: 1rem; border: 1px solid var(--app-border); background: var(--app-surface); box-shadow: var(--app-shadow); }
	.search-field { display: flex; min-height: 2.9rem; flex: 1; align-items: center; gap: 0.6rem; padding: 0 0.85rem; border: 1px solid var(--app-border); border-radius: 0.45rem; color: var(--app-accent); }
	.search-field input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--app-text); font: inherit; font-size: 1rem; }
	.search-field input::placeholder { color: var(--app-muted); }
	.class-filter { display: flex; min-width: 12rem; flex-direction: column; gap: 0.3rem; color: var(--app-muted); font-size: 0.78rem; }
	.class-filter select, .student-form select, .student-form input { min-height: 2.9rem; padding: 0.6rem 0.7rem; border: 1px solid var(--app-border); border-radius: 0.45rem; background: var(--app-surface-strong); color: var(--app-text); font: inherit; font-size: 1rem; }
	.overview-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
	.overview-card { display: flex; align-items: center; gap: 0.75rem; min-height: 5rem; padding: 0.9rem 1rem; border: 1px solid var(--app-border); background: var(--app-surface); box-shadow: var(--app-shadow); }
	.overview-icon { display: grid; width: 2.25rem; height: 2.25rem; flex: 0 0 2.25rem; place-items: center; border-radius: 50%; background: var(--app-accent-soft); color: var(--app-accent); font-weight: 800; }
	.overview-card div { display: flex; min-width: 0; flex-direction: column; gap: 0.1rem; }
	.overview-card strong { font-size: 1.35rem; line-height: 1.1; }
	.overview-card div > span { color: var(--app-muted); font-size: 0.78rem; }
	.present-card .overview-icon { color: #27965a; background: rgba(39,150,90,0.12); }
	.absent-card .overview-icon { color: #d73535; background: rgba(215,53,53,0.12); }
	.late-card .overview-icon { color: #c18416; background: rgba(193,132,22,0.12); }
	.status-stack { display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem; }
	.status-badge, .behaviour-badge { display: inline-flex; width: fit-content; align-items: center; padding: 0.28rem 0.55rem; border-radius: 999px; font-size: 0.74rem; font-weight: 700; white-space: nowrap; }
	.status-present, .behaviour-none { color: #27965a; background: rgba(39,150,90,0.12); }
	.status-absent, .behaviour-high { color: #d73535; background: rgba(215,53,53,0.12); }
	.status-late, .behaviour-medium { color: #c18416; background: rgba(193,132,22,0.12); }
	.status-none, .behaviour-low { color: var(--app-muted); background: var(--app-surface-strong); }
	.status-stack small { color: var(--app-muted); font-size: 0.7rem; }
	.list-summary { margin: 0 0 0.75rem; color: var(--app-muted); font-size: 0.9rem; }
	.list-summary strong { color: var(--app-text); }
	.desktop-table-wrap { overflow: hidden; border: 1px solid var(--app-border); background: var(--app-surface); box-shadow: var(--app-shadow); }
	table { width: 100%; border-collapse: collapse; text-align: start; }
	th, td { padding: 0.9rem 1rem; border-bottom: 1px solid var(--app-border); text-align: start; }
	th { background: color-mix(in srgb, var(--app-accent-soft) 45%, var(--app-surface)); color: var(--app-muted); font-size: 0.8rem; font-weight: 700; }
	td { font-size: 0.95rem; }
	tbody tr:last-child td { border-bottom: 0; }
	tbody tr:hover { background: color-mix(in srgb, var(--app-accent-soft) 30%, var(--app-surface)); }
	.class-badge { display: inline-flex; padding: 0.25rem 0.55rem; border-radius: 0.35rem; background: var(--app-accent-soft); color: var(--app-accent); font-size: 0.8rem; font-weight: 700; }
	.row-actions { display: flex; flex-wrap: wrap; gap: 0.45rem; }
	.row-actions button { display: inline-flex; min-height: 2.25rem; align-items: center; gap: 0.3rem; padding: 0.35rem 0.5rem; border: 0; border-radius: 0.35rem; background: transparent; color: var(--app-muted); cursor: pointer; font: inherit; font-size: 0.78rem; }
	.row-actions button:hover { background: var(--app-accent-soft); color: var(--app-accent); }
	.row-actions .delete-action:hover { background: color-mix(in srgb, #b43d4c 10%, var(--app-surface)); color: #b43d4c; }
	.row-actions button:focus-visible, .add-button:focus-visible, .primary-button:focus-visible, .secondary-button:focus-visible, .danger-button:focus-visible, .modal-close:focus-visible, .search-field input:focus-visible, select:focus-visible, input:focus-visible { outline: 3px solid color-mix(in srgb, var(--app-accent) 35%, transparent); outline-offset: 2px; }
	.mobile-list { display: none; }
	.empty-state { display: grid; min-height: 16rem; place-items: center; padding: 2rem; border: 1px dashed var(--app-border); background: var(--app-surface); text-align: center; }
	.empty-icon { display: grid; width: 3.3rem; height: 3.3rem; margin-bottom: 0.8rem; place-items: center; border-radius: 50%; background: var(--app-accent-soft); color: var(--app-accent); }
	.empty-state h2 { margin-bottom: 0.35rem; font-size: 1.1rem; }
	.empty-state p { margin: 0; color: var(--app-muted); font-size: 0.9rem; }
	.modal-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; overflow-y: auto; padding: 1rem; place-items: center; background: rgba(39, 30, 31, 0.42); }
	.modal { position: relative; width: min(100%, 30rem); padding: 1.5rem; border: 1px solid var(--app-border); background: var(--app-surface); box-shadow: 0 20px 55px rgba(39, 30, 31, 0.2); animation: modal-enter 180ms ease both; }
	.modal-close { position: absolute; top: 0.75rem; inset-inline-end: 0.75rem; width: 2rem; height: 2rem; border: 0; background: transparent; color: var(--app-muted); cursor: pointer; font-size: 1.4rem; }
	.modal h2 { margin: 0 0 1.3rem; padding-inline-end: 2rem; font-size: 1.35rem; line-height: 1.5; }
	.student-form { display: flex; flex-direction: column; gap: 0.9rem; }
	.student-form label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; font-weight: 700; }
	.student-form input, .student-form select { width: 100%; }
	.form-error { margin: 0; color: #b43d4c; font-size: 0.85rem; }
	.modal-actions { display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 0.4rem; }
	.primary-button, .secondary-button, .danger-button { padding: 0.7rem 1rem; border: 0; color: #fff; }
	.primary-button { background: var(--app-accent); }
	.secondary-button { border: 1px solid var(--app-border); background: var(--app-surface-strong); color: var(--app-text); }
	.danger-button { background: #b43d4c; }
	.detail-list { display: grid; gap: 0.65rem; margin-bottom: 1.3rem; }
	.detail-list div { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.8rem; border-bottom: 1px solid var(--app-border); }
	.detail-list span { color: var(--app-muted); font-size: 0.85rem; }
	.detail-list strong { font-size: 1rem; }
	.delete-eyebrow { color: #b43d4c; }
	.delete-name { margin: -0.5rem 0 1rem; color: var(--app-muted); }

	@keyframes page-enter { from { opacity: 0; transform: translateY(0.45rem); } to { opacity: 1; transform: translateY(0); } }
	@keyframes modal-enter { from { opacity: 0; transform: translateY(0.4rem); } to { opacity: 1; transform: translateY(0); } }
	@media (max-width: 640px) {
		.page-heading { flex-direction: column; }
		.add-button { width: 100%; }
		.filters { align-items: stretch; flex-direction: column; }
		.class-filter { min-width: 0; }
		.overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.overview-card { min-height: 4.5rem; padding: 0.75rem; }
		.desktop-table-wrap { display: none; }
		.mobile-list { display: grid; gap: 0.75rem; }
		.student-card { padding: 1rem; border: 1px solid var(--app-border); background: var(--app-surface); box-shadow: var(--app-shadow); }
		.student-card-heading { display: flex; align-items: start; justify-content: space-between; gap: 0.8rem; margin-bottom: 0.8rem; }
		.student-card-heading strong { font-size: 1rem; }
		.student-card-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 0.85rem; }
		.student-card-details span { display: flex; flex-direction: column; gap: 0.15rem; color: var(--app-text); font-size: 0.9rem; }
		.student-card-details .status-badge, .student-card-details .behaviour-badge { align-self: flex-start; white-space: normal; }
		.student-card-details small { color: var(--app-muted); font-size: 0.75rem; }
		.student-card .row-actions { border-top: 1px solid var(--app-border); padding-top: 0.65rem; }
	}
	@media (prefers-reduced-motion: reduce) { .students-page, .modal { animation: none; } }
</style>
