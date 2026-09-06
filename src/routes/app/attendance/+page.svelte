<script>
	import { getContext, onMount } from 'svelte';
	import { jsPDF } from 'jspdf';
	import html2canvas from 'html2canvas';
	import { classOptions, importedStudents } from '$lib/data/students.js';
	import { loadAttendance, recordAttendance } from '$lib/data/attendance.js';

	const appState = getContext('app-state');
	const isArabic = $derived(appState.language === 'ar');

	let selectedClass = $state(classOptions[0]);
	let selectedDate = $state(new Date().toISOString().slice(0, 10));
	let searchTerm = $state('');
	let attendanceFilter = $state('all');

	/** @type {'name' | 'class'} */
	let sortBy = $state('name');
	let sortDescending = $state(false);

	/** @type {any} */
	let attendanceData = $state({
		current: {},
		history: []
	});

	let exportOpen = $state(false);
	let exportType = $state('all');
let pdfName = $state('');
	/** @type {string | null} */
	let animatingStudentId = $state(null);

	onMount(() => {
		attendanceData = /** @type {typeof attendanceData} */ (loadAttendance());
	});

	const classStudents = $derived(
		importedStudents.filter((student) => student.className === selectedClass)
	);

	const currentRecords = $derived(
		classStudents.map((student) => ({
			student,
			record:
				attendanceData.history.find(
					(/** @type {{ id: string, studentId: string, date: string, status: 'present' | 'absent' }} */ item) =>
						item.studentId === student.id && item.date === selectedDate
				) || null
		}))
	);

	const visibleStudents = $derived(
		currentRecords
			.filter((/** @type {{ student: any, record: { id: string, studentId: string, date: string, status: 'present' | 'absent' } | null }} */ { student, record }) => {
				if (record) return false;
				const query = searchTerm.trim().toLocaleLowerCase();
				const fullName = `${student.firstName} ${student.lastName}`.toLocaleLowerCase();
				return !query || fullName.includes(query);
			})
			.sort((/** @type {{ record: { id: string, studentId: string, date: string, status: 'present' | 'absent' } | null, student: { id: string, firstName: string, lastName: string, className: string } }} */ left, /** @type {{ record: { id: string, studentId: string, date: string, status: 'present' | 'absent' } | null, student: { id: string, firstName: string, lastName: string, className: string } }} */ right) => {
				const leftValue =
					sortBy === 'class'
						? left.student.className
						: `${left.student.firstName} ${left.student.lastName}`;
				const rightValue =
					sortBy === 'class'
						? right.student.className
						: `${right.student.firstName} ${right.student.lastName}`;
				const comparison = leftValue.localeCompare(rightValue, 'ar');
				return sortDescending ? -comparison : comparison;
			})
	);

	const pendingCount = $derived(
		currentRecords.filter(({ record }) => record === null).length
	);

	const historyRows = $derived(
		attendanceData.history
			.flatMap((/** @type {{ id: string, studentId: string, date: string, status: 'present' | 'absent' }} */ record) => {
				const student = importedStudents.find(
					(item) => item.id === record.studentId
				);
				return student ? [{ record, student }] : [];
			})
			.filter((/** @type {{ record: { id: string, studentId: string, date: string, status: 'present' | 'absent' }, student: any }} */ { record, student }) => {
				const matchesClass = student.className === selectedClass;
				const query = searchTerm.trim().toLocaleLowerCase();
				const fullName = `${student.firstName} ${student.lastName}`.toLocaleLowerCase();
				const matchesSearch = !query || fullName.includes(query);
				const matchesFilter =
					attendanceFilter === 'all' ||
					(attendanceFilter === 'present' &&
						record.status === 'present') ||
					(attendanceFilter === 'absent' &&
						record.status === 'absent');
				return matchesClass && matchesSearch && matchesFilter;
			})
			.sort(
				(
					/** @type {{ record: { id: string, studentId: string, date: string, status: 'present' | 'absent' }, student: any }} */ left,
					/** @type {{ record: { id: string, studentId: string, date: string, status: 'present' | 'absent' }, student: any }} */ right
				) =>
					right.record.date.localeCompare(left.record.date)
			)
	);

	const recordedRecords = $derived(
		currentRecords.filter(({ record }) => record !== null)
	);

	const presentCount = $derived(
		recordedRecords.filter(
			({ record }) => record?.status === 'present'
		).length
	);

	const absentCount = $derived(
		recordedRecords.filter(
			({ record }) => record?.status === 'absent'
		).length
	);

	/** @param {string} studentId @param {'present' | 'absent'} status */
	function setStatus(studentId, status) {
		if (animatingStudentId) return;
		const dateAtClick = selectedDate;
		animatingStudentId = studentId;
		window.setTimeout(() => {
			attendanceData = recordAttendance(
				attendanceData,
				studentId,
				dateAtClick,
				status
			);
			animatingStudentId = null;
		}, 360);
	}

	/**
	 * @param {string} studentId
	 * @param {'present' | 'absent'} status
	 * @param {string} date
	 */
	function editStatus(studentId, status, date) {
		attendanceData = recordAttendance(
			attendanceData,
			studentId,
			date,
			status
		);
	}

	function openExport() {
		pdfName = `Attendance_${selectedClass.replaceAll(' ', '_')}_${selectedDate}`;
		exportType = 'all';
		exportOpen = true;
	}

	function closeExport() {
		exportOpen = false;
	}

	async function exportPdf() {
		const records = currentRecords
			.filter(({ record }) => record !== null)
			.filter(({ record }) => {
				if (exportType === 'present') {
					return record?.status === 'present';
				}
				if (exportType === 'absent') {
					return record?.status === 'absent';
				}
				return true;
			});

		if (!records.length) {
			window.alert(
				isArabic
					? 'لا توجد سجلات للتصدير.'
					: 'There are no attendance records to export.'
			);
			return;
		}

		const wrapper = document.createElement('div');
		wrapper.dir = isArabic ? 'rtl' : 'ltr';
		wrapper.style.cssText =
			'position:fixed;left:-10000px;top:0;width:794px;padding:42px;background:white;color:#111;font-family:Arial,sans-serif;';
		wrapper.innerHTML = `
			<h1 style="margin:0 0 8px;font-size:24px;">
				${isArabic ? 'المدرسة التونسية بالدوحة' : 'Tunisian School in Doha'}
			</h1>
			<h2 style="margin:0 0 24px;font-size:18px;font-weight:600;">
				${isArabic ? 'فرع اللقطة — إعدادي وثانوي' : 'Al-Luqta Branch — Middle & Secondary'}
			</h2>
			<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;font-size:14px;">
				<div>
					<b>${isArabic ? 'القسم' : 'Class'}:</b>
					${selectedClass}
				</div>
				<div>
					<b>${isArabic ? 'التاريخ' : 'Date'}:</b>
					${selectedDate}
				</div>
			</div>
			<table style="width:100%;border-collapse:collapse;font-size:13px;">
				<thead>
					<tr>
						<th style="border:1px solid #bbb;padding:8px;text-align:start;">
							#
						</th>
						<th style="border:1px solid #bbb;padding:8px;text-align:start;">
							${isArabic ? 'التلميذ' : 'Student'}
						</th>
						<th style="border:1px solid #bbb;padding:8px;text-align:start;">
							${isArabic ? 'الحالة' : 'Status'}
						</th>
					</tr>
				</thead>
				<tbody>
					${records
						.map(({ student, record }, index) => {
							if (!record) return '';
							return `
								<tr>
									<td style="border:1px solid #ddd;padding:7px;">
										${index + 1}
									</td>
									<td style="border:1px solid #ddd;padding:7px;">
										${student.firstName} ${student.lastName}
									</td>
									<td style="border:1px solid #ddd;padding:7px;">
										${
											record.status === 'present'
												? isArabic
													? 'حاضر'
													: 'Present'
												: isArabic
													? 'غائب'
													: 'Absent'
										}
									</td>
								</tr>
							`;
						})
						.join('')}
				</tbody>
			</table>
		`;

		document.body.appendChild(wrapper);

		try {
			const canvas = await html2canvas(wrapper, {
				scale: 2,
				backgroundColor: '#ffffff'
			});
			/** @type {any} */
			const JsPDFConstructor = jsPDF;
			const pdf = new JsPDFConstructor({
				orientation: 'portrait',
				unit: 'mm',
				format: 'a4'
			});
			const pageWidth = pdf.internal.pageSize.getWidth();
			const pageHeight = pdf.internal.pageSize.getHeight();
			const imageWidth = pageWidth - 20;
			const imageHeight =
				(canvas.height * imageWidth) / canvas.width;
			const imageData = canvas.toDataURL('image/png');
			let y = 10;
			let remainingHeight = imageHeight;
			pdf.addImage(
				imageData,
				'PNG',
				10,
				y,
				imageWidth,
				imageHeight
			);
			remainingHeight -= pageHeight - 20;
			while (remainingHeight > 0) {
				pdf.addPage();
				y = -(imageHeight - remainingHeight - 10);
				pdf.addImage(
					imageData,
					'PNG',
					10,
					y,
					imageWidth,
					imageHeight
				);
				remainingHeight -= pageHeight - 20;
			}
			const finalFileName =
				pdfName.trim() || `Attendance_${selectedDate}`;
			pdf.save(`${finalFileName}.pdf`);
			exportOpen = false;
		} finally {
			wrapper.remove();
		}
	}
