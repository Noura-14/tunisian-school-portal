<script>
	import { getContext, onMount } from 'svelte';
	import { absenceReasons, decodeAbsenceReason } from '$lib/data/absence.js';
	import { behaviorTypes, loadBehaviorRecords } from '$lib/data/behavior.js';
	import { exportReportPdf } from '$lib/utils/exportReportPdf.js';

	const appState = getContext('app-state');
	const isArabic = $derived(appState.language === 'ar');
	/** @type {{ id: string, firstName: string, lastName: string, className: string }[]} */
	let students = $state([]);
	/** @type {{ id: string, studentId: string, date: string, status: 'present' | 'absent', absenceReason: string | null, absenceReasonDetails: string | null }[]} */
	let attendanceHistory = $state([]);
	/** @type {Array<{ id: string, student_id: string, selected_dates: string[], reason: string | null, reason_notes: string | null, document_name: string | null }>} */
	let absencePeriods = $state([]);
	let absenceDetailsAvailable = $state(false);
	/** @type {Array<{ id: string, studentId: string, behaviorTypes: string[], otherBehavior: string, notes: string, summary: string, createdAt: string }>} */
	let behaviorRecords = $state([]);
	let searchTerm = $state('');
	let selectedClass = $state('all');
	let startDate = $state('');
	let endDate = $state('');
	let selectedStudentId = $state('');
	let showDateFilters = $state(false);
	let loadError = $state(false);

	onMount(async () => {
		behaviorRecords = loadBehaviorRecords();
		try {
			const [studentsResponse, attendanceResponse, periodsResponse] = await Promise.all([fetch('/api/students'), fetch('/api/attendance'), fetch('/api/absence-periods')]);
			if (!studentsResponse.ok || !attendanceResponse.ok) throw new Error('Failed to load history');
			const [studentRows, attendanceRows] = await Promise.all([studentsResponse.json(), attendanceResponse.json()]);
			students = Array.isArray(studentRows) ? studentRows.map((student) => ({ id: String(student.id), firstName: student.first_name ?? '', lastName: student.last_name ?? '', className: student.class_name ?? '' })) : [];
			attendanceHistory = Array.isArray(attendanceRows) ? attendanceRows.map((record) => ({ id: String(record.id), studentId: String(record.student_id), date: String(record.date).slice(0, 10), status: record.status, absenceReason: record.absence_reason ?? null, absenceReasonDetails: record.absence_reason_details ?? null })) : [];
			if (periodsResponse.ok) {
				absencePeriods = await periodsResponse.json();
				absenceDetailsAvailable = true;
			}
		} catch (error) {
			console.error('Could not load student history:', error);
			loadError = true;
		}
	});

	/** @param {string} date */
	function withinPeriod(date) {
		return (!startDate || date >= startDate) && (!endDate || date <= endDate);
	}

	/** @param {string} studentId @param {string} date */
	function periodForAbsence(studentId, date) {
		return absencePeriods.find((period) => period.student_id === studentId && (period.selected_dates ?? []).some((item) => String(item).slice(0, 10) === date)) || null;
	}

	/** @param {string} studentId @param {typeof attendanceHistory[number]} record */
	function reasonForAbsence(studentId, record) {
		const period = periodForAbsence(studentId, record.date);
		const storageReason = period?.reason ?? record.absenceReason ?? (absenceDetailsAvailable ? 'unjustified' : null);
		const details = period?.reason_notes ?? record.absenceReasonDetails ?? null;
		return decodeAbsenceReason(storageReason, details);
	}

	/** @param {string | null} reason @param {string | null} [notes] */
	function absenceReasonLabel(reason, notes = '') {
		if (reason === null) return isArabic ? 'التفاصيل غير متاحة' : 'Details unavailable';
		if (!reason || reason === 'unjustified') return isArabic ? 'غياب غير مبرر' : 'Unjustified absence';
		const option = absenceReasons.find((item) => item.id === reason);
		const label = option ? (isArabic ? option.ar : option.en) : reason;
		return reason === 'other' && notes ? `${label}: ${notes}` : label;
	}

	const classOptions = $derived([...new Set(students.map((student) => student.className))].filter(Boolean).sort((a, b) => a.localeCompare(b)));
	const studentSummaries = $derived(students.map((student) => {
		const absences = attendanceHistory.filter((record) => record.studentId === student.id && record.status === 'absent' && withinPeriod(record.date));
		const absenceReasonsForStudent = absences.map((record) => reasonForAbsence(student.id, record));
		const hasUnknownReason = absenceReasonsForStudent.some((reason) => reason.id === null);
		const justifiedAbsences = hasUnknownReason ? null : absenceReasonsForStudent.filter((reason) => reason.id && reason.id !== 'unjustified').length;
		const alerts = behaviorRecords.filter((record) => record.studentId === student.id && withinPeriod(record.createdAt.slice(0, 10)));
		return { student, absences, justifiedAbsences, unjustifiedAbsences: justifiedAbsences === null ? null : absences.length - justifiedAbsences, alerts };
	}).filter(({ student }) => {
		const query = searchTerm.trim().toLocaleLowerCase();
		const matchesName = !query || `${student.firstName} ${student.lastName}`.toLocaleLowerCase().includes(query);
		return matchesName && (selectedClass === 'all' || student.className === selectedClass);
	}).sort((a, b) => `${a.student.lastName} ${a.student.firstName}`.localeCompare(`${b.student.lastName} ${b.student.firstName}`, 'ar')));
	const selectedSummary = $derived(studentSummaries.find((item) => item.student.id === selectedStudentId) || null);

	/** @param {{ behaviorTypes: string[], otherBehavior?: string }} record */
	function behaviorDescription(record) {
		const labels = record.behaviorTypes.map((id) => {
			const type = behaviorTypes.find((item) => item.id === id);
			if (!type) return '';
			return type.id === 'other' && record.otherBehavior ? record.otherBehavior : (isArabic ? type.ar : type.en);
		}).filter(Boolean);
		return labels.join(isArabic ? '، ' : ', ');
	}

	async function exportHistory() {
		const reportStudents = selectedStudentId
			? studentSummaries.filter((item) => item.student.id === selectedStudentId)
			: studentSummaries;
		if (!reportStudents.length) return;
		await exportReportPdf({
			title: selectedStudentId ? (isArabic ? 'السجل التاريخي للتلميذ' : 'Student History') : (isArabic ? 'تقرير السجل المدرسي' : 'School History Report'),
			period: `${isArabic ? 'القسم' : 'Class'}: ${selectedClass === 'all' ? (isArabic ? 'جميع الأقسام' : 'All classes') : selectedClass} · ${isArabic ? 'الفترة' : 'Period'}: ${startDate || '—'} – ${endDate || '—'}`,
			columns: [isArabic ? 'التلميذ' : 'Student', isArabic ? 'القسم' : 'Class', isArabic ? 'أيام الغياب' : 'Absence days', isArabic ? 'الغياب المبرر' : 'Justified', isArabic ? 'غير المبرر' : 'Unjustified', isArabic ? 'التنبيهات' : 'Behaviour alerts', isArabic ? 'التفاصيل' : 'Details'],
			rows: reportStudents.map(({ student, absences, justifiedAbsences, unjustifiedAbsences, alerts }) => [
				`${student.firstName} ${student.lastName}`,
				student.className,
				String(absences.length),
				justifiedAbsences === null ? '—' : String(justifiedAbsences),
				unjustifiedAbsences === null ? '—' : String(unjustifiedAbsences),
				String(alerts.length),
				[
					...absences.map((record) => { const reason = reasonForAbsence(student.id, record); return `${record.date}: ${absenceReasonLabel(reason.id, reason.notes)}`; }),
					...alerts.map((record) => `${record.createdAt.slice(0, 10)}: ${record.summary}`)
				].join('\n')
			]),
			fileName: `History_${selectedStudentId ? 'student' : selectedClass === 'all' ? 'all_classes' : selectedClass}`,
			direction: isArabic ? 'rtl' : 'ltr'
		});
	}
