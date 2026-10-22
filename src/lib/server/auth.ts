import {
	ORIGIN,
	BETTER_AUTH_SECRET,
	GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET,
	ALLOWED_EMAILS
} from '$app/env/private';

import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { count } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/schema.ts';
import { canCreateAccount } from '#lib/server/access.ts';

const DAY = 60 * 60 * 24;

const authConfig = {
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	socialProviders: {
		github: {
			clientId: GITHUB_CLIENT_ID,
			clientSecret: GITHUB_CLIENT_SECRET
		}
	},
	session: {
		// Stay signed in for a month, refreshed daily while the app is in use.
		expiresIn: 30 * DAY,
		updateAge: DAY
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
} satisfies Omit<Parameters<typeof betterAuth>[0], 'database'>;

const REQUIRED_ENV = { ORIGIN, BETTER_AUTH_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET };

export const createAuth = (d1: D1Database) => {
	if (d1) {
		const missing = Object.entries(REQUIRED_ENV).filter(([, value]) => !value);
		if (missing.length) {
			throw new Error(
				`Missing environment variables: ${missing.map(([name]) => name).join(', ')}. See README.md.`
			);
		}
	}
	const db = getDb(d1);
	return betterAuth({
		...authConfig,
		database: drizzleAdapter(db, { provider: 'sqlite' }),
		databaseHooks: {
			user: {
				create: {
					// This is a personal tracker: block strangers from signing up on your deployment.
					before: async (newUser) => {
						const [{ users }] = await db.select({ users: count() }).from(user);
						return canCreateAccount({
							email: newUser.email,
							allowedEmails: ALLOWED_EMAILS,
							existingUsers: users
						});
					}
				}
			}
		}
	});
};

/**
 * DO NOT USE!
 *
 * This instance is used by the `auth` CLI for schema generation ONLY.
 * To access `auth` at runtime, use `event.locals.auth`.
 */
export const auth = createAuth(null!);
