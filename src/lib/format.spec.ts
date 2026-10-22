import { describe, expect, it } from 'vitest';
import { formatRelativeDay, isValidTimeZone, toInputValue } from './format';

describe('format', () => {
	const now = new Date('2026-10-22T23:30:00Z');

	it('counts calendar days in the viewer time zone', () => {
		// 23:30 UTC is already the 23rd in Jakarta.
		expect(formatRelativeDay(new Date('2026-10-22T10:00:00Z'), 'UTC', now)).toBe('today');
		expect(formatRelativeDay(new Date('2026-10-22T10:00:00Z'), 'Asia/Jakarta', now)).toBe(
			'yesterday'
		);
		expect(formatRelativeDay(new Date('2026-10-08T10:00:00Z'), 'UTC', now)).toBe('2 weeks ago');
		expect(formatRelativeDay(new Date('2026-10-25T10:00:00Z'), 'UTC', now)).toBe('in 3 days');
	});

	it('builds input values in the viewer time zone', () => {
		expect(toInputValue(now, 'date', 'Asia/Jakarta')).toBe('2026-10-23');
		expect(toInputValue(now, 'datetime-local', 'Asia/Jakarta')).toBe('2026-10-23T06:30');
		expect(toInputValue(null, 'date', 'UTC')).toBe('');
	});

	it('validates time zones', () => {
		expect(isValidTimeZone('Asia/Jakarta')).toBe(true);
		expect(isValidTimeZone('Not/AZone')).toBe(false);
		expect(isValidTimeZone(undefined)).toBe(false);
	});
});
