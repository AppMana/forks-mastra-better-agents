import { createApiClient, throwApiError } from './chunk-L2SGSIJI.js';

// src/commands/auth/api.ts
async function fetchOrgs(token) {
  const client = createApiClient(token);
  const { data, error, response } = await client.GET('/v1/auth/orgs');
  if (error) {
    throwApiError('Failed to fetch orgs', response.status, error.detail);
  }
  return data.organizations;
}

export { fetchOrgs };
//# sourceMappingURL=chunk-4Z57PBTZ.js.map
//# sourceMappingURL=chunk-4Z57PBTZ.js.map
