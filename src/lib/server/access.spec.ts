import { describe, expect, it } from 'vitest';
import { canCreateAccount } from './access';

describe('canCreateAccount', () => {
	it('lets only the first person in when there is no allowlist', () => {
		expect(canCreateAccount({ email: 'a@x.com', allowedEmails: [], existingUsers: 0 })).toBe(true);
		expect(canCreateAccount({ email: 'b@x.com', allowedEmails: [], existingUsers: 1 })).toBe(false);
	});

	it('uses the allowlist when one is set, ignoring case', () => {
		const allowedEmails = ['me@x.com', 'friend@x.com'];
		expect(canCreateAccount({ email: 'Friend@X.com', allowedEmails, existingUsers: 1 })).toBe(true);
		expect(canCreateAccount({ email: 'other@x.com', allowedEmails, existingUsers: 0 })).toBe(false);
	});
});
