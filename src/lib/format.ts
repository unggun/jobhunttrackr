// Dates are rendered on the server too, so they take the viewer's time zone explicitly
// (read from the `tz` cookie the layout sets) instead of relying on the runtime's zone.

export function isValidTimeZone(timeZone: string | undefined): timeZone is string {
	if (!timeZone) return false;
	try {
		new Intl.DateTimeFormat(undefined, { timeZone });
		return true;
	} catch {
		return false;
	}
}

export function formatDate(date: Date | null | undefined, timeZone: string) {
	if (!date) return '';
	return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone }).format(date);
}

export function formatDateTime(date: Date | null | undefined, timeZone: string) {
	if (!date) return '';
	return new Intl.DateTimeFormat('en', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: 'numeric',
		minute: '2-digit',
		timeZone
	}).format(date);
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "today", "yesterday", "3 days ago", "in 2 weeks" and so on, by calendar day. */
export function formatRelativeDay(
	date: Date | null | undefined,
	timeZone: string,
	now = new Date()
) {
	if (!date) return '';
	const day = (value: Date) => {
		const [year, month, dayOfMonth] = new Intl.DateTimeFormat('en-CA', { timeZone })
			.format(value)
			.split('-')
			.map(Number);
		return Date.UTC(year, month - 1, dayOfMonth) / 86_400_000;
	};
	const days = day(date) - day(now);
	if (Math.abs(days) < 7) return relative.format(days, 'day');
	if (Math.abs(days) < 60) return relative.format(Math.trunc(days / 7), 'week');
	return formatDate(date, timeZone);
}

/** Value for an `<input type="date">` or `"datetime-local"` in the viewer's time zone. */
export function toInputValue(
	date: Date | null | undefined,
	type: 'date' | 'datetime-local',
	timeZone: string
) {
	if (!date) return '';
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-CA', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
			timeZone
		})
			.formatToParts(date)
			.map((part) => [part.type, part.value])
	);
	const value = `${parts.year}-${parts.month}-${parts.day}`;
	return type === 'date' ? value : `${value}T${parts.hour}:${parts.minute}`;
}
