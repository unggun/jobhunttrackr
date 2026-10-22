import { error } from '@sveltejs/kit';
import { getApplication } from '#lib/server/applications.ts';
import { renderMarkdown } from '#lib/server/markdown.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const application = await getApplication(locals.db, locals.user!.id, params.id);
	if (!application) error(404, 'Application not found');
	const now = Date.now();
	const nextRound =
		application.rounds.find(
			(round) =>
				round.outcome === 'pending' && (!round.scheduledAt || round.scheduledAt.getTime() >= now)
		) ?? null;
	return {
		application,
		nextRound,
		pastRounds: application.rounds.filter(
			(round) => round !== nextRound && round.outcome !== 'pending'
		),
		postingHtml: renderMarkdown(application.posting)
	};
};
