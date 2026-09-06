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

	const className = $derived(
		classOptions.find((item) => item.replace('ème', 'eme').replaceAll(' ', '-') === page.params.slug) ||
			(page.params.slug || '').replace(/^7eme-/, '7ème ')
	);

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

	const modalStudent = $derived(
		selectedStudent || { id: '', firstName: '', lastName: '', className }
	);

	onMount(() => {
		students = importedStudents
			.filter((student) => student.className === className)
			.map((student) => ({ ...student }));

attendanceData = /** @type {any} */ (loadAttendance());		behaviorRecords = loadBehaviorRecords();
	});

	const visibleStudents = $derived(
		students
			.filter((student) => {
				const query = searchTerm.trim().toLocaleLowerCase();

				const matchesSearch =
					!query ||
					`${student.firstName} ${student.lastName}`
						.toLocaleLowerCase()
						.includes(query);

				const status = attendanceData.history.find(
					(record) =>
						record.studentId === student.id &&
						record.date === selectedDate &&
						record.session === Number(selectedSession)
				)?.status;

				const matchesAttendance =
					attendanceFilter === 'all' ||
					(attendanceFilter === 'present' && status === 'present') ||
					(attendanceFilter === 'absent' && status === 'absent');

				return matchesSearch && matchesAttendance;
			})
			.sort((left, right) => {
				const comparison = left[sortBy].localeCompare(right[sortBy], 'ar');
				return sortDescending ? -comparison : comparison;
			})
	);

	const presentCount = $derived(
		students.filter(
			(student) =>
				attendanceData.history.find(
					(record) =>
						record.studentId === student.id &&
						record.date === selectedDate &&
						record.session === Number(selectedSession)
				)?.status === 'present'
		).length
	);

	const absentCount = $derived(
		students.filter(
			(student) =>
				attendanceData.history.find(
					(record) =>
						record.studentId === student.id &&
						record.date === selectedDate &&
						record.session === Number(selectedSession)
				)?.status === 'absent'
		).length
	);

	const unrecordedCount = $derived(
		Math.max(students.length - presentCount - absentCount, 0)
	);

	/** @param {string} studentId @param {'present' | 'absent'} status */
	function setAttendance(studentId, status) {
		attendanceData = recordAttendance(
			attendanceData,
			studentId,
			selectedDate,
			status
		);
	}

	/** @param {number} level */
	function behaviorLabel(level) {
		if (level === 3)
			return isArabic
				? 'التنبيه الثالث — إجراء إداري مطلوب'
				: 'Third alert — administrative action required';

		if (level === 2)
			return isArabic ? 'التنبيه الثاني' : 'Second alert';

		if (level === 1)
			return isArabic ? 'التنبيه الأول' : 'First alert';

		return isArabic ? 'لا توجد تنبيهات' : 'No alerts';
	}

	/** @param {string} studentId */
	function removeLatestBehavior(studentId) {
		const studentRecords = getStudentRecords(behaviorRecords, studentId);

		if (!studentRecords.length) return;

		const latestRecord = [...studentRecords].sort(
			(a, b) =>
				new Date(b.createdAt).getTime() -
				new Date(a.createdAt).getTime()
		)[0];

		const confirmed = window.confirm(
			isArabic
				? 'هل تريد حذف آخر تنبيه سلوكي لهذا التلميذ؟'
				: 'Do you want to remove the latest behaviour alert for this student?'
		);

		if (!confirmed) return;

		behaviorRecords = behaviorRecords.filter(
			(record) => record.id !== latestRecord.id
		);

		saveBehaviorRecords(behaviorRecords);
	}

	/** @param {Student} student */
	function openView(student) {
		selectedStudent = student;
		activeModal = 'view';
	}

	/** @param {Student} student */
	function openEdit(student) {
		selectedStudent = student;

		form = {
			firstName: student.firstName,
			lastName: student.lastName,
			className: student.className
		};

		formError = '';
		activeModal = 'form';
	}

	function openAdd() {
		selectedStudent = null;

		form = {
			firstName: '',
			lastName: '',
			className
		};

		formError = '';
		activeModal = 'form';
	}

	/** @param {Student} student */
	function openDelete(student) {
		selectedStudent = student;
		activeModal = 'delete';
	}

	function closeModal() {
		activeModal = null;
		selectedStudent = null;
		formError = '';
	}

	/** @param {SubmitEvent} event */
	function submitStudent(event) {
		event.preventDefault();

		if (!form.firstName.trim() || !form.lastName.trim()) {
			formError = isArabic
				? 'يرجى إدخال الاسم واللقب.'
				: 'Please enter first and last name.';
			return;
		}

		const selectedId = selectedStudent?.id;

		if (selectedId !== undefined) {
			students = students.map((student) =>
				student.id === selectedId
					? {
							...student,
							firstName: form.firstName.trim(),
							lastName: form.lastName.trim()
						}
					: student
			);
		} else {
			students = [
				...students,
				{
					id: `local-${Date.now()}`,
					firstName: form.firstName.trim(),
					lastName: form.lastName.trim(),
					className
				}
			];
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
	function handleKeydown(event) {
		if (event.key === 'Escape') closeModal();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>
		{className
			? `${isArabic ? 'تلاميذ' : 'Students'} — ${className}`
			: isArabic
				? 'القسم غير موجود'
				: 'Class not found'}
	</title>
</svelte:head>

<section class="class-students-page" aria-labelledby="class-students-title">
	{#if className}
		<a class="back-link" href="/app/classes">
			<span class="back-arrow">←</span>
			{isArabic ? 'العودة إلى الأقسام' : 'Back to Classes'}
		</a>

		<header class="page-header">
			<div class="heading-copy">
				<div class="title-line">
					<div class="class-icon">
						<AppIcon name="classes" size={25} />
					</div>

					<div>
						<p class="eyebrow">{isArabic ? 'القسم الدراسي' : 'CLASS'}</p>
						<h1 id="class-students-title">{className}</h1>
					</div>
				</div>

				<p class="student-count">
					{students.length}
					{isArabic ? 'تلميذاً في هذا القسم' : 'students in this class'}
				</p>
			</div>

			<button class="add-button" type="button" onclick={openAdd}>
				<span>+</span>
				{isArabic ? 'إضافة تلميذ' : 'Add Student'}
			</button>
		</header>

		<section class="summary-grid" aria-label={isArabic ? 'ملخص الحضور' : 'Attendance summary'}>
			<div class="summary-card">
				<div class="summary-icon neutral">
					<AppIcon name="students" size={19} />
				</div>
				<div>
					<span>{isArabic ? 'إجمالي التلاميذ' : 'Total Students'}</span>
					<strong>{students.length}</strong>
				</div>
			</div>

			<div class="summary-card present-card">
				<div class="summary-icon present">
					<span>✓</span>
				</div>
				<div>
					<span>{isArabic ? 'حاضرون' : 'Present'}</span>
					<strong>{presentCount}</strong>
				</div>
			</div>

			<div class="summary-card absent-card">
				<div class="summary-icon absent">
					<span>×</span>
				</div>
				<div>
					<span>{isArabic ? 'غائبون' : 'Absent'}</span>
					<strong>{absentCount}</strong>
				</div>
			</div>

			<div class="summary-card pending-card">
				<div class="summary-icon pending">
					<span>•</span>
				</div>
				<div>
					<span>{isArabic ? 'لم يسجل' : 'Not Recorded'}</span>
					<strong>{unrecordedCount}</strong>
				</div>
			</div>
		</section>

		<section
			class="control-panel"
			aria-label={isArabic ? 'أدوات التلاميذ والحضور' : 'Student and attendance tools'}
		>
			<div class="attendance-context">
				<div class="context-icon">
					<AppIcon name="attendance" size={19} />
				</div>

				<div>
					<strong>{isArabic ? 'تسجيل الحضور' : 'Attendance'}</strong>
					<span>
						{isArabic
							? `الحصة ${selectedSession} · ${selectedDate}`
							: `Session ${selectedSession} · ${selectedDate}`}
					</span>
				</div>
			</div>

			<div class="controls-divider"></div>

			<label class="control-field">
				<span>{isArabic ? 'الحصة' : 'Session'}</span>
				<select bind:value={selectedSession}>
					{#each [1, 2, 3, 4, 5, 6, 7] as session}
						<option value={session}>
							{isArabic ? `الحصة ${session}` : `Session ${session}`}
						</option>
					{/each}
				</select>
			</label>

			<label class="control-field">
				<span>{isArabic ? 'التاريخ' : 'Date'}</span>
				<input type="date" bind:value={selectedDate} />
			</label>

			<label class="search-field" for="class-student-search">
				<AppIcon name="search" size={18} />
				<input
					id="class-student-search"
					bind:value={searchTerm}
					type="search"
					placeholder={isArabic ? 'البحث عن تلميذ...' : 'Search students...'}
				/>
			</label>

			<label class="control-field compact">
				<span>{isArabic ? 'الحضور' : 'Attendance'}</span>
				<select bind:value={attendanceFilter}>
					<option value="all">{isArabic ? 'الكل' : 'All'}</option>
					<option value="present">{isArabic ? 'حاضر' : 'Present'}</option>
					<option value="absent">{isArabic ? 'غائب' : 'Absent'}</option>
				</select>
			</label>

			<div class="sort-group">
				<label class="control-field compact">
					<span>{isArabic ? 'ترتيب' : 'Sort'}</span>
					<select bind:value={sortBy}>
						<option value="firstName">{isArabic ? 'الاسم' : 'First Name'}</option>
						<option value="lastName">{isArabic ? 'اللقب' : 'Last Name'}</option>
					</select>
				</label>

				<button
					class="sort-button"
					type="button"
					aria-label={isArabic ? 'تغيير اتجاه الترتيب' : 'Toggle sort direction'}
					onclick={() => (sortDescending = !sortDescending)}
				>
					{sortDescending ? '↓' : '↑'}
				</button>
			</div>
		</section>

		<div class="table-header">
			<div>
				<h2>{isArabic ? 'قائمة التلاميذ' : 'Students List'}</h2>
				<p>
					{isArabic
						? `عرض ${visibleStudents.length} من ${students.length} تلميذاً`
						: `Showing ${visibleStudents.length} of ${students.length} students`}
				</p>
			</div>

			<div class="legend">
				<span><i class="legend-dot green"></i>{isArabic ? 'حاضر' : 'Present'}</span>
				<span><i class="legend-dot red"></i>{isArabic ? 'غائب' : 'Absent'}</span>
			</div>
		</div>

		<div class="student-table-wrap">
			<table>
				<thead>
					<tr>
						<th class="number-column">#</th>
						<th>{isArabic ? 'الاسم' : 'First Name'}</th>
						<th>{isArabic ? 'اللقب' : 'Last Name'}</th>
						<th>{isArabic ? 'الحضور' : 'Attendance'}</th>
						<th>{isArabic ? 'السلوك' : 'Behaviour'}</th>
						<th>{isArabic ? 'الإجراءات' : 'Actions'}</th>
					</tr>
				</thead>

				<tbody>
					{#each visibleStudents as student, index (student.id)}
						{@const currentStatus = attendanceData.history.find(
							(record) =>
								record.studentId === student.id &&
								record.date === selectedDate &&
								record.session === Number(selectedSession)
						)?.status}

						{@const alertLevel = getStudentAlertLevel(behaviorRecords, student.id)}

						<tr>
							<td class="number-cell">
								<span>{index + 1}</span>
							</td>

							<td class="name-cell">
								<div class="student-avatar">
									{student.firstName.charAt(0).toUpperCase()}
								</div>
								<strong>{student.firstName}</strong>
							</td>

							<td class="last-name-cell">
								{student.lastName}
							</td>

							<td>
								<div class="attendance-control">
									<button
										class="attendance-option present-option"
										class:chosen={currentStatus === 'present'}
										type="button"
										aria-label={isArabic ? 'حاضر' : 'Present'}
										onclick={() => setAttendance(student.id, 'present')}
									>
										<span>✓</span>
										{isArabic ? 'حاضر' : 'Present'}
									</button>

									<button
										class="attendance-option absent-option"
										class:chosen={currentStatus === 'absent'}
										type="button"
										aria-label={isArabic ? 'غائب' : 'Absent'}
										onclick={() => setAttendance(student.id, 'absent')}
									>
										<span>×</span>
										{isArabic ? 'غائب' : 'Absent'}
									</button>
								</div>
							</td>

							<td>
								<div class="behavior-cell">
									<div
										class="behavior-status"
										title={behaviorLabel(alertLevel)}
									>
										<span
											class="behavior-dot"
											class:level-one={alertLevel === 1}
											class:level-two={alertLevel === 2}
											class:level-three={alertLevel >= 3}
										></span>

										<span class="behavior-text">
											{alertLevel
												? isArabic
													? `التنبيه ${alertLevel}`
													: `Alert ${alertLevel}`
												: isArabic
													? 'لا توجد تنبيهات'
													: 'No alerts'}
										</span>
									</div>

									{#if alertLevel >= 3}
										<span class="admin-warning">
											{isArabic ? 'إجراء إداري' : 'Admin action'}
										</span>
									{/if}

									<div class="behavior-actions">
										<a
											class="alert-button add-alert"
											aria-label={isArabic ? 'إضافة تنبيه سلوكي' : 'Add behaviour alert'}
											href={`/app/behaviour?student=${encodeURIComponent(student.id)}&action=add`}
										>
											+
										</a>

										<button
											class="alert-button remove-alert"
											type="button"
											disabled={alertLevel === 0}
											aria-label={isArabic ? 'حذف آخر تنبيه سلوكي' : 'Remove latest behaviour alert'}
											onclick={() => removeLatestBehavior(student.id)}
										>
											−
										</button>
									</div>
								</div>
							</td>

							<td>
								<div class="row-actions">
									<button
										type="button"
										aria-label={isArabic ? `عرض ${student.firstName}` : `View ${student.firstName}`}
										onclick={() => openView(student)}
									>
										<AppIcon name="view" size={17} />
									</button>

									<button
										type="button"
										aria-label={isArabic ? `تعديل ${student.firstName}` : `Edit ${student.firstName}`}
										onclick={() => openEdit(student)}
									>
										<AppIcon name="edit" size={17} />
									</button>

									<button
										class="delete-action"
										type="button"
										aria-label={isArabic ? `حذف ${student.firstName}` : `Delete ${student.firstName}`}
										onclick={() => openDelete(student)}
									>
										<AppIcon name="delete" size={17} />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if !visibleStudents.length}
			<div class="empty-state">
				<div class="empty-icon">
					<AppIcon name="students" size={28} />
				</div>
				<h3>{isArabic ? 'لم يتم العثور على أي تلميذ' : 'No students found'}</h3>
				<p>
					{isArabic
						? 'جرّب تغيير البحث أو خيارات التصفية.'
						: 'Try changing your search or filter options.'}
				</p>
			</div>
		{/if}
	{:else}
		<div class="empty-state page-error">
			<div class="empty-icon">
				<AppIcon name="classes" size={28} />
			</div>
			<h1 id="class-students-title">
				{isArabic ? 'القسم غير موجود' : 'Class not found'}
			</h1>
		</div>
	{/if}
</section>

{#if activeModal}
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={(event) => event.target === event.currentTarget && closeModal()}
	>
		<dialog open class="modal" aria-labelledby="modal-title">
			<button
				class="modal-close"
				type="button"
				aria-label={isArabic ? 'إغلاق' : 'Close'}
				onclick={closeModal}
			>
				×
			</button>

			{#if activeModal === 'view'}
				<div class="modal-heading">
					<div class="modal-avatar">
						{modalStudent.firstName.charAt(0).toUpperCase()}
					</div>

					<div>
						<p class="eyebrow">{isArabic ? 'بيانات التلميذ' : 'STUDENT DETAILS'}</p>
						<h2 id="modal-title">
							{modalStudent.firstName} {modalStudent.lastName}
						</h2>
					</div>
				</div>

				<div class="detail-list">
					<div class="detail-item">
						<span>{isArabic ? 'الاسم' : 'First Name'}</span>
						<strong>{modalStudent.firstName}</strong>
					</div>

					<div class="detail-item">
						<span>{isArabic ? 'اللقب' : 'Last Name'}</span>
						<strong>{modalStudent.lastName}</strong>
					</div>

					<div class="detail-item">
						<span>{isArabic ? 'القسم' : 'Class'}</span>
						<strong>{modalStudent.className}</strong>
					</div>

					<div class="detail-item">
						<span>{isArabic ? 'مستوى التنبيهات' : 'Alert Level'}</span>
						<strong class:danger-text={getStudentAlertLevel(behaviorRecords, modalStudent.id) >= 3}>
							{getStudentAlertLevel(behaviorRecords, modalStudent.id) ||
								(isArabic ? 'لا توجد تنبيهات' : 'No alerts')}
						</strong>
					</div>
				</div>

				{#if getStudentRecords(behaviorRecords, modalStudent.id).length}
					<div class="history-section">
						<h3>{isArabic ? 'السجل السلوكي' : 'Behaviour History'}</h3>

						<div class="history-list">
							{#each getStudentRecords(behaviorRecords, modalStudent.id) as record}
								<article>
									<strong>{record.summary}</strong>
									<small>
										{record.createdAt.slice(0, 10)}
										·
										{new Date(record.createdAt).toLocaleTimeString(
											'en-US',
											{
												hour: 'numeric',
												minute: '2-digit',
												second: '2-digit'
											}
										)}
									</small>
								</article>
							{/each}
						</div>
					</div>
				{/if}

				<div class="modal-footer">
					<button class="secondary-button" type="button" onclick={closeModal}>
						{isArabic ? 'إغلاق' : 'Close'}
					</button>
				</div>
			{:else if activeModal === 'delete'}
				<div class="confirm-icon">
					<AppIcon name="delete" size={23} />
				</div>

				<p class="eyebrow">{isArabic ? 'تأكيد الحذف' : 'CONFIRM DELETION'}</p>

				<h2 id="modal-title">
					{isArabic
						? 'هل أنت متأكد من حذف هذا التلميذ؟'
						: 'Are you sure you want to delete this student?'}
				</h2>

				<p class="confirm-description">
					{isArabic
						? `سيتم حذف ${modalStudent.firstName} ${modalStudent.lastName} من قائمة هذا القسم.`
						: `${modalStudent.firstName} ${modalStudent.lastName} will be removed from this class list.`}
				</p>

				<div class="modal-actions">
					<button class="secondary-button" type="button" onclick={closeModal}>
						{isArabic ? 'إلغاء' : 'Cancel'}
					</button>

					<button class="danger-button" type="button" onclick={confirmDelete}>
						{isArabic ? 'حذف التلميذ' : 'Delete Student'}
					</button>
				</div>
			{:else}
				<p class="eyebrow">
					{selectedStudent
						? isArabic
							? 'تعديل بيانات التلميذ'
							: 'EDIT STUDENT'
						: isArabic
							? 'إضافة تلميذ'
							: 'ADD STUDENT'}
				</p>

				<h2 id="modal-title">
					{selectedStudent
						? isArabic
							? 'تعديل البيانات'
							: 'Edit Information'
						: isArabic
							? 'إضافة تلميذ جديد'
							: 'Add New Student'}
				</h2>

				<form onsubmit={submitStudent}>
					<label for="first-name">
						<span>{isArabic ? 'الاسم' : 'First Name'}</span>
						<input id="first-name" bind:value={form.firstName} required />
					</label>

					<label for="last-name">
						<span>{isArabic ? 'اللقب' : 'Last Name'}</span>
						<input id="last-name" bind:value={form.lastName} required />
					</label>

					<label>
						<span>{isArabic ? 'القسم' : 'Class'}</span>
						<input value={className} disabled />
					</label>

					{#if formError}
						<p class="form-error" role="alert">{formError}</p>
					{/if}

					<div class="modal-actions">
						<button class="secondary-button" type="button" onclick={closeModal}>
							{isArabic ? 'إلغاء' : 'Cancel'}
						</button>

						<button class="primary-button" type="submit">
							{selectedStudent
								? isArabic
									? 'حفظ التغييرات'
									: 'Save Changes'
								: isArabic
									? 'إضافة التلميذ'
									: 'Add Student'}
						</button>
					</div>
				</form>
			{/if}
		</dialog>
	</div>
{/if}

<style>
	.class-students-page {
		max-width: 1500px;
		margin: 0 auto;
		padding: 0.25rem 0 2rem;
		animation: page-enter 350ms ease both;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.1rem;
		color: var(--app-muted);
		font-size: 0.86rem;
		font-weight: 600;
		text-decoration: none;
		transition:
			color 160ms ease,
			transform 160ms ease;
	}

	.back-link:hover {
		color: var(--app-accent);
		transform: translateX(-2px);
	}

	.back-arrow {
		font-size: 1.15rem;
		line-height: 1;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		margin-bottom: 1.35rem;
	}

	.heading-copy {
		min-width: 0;
	}

	.title-line {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	.class-icon {
		display: grid;
		width: 3.15rem;
		height: 3.15rem;
		flex: 0 0 3.15rem;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--app-accent) 15%, var(--app-border));
		border-radius: 0.85rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	.eyebrow {
		margin: 0 0 0.22rem;
		color: var(--app-accent);
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}

	h1,
	h2,
	h3,
	p {
		margin-top: 0;
	}

	h1 {
		margin-bottom: 0;
		color: var(--app-text);
		font-size: clamp(1.55rem, 3vw, 2.1rem);
		line-height: 1.15;
	}

	.student-count {
		margin: 0.45rem 0 0;
		margin-inline-start: 4rem;
		color: var(--app-muted);
		font-size: 0.85rem;
	}

	.add-button,
	.primary-button,
	.secondary-button,
	.danger-button {
		min-height: 2.7rem;
		padding: 0.62rem 1rem;
		border-radius: 0.6rem;
		cursor: pointer;
		font: inherit;
		font-size: 0.85rem;
		font-weight: 750;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease,
			background 160ms ease;
	}

	.add-button {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		border: 0;
		background: var(--app-accent);
		color: #fff;
		box-shadow: 0 7px 18px color-mix(in srgb, var(--app-accent) 20%, transparent);
	}

	.add-button span {
		font-size: 1.15rem;
		line-height: 0.8;
	}

	.add-button:hover {
		background: var(--app-accent-dark);
		transform: translateY(-1px);
		box-shadow: 0 9px 22px color-mix(in srgb, var(--app-accent) 25%, transparent);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.7rem;
		margin-bottom: 0.85rem;
	}

	.summary-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 5rem;
		padding: 0.8rem 0.9rem;
		border: 1px solid var(--app-border);
		border-radius: 0.75rem;
		background: var(--app-surface);
		box-shadow: 0 2px 8px rgba(67, 42, 42, 0.035);
	}

	.summary-icon {
		display: grid;
		width: 2.45rem;
		height: 2.45rem;
		flex: 0 0 2.45rem;
		place-items: center;
		border-radius: 0.65rem;
	}

	.summary-icon.neutral {
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	.summary-icon.present {
		background: #e9f5ee;
		color: #28734a;
		font-size: 1.1rem;
		font-weight: 800;
	}

	.summary-icon.absent {
		background: #fff0f0;
		color: #b63b3b;
		font-size: 1.25rem;
		font-weight: 700;
	}

	.summary-icon.pending {
		background: #f8f2e9;
		color: #987044;
		font-size: 1.35rem;
		font-weight: 800;
	}

	.summary-card span {
		display: block;
		margin-bottom: 0.2rem;
		color: var(--app-muted);
		font-size: 0.72rem;
	}

	.summary-card strong {
		display: block;
		color: var(--app-text);
		font-size: 1.35rem;
		line-height: 1;
	}

	.control-panel {
		display: flex;
		align-items: end;
		gap: 0.55rem;
		margin-bottom: 1rem;
		padding: 0.75rem;
		border: 1px solid var(--app-border);
		border-radius: 0.8rem;
		background: var(--app-surface);
		box-shadow: 0 2px 10px rgba(67, 42, 42, 0.035);
	}

	.attendance-context {
		display: flex;
		align-items: center;
		align-self: center;
		gap: 0.6rem;
		min-width: 10.5rem;
		margin-inline-end: 0.2rem;
	}

	.context-icon {
		display: grid;
		width: 2.25rem;
		height: 2.25rem;
		flex: 0 0 2.25rem;
		place-items: center;
		border-radius: 0.55rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	.attendance-context strong {
		display: block;
		margin-bottom: 0.15rem;
		color: var(--app-text);
		font-size: 0.78rem;
	}

	.attendance-context span {
		display: block;
		color: var(--app-muted);
		font-size: 0.68rem;
	}

	.controls-divider {
		width: 1px;
		height: 2.1rem;
		align-self: center;
		background: var(--app-border);
	}

	.control-field {
		display: flex;
		min-width: 7rem;
		flex-direction: column;
		gap: 0.22rem;
	}

	.control-field span {
		color: var(--app-muted);
		font-size: 0.67rem;
		font-weight: 700;
	}

	.control-field select,
	.control-field input,
	.search-field {
		height: 2.45rem;
		border: 1px solid var(--app-border);
		border-radius: 0.5rem;
		background: var(--app-surface-strong);
		color: var(--app-text);
		font: inherit;
		font-size: 0.76rem;
		outline: none;
		transition:
			border-color 150ms ease,
			box-shadow 150ms ease;
	}

	.control-field select,
	.control-field input {
		padding: 0 0.55rem;
	}

	.control-field select:focus,
	.control-field input:focus,
	.search-field:focus-within {
		border-color: color-mix(in srgb, var(--app-accent) 60%, var(--app-border));
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent) 10%, transparent);
	}

	.search-field {
		display: flex;
		min-width: 12rem;
		flex: 1;
		align-items: center;
		gap: 0.45rem;
		padding: 0 0.65rem;
		color: var(--app-accent);
	}

	.search-field input {
		width: 100%;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--app-text);
		font: inherit;
		font-size: 0.78rem;
	}

	.search-field input::placeholder {
		color: var(--app-muted);
	}

	.sort-group {
		display: flex;
		align-items: end;
		gap: 0.3rem;
	}

	.control-field.compact {
		min-width: 6.6rem;
	}

	.sort-button {
		display: grid;
		width: 2.45rem;
		height: 2.45rem;
		place-items: center;
		border: 1px solid var(--app-border);
		border-radius: 0.5rem;
		background: var(--app-surface-strong);
		color: var(--app-accent);
		cursor: pointer;
		font-size: 1rem;
		transition:
			border-color 150ms ease,
			background 150ms ease;
	}

	.sort-button:hover {
		border-color: var(--app-accent);
		background: var(--app-accent-soft);
	}

	.table-header {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.55rem;
	}

	.table-header h2 {
		margin-bottom: 0.15rem;
		font-size: 1rem;
	}

	.table-header p {
		margin: 0;
		color: var(--app-muted);
		font-size: 0.72rem;
	}

	.legend {
		display: flex;
		gap: 0.85rem;
		color: var(--app-muted);
		font-size: 0.68rem;
	}

	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 0.32rem;
	}

	.legend-dot {
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 50%;
	}

	.legend-dot.green {
		background: #28734a;
	}

	.legend-dot.red {
		background: #b63b3b;
	}

	.student-table-wrap {
		overflow: hidden;
		border: 1px solid var(--app-border);
		border-radius: 0.8rem;
		background: var(--app-surface);
		box-shadow: 0 3px 12px rgba(67, 42, 42, 0.045);
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 0.72rem 0.75rem;
		border-bottom: 1px solid var(--app-border);
		text-align: start;
	}

	th {
		background: var(--app-surface-soft);
		color: var(--app-muted);
		font-size: 0.67rem;
		font-weight: 750;
		letter-spacing: 0.01em;
	}

	td {
		color: var(--app-text);
		font-size: 0.77rem;
	}

	tbody tr {
		transition: background 140ms ease;
	}

	tbody tr:hover {
		background: color-mix(in srgb, var(--app-accent-soft) 28%, var(--app-surface));
	}

	tbody tr:last-child td {
		border-bottom: 0;
	}

	.number-column {
		width: 3rem;
	}

	.number-cell span {
		display: grid;
		width: 1.7rem;
		height: 1.7rem;
		place-items: center;
		border-radius: 0.45rem;
		background: var(--app-surface-soft);
		color: var(--app-muted);
		font-size: 0.68rem;
		font-weight: 700;
	}

	.name-cell {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}

	.student-avatar {
		display: grid;
		width: 2rem;
		height: 2rem;
		flex: 0 0 2rem;
		place-items: center;
		border-radius: 0.55rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
		font-size: 0.72rem;
		font-weight: 800;
	}

	.name-cell strong {
		font-size: 0.78rem;
		font-weight: 700;
	}

	.last-name-cell {
		font-weight: 600;
	}

	.attendance-control {
		display: flex;
		gap: 0.3rem;
	}

	.attendance-option {
		display: inline-flex;
		min-height: 2rem;
		align-items: center;
		gap: 0.3rem;
		padding: 0.25rem 0.55rem;
		border: 1px solid var(--app-border);
		border-radius: 0.42rem;
		background: var(--app-surface-strong);
		color: var(--app-muted);
		cursor: pointer;
		font: inherit;
		font-size: 0.68rem;
		font-weight: 650;
		transition:
			background 140ms ease,
			border-color 140ms ease,
			color 140ms ease;
	}

	.attendance-option span {
		font-size: 0.78rem;
		font-weight: 800;
	}

	.present-option.chosen {
		border-color: #83b998;
		background: #edf8f1;
		color: #28734a;
	}

	.absent-option.chosen {
		border-color: #e0a0a0;
		background: #fff1f1;
		color: #b63b3b;
	}

	.attendance-option:hover {
		border-color: color-mix(in srgb, var(--app-accent) 45%, var(--app-border));
	}

	.behavior-cell {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.behavior-status {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		white-space: nowrap;
	}

	.behavior-dot {
		width: 0.55rem;
		height: 0.55rem;
		flex: 0 0 0.55rem;
		border-radius: 50%;
		background: #b8b2ad;
	}

	.behavior-dot.level-one {
		background: #3b8a61;
	}

	.behavior-dot.level-two {
		background: #c58b35;
	}

	.behavior-dot.level-three {
		background: #c34848;
	}

	.behavior-text {
		color: var(--app-muted);
		font-size: 0.68rem;
	}

	.admin-warning {
		padding: 0.17rem 0.35rem;
		border-radius: 0.3rem;
		background: #fff0f0;
		color: #b63b3b;
		font-size: 0.59rem;
		font-weight: 750;
	}

	.behavior-actions {
		display: inline-flex;
		align-items: center;
		gap: 0.22rem;
		margin-inline-start: auto;
	}

	.alert-button {
		display: grid;
		width: 1.55rem;
		height: 1.55rem;
		flex: 0 0 1.55rem;
		place-items: center;
		border: 1px solid var(--app-border);
		border-radius: 0.4rem;
		background: var(--app-surface);
		color: var(--app-accent);
		cursor: pointer;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 750;
		line-height: 1;
		text-decoration: none;
		transition:
			background 140ms ease,
			border-color 140ms ease;
	}

	.alert-button:hover:not(:disabled) {
		border-color: var(--app-accent);
		background: var(--app-accent-soft);
	}

	.alert-button:disabled {
		cursor: not-allowed;
		opacity: 0.35;
	}

	.remove-alert {
		color: var(--app-muted);
	}

	.row-actions {
		display: flex;
		gap: 0.15rem;
	}

	.row-actions button {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border: 0;
		border-radius: 0.4rem;
		background: transparent;
		color: var(--app-muted);
		cursor: pointer;
		transition:
			background 140ms ease,
			color 140ms ease;
	}

	.row-actions button:hover {
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	.row-actions .delete-action:hover {
		background: #fff0f0;
		color: #b63b3b;
	}

	.empty-state {
		display: grid;
		justify-items: center;
		margin-top: 0.75rem;
		padding: 2.5rem 1rem;
		border: 1px dashed var(--app-border);
		border-radius: 0.8rem;
		background: var(--app-surface);
		color: var(--app-muted);
		text-align: center;
	}

	.empty-icon {
		display: grid;
		width: 3.2rem;
		height: 3.2rem;
		margin-bottom: 0.65rem;
		place-items: center;
		border-radius: 0.8rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	.empty-state h3,
	.empty-state h1 {
		margin-bottom: 0.3rem;
		font-size: 1rem;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.76rem;
	}

	.page-error {
		min-height: 18rem;
		place-content: center;
	}

	.modal-backdrop {
		position: fixed;
		z-index: 50;
		inset: 0;
		display: grid;
		padding: 1rem;
		place-items: center;
		background: rgba(40, 30, 31, 0.48);
		backdrop-filter: blur(3px);
		animation: fade-in 160ms ease both;
	}

	.modal {
		position: relative;
		width: min(100%, 30rem);
		max-height: calc(100vh - 2rem);
		overflow: auto;
		padding: 1.45rem;
		border: 1px solid var(--app-border);
		border-radius: 0.9rem;
		background: var(--app-surface);
		box-shadow: 0 22px 60px rgba(45, 30, 30, 0.2);
		animation: modal-enter 220ms ease both;
	}

	.modal-close {
		position: absolute;
		top: 0.65rem;
		inset-inline-end: 0.65rem;
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border: 0;
		border-radius: 0.45rem;
		background: transparent;
		color: var(--app-muted);
		cursor: pointer;
		font-size: 1.35rem;
	}

	.modal-close:hover {
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	.modal h2 {
		margin-bottom: 1.1rem;
		color: var(--app-text);
		font-size: 1.25rem;
		line-height: 1.3;
	}

	.modal-heading {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.1rem;
	}

	.modal-heading h2 {
		margin-bottom: 0;
	}

	.modal-avatar {
		display: grid;
		width: 3rem;
		height: 3rem;
		flex: 0 0 3rem;
		place-items: center;
		border-radius: 0.7rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
		font-size: 1rem;
		font-weight: 800;
	}

	.detail-list {
		display: grid;
		gap: 0.5rem;
		margin-bottom: 1.1rem;
	}

	.detail-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.65rem 0.7rem;
		border: 1px solid var(--app-border);
		border-radius: 0.5rem;
		background: var(--app-surface-soft);
	}

	.detail-item span {
		color: var(--app-muted);
		font-size: 0.72rem;
	}

	.detail-item strong {
		color: var(--app-text);
		font-size: 0.76rem;
	}

	.danger-text {
		color: #b63b3b !important;
	}

	.history-section {
		margin-top: 1rem;
	}

	.history-section h3 {
		margin-bottom: 0.5rem;
		font-size: 0.78rem;
	}

	.history-list {
		display: grid;
		gap: 0.45rem;
		max-height: 12rem;
		overflow-y: auto;
	}

	.history-list article {
		display: grid;
		gap: 0.25rem;
		padding: 0.65rem;
		border-inline-start: 3px solid var(--app-accent);
		background: var(--app-surface-soft);
	}

	.history-list strong {
		font-size: 0.72rem;
		line-height: 1.4;
	}

	.history-list small {
		color: var(--app-muted);
		font-size: 0.63rem;
	}

	.modal form {
		display: grid;
		gap: 0.75rem;
	}

	.modal label {
		display: grid;
		gap: 0.3rem;
	}

	.modal label > span {
		color: var(--app-muted);
		font-size: 0.7rem;
		font-weight: 700;
	}

	.modal input {
		width: 100%;
		min-height: 2.7rem;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--app-border);
		border-radius: 0.5rem;
		background: var(--app-surface-strong);
		color: var(--app-text);
		font: inherit;
		font-size: 0.8rem;
		outline: none;
		box-sizing: border-box;
	}

	.modal input:focus {
		border-color: var(--app-accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent) 10%, transparent);
	}

	.modal input:disabled {
		color: var(--app-muted);
		cursor: not-allowed;
	}

	.form-error {
		margin: 0;
		padding: 0.55rem 0.65rem;
		border-radius: 0.45rem;
		background: #fff0f0;
		color: #b63b3b;
		font-size: 0.72rem;
	}

	.confirm-icon {
		display: grid;
		width: 3rem;
		height: 3rem;
		margin-bottom: 0.8rem;
		place-items: center;
		border-radius: 0.7rem;
		background: #fff0f0;
		color: #b63b3b;
	}

	.confirm-description {
		margin: -0.5rem 0 1.1rem;
		color: var(--app-muted);
		font-size: 0.76rem;
		line-height: 1.5;
	}

	.modal-actions,
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.45rem;
		margin-top: 1rem;
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
		border-color: var(--app-accent);
		color: var(--app-accent);
	}

	.danger-button {
		border: 0;
		background: #b63b3b;
		color: #fff;
	}

	.danger-button:hover {
		background: #9f3030;
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

	@keyframes fade-in {
		from {
			opacity: 0;
		}

		to {
			opacity: 1;
		}
	}

	@keyframes modal-enter {
		from {
			opacity: 0;
			transform: translateY(0.6rem) scale(0.98);
		}

		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@media (max-width: 1100px) {
		.summary-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.control-panel {
			flex-wrap: wrap;
			align-items: end;
		}

		.attendance-context {
			flex: 1 0 100%;
		}

		.controls-divider {
			display: none;
		}

		.search-field {
			min-width: 15rem;
		}
	}

	@media (max-width: 760px) {
		.class-students-page {
			padding-bottom: 1.25rem;
		}

		.page-header {
			align-items: stretch;
			flex-direction: column;
		}

		.add-button {
			justify-content: center;
			width: 100%;
		}

		.student-count {
			margin-inline-start: 0;
		}

		.summary-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.control-panel {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}

		.attendance-context {
			grid-column: 1 / -1;
		}

		.search-field {
			min-width: 0;
			grid-column: 1 / -1;
		}

		.sort-group {
			min-width: 0;
		}

		.control-field,
		.control-field.compact {
			min-width: 0;
		}

		.table-header {
			align-items: flex-start;
			flex-direction: column;
		}

		.legend {
			display: none;
		}

		.student-table-wrap {
			overflow: visible;
			border: 0;
			background: transparent;
			box-shadow: none;
		}

		table {
			display: block;
		}

		thead {
			display: none;
		}

		tbody {
			display: grid;
			gap: 0.5rem;
		}

		tbody tr {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.55rem 0.75rem;
			padding: 0.75rem;
			border: 1px solid var(--app-border);
			border-radius: 0.7rem;
			background: var(--app-surface);
			box-shadow: 0 2px 8px rgba(67, 42, 42, 0.035);
		}

		tbody tr:hover {
			background: var(--app-surface);
		}

		tbody td {
			display: block;
			padding: 0;
			border: 0;
			white-space: normal;
		}

		tbody td:nth-child(1) {
			display: none;
		}

		tbody td:nth-child(2) {
			grid-column: 1 / -1;
		}

		tbody td:nth-child(3) {
			grid-column: 1 / -1;
			margin-top: -0.35rem;
			margin-inline-start: 2.55rem;
			color: var(--app-muted);
		}

		tbody td:nth-child(4),
		tbody td:nth-child(5),
		tbody td:nth-child(6) {
			grid-column: 1 / -1;
		}

		.name-cell {
			padding-bottom: 0.1rem;
		}

		.attendance-control {
			width: fit-content;
		}

		.behavior-cell {
			flex-wrap: wrap;
		}

		.behavior-actions {
			margin-inline-start: 0;
		}

		.row-actions {
			padding-top: 0.2rem;
			border-top: 1px solid var(--app-border);
		}

		.row-actions button {
			width: 2.35rem;
			height: 2.35rem;
		}

		.modal {
			width: min(100%, 31rem);
			padding: 1.2rem;
		}
	}

	@media (max-width: 460px) {
		.summary-grid {
			grid-template-columns: 1fr 1fr;
			gap: 0.45rem;
		}

		.summary-card {
			min-height: 4.5rem;
			padding: 0.65rem;
		}

		.summary-icon {
			width: 2.15rem;
			height: 2.15rem;
			flex-basis: 2.15rem;
		}

		.summary-card span {
			font-size: 0.65rem;
		}

		.summary-card strong {
			font-size: 1.15rem;
		}

		.control-panel {
			grid-template-columns: 1fr;
		}

		.attendance-context,
		.search-field {
			grid-column: auto;
		}

		.sort-group {
			width: 100%;
		}

		.sort-group .control-field {
			flex: 1;
		}

		.modal-actions {
			flex-direction: column-reverse;
		}

		.modal-actions button,
		.modal-footer button {
			width: 100%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.class-students-page,
		.modal-backdrop,
		.modal {
			animation: none;
		}

		* {
			scroll-behavior: auto !important;
		}
	}
</style>