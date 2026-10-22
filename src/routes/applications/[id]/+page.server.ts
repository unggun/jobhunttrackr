import { error, fail } from '@sveltejs/kit';
import { APPLICATION_STATUSES, type ApplicationStatus } from '#lib/applications.ts';
import { getApplication, setStatus } from '#lib/server/applications.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const application = await getApplication(locals.db, locals.user!.id, params.id);
	if (!application) error(404, 'Application not found');
	return { application };
};

export const actions: Actions = {
	status: async ({ locals, params, request }) => {
		const formData = await request.formData();
		const status = formData.get('status')?.toString() as ApplicationStatus;
		if (!APPLICATION_STATUSES.includes(status)) return fail(400, { message: 'Unknown status' });
		await setStatus(
			locals.db,
			locals.user!.id,
			params.id,
			status,
			formData.get('note')?.toString()
		);
	}
};
