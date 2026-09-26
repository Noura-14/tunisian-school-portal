export const demoUser = Object.freeze({
	name: 'Abu Bakr Babay',
	nameAr: 'أبو بكر بابي',
	role: 'Qayyim',
	roleAr: 'القيّم'
});

export function setAuthenticatedUser() {
	// Authentication is handled by the secure server session cookie.
	// This function is kept temporarily for compatibility with the app.
}

export function getAuthenticatedUser() {
	// The server session is now the source of truth.
	return demoUser;
}

export function clearAuthenticatedUser() {
	// The server will handle session clearing.
}