</script>

<svelte:head><title>{isArabic ? 'السجل | فضاء المتابعة' : 'History | Follow-up Portal'}</title></svelte:head>

<section class="history-page" aria-labelledby="history-title">
	<header class="page-heading" style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap"><div><p class="eyebrow">{isArabic ? 'السجل المدرسي' : 'School records'}</p><h1 id="history-title">{isArabic ? 'السجل' : 'History'}</h1><p>{isArabic ? 'استعرض سجلات الغياب والتنبيهات السلوكية للتلاميذ.' : 'Review student absence and behaviour history.'}</p></div><button type="button" onclick={exportHistory} disabled={!studentSummaries.length} style="min-height:2.6rem;padding:.5rem .8rem;border:1px solid var(--app-border);border-radius:.55rem;background:var(--app-surface);color:var(--app-accent);cursor:pointer;font:inherit;font-size:.85rem;font-weight:700">{isArabic ? 'تصدير PDF' : 'Export PDF'}</button></header>
	<section class="filters" aria-label={isArabic ? 'تصفية السجل' : 'Filter history'}>
		<label class="search-field" for="history-search"><span aria-hidden="true">⌕</span><input id="history-search" type="search" bind:value={searchTerm} placeholder={isArabic ? 'البحث عن تلميذ...' : 'Search for a student...'} /></label>
		<label class="class-filter"><span>{isArabic ? 'القسم' : 'Class'}</span><select bind:value={selectedClass}><option value="all">{isArabic ? 'جميع الأقسام' : 'All classes'}</option>{#each classOptions as className}<option value={className}>{className}</option>{/each}</select></label>
		<button class="date-filter-toggle" class:active={showDateFilters} type="button" aria-expanded={showDateFilters} onclick={() => showDateFilters = !showDateFilters}>{showDateFilters ? (isArabic ? 'إخفاء الفترة' : 'Hide dates') : (isArabic ? 'تحديد الفترة' : 'Date range')}</button>
		<div class="date-range" class:open={showDateFilters}>
			<label><span>{isArabic ? 'من تاريخ' : 'From'}</span><input type="date" bind:value={startDate} /></label>
			<label><span>{isArabic ? 'إلى تاريخ' : 'To'}</span><input type="date" bind:value={endDate} /></label>
		</div>
	</section>
	{#if loadError}<div class="empty-state">{isArabic ? 'تعذر تحميل السجل.' : 'Unable to load history.'}</div>
	{:else}
		{#if !absenceDetailsAvailable}<p class="schema-note" role="status">{isArabic ? 'تفاصيل التبرير غير متاحة حالياً؛ تُعرض أيام الغياب المسجلة فقط.' : 'Justification details are unavailable; only recorded absence days are shown.'}</p>{/if}
		<div class="table-wrap"><table><thead><tr><th>{isArabic ? 'التلميذ' : 'Student'}</th><th>{isArabic ? 'القسم' : 'Class'}</th><th>{isArabic ? 'أيام الغياب' : 'Absence days'}</th><th>{isArabic ? 'المبرر' : 'Justified'}</th><th>{isArabic ? 'غير المبرر' : 'Unjustified'}</th><th>{isArabic ? 'التنبيهات السلوكية' : 'Behaviour alerts'}</th></tr></thead><tbody>{#each studentSummaries as item (item.student.id)}<tr class:selected={selectedStudentId === item.student.id}><td><button class="student-select" type="button" onclick={() => selectedStudentId = item.student.id}>{item.student.firstName} {item.student.lastName}</button></td><td><span class="mobile-label">{isArabic ? 'القسم' : 'Class'}</span>{item.student.className}</td><td><span class="mobile-label">{isArabic ? 'أيام الغياب' : 'Absence days'}</span>{item.absences.length}</td><td><span class="mobile-label">{isArabic ? 'المبرر' : 'Justified'}</span>{item.justifiedAbsences ?? '—'}</td><td><span class="mobile-label">{isArabic ? 'غير المبرر' : 'Unjustified'}</span>{item.unjustifiedAbsences ?? '—'}</td><td><span class="mobile-label">{isArabic ? 'التنبيهات السلوكية' : 'Behaviour alerts'}</span>{item.alerts.length}</td></tr>{/each}</tbody></table></div>
		{#if studentSummaries.length === 0}<div class="empty-state">{isArabic ? 'لا توجد سجلات مطابقة.' : 'No matching records.'}</div>{/if}
		{#if selectedSummary}
			<div class="detail-backdrop visible" role="presentation" onclick={(event) => event.target === event.currentTarget && (selectedStudentId = '')}>
			<dialog open class="student-history" aria-modal="true" aria-labelledby="student-history-title">
				<div class="detail-heading"><div><p class="eyebrow">{isArabic ? 'ملخص التلميذ' : 'Student summary'}</p><h2 id="student-history-title">{selectedSummary.student.firstName} {selectedSummary.student.lastName}</h2><span>{selectedSummary.student.className}</span></div><button class="close-detail" type="button" aria-label={isArabic ? 'إغلاق الملخص' : 'Close summary'} onclick={() => selectedStudentId = ''}>×</button></div>
				<div class="summary-counts"><div><span>{isArabic ? 'إجمالي أيام الغياب' : 'Total absence days'}</span><strong>{selectedSummary.absences.length}</strong></div><div><span>{isArabic ? 'أيام مبررة' : 'Justified days'}</span><strong>{selectedSummary.justifiedAbsences ?? '—'}</strong></div><div><span>{isArabic ? 'أيام غير مبررة' : 'Unjustified days'}</span><strong>{selectedSummary.unjustifiedAbsences ?? '—'}</strong></div><div><span>{isArabic ? 'التنبيهات السلوكية' : 'Behaviour alerts'}</span><strong>{selectedSummary.alerts.length}</strong></div></div>
				<div class="timeline-columns">
					<section><h3>{isArabic ? 'الغياب' : 'Absences'}</h3>{#if selectedSummary.absences.length}<ul>{#each selectedSummary.absences as record (`${record.id}-${record.date}`)}{@const period = periodForAbsence(selectedSummary.student.id, record.date)}{@const reason = reasonForAbsence(selectedSummary.student.id, record)}<li><time>{record.date}</time><span>{absenceReasonLabel(reason.id, reason.notes)}{reason.id !== null ? ` · ${reason.id && reason.id !== 'unjustified' ? (isArabic ? 'مبرر' : 'Justified') : (isArabic ? 'غير مبرر' : 'Unjustified')}` : ''}</span>{#if period?.document_name}<small>{period.document_name}</small>{/if}</li>{/each}</ul>{:else}<p class="detail-empty">{isArabic ? 'لا توجد غيابات في الفترة المحددة.' : 'No absences in this period.'}</p>{/if}</section>
					<section><h3>{isArabic ? 'السلوك' : 'Behaviour'}</h3>{#if selectedSummary.alerts.length}<ul>{#each selectedSummary.alerts as record (record.id)}<li><time>{new Date(record.createdAt).toLocaleString(isArabic ? 'ar-QA-u-nu-latn' : 'en-GB')}</time><span>{behaviorDescription(record)}</span><p>{record.summary}</p></li>{/each}</ul>{:else}<p class="detail-empty">{isArabic ? 'لا توجد تنبيهات سلوكية في الفترة المحددة.' : 'No behaviour alerts in this period.'}</p>{/if}</section>
				</div>
				{#if absenceDetailsAvailable}<p class="schema-note">{isArabic ? 'الغياب الذي لا يحتوي على سبب محفوظ يُحتسب غير مبرر.' : 'Absences without a saved reason are counted as unjustified.'}</p>{/if}
			</dialog>
			</div>
		{/if}
	{/if}
</section>

<style>
	.history-page{animation:page-in 350ms ease both}.page-heading{margin-bottom:1rem}.eyebrow{margin:0 0 .35rem;color:var(--app-accent);font-size:.78rem;font-weight:700}h1,h2,h3,p{margin-top:0}h1{margin-bottom:.25rem;font-size:clamp(1.55rem,4vw,2.2rem)}.page-heading p:last-child{margin:0;color:var(--app-muted);font-size:.9rem}.filters{display:flex;align-items:end;gap:.5rem;margin-bottom:.7rem;padding:.65rem;border:1px solid var(--app-border);background:var(--app-surface)}.filters label:not(.search-field){display:flex;min-width:7.5rem;flex-direction:column;gap:.2rem;color:var(--app-muted);font-size:.7rem}.search-field{display:flex;min-height:2.5rem;flex:1;align-items:center;gap:.4rem;padding:0 .6rem;border:1px solid var(--app-border);color:var(--app-accent)}input,select{min-height:2.5rem;padding:.4rem;border:1px solid var(--app-border);background:var(--app-surface-strong);color:var(--app-text);font:inherit}.search-field input{width:100%;border:0;outline:0;background:transparent}.table-wrap{overflow:auto;border:1px solid var(--app-border);background:var(--app-surface);box-shadow:var(--app-shadow)}table{width:100%;min-width:650px;border-collapse:collapse}th,td{padding:.55rem .7rem;border-bottom:1px solid var(--app-border);text-align:start;white-space:nowrap}th{background:var(--app-surface-soft);color:var(--app-muted);font-size:.73rem}td{font-size:.82rem}tbody tr:last-child td{border-bottom:0}tbody tr.selected{background:var(--app-accent-soft)}.student-select{padding:0;border:0;background:transparent;color:var(--app-accent);cursor:pointer;font:inherit;text-align:start}.student-select:hover{text-decoration:underline}.empty-state{padding:1.2rem;border:1px dashed var(--app-border);color:var(--app-muted);text-align:center}.student-history{margin-top:1rem;padding:1rem;border:1px solid var(--app-border);background:var(--app-surface);box-shadow:var(--app-shadow)}.detail-heading{display:flex;justify-content:space-between;align-items:flex-start}.detail-heading h2{margin-bottom:.15rem;font-size:1.1rem}.detail-heading span{color:var(--app-muted);font-size:.8rem}.close-detail{width:2rem;height:2rem;border:1px solid var(--app-border);background:var(--app-surface);color:var(--app-muted);cursor:pointer}.summary-counts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.5rem;margin:1rem 0}.summary-counts div{display:grid;gap:.2rem;padding:.65rem;border:1px solid var(--app-border);background:var(--app-surface-soft)}.summary-counts span{color:var(--app-muted);font-size:.72rem}.summary-counts strong{font-size:.88rem}.timeline-columns{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}.timeline-columns section{padding:.75rem;border:1px solid var(--app-border)}.timeline-columns h3{font-size:.9rem}.timeline-columns ul{display:grid;gap:.5rem;margin:0;padding-inline-start:1rem}.timeline-columns li{padding-inline-start:.15rem;color:var(--app-muted);font-size:.78rem}.timeline-columns li time{display:block;margin-bottom:.1rem;color:var(--app-accent);font-size:.7rem}.timeline-columns li p{margin:.2rem 0 0;color:var(--app-text)}.detail-empty,.schema-note{margin:0;color:var(--app-muted);font-size:.78rem}.schema-note{margin-top:.7rem}.filters:focus-within input:focus-visible,.student-select:focus-visible,.close-detail:focus-visible{outline:2px solid var(--app-accent);outline-offset:2px}@keyframes page-in{from{opacity:0;transform:translateY(.3rem)}to{opacity:1;transform:translateY(0)}}@media(max-width:700px){.filters{align-items:stretch;flex-direction:column}.filters label:not(.search-field){min-width:0}.table-wrap{overflow:visible;border:0;background:transparent;box-shadow:none}table{display:block;min-width:0}thead{display:none}tbody{display:grid;gap:.35rem}tbody tr{display:grid;grid-template-columns:1fr 1fr;gap:.25rem .55rem;padding:.6rem;border:1px solid var(--app-border);background:var(--app-surface)}tbody td{padding:.12rem 0;border:0;white-space:normal}tbody td:first-child{grid-column:1/-1;font-weight:700}.summary-counts{grid-template-columns:repeat(2,minmax(0,1fr))}.timeline-columns{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.history-page{animation:none}}
	.student-history { position: static; width: auto; max-height: none; overflow: visible; color: var(--app-text); }
	.date-filter-toggle { display: none; }
	.date-range { display: flex; align-items: end; gap: 0.5rem; }
	.mobile-label { display: none; }
	.detail-backdrop { display: contents; }

	@media (max-width: 760px) {
		.history-page { animation: none; }
		.filters { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: stretch; gap: 0.5rem; padding: 0; border: 0; background: transparent; }
		.filters .search-field { grid-column: 1 / -1; min-width: 0; }
		.filters .class-filter { grid-column: 1 / -1; }
		.filters label:not(.search-field) { min-width: 0; font-size: 0.9rem; }
		.filters input, .filters select, .filters .search-field { min-height: 2.8rem; font-size: 1rem; }
		.filters .search-field input { font-size: 1rem; }
		.date-filter-toggle { display: block; grid-column: 1 / -1; min-height: 2.8rem; padding: 0.5rem 0.7rem; border: 1px solid var(--app-border); border-radius: 0.5rem; background: var(--app-surface); color: var(--app-accent); cursor: pointer; font: inherit; font-size: 1rem; font-weight: 700; }
		.date-filter-toggle.active { background: var(--app-accent-soft); }
		.date-range { display: none; grid-column: 1 / -1; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
		.date-range.open { display: grid; }
		.date-range input { width: 100%; min-width: 0; }
		.table-wrap { overflow: visible; border: 0; background: transparent; box-shadow: none; }
		table { display: block; min-width: 0; }
		thead { display: none; }
		tbody { display: grid; gap: 0.45rem; }
		tbody tr { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: center; gap: 0.45rem; padding: 0.6rem; border: 1px solid var(--app-border); border-radius: 0.55rem; background: var(--app-surface); }
		tbody tr.selected { background: var(--app-accent-soft); }
		tbody td { display: flex; min-width: 0; flex-direction: column; gap: 0.12rem; padding: 0; border: 0; white-space: normal; font-size: 1rem; }
		tbody td:nth-child(1) { grid-column: 1 / 3; }
		tbody td:nth-child(2) { grid-column: 3; grid-row: 1; text-align: end; }
		.mobile-label { display: block; color: var(--app-muted); font-size: 0.78rem; }
		.student-select { font-size: 1.25rem; font-weight: 700; line-height: 1.25; }
		.page-heading > button { min-height: 2.8rem !important; font-size: 1rem !important; }
		.detail-backdrop.visible { position: fixed; z-index: 120; inset: 0; display: flex; align-items: flex-end; justify-content: center; padding-top: 1rem; background: rgb(20 25 23 / 42%); }
		.student-history { position: relative; width: min(100%, 44rem); max-height: 88dvh; overflow: auto; margin: 0; padding: 1rem; border-radius: 0.8rem 0.8rem 0 0; box-shadow: 0 -8px 28px rgb(0 0 0 / 14%); }
		.summary-counts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.summary-counts span { font-size: 0.88rem; }
		.summary-counts strong { font-size: 1.1rem; }
		.timeline-columns { grid-template-columns: 1fr; }
		.timeline-columns li { font-size: 1rem; }
		.close-detail { width: 2.75rem; height: 2.75rem; flex: 0 0 2.75rem; }
		table { width: 100%; }
		tbody tr { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.4rem 0.3rem; }
		tbody td:nth-child(1) { grid-column: 1 / 4; }
		tbody td:nth-child(2) { grid-column: 4; grid-row: 1; }
		tbody td:nth-child(3) { grid-column: 1; grid-row: 2; }
		tbody td:nth-child(4) { grid-column: 2; grid-row: 2; }
		tbody td:nth-child(5) { grid-column: 3; grid-row: 2; }
		tbody td:nth-child(6) { grid-column: 4; grid-row: 2; }
		tbody td { font-size: 0.92rem; overflow-wrap: anywhere; }
		.mobile-label { font-size: 0.7rem; }
	}

	@media (max-width: 390px) {
		.date-range { grid-template-columns: 1fr; }
		.student-history { padding: 0.8rem; }
	}
</style>
