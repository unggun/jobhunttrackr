import { readFileSync, readdirSync } from 'node:fs';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './db';
import { user } from './db/schema';

/** An in-memory local D1 with the real migrations applied and two users, "me" and "other". */
export async function createTestDb() {
	const proxy = await getPlatformProxy<Env>({ persist: false });
	for (const file of readdirSync('migrations')
		.filter((name) => name.endsWith('.sql'))
		.sort()) {
		const statements = readFileSync(`migrations/${file}`, 'utf8').split('--> statement-breakpoint');
		for (const statement of statements) await proxy.env.DB.prepare(statement).run();
	}
	const db = getDb(proxy.env.DB);
	await db.insert(user).values([
		{ id: 'me', name: 'Me', email: 'me@example.com' },
		{ id: 'other', name: 'Other', email: 'other@example.com' }
	]);
	return { db, dispose: () => proxy.dispose() };
}
