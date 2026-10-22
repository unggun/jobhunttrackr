import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getApplication } from './applications';
import { createMcpServer } from './mcp';
import { createTestDb } from './test-db';

let testDb: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	testDb = await createTestDb();
}, 60_000);

afterAll(() => testDb?.dispose());

/** Connects an MCP client to a server acting as the given user, like Claude would. */
async function connect(userId: string) {
	const server = createMcpServer(testDb.db, userId, 'https://tracker.example');
	const client = new Client({ name: 'test', version: '1.0.0' });
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
	return {
		client,
		async call(name: string, args: Record<string, unknown>) {
			const result = await client.callTool({ name, arguments: args });
			const [content] = result.content as { type: 'text'; text: string }[];
			if (result.isError) return { error: content.text };
			return JSON.parse(content.text);
		}
	};
}

describe('MCP server', () => {
	it('lists its tools and tells the model how to use them', async () => {
		const { client } = await connect('me');
		const { tools } = await client.listTools();
		expect(tools.map((tool) => tool.name).sort()).toEqual([
			'add_interview_round',
			'find_applications',
			'get_application',
			'list_applications',
			'log_application',
			'save_answers',
			'update_application',
			'update_status'
		]);
		expect(client.getInstructions()).toContain('find_applications');
	});

	it('logs an application, then recognises the same posting', async () => {
		const { call } = await connect('me');
		const before = await call('find_applications', {
			job_url: 'https://boards.example.com/jobs/42',
			company: 'Rocketship'
		});
		expect(before.already_applied_to_this_posting).toBe(false);

		const logged = await call('log_application', {
			company: 'Rocketship',
			role: 'Platform Engineer',
			job_url: 'https://boards.example.com/jobs/42?utm_source=linkedin',
			work_mode: 'remote',
			posting: '## Requirements\n- Go\n- Kubernetes',
			answers: [{ question: 'Notice period?', answer: '1 month' }]
		});
		expect(logged.url).toBe(`https://tracker.example/applications/${logged.id}`);
		expect(logged.warning).toBeUndefined();

		const after = await call('find_applications', {
			job_url: 'https://www.boards.example.com/jobs/42/'
		});
		expect(after.already_applied_to_this_posting).toBe(true);
		expect(after.matches[0]).toMatchObject({ id: logged.id, status: 'applied' });

		const again = await call('log_application', {
			company: 'Rocketship',
			role: 'Platform Engineer',
			job_url: 'https://boards.example.com/jobs/42'
		});
		expect(again.warning).toMatch(/already/);
	});

	it('adds answers, moves status and schedules a round', async () => {
		const { call } = await connect('me');
		const { id } = await call('log_application', {
			company: 'Globex',
			role: 'Designer',
			answers: [{ question: 'Portfolio?', answer: 'https://me.example' }]
		});

		await call('save_answers', {
			application_id: id,
			answers: [{ question: 'Salary expectation?', answer: '$100k' }]
		});
		await call('update_status', {
			application_id: id,
			status: 'interviewing',
			note: 'Recruiter booked a call'
		});
		const round = await call('add_interview_round', {
			application_id: id,
			name: 'Recruiter call',
			scheduled_at: '2026-11-03T10:00:00+07:00'
		});
		expect(round.prep_page).toBe(`https://tracker.example/applications/${id}/prep`);

		const app = await call('get_application', { application_id: id });
		expect(app.status).toBe('interviewing');
		expect(app.answers.map((a: { question: string }) => a.question)).toEqual([
			'Portfolio?',
			'Salary expectation?'
		]);
		expect(app.rounds).toHaveLength(1);

		await call('add_interview_round', {
			application_id: id,
			name: 'Technical interview',
			feedback: 'Went well, they liked the system design answer',
			outcome: 'passed'
		});
		const withFeedback = await call('get_application', { application_id: id });
		expect(withFeedback.rounds).toContainEqual(
			expect.objectContaining({ feedback: 'Went well, they liked the system design answer' })
		);
		expect(app.userId).toBeUndefined();

		await call('save_answers', {
			application_id: id,
			answers: [{ question: 'Only this', answer: 'yes' }],
			replace: true
		});
		const replaced = await getApplication(testDb.db, 'me', id);
		expect(replaced?.answers.map((a) => a.question)).toEqual(['Only this']);
	});

	it('only lists open applications unless asked', async () => {
		const { call } = await connect('me');
		const { id } = await call('log_application', { company: 'Initech', role: 'Analyst' });
		await call('update_status', { application_id: id, status: 'rejected' });

		const open = await call('list_applications', {});
		expect(open.map((row: { id: string }) => row.id)).not.toContain(id);
		const all = await call('list_applications', { include_closed: true, search: 'Initech' });
		expect(all.map((row: { id: string }) => row.id)).toEqual([id]);
	});

	it("can't see or change another user's applications", async () => {
		const mine = await connect('me');
		const { id } = await mine.call('log_application', { company: 'Private', role: 'Secret' });

		const theirs = await connect('other');
		expect(await theirs.call('get_application', { application_id: id })).toMatchObject({
			error: expect.stringMatching(/No application/)
		});
		expect(
			await theirs.call('update_status', { application_id: id, status: 'offer' })
		).toMatchObject({ error: expect.stringMatching(/No application/) });
		expect((await theirs.call('find_applications', { company: 'Private' })).matches).toEqual([]);
	});

	it('explains bad input instead of failing', async () => {
		const { call } = await connect('me');
		expect(await call('find_applications', {})).toMatchObject({
			error: expect.stringMatching(/job_url/)
		});
	});
});
