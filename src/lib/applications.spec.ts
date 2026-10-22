import { describe, expect, it } from 'vitest';
import { jobUrlKey } from './applications';

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
