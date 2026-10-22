import { fail } from '@sveltejs/kit';
import {
	APPLICATION_STATUSES,
	CLOSED_STATUSES,
	type ApplicationStatus
} from '#lib/applications.ts';
import {
	listApplications,
	setStatus,
	statusCounts,
	upcomingInterviews
} from '#lib/server/applications.ts';
import type { Actions, PageServerLoad } from './$types';

const isStatus = (value: unknown): value is ApplicationStatus =>
	APPLICATION_STATUSES.includes(value as ApplicationStatus);

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const view = url.searchParams.get('view') === 'board' ? 'board' : 'list';
	const search = url.searchParams.get('q')?.trim() ?? '';
	const filterParam = url.searchParams.get('status');
	const filter = isStatus(filterParam) || filterParam === 'all' ? filterParam : 'active';

	// The board always shows every status as columns, so only the list is filtered by status.
	const statuses =
		view === 'board' || filter === 'all'
			? undefined
			: filter === 'active'
				? APPLICATION_STATUSES.filter((status) => !CLOSED_STATUSES.includes(status))
				: [filter];

	const [applications, counts, interviews] = await Promise.all([
		listApplications(locals.db, userId, { statuses, search }),
		statusCounts(locals.db, userId),
		upcomingInterviews(locals.db, userId).limit(5)
	]);
	return { applications, counts, interviews, view, search, filter };
};

export const actions: Actions = {
	status: async ({ locals, request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const status = formData.get('status');
		if (!id || !isStatus(status)) return fail(400, { message: 'Unknown status' });
		await setStatus(locals.db, locals.user!.id, id, status);
	}
};
