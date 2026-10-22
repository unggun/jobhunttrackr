import { error, fail, redirect } from '@sveltejs/kit';
import {
	deleteApplication,
	getApplication,
	replaceAnswers,
	updateApplication
} from '#lib/server/applications.ts';
import { parseApplicationForm } from '#lib/server/forms.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const application = await getApplication(locals.db, locals.user!.id, params.id);
	if (!application) error(404, 'Application not found');
	return { application };
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const parsed = parseApplicationForm(await request.formData());
		if (!parsed.success) return fail(400, { values: parsed.values, errors: parsed.errors });
		// Status changes go through the timeline, and the patch schema ignores it.
		const { answers, ...fields } = parsed.data;
		await updateApplication(locals.db, locals.user!.id, params.id, fields);
		await replaceAnswers(locals.db, locals.user!.id, params.id, answers);
		redirect(303, `/applications/${params.id}`);
	},
	delete: async ({ locals, params }) => {
		await deleteApplication(locals.db, locals.user!.id, params.id);
		redirect(303, '/applications');
	}
};
