import type { ReasoningMessagePartProps } from '@assistant-ui/react';
import { Badge, Icon, cn } from '@mastra/playground-ui';
import { BrainIcon, ChevronUpIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export const Reasoning = ({ text, status }: ReasoningMessagePartProps) => {
  // Open while the part is streaming so live reasoning stays visible (the icon
  // row auto-expands the newest run entry and this must show its content), and
  // collapsed once complete: reasoning is long and secondary, the badge stays
  // as the affordance to expand it. A manual toggle wins until the streaming
  // state changes.
  const isStreaming = status?.type === 'running';
  const [override, setOverride] = useState<boolean | null>(null);

  useEffect(() => {
    setOverride(null);
  }, [isStreaming]);

  const isCollapsed = override ?? !isStreaming;

  return (
    <div className="mb-2 space-y-2">
      {/* Named for what clicking it does. Without an accessible name the
          control is unreachable by name for a screen reader and invisible to
          anything asking "is this turn's thinking folded away, or is it running
          down the page as prose" — which is exactly the question asked of a
          backend whose reasoning arrives in a shape the renderer might not
          have understood. */}
      <button
        onClick={() => setOverride(isCollapsed ? false : true)}
        aria-label={`${isCollapsed ? 'Show' : 'Hide'} reasoning`}
        aria-expanded={!isCollapsed}
        className="flex items-center gap-2"
      >
        <Icon>
          <ChevronUpIcon className={cn('transition-all', isCollapsed ? 'rotate-90' : 'rotate-180')} />
        </Icon>
        <Badge icon={<BrainIcon />}>{isCollapsed ? 'Show' : 'Hide'} reasoning</Badge>
      </button>

      {!isCollapsed ? (
        <div className="rounded-lg bg-surface4 p-2 border border-border-1">
          <pre className="whitespace-pre-wrap text-ui-sm leading-ui-sm text-neutral6">{text}</pre>
        </div>
      ) : null}
    </div>
  );
};
