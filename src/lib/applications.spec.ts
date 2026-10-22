import { describe, expect, it } from 'vitest';
import { jobUrlKey, needsFollowUp, placeLabel } from './applications';

describe('jobUrlKey', () => {
	it('treats the same posting with tracking parameters as one job', () => {
		expect(
			jobUrlKey('https://www.linkedin.com/jobs/view/123/?trk=public&utm_source=x&refId=abc')
		).toBe(jobUrlKey('http://linkedin.com/jobs/view/123'));
	});

	it('keeps parameters that identify the job', () => {
		expect(jobUrlKey('https://boards.greenhouse.io/acme/jobs?gh_jid=42&gh_src=feed')).toBe(
			'boards.greenhouse.io/acme/jobs?gh_jid=42'
		);
		expect(jobUrlKey('https://x.com/jobs?id=1')).not.toBe(jobUrlKey('https://x.com/jobs?id=2'));
	});

	it('handles empty and invalid input', () => {
		expect(jobUrlKey('')).toBeNull();
		expect(jobUrlKey(null)).toBeNull();
		expect(jobUrlKey(' Not A URL ')).toBe('not a url');
	});
});

describe('needsFollowUp', () => {
	const now = new Date('2026-10-22T12:00:00Z');
	const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

	it('flags applications with no news for over two weeks', () => {
		expect(needsFollowUp({ status: 'applied', updatedAt: daysAgo(15) }, now)).toBe(true);
		expect(needsFollowUp({ status: 'screening', updatedAt: daysAgo(20) }, now)).toBe(true);
		expect(needsFollowUp({ status: 'applied', updatedAt: daysAgo(3) }, now)).toBe(false);
	});

	it('ignores statuses where waiting is expected or nothing is pending', () => {
		expect(needsFollowUp({ status: 'saved', updatedAt: daysAgo(30) }, now)).toBe(false);
		expect(needsFollowUp({ status: 'rejected', updatedAt: daysAgo(30) }, now)).toBe(false);
	});
});

describe('placeLabel', () => {
	it('joins location and work mode without repeating remote', () => {
		expect(placeLabel({ location: 'Jakarta', workMode: 'hybrid' })).toBe('Jakarta · Hybrid');
		expect(placeLabel({ location: 'Remote', workMode: 'remote' })).toBe('Remote');
		expect(placeLabel({ location: null, workMode: 'onsite' })).toBe('Onsite');
		expect(placeLabel({})).toBe('');
	});
});
