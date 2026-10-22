import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/** Only allow redirects back into this app after signing in. */
function safeNext(value: string | null | undefined) {
	return value?.startsWith('/') && !value.startsWith('//') ? value : '/applications';
}

export const load: PageServerLoad = (event) => {
	// The OAuth server sends people here, with a signed query, when an app like Claude
	// asks to connect and nobody is signed in. That query is passed back on sign-in.
	const oauthQuery = event.url.searchParams.has('sig') ? event.url.search.slice(1) : null;
	if (event.locals.user && !oauthQuery) redirect(303, safeNext(event.url.searchParams.get('next')));
	return {
		next: safeNext(event.url.searchParams.get('next')),
		oauthQuery,
		error: event.url.searchParams.has('error')
	};
};

export const actions: Actions = {
	github: async (event) => {
		const formData = await event.request.formData();
		const next = safeNext(formData.get('next')?.toString());
		const oauthQuery = formData.get('oauth_query')?.toString() || undefined;

		const result = await event.locals.auth.api.signInSocial({
			body: {
				provider: 'github',
				callbackURL: next,
				errorCallbackURL: '/login?error=1',
				// Resumes the OAuth authorization (and its consent screen) after GitHub sign-in.
				...(oauthQuery && { oauth_query: oauthQuery })
			}
		});

		if (result.url) redirect(303, result.url, { external: ['https://github.com'] });
		return fail(400, { message: 'Could not start GitHub sign-in.' });
	}
};
