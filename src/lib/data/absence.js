export const absenceReasons = Object.freeze([
	{ id: 'unjustified', storageValue: 'unjustified', ar: 'غير مبرر', en: 'Unjustified' },
	{ id: 'illness', storageValue: 'other', ar: 'مرض', en: 'Illness' },
	{ id: 'medical_certificate', storageValue: 'medical_certificate', ar: 'شهادة طبية', en: 'Medical certificate' },
	{ id: 'family', storageValue: 'family', ar: 'ظرف عائلي', en: 'Family matter' },
	{ id: 'appointment', storageValue: 'other', ar: 'موعد طبي', en: 'Medical appointment' },
	{ id: 'administration', storageValue: 'other', ar: 'إذن من الإدارة', en: 'Administration permission' },
	{ id: 'other', storageValue: 'other', ar: 'أخرى', en: 'Other' }
]);

const REASON_METADATA_PREFIX = '@absence-reason:';

/** @param {string} reasonId */
export function absenceStorageReason(reasonId) {
	return absenceReasons.find((reason) => reason.id === reasonId)?.storageValue ?? 'unjustified';
}

/** @param {string} reasonId @param {string} [notes] */
export function encodeAbsenceReasonDetails(reasonId, notes = '') {
	const storageValue = absenceStorageReason(reasonId);
	if (storageValue !== reasonId) return `${REASON_METADATA_PREFIX}${reasonId}\n${notes}`;
	return notes || null;
}

/** @param {string | null | undefined} storageValue @param {string | null | undefined} details */
export function decodeAbsenceReason(storageValue, details) {
	const text = details ?? '';
	if (storageValue === 'other' && text.startsWith(REASON_METADATA_PREFIX)) {
		const separator = text.indexOf('\n');
		const reasonId = text.slice(REASON_METADATA_PREFIX.length, separator < 0 ? undefined : separator);
		if (absenceReasons.some((reason) => reason.id === reasonId)) {
			return { id: reasonId, notes: separator < 0 ? '' : text.slice(separator + 1) };
		}
	}
	return { id: storageValue ?? null, notes: text };
}