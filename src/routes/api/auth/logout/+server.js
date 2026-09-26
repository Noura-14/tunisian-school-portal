import { json } from '@sveltejs/kit';

export function POST({ cookies }) {
	cookies.delete('school_session', {
		path: '/'
	});

	return json({ success: true });
}