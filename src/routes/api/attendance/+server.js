import { json } from '@sveltejs/kit';
import { supabaseServer } from '$lib/server/supabase.js';

export async function GET() {
    const { data, error } = await supabaseServer
        .from('attendance')
        .select('id, student_id, date, status')
        .order('date', { ascending: false });

    if (error) {
        console.error('Failed to load attendance:', error);

        return json(
            { error: error.message },
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

        if (!studentId || !date || !['present', 'absent'].includes(status)) {
            return json(
                { error: 'Invalid attendance data' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseServer
            .from('attendance')
            .upsert(
                {
                    student_id: studentId,
                    date,
                    status
                },
                {
                    onConflict: 'student_id,date'
                }
            )
            .select('id, student_id, date, status')
            .single();

        if (error) {
            console.error('Failed to save attendance:', error);

            return json(
                { error: error.message },
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