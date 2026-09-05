<script>
	import { getContext, onMount } from 'svelte';
    import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
	import { classOptions, importedStudents } from '$lib/data/students.js';
	import { loadAttendance, recordAttendance } from '$lib/data/attendance.js';

	const appState = getContext('app-state');
	const isArabic = $derived(appState.language === 'ar');

	let selectedClass = $state(classOptions[0]);
	let selectedSession = $state(1);
	let selectedDate = $state(new Date().toISOString().slice(0, 10));
	let searchTerm = $state('');
	let attendanceFilter = $state('all');

	/** @type {'name' | 'class'} */
	let sortBy = $state('name');

	let sortDescending = $state(false);

	/** @type {{ current: Record<string, 'present' | 'absent'>, history: Array<{ id: string, studentId: string, date: string, session: number, status: 'present' | 'absent', recordedAt: string }> }} */
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
		attendanceData = loadAttendance();
	});

	const classStudents = $derived(
		importedStudents.filter((student) => student.className === selectedClass)
	);

	const currentRecords = $derived(
		classStudents.map((student) => ({
			student,
			record:
				attendanceData.history.find(
					(item) =>
						item.studentId === student.id &&
						item.date === selectedDate &&
						item.session === Number(selectedSession)
				) || null
		}))
	);

	const visibleStudents = $derived(
		currentRecords
			.filter(({ student, record }) => {
				if (record) return false;

				const query = searchTerm.trim().toLocaleLowerCase();
				const fullName =
					`${student.firstName} ${student.lastName}`.toLocaleLowerCase();

				return !query || fullName.includes(query);
			})
			.sort((left, right) => {
				const leftValue =
					sortBy === 'class'
						? left.student.className
						: `${left.student.firstName} ${left.student.lastName}`;

				const rightValue =
					sortBy === 'class'
						? right.student.className
						: `${right.student.firstName} ${right.student.lastName}`;

				const comparison = leftValue.localeCompare(
					rightValue,
					'ar'
				);

				return sortDescending ? -comparison : comparison;
			})
	);

	const pendingCount = $derived(
		currentRecords.filter(({ record }) => record === null).length
	);

	const historyRows = $derived(
    attendanceData.history
        .flatMap((record) => {
            const student = importedStudents.find(
                (item) => item.id === record.studentId
            );

            return student ? [{ record, student }] : [];
        })
        .filter(({ record, student }) => {
            // Only show attendance records for the currently selected class.
            const matchesClass = student.className === selectedClass;

            const query = searchTerm.trim().toLocaleLowerCase();
            const fullName =
                `${student.firstName} ${student.lastName}`.toLocaleLowerCase();

            const matchesSearch =
                !query || fullName.includes(query);

            const matchesFilter =
                attendanceFilter === 'all' ||
                (attendanceFilter === 'present' &&
                    record.status === 'present') ||
                (attendanceFilter === 'absent' &&
                    record.status === 'absent');

            return matchesClass && matchesSearch && matchesFilter;
        })
        .sort(
            (left, right) =>
                new Date(right.record.recordedAt).getTime() -
                new Date(left.record.recordedAt).getTime()
        )
);

	const sessionRecords = $derived(
		currentRecords.filter(({ record }) => record !== null)
	);

	const presentCount = $derived(
		sessionRecords.filter(
			({ record }) => record?.status === 'present'
		).length
	);

	const absentCount = $derived(
		sessionRecords.filter(
			({ record }) => record?.status === 'absent'
		).length
	);

	/** @param {string} studentId @param {'present' | 'absent'} status */
	function setStatus(studentId, status) {
		if (animatingStudentId) return;

		const dateAtClick = selectedDate;
		const sessionAtClick = Number(selectedSession);

		animatingStudentId = studentId;

		window.setTimeout(() => {
			attendanceData = recordAttendance(
				attendanceData,
				studentId,
				dateAtClick,
				sessionAtClick,
				status
			);

			animatingStudentId = null;
		}, 360);
	}

	/**
	 * @param {string} studentId
	 * @param {'present' | 'absent'} status
	 * @param {string} date
	 * @param {number} session
	 */
	function editStatus(studentId, status, date, session) {
		attendanceData = recordAttendance(
			attendanceData,
			studentId,
			date,
			session,
			status
		);
	}

	function openExport() {
		pdfName = `Attendance_${selectedClass.replaceAll(' ', '_')}_Session_${selectedSession}_${selectedDate}`;
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

				<div>
					<b>${isArabic ? 'الحصة' : 'Session'}:</b>
					${selectedSession}
				</div>

				<div>
					<b>${isArabic ? 'وقت التصدير' : 'Export time'}:</b>
					${new Date().toLocaleString()}
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

						<th style="border:1px solid #bbb;padding:8px;text-align:start;">
							${isArabic ? 'وقت التسجيل' : 'Recorded at'}
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

									<td style="border:1px solid #ddd;padding:7px;">
										${new Date(record.recordedAt).toLocaleString()}
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

	/** @param {string} value */
	function formatRecordedAt(value) {
		return new Date(value).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: true
		});
	}
