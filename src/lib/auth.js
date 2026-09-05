/**
 * Temporary client-side demo identity. Replace this module with the real
 * authenticated user profile once authentication is connected.
 */
export const demoUser = Object.freeze({
	name: 'Abu Bakr Babay',
	nameAr: 'أبو بكر بابي',
	role: 'Qayyim',
	roleAr: 'القيّم'
});

const authStorageKey = 'school-demo-authenticated-user';

export function setAuthenticatedUser() {
	window.localStorage.setItem(authStorageKey, 'true');
}

/** @returns {{ name: string, nameAr: string, role: string, roleAr: string } | null} */
export function getAuthenticatedUser() {
	if (window.localStorage.getItem(authStorageKey) !== 'true') {
		return null;
	}

	return demoUser;
}

export function clearAuthenticatedUser() {
	window.localStorage.removeItem(authStorageKey);
}
