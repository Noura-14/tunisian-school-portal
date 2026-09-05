<script>
	import { getContext, onMount } from 'svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { loadAttendance } from '$lib/data/attendance.js';
	import { temporaryNotifications } from '$lib/data/school.js';
	import { importedStudents } from '$lib/data/students.js';

	const appState = getContext('app-state');
	const isArabic = $derived(appState.language === 'ar');

	/** @type {{ current: Record<string, 'present' | 'absent'>, history: Array<{ id: string, studentId: string, date: string, session: number, status: 'present' | 'absent', recordedAt: string }> }} */
	let attendanceData = $state({ current: {}, history: [] });

	onMount(() => {
		attendanceData = loadAttendance();
	});

	const quickAccessItems = [
		{ href: '/app/classes', icon: 'classes', ar: 'الأقسام', en: 'Classes', arText: 'تنظيم الأقسام المدرسية', enText: 'Organise school classes' },
		{ href: '/app/students', icon: 'students', ar: 'التلاميذ', en: 'Students', arText: 'متابعة بيانات التلاميذ', enText: 'Follow up on student records' },
		{ href: '/app/notifications', icon: 'notifications', ar: 'التنبيهات', en: 'Notifications', arText: 'الاطلاع على التنبيهات', enText: 'Review notifications' }
	];

	const today = $derived(new Date().toISOString().slice(0, 10));
	const todayRecords = $derived(attendanceData.history.filter((record) => record.date === today));
	const attendanceSummary = $derived({
		present: todayRecords.filter((record) => record.status === 'present').length,
		absent: todayRecords.filter((record) => record.status === 'absent').length
	});
	const recordedAttendance = $derived(attendanceSummary.present + attendanceSummary.absent);
	const attendancePercent = $derived(recordedAttendance ? Math.round((attendanceSummary.present / recordedAttendance) * 100) : 0);
</script>

