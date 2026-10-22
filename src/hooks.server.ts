import type { Handle } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { env } from 'cloudflare:workers';
import { ORIGIN } from '$app/env/private';
import { createAuth } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db/index.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { handleWellKnown } from '#lib/server/oauth-metadata.ts';

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

	const response = await svelteKitHandler({ event, resolve, auth, building });
	if (event.url.pathname.startsWith('/api/auth/oauth2/') && response.status >= 400) {
		await logOAuthError(event.request, event.url.pathname, response);
	}
	return response;
};

/**
 * Logs why an OAuth request from an app like Claude was refused, so `wrangler tail`
 * shows the reason. Logs the error code and how the client authenticated, never secrets.
 */
async function logOAuthError(request: Request, path: string, response: Response) {
	const body = (await response
		.clone()
		.json()
		.catch(() => null)) as Record<string, string> | null;
	console.warn('OAuth request refused', {
		path,
		status: response.status,
		error: body?.error ?? body?.code,
		description: body?.error_description ?? body?.message,
		clientAuth: request.headers.get('authorization')?.split(' ')[0] ?? 'none',
		contentType: request.headers.get('content-type')
	});
}

/** OAuth discovery documents that MCP clients fetch before signing in. */
const handleDiscovery: Handle = async ({ event, resolve }) =>
	(await handleWellKnown(event.request, ORIGIN, event.locals.auth)) ?? resolve(event);

// /mcp checks OAuth access tokens itself.
const PUBLIC_PATHS = ['/login', '/api/auth', '/mcp'];

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

export const handle: Handle = sequence(handleBetterAuth, handleDiscovery, requireUser);
