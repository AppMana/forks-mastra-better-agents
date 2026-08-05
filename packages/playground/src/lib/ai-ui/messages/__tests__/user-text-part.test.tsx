// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { UserTextPart } from '../user-messages';

/**
 * The rendered request message shows what the person wrote, and nothing that
 * was added for the agent's benefit — the uploaded path announcement, or a
 * `<hidden>` correction. Both still travel in the message; see agent-only-text.
 */

afterEach(() => {
  cleanup();
});

describe('UserTextPart', () => {
  it('does not render the upload announcement in front of the request', () => {
    const { container } = render(
      <UserTextPart text={'Uploaded workspace file:\n- /uploads/CANARY_FILE_4.xls\nhow many rows?'} />,
    );

    expect(container.textContent).toBe('how many rows?');
    expect(screen.queryByText(/Uploaded workspace file/)).toBeNull();
    expect(container.textContent).not.toContain('/uploads/');
  });

  it('does not render a hidden rename notice', () => {
    const { container } = render(
      <UserTextPart
        text={
          '<hidden>The chat was renamed to `b-abc123`, so paths that used to be /workspaces/`a-abc123` are now /workspaces/`b-abc123`</hidden>\nwhat did you find?'
        }
      />,
    );

    expect(container.textContent).toBe('what did you find?');
  });

  it('renders an announcement-only part as nothing', () => {
    const { container } = render(<UserTextPart text={'Uploaded workspace file:\n- /uploads/a.csv'} />);

    expect(container.textContent).toBe('');
  });

  it('still renders ordinary prose untouched', () => {
    const { container } = render(<UserTextPart text="what are the totals in this sheet?" />);

    expect(container.textContent).toBe('what are the totals in this sheet?');
  });
});
