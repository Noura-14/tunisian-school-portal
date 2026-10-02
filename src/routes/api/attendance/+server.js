import { json } from '@sveltejs/kit';
import { absenceReasons } from '$lib/data/absence.js';
import { supabaseServer } from '$lib/server/supabase.js';

export async function GET() {
    const { data, error } = await supabaseServer
        .from('attendance')
        .select('id, student_id, date, status, absence_reason, absence_reason_details')
        .order('date', { ascending: false });

    if (error) {
        console.error('Failed to load attendance:', error);

        return json(
            { error: 'Unable to load attendance.' },
            { status: 500 }
        );
    }

    return json(data ?? []);
}
export async function POST({ request }) {
    try {
        const body = await request.json();

        const studentId = String(body.student_id ?? '');
        const date = String(body.date ?? '');
        const status = String(body.status ?? '');
        const hasAbsenceReason = Object.hasOwn(body, 'absence_reason');
        const absenceReason = String(body.absence_reason ?? '');
        const absenceReasonDetails = String(body.absence_reason_details ?? '').trim().slice(0, 500);

        if (!studentId || !date || !['present', 'absent'].includes(status)) {
            return json(
                { error: 'Invalid attendance data' },
                { status: 400 }
            );
        }
        if (status === 'absent' && hasAbsenceReason && absenceReason !== 'unjustified' && !absenceReasons.some((reason) => reason.id === absenceReason)) {
            return json({ error: 'Invalid absence reason' }, { status: 400 });
        }

        /** @type {{ student_id: string, date: string, status: string, absence_reason?: string | null, absence_reason_details?: string | null }} */
        const attendanceRow = { student_id: studentId, date, status };
        if (status === 'present') {
            attendanceRow.absence_reason = null;
            attendanceRow.absence_reason_details = null;
        } else if (hasAbsenceReason) {
            attendanceRow.absence_reason = absenceReason || 'unjustified';
            attendanceRow.absence_reason_details = absenceReasonDetails || null;
        }

        const { data, error } = await supabaseServer
            .from('attendance')
            .upsert(
                attendanceRow,
                {
                    onConflict: 'student_id,date'
                }
            )
            .select('id, student_id, date, status, absence_reason, absence_reason_details')
            .single();

        if (error) {
            console.error('Failed to save attendance:', error);

            return json(
                { error: 'Unable to save attendance.' },
                { status: 500 }
            );
        }

        return json(data);
    } catch (error) {
        console.error('Attendance API error:', error);

        return json(
            { error: 'Failed to save attendance' },
            { status: 500 }
        );
    }
}