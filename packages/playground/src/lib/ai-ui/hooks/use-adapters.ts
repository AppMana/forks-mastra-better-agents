import type { SpeechSynthesisAdapter } from '@assistant-ui/react';
import { WebSpeechSynthesisAdapter } from '@assistant-ui/react';
import type { Agent } from '@mastra/core/agent';
import { toast } from '@mastra/playground-ui';
import { useMastraClient } from '@mastra/react';
import { useEffect, useMemo, useState } from 'react';
import { VoiceAttachmentAdapter } from '../attachments/voice-adapter';
import { WorkspaceUploadAttachmentAdapter } from '../attachments/workspace-upload-adapter';
import { useWorkspaceFileUploader } from '@/domains/workspace/hooks/use-workspace-upload';
import { usePlaygroundStore } from '@/store/playground-store';

export const useAdapters = (agentId: string) => {
  const [isReady, setIsReady] = useState(false);
  const [speechAdapter, setSpeechAdapter] = useState<SpeechSynthesisAdapter | undefined>(undefined);
  const baseClient = useMastraClient();
  const { requestContext } = usePlaygroundStore();
  const { uploadFile } = useWorkspaceFileUploader(agentId);

  /**
   * One adapter, and it uploads.
   *
   * There is deliberately no `CompositeAttachmentAdapter` here any more. The
   * composite's only job was to pick, per file type, which flavour of "read the
   * file into the prompt" applied — text through `FileReader`, images and PDFs
   * through base64 — and every one of those branches put file bytes into the
   * context. Attaching a file now means what dropping one on the composer
   * means: it lands in the workspace, and the message names its path. Small
   * raster images additionally travel as an image part, because a path is not
   * something a vision model can look at.
   *
   * The second callback is not an error: it is how the user learns that an
   * image they attached was too large, or the wrong format, to be shown to the
   * model — a fact nothing else in the composer would reveal.
   */
  const attachments = useMemo(
    () =>
      new WorkspaceUploadAttachmentAdapter(
        uploadFile,
        message => toast.error(message),
        message => toast.info(message),
      ),
    [uploadFile],
  );

  useEffect(() => {
    const check = async () => {
      const agent = baseClient.getAgent(agentId);

      try {
        const speakers = await agent.voice.getSpeakers(requestContext);
        if (speakers.length > 0) {
          setSpeechAdapter(new VoiceAttachmentAdapter(agent as unknown as Agent));
        } else {
          setSpeechAdapter(new WebSpeechSynthesisAdapter());
        }
        setIsReady(true);
      } catch {
        setSpeechAdapter(new WebSpeechSynthesisAdapter());
        setIsReady(true);
      }
    };

    void check();
    // Probes the agent's voice support once per agent. baseClient and
    // requestContext are deliberately excluded: requestContext changes on every
    // edit to the request-context form, and including it would re-probe voice
    // on each keystroke. Pre-existing upstream behaviour, made explicit here
    // because touching this file surfaced the warning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  return {
    isReady,
    adapters: {
      attachments,
      speech: speechAdapter,
    },
  };
};
