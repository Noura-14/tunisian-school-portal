<script>
	import { getContext, onMount } from 'svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { loadBehaviorRecords, getStudentAlertLevel } from '$lib/data/behavior.js';

	const appState = getContext('app-state');
	const isArabic = $derived(appState.language === 'ar');
	let now = $state(new Date());
	/** @type {'loading' | 'ready' | 'error'} */
	let dashboardStatus = $state('loading');

	/** @type {{ id: string, firstName: string, lastName: string, className: string }[]} */
	let students = $state([]);
	/** @type {{ id: string, studentId: string, date: string, status: 'present' | 'absent' }[]} */
	let attendanceHistory = $state([]);
	/** @type {Array<{ id: string, studentId: string, behaviorTypes: string[], otherBehavior: string, notes: string, summary: string, createdAt: string }>} */
	let behaviorRecords = $state([]);

	/** @param {Date} date */
	function dateKey(date) {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	}

	/** @param {string} value */
	function localRecordDate(value) {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '' : dateKey(date);
	}

	onMount(() => {
		const clockInterval = window.setInterval(() => now = new Date(), 60_000);
		return () => window.clearInterval(clockInterval);
	});

	onMount(async () => {
		behaviorRecords = loadBehaviorRecords();
		try {
			const [attendanceResponse, studentsResponse] = await Promise.all([
				fetch('/api/attendance'),
				fetch('/api/students')
			]);
			if (!attendanceResponse.ok || !studentsResponse.ok) throw new Error('Unable to load dashboard data');
			const [attendanceResult, studentsResult] = await Promise.all([
				attendanceResponse.json(),
				studentsResponse.json()
			]);
			attendanceHistory = Array.isArray(attendanceResult) ? attendanceResult.map((record) => ({
				id: String(record.id),
				studentId: String(record.student_id),
				date: String(record.date).slice(0, 10),
				status: record.status
			})) : [];
			students = Array.isArray(studentsResult) ? studentsResult.map((student) => ({
				id: String(student.id),
				firstName: student.first_name ?? '',
				lastName: student.last_name ?? '',
				className: student.class_name ?? ''
			})) : [];
			dashboardStatus = 'ready';
		} catch (error) {
			console.error('Failed to load Home dashboard data:', error);
			dashboardStatus = 'error';
		}
	});

	const quickAccessItems = [
		{
			href: '/app/classes',
			icon: 'classes',
			ar: 'الأقسام',
			en: 'Classes',
			arText: 'تنظيم الأقسام المدرسية',
			enText: 'Organise school classes'
		},
		{
			href: '/app/absences',
			icon: 'notifications',
			ar: 'الغيابات',
			en: 'Absences',
			arText: 'متابعة الغيابات المسجلة',
			enText: 'Review recorded absences'
		},
		{
			href: '/app/behaviour',
			icon: 'notifications',
			ar: 'السلوك',
			en: 'Behaviour',
			arText: 'متابعة التنبيهات السلوكية',
			enText: 'Review behaviour alerts'
		}
	];

	const today = $derived(dateKey(now));
	const greetingName = $derived((isArabic ? (appState.user?.nameAr || '') : (appState.user?.name || '')).trim().split(/\s+/).slice(0, 2).join(' '));
	const greetingText = $derived(isArabic
		? now.getHours() >= 5 && now.getHours() < 12
			? `صباح الخير، ${greetingName}`
			: now.getHours() >= 12 && now.getHours() < 24
				? `مساء الخير، ${greetingName}`
				: `مرحباً، ${greetingName}`
		: now.getHours() >= 5 && now.getHours() < 12
			? `Good morning, ${greetingName}`
			: now.getHours() >= 12 && now.getHours() < 18
				? `Good afternoon, ${greetingName}`
				: `Hello, ${greetingName}`);
	const dateLabel = $derived(now.toLocaleDateString(isArabic ? 'ar-QA-u-nu-latn' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }));
	const timeLabel = $derived(now.toLocaleTimeString(isArabic ? 'ar-QA-u-nu-latn' : 'en-GB', { hour: 'numeric', minute: '2-digit' }));
	const todayRecords = $derived(attendanceHistory.filter((record) => record.date === today));

	const attendanceSummary = $derived({
    present: todayRecords.filter(
        /** @param {{ date: string, status: 'present' | 'absent' }} record */
        (record) => record.status === 'present'
    ).length,

    absent: todayRecords.filter(
        /** @param {{ date: string, status: 'present' | 'absent' }} record */
        (record) => record.status === 'absent'
    ).length
});

	const recordedAttendance = $derived(
		attendanceSummary.present + attendanceSummary.absent
	);

	const attendancePercent = $derived(
		recordedAttendance
			? Math.round((attendanceSummary.present / recordedAttendance) * 100)
			: 0
	);
	const todayBehaviorCards = $derived(behaviorRecords.flatMap((record) => {
		if (localRecordDate(record.createdAt) !== today) return [];
		const student = students.find((item) => item.id === record.studentId);
		return student ? [{ record, student, level: getStudentAlertLevel(behaviorRecords, student.id) }] : [];
	}));

	const userName = $derived(isArabic ? appState.user?.nameAr : appState.user?.name);
	const userRole = $derived(isArabic ? appState.user?.roleAr : appState.user?.role);
