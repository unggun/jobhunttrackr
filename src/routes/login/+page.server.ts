import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/** Only allow redirects back into this app after signing in. */
function safeNext(value: string | null | undefined) {
	return value?.startsWith('/') && !value.startsWith('//') ? value : '/applications';
}

export const load: PageServerLoad = (event) => {
	if (event.locals.user) redirect(303, safeNext(event.url.searchParams.get('next')));
	return {
		next: safeNext(event.url.searchParams.get('next')),
		error: event.url.searchParams.has('error')
	};
};

export const actions: Actions = {
	github: async (event) => {
		const formData = await event.request.formData();
		const next = safeNext(formData.get('next')?.toString());

		const result = await event.locals.auth.api.signInSocial({
			body: {
				provider: 'github',
				callbackURL: next,
				errorCallbackURL: '/login?error=1'
			}
		});

		if (result.url) redirect(303, result.url, { external: ['https://github.com'] });
		return fail(400, { message: 'Could not start GitHub sign-in.' });
	}
};
