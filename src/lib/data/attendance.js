// @ts-nocheck

const attendanceStorageKey = 'school-attendance-records';

/**
 * Load attendance data from localStorage.
 *
 * Attendance is recorded once per student per day.
 * There are no sessions and no recordedAt timestamps.
 */
export function loadAttendance() {
    if (typeof window === 'undefined') {
        return {
            current: {},
            history: []
        };
    }

    try {
        const saved = window.localStorage.getItem(
            attendanceStorageKey
        );

        if (!saved) {
            return {
                current: {},
                history: []
            };
        }

        const parsed = JSON.parse(saved);

        /*
         * New daily attendance format:
         *
         * {
         *   current: {
         *     studentId: "present"
         *   },
         *   history: [
         *     {
         *       id: "studentId_2026-09-06",
         *       studentId: "studentId",
         *       date: "2026-09-06",
         *       status: "present"
         *     }
         *   ]
         * }
         */

        if (
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed) &&
            Array.isArray(parsed.history)
        ) {
            const current = {};
            const dailyRecords = new Map();

            for (const item of parsed.history) {
                if (
                    !item ||
                    typeof item !== 'object' ||
                    typeof item.studentId !== 'string' ||
                    typeof item.date !== 'string' ||
                    (item.status !== 'present' &&
                        item.status !== 'absent')
                ) {
                    continue;
                }

                const id = createAttendanceId(
                    item.studentId,
                    item.date
                );

                /*
                 * One record per student per day.
                 */
                dailyRecords.set(id, {
                    id,
                    studentId: item.studentId,
                    date: item.date,
                    status: item.status
                });
            }

            const history = Array.from(
                dailyRecords.values()
            );

            /*
             * Build the current status lookup.
             */
            for (const record of history) {
                current[record.studentId] = record.status;
            }

            return {
                current,
                history
            };
        }

        /*
         * Support the old simple format:
         *
         * {
         *   "studentId": "present",
         *   "studentId2": "absent"
         * }
         */

        if (
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)
        ) {
            const current = {};

            for (const [studentId, status] of Object.entries(
                parsed
            )) {
                if (
                    status === 'present' ||
                    status === 'absent'
                ) {
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
        console.error(
            'Could not load attendance:',
            error
        );

        return {
            current: {},
            history: []
        };
    }
}

/**
 * Save attendance data to localStorage.
 */
export function saveAttendance(data) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(
        attendanceStorageKey,
        JSON.stringify(data)
    );
}

/**
 * Create a unique attendance ID
 * using student + date.
 */
export function createAttendanceId(
    studentId,
    date
) {
    return `${studentId}_${date}`;
}

/**
 * Record or update attendance for one student
 * on one specific date.
 */
export function recordAttendance(
    data,
    studentId,
    date,
    status
) {
    const id = createAttendanceId(
        studentId,
        date
    );

    const record = {
        id,
        studentId,
        date,
        status
    };

    const existingIndex = data.history.findIndex(
        (record) => record.id === id
    );

    if (existingIndex >= 0) {
        data.history = data.history.map(
            (item, index) =>
                index === existingIndex
                    ? record
                    : item
        );
    } else {
        data.history = [
            ...data.history,
            record
        ];
    }

    data.current = {
        ...data.current,
        [studentId]: status
    };

    saveAttendance(data);

    return data;
}

/**
 * Get one student's attendance record
 * for one specific date.
 */
export function getAttendanceRecord(
    data,
    studentId,
    date
) {
    const id = createAttendanceId(
        studentId,
        date
    );

    return (
        data.history.find(
            (record) => record.id === id
        ) || null
    );
}

/**
 * Get all attendance records for one student.
 */
export function getStudentAttendanceHistory(
    data,
    studentId
) {
    return data.history
        .filter(
            (record) =>
                record.studentId === studentId
        )
        .sort(
            (left, right) =>
                right.date.localeCompare(
                    left.date
                )
        );
}

/**
 * Get all attendance records for one date.
 */
export function getAttendanceByDate(
    data,
    date
) {
    return data.history
        .filter(
            (record) => record.date === date
        )
        .sort(
            (left, right) =>
                left.studentId.localeCompare(
                    right.studentId
                )
        );
}