</script>

<section class="home-view" aria-labelledby="home-title">
	<!-- WELCOME -->
	<header class="welcome-section">
		<div class="welcome-copy">
			<p class="welcome-eyebrow">
				{isArabic ? 'فضاء المتابعة المدرسية' : 'SCHOOL FOLLOW-UP PORTAL'}
			</p>

			<h1 id="home-title">{greetingText}</h1>

			<p class="welcome-subtitle">
				{isArabic
					? `${userRole || ''} · المدرسة التونسية بالدوحة · فرع اللقطة`
					: `${userRole || ''} · Tunisian School in Doha · Al-Luqta Branch`}
			</p>
		</div>

		<div class="today-date">
			<span class="date-icon">
				<AppIcon name="attendance" size={17} />
			</span>

			<div>
				<strong>{dateLabel}</strong>
				<span>{timeLabel}</span>
			</div>
		</div>
	</header>

	<!-- QUICK ACCESS -->
	<section
		class="quick-access"
		aria-labelledby="quick-access-title"
	>
		<div class="section-heading">
			<div>
				<p class="section-kicker">
					{isArabic ? 'اختصارات' : 'SHORTCUTS'}
				</p>

				<h2 id="quick-access-title">
					{isArabic ? 'الوصول السريع' : 'Quick Access'}
				</h2>
			</div>
		</div>

		<div class="quick-grid">
			{#each quickAccessItems as item}
				<a class="quick-link" href={item.href}>
					<span class="quick-icon">
						<AppIcon name={item.icon} size={21} />
					</span>

					<span class="quick-copy">
						<strong>
							{isArabic ? item.ar : item.en}
						</strong>

						<small>
							{isArabic ? item.arText : item.enText}
						</small>
					</span>

					<span class="quick-arrow" aria-hidden="true">
						{isArabic ? '←' : '→'}
					</span>
				</a>
			{/each}
		</div>
	</section>

	<!-- TODAY -->
	<section
		class="today-section"
		aria-labelledby="today-title"
	>
		<div class="today-overview">
			<!-- ATTENDANCE MAIN CARD -->
			<div class="attendance-card">
				<div class="attendance-card-top">
					<div>
						<div class="card-label-row">
							<span class="card-icon">
								<AppIcon name="attendance" size={19} />
							</span>

							<span class="card-label">
								{isArabic ? 'الحضور اليوم' : 'Attendance today'}
							</span>
						</div>

						<div class="attendance-number">
							{#if dashboardStatus === 'ready'}{attendancePercent}<span>%</span>{:else}—{/if}
						</div>

						<p>
							{#if dashboardStatus === 'loading'}
								{isArabic ? 'جارٍ تحميل بيانات اليوم...' : 'Loading today’s data...'}
							{:else if dashboardStatus === 'error'}
								{isArabic ? 'بيانات الحضور غير متاحة حالياً.' : 'Attendance data is currently unavailable.'}
							{:else if recordedAttendance}
								{isArabic
									? `${attendanceSummary.present} من ${recordedAttendance} مسجلين كحاضرين`
									: `${attendanceSummary.present} of ${recordedAttendance} recorded as present`}
							{:else}
								{isArabic
									? 'لم يتم تسجيل الحضور بعد.'
									: 'Attendance has not been recorded yet.'}
							{/if}
						</p>
					</div>

					<div
						class:complete={dashboardStatus === 'ready' && recordedAttendance > 0}
						class="attendance-status"
					>
						<span></span>

						{dashboardStatus === 'error'
							? isArabic ? 'غير متاح' : 'Unavailable'
							: dashboardStatus === 'loading'
								? isArabic ? 'جارٍ التحميل' : 'Loading'
								: recordedAttendance
							? isArabic
								? 'قيد المتابعة'
								: 'In progress'
							: isArabic
								? 'لم يبدأ بعد'
								: 'Not started'}
					</div>
				</div>

				<div
					class="progress-track"
					aria-label={
						isArabic
							? dashboardStatus === 'ready' ? `${attendancePercent}% حاضر` : (isArabic ? 'الحضور غير متاح' : 'Attendance unavailable')
								: dashboardStatus === 'ready' ? `${attendancePercent}% present` : 'Attendance unavailable'
					}
				>
						<span style={`width: ${dashboardStatus === 'ready' ? attendancePercent : 0}%`}></span>
				</div>

				<div class="attendance-counts">
					<div class="attendance-count present">
						<span class="count-dot"></span>

						<div>
							<strong>{dashboardStatus === 'ready' ? attendanceSummary.present : '—'}</strong>
							<span>{isArabic ? 'حاضر' : 'Present'}</span>
						</div>
					</div>

					<div class="attendance-count absent">
						<span class="count-dot"></span>

						<div>
							<strong>{dashboardStatus === 'ready' ? attendanceSummary.absent : '—'}</strong>
							<span>{isArabic ? 'غائب' : 'Absent'}</span>
						</div>
					</div>

					<div class="attendance-recorded">
						<span>
							{isArabic ? 'المسجل' : 'Recorded'}
						</span>

						<strong>{dashboardStatus === 'ready' ? recordedAttendance : '—'}</strong>
					</div>
				</div>
			</div>

			<!-- STATISTICS -->
			<div class="status-grid">
				<a class="status-block absent-stat" href="/app/absences">
					<div class="status-icon">
						<AppIcon name="attendance" size={18} />
					</div>

					<div class="status-copy">
						<span>
							{isArabic ? 'الغيابات' : 'Absences'}
						</span>

						<strong>{dashboardStatus === 'ready' ? attendanceSummary.absent : '—'}</strong>

						<small>
							{dashboardStatus === 'error'
								? isArabic ? 'البيانات غير متاحة' : 'Data unavailable'
								: dashboardStatus === 'loading'
									? isArabic ? 'جارٍ التحميل' : 'Loading'
									: recordedAttendance
								? isArabic
									? 'مسجل اليوم'
									: 'Recorded today'
								: isArabic
									? 'بانتظار التسجيل'
									: 'Awaiting records'}
						</small>
					</div>
				</a>
			</div>

			<section class="today-behaviour" aria-labelledby="today-behaviour-title">
				<div class="behaviour-heading"><h3 id="today-behaviour-title">{isArabic ? 'التنبيهات السلوكية اليوم' : "Today's behaviour alerts"}</h3><a href="/app/behaviour">{isArabic ? 'عرض السجل' : 'View history'} ←</a></div>
				{#if dashboardStatus !== 'ready'}
					<div class="behaviour-empty"><AppIcon name="notifications" size={20} /><span>{dashboardStatus === 'loading' ? (isArabic ? 'جارٍ تحميل بيانات السلوك...' : 'Loading behaviour data...') : (isArabic ? 'تعذر تحميل بيانات السلوك.' : 'Behaviour data could not be loaded.')}</span></div>
				{:else if todayBehaviorCards.length}
					<div class="behaviour-card-list">
						{#each todayBehaviorCards as item (item.record.id)}
							<a class:level-one={item.level === 1} class:level-two={item.level === 2} class:level-three={item.level >= 3} class="today-behaviour-card" href="/app/behaviour">
								<strong>{item.student.firstName} {item.student.lastName}</strong><span>{item.student.className} · {item.record.summary}</span><small>{new Date(item.record.createdAt).toLocaleTimeString(isArabic ? 'ar-QA-u-nu-latn' : 'en-GB', { hour: '2-digit', minute: '2-digit' })} · {isArabic ? `التنبيه ${Math.min(item.level, 3)}` : `Alert ${Math.min(item.level, 3)}`}</small>
							</a>
						{/each}
					</div>
				{:else}
					<div class="behaviour-empty"><AppIcon name="notifications" size={20} /><span>{isArabic ? 'لا توجد تنبيهات سلوكية اليوم.' : 'No behaviour alerts today.'}</span></div>
				{/if}
			</section>
		</div>
	</section>

	<!-- SMALL FOOTNOTE -->
	<div class="home-footer-note">
		<span class="footer-line"></span>

		<span>
			{isArabic
				? 'متابعة يومية هادئة ومنظمة للتلاميذ'
				: 'A calm and organised daily student follow-up'}
		</span>

		<span class="footer-line"></span>
	</div>
</section>

<style>
	.home-view {
		animation: home-enter 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	h1,
	h2,
	p {
		margin-top: 0;
	}

	/* ================================
	   WELCOME
	================================ */

	.welcome-section {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.2rem;
	}

	.welcome-copy {
		min-width: 0;
	}

	.welcome-eyebrow,
	.section-kicker {
		margin-bottom: 0.45rem;
		color: var(--app-accent);
		font-size: 0.62rem;
		font-weight: 850;
		letter-spacing: 0.12em;
	}

	.welcome-section h1 {
		margin-bottom: 0.45rem;
		font-size: clamp(1.45rem, 4vw, 2rem);
		font-weight: 850;
		line-height: 1.25;
		letter-spacing: -0.035em;
	}

	.welcome-subtitle {
		margin-bottom: 0;
		color: var(--app-muted);
		font-size: 0.9rem;
		line-height: 1.7;
	}

	.today-date {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.45rem;
		padding: 0;
		border: 0;
		background: transparent;
		box-shadow: none;
	}

	.date-icon {
		display: grid;
		width: 2.25rem;
		height: 2.25rem;
		flex: 0 0 2.25rem;
		place-items: center;
		border-radius: 0.55rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	.today-date > div {
		display: flex;
		min-width: 0;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.2rem 0.45rem;
	}

	.today-date strong {
		font-size: 0.82rem;
	}

	.today-date span:last-child {
		color: var(--app-muted);
		font-size: 0.82rem;
	}

	/* ================================
	   SECTIONS
	================================ */

	.section-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		margin-bottom: 0.8rem;
	}

	.section-kicker {
		margin-bottom: 0.25rem;
	}

	.section-heading h2 {
		margin-bottom: 0;
		font-size: 1.18rem;
		font-weight: 800;
		line-height: 1.3;
	}

	/* ================================
	   QUICK ACCESS
	================================ */

	.quick-access {
		margin-bottom: 2rem;
	}

	.quick-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.7rem;
	}

	.quick-link {
		position: relative;
		display: flex;
		min-height: 5.8rem;
		align-items: center;
		gap: 0.75rem;
		padding: 0.85rem;
		border: 1px solid var(--app-border);
		border-radius: 0.7rem;
		background: var(--app-surface);
		box-shadow: var(--app-shadow);
		color: var(--app-text);
		text-decoration: none;
		overflow: hidden;
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			box-shadow 180ms ease;
	}

	.quick-link::before {
		position: absolute;
		inset-inline-start: 0;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--app-accent);
		content: '';
		opacity: 0;
		transition: opacity 180ms ease;
	}

	.quick-link:hover {
		border-color: color-mix(in srgb, var(--app-accent) 22%, var(--app-border));
		box-shadow: 0 14px 30px rgba(67, 42, 43, 0.08);
		transform: translateY(-2px);
	}

	.quick-link:hover::before {
		opacity: 1;
	}

	.quick-icon {
		display: grid;
		width: 2.7rem;
		height: 2.7rem;
		flex: 0 0 2.7rem;
		place-items: center;
		border-radius: 0.6rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
		transition:
			background-color 180ms ease,
			transform 180ms ease;
	}

	.quick-link:hover .quick-icon {
		transform: scale(1.04);
	}

	.quick-copy {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		gap: 0.2rem;
	}

	.quick-copy strong {
		font-size: 0.92rem;
		font-weight: 800;
	}

	.quick-copy small {
		overflow: hidden;
		color: var(--app-muted);
		font-size: 0.72rem;
		line-height: 1.45;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.quick-arrow {
		color: var(--app-accent);
		font-size: 1rem;
		transition: transform 180ms ease;
	}

	.quick-link:hover .quick-arrow {
		transform: translateX(-2px);
	}

	:global([dir='ltr']) .quick-link:hover .quick-arrow {
		transform: translateX(2px);
	}

	.quick-link:focus-visible {
		outline: 3px solid color-mix(in srgb, var(--app-accent) 30%, transparent);
		outline-offset: 3px;
	}

	/* ================================
	   TODAY
	================================ */

	.today-section {
		margin-bottom: 2rem;
	}

	.today-overview {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(18rem, 0.7fr);
		gap: 0.7rem;
	}

	.attendance-card {
		position: relative;
		overflow: hidden;
		padding: 1.2rem;
		border: 1px solid var(--app-border);
		border-radius: 0.7rem;
		background: var(--app-surface);
		box-shadow: var(--app-shadow);
	}

	.attendance-card::before {
		position: absolute;
		inset-inline-start: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--app-accent);
		content: '';
	}

	.attendance-card-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.card-label-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.card-icon {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border-radius: 0.5rem;
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

	.card-label {
		color: var(--app-muted);
		font-size: 0.76rem;
		font-weight: 750;
	}

	.attendance-number {
		margin-top: 0.55rem;
		color: var(--app-text);
		font-size: clamp(1.8rem, 5vw, 2.4rem);
		font-weight: 850;
		line-height: 1;
		letter-spacing: -0.05em;
	}

	.attendance-number span {
		margin-inline-start: 0.12rem;
		color: var(--app-accent);
		font-size: 1.15rem;
		letter-spacing: 0;
	}

	.attendance-card-top p {
		margin: 0.45rem 0 0;
		color: var(--app-muted);
		font-size: 0.74rem;
		line-height: 1.6;
	}

	.attendance-status {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.55rem;
		border: 1px solid var(--app-border);
		border-radius: 2rem;
		color: var(--app-muted);
		font-size: 0.63rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.attendance-status span {
		width: 0.38rem;
		height: 0.38rem;
		border-radius: 50%;
		background: var(--app-muted);
	}

	.attendance-status.complete span {
		background: var(--app-success);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-success) 12%, transparent);
	}

	.progress-track {
		height: 0.45rem;
		margin: 0.8rem 0 0.7rem;
		overflow: hidden;
		border-radius: 2rem;
		background: var(--app-surface-soft);
	}

	.progress-track span {
		display: block;
		height: 100%;
		min-width: 0;
		border-radius: inherit;
		background: linear-gradient(
			90deg,
			var(--app-accent-dark),
			var(--app-accent)
		);
		box-shadow: 0 0 12px color-mix(in srgb, var(--app-accent) 15%, transparent);
		transition: width 650ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.attendance-counts {
		display: flex;
		align-items: center;
		gap: 1.4rem;
	}

	.attendance-count {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.count-dot {
		width: 0.45rem;
		height: 0.45rem;
		flex: 0 0 0.45rem;
		border-radius: 50%;
	}

	.attendance-count.present .count-dot {
		background: var(--app-success);
	}

	.attendance-count.absent .count-dot {
		background: var(--app-danger);
	}

	.attendance-count div {
		display: flex;
		align-items: baseline;
		gap: 0.3rem;
	}

	.attendance-count strong {
		font-size: 0.92rem;
	}

	.attendance-count span:not(.count-dot) {
		color: var(--app-muted);
		font-size: 0.68rem;
	}

	.attendance-recorded {
		display: flex;
		align-items: baseline;
		gap: 0.3rem;
		margin-inline-start: auto;
		color: var(--app-muted);
		font-size: 0.68rem;
	}

	.attendance-recorded strong {
		color: var(--app-text);
		font-size: 0.85rem;
	}

	/* ================================
	   STATISTICS
	================================ */

	.status-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.7rem;
	}

	.status-block {
		display: flex;
		min-height: 0;
		align-items: center;
		gap: 0.75rem;
		padding: 0.9rem;
		border: 1px solid var(--app-border);
		border-radius: 0.7rem;
		background: var(--app-surface);
		box-shadow: var(--app-shadow);
		color: inherit;
		text-decoration: none;
		transition: border-color 160ms ease, transform 160ms ease;
	}

	a.status-block:hover { border-color: var(--app-accent); transform: translateY(-1px); }

	.status-icon {
		display: grid;
		width: 2.35rem;
		height: 2.35rem;
		flex: 0 0 2.35rem;
		place-items: center;
		border-radius: 0.55rem;
		background: var(--app-surface-soft);
		color: var(--app-muted);
	}

	.absent-stat .status-icon {
		background: color-mix(in srgb, var(--app-danger) 9%, var(--app-surface));
		color: var(--app-danger);
	}

	.today-behaviour { margin-top: 1.1rem; }
	.behaviour-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.55rem; }
	.behaviour-heading h3 { margin: 0; font-size: 0.9rem; }
	.behaviour-heading a { color: var(--app-accent); font-size: 0.75rem; text-decoration: none; }
	.behaviour-card-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
	.today-behaviour-card { display: grid; gap: 0.18rem; padding: 0.65rem 0.75rem; border: 1px solid var(--app-border); border-inline-start: 3px solid var(--app-success); border-radius: 0.55rem; background: var(--app-surface); color: var(--app-text); text-decoration: none; }
	.today-behaviour-card.level-two { border-inline-start-color: #b7791f; }
	.today-behaviour-card.level-three { border-inline-start-color: var(--app-danger); }
	.today-behaviour-card strong { font-size: 0.8rem; }
	.today-behaviour-card span { overflow: hidden; color: var(--app-muted); font-size: 0.72rem; text-overflow: ellipsis; white-space: nowrap; }
	.today-behaviour-card small { color: var(--app-muted); font-size: 0.66rem; }
	.behaviour-empty { display: flex; min-height: 3.2rem; align-items: center; gap: 0.55rem; padding: 0.7rem; border: 1px dashed var(--app-border); border-radius: 0.55rem; color: var(--app-muted); font-size: 0.8rem; }

	.status-copy {
		display: grid;
		min-width: 0;
		grid-template-columns: 1fr auto;
		column-gap: 0.75rem;
		align-items: baseline;
		flex: 1;
	}

	.status-copy > span {
		color: var(--app-muted);
		font-size: 0.72rem;
	}

	.status-copy strong {
		grid-column: 2;
		grid-row: 1 / 3;
		font-size: 1.45rem;
		line-height: 1;
	}

	.absent-stat .status-copy strong {
		color: var(--app-danger);
	}

	.status-copy small {
		grid-column: 1;
		margin-top: 0.18rem;
		color: var(--app-muted);
		font-size: 0.62rem;
	}

	/* ================================
	   FOOTER NOTE
	================================ */

	.home-footer-note {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		color: var(--app-muted);
		font-size: 0.63rem;
		text-align: center;
	}

	.footer-line {
		width: 2.5rem;
		height: 1px;
		background: var(--app-border);
	}

	/* ================================
	   ANIMATION
	================================ */

	@keyframes home-enter {
		from {
			opacity: 0;
			transform: translateY(0.65rem);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ================================
	   TABLET
	================================ */

	@media (max-width: 850px) {
		.welcome-section {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.45rem;
		}

		.today-date {
			min-width: 0;
		}

		.today-overview {
			grid-template-columns: 1fr;
		}

		.status-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	/* ================================
	   MOBILE
	================================ */

	@media (max-width: 620px) {
		.welcome-section {
			margin-bottom: 0.9rem;
		}

		.welcome-section h1 {
			font-size: 1.45rem;
		}

		.welcome-subtitle {
			font-size: 0.78rem;
		}

		.today-date {
			width: auto;
			gap: 0.4rem;
		}
		.date-icon { width: 1.8rem; height: 1.8rem; flex-basis: 1.8rem; }
		.today-date strong, .today-date span:last-child { font-size: 0.9rem; }

		.quick-grid {
			grid-template-columns: 1fr;
		}

		.quick-link {
			min-height: 4.8rem;
		}

		.quick-copy small {
			white-space: normal;
		}

		.status-grid {
			grid-template-columns: 1fr;
		}

		.behaviour-card-list { grid-template-columns: 1fr; }

		.status-block {
			min-height: 4.4rem;
		}

		.attendance-counts {
			gap: 0.8rem;
		}

		.attendance-recorded {
			display: none;
		}

		.attendance-card {
			padding: 1rem;
		}

		.attendance-card-top {
			gap: 0.6rem;
		}

		.attendance-status {
			font-size: 0.57rem;
		}
	}

	@media (max-width: 390px) {
		.attendance-status {
			display: none;
		}

		.attendance-counts {
			justify-content: space-between;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.home-view {
			animation: none;
		}

		.progress-track span {
			transition: none;
		}
	}
</style>