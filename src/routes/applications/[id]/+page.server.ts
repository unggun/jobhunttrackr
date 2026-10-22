import { error, fail } from '@sveltejs/kit';
import { APPLICATION_STATUSES, type ApplicationStatus } from '#lib/applications.ts';
import {
	addInterviewRound,
	deleteInterviewRound,
	getApplication,
	interviewRoundInput,
	setStatus,
	updateInterviewRound
} from '#lib/server/applications.ts';
import { renderMarkdown } from '#lib/server/markdown.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const application = await getApplication(locals.db, locals.user!.id, params.id);
	if (!application) error(404, 'Application not found');
	return { application, postingHtml: renderMarkdown(application.posting) };
};

function readRound(formData: FormData) {
	return interviewRoundInput.safeParse({
		name: formData.get('name'),
		scheduledAt: formData.get('scheduledAt') || null,
		interviewers: formData.get('interviewers'),
		prepNotes: formData.get('prepNotes'),
		feedback: formData.get('feedback'),
		outcome: formData.get('outcome') || undefined
	});
}

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
	},
	addRound: async ({ locals, params, request }) => {
		const round = readRound(await request.formData());
		if (!round.success) return fail(400, { message: 'Give the round a name' });
		await addInterviewRound(locals.db, locals.user!.id, params.id, round.data);
	},
	updateRound: async ({ locals, params, request }) => {
		const formData = await request.formData();
		const round = readRound(formData);
		if (!round.success) return fail(400, { message: 'Give the round a name' });
		await updateInterviewRound(
			locals.db,
			locals.user!.id,
			params.id,
			String(formData.get('roundId')),
			round.data
		);
	},
	deleteRound: async ({ locals, params, request }) => {
		const formData = await request.formData();
		await deleteInterviewRound(
			locals.db,
			locals.user!.id,
			params.id,
			String(formData.get('roundId'))
		);
	}
};
