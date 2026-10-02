import { env } from '$env/dynamic/private';
import crypto from 'node:crypto';

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/** @param {string} token */
export function verifySessionToken(token) {
	try {
		const decoded = Buffer.from(token, 'base64url').toString('utf8');
		const parts = decoded.split(':');
		if (parts.length !== 3) return null;

		const [username, timestamp, signature] = parts;
		const createdAt = Number(timestamp);
		if (!username || !Number.isFinite(createdAt) || !signature) return null;

		const age = Date.now() - createdAt;
		if (age < 0 || age > SESSION_MAX_AGE * 1000) return null;

		const expectedSignature = crypto
			.createHmac('sha256', env.AUTH_SESSION_SECRET)
			.update(`${username}:${timestamp}`)
			.digest('hex');
		const providedBuffer = Buffer.from(signature, 'utf8');
		const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
		if (providedBuffer.length !== expectedBuffer.length) return null;
		if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return null;
		return username === env.AUTH_USERNAME ? username : null;
	} catch {
		return null;
	}
}

/** @param {{ get(name: string): string | undefined }} cookies */
export function hasValidSession(cookies) {
	const token = cookies.get('school_session');
	return Boolean(token && verifySessionToken(token));
}