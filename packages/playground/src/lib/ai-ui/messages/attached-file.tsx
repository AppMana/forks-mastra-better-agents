import type { DataMessagePartProps } from '@assistant-ui/react';
import { Button, Icon, Spinner, Txt } from '@mastra/playground-ui';
import { Download, File as FileIcon, TriangleAlert } from 'lucide-react';
import { useCallback, useState } from 'react';

import type { AttachmentData } from './attachment-data';
import {
  attachmentDownloadError,
  attachmentDownloadUrl,
  formatAttachmentSize,
  isAttachmentData,
} from './attachment-data';

type DownloadPhase = 'idle' | 'downloading' | 'error';

/**
 * One file the assistant attached, rendered as a download row in the chat.
 *
 * Deliberately NOT a bare `<a href download>`: the download route answers a
 * refusal with a JSON body explaining it, and a plain anchor would navigate
 * away to that JSON (or, worse, show nothing at all and leave the user
 * thinking the agent lied about producing a file). Fetching lets the refusal
 * be shown in place, next to the file it is about.
 */
export const AttachedFile = ({ attachment }: { attachment: AttachmentData }) => {
  const [phase, setPhase] = useState<DownloadPhase>('idle');
  const [error, setError] = useState<string | undefined>(undefined);

  const size = formatAttachmentSize(attachment.size);

  const download = useCallback(async () => {
    setPhase('downloading');
    setError(undefined);
    try {
      // Cookies carry the Keycloak session the whole app already authenticates
      // with; the URL itself holds no credential and grants nothing on its own.
      const response = await fetch(attachmentDownloadUrl(attachment.path), {
        credentials: 'include',
      });
      if (!response.ok) {
        setError(await attachmentDownloadError(response));
        setPhase('error');
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = attachment.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Revoked on the next frame: revoking synchronously races the click on
      // some browsers and produces an empty file.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setPhase('idle');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The download failed.');
      setPhase('error');
    }
  }, [attachment.name, attachment.path]);

  return (
    <div className="my-2 max-w-[80%]" data-testid="attached-file">
      <div className="flex items-center gap-3 rounded-lg border border-border1 bg-surface2 px-3 py-2">
        <Icon size="lg" className="shrink-0 text-icon3">
          <FileIcon />
        </Icon>
        <div className="min-w-0 flex-1">
          <Txt as="p" variant="ui-md" className="truncate text-neutral6" title={attachment.name}>
            {attachment.name}
          </Txt>
          {(size || attachment.label) && (
            <Txt as="p" variant="ui-sm" className="truncate text-neutral4">
              {[size, attachment.label].filter(Boolean).join(' · ')}
            </Txt>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-md"
          tooltip={`Download ${attachment.name}`}
          aria-label={`Download ${attachment.name}`}
          disabled={phase === 'downloading'}
          onClick={() => void download()}
        >
          {phase === 'downloading' ? <Spinner /> : <Download />}
        </Button>
      </div>
      {error && (
        <div className="mt-1.5 flex items-start gap-2 px-1" role="alert">
          <Icon size="sm" className="mt-0.5 shrink-0 text-accent2">
            <TriangleAlert />
          </Icon>
          <Txt as="p" variant="ui-sm" className="text-accent2">
            {error}
          </Txt>
        </div>
      )}
    </div>
  );
};

/**
 * `data-attachment` part renderer. A malformed part renders nothing rather
 * than an empty box: the part is model-driven, and half a download row is
 * worse than none.
 */
export const AttachedFileDataPart = ({ data }: DataMessagePartProps<AttachmentData>) =>
  isAttachmentData(data) ? <AttachedFile attachment={data} /> : null;