</script>

<svelte:head>
	<title>
		{isArabic
			? 'الحضور | فضاء المتابعة'
			: 'Attendance | Follow-up Portal'}
	</title>
</svelte:head>

<section
	class="attendance-page"
	aria-labelledby="attendance-title"
>
	<header class="page-heading">
		<div>
			<p class="eyebrow">
				{isArabic ? 'المتابعة اليومية' : 'Daily follow-up'}
			</p>

			<h1 id="attendance-title">
				{isArabic ? 'الحضور' : 'Attendance'}
			</h1>

			<p>
				{isArabic
					? 'سجل الحضور لكل تلميذ حسب التاريخ والحصة.'
					: 'Record attendance for each student by date and session.'}
			</p>
		</div>
	</header>

	<section class="attendance-toolbar">
		<label>
			{isArabic ? 'القسم' : 'Class'}

			<select bind:value={selectedClass}>
				{#each classOptions as className}
					<option value={className}>
						{className}
					</option>
				{/each}
			</select>
		</label>

		<label>
			{isArabic ? 'الحصة' : 'Session'}

			<select bind:value={selectedSession}>
				{#each [1, 2, 3, 4, 5, 6, 7] as session}
					<option value={session}>
						{isArabic
							? `الحصة ${session}`
							: `Session ${session}`}
					</option>
				{/each}
			</select>
		</label>

		<label>
			{isArabic ? 'التاريخ' : 'Date'}

			<input
				type="date"
				bind:value={selectedDate}
			/>
		</label>

		<button
			class="export-button"
			type="button"
			onclick={openExport}
		>
			{isArabic ? 'تصدير PDF' : 'Export PDF'}
		</button>
	</section>

	<section class="tools-row">
		<label
			class="search-field"
			for="attendance-search"
		>
			<span>{isArabic ? 'بحث' : 'Search'}</span>

			<input
				id="attendance-search"
				type="search"
				bind:value={searchTerm}
				placeholder={
					isArabic
						? 'البحث عن تلميذ...'
						: 'Search for a student...'
				}
			/>
		</label>

		<label>
			{isArabic ? 'تصفية' : 'Filter'}

			<select bind:value={attendanceFilter}>
				<option value="all">
					{isArabic ? 'الكل' : 'All'}
				</option>

				<option value="present">
					{isArabic ? 'الحاضرون فقط' : 'Present only'}
				</option>

				<option value="absent">
					{isArabic ? 'الغائبون فقط' : 'Absent only'}
				</option>
			</select>
		</label>

		<label>
			{isArabic ? 'ترتيب' : 'Sort'}

			<select bind:value={sortBy}>
				<option value="name">
					{isArabic ? 'الاسم' : 'Name'}
				</option>

				<option value="class">
					{isArabic ? 'القسم' : 'Class'}
				</option>
			</select>
		</label>

		<button
			class="sort-button"
			type="button"
			onclick={() =>
				(sortDescending = !sortDescending)}
			aria-label={
				isArabic
					? 'تغيير اتجاه الترتيب'
					: 'Toggle sort direction'
			}
		>
			{sortDescending ? '↓' : '↑'}
		</button>
	</section>

	<div class="summary">
		<span>
			{isArabic
				? `الحصة ${selectedSession}`
				: `Session ${selectedSession}`}
		</span>

		<span>
			{presentCount}
			{isArabic ? ' حاضر' : ' present'}
		</span>

		<span>
			{absentCount}
			{isArabic ? ' غائب' : ' absent'}
		</span>

		<span>
			{pendingCount}
			{isArabic ? ' متبقٍ' : ' remaining'}
		</span>
	</div>

	<section class="pending-section">
		<div class="section-heading">
			<div>
				<p class="eyebrow">
					{isArabic ? 'قائمة الانتظار' : 'Attendance queue'}
				</p>

				<h2>
					{isArabic
						? 'التلاميذ الذين لم يُسجّل حضورهم بعد'
						: 'Students waiting for attendance'}
				</h2>
			</div>

			{#if pendingCount > 0}
				<span class="queue-count">
					{pendingCount}
				</span>
			{/if}
		</div>

		<div class="attendance-list">
			{#each visibleStudents as item (item.student.id)}
				<article
					class:leaving={animatingStudentId === item.student.id}
					class="attendance-row"
				>
					<div class="student-info">
						<strong>
							{item.student.firstName}
							{item.student.lastName}
						</strong>

						<small>{item.student.className}</small>
					</div>

					<div
						class="status-controls"
						role="group"
						aria-label={
							isArabic
								? `حالة ${item.student.firstName} ${item.student.lastName}`
								: `${item.student.firstName} ${item.student.lastName} status`
						}
					>
						<button
							class="present"
							type="button"
							disabled={animatingStudentId !== null}
							onclick={() =>
								setStatus(item.student.id, 'present')}
						>
							{isArabic ? 'حاضر' : 'Present'}
						</button>

						<button
							class="absent"
							type="button"
							disabled={animatingStudentId !== null}
							onclick={() =>
								setStatus(item.student.id, 'absent')}
						>
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
				{isArabic
					? 'تم تسجيل حضور جميع التلاميذ'
					: 'Attendance is complete'}
			</strong>
			<span>
				{isArabic
					? 'يمكنك مراجعة السجل أدناه وتعديل أي حالة إذا لزم الأمر.'
					: 'Review the attendance record below and correct any status if needed.'}
			</span>
			</div>
		{:else if !visibleStudents.length}
			<div class="empty-state">
				{isArabic
					? 'لم يتم العثور على أي تلميذ بهذا الاسم.'
					: 'No waiting student matches your search.'}
			</div>
		{/if}
	</section>

	<section class="history-section">
		<div class="section-heading">
			<div>
				<p class="eyebrow">
					{isArabic ? 'السجل' : 'Recorded attendance'}
				</p>

				<h2>
					{isArabic
						? 'سجل الحضور'
						: 'Attendance record'}
				</h2>
			</div>

			<span class="history-count">
				{historyRows.length}
			</span>
		</div>

		<div class="history-table-wrap">
			<table>
				<thead>
					<tr>
						<th>{isArabic ? 'التاريخ' : 'Date'}</th>
						<th>{isArabic ? 'الحصة' : 'Session'}</th>
						<th>{isArabic ? 'التلميذ' : 'Student'}</th>
						<th>{isArabic ? 'الحالة' : 'Status'}</th>
						<th>{isArabic ? 'وقت التسجيل' : 'Recorded at'}</th>
						<th>{isArabic ? 'تعديل' : 'Edit'}</th>
					</tr>
				</thead>

				<tbody>
					{#each historyRows as { record, student } (record.id)}
						<tr>
							<td>{record.date}</td>
							<td>{record.session}</td>

							<td>
								{student.firstName}
								{student.lastName}
							</td>

							<td>
								<span
									class:history-present={
										record.status === 'present'
									}
									class:history-absent={
										record.status === 'absent'
									}
								>
									{record.status === 'present'
										? isArabic
											? 'حاضر'
											: 'Present'
										: isArabic
											? 'غائب'
											: 'Absent'}
								</span>
							</td>

							<td>{formatRecordedAt(record.recordedAt)}</td>

							<td>
								<div class="history-actions">
									<button
										class:active={record.status === 'present'}
										class="edit-present"
										type="button"
										onclick={() =>
											editStatus(
												record.studentId,
												'present',
												record.date,
												record.session
											)}
									>
										{isArabic ? 'حاضر' : 'Present'}
									</button>

									<button
										class:active={record.status === 'absent'}
										class="edit-absent"
										type="button"
										onclick={() =>
											editStatus(
												record.studentId,
												'absent',
												record.date,
												record.session
											)}
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
			<div class="empty-state">
				{isArabic
					? 'لا توجد سجلات مطابقة.'
					: 'No matching attendance records.'}
			</div>
		{/if}
	</section>


</section>
{#if exportOpen}
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={(event) =>
			event.target === event.currentTarget &&
			closeExport()}
	>
		<dialog
			open
			class="export-modal"
			aria-labelledby="export-title"
		>
			<button
				class="modal-close"
				type="button"
				onclick={closeExport}
				aria-label={isArabic ? 'إغلاق' : 'Close'}
			>
				×
			</button>

			<p class="eyebrow">
				{isArabic ? 'تصدير' : 'Export'}
			</p>

			<h2 id="export-title">
				{isArabic
					? 'تصدير الحضور إلى PDF'
					: 'Export attendance to PDF'}
			</h2>

			<div class="export-details">
				<strong>{selectedClass}</strong>

				<span>
					{isArabic
						? `الحصة ${selectedSession}`
						: `Session ${selectedSession}`}
				</span>

				<span>{selectedDate}</span>
			</div>

			<label>
				{isArabic ? 'نوع التصدير' : 'Export type'}

				<select bind:value={exportType}>
					<option value="all">
						{isArabic ? 'الكل' : 'All'}
					</option>

					<option value="present">
						{isArabic
							? 'الحاضرون فقط'
							: 'Present only'}
					</option>

					<option value="absent">
						{isArabic
							? 'الغائبون فقط'
							: 'Absent only'}
					</option>
				</select>
			</label>

			<label>
				{isArabic ? 'اسم ملف PDF' : 'PDF file name'}

				<input bind:value={pdfName} />
			</label>

			<div class="modal-actions">
				<button
					class="secondary-button"
					type="button"
					onclick={closeExport}
				>
					{isArabic ? 'إلغاء' : 'Cancel'}
				</button>

				<button
					class="primary-button"
					type="button"
					onclick={exportPdf}
				>
					{isArabic ? 'تصدير PDF' : 'Export PDF'}
				</button>
			</div>
		</dialog>
	</div>
{/if}

<style>
	.attendance-page {
		animation: page-enter 400ms ease both;
	}

	.page-heading {
		margin-bottom: 1.2rem;
	}

	.eyebrow {
		margin: 0 0 0.45rem;
		color: var(--app-accent);
		font-size: 0.8rem;
		font-weight: 700;
	}

	h1,
	h2,
	p {
		margin-top: 0;
	}

	h1 {
		margin-bottom: 0.45rem;
		font-size: clamp(1.8rem, 5vw, 2.5rem);
	}

	h2 {
		margin-bottom: 0;
		font-size: 1.3rem;
	}

	.page-heading p:last-child {
		margin: 0;
		color: var(--app-muted);
		font-size: 1rem;
		line-height: 1.7;
	}

	.attendance-toolbar,
	.tools-row {
		display: flex;
		align-items: end;
		gap: 0.65rem;
		margin-bottom: 0.7rem;
		padding: 0.8rem;
		border: 1px solid var(--app-border);
		background: var(--app-surface);
		box-shadow: var(--app-shadow);
	}

	label {
		display: flex;
		min-width: 10rem;
		flex-direction: column;
		gap: 0.3rem;
		color: var(--app-muted);
		font-size: 0.78rem;
	}

	select,
	input {
		min-height: 2.7rem;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--app-border);
		border-radius: 0.4rem;
		background: var(--app-surface-strong);
		color: var(--app-text);
		font: inherit;
		font-size: 0.95rem;
	}

	.search-field {
		flex: 1;
	}

	.export-button,
	.primary-button {
		min-height: 2.7rem;
		padding: 0.6rem 1rem;
		border: 0;
		border-radius: 0.45rem;
		background: var(--app-accent);
		color: #fff;
		cursor: pointer;
		font: inherit;
		font-weight: 700;
	}

	.export-button:hover,
	.primary-button:hover {
		background: var(--app-accent-dark);
	}

	.sort-button {
		min-height: 2.7rem;
		min-width: 2.7rem;
		border: 1px solid var(--app-border);
		background: var(--app-surface);
		color: var(--app-accent);
		cursor: pointer;
		font-size: 1.1rem;
	}

		.summary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		margin-bottom: 1rem;
		color: var(--app-muted);
		font-size: 0.82rem;
	}

	.summary span {
		padding: 0.45rem 0.7rem;
		border: 1px solid var(--app-border);
		border-radius: 999px;
		background: var(--app-surface);
	}

	.pending-section {
		margin-bottom: 1.8rem;
	}

	.pending-section .section-heading,
	.history-section .section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.queue-count,
	.history-count {
		display: inline-flex;
		min-width: 2rem;
		min-height: 2rem;
		align-items: center;
		justify-content: center;
		padding: 0 0.55rem;
		border-radius: 999px;
		background: var(--app-surface-soft);
		color: var(--app-accent);
		font-size: 0.8rem;
		font-weight: 800;
	}

	.attendance-list,
	.history-table-wrap {
		border: 1px solid var(--app-border);
		background: var(--app-surface);
		box-shadow: var(--app-shadow);
	}

		.attendance-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 1rem;
		border-bottom: 1px solid var(--app-border);
		transition:
			transform 360ms ease,
			opacity 360ms ease,
			max-height 360ms ease,
			padding 360ms ease;
		max-height: 7rem;
		overflow: hidden;
	}

	.attendance-row.leaving {
		opacity: 0;
		transform: translateY(2.2rem) scale(0.97);
		max-height: 0;
		padding-top: 0;
		padding-bottom: 0;
		border-bottom-color: transparent;
	}

	.attendance-row:last-child {
		border-bottom: 0;
	}

	.student-info {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 0.2rem;
	}

	.student-info small {
		color: var(--app-muted);
		font-size: 0.76rem;
	}

	.status-controls {
		display: flex;
		gap: 0.35rem;
	}

	.status-controls button {
		min-width: 5.4rem;
		min-height: 2.45rem;
		padding: 0.4rem 0.7rem;
		border: 1px solid var(--app-border);
		border-radius: 0.35rem;
		background: var(--app-surface-strong);
		color: var(--app-muted);
		cursor: pointer;
		font: inherit;
		font-size: 0.8rem;
	}

	.status-controls .present.chosen {
		border-color: #3c8161;
		background: #3c8161;
		color: #fff;
	}

	.status-controls .absent.chosen {
		border-color: #b43d4c;
		background: #b43d4c;
		color: #fff;
	}

		.empty-state {
		padding: 1.5rem;
		border: 1px dashed var(--app-border);
		color: var(--app-muted);
		text-align: center;
	}

	.complete-state {
		display: grid;
		justify-items: center;
		gap: 0.35rem;
		padding: 2rem 1rem;
		border: 1px solid var(--app-border);
		background: var(--app-surface);
		box-shadow: var(--app-shadow);
		text-align: center;
	}

	.complete-icon {
		display: grid;
		width: 3rem;
		height: 3rem;
		margin-bottom: 0.2rem;
		place-items: center;
		border-radius: 50%;
		background: #e8f5e9;
		color: #2e7d32;
		font-size: 1.5rem;
		font-weight: 900;
	}

	.complete-state strong {
		font-size: 1rem;
	}

	.complete-state span {
		max-width: 36rem;
		color: var(--app-muted);
		font-size: 0.82rem;
		line-height: 1.6;
	}

	.history-actions {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
	}

	.history-actions button {
		padding: 0.35rem 0.55rem;
		border: 1px solid var(--app-border);
		border-radius: 0.35rem;
		background: var(--app-surface-strong);
		color: var(--app-muted);
		cursor: pointer;
		font: inherit;
		font-size: 0.72rem;
	}

	.history-actions button.active {
		font-weight: 800;
	}

	.history-actions .edit-present.active {
		border-color: #3c8161;
		background: #e8f5e9;
		color: #2e7d32;
	}

	.history-actions .edit-absent.active {
		border-color: #b43d4c;
		background: #ffebee;
		color: #c62828;
	}

	.history-section {
		margin-top: 2rem;
	}

	.section-heading {
		margin-bottom: 0.7rem;
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
		font-size: 0.82rem;
	}

	th {
		background: var(--app-surface-soft);
		color: var(--app-muted);
	}

	tbody tr:last-child td {
		border-bottom: 0;
	}

	.history-present,
	.history-absent {
		display: inline-block;
		padding: 0.2rem 0.45rem;
		border-radius: 0.3rem;
		font-weight: 700;
	}

	.history-present {
		color: #2e7d32;
		background: #e8f5e9;
	}

	.history-absent {
		color: #c62828;
		background: #ffebee;
	}

	.modal-backdrop {
		position: fixed;
		z-index: 20;
		inset: 0;
		display: grid;
		padding: 1rem;
		place-items: center;
		background: rgba(39, 30, 31, 0.42);
	}

	.export-modal {
		position: relative;
		width: min(100%, 28rem);
		padding: 1.4rem;
		border: 1px solid var(--app-border);
		background: var(--app-surface);
		box-shadow: var(--app-shadow);
	}

	.modal-close {
		position: absolute;
		top: 0.5rem;
		inset-inline-end: 0.5rem;
		border: 0;
		background: transparent;
		color: var(--app-muted);
		cursor: pointer;
		font-size: 1.3rem;
	}

	.export-modal h2 {
		margin-bottom: 1rem;
	}

	.export-modal label {
		width: 100%;
		margin-top: 0.8rem;
	}

	.export-details {
		display: grid;
		gap: 0.25rem;
		padding: 0.75rem;
		border: 1px solid var(--app-border);
		background: var(--app-surface-soft);
	}

	.export-details span {
		color: var(--app-muted);
		font-size: 0.82rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.45rem;
		margin-top: 1rem;
	}

	.secondary-button {
		min-height: 2.7rem;
		padding: 0.6rem 0.85rem;
		border: 1px solid var(--app-border);
		border-radius: 0.45rem;
		background: var(--app-surface-strong);
		color: var(--app-text);
		cursor: pointer;
		font: inherit;
		font-weight: 700;
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

	@media (max-width: 700px) {
		.attendance-toolbar,
		.tools-row {
			align-items: stretch;
			flex-direction: column;
		}

		label,
		.search-field {
			min-width: 0;
			width: 100%;
		}

		.export-button {
			width: 100%;
		}

		.attendance-row {
			align-items: stretch;
			flex-direction: column;
		}

		.status-controls {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
		}

		.status-controls button {
			width: 100%;
		}

		.history-table-wrap {
			overflow-x: auto;
		}

		table {
			min-width: 760px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.attendance-page {
			animation: none;
		}

		.attendance-row {
			transition: none;
		}

		.attendance-row.leaving {
			transform: none;
			max-height: 0;
		}
	}
</style>