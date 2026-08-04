// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AttachedFile, AttachedFileDataPart } from '../attached-file';
import type { AttachmentData } from '../attachment-data';
import { ATTACHMENT_PART_NAME, attachmentDownloadUrl, formatAttachmentSize } from '../attachment-data';
import { appRoute } from '@/lib/app-routes';
import { toAssistantUIMessages } from '@/services/to-assistant-ui-message';
import { server } from '@/test/msw-server';

/**
 * The chat-side half of agent-attached files.
 *
 * An agent calls its attach tool, the run emits a non-transient
 * `data-attachment` part, and this component is what the user actually sees.
 * The tests drive the real fetch through MSW rather than stubbing the
 * component's own download, because the interesting behavior is entirely in
 * what it does with the RESPONSE: the download route answers a refusal with a
 * JSON body written for a human, and showing that sentence in place — instead
 * of navigating to it, or silently doing nothing — is the whole reason this is
 * a button rather than an `<a href download>`.
 */

const DOWNLOAD_ROUTE = `*${appRoute('/workspace/download')}`;

const attachment: AttachmentData = {
  name: 'q3-report.pdf',
  path: '/workspace/private/agents/analyst/q3-report.pdf',
  size: 245_760,
  mediaType: 'application/pdf',
};

const clicks: { url: string }[] = [];

