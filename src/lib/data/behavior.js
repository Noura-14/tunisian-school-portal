const behaviorStorageKey = 'school-behaviour-alerts';

/** @typedef {{ id: string, studentId: string, behaviorTypes: string[], otherBehavior: string, notes: string, summary: string, createdAt: string }} BehaviorRecord */

export const behaviorTypes = [
	{ id: 'lateness', ar: 'التأخر المتكرر عن الحصة', en: 'Repeated lateness to class' },
	{ id: 'fighting', ar: 'الشجار أو الاعتداء على زميل', en: 'Fighting or aggression toward another student' },
	{ id: 'language', ar: 'التلفظ بكلمات غير لائقة', en: 'Using inappropriate language' },
	{ id: 'instructions', ar: 'عدم الالتزام بتعليمات المعلم', en: 'Failure to follow teacher instructions' },
	{ id: 'disruption', ar: 'إزعاج الحصة', en: 'Disrupting the class' },
	{ id: 'cheating', ar: 'الغش', en: 'Cheating' },
	{ id: 'belongings', ar: 'أخذ ممتلكات الآخرين', en: "Taking another person's belongings" },
	{ id: 'property', ar: 'إتلاف ممتلكات المدرسة', en: 'Damaging school property' },
	{ id: 'smoking', ar: 'التدخين', en: 'Smoking' },
	{ id: 'break', ar: 'سوء السلوك أثناء الاستراحة', en: 'Misconduct during break' },
	{ id: 'other', ar: 'أخرى', en: 'Other' }
];

export function loadBehaviorRecords() {
	const saved = window.localStorage.getItem(behaviorStorageKey);
	if (!saved) return [];
	const parsed = JSON.parse(saved);
	return Array.isArray(parsed) ? parsed : [];
}

/** @param {BehaviorRecord[]} records */
export function saveBehaviorRecords(records) {
	window.localStorage.setItem(behaviorStorageKey, JSON.stringify(records));
}

/** @param {BehaviorRecord[]} records @param {string} studentId */
export function getStudentAlertCount(records, studentId) {
	return records.filter((record) => record.studentId === studentId).length;
}

/** @param {BehaviorRecord[]} records @param {string} studentId */
export function getStudentAlertLevel(records, studentId) {
	return Math.min(getStudentAlertCount(records, studentId), 3);
}

/** @param {BehaviorRecord[]} records @param {string} studentId */
export function getStudentRecords(records, studentId) {
	return records.filter((record) => record.studentId === studentId).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
