import { APPLICATION_STATUSES, type ApplicationStatus } from '#lib/applications.ts';
import { listApplications } from '#lib/server/applications.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const status = url.searchParams.get('status');
	const search = url.searchParams.get('q') ?? '';
	const statuses = APPLICATION_STATUSES.includes(status as ApplicationStatus)
		? [status as ApplicationStatus]
		: undefined;
	return {
		applications: await listApplications(locals.db, locals.user!.id, { statuses, search }),
		status: statuses?.[0] ?? null,
		search
	};
};
