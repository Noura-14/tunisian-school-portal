import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import crypto from 'node:crypto';

/** @param {string} username */
function createSessionToken(username) {
	const payload = `${username}:${Date.now()}`;

	const signature = crypto
		.createHmac('sha256', env.AUTH_SESSION_SECRET)
		.update(payload)
		.digest('hex');

	return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

export async function POST({ request, cookies }) {
	try {
		const body = await request.json();

		const username = String(body.username ?? '').trim();
		const password = String(body.password ?? '');

		if (!username || !password) {
			return json(
				{ error: 'Username and password are required.' },
				{ status: 400 }
			);
		}

		if (
			username !== env.AUTH_USERNAME ||
			password !== env.AUTH_PASSWORD
		) {
			return json(
				{ error: 'Invalid username or password.' },
				{ status: 401 }
			);
		}

		const token = createSessionToken(username);

		cookies.set('school_session', token, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30
		});

		return json({ success: true });
	} catch (error) {
		console.error('Login API error:', error);

		return json(
			{ error: 'Unable to sign in.' },
			{ status: 500 }
		);
	}
}