import { defineConfig } from 'drizzle-kit';

// Only used to generate SQL migrations from the schema. Wrangler applies them:
// `npm run db:migrate` locally and `npm run db:migrate:remote` on Cloudflare.
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './migrations',
	dialect: 'sqlite',
	verbose: true,
	strict: true
});
