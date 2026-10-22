import { and, asc, count, desc, eq, gte, inArray, like, or } from 'drizzle-orm';
import { z } from 'zod';
import {
	APPLICATION_STATUSES,
	INTERVIEW_OUTCOMES,
	WORK_MODES,
	type ApplicationStatus,
	jobUrlKey
} from '../applications';
import type { getDb } from './db';
import { application, applicationAnswer, interviewRound, statusEvent } from './db/schema';

type Db = ReturnType<typeof getDb>;

// Input schemas are shared by the web UI and the MCP tools, so both validate the same way.

const optionalText = z
	.string()
	.trim()
	.transform((value) => value || null)
	.nullish();

export const answerInput = z.object({
	question: z.string().trim().min(1),
	answer: z.string()
});

export const applicationInput = z.object({
	company: z.string().trim().min(1),
	role: z.string().trim().min(1),
	location: optionalText,
	workMode: z.enum(WORK_MODES).nullish(),
	salary: optionalText,
	jobUrl: optionalText,
	applicationUrl: optionalText,
	source: optionalText,
	status: z.enum(APPLICATION_STATUSES).default('applied'),
	appliedAt: z.coerce.date().nullish(),
	posting: optionalText,
	resumeVersion: optionalText,
	notes: optionalText,
	answers: z.array(answerInput).default([])
});

export type ApplicationInput = z.input<typeof applicationInput>;

export const applicationPatch = applicationInput
	.omit({ status: true, answers: true })
	.partial()
	.extend({
		company: z.string().trim().min(1).optional(),
		role: z.string().trim().min(1).optional()
	});

export type ApplicationPatch = z.input<typeof applicationPatch>;

export function listApplications(
	db: Db,
	userId: string,
	filter: { statuses?: (typeof APPLICATION_STATUSES)[number][]; search?: string } = {}
) {
	const conditions = [eq(application.userId, userId)];
	if (filter.statuses?.length) conditions.push(inArray(application.status, filter.statuses));
	if (filter.search?.trim()) {
		const pattern = `%${filter.search.trim()}%`;
		conditions.push(or(like(application.company, pattern), like(application.role, pattern))!);
	}
	return db
		.select({
			id: application.id,
			company: application.company,
			role: application.role,
			location: application.location,
			workMode: application.workMode,
			status: application.status,
			salary: application.salary,
			source: application.source,
			jobUrl: application.jobUrl,
			appliedAt: application.appliedAt,
			updatedAt: application.updatedAt
		})
		.from(application)
		.where(and(...conditions))
		.orderBy(desc(application.updatedAt));
}

/**
 * Finds applications that look like the same job, by posting URL or by company name.
 * This is what answers "have I already applied here?" before filling in a form.
 */
export async function findSimilarApplications(
	db: Db,
	userId: string,
	query: { jobUrl?: string | null; company?: string | null }
) {
	const matches = [];
	const key = jobUrlKey(query.jobUrl);
	if (key) matches.push(eq(application.jobUrlKey, key));
	if (query.company?.trim()) matches.push(like(application.company, `%${query.company.trim()}%`));
	if (!matches.length) return [];
	const rows = await db
		.select({
			id: application.id,
			company: application.company,
			role: application.role,
			status: application.status,
			jobUrl: application.jobUrl,
			jobUrlKey: application.jobUrlKey,
			appliedAt: application.appliedAt
		})
		.from(application)
		.where(and(eq(application.userId, userId), or(...matches)))
		.orderBy(desc(application.updatedAt));
	return rows.map(({ jobUrlKey: rowKey, ...row }) => ({
		...row,
		sameJobUrl: !!key && rowKey === key
	}));
}

export async function getApplication(db: Db, userId: string, id: string) {
	const found = await db.query.application.findFirst({
		where: and(eq(application.id, id), eq(application.userId, userId))
	});
	if (!found) return null;
	const [answers, events, rounds] = await db.batch([
		db
			.select()
			.from(applicationAnswer)
			.where(eq(applicationAnswer.applicationId, id))
			.orderBy(asc(applicationAnswer.position)),
		db
			.select()
			.from(statusEvent)
			.where(eq(statusEvent.applicationId, id))
			.orderBy(asc(statusEvent.occurredAt)),
		db
			.select()
			.from(interviewRound)
			.where(eq(interviewRound.applicationId, id))
			.orderBy(asc(interviewRound.scheduledAt))
	]);
	return { ...found, answers, events, rounds };
}

export async function createApplication(db: Db, userId: string, input: ApplicationInput) {
	const data = applicationInput.parse(input);
	const id = crypto.randomUUID();
	const now = new Date();
	const { answers, ...fields } = data;
	await db.batch([
		db.insert(application).values({
			...fields,
			id,
			userId,
			jobUrlKey: jobUrlKey(fields.jobUrl),
			appliedAt: fields.appliedAt ?? (fields.status === 'saved' ? null : now),
			postingCapturedAt: fields.posting ? now : null
		}),
		db.insert(statusEvent).values({ applicationId: id, status: fields.status, occurredAt: now }),
		...answers.map((answer, position) =>
			db.insert(applicationAnswer).values({ ...answer, applicationId: id, position })
		)
	]);
	return id;
}

