import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './db';
import { user } from './db/schema';
import {
	createApplication,
	findSimilarApplications,
	getApplication,
	listApplications,
	replaceAnswers,
	setStatus,
	updateApplication
} from './applications';

// Runs against an in-memory local D1 with the real migrations applied.
let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
let db: ReturnType<typeof getDb>;

beforeAll(async () => {
	proxy = await getPlatformProxy<Env>({ persist: false });
	for (const file of readdirSync('migrations')
		.filter((name) => name.endsWith('.sql'))
		.sort()) {
		const statements = readFileSync(`migrations/${file}`, 'utf8').split('--> statement-breakpoint');
		for (const statement of statements) await proxy.env.DB.prepare(statement).run();
	}
	db = getDb(proxy.env.DB);
	await db.insert(user).values([
		{ id: 'me', name: 'Me', email: 'me@example.com' },
		{ id: 'other', name: 'Other', email: 'other@example.com' }
	]);
}, 60_000);

afterAll(() => proxy?.dispose());

describe('applications', () => {
	it('creates an application with answers, a posting and a first status event', async () => {
		const id = await createApplication(db, 'me', {
			company: 'Acme',
			role: 'Frontend Engineer',
			jobUrl: 'https://jobs.acme.com/123?utm_source=linkedin',
			posting: 'We need Svelte experience.',
			answers: [
				{ question: 'Why Acme?', answer: 'I like rockets.' },
				{ question: 'Notice period', answer: '1 month' }
			]
		});

		const app = await getApplication(db, 'me', id);
		expect(app).toMatchObject({
			company: 'Acme',
			status: 'applied',
			jobUrlKey: 'jobs.acme.com/123'
		});
		expect(app?.appliedAt).toBeInstanceOf(Date);
		expect(app?.postingCapturedAt).toBeInstanceOf(Date);
		expect(app?.answers.map((answer) => answer.question)).toEqual(['Why Acme?', 'Notice period']);
		expect(app?.events.map((event) => event.status)).toEqual(['applied']);
	});

	it('finds an earlier application for the same posting or company', async () => {
		const byUrl = await findSimilarApplications(db, 'me', {
			jobUrl: 'http://www.jobs.acme.com/123/'
		});
		expect(byUrl).toHaveLength(1);
		expect(byUrl[0].sameJobUrl).toBe(true);

		const byCompany = await findSimilarApplications(db, 'me', { company: 'acme' });
		expect(byCompany[0].sameJobUrl).toBe(false);

		expect(await findSimilarApplications(db, 'other', { company: 'acme' })).toEqual([]);
	});

	it('records status changes and keeps other users out', async () => {
		const id = await createApplication(db, 'me', {
			company: 'Globex',
			role: 'Designer',
			status: 'saved'
		});
		expect((await getApplication(db, 'me', id))?.appliedAt).toBeNull();

		await setStatus(db, 'me', id, 'applied');
		await setStatus(db, 'me', id, 'interviewing', 'Recruiter call booked');
		const app = await getApplication(db, 'me', id);
		expect(app?.status).toBe('interviewing');
		expect(app?.appliedAt).toBeInstanceOf(Date);
		expect(app?.events.map((event) => event.status)).toEqual(['saved', 'applied', 'interviewing']);

		expect(await getApplication(db, 'other', id)).toBeNull();
		await expect(setStatus(db, 'other', id, 'rejected')).rejects.toThrow('not found');

		const interviewing = await listApplications(db, 'me', { statuses: ['interviewing'] });
		expect(interviewing.map((row) => row.company)).toEqual(['Globex']);
	});

	it('updates fields and replaces answers', async () => {
		const [acme] = await listApplications(db, 'me', { search: 'frontend' });
		await updateApplication(db, 'me', acme.id, { salary: '$100k', jobUrl: 'https://acme.com/new' });
		await replaceAnswers(db, 'me', acme.id, [{ question: 'Portfolio', answer: 'https://me.dev' }]);

		const app = await getApplication(db, 'me', acme.id);
		expect(app).toMatchObject({ salary: '$100k', jobUrlKey: 'acme.com/new' });
		expect(app?.answers).toHaveLength(1);
	});
});
