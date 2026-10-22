import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker';
import { z } from 'zod';
import {
	APPLICATION_STATUSES,
	CLOSED_STATUSES,
	INTERVIEW_OUTCOMES,
	WORK_MODES
} from '../applications';
import {
	ApplicationNotFoundError,
	addInterviewRound,
	appendAnswers,
	createApplication,
	findSimilarApplications,
	getApplication,
	listApplications,
	replaceAnswers,
	setStatus,
	updateApplication
} from './applications';
import type { getDb } from './db';

type Db = ReturnType<typeof getDb>;

const INSTRUCTIONS = `This is the user's job hunt tracker. Use it whenever you help them apply for a job.

Before filling in an application form, call find_applications with the job posting URL and company to check whether they already applied.

After the form is submitted, call log_application with the company, role, links, the full job description as Markdown in "posting", and every form question with the exact answer you entered in "answers". Saving the posting matters: postings are often taken down before interviews.

When the user tells you about news (a recruiter reply, an interview invite, a rejection), call update_status and, for interviews, add_interview_round.`;

const answers = z
	.array(
		z.object({
			question: z.string().describe('The form question or field label, as shown on the form'),
			answer: z.string().describe('Exactly what was entered or selected')
		})
	)
	.describe('Form questions and the answers that were entered');

const dateInput = z
	.string()
	.describe('ISO 8601 date or date-time, e.g. 2026-10-22 or 2026-10-22T14:00:00+07:00');

