/**
 * Ownership of dynamically-resolved workspaces.
 *
 * A workspace factory (`new Agent({ workspace: ({ requestContext }) => ... })`)
 * may hand a different workspace to every caller, while the Mastra workspace
 * registry that backs `GET /workspaces` is one process-global map. The two
 * only compose safely if each registered entry remembers who it was built for,
 * so this module is the single definition of "who is the caller" that both the
 * registration site (core) and the listing route (server) use. Two derivations
 * of that answer would eventually disagree, and disagreeing here means one
 * user's workspace ids in another user's list.
 */

/** Minimal read side of a RequestContext, so this stays dependency free. */
export interface WorkspaceOwnerContext {
  get(key: string): unknown;
}

/**
 * Reserved context key holding the resource id an auth middleware mapped the
 * caller to. Same value as `MASTRA_RESOURCE_ID_KEY`, restated here so this
 * module has no import cycle back into request-context.
 */
const RESOURCE_ID_KEY = 'mastra__resourceId';

/** Reserved context key holding the authenticated user object. */
const USER_KEY = 'mastra__user';

/**
 * The principal a workspace resolved during this request belongs to, or `null`
 * when the deployment has no authentication and every caller is the same
 * anonymous principal.
 *
 * Prefers the middleware-mapped resource id and falls back to `user.id`, which
 * is the same order `getCallerAuthorId` uses for every other owner-scoped
 * resource in the server package — workspaces must not be scoped by a
 * different notion of identity than threads and traces are.
 */
export function resolveWorkspaceOwnerId(requestContext?: WorkspaceOwnerContext): string | null {
  if (!requestContext || typeof requestContext.get !== 'function') {
    return null;
  }

  const resourceId = requestContext.get(RESOURCE_ID_KEY);
  if (typeof resourceId === 'string' && resourceId.length > 0) {
    return resourceId;
  }

  const user = requestContext.get(USER_KEY);
  if (user && typeof user === 'object' && 'id' in user) {
    const id = (user as { id: unknown }).id;
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
  }

  return null;
}

/**
 * Whether a registered workspace should be listed to this caller.
 *
 * An entry with no owner belongs to the deployment rather than to a person and
 * is listed to everyone. An owned entry is listed only back to its owner —
 * including when the caller cannot be resolved at all, which is the case that
 * matters: an unauthenticated read must not enumerate authenticated users'
 * workspaces.
 */
export function isWorkspaceVisibleTo(owner: string | undefined, callerId: string | null): boolean {
  if (!owner) return true;
  return owner === callerId;
}
