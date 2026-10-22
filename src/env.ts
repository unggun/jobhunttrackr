import { defineEnvVars } from '@sveltejs/kit/env';

// Secrets are only set where the app runs, not where it is built (CI, Cloudflare Workers Builds),
// so these are checked when the first request comes in instead. See `createAuth`.
const optionalAtBuild = (value: string | undefined) => value ?? '';

export const variables = defineEnvVars({
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:5173`.',
		// A trailing slash would put `//` into every URL built from it.
		schema: (value) => optionalAtBuild(value).replace(/\/+$/, '')
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation).',
		schema: optionalAtBuild
	},
	GITHUB_CLIENT_ID: {
		description:
			'GitHub OAuth client ID. See [Better Auth GitHub provider](https://www.better-auth.com/docs/authentication/github).',
		schema: optionalAtBuild
	},
	GITHUB_CLIENT_SECRET: {
		description:
			'GitHub OAuth client secret. See [Better Auth GitHub provider](https://www.better-auth.com/docs/authentication/github).',
		schema: optionalAtBuild
	},
	ALLOWED_EMAILS: {
		description:
			'Comma-separated emails allowed to create an account. When empty, only the first person to sign in gets an account.',
		schema: (value) =>
			(value ?? '')
				.split(',')
				.map((email) => email.trim().toLowerCase())
				.filter(Boolean)
	}
});
