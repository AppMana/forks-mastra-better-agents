import type { ReasoningMessagePart } from '@assistant-ui/react';
import { Badge, Icon, cn } from '@mastra/playground-ui';
import { BrainIcon, ChevronUpIcon } from 'lucide-react';
import { useState } from 'react';

export const Reasoning = ({ text }: ReasoningMessagePart) => {
  // Collapsed by default: reasoning is long and secondary; the badge stays as
  // the affordance to expand it.
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="mb-2 space-y-2">
      <button onClick={() => setIsCollapsed(s => !s)} className="flex items-center gap-2">
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
