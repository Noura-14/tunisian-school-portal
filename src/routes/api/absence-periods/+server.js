import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { randomUUID } from 'node:crypto';
import { absenceReasons, absenceStorageReason, decodeAbsenceReason, encodeAbsenceReasonDetails } from '$lib/data/absence.js';
import { hasValidSession } from '$lib/server/session.js';
import { supabaseServer } from '$lib/server/supabase.js';

const DOCUMENT_BUCKET = 'absence-documents';
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const DOCUMENT_TYPES = new Map([
	['application/pdf', 'pdf'],
	['image/jpeg', 'jpg'],
	['image/png', 'png'],
	['image/webp', 'webp']
]);
const ABSENCE_REASONS = new Set(absenceReasons.map((item) => item.id));
const UNJUSTIFIED_REASON = 'unjustified';

/** @param {any} error */
function supabaseErrorInfo(error) {
	return {
		code: error?.code ?? null,
		message: error?.message ?? String(error),
		details: error?.details ?? null,
		hint: error?.hint ?? null,
		httpStatus: error?.status ?? error?.statusCode ?? null
	};
}

/** @param {string} fallback @param {any} error @param {number} [status] */
function databaseFailure(fallback, error, status = 503) {
	const diagnostics = { ...supabaseErrorInfo(error), httpStatus: status };
	console.error(fallback, diagnostics);
	return json(dev ? { error: fallback, ...diagnostics } : { error: fallback }, { status });
}

