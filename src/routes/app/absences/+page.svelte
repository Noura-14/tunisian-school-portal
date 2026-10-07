<script>
	import { getContext, onDestroy, onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { absenceReasons, decodeAbsenceReason } from '$lib/data/absence.js';
	import { exportReportPdf } from '$lib/utils/exportReportPdf.js';

	const appState = getContext('app-state');
	const isArabic = $derived(appState.language === 'ar');
	const locale = $derived(isArabic ? 'ar-QA-u-nu-latn' : 'en-GB');
	const exportClassOptions = ['all', ...Array.from({ length: 10 }, (_, index) => `7ème ${index + 1}`)];
	/** @type {Array<{ id: string, firstName: string, lastName: string, className: string }>} */
	let students = $state([]);
	/** @type {Array<{ id: string, studentId: string, date: string, status: 'present' | 'absent', absenceReason: string | null, absenceReasonDetails: string | null }>} */
	let attendance = $state([]);
	/** @type {Array<{ id: string, student_id: string, start_date: string, end_date: string, selected_dates: string[], reason: string | null, reason_notes: string | null, document_name: string | null, created_at: string }>} */
	let absencePeriods = $state([]);
	let loadError = $state('');
	let periodUnavailable = $state(false);
	let attendanceUnavailable = $state(false);
	let studentSearch = $state('');
	let studentClass = $state('');
	let studentListOpen = $state(false);
	let selectedStudentId = $state('');
	/** @type {string[]} */
	let selectedDates = $state([]);
	let sheetOpen = $state(false);
	let editingPeriodId = $state('');
	let selectionMode = $state('days');
	let rangeAnchor = $state('');
	let monthCursor = $state(new Date());
	let reason = $state('unjustified');
	let reasonNotes = $state('');
	/** @type {File | null} */
	let documentFile = $state(null);
	let saving = $state(false);
	/** @type {{ message: string, type: 'success' | 'error' } | null} */
	let toast = $state(null);
	/** @type {number | null} */
	let toastTimer = null;
	let searchTerm = $state('');
	let recordClass = $state('all');
	let recordMonth = $state('');
	let recordsSheetOpen = $state(false);
	let exportModalOpen = $state(false);
	let exportClass = $state('all');
	let exportReportType = $state('class');
	let exportStudentSearch = $state('');
	let exportStudentId = $state('');
	let exporting = $state(false);
	const today = dateKey(new Date());

	/** @param {string} message @param {'success' | 'error'} type */
	function showToast(message, type) {
		if (typeof window === 'undefined') return;
		if (toastTimer) window.clearTimeout(toastTimer);
		toast = { message, type };
		toastTimer = window.setTimeout(() => {
			toast = null;
			toastTimer = null;
		}, type === 'success' ? 2500 : 3000);
	}

	onDestroy(() => {
		if (toastTimer) window.clearTimeout(toastTimer);
	});

	/** @param {Date} date */
	function dateKey(date) {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	}

	/** @param {string} key */
	function dateFromKey(key) {
		const [year, month, day] = key.split('-').map(Number);
		return new Date(year, month - 1, day, 12);
	}

	/** @param {string} key */
	function formatDate(key) {
		return dateFromKey(key).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
	}

	/** @param {Date} month */
	function buildCalendarCells(month) {
		const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
		const gridStart = new Date(first);
		gridStart.setDate(first.getDate() - first.getDay());
		return Array.from({ length: 42 }, (_, index) => {
			const date = new Date(gridStart);
			date.setDate(gridStart.getDate() + index);
			return { key: dateKey(date), day: date.getDate(), inMonth: date.getMonth() === month.getMonth(), schoolDay: isSchoolWeekday(date) };
		});
	}

	/** @param {Date} date */
	function isSchoolWeekday(date) {
		return ![5, 6].includes(date.getDay());
	}

	/** @param {string} previousDate @param {string} nextDate */
	function areAdjacentSchoolDays(previousDate, nextDate) {
		const cursor = dateFromKey(previousDate);
		do { cursor.setDate(cursor.getDate() + 1); } while (!isSchoolWeekday(cursor));
		return dateKey(cursor) === nextDate;
	}

	const classOptions = $derived([...new Set(students.map((student) => student.className))].filter(Boolean).sort((a, b) => a.localeCompare(b)));
	const calendarCells = $derived(buildCalendarCells(monthCursor));
	const monthLabel = $derived(monthCursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' }));
	const weekdays = $derived(isArabic
		? ['أحد', 'إثن', 'ثلث', 'أرب', 'خمي', 'جمع', 'سبت']
		: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
	const selectedStudent = $derived(students.find((student) => student.id === selectedStudentId) || null);
	const pickerStudents = $derived(students.filter((student) => {
		const query = studentSearch.trim().toLocaleLowerCase();
		return studentClass && student.className === studentClass && (!query || `${student.firstName} ${student.lastName}`.toLocaleLowerCase().includes(query));
	}));
	const sortedDates = $derived([...selectedDates].sort());
	const selectionLabel = $derived.by(() => {
		const firstDate = sortedDates[0];
		if (!firstDate) return '';
		if (sortedDates.length === 1) return formatDate(firstDate);
		const contiguous = sortedDates.every((date, index) => {
			const previousDate = sortedDates[index - 1];
			return index === 0 || (previousDate !== undefined && dateFromKey(date).getTime() - dateFromKey(previousDate).getTime() === 86400000);
		});
		const lastDate = sortedDates.at(-1) || firstDate;
		return contiguous ? `${formatDate(firstDate)} → ${formatDate(lastDate)}` : `${formatDate(firstDate)} · ${new Intl.NumberFormat('en-US').format(sortedDates.length)}`;
	});

	/** @param {string} studentId @param {string} date */
	function periodForDate(studentId, date) {
		return absencePeriods.find((period) => period.student_id === studentId && (period.selected_dates ?? []).some((item) => String(item).slice(0, 10) === date)) || null;
	}

	/** @param {string} date */
	function absencesOnDate(date) {
		return attendance.filter((record) => record.date === date && record.status === 'absent');
	}

	/** @param {string} date */
	function canSelectDate(date) {
		return Boolean(selectedStudentId) && (isSchoolWeekday(dateFromKey(date)) || absencesOnDate(date).length > 0);
	}

	/** @param {string} date */
	function selectDate(date) {
		if (!selectedStudentId || !canSelectDate(date)) return;
		if (selectionMode === 'range') {
			if (!rangeAnchor) {
				rangeAnchor = date;
				selectedDates = [date];
				sheetOpen = false;
				return;
			}
			const start = date < rangeAnchor ? date : rangeAnchor;
			const end = date < rangeAnchor ? rangeAnchor : date;
			const dates = [];
			for (const cursor = dateFromKey(start); cursor <= dateFromKey(end); cursor.setDate(cursor.getDate() + 1)) {
				const key = dateKey(cursor);
				if (isSchoolWeekday(cursor) || ((key === start || key === end) && absencesOnDate(key).length)) dates.push(key);
			}
			selectedDates = dates;
			rangeAnchor = '';
			sheetOpen = selectedDates.length > 0;
			return;
		}
		selectedDates = selectedDates.includes(date) ? selectedDates.filter((item) => item !== date) : [...selectedDates, date].sort();
		sheetOpen = selectedDates.length > 0;
	}

	function selectWeek() {
		if (!selectedStudentId) return;
		const reference = selectedDates.at(-1) || today;
		const start = dateFromKey(reference);
		start.setDate(start.getDate() - start.getDay());
		selectedDates = Array.from({ length: 5 }, (_, index) => {
			const date = new Date(start);
			date.setDate(start.getDate() + index);
			return dateKey(date);
		});
		rangeAnchor = '';
		selectionMode = 'days';
		sheetOpen = true;
	}

	/** @param {string} className */
	function chooseClass(className) {
		studentClass = className;
		selectedStudentId = '';
		studentSearch = '';
		studentListOpen = true;
		selectedDates = [];
		rangeAnchor = '';
		sheetOpen = false;
		editingPeriodId = '';
		reason = 'unjustified';
		reasonNotes = '';
		documentFile = null;
	}

	/** @param {string} studentId */
	function chooseStudent(studentId) {
		selectedStudentId = studentId;
		studentListOpen = false;
		selectedDates = [];
		rangeAnchor = '';
		sheetOpen = false;
		editingPeriodId = '';
		reason = 'unjustified';
		reasonNotes = '';
		documentFile = null;
	}

	/** @param {number} delta */
	function changeMonth(delta) {
		monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta, 1, 12);
	}

	function jumpToToday() {
		monthCursor = dateFromKey(today);
		selectDate(today);
	}

	function closeSheet() {
		sheetOpen = false;
		editingPeriodId = '';
	}

	/** @param {any} item */
	function editAbsenceReason(item) {
		studentClass = item.student.className;
		selectedStudentId = item.student.id;
		studentListOpen = false;
		selectedDates = [...item.dates];
		rangeAnchor = '';
		selectionMode = 'days';
		reason = item.period?.reason || 'unjustified';
		reasonNotes = item.period?.reason_notes ?? '';
		documentFile = null;
		editingPeriodId = item.period?.id ? String(item.period.id) : '';
		sheetOpen = true;
	}

	/** @param {string | null} value @param {string} [notes] */
	function reasonName(value, notes = '') {
		const decoded = decodeAbsenceReason(value, notes);
		value = decoded.id ?? '';
		notes = decoded.notes;
		if (!value || value === 'unjustified') return isArabic ? 'غياب غير مبرر' : 'Unjustified absence';
		const item = absenceReasons.find((option) => option.id === value);
		if (!item) return value;
		const label = isArabic ? item.ar : item.en;
		return value === 'other' && notes ? `${label}: ${notes}` : label;
	}

	async function loadData() {
		loadError = '';
		const [studentsResult, attendanceResult, periodsResult] = await Promise.allSettled([fetch('/api/students'), fetch('/api/attendance'), fetch('/api/absence-periods')]);
		if (studentsResult.status === 'rejected') throw studentsResult.reason;
		const studentsResponse = studentsResult.value;
		if (!studentsResponse.ok) throw new Error('Unable to load students.');
		const studentRows = await studentsResponse.json();
		students = Array.isArray(studentRows) ? studentRows.map((student) => ({ id: String(student.id), firstName: student.first_name ?? '', lastName: student.last_name ?? '', className: student.class_name ?? '' })) : [];
		const attendanceResponse = attendanceResult.status === 'fulfilled' ? attendanceResult.value : null;
		if (attendanceResponse?.ok) {
			const attendanceRows = await attendanceResponse.json();
			attendance = Array.isArray(attendanceRows) ? attendanceRows.map((record) => ({ id: String(record.id), studentId: String(record.student_id), date: String(record.date).slice(0, 10), status: record.status, absenceReason: record.absence_reason ?? null, absenceReasonDetails: record.absence_reason_details ?? null })) : [];
			attendanceUnavailable = false;
		} else {
			attendance = [];
			attendanceUnavailable = true;
			console.error('Could not load attendance for absence calendar:', attendanceResponse?.status ?? 'network error');
			loadError = isArabic ? 'تعذر تحميل سجل الحضور. حاول مرة أخرى.' : 'Unable to load attendance. Please try again.';
			showToast(loadError, 'error');
		}
		const periodsResponse = periodsResult.status === 'fulfilled' ? periodsResult.value : null;
		if (periodsResponse?.ok) {
			absencePeriods = await periodsResponse.json();
			periodUnavailable = false;
		} else {
			absencePeriods = [];
			const wasUnavailable = periodUnavailable;
			periodUnavailable = true;
			console.error('Could not load absence details:', periodsResponse?.status ?? 'network error');
			if (!wasUnavailable) showToast(isArabic ? 'تعذر تحميل تفاصيل الغياب. حاول مرة أخرى.' : 'Unable to load absence details. Please try again.', 'error');
		}
	}

	onMount(async () => {
		try { await loadData(); }
		catch (error) { console.error('Could not load absence calendar:', error); loadError = isArabic ? 'تعذر تحميل بيانات الغيابات. حاول مرة أخرى.' : 'Unable to load absences. Please try again.'; showToast(loadError, 'error'); }
	});

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function setDocument(event) {
		const file = event.currentTarget.files?.[0] || null;
		if (file && !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
			showToast(isArabic ? 'اختر صورة JPG أو PNG أو WEBP أو ملف PDF.' : 'Choose a JPG, PNG, WEBP, or PDF file.', 'error');
			documentFile = null;
			return;
		}
		if (file && file.size > 10 * 1024 * 1024) {
			showToast(isArabic ? 'يجب ألا يتجاوز حجم الوثيقة 10 ميغابايت.' : 'The document must be under 10 MB.', 'error');
			documentFile = null;
			return;
		}
		documentFile = file;
	}

	async function saveAbsence() {
		if (!selectedStudent || !sortedDates.length || saving) return;
		saving = true;
		const form = new FormData();
		form.set('student_id', selectedStudent.id);
		form.set('dates', JSON.stringify(sortedDates));
		form.set('reason', reason);
		form.set('reason_notes', reasonNotes);
		if (editingPeriodId) form.set('period_id', editingPeriodId);
		if (documentFile) form.set('document', documentFile, documentFile.name);
		try {
			const response = await fetch('/api/absence-periods', { method: editingPeriodId ? 'PATCH' : 'POST', body: form });
			const result = await response.json();
			if (!response.ok) {
				console.error('Absence save request failed:', { status: response.status, responseBody: result });
				throw new Error(result.error || 'Unable to save the absence.');
			}
			await loadData();
			showToast(isArabic ? 'تم حفظ الغياب وتحديث الحضور.' : 'Absence saved and attendance updated.', 'success');
			selectedDates = [];
			selectedStudentId = '';
			studentSearch = '';
			reason = 'unjustified';
			reasonNotes = '';
			documentFile = null;
			editingPeriodId = '';
		} catch (error) {
			console.error('Could not save absence:', error);
			showToast(isArabic ? 'تعذر حفظ الغياب. حاول مرة أخرى.' : 'Unable to save the absence. Please try again.', 'error');
		} finally { saving = false; }
	}

	function cancelDraft() {
		selectedDates = [];
		sheetOpen = false;
		editingPeriodId = '';
		selectedStudentId = '';
		studentClass = '';
		studentListOpen = false;
		studentSearch = '';
		rangeAnchor = '';
		reason = 'unjustified';
		reasonNotes = '';
		documentFile = null;
	}

	const absenceRows = $derived.by(() => {
		const coveredDates = new Set();
		const periodRows = absencePeriods.flatMap((period) => {
			const student = students.find((item) => item.id === period.student_id);
			if (!student) return [];
			const dates = (period.selected_dates ?? []).map((date) => String(date).slice(0, 10)).sort();
			if (!dates.length) return [];
			for (const date of dates) coveredDates.add(`${student.id}-${date}`);
			return [{ id: `period-${period.id}`, student, startDate: dates[0], endDate: dates.at(-1) || dates[0], period, dates, reasonAvailable: true }];
		});
		const attendanceRows = attendance.filter((record) => record.status === 'absent' && !coveredDates.has(`${record.studentId}-${record.date}`)).sort((left, right) => left.studentId.localeCompare(right.studentId) || left.date.localeCompare(right.date));
		/** @type {Array<{ id: string, student: (typeof students)[number], startDate: string, endDate: string, period: { reason: string, reason_notes: string | null, document_name: null } | null, dates: string[], reasonAvailable: boolean }>} */
		const fallbackRows = [];
		for (const record of attendanceRows) {
			const student = students.find((item) => item.id === record.studentId);
			if (!student) continue;
			const previous = fallbackRows.at(-1);
			if (record.absenceReason && previous && previous.student.id === student.id && previous.period?.reason === record.absenceReason && previous.period?.reason_notes === record.absenceReasonDetails && areAdjacentSchoolDays(previous.endDate, record.date)) {
				previous.endDate = record.date;
				previous.dates.push(record.date);
				continue;
			}
			const decodedReason = decodeAbsenceReason(record.absenceReason, record.absenceReasonDetails);
			fallbackRows.push({
				id: `attendance-${record.studentId}-${record.date}`,
				student,
				startDate: record.date,
				endDate: record.date,
				period: record.absenceReason && decodedReason.id ? { reason: decodedReason.id, reason_notes: decodedReason.notes, document_name: null } : null,
				dates: [record.date],
				reasonAvailable: !periodUnavailable || Boolean(decodedReason.id)
			});
		}
		return [...periodRows, ...fallbackRows];
	});
	const visibleAbsences = $derived.by(() => {
		const query = searchTerm.trim().toLocaleLowerCase();
		return absenceRows.filter(({ student, dates }) => {
			const matchesName = !query || `${student.firstName} ${student.lastName}`.toLocaleLowerCase().includes(query);
			const matchesClass = recordClass === 'all' || student.className === recordClass;
			const matchesMonth = !recordMonth || dates.some((date) => date.startsWith(recordMonth));
			return matchesName && matchesClass && matchesMonth;
		}).sort((left, right) => {
			return right.startDate.localeCompare(left.startDate);
		});
	});
	const exportPickerStudents = $derived.by(() => {
		const query = exportStudentSearch.trim().toLocaleLowerCase();
		return students.filter((student) => {
			const matchesClass = exportClass === 'all' || student.className === exportClass;
			return matchesClass && (!query || `${student.firstName} ${student.lastName}`.toLocaleLowerCase().includes(query));
		}).sort((left, right) => `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`));
	});
	const exportableAbsences = $derived.by(() => absenceRows.filter(({ student }) => {
		const matchesClass = exportClass === 'all' || student.className === exportClass;
		const matchesStudent = exportReportType !== 'student' || student.id === exportStudentId;
		return matchesClass && matchesStudent;
	}));

	function openExportModal() {
		exportClass = 'all';
		exportReportType = 'class';
		exportStudentSearch = '';
		exportStudentId = '';
		exportModalOpen = true;
	}

	function closeExportModal() {
		if (!exporting) exportModalOpen = false;
	}

	function openRecordsSheet() {
		if (window.matchMedia('(max-width: 760px)').matches) recordsSheetOpen = true;
		else document.getElementById('absence-records-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function closeRecordsSheet() {
		recordsSheetOpen = false;
	}

	/** @param {Event & { currentTarget: HTMLSelectElement }} event */
	function changeExportClass(event) {
		exportClass = event.currentTarget.value;
		exportStudentSearch = '';
		exportStudentId = '';
	}

	/** @param {string[]} dates */
	function formatExportDates(dates) {
		/** @type {string[][]} */
		const groups = [];
		for (const date of [...dates].sort()) {
			const previousGroup = groups.at(-1);
			const previousDate = previousGroup?.at(-1);
			if (previousGroup && previousDate && areAdjacentSchoolDays(previousDate, date)) previousGroup.push(date);
			else groups.push([date]);
		}
		/** @param {string} date */
		const displayDate = (date) => isArabic ? date.replaceAll('-', '/') : formatDate(date);
		return groups.map((group) => {
			const firstDate = group[0] ?? '';
			const lastDate = group.at(-1) ?? firstDate;
			if (group.length < 2) return displayDate(firstDate);
			return isArabic
				? `من ${displayDate(firstDate)} إلى ${displayDate(lastDate)}`
				: `From ${displayDate(firstDate)} to ${displayDate(lastDate)}`;
		}).join(isArabic ? '، ' : ', ');
	}

	async function exportAbsences() {
		if (!exportableAbsences.length || (exportReportType === 'student' && !exportStudentId) || exporting) return;
		exporting = true;
		const reportDate = new Date().toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
		const selectedStudentForExport = students.find((student) => student.id === exportStudentId);
		const sortedAbsences = [...exportableAbsences].sort((left, right) => left.student.className.localeCompare(right.student.className, undefined, { numeric: true }) || left.student.lastName.localeCompare(right.student.lastName) || left.student.firstName.localeCompare(right.student.firstName) || left.startDate.localeCompare(right.startDate));
		const includeClassColumn = exportReportType === 'class' && exportClass === 'all';
		const dailyAbsences = sortedAbsences.flatMap(({ student, dates, period, reasonAvailable }) => {
			const reasonLabel = reasonAvailable
				? period?.reason ? reasonName(period.reason, period.reason_notes ?? '') : (isArabic ? 'غياب غير مبرر' : 'Unjustified absence')
				: (isArabic ? 'تفاصيل السبب غير متاحة' : 'Reason details unavailable');
			return dates.map((date) => ({ student, date, reasonLabel }));
		}).sort((left, right) => left.student.className.localeCompare(right.student.className, undefined, { numeric: true }) || left.student.lastName.localeCompare(right.student.lastName) || left.student.firstName.localeCompare(right.student.firstName) || left.date.localeCompare(right.date));
		/** @type {Array<{ student: (typeof students)[number], dates: string[], reasonLabel: string }>} */
		const groupedAbsences = [];
		for (const absence of dailyAbsences) {
			const previous = groupedAbsences.at(-1);
			const previousDate = previous?.dates.at(-1);
			if (previous && previous.student.id === absence.student.id && previous.reasonLabel === absence.reasonLabel && previousDate && areAdjacentSchoolDays(previousDate, absence.date)) {
				previous.dates.push(absence.date);
			} else {
				groupedAbsences.push({ student: absence.student, dates: [absence.date], reasonLabel: absence.reasonLabel });
			}
		}
		const rows = groupedAbsences.map(({ student, dates, reasonLabel }) => [
				...(exportReportType === 'student' ? [] : [student.firstName + ' ' + student.lastName]),
				...(includeClassColumn ? [student.className] : []),
				formatExportDates(dates),
				reasonLabel
			]);
		const reportTitle = exportReportType === 'student'
			? (isArabic ? 'سجل غياب التلميذ' : 'Student Absence Record')
			: (isArabic ? 'سجل غياب القسم' : 'Class Absence Record');
		const classLabel = exportClass === 'all' ? (isArabic ? 'جميع الأقسام' : 'All classes') : exportClass;
		const studentDetails = selectedStudentForExport
			? `${isArabic ? 'التلميذ' : 'Student'}: ${selectedStudentForExport.firstName} ${selectedStudentForExport.lastName} · ${isArabic ? 'القسم' : 'Class'}: ${selectedStudentForExport.className}`
			: `${isArabic ? 'القسم' : 'Class'}: ${classLabel}`;
		try {
			await exportReportPdf({
				title: reportTitle,
				period: `${studentDetails} · ${isArabic ? 'تاريخ التقرير' : 'Report date'}: ${reportDate}`,
				columns: [
					...(exportReportType === 'student' ? [] : [isArabic ? 'التلميذ' : 'Student']),
					...(includeClassColumn ? [isArabic ? 'القسم' : 'Class'] : []),
					isArabic ? 'التواريخ / الفترات' : 'Dates / periods',
					isArabic ? 'السبب' : 'Reason'
				],
				rows,
				fileName: `Absences_${exportReportType === 'student' ? selectedStudentForExport?.firstName ?? 'student' : classLabel}`,
				direction: isArabic ? 'rtl' : 'ltr'
			});
			exportModalOpen = false;
		} catch (error) {
			console.error('Could not export absence report:', error);
			showToast(isArabic ? 'تعذر تصدير التقرير. حاول مرة أخرى.' : 'Unable to export the report. Please try again.', 'error');
		} finally {
			exporting = false;
		}
	}
</script>

<svelte:head><title>{isArabic ? 'الغيابات | فضاء المتابعة' : 'Absences | Follow-up Portal'}</title></svelte:head>

<section class="records-page absence-page" aria-labelledby="absences-title">
	<header class="page-heading"><div><p class="eyebrow">{isArabic ? 'متابعة الغياب' : 'ABSENCE RECORDS'}</p><h1 id="absences-title">{isArabic ? 'الغيابات' : 'Absences'}</h1><p>{isArabic ? 'سجل غيابات التلاميذ' : 'Student absence records'}</p></div><div class="absence-header-actions"><button class="records-button" type="button" onclick={openRecordsSheet}><AppIcon name="attendance" size={16} /><span>{isArabic ? 'سجل الغياب' : 'Absence log'}</span></button><button class="export-button" type="button" onclick={openExportModal}><AppIcon name="attendance" size={18} />{isArabic ? 'تصدير PDF' : 'Export PDF'}</button></div></header>
	<section class="workflow-setup" aria-label={isArabic ? 'اختيار القسم والتلميذ' : 'Choose class and student'}>
		<div class="class-selection"><div class="section-heading"><h2>{isArabic ? 'القسم' : 'Class'}</h2></div><div class="class-chips" role="group" aria-label={isArabic ? 'الأقسام' : 'Classes'}>{#each classOptions as className}<button class:active={studentClass === className} type="button" aria-pressed={studentClass === className} onclick={() => chooseClass(className)}>{className}</button>{/each}</div></div>
		{#if studentClass}
			<div class="compact-student-picker"><div class="section-heading"><h2>{isArabic ? 'التلميذ' : 'Student'}</h2>{#if selectedStudent}<span>{selectedStudent.className}</span>{/if}</div>
				{#if selectedStudent}<button class="chosen-student" type="button" onclick={() => { selectedStudentId = ''; studentListOpen = true; }}><strong>{selectedStudent.firstName} {selectedStudent.lastName}</strong><span>{isArabic ? 'تغيير' : 'Change'}</span></button>{:else}<button class="open-student-picker" type="button" onclick={() => studentListOpen = true}>{isArabic ? 'اختر تلميذاً' : 'Choose a student'}</button>{/if}
				{#if studentListOpen}<div class="student-picker-list"><label class="search-field" for="student-search"><AppIcon name="students" size={18} /><input id="student-search" type="search" bind:value={studentSearch} placeholder={isArabic ? 'ابحث عن تلميذ...' : 'Search students...'} /></label><div class="student-results">{#each pickerStudents as student (student.id)}<button class="student-option" type="button" onclick={() => chooseStudent(student.id)}><span><strong>{student.firstName} {student.lastName}</strong><small>{student.className}</small></span></button>{:else}<p class="picker-empty">{isArabic ? 'لا يوجد تلميذ مطابق.' : 'No matching students.'}</p>{/each}</div></div>{/if}
			</div>
		{/if}
	</section>
	<div class="calendar-layout">
		<section class="calendar-panel" aria-label={isArabic ? 'تقويم الغيابات' : 'Absence calendar'}>
			<div class="calendar-heading"><div><p class="eyebrow">{isArabic ? 'التقويم' : 'CALENDAR'}</p><h2>{monthLabel}</h2></div><div class="month-actions"><button type="button" aria-label={isArabic ? 'الشهر السابق' : 'Previous month'} onclick={() => changeMonth(-1)}>‹</button><button class="today-button" type="button" onclick={jumpToToday}>{isArabic ? 'اليوم' : 'Today'}</button><button type="button" aria-label={isArabic ? 'الشهر التالي' : 'Next month'} onclick={() => changeMonth(1)}>›</button></div></div>
			<div class="calendar-tools filters"><div class="mode-toggle" role="group" aria-label={isArabic ? 'طريقة تحديد الأيام' : 'Date selection mode'}><button class:active={selectionMode === 'days'} type="button" aria-pressed={selectionMode === 'days'} onclick={() => { selectionMode = 'days'; rangeAnchor = ''; }}>{isArabic ? 'أيام متعددة' : 'Multiple dates'}</button><button class:active={selectionMode === 'range'} type="button" aria-pressed={selectionMode === 'range'} onclick={() => { selectionMode = 'range'; rangeAnchor = ''; }}>{isArabic ? 'فترة متصلة' : 'Date range'}</button></div><button class="week-button" type="button" onclick={selectWeek}>{isArabic ? 'تحديد الأسبوع' : 'Select week'}</button></div>
			{#if selectionMode === 'range' && rangeAnchor}<p class="range-hint">{isArabic ? 'اختر نهاية الفترة.' : 'Select the end of the range.'}</p>{/if}
			<div class="weekday-grid" aria-hidden="true">{#each weekdays as weekday}<span>{weekday}</span>{/each}</div>
			<div class="calendar-grid">{#each calendarCells as cell (cell.key)}{@const dayAbsences = absencesOnDate(cell.key)}<button class="day-cell" class:outside-month={!cell.inMonth} class:weekend={!cell.schoolDay && !dayAbsences.length} class:has-absence={dayAbsences.length > 0} class:has-justified={dayAbsences.some((record) => periodForDate(record.studentId, cell.key)?.reason)} class:selected={selectedDates.includes(cell.key)} class:today={cell.key === today} type="button" disabled={!cell.inMonth || !selectedStudentId || !canSelectDate(cell.key)} aria-pressed={selectedDates.includes(cell.key)} aria-label={`${formatDate(cell.key)}${dayAbsences.length ? `, ${dayAbsences.length} ${isArabic ? 'غياب' : 'absences'}` : ''}`} onclick={() => selectDate(cell.key)}><span>{new Intl.NumberFormat('en-US').format(cell.day)}</span>{#if dayAbsences.length}<small>{new Intl.NumberFormat('en-US').format(dayAbsences.length)}</small>{/if}</button>{/each}</div>
			<div class="calendar-legend"><span><i class="legend-selected"></i>{isArabic ? 'تاريخ محدد' : 'Selected'}</span><span><i class="legend-absence"></i>{isArabic ? 'غياب مسجل' : 'Recorded absence'}</span>{#if !periodUnavailable}<span><i class="legend-justified"></i>{isArabic ? 'مبرر' : 'Justified'}</span>{/if}</div>
		</section>
	</div>
	{#if sheetOpen && selectedStudent && sortedDates.length}
		<div class="absence-sheet-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeSheet()}>
			<dialog open class="absence-sheet" aria-modal="true" aria-labelledby="absence-sheet-title">
				<div class="sheet-heading"><div><p class="eyebrow">{isArabic ? 'تسجيل غياب' : 'RECORD ABSENCE'}</p><h2 id="absence-sheet-title">{selectedStudent.firstName} {selectedStudent.lastName}</h2><span>{selectedStudent.className} · {selectionLabel}</span></div><button type="button" aria-label={isArabic ? 'إغلاق' : 'Close'} onclick={closeSheet}>×</button></div>
				<div class="reason-section"><h3>{isArabic ? 'سبب الغياب' : 'Absence reason'}</h3><div class="reason-options">{#each absenceReasons as option}<button class:active={reason === option.id} type="button" aria-pressed={reason === option.id} onclick={() => reason = option.id}>{isArabic ? option.ar : option.en}</button>{/each}</div>{#if reason === 'other'}<label class="other-reason"><span>{isArabic ? 'اكتب السبب' : 'Describe the reason'}</span><input bind:value={reasonNotes} maxlength="500" /></label>{/if}<label class="file-picker"><span aria-hidden="true">📎</span>{documentFile ? documentFile.name : (isArabic ? 'إضافة وثيقة' : 'Add document')}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onchange={setDocument} /></label></div>
				<div class="confirmation-actions"><button class="cancel-button" type="button" onclick={cancelDraft}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button class="save-button" type="button" disabled={saving || (periodUnavailable && Boolean(documentFile)) || (reason === 'other' && !reasonNotes.trim())} onclick={saveAbsence}>{saving ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : (isArabic ? 'حفظ الغياب' : 'Save absence')}</button></div>
			</dialog>
		</div>
	{/if}
	{#if exportModalOpen}
		<div class="export-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeExportModal()}>
			<dialog open class="absence-export-modal" aria-labelledby="absence-export-title" aria-modal="true">
				<button class="export-modal-close" type="button" aria-label={isArabic ? 'إغلاق' : 'Close'} onclick={closeExportModal}>×</button>
				<p class="eyebrow">{isArabic ? 'تصدير السجل' : 'EXPORT RECORDS'}</p>
				<h2 id="absence-export-title">{isArabic ? 'تصدير الغيابات إلى PDF' : 'Export absences to PDF'}</h2>
				<label class="export-field"><span>{isArabic ? 'القسم' : 'Class'}</span><select value={exportClass} onchange={changeExportClass}><option value="all">{isArabic ? 'جميع الأقسام' : 'All classes'}</option>{#each exportClassOptions.slice(1) as className}<option value={className}>{className}</option>{/each}</select></label>
				<fieldset class="export-type-options"><legend>{isArabic ? 'نوع السجل' : 'Report type'}</legend><button class:active={exportReportType === 'class'} type="button" aria-pressed={exportReportType === 'class'} onclick={() => { exportReportType = 'class'; exportStudentId = ''; }}>{isArabic ? 'سجل غياب القسم' : 'Class absence record'}</button><button class:active={exportReportType === 'student'} type="button" aria-pressed={exportReportType === 'student'} onclick={() => exportReportType = 'student'}>{isArabic ? 'سجل تلميذ محدد' : 'Selected student record'}</button></fieldset>
				{#if exportReportType === 'student'}
					<div class="export-student-picker"><label class="search-field" for="export-student-search"><AppIcon name="students" size={18} /><input id="export-student-search" type="search" bind:value={exportStudentSearch} placeholder={isArabic ? 'ابحث عن تلميذ...' : 'Search students...'} /></label><div class="export-student-results" role="listbox" aria-label={isArabic ? 'التلاميذ' : 'Students'}>{#each exportPickerStudents as student (student.id)}<button class="export-student-option" type="button" role="option" aria-selected={exportStudentId === student.id} onclick={() => exportStudentId = student.id}><span>{student.firstName} {student.lastName}</span><small>{student.className}</small></button>{:else}<p class="picker-empty">{isArabic ? 'لا يوجد تلميذ مطابق.' : 'No matching students.'}</p>{/each}</div>{#if exportStudentId && !exportPickerStudents.some((student) => student.id === exportStudentId)}{@const chosenExportStudent = students.find((student) => student.id === exportStudentId)}{#if chosenExportStudent}<p class="selected-export-student">{chosenExportStudent.firstName} {chosenExportStudent.lastName} · {chosenExportStudent.className}</p>{/if}{/if}</div>
				{/if}
				{#if !exportableAbsences.length}<p class="export-empty">{exportReportType === 'student' && !exportStudentId ? (isArabic ? 'اختر تلميذاً لعرض سجله.' : 'Choose a student to view their record.') : (isArabic ? 'لا توجد غيابات محفوظة للاختيار.' : 'No saved absences for this selection.')}</p>{/if}
				<div class="confirmation-actions"><button class="cancel-button" type="button" onclick={closeExportModal} disabled={exporting}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button class="save-button" type="button" onclick={exportAbsences} disabled={exporting || !exportableAbsences.length || (exportReportType === 'student' && !exportStudentId)}>{exporting ? (isArabic ? 'جارٍ التصدير...' : 'Exporting...') : (isArabic ? 'تصدير PDF' : 'Export PDF')}</button></div>
			</dialog>
		</div>
	{/if}
	{#if recordsSheetOpen}<div class="records-sheet-backdrop" role="presentation" onclick={closeRecordsSheet}></div>{/if}
	<section class:mobile-open={recordsSheetOpen} class="records-section" aria-labelledby="absence-records-title" role={recordsSheetOpen ? 'dialog' : undefined} aria-modal={recordsSheetOpen ? 'true' : undefined}><div class="records-heading"><div><p class="eyebrow">{isArabic ? 'السجل' : 'SAVED RECORDS'}</p><h2 id="absence-records-title">{isArabic ? 'غيابات التلاميذ' : 'Student absences'}</h2></div><span>{new Intl.NumberFormat('en-US').format(visibleAbsences.length)}</span><button class="records-sheet-close" type="button" aria-label={isArabic ? 'إغلاق سجل الغياب' : 'Close absence records'} onclick={closeRecordsSheet}>×</button></div><div class="record-filters filters"><label class="search-field" for="absence-search"><AppIcon name="students" size={18} /><input id="absence-search" type="search" bind:value={searchTerm} placeholder={isArabic ? 'البحث عن تلميذ...' : 'Search students...'} /></label><label class="compact-filter"><span>{isArabic ? 'الشهر' : 'Month'}</span><input type="month" bind:value={recordMonth} /></label></div><div class="record-class-chips" aria-label={isArabic ? 'تصفية السجل حسب القسم' : 'Filter records by class'}><button class:active={recordClass === 'all'} type="button" onclick={() => recordClass = 'all'}>{isArabic ? 'جميع الأقسام' : 'All classes'}</button>{#each classOptions as className}<button class:active={recordClass === className} type="button" onclick={() => recordClass = className}>{className}</button>{/each}</div>
		<p class="result-count" aria-live="polite">{new Intl.NumberFormat('en-US').format(visibleAbsences.length)} {isArabic ? 'غياب مسجل' : 'recorded absences'}</p>
		{#if visibleAbsences.length}<div class="absence-list">{#each visibleAbsences as item (item.id)}<article class="absence-record"><div class="absence-record-person"><strong>{item.student.firstName} {item.student.lastName}</strong><span>{item.student.className}</span></div><div class="absence-record-details"><time datetime={item.startDate}>{item.startDate === item.endDate ? formatDate(item.startDate) : `${formatDate(item.startDate)} → ${formatDate(item.endDate)}`}</time><span>{item.reasonAvailable ? item.period?.reason ? reasonName(item.period.reason, item.period.reason_notes ?? '') : (isArabic ? 'غياب غير مبرر' : 'Unjustified absence') : (isArabic ? 'تفاصيل السبب غير متاحة' : 'Reason details unavailable')}</span></div><button class="record-reason-action" type="button" aria-label={item.period?.reason ? (isArabic ? 'تعديل سبب الغياب' : 'Edit absence reason') : (isArabic ? 'إضافة سبب الغياب' : 'Add absence reason')} title={item.period?.reason ? (isArabic ? 'تعديل السبب' : 'Edit reason') : (isArabic ? 'إضافة السبب' : 'Add reason')} onclick={() => { closeRecordsSheet(); editAbsenceReason(item); }}>+</button>{#if item.period?.document_name}<span class="attachment-indicator" aria-label={isArabic ? 'وثيقة مرفقة' : 'Attachment'} title={item.period.document_name}><span aria-hidden="true">📎</span><small>{item.period.document_name}</small></span>{/if}</article>{/each}</div>{:else}<div class="empty-state">{isArabic ? 'لا توجد غيابات مطابقة.' : 'No absences match these filters.'}</div>{/if}
	</section>
</section>
{#if toast}
	<div class="toast-container" aria-live={toast.type === 'error' ? 'assertive' : 'polite'} aria-atomic="true">
		<div class:success={toast.type === 'success'} class:error={toast.type === 'error'} class="absence-toast" role={toast.type === 'error' ? 'alert' : 'status'} transition:fly={{ y: 10, duration: 170 }}>{toast.message}</div>
	</div>
{/if}

<style>
	.records-page{animation:page-in 350ms ease both}.page-heading{margin-bottom:1rem}.eyebrow{margin:0 0 .35rem;color:var(--app-accent);font-size:.78rem;font-weight:700}h1,p{margin-top:0}h1{margin-bottom:.25rem;font-size:clamp(1.55rem,4vw,2.2rem)}.page-heading p:last-child{margin:0;color:var(--app-muted);font-size:.9rem}.filters{display:flex;align-items:end;gap:.55rem;margin-bottom:.65rem;padding:.7rem;border:1px solid var(--app-border);background:var(--app-surface)}.filters label:not(.search-field){display:flex;min-width:8rem;flex-direction:column;gap:.2rem;color:var(--app-muted);font-size:.72rem}.search-field{display:flex;min-height:2.6rem;flex:1;align-items:center;gap:.45rem;padding:0 .6rem;border:1px solid var(--app-border);color:var(--app-accent)}input,select{min-height:2.6rem;padding:.45rem;border:1px solid var(--app-border);background:var(--app-surface-strong);color:var(--app-text);font:inherit}.search-field input{width:100%;border:0;outline:0;background:transparent}.result-count{color:var(--app-muted);font-size:.8rem}.table-wrap{overflow-x:auto;border:1px solid var(--app-border);background:var(--app-surface);box-shadow:var(--app-shadow)}table{width:100%;border-collapse:collapse}th,td{padding:.6rem .75rem;border-bottom:1px solid var(--app-border);text-align:start}th{background:var(--app-surface-soft);color:var(--app-muted);font-size:.75rem}td{font-size:.86rem}.empty-state{padding:1.3rem;border:1px dashed var(--app-border);color:var(--app-muted);text-align:center}@keyframes page-in{from{opacity:0;transform:translateY(.3rem)}to{opacity:1;transform:translateY(0)}}@media(max-width:650px){.filters{align-items:stretch;flex-direction:column}.filters label:not(.search-field){min-width:0}.table-wrap{overflow:visible;border:0;background:transparent;box-shadow:none}table{display:block}thead{display:none}tbody{display:grid;gap:.35rem}tr{display:grid;grid-template-columns:1fr 1fr;gap:.25rem .6rem;padding:.65rem;border:1px solid var(--app-border);background:var(--app-surface)}td{padding:.15rem 0;border:0}td:first-child{grid-column:1/-1;font-weight:700}}@media(prefers-reduced-motion:reduce){.records-page{animation:none}}
	.absence-page { --absence-accent:#8a1538; --absence-accent-soft:#f3e5e9; animation:none; }
	.page-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; }
	.page-heading h1 { margin-bottom:.25rem; }
	.page-heading p:last-child { color:var(--app-muted); font-size:1rem; }
	.eyebrow { color:var(--app-accent); font-size:.75rem; font-weight:800; }
	.export-button { display:flex; min-height:2.75rem; align-items:center; gap:.4rem; padding:.45rem .7rem; border:1px solid var(--app-border); border-radius:.5rem; background:var(--app-surface); color:var(--app-accent); cursor:pointer; font:inherit; font-size:.95rem; font-weight:750; }
	.export-button:disabled { cursor:not-allowed; opacity:.45; }
	.toast-container { position:fixed; z-index:250; inset-inline:0; bottom:calc(env(safe-area-inset-bottom) + 1rem); display:flex; justify-content:center; padding:0 1rem; pointer-events:none; }
	.absence-toast { width:max-content; max-width:min(100%,36rem); padding:.7rem 1rem; border:1px solid var(--app-border); border-inline-start:4px solid var(--app-accent); border-radius:.65rem; background:var(--app-surface); color:var(--app-text); box-shadow:0 8px 26px rgb(35 26 28 / 16%); font-size:.98rem; line-height:1.45; text-align:center; overflow-wrap:anywhere; }
	.absence-toast.success { border-inline-start-color:var(--app-success); }
	.absence-toast.error { border-inline-start-color:var(--app-danger); }
	.calendar-layout { display:grid; grid-template-columns:minmax(0,1fr); align-items:start; gap:1rem; }
	.calendar-panel,.records-section { min-width:0; border:1px solid var(--app-border); border-radius:.65rem; background:var(--app-surface); box-shadow:var(--app-shadow); }
	.calendar-panel { padding:.9rem; }
	.calendar-heading,.section-heading,.records-heading { display:flex; align-items:center; justify-content:space-between; gap:.65rem; }
	.calendar-heading h2,.section-heading h2,.records-heading h2 { margin:0; font-size:1.1rem; }
	.month-actions { display:flex; align-items:center; gap:.2rem; }
	.month-actions button { display:grid; min-width:2.7rem; min-height:2.7rem; place-items:center; border:1px solid var(--app-border); border-radius:.45rem; background:var(--app-surface); color:var(--app-text); cursor:pointer; font:inherit; font-size:1.55rem; line-height:1; }
	.month-actions .today-button { min-width:3.5rem; padding:0 .4rem; color:var(--app-accent); font-size:.9rem; font-weight:750; }
	.calendar-tools.filters { display:flex; align-items:center; justify-content:space-between; gap:.45rem; margin:.7rem 0 .4rem; padding:0; border:0; background:transparent; }
	.mode-toggle { display:flex; gap:.18rem; padding:.16rem; border:1px solid var(--app-border); border-radius:.5rem; background:var(--app-surface-soft); }
	.mode-toggle button,.week-button { min-height:2.5rem; padding:.4rem .55rem; border:1px solid transparent; border-radius:.4rem; background:transparent; color:var(--app-muted); cursor:pointer; font:inherit; font-size:.88rem; font-weight:700; white-space:nowrap; }
	.mode-toggle button.active { border-color:var(--app-border); background:var(--app-surface); color:var(--app-accent); }
	.week-button { border-color:var(--app-border); background:var(--app-surface); color:var(--app-accent); }
	.range-hint { margin:.25rem 0; color:var(--app-accent); font-size:.9rem; }
	.weekday-grid,.calendar-grid { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:.2rem; }
	.weekday-grid { margin-bottom:.2rem; }
	.weekday-grid span { display:grid; min-width:0; min-height:1.9rem; place-items:center; overflow:hidden; color:var(--app-muted); font-size:.8rem; font-weight:700; white-space:nowrap; }
	.day-cell { position:relative; display:grid; min-width:0; min-height:2.9rem; place-items:center; border:1px solid transparent; border-radius:.45rem; background:var(--app-surface); color:var(--app-text); cursor:pointer; font:inherit; font-size:1rem; font-weight:650; transition:background 120ms ease,border-color 120ms ease,transform 120ms ease; }
	.day-cell:hover:not(:disabled) { border-color:color-mix(in srgb,var(--app-accent) 35%,var(--app-border)); background:var(--app-accent-soft); }
	.day-cell:active:not(:disabled) { transform:scale(.96); }
	.day-cell:disabled { color:var(--app-muted); cursor:default; opacity:.4; }
	.day-cell.outside-month { visibility:hidden; }
	.day-cell.selected { border-color:var(--app-accent); background:var(--app-accent); color:#fff; }
	.day-cell.today:not(.selected) { border-color:var(--app-accent); color:var(--app-accent); font-weight:850; }
	.day-cell.has-absence:not(.selected) { background:#fff1f2; color:#9c2941; }
	.day-cell.has-justified:not(.selected) { box-shadow:inset 0 -3px #538668; }
	.day-cell small { position:absolute; inset-inline-end:.16rem; inset-block-start:.06rem; font-size:.58rem; line-height:1; color:inherit; }
	.calendar-legend { display:flex; flex-wrap:wrap; gap:.65rem; margin-top:.6rem; color:var(--app-muted); font-size:.75rem; }
	.calendar-legend span { display:flex; align-items:center; gap:.25rem; }
	.calendar-legend i { width:.62rem; height:.62rem; border-radius:50%; background:var(--app-accent); }
	.calendar-legend .legend-absence { background:#c45467; }
	.calendar-legend .legend-justified { background:#538668; }
	.workflow-setup { display:grid; gap:.45rem; margin:0 0 .65rem; padding:.65rem; border:1px solid var(--app-border); border-radius:.6rem; background:var(--app-surface); }
	.class-selection,.compact-student-picker { min-width:0; }
	.workflow-setup .section-heading { margin:0 0 .25rem; }
	.workflow-setup .class-chips { padding:.2rem 0; }
	.compact-student-picker { position:relative; }
	.chosen-student,.open-student-picker { display:flex; width:100%; min-height:2.75rem; align-items:center; justify-content:space-between; gap:.5rem; padding:.4rem .6rem; border:1px solid var(--app-border); border-radius:.45rem; background:var(--app-surface); color:var(--app-text); cursor:pointer; font:inherit; text-align:start; }
	.chosen-student strong { font-size:1rem; }
	.chosen-student span { color:var(--app-accent); font-size:.85rem; }
	.open-student-picker { color:var(--app-muted); }
	.student-picker-list { position:absolute; z-index:8; inset-inline:0; top:100%; display:grid; gap:.35rem; padding:.45rem; border:1px solid var(--app-border); border-radius:.5rem; background:var(--app-surface); box-shadow:var(--app-shadow); }
	.reason-section { padding:.15rem 0; }
	.reason-section h3 { margin:0 0 .45rem; font-size:1rem; }
	.section-heading { margin-bottom:.45rem; }
	.section-heading span { color:var(--app-muted); font-size:.8rem; }
	.search-field { display:flex; min-height:2.8rem; align-items:center; gap:.45rem; padding:0 .6rem; border:1px solid var(--app-border); border-radius:.55rem; background:var(--app-surface); color:var(--app-accent); }
	.search-field:focus-within { border-color:var(--app-accent); box-shadow:0 0 0 3px color-mix(in srgb,var(--app-accent) 16%,transparent); }
	.search-field input { width:100%; min-width:0; min-height:2.6rem; padding:0; border:0; outline:0; background:transparent; color:var(--app-text); font:inherit; font-size:1rem; }
	.search-field input:focus-visible { outline:none; }
	.search-field input::placeholder { color:var(--app-muted); opacity:1; }
	.class-chips,.record-class-chips { display:flex; gap:.3rem; overflow-x:auto; padding:.4rem 0; scrollbar-width:thin; }
	.class-chips button,.record-class-chips button { min-height:2.4rem; flex:0 0 auto; padding:.35rem .55rem; border:1px solid var(--app-border); border-radius:99px; background:var(--app-surface); color:var(--app-muted); cursor:pointer; font:inherit; font-size:.82rem; white-space:nowrap; }
	.class-chips button.active,.record-class-chips button.active { border-color:var(--app-accent); background:var(--app-accent-soft); color:var(--app-accent); font-weight:750; }
	.student-results { display:grid; max-height:12rem; overflow:auto; overscroll-behavior:contain; border:1px solid var(--app-border); border-radius:.45rem; }
	.student-option { display:flex; min-height:3rem; align-items:center; justify-content:space-between; gap:.5rem; padding:.4rem .6rem; border:0; border-bottom:1px solid var(--app-border); background:var(--app-surface); color:var(--app-text); cursor:pointer; font:inherit; text-align:start; }
	.student-option:last-child { border-bottom:0; }
	.student-option > span:first-child { display:grid; gap:.08rem; }
	.student-option strong { font-size:1rem; }
	.student-option small { color:var(--app-muted); font-size:.8rem; }
	.picker-empty { margin:0; padding:.65rem; color:var(--app-muted); font-size:.9rem; }
	.reason-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.3rem; }
	.reason-options button { min-height:2.75rem; padding:.4rem .5rem; border:1px solid var(--app-border); border-radius:.45rem; background:var(--app-surface); color:var(--app-text); cursor:pointer; font:inherit; font-size:.9rem; text-align:start; }
	.reason-options button.active { border-color:var(--app-accent); background:var(--app-accent-soft); color:var(--app-accent); font-weight:750; }
	.other-reason { display:grid; gap:.25rem; margin-top:.5rem; color:var(--app-muted); font-size:.85rem; }
	.other-reason input { min-height:2.6rem; padding:.4rem .5rem; border:1px solid var(--app-border); border-radius:.4rem; background:var(--app-surface); color:var(--app-text); font:inherit; font-size:1rem; }
	.file-picker { display:flex; min-height:2.65rem; align-items:center; gap:.4rem; width:fit-content; max-width:100%; margin-top:.55rem; padding:.4rem .6rem; border:1px dashed var(--app-accent); border-radius:.45rem; color:var(--app-accent); cursor:pointer; font-size:.9rem; font-weight:700; overflow-wrap:anywhere; }
	.file-picker input { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
	.file-picker:focus-within { outline:3px solid color-mix(in srgb,var(--app-accent) 25%,transparent); outline-offset:2px; }
	.confirmation-actions { display:flex; gap:.4rem; margin-top:.65rem; }
	.confirmation-actions button { min-height:2.8rem; padding:.4rem .7rem; border-radius:.45rem; cursor:pointer; font:inherit; font-size:.95rem; font-weight:750; }
	.cancel-button { border:1px solid var(--app-border); background:var(--app-surface); color:var(--app-muted); }
	.save-button { flex:1; border:1px solid var(--app-accent); background:var(--app-accent); color:#fff; }
	.save-button:disabled { opacity:.5; cursor:not-allowed; }
	.records-section { margin-top:1.1rem; padding:.8rem; }
	.records-heading { display:flex; align-items:center; justify-content:space-between; gap:.5rem; margin-bottom:.6rem; }
	.records-heading h2 { margin:0; font-size:1.1rem; }
	.records-heading > span { display:grid; min-width:2.3rem; min-height:2.3rem; place-items:center; border-radius:50%; background:var(--app-accent-soft); color:var(--app-accent); font-weight:800; }
	.record-filters.filters { display:grid; grid-template-columns:minmax(12rem,1fr) minmax(8rem,.4fr); align-items:end; gap:.45rem; margin:0; padding:0; border:0; background:transparent; }
	.compact-filter { display:grid; gap:.2rem; color:var(--app-muted); font-size:.8rem; }
	.compact-filter input { width:100%; min-width:0; min-height:2.7rem; padding:.35rem; border:1px solid var(--app-border); border-radius:.45rem; background:var(--app-surface); color:var(--app-text); font:inherit; font-size:.95rem; }
	.record-class-chips { display:flex; gap:.3rem; overflow-x:auto; padding:.4rem 0; }
	.absence-list { display:grid; border-top:1px solid var(--app-border); }
	.absence-record { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto auto; align-items:center; gap:.6rem; padding:.5rem .2rem; border-bottom:1px solid var(--app-border); }
	.absence-record-person,.absence-record-details { display:grid; min-width:0; gap:.12rem; }
	.absence-record-person strong { overflow:hidden; font-size:.98rem; text-overflow:ellipsis; white-space:nowrap; }
	.absence-record-person span,.absence-record-details span { color:var(--app-muted); font-size:.84rem; }
	.absence-record-details time { font-size:.92rem; font-weight:650; }
	.record-reason-action { display:grid; width:2.55rem; height:2.55rem; place-items:center; border:1px solid var(--app-border); border-radius:50%; background:var(--app-surface); color:var(--app-accent); cursor:pointer; font:inherit; font-size:1.4rem; font-weight:600; line-height:1; }
	.record-reason-action:hover { border-color:var(--app-accent); background:var(--app-accent-soft); }
	.attachment-indicator { display:flex; max-width:8rem; align-items:center; gap:.25rem; color:var(--app-accent); }
	.attachment-indicator small { overflow:hidden; font-size:.75rem; text-overflow:ellipsis; white-space:nowrap; }
	.absence-sheet-backdrop { position:fixed; z-index:130; inset:0; display:flex; align-items:flex-end; justify-content:center; padding-top:1rem; background:rgb(20 25 23 / 42%); }
	.export-backdrop { position:fixed; z-index:140; inset:0; display:grid; place-items:center; padding:1rem; background:rgb(20 25 23 / 48%); backdrop-filter:blur(2px); }
	.absence-export-modal { position:relative; width:min(100%,32rem); max-height:calc(100dvh - 2rem); overflow:auto; margin:auto; padding:1rem; border:1px solid var(--app-border); border-radius:.65rem; background:var(--app-surface); color:var(--app-text); box-shadow:0 18px 50px rgb(0 0 0 / 20%); }
	.absence-export-modal h2 { margin:0 2rem .8rem 0; font-size:1.15rem; }
	.export-modal-close { position:absolute; inset-block-start:.55rem; inset-inline-end:.55rem; display:grid; width:2.2rem; height:2.2rem; place-items:center; border:1px solid var(--app-border); border-radius:.4rem; background:var(--app-surface); color:var(--app-muted); cursor:pointer; font:inherit; font-size:1.35rem; }
	.export-field { display:grid; gap:.25rem; color:var(--app-muted); font-size:.85rem; }
	.export-field select { width:100%; min-width:0; border-radius:.4rem; font:inherit; }
	.export-type-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.35rem; margin:.75rem 0 0; padding:0; border:0; }
	.export-type-options legend { margin-bottom:.3rem; color:var(--app-muted); font-size:.85rem; }
	.export-type-options button { min-height:2.7rem; padding:.45rem; border:1px solid var(--app-border); border-radius:.4rem; background:var(--app-surface); color:var(--app-text); cursor:pointer; font:inherit; font-size:.85rem; }
	.export-type-options button.active { border-color:var(--app-accent); background:var(--app-accent-soft); color:var(--app-accent); font-weight:750; }
	.export-student-picker { display:grid; gap:.35rem; margin-top:.7rem; }
	.export-student-results { display:grid; max-height:10rem; overflow:auto; border:1px solid var(--app-border); border-radius:.4rem; }
	.export-student-option { display:flex; min-height:2.7rem; align-items:center; justify-content:space-between; gap:.5rem; padding:.4rem .55rem; border:0; border-bottom:1px solid var(--app-border); background:var(--app-surface); color:var(--app-text); cursor:pointer; font:inherit; text-align:start; }
	.export-student-option:last-child { border-bottom:0; }
	.export-student-option[aria-selected="true"] { background:var(--app-accent-soft); color:var(--app-accent); }
	.export-student-option small { color:var(--app-muted); }
	.selected-export-student,.export-empty { margin:.35rem 0 0; color:var(--app-muted); font-size:.82rem; }
	.absence-sheet { position:relative; width:min(100%,34rem); max-height:min(70dvh,34rem); overflow:auto; margin:0; padding:1rem; border:1px solid var(--app-border); border-radius:.8rem .8rem 0 0; background:var(--app-surface); color:var(--app-text); box-shadow:0 -8px 28px rgb(0 0 0 / 14%); }
	.sheet-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:.7rem; margin-bottom:.7rem; }
	.sheet-heading h2 { margin:0 0 .12rem; font-size:1.15rem; }
	.sheet-heading span { color:var(--app-muted); font-size:.92rem; }
	.sheet-heading > button { display:grid; width:2.5rem; height:2.5rem; flex:0 0 2.5rem; place-items:center; border:1px solid var(--app-border); border-radius:.45rem; background:var(--app-surface); color:var(--app-muted); cursor:pointer; font-size:1.25rem; }
	.absence-sheet .reason-options { grid-template-columns:repeat(3,minmax(0,1fr)); }
	.absence-sheet .reason-options button { text-align:center; }
	.empty-state { padding:1.1rem; color:var(--app-muted); text-align:center; }
	@media (max-width:760px) {
		.absence-page { animation:none; }
		.page-heading { align-items:center; }
		.calendar-layout { grid-template-columns:1fr; gap:.65rem; }
		.calendar-panel { padding:.65rem; }
		.calendar-tools.filters { align-items:stretch; }
		.mode-toggle { flex:1; }
		.mode-toggle button { flex:1; min-height:2.8rem; padding:.35rem; font-size:.85rem; }
		.week-button { min-height:2.8rem; font-size:.82rem; }
		.day-cell { min-height:2.8rem; }
		.workflow-setup { padding:.5rem; }
		.student-option { min-height:3.1rem; }
		.student-option strong { font-size:1.1rem; }
		.reason-options button { min-height:2.9rem; font-size:.95rem; }
		.record-filters.filters { grid-template-columns:minmax(0,1fr) minmax(7rem,.65fr); }
		.absence-list { border-top:0; }
		.absence-record { grid-template-columns:minmax(0,1fr) auto auto; gap:.25rem .4rem; padding:.5rem .2rem; }
		.absence-record-person { grid-column:1; grid-row:1; }
		.absence-record-details { grid-column:1; grid-row:2; }
		.record-reason-action { grid-column:2; grid-row:1 / 3; width:2.65rem; height:2.65rem; }
		.attachment-indicator { grid-column:3; grid-row:1 / 3; }
		.absence-sheet { padding:.85rem; }
		.export-type-options { grid-template-columns:1fr; }
		.absence-sheet .reason-options { grid-template-columns:repeat(2,minmax(0,1fr)); }
	}
	@media (max-width:390px) {
		.calendar-panel { padding:.5rem; }
		.calendar-tools.filters { gap:.25rem; }
		.week-button { padding:.3rem .4rem; }
		.day-cell { min-height:2.6rem; }
		.record-filters.filters { grid-template-columns:minmax(0,1fr) minmax(6.5rem,.6fr); }
	}
	@media (max-width:760px) {
		.workflow-setup .section-heading h2,.records-heading h2 { font-size:1.05rem; }
		.calendar-heading h2 { font-size:1.2rem; }
		.workflow-setup .class-chips button { min-height:2.4rem; font-size:.95rem; }
		.workflow-setup .section-heading span { font-size:.9rem; }
		.chosen-student,.open-student-picker { min-height:2.5rem; font-size:1rem; }
		.chosen-student strong,.student-option strong { font-size:1.05rem; overflow-wrap:anywhere; }
		.student-option small,.chosen-student span { font-size:.9rem; }
		.search-field input { font-size:1rem; }
		.student-option { min-height:2.7rem; }
		.weekday-grid span { min-height:2.2rem; font-size:1rem; }
		.day-cell { min-height:2.85rem; font-size:1.2rem; }
		.mode-toggle button,.week-button { font-size:1.15rem; }
		.absence-sheet .reason-options button { min-height:2.6rem; font-size:1rem; }
		.sheet-heading h2 { font-size:1.1rem; }
		.absence-record-person strong { font-size:1.05rem; }
		.absence-record-person span,.absence-record-details span { font-size:.9rem; }
		.absence-record-details time { font-size:.95rem; }
		.record-class-chips button { min-height:2.2rem; font-size:.9rem; }
		.result-count { font-size:.9rem; }
		.compact-filter { font-size:.9rem; }
		.compact-filter input { font-size:1rem; }
	}
	.absence-header-actions { display:flex; flex:0 0 auto; align-items:center; gap:.4rem; }
	.records-button { display:flex; min-height:2.75rem; align-items:center; gap:.35rem; padding:.4rem .65rem; border:1px solid var(--app-border); border-radius:.5rem; background:var(--app-surface); color:var(--app-text); cursor:pointer; font:inherit; font-size:.9rem; font-weight:700; }
	.records-sheet-backdrop,.records-sheet-close { display:none; }
	@media (max-width:760px) {
		.page-heading { align-items:center; flex-wrap:wrap; gap:.4rem; }
		.page-heading > div { min-width:0; flex:1 1 9rem; }
		.page-heading h1 { font-size:1.45rem; }
		.page-heading p:last-child { font-size:.85rem; }
		.absence-header-actions { flex:1 1 100%; justify-content:flex-start; gap:.35rem; min-width:0; }
		.absence-header-actions > button { flex:1 1 0; min-width:0; justify-content:center; }
		.export-button,.records-button { min-height:2.25rem; gap:.25rem; padding:.32rem .5rem; border-radius:.4rem; font-size:.85rem; white-space:nowrap; }
		.records-section { display:none; }
		.records-sheet-backdrop { position:fixed; z-index:145; inset:0; display:block; background:rgb(20 25 23 / 46%); backdrop-filter:blur(2px); }
		.records-section.mobile-open { position:fixed; z-index:146; inset-inline:.45rem; bottom:env(safe-area-inset-bottom); display:block; max-height:min(78dvh,48rem); overflow:auto; overscroll-behavior:contain; margin:0; padding:.55rem; border-radius:.65rem .65rem 0 0; }
		.records-section.mobile-open .records-heading { position:sticky; z-index:1; top:-.55rem; margin:-.55rem -.55rem .4rem; padding:.55rem; background:var(--app-surface); }
		.records-sheet-close { display:grid; width:2rem; height:2rem; flex:0 0 2rem; place-items:center; border:1px solid var(--app-border); border-radius:.4rem; background:var(--app-surface); color:var(--app-muted); cursor:pointer; font:inherit; font-size:1.2rem; }
		.records-section .records-heading h2 { font-size:1rem; }
		.records-section .records-heading > span { min-width:1.9rem; min-height:1.9rem; }
		.record-filters.filters { grid-template-columns:minmax(0,1fr) minmax(6rem,.55fr); gap:.3rem; }
		.record-filters .search-field,.compact-filter input { min-height:2.2rem; }
		.record-class-chips { padding:.2rem 0; }
		.record-class-chips button { min-height:2rem; padding:.25rem .4rem; font-size:.78rem; }
		.records-section .result-count { margin:.25rem 0; font-size:.78rem; }
		.absence-list { border-top:1px solid var(--app-border); }
		.absence-record { grid-template-columns:minmax(0,1fr) auto auto; gap:.15rem .3rem; padding:.35rem .1rem; }
		.absence-record-person { grid-column:1; grid-row:1; }
		.absence-record-details { grid-column:1; grid-row:2; gap:.05rem; }
		.absence-record-person strong { overflow:visible; font-size:.98rem; line-height:1.3; white-space:normal; overflow-wrap:anywhere; text-overflow:clip; }
		.absence-record-person span,.absence-record-details span { font-size:.78rem; }
		.absence-record-details time { font-size:.85rem; }
		.record-reason-action { grid-column:2; grid-row:1 / 3; width:1.9rem; height:1.9rem; font-size:1.05rem; }
		.attachment-indicator { grid-column:3; grid-row:1 / 3; max-width:1.8rem; }
		.attachment-indicator small { display:none; }
	}
</style>
