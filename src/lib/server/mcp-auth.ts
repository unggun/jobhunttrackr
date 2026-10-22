import { getOAuthProviderApi, type OAuthOptions, type Scope } from '@better-auth/oauth-provider';
import type { BetterAuthPlugin } from 'better-auth';
import { createAuthEndpoint } from 'better-auth/api';
import { z } from 'zod';

/** The MCP endpoint, which is the protected resource Claude gets access tokens for. */
export const mcpResource = (origin: string) => `${origin}/mcp`;

/**
 * Lets the app check an MCP access token with the OAuth provider's own validation
 * (expiry, revocation, disabled clients, signed-out sessions) without an HTTP round trip.
 * Server-only: it's called as `auth.api.verifyMcpAccessToken` and isn't exposed over HTTP.
 */
export const mcpAccessTokens = () =>
	({
		id: 'mcp-access-tokens',
		endpoints: {
			verifyMcpAccessToken: createAuthEndpoint.serverOnly(
				{ method: 'POST', body: z.object({ token: z.string() }) },
				async (ctx) => {
					const provider = ctx.context.getPlugin('oauth-provider') as {
						options: OAuthOptions<Scope[]>;
					} | null;
					if (!provider) throw new Error('oauthProvider() must be installed');
					const payload = await getOAuthProviderApi(ctx, provider.options).validateAccessToken(
						ctx.body.token
					);
					return {
						active: payload.active === true,
						userId: typeof payload.sub === 'string' ? payload.sub : null,
						audience: [payload.aud ?? []].flat().map(String),
						scopes: typeof payload.scope === 'string' ? payload.scope.split(' ') : [],
						// DPoP-bound tokens carry a key confirmation (RFC 7800 `cnf`).
						senderConstrained: payload.cnf !== undefined
					};
				}
			)
		}
	}) satisfies BetterAuthPlugin;
