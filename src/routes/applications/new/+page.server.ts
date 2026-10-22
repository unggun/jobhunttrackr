import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { applicationInput, createApplication } from '#lib/server/applications.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const values = Object.fromEntries(await request.formData()) as Record<string, string>;
		const parsed = applicationInput.safeParse({ ...values, workMode: values.workMode || null });
		if (!parsed.success) {
			return fail(400, { values, errors: z.flattenError(parsed.error).fieldErrors });
		}
		const id = await createApplication(locals.db, locals.user!.id, parsed.data);
		redirect(303, `/applications/${id}`);
	}
};