beforeEach(() => {
  clicks.length = 0;
  // jsdom implements neither of these; the component uses them to hand the
  // blob to the browser's own downloader.
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicks.push({ url: this.href });
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AttachedFile', () => {
  it('names the file and its size before anything is fetched', async () => {
    const onDownload = vi.fn();
    server.use(
      http.get(DOWNLOAD_ROUTE, () => {
        onDownload();
        return HttpResponse.text('never');
      }),
    );

    render(<AttachedFile attachment={attachment} />);

    expect(screen.getByText('q3-report.pdf')).not.toBeNull();
    expect(screen.getByText('240 KB')).not.toBeNull();
    // Rendering a message must never cost a request per attachment.
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(onDownload).not.toHaveBeenCalled();
  });

  it('shows the agent-supplied label next to the size', () => {
    render(<AttachedFile attachment={{ ...attachment, label: 'Q3 close, final' }} />);

    expect(screen.getByText('240 KB · Q3 close, final')).not.toBeNull();
  });

  it('downloads the file by workspace path with the session cookie', async () => {
    const requests: { url: string; credentials: string }[] = [];
    server.use(
      http.get(DOWNLOAD_ROUTE, ({ request }) => {
        requests.push({ url: request.url, credentials: request.credentials });
        return HttpResponse.text('%PDF-1.7', {
          headers: { 'Content-Type': 'application/pdf' },
        });
      }),
    );

    render(<AttachedFile attachment={attachment} />);
    await userEvent.click(screen.getByRole('button', { name: /download q3-report\.pdf/i }));

    await waitFor(() => expect(clicks.length).toBe(1));
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain(`path=${encodeURIComponent('/workspace/private/agents/analyst/q3-report.pdf')}`);
    // The link carries no credential of its own — the session cookie is the auth.
    expect(requests[0].credentials).toBe('include');
    expect(requests[0].url).not.toContain('token');
  });

  /**
   * The entitlement refusal. A user who is not in the group gets the route's
   * own sentence, in the chat, next to the file — not a blank download, not a
   * page of JSON.
   */
  it('shows the refusal when the user is not entitled to the file', async () => {
    server.use(
      http.get(DOWNLOAD_ROUTE, () =>
        HttpResponse.json(
          {
            error: '"/workspace/groups/analysts/q3.xlsx" is in group "analysts", which this user is not a member of.',
            reason: 'not-entitled',
          },
          { status: 403 },
        ),
      ),
    );

    render(<AttachedFile attachment={attachment} />);
    await userEvent.click(screen.getByRole('button', { name: /download/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('not a member of');
    expect(clicks.length).toBe(0);
  });

  it('says the file is gone rather than downloading nothing', async () => {
    server.use(
      http.get(DOWNLOAD_ROUTE, () =>
        HttpResponse.json(
          { error: '"report.pdf" does not exist in the workspace.', reason: 'not-found' },
          { status: 404 },
        ),
      ),
    );

    render(<AttachedFile attachment={attachment} />);
    await userEvent.click(screen.getByRole('button', { name: /download/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('does not exist');
  });

  it('explains a file too large for a chat download', async () => {
    server.use(
      http.get(DOWNLOAD_ROUTE, () =>
        HttpResponse.json(
          { error: '"dump.bin" is 812.0 MB, over the 100 MB limit for a chat download.', reason: 'too-large' },
          { status: 413 },
        ),
      ),
    );

    render(<AttachedFile attachment={attachment} />);
    await userEvent.click(screen.getByRole('button', { name: /download/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('over the 100 MB limit');
  });

  it('falls back to a plain sentence when the refusal carries no body', async () => {
    server.use(http.get(DOWNLOAD_ROUTE, () => new HttpResponse(null, { status: 403 })));

    render(<AttachedFile attachment={attachment} />);
    await userEvent.click(screen.getByRole('button', { name: /download/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('do not have access');
  });

  it('recovers on a retry after a refusal', async () => {
    let attempt = 0;
    server.use(
      http.get(DOWNLOAD_ROUTE, () => {
        attempt += 1;
        return attempt === 1
          ? HttpResponse.json({ error: 'Temporarily unavailable.' }, { status: 503 })
          : HttpResponse.text('%PDF-1.7');
      }),
    );

    render(<AttachedFile attachment={attachment} />);
    const button = screen.getByRole('button', { name: /download/i });

    await userEvent.click(button);
    expect(await screen.findByRole('alert')).not.toBeNull();

    await userEvent.click(button);
    await waitFor(() => expect(clicks.length).toBe(1));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders a size-less attachment without inventing one', () => {
    render(<AttachedFile attachment={{ name: 'notes.md', path: '/workspace/private/notes.md' }} />);

    expect(screen.getByText('notes.md')).not.toBeNull();
    expect(screen.queryByText('0 B')).toBeNull();
  });
});

describe('AttachedFileDataPart', () => {
  it('renders a well-formed data-attachment part', () => {
    render(<AttachedFileDataPart data={attachment} type="data-attachment" />);

    expect(screen.getByTestId('attached-file')).not.toBeNull();
  });

  it('renders nothing for a malformed part rather than an empty row', () => {
    const { container } = render(
      <AttachedFileDataPart
        data={{ path: '/workspace/private/x' } as unknown as AttachmentData}
        type="data-attachment"
      />,
    );

    expect(container.textContent).toBe('');
  });
});

/**
 * The name in `assistant-message.tsx`'s `data: { by_name: { attachment: … } }`
 * has to be the wire type minus its `data-` prefix. Nothing enforces that —
 * a mismatch renders NOTHING, with no error anywhere — so pin the two ends of
 * the mapping against the real conversion a reloaded thread goes through.
 */
describe('persisted data-attachment part', () => {
  it('reaches the renderer under the name the component map registers', () => {
    const [converted] = toAssistantUIMessages([
      {
        id: 'assistant-1',
        role: 'assistant',
        createdAt: new Date(0),
        content: {
          format: 2,
          parts: [{ type: 'data-attachment', data: attachment } as never],
        },
      } as never,
    ]);

    const parts = converted.content as { type: string; name?: string; data?: unknown }[];
    const part = parts.find(candidate => candidate.type === 'data');

    expect(part).toBeDefined();
    expect(part?.name).toBe(ATTACHMENT_PART_NAME);
    expect(part?.data).toEqual(attachment);
  });
});

describe('attachment helpers', () => {
  it('addresses the download route under the app prefix', () => {
    expect(attachmentDownloadUrl('/workspace/private/uploads/a b.pdf')).toBe(
      `${appRoute('/workspace/download')}?path=%2Fworkspace%2Fprivate%2Fuploads%2Fa%20b.pdf`,
    );
  });

  it('formats sizes across the range a workspace file can be', () => {
    expect(formatAttachmentSize(0)).toBe('0 B');
    expect(formatAttachmentSize(900)).toBe('900 B');
    expect(formatAttachmentSize(2048)).toBe('2 KB');
    expect(formatAttachmentSize(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatAttachmentSize(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
    expect(formatAttachmentSize(undefined)).toBeUndefined();
    expect(formatAttachmentSize(Number.NaN)).toBeUndefined();
  });
});
