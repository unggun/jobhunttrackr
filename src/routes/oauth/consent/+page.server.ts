import { BETTER_AUTH_SECRET } from '$app/env/private';
import { verifyOAuthQueryParams } from '@better-auth/oauth-provider';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// The OAuth server sends you here with a signed, short-lived copy of the app's request.
	// Check the signature first, so a tampered or expired link can't show a misleading page.
	const oauthQuery = event.url.search.slice(1);
	if (!(await verifyOAuthQueryParams(oauthQuery, BETTER_AUTH_SECRET))) {
		error(400, 'This link has expired. Start connecting again from the app.');
	}
	const clientId = event.url.searchParams.get('client_id');
	if (!clientId) error(400, 'This link is missing its request.');

	const client = await event.locals.auth.api
		.getOAuthClientPublic({ query: { client_id: clientId }, headers: event.request.headers })
		.catch(() => null);
	if (!client) error(404, 'That app is not registered with this tracker.');

	// Apps name themselves when they register, so also show where approving sends you.
	const redirectUri = URL.parse(event.url.searchParams.get('redirect_uri') ?? '');

	return {
		clientName: client.client_name || 'An app',
		redirectHost: redirectUri?.host ?? null,
		oauthQuery
	};
};

async function answer(event: Parameters<Actions[string]>[0], accept: boolean) {
	const formData = await event.request.formData();
	const oauthQuery = formData.get('oauth_query')?.toString();
	if (!oauthQuery) return fail(400, { message: 'This request has expired. Try connecting again.' });

	const result = await event.locals.auth.api
		// Approving continues the authorization, which needs the original request (for its headers).
		.oauth2Consent({
			body: { accept, oauth_query: oauthQuery },
			request: event.request,
			headers: event.request.headers,
			asResponse: false
		})
		.catch(() => null);
	if (!result?.url)
		return fail(400, { message: 'This request has expired. Try connecting again.' });

	// The app's redirect URI is usually localhost (Claude Code) or claude.ai.
	redirect(303, result.url, { external: true });
}

export const actions: Actions = {
	allow: (event) => answer(event, true),
	deny: (event) => answer(event, false)
};
