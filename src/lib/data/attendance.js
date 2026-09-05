const attendanceStorageKey = 'school-attendance-records';

/**
 * @typedef {{
 *   id: string,
 *   studentId: string,
 *   date: string,
 *   session: number,
 *   status: 'present' | 'absent',
 *   recordedAt: string
 * }} AttendanceRecord
 */

/**
 * @typedef {{
 *   current: Record<string, 'present' | 'absent'>,
 *   history: AttendanceRecord[]
 * }} AttendanceData
 */

/**
 * Load all attendance data.
 *
 * The function also supports the old attendance format so existing
 * saved attendance does not immediately disappear.
 *
 * @returns {AttendanceData}
 */
export function loadAttendance() {
	if (typeof window === 'undefined') {
		return {
			current: {},
			history: []
		};
	}

	try {
		const saved = window.localStorage.getItem(attendanceStorageKey);

		if (!saved) {
			return {
				current: {},
				history: []
			};
		}

		const parsed = JSON.parse(saved);

		// New format
		if (
			parsed &&
			typeof parsed === 'object' &&
			!Array.isArray(parsed) &&
			parsed.current &&
			Array.isArray(parsed.history)
		) {
			return {
				current: parsed.current,
				history: parsed.history
			};
		}

		// Old format:
		// {
		//   studentId: "present",
		//   studentId2: "absent"
		// }
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			/** @type {Record<string, 'present' | 'absent'>} */
			const current = {};

			for (const [studentId, status] of Object.entries(parsed)) {
				if (status === 'present' || status === 'absent') {
					current[studentId] = status;
				}
			}

			return {
				current,
				history: []
			};
		}

		return {
			current: {},
			history: []
		};
	} catch (error) {
		console.error('Could not load attendance:', error);

		return {
			current: {},
			history: []
		};
	}
}

/**
 * Save attendance data.
 *
 * @param {AttendanceData} data
 */
export function saveAttendance(data) {
	if (typeof window === 'undefined') return;

	window.localStorage.setItem(
		attendanceStorageKey,
		JSON.stringify(data)
	);
}

/**
 * Create a unique ID for an attendance record.
 *
 * @param {string} studentId
 * @param {string} date
 * @param {number} session
 */
export function createAttendanceId(studentId, date, session) {
	return `${studentId}_${date}_session_${session}`;
}

/**
 * Save one attendance record.
 *
 * If the same student/date/session already exists,
 * it is updated instead of creating a duplicate.
 *
 * @param {AttendanceData} data
 * @param {string} studentId
 * @param {string} date
 * @param {number} session
 * @param {'present' | 'absent'} status
 */
export function recordAttendance(data, studentId, date, session, status) {
	const id = createAttendanceId(studentId, date, session);

	const existingIndex = data.history.findIndex(
		(record) => record.id === id
	);

	/** @type {AttendanceRecord} */
	const record = {
		id,
		studentId,
		date,
		session,
		status,
		recordedAt: new Date().toISOString()
	};

	if (existingIndex >= 0) {
		data.history = data.history.map((item, index) =>
			index === existingIndex ? record : item
		);
	} else {
		data.history = [...data.history, record];
	}

	data.current = {
		...data.current,
		[studentId]: status
	};

	saveAttendance(data);

	return data;
}

/**
 * Get attendance for one student on one date/session.
 *
 * @param {AttendanceData} data
 * @param {string} studentId
 * @param {string} date
 * @param {number} session
 * @returns {AttendanceRecord | null}
 */
export function getAttendanceRecord(data, studentId, date, session) {
	const id = createAttendanceId(studentId, date, session);

	return data.history.find((record) => record.id === id) || null;
}

/**
 * Get all attendance history for one student.
 *
 * @param {AttendanceData} data
 * @param {string} studentId
 * @returns {AttendanceRecord[]}
 */
export function getStudentAttendanceHistory(data, studentId) {
	return data.history
		.filter((record) => record.studentId === studentId)
		.sort(
			(left, right) =>
				new Date(right.recordedAt).getTime() -
				new Date(left.recordedAt).getTime()
		);
}

/**
 * Get attendance history for one date.
 *
 * @param {AttendanceData} data
 * @param {string} date
 * @returns {AttendanceRecord[]}
 */
export function getAttendanceByDate(data, date) {
	return data.history
		.filter((record) => record.date === date)
		.sort((left, right) => left.session - right.session);
}

/**
 * Get attendance history for one session.
 *
 * @param {AttendanceData} data
 * @param {number} session
 * @returns {AttendanceRecord[]}
 */
export function getAttendanceBySession(data, session) {
	return data.history.filter(
		(record) => record.session === session
	);
}