import type { Handle } from '@sveltejs/kit/hooks';
import { error, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { env } from 'cloudflare:workers';
import { ORIGIN } from '$app/env/private';
import { createAuth } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db/index.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { handleWellKnown } from '#lib/server/oauth-metadata.ts';

/** OAuth endpoints that apps call from their own servers, with their own origin or none. */
const OAUTH_SERVER_PATHS = [
	'/api/auth/oauth2/token',
	'/api/auth/oauth2/register',
	'/api/auth/oauth2/revoke',
	'/api/auth/oauth2/introspect'
];
const FORM_CONTENT_TYPES = [
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	'text/plain'
];
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * SvelteKit's cross-site form check, minus the OAuth endpoints above. It refuses form posts
 * from other sites so a page elsewhere can't submit this app's forms as a signed-in user.
 */
const handleCsrf: Handle = ({ event, resolve }) => {
	const { request, url } = event;
	const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
	const isForm = !contentType || FORM_CONTENT_TYPES.includes(contentType);
	if (
		!SAFE_METHODS.includes(request.method) &&
		isForm &&
		request.headers.get('origin') !== url.origin &&
		!OAUTH_SERVER_PATHS.includes(url.pathname)
	) {
		error(403, `Cross-site ${request.method} form submissions are forbidden`);
	}
	return resolve(event);
};

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

export const handle: Handle = sequence(handleCsrf, handleBetterAuth, handleDiscovery, requireUser);
