import { z } from 'zod';
import { applicationInput } from './applications';

/** Reads the add or edit application form, including the repeated question and answer fields. */
export function parseApplicationForm(formData: FormData) {
	const questions = formData.getAll('question').map(String);
	const answers = formData.getAll('answer').map(String);
	const values = Object.fromEntries(
		[...formData].filter(([key]) => key !== 'question' && key !== 'answer')
	) as Record<string, string>;
	const input = {
		...values,
		workMode: values.workMode || null,
		appliedAt: values.appliedAt || null,
		answers: questions
			.map((question, index) => ({ question, answer: answers[index] ?? '' }))
			.filter((answer) => answer.question.trim())
	};
	const parsed = applicationInput.safeParse(input);
	return parsed.success
		? ({ success: true, data: parsed.data } as const)
		: ({
				success: false,
				values: input,
				errors: z.flattenError(parsed.error).fieldErrors
			} as const);
}
