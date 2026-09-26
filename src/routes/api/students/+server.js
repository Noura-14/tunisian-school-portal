import { json } from '@sveltejs/kit';
import { supabaseServer } from '$lib/server/supabase.js';

export async function GET() {
    const { data, error } = await supabaseServer
        .from('students')
        .select('id, first_name, last_name, class_name')
        .order('class_name')
        .order('last_name')
        .order('first_name');

    if (error) {
        console.error('Failed to load students:', error);

        return json(
            { error: error.message },
            { status: 500 }
        );
    }

    return json(data ?? []);
}