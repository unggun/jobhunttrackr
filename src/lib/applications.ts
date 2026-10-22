// Shared between the server, the UI and (later) the MCP tools, so keep it free of server-only imports.

export const APPLICATION_STATUSES = [
	'saved',
	'applied',
	'screening',
	'interviewing',
	'offer',
	'accepted',
	'rejected',
	'withdrawn',
	'ghosted'
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
	saved: 'Saved',
	applied: 'Applied',
	screening: 'Screening',
	interviewing: 'Interviewing',
	offer: 'Offer',
	accepted: 'Accepted',
	rejected: 'Rejected',
	withdrawn: 'Withdrawn',
	ghosted: 'Ghosted'
};

/** Statuses where nothing more is expected to happen. */
export const CLOSED_STATUSES: readonly ApplicationStatus[] = [
	'accepted',
	'rejected',
	'withdrawn',
	'ghosted'
];

export const INTERVIEW_OUTCOMES = ['pending', 'passed', 'failed', 'cancelled'] as const;

export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number];

/** Statuses shown as columns on the board, in pipeline order. */
export const BOARD_STATUSES: readonly ApplicationStatus[] = [
	'saved',
	'applied',
	'screening',
	'interviewing',
	'offer'
];

const FOLLOW_UP_AFTER_DAYS = 14;

/**
 * True when an application has sat without news long enough that it's worth a follow-up
 * email, or marking it as ghosted.
 */
export function needsFollowUp(
	app: { status: ApplicationStatus; updatedAt: Date },
	now = new Date()
): boolean {
	if (app.status !== 'applied' && app.status !== 'screening') return false;
	return now.getTime() - app.updatedAt.getTime() > FOLLOW_UP_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

/** "Jakarta · Hybrid", without repeating "Remote" when the location already says it. */
export function placeLabel(app: { location?: string | null; workMode?: string | null }) {
	const mode = app.workMode ? app.workMode[0].toUpperCase() + app.workMode.slice(1) : null;
	if (mode && app.location?.trim().toLowerCase() === mode.toLowerCase()) return mode;
	return [app.location, mode].filter(Boolean).join(' · ');
}

export const WORK_MODES = ['onsite', 'hybrid', 'remote'] as const;

export type WorkMode = (typeof WORK_MODES)[number];

const TRACKING_PARAMS =
	/^(utm_.*|ref|refid|trk|trackingid|source|src|gh_src|lever-source|fbclid|gclid)$/i;

/**
 * Reduces a job posting URL to a stable key so the same job is recognised even when
 * the link was copied with tracking parameters, a trailing slash or a different scheme.
 */
export function jobUrlKey(url: string | null | undefined): string | null {
	if (!url?.trim()) return null;
	let parsed: URL;
	try {
		parsed = new URL(url.trim());
	} catch {
		return url.trim().toLowerCase();
	}
	const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
	const path = parsed.pathname.replace(/\/+$/, '').toLowerCase();
	const params = [...parsed.searchParams]
		.filter(([name]) => !TRACKING_PARAMS.test(name))
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, value]) => `${name}=${value}`)
		.join('&');
	return `${host}${path}${params ? `?${params}` : ''}`;
}
