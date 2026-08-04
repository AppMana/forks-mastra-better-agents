/**
 * Overrides https://github.com/assistant-ui/assistant-ui/blob/4832e53c1531ba931539caf38ca9bb123a5df032/packages/react/src/primitives/composer/ComposerAddAttachment.tsx
 * to have a handler on the onChange event
 */

import { useComposer, useComposerRuntime } from '@assistant-ui/react';
import { toast } from '@mastra/playground-ui';
import { useCallback } from 'react';

/**
 * `addAttachment` rejects when the adapter refuses the file — an unsupported
 * type, or a workspace upload the server turned down, an oversize one most
 * often. Nothing else is watching that promise, so without this the file simply
 * never appears and the user is told nothing.
 */
export const reportAttachmentFailure = (file: { name: string }, error: unknown) => {
  const reason = error instanceof Error ? error.message : String(error);
  // The adapter's own messages already name the file; don't say it twice.
  toast.error(reason.includes(file.name) ? reason : `Could not attach ${file.name}: ${reason}`);
};

export const useComposerAddAttachment = ({
  multiple = true,
  onChange,
}: {
  /** allow selecting multiple files */
  multiple?: boolean | undefined;
  onChange?: (files: File[]) => void;
} = {}) => {
  const disabled = useComposer(c => !c.isEditing);

  const composerRuntime = useComposerRuntime();
  const callback = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    input.hidden = true;

    const attachmentAccept = composerRuntime.getState().attachmentAccept;
    if (attachmentAccept && attachmentAccept !== '*') {
      input.accept = attachmentAccept;
    }

    document.body.appendChild(input);

    input.onchange = e => {
      const fileList = (e.target as HTMLInputElement).files;
      if (!fileList) return;
      for (const file of fileList) {
        void composerRuntime.addAttachment(file).catch(error => reportAttachmentFailure(file, error));
      }
      onChange?.(Array.from(fileList));

      document.body.removeChild(input);
    };

    input.oncancel = () => {
      if (!input.files || input.files.length === 0) {
        document.body.removeChild(input);
      }
    };

    input.click();
  }, [composerRuntime, multiple, onChange]);

  if (disabled) return undefined;
  return callback;
};