/** Builds an MCP server whose tools act on one user's applications. */
export function createMcpServer(db: Db, userId: string, origin: string) {
	const server = new McpServer(
		{ name: 'job-hunt-tracker', title: 'Job Hunt Tracker', version: '0.1.0' },
		{ instructions: INSTRUCTIONS, jsonSchemaValidator: new CfWorkerJsonSchemaValidator() }
	);

	const appUrl = (id: string) => `${origin}/applications/${id}`;
	const ok = (data: unknown) => ({
		content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }]
	});
	const fail = (message: string) => ({
		isError: true,
		content: [{ type: 'text' as const, text: message }]
	});

	/** Turns "not found" from the data layer into a tool error the model can act on. */
	async function run<T>(action: () => Promise<T>) {
		try {
			return ok(await action());
		} catch (error) {
			if (error instanceof ApplicationNotFoundError) {
				return fail('No application with that id. Use find_applications to look it up.');
			}
			if (error instanceof z.ZodError) return fail(`Invalid input: ${z.prettifyError(error)}`);
			throw error;
		}
	}

	server.registerTool(
		'find_applications',
		{
			title: 'Find applications',
			description:
				'Check whether the user already applied to a job, by posting URL and/or company name. Call this before filling in an application. Matches on the posting URL ignore tracking parameters.',
			inputSchema: {
				job_url: z.string().optional().describe('The job posting URL'),
				company: z.string().optional().describe('Company name; partial matches count')
			},
			annotations: { readOnlyHint: true }
		},
		async ({ job_url, company }) => {
			if (!job_url && !company) return fail('Give a job_url, a company, or both.');
			return run(async () => {
				const matches = await findSimilarApplications(db, userId, { jobUrl: job_url, company });
				return {
					already_applied_to_this_posting: matches.some((match) => match.sameJobUrl),
					matches: matches.map((match) => ({
						id: match.id,
						company: match.company,
						role: match.role,
						status: match.status,
						applied_at: match.appliedAt,
						same_posting: match.sameJobUrl,
						url: appUrl(match.id)
					}))
				};
			});
		}
	);

	server.registerTool(
		'log_application',
		{
			title: 'Log an application',
			description:
				'Save a job application to the tracker, normally right after submitting the form. Include the full job description in "posting" and every form answer in "answers".',
			inputSchema: {
				company: z.string(),
				role: z.string().describe('Job title'),
				job_url: z.string().optional().describe('The job posting URL'),
				application_url: z
					.string()
					.optional()
					.describe('The application form URL, if different from the posting'),
				location: z.string().optional(),
				work_mode: z.enum(WORK_MODES).optional(),
				salary: z
					.string()
					.optional()
					.describe('Salary range from the posting, or what was asked for'),
				source: z.string().optional().describe('Where the job was found, e.g. LinkedIn'),
				status: z
					.enum(APPLICATION_STATUSES)
					.optional()
					.describe('Defaults to "applied". Use "saved" for jobs not applied to yet.'),
				applied_at: dateInput.optional().describe('Defaults to now'),
				posting: z
					.string()
					.optional()
					.describe(
						'The full job description as Markdown: responsibilities, requirements, benefits'
					),
				answers: answers.optional(),
				resume_version: z.string().optional().describe('Which resume or CV file was sent'),
				notes: z.string().optional()
			}
		},
		async (input) =>
			run(async () => {
				const duplicates = await findSimilarApplications(db, userId, { jobUrl: input.job_url });
				const id = await createApplication(db, userId, {
					company: input.company,
					role: input.role,
					jobUrl: input.job_url,
					applicationUrl: input.application_url,
					location: input.location,
					workMode: input.work_mode,
					salary: input.salary,
					source: input.source,
					status: input.status,
					appliedAt: input.applied_at,
					posting: input.posting,
					answers: input.answers,
					resumeVersion: input.resume_version,
					notes: input.notes
				});
				return {
					id,
					url: appUrl(id),
					...(duplicates.length && {
						warning: 'The user already had an application for this posting URL.',
						earlier_applications: duplicates.map((match) => ({
							id: match.id,
							url: appUrl(match.id)
						}))
					})
				};
			})
	);

	server.registerTool(
		'save_answers',
		{
			title: 'Save form answers',
			description:
				'Save form questions and answers on an existing application, e.g. from a later page of a multi-step form.',
			inputSchema: {
				application_id: z.string(),
				answers,
				replace: z
					.boolean()
					.optional()
					.describe('Replace all saved answers instead of adding to them. Defaults to false.')
			}
		},
		async ({ application_id, answers, replace }) =>
			run(async () => {
				await (replace ? replaceAnswers : appendAnswers)(db, userId, application_id, answers);
				return { saved: answers.length, url: appUrl(application_id) };
			})
	);

	server.registerTool(
		'update_status',
		{
			title: 'Update status',
			description:
				'Record news on an application: screening call, interview, offer, rejection and so on. The note is kept on its timeline.',
			inputSchema: {
				application_id: z.string(),
				status: z.enum(APPLICATION_STATUSES),
				note: z
					.string()
					.optional()
					.describe('What happened, e.g. "Recruiter emailed to book a call"')
			}
		},
		async ({ application_id, status, note }) =>
			run(async () => {
				await setStatus(db, userId, application_id, status, note);
				return { status, url: appUrl(application_id) };
			})
	);

	server.registerTool(
		'update_application',
		{
			title: 'Update application details',
			description:
				'Change details of an application, for example to add the job description or salary later. Only the fields given are changed.',
			inputSchema: {
				application_id: z.string(),
				company: z.string().optional(),
				role: z.string().optional(),
				job_url: z.string().optional(),
				application_url: z.string().optional(),
				location: z.string().optional(),
				work_mode: z.enum(WORK_MODES).optional(),
				salary: z.string().optional(),
				source: z.string().optional(),
				applied_at: dateInput.optional(),
				posting: z.string().optional().describe('The full job description as Markdown'),
				resume_version: z.string().optional(),
				notes: z.string().optional().describe('Replaces the existing notes')
			}
		},
		async ({ application_id, ...input }) =>
			run(async () => {
				await updateApplication(db, userId, application_id, {
					company: input.company,
					role: input.role,
					jobUrl: input.job_url,
					applicationUrl: input.application_url,
					location: input.location,
					workMode: input.work_mode,
					salary: input.salary,
					source: input.source,
					appliedAt: input.applied_at,
					posting: input.posting,
					resumeVersion: input.resume_version,
					notes: input.notes
				});
				return { updated: true, url: appUrl(application_id) };
			})
	);

	server.registerTool(
		'add_interview_round',
		{
			title: 'Add an interview round',
			description: 'Add a scheduled or finished interview round to an application.',
			inputSchema: {
				application_id: z.string(),
				name: z.string().describe('e.g. Recruiter call, Technical interview, Onsite'),
				scheduled_at: dateInput.optional(),
				interviewers: z.string().optional(),
				prep_notes: z.string().optional().describe('What to prepare'),
				outcome: z.enum(INTERVIEW_OUTCOMES).optional()
			}
		},
		async ({ application_id, scheduled_at, prep_notes, ...input }) =>
			run(async () => {
				const id = await addInterviewRound(db, userId, application_id, {
					...input,
					scheduledAt: scheduled_at,
					prepNotes: prep_notes
				});
				return { id, prep_page: `${appUrl(application_id)}/prep` };
			})
	);

	server.registerTool(
		'get_application',
		{
			title: 'Get an application',
			description:
				'Everything saved about one application: the job posting, form answers, status timeline and interview rounds. Use it to help the user prepare for an interview.',
			inputSchema: { application_id: z.string() },
			annotations: { readOnlyHint: true }
		},
		async ({ application_id }) =>
			run(async () => {
				const app = await getApplication(db, userId, application_id);
				if (!app) throw new ApplicationNotFoundError(application_id);
				const result: Partial<typeof app> = { ...app };
				delete result.userId;
				delete result.jobUrlKey;
				return { ...result, url: appUrl(app.id) };
			})
	);

	server.registerTool(
		'list_applications',
		{
			title: 'List applications',
			description:
				"List the user's applications, most recently updated first. By default only open ones (not rejected, withdrawn, ghosted or accepted).",
			inputSchema: {
				status: z.enum(APPLICATION_STATUSES).optional(),
				include_closed: z.boolean().optional(),
				search: z.string().optional().describe('Matches company or role'),
				limit: z.number().int().min(1).max(200).optional().describe('Defaults to 50')
			},
			annotations: { readOnlyHint: true }
		},
		async ({ status, include_closed, search, limit }) =>
			run(async () => {
				const statuses = status
					? [status]
					: include_closed
						? undefined
						: APPLICATION_STATUSES.filter((value) => !CLOSED_STATUSES.includes(value));
				const rows = await listApplications(db, userId, { statuses, search }).limit(limit ?? 50);
				return rows.map((row) => ({ ...row, url: appUrl(row.id) }));
			})
	);

	return server;
}
