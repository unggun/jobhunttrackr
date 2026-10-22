import { ORIGIN } from '$app/env/private';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '#lib/server/mcp.ts';
import { mcpResource } from '#lib/server/mcp-auth.ts';
import {
	corsPreflight,
	protectedResourceMetadataUrl,
	withCors
} from '#lib/server/oauth-metadata.ts';
import type { RequestHandler } from './$types';

function unauthorized(description: string) {
	return withCors(
		Response.json(
			{ error: 'invalid_token', error_description: description },
			{
				status: 401,
				headers: {
					'WWW-Authenticate': `Bearer resource_metadata="${protectedResourceMetadataUrl(ORIGIN)}", error="invalid_token", error_description="${description}"`
				}
			}
		)
	);
}

/** Finds the user behind the request's OAuth access token, if it's valid for this endpoint. */
async function authenticate(request: Request, auth: App.Locals['auth']) {
	const header = request.headers.get('authorization');
	const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
	if (!token) return null;
	try {
		const result = await auth.api.verifyMcpAccessToken({ body: { token } });
		if (!result.active || !result.userId) return null;
		// Tokens issued for another resource can't be used here. Clients that don't send a
		// resource get a token without an audience, which only this app accepts anyway.
		if (result.audience.length && !result.audience.includes(mcpResource(ORIGIN))) return null;
		return result.userId;
	} catch {
		return null;
	}
}

// Stateless Streamable HTTP: each request gets a fresh server, so nothing is kept between
// requests and the Worker can scale freely.
export const fallback: RequestHandler = async ({ request, locals }) => {
	if (request.method === 'OPTIONS') return corsPreflight();

	const userId = await authenticate(request, locals.auth);
	if (!userId) return unauthorized('Sign in to Job Hunt Tracker to use this connector');

	const server = createMcpServer(locals.db, userId, ORIGIN);
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
		enableJsonResponse: true
	});
	await server.connect(transport);
	return withCors(await transport.handleRequest(request));
};
