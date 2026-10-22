import { fail, redirect } from '@sveltejs/kit';
import { createApplication } from '#lib/server/applications.ts';
import { parseApplicationForm } from '#lib/server/forms.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const parsed = parseApplicationForm(await request.formData());
		if (!parsed.success) return fail(400, { values: parsed.values, errors: parsed.errors });
		const id = await createApplication(locals.db, locals.user!.id, parsed.data);
		redirect(303, `/applications/${id}`);
	}
};