async function assertOwned(db: Db, userId: string, id: string) {
	const found = await db
		.select({ id: application.id, status: application.status, posting: application.posting })
		.from(application)
		.where(and(eq(application.id, id), eq(application.userId, userId)))
		.get();
	if (!found) throw new ApplicationNotFoundError(id);
	return found;
}

export class ApplicationNotFoundError extends Error {
	constructor(id: string) {
		super(`Application ${id} not found`);
	}
}

export async function updateApplication(
	db: Db,
	userId: string,
	id: string,
	patch: ApplicationPatch
) {
	const current = await assertOwned(db, userId, id);
	const data = applicationPatch.parse(patch);
	await db
		.update(application)
		.set({
			...data,
			...(data.jobUrl !== undefined && { jobUrlKey: jobUrlKey(data.jobUrl) }),
			...(data.posting !== undefined &&
				data.posting !== current.posting && { postingCapturedAt: data.posting ? new Date() : null })
		})
		.where(eq(application.id, id));
}

export async function setStatus(
	db: Db,
	userId: string,
	id: string,
	status: (typeof APPLICATION_STATUSES)[number],
	note?: string | null
) {
	const current = await assertOwned(db, userId, id);
	if (current.status === status && !note) return;
	const now = new Date();
	await db.batch([
		db
			.update(application)
			.set({
				status,
				...(current.status === 'saved' && status !== 'saved' && { appliedAt: now })
			})
			.where(eq(application.id, id)),
		db
			.insert(statusEvent)
			.values({ applicationId: id, status, note: note || null, occurredAt: now })
	]);
}

/** Replaces the saved form answers, e.g. after re-reading what was submitted. */
export async function replaceAnswers(
	db: Db,
	userId: string,
	id: string,
	answers: z.input<typeof answerInput>[]
) {
	await assertOwned(db, userId, id);
	const parsed = z.array(answerInput).parse(answers);
	await db.batch([
		db.delete(applicationAnswer).where(eq(applicationAnswer.applicationId, id)),
		...parsed.map((answer, position) =>
			db.insert(applicationAnswer).values({ ...answer, applicationId: id, position })
		)
	]);
}

export async function deleteApplication(db: Db, userId: string, id: string) {
	await assertOwned(db, userId, id);
	await db.delete(application).where(eq(application.id, id));
}

export async function statusCounts(db: Db, userId: string) {
	const rows = await db
		.select({ status: application.status, count: count() })
		.from(application)
		.where(eq(application.userId, userId))
		.groupBy(application.status);
	const counts = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0])) as Record<
		ApplicationStatus,
		number
	>;
	for (const row of rows) counts[row.status] = row.count;
	return counts;
}

/** Interviews still to come, soonest first, with the application they belong to. */
export function upcomingInterviews(db: Db, userId: string, from = new Date()) {
	return db
		.select({
			id: interviewRound.id,
			name: interviewRound.name,
			scheduledAt: interviewRound.scheduledAt,
			applicationId: application.id,
			company: application.company,
			role: application.role
		})
		.from(interviewRound)
		.innerJoin(application, eq(interviewRound.applicationId, application.id))
		.where(
			and(
				eq(application.userId, userId),
				eq(interviewRound.outcome, 'pending'),
				gte(interviewRound.scheduledAt, from)
			)
		)
		.orderBy(asc(interviewRound.scheduledAt));
}

export const interviewRoundInput = z.object({
	name: z.string().trim().min(1),
	scheduledAt: z.coerce.date().nullish(),
	interviewers: optionalText,
	prepNotes: optionalText,
	feedback: optionalText,
	outcome: z.enum(INTERVIEW_OUTCOMES).default('pending')
});

export type InterviewRoundInput = z.input<typeof interviewRoundInput>;

export async function addInterviewRound(
	db: Db,
	userId: string,
	applicationId: string,
	input: InterviewRoundInput
) {
	await assertOwned(db, userId, applicationId);
	const id = crypto.randomUUID();
	await db
		.insert(interviewRound)
		.values({ ...interviewRoundInput.parse(input), id, applicationId });
	return id;
}

async function assertRoundOwned(db: Db, userId: string, applicationId: string, roundId: string) {
	await assertOwned(db, userId, applicationId);
	const found = await db
		.select({ id: interviewRound.id })
		.from(interviewRound)
		.where(and(eq(interviewRound.id, roundId), eq(interviewRound.applicationId, applicationId)))
		.get();
	if (!found) throw new ApplicationNotFoundError(applicationId);
}

export async function updateInterviewRound(
	db: Db,
	userId: string,
	applicationId: string,
	roundId: string,
	input: Partial<InterviewRoundInput>
) {
	await assertRoundOwned(db, userId, applicationId, roundId);
	await db
		.update(interviewRound)
		.set(interviewRoundInput.partial().parse(input))
		.where(eq(interviewRound.id, roundId));
}

export async function deleteInterviewRound(
	db: Db,
	userId: string,
	applicationId: string,
	roundId: string
) {
	await assertRoundOwned(db, userId, applicationId, roundId);
	await db.delete(interviewRound).where(eq(interviewRound.id, roundId));
}
