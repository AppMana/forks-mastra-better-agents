import { describe, expect, it } from 'vitest';

import { RequestContext } from '../request-context';
import { isWorkspaceVisibleTo, resolveWorkspaceOwnerId } from './owner';

const RESOURCE_ID_KEY = 'mastra__resourceId';
const USER_KEY = 'mastra__user';

function contextWith(entries: Record<string, unknown>): RequestContext {
  const context = new RequestContext();
  for (const [key, value] of Object.entries(entries)) {
    context.set(key, value);
  }
  return context;
}

describe('resolveWorkspaceOwnerId', () => {
  it('uses the middleware-mapped resource id', () => {
    expect(resolveWorkspaceOwnerId(contextWith({ [RESOURCE_ID_KEY]: 'principal-a' }))).toBe('principal-a');
  });

  it('prefers the resource id over the user id when both are present', () => {
    const context = contextWith({
      [RESOURCE_ID_KEY]: 'principal-a',
      [USER_KEY]: { id: 'principal-b' },
    });

    expect(resolveWorkspaceOwnerId(context)).toBe('principal-a');
  });

  it('falls back to user.id when no resource id was mapped', () => {
    expect(resolveWorkspaceOwnerId(contextWith({ [USER_KEY]: { id: 'principal-b' } }))).toBe('principal-b');
  });

  it('falls back to user.id when the resource id is blank', () => {
    const context = contextWith({
      [RESOURCE_ID_KEY]: '',
      [USER_KEY]: { id: 'principal-b' },
    });

    expect(resolveWorkspaceOwnerId(context)).toBe('principal-b');
  });

  it('returns null for an empty context', () => {
    expect(resolveWorkspaceOwnerId(new RequestContext())).toBeNull();
  });

  it('returns null when no context was supplied at all', () => {
    expect(resolveWorkspaceOwnerId(undefined)).toBeNull();
  });

  it('returns null for a non-string resource id', () => {
    expect(resolveWorkspaceOwnerId(contextWith({ [RESOURCE_ID_KEY]: 42 }))).toBeNull();
  });

  it('returns null when the user has no usable id', () => {
    expect(resolveWorkspaceOwnerId(contextWith({ [USER_KEY]: { id: 7 } }))).toBeNull();
    expect(resolveWorkspaceOwnerId(contextWith({ [USER_KEY]: { id: '' } }))).toBeNull();
    expect(resolveWorkspaceOwnerId(contextWith({ [USER_KEY]: { name: 'no id' } }))).toBeNull();
    expect(resolveWorkspaceOwnerId(contextWith({ [USER_KEY]: 'not-an-object' }))).toBeNull();
    expect(resolveWorkspaceOwnerId(contextWith({ [USER_KEY]: null }))).toBeNull();
  });

  it('returns null for an object that is not a request context', () => {
    expect(resolveWorkspaceOwnerId({} as any)).toBeNull();
  });
});

describe('isWorkspaceVisibleTo', () => {
  it('shows unowned workspaces to every caller', () => {
    expect(isWorkspaceVisibleTo(undefined, 'principal-a')).toBe(true);
    expect(isWorkspaceVisibleTo(undefined, null)).toBe(true);
  });

  it('shows an owned workspace to its owner', () => {
    expect(isWorkspaceVisibleTo('principal-a', 'principal-a')).toBe(true);
  });

  it('hides an owned workspace from a different principal', () => {
    expect(isWorkspaceVisibleTo('principal-a', 'principal-b')).toBe(false);
  });

  it('hides an owned workspace from an unidentified caller', () => {
    expect(isWorkspaceVisibleTo('principal-a', null)).toBe(false);
  });
});
