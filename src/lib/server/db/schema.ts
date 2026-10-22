import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { APPLICATION_STATUSES, INTERVIEW_OUTCOMES, WORK_MODES } from '../../applications';
import { user } from './auth.schema';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

const timestamp = (name: string) =>
	integer(name, { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull();

/** One job you are tracking, from saved-for-later through to offer or rejection. */
export const application = sqliteTable(
	'application',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		company: text('company').notNull(),
		role: text('role').notNull(),
		location: text('location'),
		workMode: text('work_mode', { enum: WORK_MODES }),
		salary: text('salary'),
		/** Link to the job posting. */
		jobUrl: text('job_url'),
		/** Normalized jobUrl, used to answer "have I applied here already?". */
		jobUrlKey: text('job_url_key'),
		/** Link to the application form, when it differs from the posting. */
		applicationUrl: text('application_url'),
		/** Where the job was found, e.g. LinkedIn, referral, company site. */
		source: text('source'),
		status: text('status', { enum: APPLICATION_STATUSES }).notNull().default('applied'),
		appliedAt: integer('applied_at', { mode: 'timestamp_ms' }),
		/** Copy of the job posting as Markdown, kept because postings disappear before interviews. */
		posting: text('posting'),
		postingCapturedAt: integer('posting_captured_at', { mode: 'timestamp_ms' }),
		/** Resume or CV version sent with this application. */
		resumeVersion: text('resume_version'),
		notes: text('notes'),
		createdAt: timestamp('created_at'),
		updatedAt: timestamp('updated_at').$onUpdate(() => new Date())
	},
	(table) => [
		index('application_user_status_idx').on(table.userId, table.status),
		index('application_user_job_url_key_idx').on(table.userId, table.jobUrlKey),
		index('application_user_updated_idx').on(table.userId, table.updatedAt)
	]
);

/** A question from the application form and what was answered. */
export const applicationAnswer = sqliteTable(
	'application_answer',
	{
		id: id(),
		applicationId: text('application_id')
			.notNull()
			.references(() => application.id, { onDelete: 'cascade' }),
		question: text('question').notNull(),
		answer: text('answer').notNull(),
		position: integer('position').notNull().default(0),
		createdAt: timestamp('created_at')
	},
	(table) => [index('application_answer_application_idx').on(table.applicationId)]
);

/** Every status change, so the timeline of an application can be shown. */
export const statusEvent = sqliteTable(
	'status_event',
	{
		id: id(),
		applicationId: text('application_id')
			.notNull()
			.references(() => application.id, { onDelete: 'cascade' }),
		status: text('status', { enum: APPLICATION_STATUSES }).notNull(),
		note: text('note'),
		occurredAt: timestamp('occurred_at')
	},
	(table) => [index('status_event_application_idx').on(table.applicationId)]
);

/** A screening call, technical round, onsite and so on. */
export const interviewRound = sqliteTable(
	'interview_round',
	{
		id: id(),
		applicationId: text('application_id')
			.notNull()
			.references(() => application.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }),
		interviewers: text('interviewers'),
		prepNotes: text('prep_notes'),
		feedback: text('feedback'),
		outcome: text('outcome', { enum: INTERVIEW_OUTCOMES }).notNull().default('pending'),
		createdAt: timestamp('created_at')
	},
	(table) => [index('interview_round_application_idx').on(table.applicationId)]
);

export * from './auth.schema';