<section class="home-view" aria-labelledby="home-title">
	<section class="quick-access" aria-labelledby="quick-access-title">
		<div class="section-heading">
			<h2 id="quick-access-title">{isArabic ? 'الوصول السريع' : 'Quick Access'}</h2>
		</div>

		<div class="quick-grid">
			{#each quickAccessItems as item}
				<a class="quick-link" href={item.href}>
					<span class="quick-icon"><AppIcon name={item.icon} size={21} /></span>
					<span class="quick-copy"><strong>{isArabic ? item.ar : item.en}</strong><small>{isArabic ? item.arText : item.enText}</small></span>
					<span class="quick-arrow" aria-hidden="true">{isArabic ? '←' : '→'}</span>
				</a>
			{/each}
		</div>
	</section>

	<section class="today-section" aria-labelledby="today-title">
		<div class="section-heading">
			<h2 id="today-title">{isArabic ? 'اليوم' : 'Today'}</h2>
		</div>
		<div class="today-overview">
			<div class="attendance-overview">
				<div class="overview-heading">
					<div>
						<strong>{isArabic ? 'الحضور اليوم' : 'Attendance today'}</strong>
						<p>{recordedAttendance ? `${attendancePercent}% ${isArabic ? 'حاضر' : 'present'}` : (isArabic ? 'لم يتم تسجيل الحضور بعد.' : 'Attendance has not been recorded yet.')}</p>
					</div>
					<AppIcon name="attendance" size={22} />
				</div>

				{#if recordedAttendance}
					<div class="progress-track" aria-label={isArabic ? `${attendancePercent}% حاضر` : `${attendancePercent}% present`}>
						<span style={`width: ${attendancePercent}%`}></span>
					</div>
				{:else}
					<div class="empty-progress"></div>
				{/if}

				<div class="attendance-counts">
					<span><b>{attendanceSummary.present}</b>{isArabic ? 'حاضر' : 'Present'}</span>
					<span><b>{attendanceSummary.absent}</b>{isArabic ? 'غائب' : 'Absent'}</span>
				</div>
			</div>

			<div class="status-grid">
				<div class="status-block">
					<span>{isArabic ? 'الغيابات' : 'Absences'}</span>
					<strong>{attendanceSummary.absent}</strong>
					<small>{recordedAttendance ? (isArabic ? 'مسجل اليوم' : 'Recorded today') : (isArabic ? 'بانتظار التسجيل' : 'Awaiting records')}</small>
				</div>
				<div class="status-block">
					<span>{isArabic ? 'الحضور' : 'Present'}</span>
					<strong>{attendanceSummary.present}</strong>
					<small>{recordedAttendance ? (isArabic ? 'مسجل اليوم' : 'Recorded today') : (isArabic ? 'بانتظار التسجيل' : 'Awaiting records')}</small>
				</div>
				<div class="status-block status-note">
					<span>{isArabic ? 'التنبيهات والملاحظات' : 'Notifications and notes'}</span>
					<strong>{temporaryNotifications.length}</strong>
					<small>{isArabic ? 'تنبيهات محلية مؤقتة' : 'Temporary local notices'}</small>
				</div>
			</div>
		</div>
	</section>
</section>

<style>
	.home-view { animation: home-enter 450ms ease both; }
	h2, p { margin-top: 0; }
	.quick-access { padding-top: 0; }
	.section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 0.7rem; }
	h2 { margin-bottom: 0; font-size: 1.25rem; }
	.quick-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.65rem; max-width: 58rem; }
	.quick-link { display: flex; min-height: 5.4rem; align-items: center; gap: 0.75rem; padding: 0.9rem; border: 1px solid var(--app-border); border-radius: 0.5rem; background: var(--app-surface); box-shadow: var(--app-shadow); color: var(--app-text); text-decoration: none; transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease; }
	.quick-link:hover { border-color: var(--app-accent); box-shadow: 0 12px 22px rgba(75, 49, 47, 0.1); transform: translateY(-1px); }
	.quick-icon { display: grid; width: 2.6rem; height: 2.6rem; flex: 0 0 2.6rem; place-items: center; border-radius: 0.45rem; background: var(--app-accent-soft); color: var(--app-accent); }
	.quick-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 0.2rem; }
	.quick-copy strong { font-size: 1rem; }
	.quick-copy small { overflow: hidden; color: var(--app-muted); font-size: 0.75rem; text-overflow: ellipsis; white-space: nowrap; }
	.quick-arrow { color: var(--app-accent); font-size: 1.1rem; }
	.quick-link:focus-visible { outline: 3px solid color-mix(in srgb, var(--app-accent) 35%, transparent); outline-offset: 3px; }
	.today-section { padding-top: 1.8rem; }
	.today-overview { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(15rem, 0.75fr); gap: 0.65rem; max-width: 58rem; }
	.attendance-overview { padding: 1rem; border: 1px solid var(--app-border); border-inline-start: 3px solid var(--app-accent); background: var(--app-surface); box-shadow: var(--app-shadow); }
	.overview-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; color: var(--app-accent); }
	.overview-heading strong { font-size: 1rem; }
	.overview-heading p { margin: 0.3rem 0 0; color: var(--app-muted); font-size: 0.88rem; }
	.progress-track, .empty-progress { height: 0.45rem; margin: 1rem 0 0.85rem; border-radius: 1rem; background: var(--app-accent-soft); }
	.progress-track span { display: block; height: 100%; border-radius: inherit; background: var(--app-accent); }
	.attendance-counts { display: flex; flex-wrap: wrap; gap: 1rem; color: var(--app-muted); font-size: 0.8rem; }
	.attendance-counts span { display: inline-flex; align-items: center; gap: 0.3rem; }
	.attendance-counts b { color: var(--app-text); font-size: 1rem; }
	.status-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
	.status-block { display: flex; min-height: 5.4rem; flex-direction: column; justify-content: center; padding: 0.8rem; border: 1px solid var(--app-border); background: var(--app-surface-soft, #f5f1ee); }
	.status-block span { color: var(--app-muted); font-size: 0.8rem; }
	.status-block strong { margin-top: 0.15rem; color: var(--app-accent); font-size: 1.35rem; line-height: 1.2; }
	.status-block small { margin-top: 0.2rem; color: var(--app-muted); font-size: 0.7rem; }
	.status-note { grid-column: 1 / -1; min-height: 4.5rem; }
	@keyframes home-enter { from { opacity: 0; transform: translateY(0.6rem); } to { opacity: 1; transform: translateY(0); } }
	@media (max-width: 480px) {
		.section-heading { align-items: flex-start; flex-direction: column; gap: 0.25rem; }
		.quick-grid { grid-template-columns: 1fr; }
		.today-overview { grid-template-columns: 1fr; }
		.status-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	}
	@media (prefers-reduced-motion: reduce) { .home-view { animation: none; } }
</style>
