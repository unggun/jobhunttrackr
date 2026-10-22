import { json } from '@sveltejs/kit';
import { findSimilarApplications } from '#lib/server/applications.ts';
import type { RequestHandler } from './$types';

/** Used by the add form to warn before tracking a job you already applied to. */
export const GET: RequestHandler = async ({ locals, url }) => {
	const matches = await findSimilarApplications(locals.db, locals.user!.id, {
		jobUrl: url.searchParams.get('jobUrl'),
		company: url.searchParams.get('company')
	});
	return json(matches.slice(0, 5));
};