</script>

<svelte:head>
	<title>
		{isArabic
			? 'الحضور | فضاء المتابعة'
			: 'Attendance | Follow-up Portal'}
	</title>
</svelte:head>

<section class="attendance-page" aria-labelledby="attendance-title">
	<header class="page-heading">
		<div>
			<p class="eyebrow">
				{isArabic ? 'المتابعة اليومية' : 'DAILY FOLLOW-UP'}
			</p>
			<h1 id="attendance-title">
				{isArabic ? 'الحضور' : 'Attendance'}
			</h1>
			<p>
				{isArabic
					? 'سجل الحضور لكل تلميذ حسب التاريخ.'
					: 'Record attendance for each student for the selected day.'}
			</p>
		</div>
	</header>

	<!-- Main attendance controls -->
	<section class="control-card">
		<div class="control-card-heading">
			<div class="control-heading-icon">
				<span>✓</span>
			</div>
			<div>
				<h2>{isArabic ? 'تسجيل الحضور اليومي' : 'Daily Attendance'}</h2>
				<p>
					{isArabic
						? 'اختر القسم والتاريخ لبدء التسجيل.'
						: 'Choose a class and date to begin recording.'}
				</p>
			</div>
		</div>
		<div class="control-fields">
			<label>
				<span>{isArabic ? 'القسم' : 'Class'}</span>
				<select bind:value={selectedClass}>
					{#each classOptions as className}
						<option value={className}>{className}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>{isArabic ? 'التاريخ' : 'Date'}</span>
				<input type="date" bind:value={selectedDate} />
			</label>
			<button class="export-button" type="button" onclick={openExport}>
				<span>↓</span>
				{isArabic ? 'تصدير PDF' : 'Export PDF'}
			</button>
		</div>
	</section>

	<section class="summary-grid" aria-label={isArabic ? 'ملخص الحضور' : 'Attendance summary'}>
		<div class="summary-card">
			<div class="summary-icon total">
				<span>👥</span>
			</div>
			<div>
				<span>{isArabic ? 'إجمالي التلاميذ' : 'Total Students'}</span>
				<strong>{classStudents.length}</strong>
			</div>
		</div>
		<div class="summary-card present-card">
			<div class="summary-icon present">
				<span>✓</span>
			</div>
			<div>
				<span>{isArabic ? 'حاضر' : 'Present'}</span>
				<strong>{presentCount}</strong>
			</div>
		</div>
		<div class="summary-card absent-card">
			<div class="summary-icon absent">
				<span>×</span>
			</div>
			<div>
				<span>{isArabic ? 'غائب' : 'Absent'}</span>
				<strong>{absentCount}</strong>
			</div>
		</div>
		<div class="summary-card pending-card">
			<div class="summary-icon pending">
				<span>•</span>
			</div>
			<div>
				<span>{isArabic ? 'متبقٍ' : 'Remaining'}</span>
				<strong>{pendingCount}</strong>
			</div>
		</div>
	</section>

	<!-- Search and filtering -->
	<section class="tools-card">
		<div class="tools-heading">
			<div>
				<p class="eyebrow">
					{isArabic ? 'بحث وتصفية' : 'SEARCH & FILTER'}
				</p>
				<h2>{isArabic ? 'تصفية السجل' : 'Filter Records'}</h2>
			</div>
		</div>
		<div class="tools-fields">
			<label class="search-field" for="attendance-search">
				<span class="search-icon">⌕</span>
				<input
					id="attendance-search"
					type="search"
					bind:value={searchTerm}
					placeholder={isArabic ? 'البحث عن تلميذ...' : 'Search for a student...'}
				/>
			</label>
			<label>
				<span>{isArabic ? 'تصفية' : 'Filter'}</span>
				<select bind:value={attendanceFilter}>
					<option value="all">{isArabic ? 'الكل' : 'All'}</option>
					<option value="present">{isArabic ? 'الحاضرون فقط' : 'Present only'}</option>
					<option value="absent">{isArabic ? 'الغائبون فقط' : 'Absent only'}</option>
				</select>
			</label>
			<label>
				<span>{isArabic ? 'ترتيب' : 'Sort'}</span>
				<select bind:value={sortBy}>
					<option value="name">{isArabic ? 'الاسم' : 'Name'}</option>
					<option value="class">{isArabic ? 'القسم' : 'Class'}</option>
				</select>
			</label>
			<button
				class="sort-button"
				type="button"
				onclick={() => (sortDescending = !sortDescending)}
				aria-label={isArabic ? 'تغيير اتجاه الترتيب' : 'Toggle sort direction'}
			>
				{sortDescending ? '↓' : '↑'}
			</button>
		</div>
	</section>

	<!-- Attendance queue -->
	<section class="attendance-section">
		<div class="section-heading">
			<div>
				<p class="eyebrow">
					{isArabic ? 'قائمة الانتظار' : 'ATTENDANCE QUEUE'}
				</p>
				<h2>
					{isArabic
						? 'التلاميذ الذين لم يُسجّل حضورهم بعد'
						: 'Students waiting for attendance'}
				</h2>
				<p>
					{isArabic
						? `القسم ${selectedClass} · ${selectedDate}`
						: `${selectedClass} · ${selectedDate}`}
				</p>
			</div>
			{#if pendingCount > 0}
				<div class="queue-badge">
					<strong>{pendingCount}</strong>
					<span>{isArabic ? 'متبقٍ' : 'remaining'}</span>
				</div>
			{/if}
		</div>
		<div class="attendance-list">
			{#each visibleStudents as item, index (item.student.id)}
				<article class:leaving={animatingStudentId === item.student.id} class="attendance-row">
					<div class="student-number">
						{index + 1}
					</div>
					<div class="student-avatar">
						{item.student.firstName.charAt(0).toUpperCase()}
					</div>
					<div class="student-info">
						<strong>
							{item.student.firstName}
							{item.student.lastName}
						</strong>
						<small>
							{item.student.className}
						</small>
					</div>
					<div
						class="status-controls"
						role="group"
						aria-label={isArabic
							? `حالة ${item.student.firstName} ${item.student.lastName}`
							: `${item.student.firstName} ${item.student.lastName} status`}
					>
						<button
							class="present"
							type="button"
							disabled={animatingStudentId !== null}
							onclick={() => setStatus(item.student.id, 'present')}
						>
							<span>✓</span>
							{isArabic ? 'حاضر' : 'Present'}
						</button>
						<button
							class="absent"
							type="button"
							disabled={animatingStudentId !== null}
							onclick={() => setStatus(item.student.id, 'absent')}
						>
							<span>×</span>
							{isArabic ? 'غائب' : 'Absent'}
						</button>
					</div>
				</article>
			{/each}
		</div>
		{#if pendingCount === 0}
			<div class="complete-state">
				<div class="complete-icon">✓</div>
				<strong>
					{isArabic ? 'تم تسجيل حضور جميع التلاميذ' : 'Attendance is complete'}
				</strong>
				<span>
					{isArabic
						? 'يمكنك مراجعة السجل أدناه وتعديل أي حالة إذا لزم الأمر.'
						: 'Review the attendance record below and correct any status if needed.'}
				</span>
			</div>
		{:else if !visibleStudents.length}
			<div class="empty-state">
				<div class="empty-icon">⌕</div>
				<strong>
					{isArabic ? 'لم يتم العثور على أي تلميذ' : 'No students found'}
				</strong>
				<span>
					{isArabic ? 'جرّب تغيير كلمة البحث.' : 'Try changing your search term.'}
				</span>
			</div>
		{/if}
	</section>

	<!-- Recorded history -->
	<section class="history-section">
		<div class="section-heading">
			<div>
				<p class="eyebrow">
					{isArabic ? 'السجل' : 'RECORDED ATTENDANCE'}
				</p>
				<h2>
					{isArabic ? 'سجل الحضور' : 'Attendance Record'}
				</h2>
				<p>
					{isArabic
						? 'يمكن تعديل حالة أي تلميذ بعد التسجيل.'
						: 'You can change any recorded status if needed.'}
				</p>
			</div>
			<div class="history-count">
				{historyRows.length}
			</div>
		</div>
		<div class="history-table-wrap">
			<table>
				<thead>
					<tr>
						<th>{isArabic ? 'التاريخ' : 'Date'}</th>
						<th>{isArabic ? 'التلميذ' : 'Student'}</th>
						<th>{isArabic ? 'الحالة' : 'Status'}</th>
						<th>{isArabic ? 'تعديل' : 'Edit'}</th>
					</tr>
				</thead>
				<tbody>
					{#each historyRows as { record, student } (record.id)}
						<tr>
							<td data-label={isArabic ? 'التاريخ' : 'Date'}>
								{record.date}
							</td>
							<td class="history-student" data-label={isArabic ? 'التلميذ' : 'Student'}>
								<div class="history-avatar">
									{student.firstName.charAt(0).toUpperCase()}
								</div>
								<strong>
									{student.firstName}
									{student.lastName}
								</strong>
							</td>
							<td data-label={isArabic ? 'الحالة' : 'Status'}>
								<span
									class="status-pill"
									class:history-present={record.status === 'present'}
									class:history-absent={record.status === 'absent'}
								>
									<span>
										{record.status === 'present' ? '✓' : '×'}
									</span>
									{record.status === 'present'
										? isArabic
											? 'حاضر'
											: 'Present'
										: isArabic
											? 'غائب'
											: 'Absent'}
								</span>
							</td>
							<td data-label={isArabic ? 'تعديل' : 'Edit'}>
								<div class="history-actions">
									<button
										class:active={record.status === 'present'}
										class="edit-present"
										type="button"
										onclick={() => editStatus(record.studentId, 'present', record.date)}
									>
										{isArabic ? 'حاضر' : 'Present'}
									</button>
									<button
										class:active={record.status === 'absent'}
										class="edit-absent"
										type="button"
										onclick={() => editStatus(record.studentId, 'absent', record.date)}
									>
										{isArabic ? 'غائب' : 'Absent'}
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if !historyRows.length}
			<div class="empty-state history-empty">
				<div class="empty-icon">≡</div>
				<strong>
					{isArabic ? 'لا توجد سجلات مطابقة' : 'No matching attendance records'}
				</strong>
				<span>
					{isArabic
						? 'ستظهر السجلات هنا بعد تسجيل الحضور.'
						: 'Records will appear here after attendance is recorded.'}
				</span>
			</div>
		{/if}
	</section>
</section>

{#if exportOpen}
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={(event) => event.target === event.currentTarget && closeExport()}
	>
		<dialog open class="export-modal" aria-labelledby="export-title">
			<button class="modal-close" type="button" onclick={closeExport} aria-label={isArabic ? 'إغلاق' : 'Close'}>
				×
			</button>
			<div class="export-icon">
				<span>↓</span>
			</div>
			<p class="eyebrow">
				{isArabic ? 'تصدير' : 'EXPORT'}
			</p>
			<h2 id="export-title">
				{isArabic ? 'تصدير الحضور إلى PDF' : 'Export Attendance to PDF'}
			</h2>
			<p class="modal-description">
				{isArabic
					? 'اختر نوع السجلات واسم الملف قبل إنشاء التقرير.'
					: 'Choose the records and file name before creating the report.'}
			</p>
			<div class="export-details">
				<div>
					<span>{isArabic ? 'القسم' : 'Class'}</span>
					<strong>{selectedClass}</strong>
				</div>
				<div>
					<span>{isArabic ? 'التاريخ' : 'Date'}</span>
					<strong>{selectedDate}</strong>
				</div>
			</div>
			<label class="modal-field">
				<span>{isArabic ? 'نوع التصدير' : 'Export type'}</span>
				<select bind:value={exportType}>
					<option value="all">{isArabic ? 'كل السجلات' : 'All records'}</option>
					<option value="present">{isArabic ? 'الحاضرون فقط' : 'Present only'}</option>
					<option value="absent">{isArabic ? 'الغائبون فقط' : 'Absent only'}</option>
				</select>
			</label>
			<label class="modal-field">
				<span>{isArabic ? 'اسم ملف PDF' : 'PDF file name'}</span>
				<input bind:value={pdfName} />
			</label>
			<div class="modal-actions">
				<button class="secondary-button" type="button" onclick={closeExport}>
					{isArabic ? 'إلغاء' : 'Cancel'}
				</button>
				<button class="primary-button" type="button" onclick={exportPdf}>
					<span>↓</span>
					{isArabic ? 'تصدير PDF' : 'Export PDF'}
				</button>
			</div>
		</dialog>
	</div>
{/if}

<style>
	.attendance-page {
		max-width: 1500px;
		margin: 0 auto;
		padding: 0.25rem 0 2rem;
		animation: page-enter 350ms ease both;
	}
	.page-heading {
		margin-bottom: 1.15rem;
	}
	.eyebrow {
		margin: 0 0 0.35rem;
		color: var(--app-accent);
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}
	h1,
	h2,
	p {
		margin-top: 0;
	}
	h1 {
		margin-bottom: 0.35rem;
		color: var(--app-text);
		font-size: clamp(1.7rem, 4vw, 2.25rem);
		line-height: 1.15;
	}
	.page-heading p:last-child {
		margin: 0;
		color: var(--app-muted);
		font-size: 0.86rem;
		line-height: 1.6;
	}
	.control-card,
	.tools-card {
		margin-bottom: 0.8rem;
		padding: 0.85rem;
		border: 1px solid var(--app-border);
		border-radius: 0.8rem;
		background: var(--app-surface);
		box-shadow: 0 2px 10px rgba(67, 42, 42, 0.035);
	}
	.control-card-heading {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		margin-bottom: 0.8rem;
	}
	.control-heading-icon {
		display: grid;
		width: 2.35rem;
		height: 2.35rem;
		flex: 0 0 2.35rem;
		place-items: center;
		border-radius: 0.6rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
		font-size: 1rem;
		font-weight: 800;
	}
	.control-card-heading h2,
	.tools-heading h2 {
		margin-bottom: 0.1rem;
		font-size: 0.9rem;
	}
	.control-card-heading p {
		margin: 0;
		color: var(--app-muted);
		font-size: 0.68rem;
	}
	.control-fields {
		display: grid;
		grid-template-columns: 1.1fr 1fr auto;
		align-items: end;
		gap: 0.55rem;
	}
	label {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 0.25rem;
		color: var(--app-muted);
		font-size: 0.68rem;
		font-weight: 650;
	}
	select,
	input {
		width: 100%;
		min-height: 2.55rem;
		box-sizing: border-box;
		padding: 0.45rem 0.6rem;
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
	select:focus,
	input:focus {
		border-color: color-mix(in srgb, var(--app-accent) 60%, var(--app-border));
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent) 9%, transparent);
	}
	.export-button,
	.primary-button {
		display: inline-flex;
		min-height: 2.55rem;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.5rem 0.85rem;
		border: 0;
		border-radius: 0.5rem;
		background: var(--app-accent);
		color: #fff;
		cursor: pointer;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 750;
		white-space: nowrap;
		transition:
			background 150ms ease,
			transform 150ms ease,
			box-shadow 150ms ease;
	}
	.export-button:hover,
	.primary-button:hover {
		background: var(--app-accent-dark);
		transform: translateY(-1px);
		box-shadow: 0 6px 16px color-mix(in srgb, var(--app-accent) 20%, transparent);
	}
	.export-button span,
	.primary-button span {
		font-size: 1rem;
		line-height: 0.7;
	}
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.65rem;
		margin-bottom: 0.8rem;
	}
	.summary-card {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		min-height: 4.6rem;
		padding: 0.75rem;
		border: 1px solid var(--app-border);
		border-radius: 0.7rem;
		background: var(--app-surface);
		box-shadow: 0 2px 8px rgba(67, 42, 42, 0.03);
	}
	.summary-icon {
		display: grid;
		width: 2.4rem;
		height: 2.4rem;
		flex: 0 0 2.4rem;
		place-items: center;
		border-radius: 0.6rem;
		font-size: 1rem;
		font-weight: 800;
	}
	.summary-icon.total {
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}
	.summary-icon.present {
		background: #eaf5ee;
		color: #28734a;
	}
	.summary-icon.absent {
		background: #fff0f0;
		color: #b63b3b;
		font-size: 1.2rem;
	}
	.summary-icon.pending {
		background: #f8f1e8;
		color: #987044;
		font-size: 1.25rem;
	}
	.summary-card > div:last-child span {
		display: block;
		margin-bottom: 0.2rem;
		color: var(--app-muted);
		font-size: 0.68rem;
	}
	.summary-card strong {
		display: block;
		color: var(--app-text);
		font-size: 1.3rem;
		line-height: 1;
	}
	.tools-card {
		display: flex;
		align-items: end;
		gap: 1rem;
	}
	.tools-heading {
		min-width: 8rem;
		align-self: center;
	}
	.tools-heading h2 {
		margin-bottom: 0;
	}
	.tools-fields {
		display: flex;
		flex: 1;
		align-items: end;
		gap: 0.55rem;
	}
	.tools-fields > label:not(.search-field) {
		min-width: 7.5rem;
	}
	.search-field {
		display: flex;
		min-width: 14rem;
		flex: 1;
		align-items: center;
		gap: 0.45rem;
		min-height: 2.55rem;
		box-sizing: border-box;
		padding: 0 0.65rem;
		border: 1px solid var(--app-border);
		border-radius: 0.5rem;
		background: var(--app-surface-strong);
		color: var(--app-accent);
		transition:
			border-color 150ms ease,
			box-shadow 150ms ease;
	}
	.search-field:focus-within {
		border-color: color-mix(in srgb, var(--app-accent) 60%, var(--app-border));
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent) 9%, transparent);
	}
	.search-field input {
		min-height: auto;
		padding: 0;
		border: 0;
		outline: 0;
		background: transparent;
		box-shadow: none;
	}
	.search-icon {
		font-size: 1.15rem;
		line-height: 1;
	}
	.sort-button {
		display: grid;
		width: 2.55rem;
		height: 2.55rem;
		flex: 0 0 2.55rem;
		place-items: center;
		border: 1px solid var(--app-border);
		border-radius: 0.5rem;
		background: var(--app-surface-strong);
		color: var(--app-accent);
		cursor: pointer;
		font-size: 1rem;
		transition:
			background 150ms ease,
			border-color 150ms ease;
	}
	.sort-button:hover {
		border-color: var(--app-accent);
		background: var(--app-accent-soft);
	}
	.attendance-section,
	.history-section {
		margin-top: 1.15rem;
	}
	.section-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.65rem;
	}
	.section-heading h2 {
		margin-bottom: 0.2rem;
		color: var(--app-text);
		font-size: 1rem;
	}
	.section-heading > div:first-child > p:last-child {
		margin: 0;
		color: var(--app-muted);
		font-size: 0.68rem;
	}
	.queue-badge,
	.history-count {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 2.1rem;
		padding: 0 0.7rem;
		border-radius: 999px;
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}
	.queue-badge strong,
	.history-count {
		font-size: 0.78rem;
		font-weight: 800;
	}
	.queue-badge span {
		font-size: 0.64rem;
		font-weight: 650;
	}
	.attendance-list {
		overflow: hidden;
		border: 1px solid var(--app-border);
		border-radius: 0.8rem;
		background: var(--app-surface);
		box-shadow: 0 3px 12px rgba(67, 42, 42, 0.04);
	}
	.attendance-row {
		display: flex;
		min-height: 4.3rem;
		align-items: center;
		gap: 0.7rem;
		padding: 0.7rem 0.85rem;
		border-bottom: 1px solid var(--app-border);
		transition:
			transform 360ms ease,
			opacity 360ms ease,
			max-height 360ms ease,
			padding 360ms ease;
		max-height: 7rem;
		overflow: hidden;
	}
	.attendance-row:last-child {
		border-bottom: 0;
	}
	.attendance-row:hover {
		background: color-mix(in srgb, var(--app-accent-soft) 25%, var(--app-surface));
	}
	.attendance-row.leaving {
		opacity: 0;
		transform: translateY(2rem) scale(0.97);
		max-height: 0;
		padding-top: 0;
		padding-bottom: 0;
		border-bottom-color: transparent;
	}
	.student-number {
		display: grid;
		width: 1.65rem;
		height: 1.65rem;
		flex: 0 0 1.65rem;
		place-items: center;
		border-radius: 0.4rem;
		background: var(--app-surface-soft);
		color: var(--app-muted);
		font-size: 0.65rem;
		font-weight: 750;
	}
	.student-avatar {
		display: grid;
		width: 2.3rem;
		height: 2.3rem;
		flex: 0 0 2.3rem;
		place-items: center;
		border-radius: 0.6rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
		font-size: 0.78rem;
		font-weight: 800;
	}
	.student-info {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		gap: 0.2rem;
	}
	.student-info strong {
		overflow: hidden;
		color: var(--app-text);
		font-size: 0.78rem;
		font-weight: 700;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.student-info small {
		color: var(--app-muted);
		font-size: 0.64rem;
	}
	.status-controls {
		display: flex;
		gap: 0.3rem;
	}
	.status-controls button {
		display: inline-flex;
		min-width: 5.5rem;
		min-height: 2.35rem;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.35rem 0.7rem;
		border: 1px solid var(--app-border);
		border-radius: 0.5rem;
		background: var(--app-surface-strong);
		color: var(--app-muted);
		cursor: pointer;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		transition:
			background 150ms ease,
			border-color 150ms ease,
			color 150ms ease,
			transform 150ms ease;
	}
	.status-controls button span {
		font-size: 0.85rem;
		font-weight: 900;
	}
	.status-controls button:hover:not(:disabled) {
		transform: translateY(-1px);
	}
	.status-controls button.present:hover:not(:disabled) {
		border-color: #76a98c;
		background: #edf8f1;
		color: #28734a;
	}
	.status-controls button.absent:hover:not(:disabled) {
		border-color: #df9b9b;
		background: #fff1f1;
		color: #b63b3b;
	}
	.status-controls button:disabled {
		cursor: wait;
		opacity: 0.55;
	}
	.complete-state {
		display: grid;
		justify-items: center;
		gap: 0.3rem;
		padding: 2.1rem 1rem;
		border: 1px solid var(--app-border);
		border-radius: 0.8rem;
		background: var(--app-surface);
		box-shadow: 0 3px 12px rgba(67, 42, 42, 0.035);
		text-align: center;
	}
	.complete-icon {
		display: grid;
		width: 3rem;
		height: 3rem;
		margin-bottom: 0.25rem;
		place-items: center;
		border-radius: 50%;
		background: #eaf5ee;
		color: #28734a;
		font-size: 1.4rem;
		font-weight: 900;
	}
	.complete-state strong {
		font-size: 0.88rem;
	}
	.complete-state span {
		max-width: 36rem;
		color: var(--app-muted);
		font-size: 0.7rem;
		line-height: 1.6;
	}
	.empty-state {
		display: grid;
		justify-items: center;
		gap: 0.3rem;
		padding: 2rem 1rem;
		border: 1px dashed var(--app-border);
		border-radius: 0.8rem;
		background: var(--app-surface);
		color: var(--app-muted);
		text-align: center;
	}
	.empty-icon {
		display: grid;
		width: 2.8rem;
		height: 2.8rem;
		margin-bottom: 0.25rem;
		place-items: center;
		border-radius: 0.7rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
		font-size: 1.25rem;
	}
	.empty-state strong {
		color: var(--app-text);
		font-size: 0.8rem;
	}
	.empty-state span {
		font-size: 0.68rem;
	}
	.history-table-wrap {
		overflow-x: auto;
		border: 1px solid var(--app-border);
		border-radius: 0.8rem;
		background: var(--app-surface);
		box-shadow: 0 3px 12px rgba(67, 42, 42, 0.04);
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		padding: 0.65rem 0.75rem;
		border-bottom: 1px solid var(--app-border);
		text-align: start;
		white-space: nowrap;
	}
	th {
		background: var(--app-surface-soft);
		color: var(--app-muted);
		font-size: 0.65rem;
		font-weight: 750;
	}
	td {
		color: var(--app-text);
		font-size: 0.72rem;
	}
	tbody tr {
		transition: background 140ms ease;
	}
	tbody tr:hover {
		background: color-mix(in srgb, var(--app-accent-soft) 24%, var(--app-surface));
	}
	tbody tr:last-child td {
		border-bottom: 0;
	}
	.history-student {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.history-avatar {
		display: grid;
		width: 1.85rem;
		height: 1.85rem;
		flex: 0 0 1.85rem;
		place-items: center;
		border-radius: 0.45rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
		font-size: 0.65rem;
		font-weight: 800;
	}
	.history-student strong {
		font-size: 0.72rem;
	}
	.status-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.45rem;
		border-radius: 0.35rem;
		font-size: 0.65rem;
		font-weight: 750;
	}
	.status-pill.history-present {
		background: #eaf5ee;
		color: #28734a;
	}
	.status-pill.history-absent {
		background: #fff0f0;
		color: #b63b3b;
	}
	.history-actions {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}
	.history-actions button {
		min-height: 1.85rem;
		padding: 0.25rem 0.45rem;
		border: 1px solid var(--app-border);
		border-radius: 0.35rem;
		background: var(--app-surface-strong);
		color: var(--app-muted);
		cursor: pointer;
		font: inherit;
		font-size: 0.63rem;
		font-weight: 650;
		transition:
			background 140ms ease,
			border-color 140ms ease,
			color 140ms ease;
	}
	.history-actions button:hover {
		border-color: var(--app-accent);
	}
	.history-actions .edit-present.active {
		border-color: #83b998;
		background: #eaf5ee;
		color: #28734a;
		font-weight: 800;
	}
	.history-actions .edit-absent.active {
		border-color: #df9b9b;
		background: #fff0f0;
		color: #b63b3b;
		font-weight: 800;
	}
	.history-empty {
		margin-top: 0.6rem;
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
	.export-modal {
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
	.export-icon {
		display: grid;
		width: 2.8rem;
		height: 2.8rem;
		margin-bottom: 0.75rem;
		place-items: center;
		border-radius: 0.7rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
		font-size: 1.2rem;
		font-weight: 800;
	}
	.export-modal h2 {
		margin-bottom: 0.35rem;
		font-size: 1.15rem;
	}
	.modal-description {
		margin-bottom: 1rem;
		color: var(--app-muted);
		font-size: 0.72rem;
		line-height: 1.55;
	}
	.export-details {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.4rem;
		margin-bottom: 0.9rem;
	}
	.export-details div {
		display: grid;
		gap: 0.18rem;
		padding: 0.6rem;
		border: 1px solid var(--app-border);
		border-radius: 0.5rem;
		background: var(--app-surface-soft);
	}
	.export-details span {
		color: var(--app-muted);
		font-size: 0.6rem;
	}
	.export-details strong {
		font-size: 0.7rem;
	}
	.modal-field {
		width: 100%;
		margin-top: 0.7rem;
	}
	.modal-field select,
	.modal-field input {
		margin-top: 0.05rem;
	}
	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.45rem;
		margin-top: 1rem;
	}
	.secondary-button {
		min-height: 2.55rem;
		padding: 0.55rem 0.85rem;
		border: 1px solid var(--app-border);
		border-radius: 0.5rem;
		background: var(--app-surface-strong);
		color: var(--app-text);
		cursor: pointer;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 700;
	}
	.secondary-button:hover {
		border-color: var(--app-accent);
		color: var(--app-accent);
	}
	@keyframes page-enter {
		from {
			opacity: 0;
			transform: translateY(0.4rem);
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
			transform: translateY(0.5rem) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	@media (max-width: 1050px) {
		.control-fields {
			grid-template-columns: repeat(2, 1fr);
		}
		.export-button {
			width: 100%;
		}
		.tools-card {
			display: block;
		}
		.tools-heading {
			margin-bottom: 0.7rem;
		}
	}
	@media (max-width: 760px) {
		.summary-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.tools-fields {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
		.search-field {
			grid-column: 1 / -1;
			min-width: 0;
		}
		.sort-button {
			width: 100%;
		}
		.attendance-row {
			padding: 0.75rem;
		}
		.student-number {
			display: none;
		}
		.status-controls button {
			min-width: 5rem;
		}
		.history-table-wrap {
			overflow: visible;
			border: 0;
			background: transparent;
			box-shadow: none;
		}
		.history-table-wrap table,
		.history-table-wrap tbody {
			display: block;
		}
		.history-table-wrap thead {
			display: none;
		}
		.history-table-wrap tbody {
			display: grid;
			gap: 0.5rem;
		}
		.history-table-wrap tr {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.55rem;
			padding: 0.75rem;
			border: 1px solid var(--app-border);
			border-radius: 0.7rem;
			background: var(--app-surface);
			box-shadow: 0 2px 8px rgba(67, 42, 42, 0.035);
		}
		.history-table-wrap td {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 0.5rem;
			padding: 0;
			border: 0;
			white-space: normal;
		}
		.history-table-wrap td::before {
			content: attr(data-label);
			color: var(--app-muted);
			font-size: 0.62rem;
			font-weight: 650;
		}
		.history-table-wrap td:nth-child(3),
		.history-table-wrap td:nth-child(6) {
			grid-column: 1 / -1;
		}
		.history-student {
			justify-content: flex-start !important;
		}
		.history-student::before {
			margin-inline-end: auto;
		}
		.history-actions {
			justify-content: flex-end;
		}
		.export-details {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 520px) {
		.control-fields {
			grid-template-columns: 1fr;
		}
		.summary-grid {
			gap: 0.45rem;
		}
		.summary-card {
			min-height: 4.25rem;
			padding: 0.6rem;
		}
		.summary-icon {
			width: 2.15rem;
			height: 2.15rem;
			flex-basis: 2.15rem;
		}
		.summary-card > div:last-child span {
			font-size: 0.62rem;
		}
		.summary-card strong {
			font-size: 1.15rem;
		}
		.tools-fields {
			grid-template-columns: 1fr;
		}
		.search-field {
			grid-column: auto;
		}
		.attendance-row {
			align-items: stretch;
			flex-wrap: wrap;
		}
		.student-avatar {
			width: 2.15rem;
			height: 2.15rem;
			flex-basis: 2.15rem;
		}
		.student-info {
			flex: 1;
		}
		.status-controls {
			width: 100%;
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
		.status-controls button {
			width: 100%;
		}
		.section-heading {
			align-items: flex-start;
		}
		.queue-badge {
			flex-shrink: 0;
		}
		.modal-actions {
			flex-direction: column-reverse;
		}
		.modal-actions button {
			width: 100%;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.attendance-page,
		.modal-backdrop,
		.export-modal {
			animation: none;
		}
		.attendance-row {
			transition: none;
		}
		.attendance-row.leaving {
			transform: none;
		}
	}
</style>