/** @param {string} date */
function isValidDate(date) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
	const parsed = new Date(`${date}T12:00:00Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

/** @param {string} date */
function isSchoolDate(date) {
	return isValidDate(date) && ![5, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());
}

/** @param {string} start @param {string} end */
function schoolDatesBetween(start, end) {
	const dates = [];
	for (const cursor = new Date(`${start}T12:00:00Z`); cursor <= new Date(`${end}T12:00:00Z`); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
		const date = cursor.toISOString().slice(0, 10);
		if (isSchoolDate(date)) dates.push(date);
	}
	return dates;
}

/** @param {string[]} dates */
function groupSchoolDates(dates) {
	/** @type {string[][]} */
	const groups = [];
	for (const date of dates) {
		const previous = groups.at(-1);
		if (!previous) {
			groups.push([date]);
			continue;
		}
		const previousDate = previous.at(-1);
		if (!previousDate) {
			groups.push([date]);
			continue;
		}
		const expectedNext = schoolDatesBetween(previousDate, date);
		if (expectedNext.length === 2 && expectedNext[1] === date) previous.push(date);
		else groups.push([date]);
	}
	return groups;
}

/** @param {any} period */
function serializePeriod(period) {
	const startDate = String(period.start_date).slice(0, 10);
	const endDate = String(period.end_date).slice(0, 10);
	const decodedReason = decodeAbsenceReason(period.reason, period.reason_details);
	return {
		id: period.id,
		student_id: String(period.student_id),
		start_date: startDate,
		end_date: endDate,
		reason: decodedReason.id,
		reason_details: decodedReason.notes || null,
		reason_notes: decodedReason.notes || null,
		document_path: period.document_path ?? null,
		document_name: period.document_name ?? null,
		created_at: period.created_at,
		selected_dates: schoolDatesBetween(startDate, endDate)
	};
}

export async function GET({ cookies }) {
	if (!hasValidSession(cookies)) return json({ error: 'Unauthorized' }, { status: 401 });

	const { data, error } = await supabaseServer
		.from('absence_periods')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		return databaseFailure('Unable to load absence details.', error);
	}

	return json((data ?? []).map(serializePeriod));
}

export async function POST({ request, cookies }) {
	if (!hasValidSession(cookies)) return json({ error: 'Unauthorized' }, { status: 401 });

	let uploadedPath = '';
	let insertedId = '';
	try {
		const form = await request.formData();
		const studentId = String(form.get('student_id') ?? '').trim();
		const reason = String(form.get('reason') ?? '').trim() || UNJUSTIFIED_REASON;
		const reasonNotes = String(form.get('reason_notes') ?? '').trim().slice(0, 500);
		const storedReason = absenceStorageReason(reason);
		const storedReasonDetails = encodeAbsenceReasonDetails(reason, reasonNotes);
		/** @type {string[]} */
		let dates = [];
		try {
			const parsedDates = JSON.parse(String(form.get('dates') ?? ''));
			dates = Array.isArray(parsedDates) ? [...new Set(parsedDates.map(String))].sort() : [];
		} catch {
			dates = [];
		}

		if (!studentId || !dates.length || dates.length > 60 || !dates.every(isValidDate)) {
			return json({ error: 'Select between 1 and 60 valid dates and a student.' }, { status: 400 });
		}
		if (reason !== UNJUSTIFIED_REASON && !ABSENCE_REASONS.has(reason)) return json({ error: 'Invalid absence reason.' }, { status: 400 });
		if (reason === 'other' && !reasonNotes) return json({ error: 'Describe the other reason.' }, { status: 400 });

		const { data: student, error: studentError } = await supabaseServer
			.from('students')
			.select('id')
			.eq('id', studentId)
			.maybeSingle();
		if (studentError || !student) return json({ error: 'Student not found.' }, { status: 404 });

		const { data: existingAttendance, error: attendanceReadError } = await supabaseServer
			.from('attendance')
			.select('date, status')
			.eq('student_id', studentId)
			.in('date', dates);
		if (attendanceReadError) throw attendanceReadError;
		const recordedWeekendAbsences = new Set((existingAttendance ?? []).filter((record) => record.status === 'absent').map((record) => String(record.date).slice(0, 10)));
		if (dates.some((date) => !isSchoolDate(date) && !recordedWeekendAbsences.has(date))) {
			return json({ error: 'Weekend dates can only be selected when an absence is already recorded.' }, { status: 400 });
		}
		const document = form.get('document');

		const { data: existingPeriods, error: periodReadError } = await supabaseServer
			.from('absence_periods')
			.select('start_date, end_date')
			.eq('student_id', studentId);
		const periodStorageAvailable = !periodReadError;
		if (periodReadError?.code === '42501') {
			console.warn('Absence period access unavailable; falling back to attendance reason columns.', supabaseErrorInfo(periodReadError));
		}
		if (periodReadError && periodReadError.code !== '42501') throw periodReadError;
		if (document && typeof document !== 'string' && document.size > 0 && !periodStorageAvailable) {
			return json({ error: 'Unable to save the absence.' }, { status: 503 });
		}
		if (periodStorageAvailable && dates.some((date) => (existingPeriods ?? []).some((period) => date >= String(period.start_date).slice(0, 10) && date <= String(period.end_date).slice(0, 10)))) {
			return json({ error: 'One or more selected dates already have absence details.' }, { status: 409 });
		}

		let documentName = '';
		if (document && typeof document !== 'string' && document.size > 0) {
			const extension = DOCUMENT_TYPES.get(document.type);
			if (!extension || document.size > MAX_DOCUMENT_SIZE) {
				return json({ error: 'Choose a PDF, JPG, PNG, or WEBP file under 10 MB.' }, { status: 400 });
			}
			documentName = document.name.replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 180) || `document.${extension}`;
			uploadedPath = `${studentId}/${randomUUID()}.${extension}`;
			const { error: uploadError } = await supabaseServer.storage
				.from(DOCUMENT_BUCKET)
				.upload(uploadedPath, document, { contentType: document.type, upsert: false });
			if (uploadError) throw uploadError;
		}

		/** @type {Array<{ student_id: string, start_date: string, end_date: string, reason: string, reason_details: string | null, created_at: string, document_path?: string, document_name?: string }>} */
		const periodRows = groupSchoolDates(dates).map((range) => ({
			student_id: studentId,
			start_date: range[0],
			end_date: range.at(-1) || range[0],
			reason: storedReason,
			reason_details: storedReasonDetails,
			created_at: new Date().toISOString()
		}));
		if (uploadedPath) {
			for (const row of periodRows) {
				row.document_path = uploadedPath;
				row.document_name = documentName;
			}
		}
		let periods = [];
		if (periodStorageAvailable) {
			const { data, error: insertError } = await supabaseServer
				.from('absence_periods')
				.insert(periodRows)
				.select('*');
			if (insertError) throw insertError;
			periods = data ?? [];
		}
		insertedId = (periods ?? []).map((period) => String(period.id)).join(',');

		const attendanceRows = dates.map((date) => ({
			student_id: studentId,
			date,
			status: 'absent',
			absence_reason: storedReason,
			absence_reason_details: storedReasonDetails
		}));
		const { error: attendanceError } = await supabaseServer
			.from('attendance')
			.upsert(attendanceRows, { onConflict: 'student_id,date' });
		if (attendanceError) throw attendanceError;

		return json({ periods: (periods ?? []).map(serializePeriod), period_storage_available: periodStorageAvailable }, { status: 201 });
	} catch (error) {
		if (insertedId) await supabaseServer.from('absence_periods').delete().in('id', insertedId.split(','));
		if (uploadedPath) await supabaseServer.storage.from(DOCUMENT_BUCKET).remove([uploadedPath]);
		return databaseFailure('Unable to save the absence.', error);
	}
}

export async function PATCH({ request, cookies }) {
	if (!hasValidSession(cookies)) return json({ error: 'Unauthorized' }, { status: 401 });

	let uploadedPath = '';
	try {
		const form = await request.formData();
		const periodId = Number(form.get('period_id'));
		const studentId = String(form.get('student_id') ?? '').trim();
		const reason = String(form.get('reason') ?? '').trim() || UNJUSTIFIED_REASON;
		const reasonNotes = String(form.get('reason_notes') ?? '').trim().slice(0, 500);
		const storedReason = absenceStorageReason(reason);
		const storedReasonDetails = encodeAbsenceReasonDetails(reason, reasonNotes);
		if (!Number.isSafeInteger(periodId) || !studentId) return json({ error: 'Invalid absence record.' }, { status: 400 });
		if (reason !== UNJUSTIFIED_REASON && !ABSENCE_REASONS.has(reason)) return json({ error: 'Invalid absence reason.' }, { status: 400 });
		if (reason === 'other' && !reasonNotes) return json({ error: 'Describe the other reason.' }, { status: 400 });

		const { data: current, error: currentError } = await supabaseServer
			.from('absence_periods')
			.select('*')
			.eq('id', periodId)
			.eq('student_id', studentId)
			.maybeSingle();
		if (currentError) throw currentError;
		if (!current) return json({ error: 'Absence record not found.' }, { status: 404 });

		const dates = schoolDatesBetween(String(current.start_date).slice(0, 10), String(current.end_date).slice(0, 10));
		const document = form.get('document');
		let documentName = '';
		if (document && typeof document !== 'string' && document.size > 0) {
			const extension = DOCUMENT_TYPES.get(document.type);
			if (!extension || document.size > MAX_DOCUMENT_SIZE) return json({ error: 'Choose a PDF or image under 10 MB.' }, { status: 400 });
			documentName = document.name.replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 180) || `document.${extension}`;
			uploadedPath = `${studentId}/${randomUUID()}.${extension}`;
			const { error: uploadError } = await supabaseServer.storage.from(DOCUMENT_BUCKET).upload(uploadedPath, document, { contentType: document.type, upsert: false });
			if (uploadError) throw uploadError;
		}

		/** @type {{ reason: string, reason_details: string | null, document_path?: string, document_name?: string }} */
		const changes = { reason: storedReason, reason_details: storedReasonDetails };
		if (uploadedPath) {
			changes.document_path = uploadedPath;
			changes.document_name = documentName;
		}
		const { data: updated, error: updateError } = await supabaseServer
			.from('absence_periods')
			.update(changes)
			.eq('id', periodId)
			.eq('student_id', studentId)
			.select('*')
			.single();
		if (updateError) throw updateError;

		const attendanceRows = dates.map((date) => ({
			student_id: studentId,
			date,
			status: 'absent',
			absence_reason: storedReason,
			absence_reason_details: storedReasonDetails
		}));
		const { error: attendanceError } = await supabaseServer.from('attendance').upsert(attendanceRows, { onConflict: 'student_id,date' });
		if (attendanceError) throw attendanceError;

		return json(serializePeriod(updated));
	} catch (error) {
		if (uploadedPath) await supabaseServer.storage.from(DOCUMENT_BUCKET).remove([uploadedPath]);
		return databaseFailure('Unable to save the absence.', error);
	}
}