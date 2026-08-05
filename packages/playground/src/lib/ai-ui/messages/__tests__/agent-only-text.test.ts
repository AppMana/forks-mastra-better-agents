import { describe, expect, it } from 'vitest';

import { isAgentOnlyMessage, visibleUserText } from '../agent-only-text';

/**
 * What the person is shown of their own message, once the parts addressed to
 * the agent are taken out of it. The paths still travel — they are in the
 * stored message and in what the model was sent — they are simply not the
 * user's prose and are not rendered as if they were.
 */
describe('visibleUserText', () => {
  it('drops an upload announcement and leaves the request', () => {
    const text = 'Uploaded workspace file:\n- /uploads/CANARY_FILE_4.xls\nhow many rows does this have';

    expect(visibleUserText(text)).toBe('how many rows does this have');
  });

  it('drops every bullet of a multi-file announcement', () => {
    const text = 'Uploaded workspace files:\n- /uploads/a.csv\n- /uploads/b.csv\n\ncompare these';

    expect(visibleUserText(text)).toBe('compare these');
  });

  it('renders nothing for a part that is only the announcement', () => {
    expect(visibleUserText('Uploaded workspace file:\n- /uploads/a.csv')).toBe('');
  });

  it('drops a hidden rename notice and leaves the request', () => {
    const text =
      '<hidden>The chat was renamed to `dealflow-abc123`, so paths that used to be ' +
      '/workspaces/`q3-abc123` are now /workspaces/`dealflow-abc123`</hidden>\nwhat did you find?';

    expect(visibleUserText(text)).toBe('what did you find?');
  });

  it('recognises an announcement-only message, so no empty bubble is drawn for it', () => {
    expect(isAgentOnlyMessage([{ type: 'text', text: 'Uploaded workspace file:\n- /uploads/a.csv' }])).toBe(true);
    expect(isAgentOnlyMessage([{ type: 'text', text: 'how many rows?' }])).toBe(false);
    // A message carrying anything else is the person's, whatever its text says.
    expect(
      isAgentOnlyMessage([{ type: 'text', text: 'Uploaded workspace file:\n- /uploads/a.png' }, { type: 'image' }]),
    ).toBe(false);
    expect(isAgentOnlyMessage([])).toBe(false);
  });

  it('leaves the same words alone when the person typed them', () => {
    // Not at the start of a line as an announcement header, so it is prose.
    const text = 'why does it say Uploaded workspace file: every time?';

    expect(visibleUserText(text)).toBe(text);
  });
});
