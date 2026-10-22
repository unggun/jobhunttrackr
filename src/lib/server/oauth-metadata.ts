import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { mcpResource } from './mcp-auth';
import type { createAuth } from './auth';

// MCP clients discover how to sign in from these well-known documents:
// the MCP endpoint points at its protected-resource metadata, which names the
// authorization server (Better Auth, under /api/auth), whose metadata lists the
// registration, authorize and token endpoints.

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
	'Access-Control-Allow-Headers':
		'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version',
	'Access-Control-Expose-Headers': 'Mcp-Session-Id, WWW-Authenticate'
};

export function withCors(response: Response) {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

export const corsPreflight = () => new Response(null, { status: 204, headers: CORS_HEADERS });

export const protectedResourceMetadataUrl = (origin: string) =>
	`${origin}/.well-known/oauth-protected-resource/mcp`;

/** Answers the well-known discovery requests, or returns null for any other path. */
export async function handleWellKnown(
	request: Request,
	origin: string,
	auth: ReturnType<typeof createAuth>
): Promise<Response | null> {
	const { pathname } = new URL(request.url);
	if (!pathname.startsWith('/.well-known/')) return null;
	if (request.method === 'OPTIONS') return corsPreflight();

	if (
		pathname === '/.well-known/oauth-protected-resource' ||
		pathname === '/.well-known/oauth-protected-resource/mcp'
	) {
		return withCors(
			Response.json({
				resource: mcpResource(origin),
				resource_name: 'Job Hunt Tracker',
				authorization_servers: [`${origin}/api/auth`],
				bearer_methods_supported: ['header'],
				scopes_supported: ['openid', 'profile', 'email', 'offline_access']
			})
		);
	}

	// RFC 8414 puts the issuer path (/api/auth) after the well-known segment; some clients skip it.
	if (
		pathname === '/.well-known/oauth-authorization-server/api/auth' ||
		pathname === '/.well-known/oauth-authorization-server'
	) {
		return withCors(await oauthProviderAuthServerMetadata(auth)(request));
	}

	return null;
}
