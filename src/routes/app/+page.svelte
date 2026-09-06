<script>
	import { getContext, onMount } from 'svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { loadAttendance } from '$lib/data/attendance.js';
	import { temporaryNotifications } from '$lib/data/school.js';
	import { importedStudents } from '$lib/data/students.js';

	const appState = getContext('app-state');
	const isArabic = $derived(appState.language === 'ar');

/** @type {any} */
let attendanceData = $state({
	current: {},
	history: []
});
	onMount(() => {
		attendanceData = loadAttendance();
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
			href: '/app/students',
			icon: 'students',
			ar: 'التلاميذ',
			en: 'Students',
			arText: 'متابعة بيانات التلاميذ',
			enText: 'Follow up on student records'
		},
		{
			href: '/app/notifications',
			icon: 'notifications',
			ar: 'التنبيهات',
			en: 'Notifications',
			arText: 'الاطلاع على التنبيهات',
			enText: 'Review notifications'
		}
	];

	const today = $derived(new Date().toISOString().slice(0, 10));
	const todayRecords = $derived(
    attendanceData.history.filter(
        /** @param {{ date: string, status: 'present' | 'absent' }} record */
        (record) => record.date === today
    )
);

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
</script>

<section class="home-view" aria-labelledby="home-title">
	<!-- WELCOME -->
	<header class="welcome-section">
		<div class="welcome-copy">
			<p class="welcome-eyebrow">
				{isArabic ? 'فضاء المتابعة المدرسية' : 'SCHOOL FOLLOW-UP PORTAL'}
			</p>

			<h1 id="home-title">
				{isArabic ? 'صباح الخير، أبو بكر باباي' : 'Good morning, Abu Bakr Babay'}
			</h1>

			<p class="welcome-subtitle">
				{isArabic
					? 'القيّم · المدرسة التونسية بالدوحة · فرع اللقطة'
					: 'Qayyim · Tunisian School in Doha · Al-Luqta Branch'}
			</p>
		</div>

		<div class="today-date">
			<span class="date-icon">
				<AppIcon name="attendance" size={17} />
			</span>

			<div>
				<strong>
					{isArabic ? 'اليوم' : 'Today'}
				</strong>

				<span>
					{new Date().toLocaleDateString(
						isArabic ? 'ar-QA' : 'en-GB',
						{
							weekday: 'long',
							day: 'numeric',
							month: 'long',
							year: 'numeric'
						}
					)}
				</span>
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
		<div class="section-heading">
			<div>
				<p class="section-kicker">
					{isArabic ? 'ملخص' : 'OVERVIEW'}
				</p>

				<h2 id="today-title">
					{isArabic ? 'اليوم' : 'Today'}
				</h2>
			</div>
		</div>

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
							{attendancePercent}<span>%</span>
						</div>

						<p>
							{#if recordedAttendance}
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
						class:complete={recordedAttendance > 0}
						class="attendance-status"
					>
						<span></span>

						{recordedAttendance
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
							? `${attendancePercent}% حاضر`
							: `${attendancePercent}% present`
					}
				>
					<span style={`width: ${attendancePercent}%`}></span>
				</div>

				<div class="attendance-counts">
					<div class="attendance-count present">
						<span class="count-dot"></span>

						<div>
							<strong>{attendanceSummary.present}</strong>
							<span>{isArabic ? 'حاضر' : 'Present'}</span>
						</div>
					</div>

					<div class="attendance-count absent">
						<span class="count-dot"></span>

						<div>
							<strong>{attendanceSummary.absent}</strong>
							<span>{isArabic ? 'غائب' : 'Absent'}</span>
						</div>
					</div>

					<div class="attendance-recorded">
						<span>
							{isArabic ? 'المسجل' : 'Recorded'}
						</span>

						<strong>{recordedAttendance}</strong>
					</div>
				</div>
			</div>

			<!-- STATISTICS -->
			<div class="status-grid">
				<div class="status-block present-stat">
					<div class="status-icon">
						<AppIcon name="attendance" size={18} />
					</div>

					<div class="status-copy">
						<span>
							{isArabic ? 'الحضور' : 'Present'}
						</span>

						<strong>{attendanceSummary.present}</strong>

						<small>
							{recordedAttendance
								? isArabic
									? 'مسجل اليوم'
									: 'Recorded today'
								: isArabic
									? 'بانتظار التسجيل'
									: 'Awaiting records'}
						</small>
					</div>
				</div>

				<div class="status-block absent-stat">
					<div class="status-icon">
						<AppIcon name="attendance" size={18} />
					</div>

					<div class="status-copy">
						<span>
							{isArabic ? 'الغيابات' : 'Absences'}
						</span>

						<strong>{attendanceSummary.absent}</strong>

						<small>
							{recordedAttendance
								? isArabic
									? 'مسجل اليوم'
									: 'Recorded today'
								: isArabic
									? 'بانتظار التسجيل'
									: 'Awaiting records'}
						</small>
					</div>
				</div>

				<div class="status-block notification-stat">
					<div class="status-icon">
						<AppIcon name="notifications" size={18} />
					</div>

					<div class="status-copy">
						<span>
							{isArabic
								? 'التنبيهات والملاحظات'
								: 'Notifications & notes'}
						</span>

						<strong>{temporaryNotifications.length}</strong>

						<small>
							{isArabic
								? 'تنبيهات محلية مؤقتة'
								: 'Temporary local notices'}
						</small>
					</div>
				</div>
			</div>
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
		align-items: flex-end;
		justify-content: space-between;
		gap: 2rem;
		margin-bottom: 2rem;
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
		font-size: clamp(1.75rem, 4vw, 2.35rem);
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
		min-width: 13rem;
		align-items: center;
		gap: 0.65rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--app-border);
		border-radius: 0.7rem;
		background: var(--app-surface);
		box-shadow: var(--app-shadow);
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
		flex-direction: column;
		gap: 0.15rem;
	}

	.today-date strong {
		font-size: 0.72rem;
	}

	.today-date span:last-child {
		color: var(--app-muted);
		font-size: 0.7rem;
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
		margin-top: 0.8rem;
		color: var(--app-text);
		font-size: clamp(2.3rem, 5vw, 3.15rem);
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
		height: 0.55rem;
		margin: 1.35rem 0 1rem;
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
	}

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

	.present-stat .status-icon {
		background: color-mix(in srgb, var(--app-success) 10%, var(--app-surface));
		color: var(--app-success);
	}

	.absent-stat .status-icon {
		background: color-mix(in srgb, var(--app-danger) 9%, var(--app-surface));
		color: var(--app-danger);
	}

	.notification-stat .status-icon {
		background: var(--app-accent-soft);
		color: var(--app-accent);
	}

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

	.present-stat .status-copy strong {
		color: var(--app-success);
	}

	.absent-stat .status-copy strong {
		color: var(--app-danger);
	}

	.notification-stat .status-copy strong {
		color: var(--app-accent);
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
			gap: 1rem;
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
			margin-bottom: 1.5rem;
		}

		.welcome-section h1 {
			font-size: 1.65rem;
		}

		.welcome-subtitle {
			font-size: 0.78rem;
		}

		.today-date {
			width: 100%;
		}

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