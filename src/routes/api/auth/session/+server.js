import { json } from '@sveltejs/kit';
import { verifySessionToken } from '$lib/server/session.js';

export function GET({ cookies }) {
	const token = cookies.get('school_session');

	if (!token) {
		return json({ authenticated: false });
	}

	const username = verifySessionToken(token);

	if (!username) {
		cookies.delete('school_session', {
			path: '/'
		});

		return json({ authenticated: false });
	}

	return json({
		authenticated: true,
		user: {
			name: 'Abu Bakr Babay',
			nameAr: 'أبو بكر بابي',
			role: 'Qayyim',
			roleAr: 'القيّم'
		}
	});
}