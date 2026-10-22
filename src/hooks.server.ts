import type { Handle } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { env } from 'cloudflare:workers';
import { createAuth } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db/index.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (!env.DB) throw new Error('D1 binding "DB" not found - check wrangler.jsonc');

	event.locals.db = getDb(env.DB);
	event.locals.auth = createAuth(env.DB);

	const { auth } = event.locals;
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

const PUBLIC_PATHS = ['/login', '/api/auth'];

/** Everything except the login page needs a signed-in user. */
const requireUser: Handle = async ({ event, resolve }) => {
	const isPublic = PUBLIC_PATHS.some(
		(path) => event.url.pathname === path || event.url.pathname.startsWith(`${path}/`)
	);
	if (!isPublic && !event.locals.user) {
		const next = event.url.pathname + event.url.search;
		redirect(303, next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`);
	}
	return resolve(event);
};

export const handle: Handle = sequence(handleBetterAuth, requireUser);
