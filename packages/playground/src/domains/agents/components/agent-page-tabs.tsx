import {
  Button,
  DropdownMenu,
  Tab,
  TabList,
  Tabs,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Txt,
  Icon,
} from '@mastra/playground-ui';
import {
  ExternalLink,
  FlaskConical,
  MessageSquare,
  ClipboardCheck,
  GitBranch,
  Radio,
  Folder,
  MoreHorizontal,
} from 'lucide-react';

import { useLinkComponent } from '@/lib/framework';

export type AgentPageTab = 'chat' | 'workspace' | 'versions' | 'evaluate' | 'review' | 'traces' | 'channels';

interface AgentPageTabsProps {
  agentId: string;
  activeTab: AgentPageTab;
  /**
   * The conversation being viewed. Chat and Workspace are two views of one
   * conversation, so the thread rides across when you switch between them
   * instead of the Workspace tab dropping you on a different conversation.
   */
  threadId?: string;
  showPlayground?: boolean;
  showObservability?: boolean;
  showChannels?: boolean;
  reviewBadge?: number;
  rightSlot?: React.ReactNode;
}

function DocsLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 underline text-inherit hover:text-white"
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  );
}

function AgentTab({
  value,
  icon,
  label,
  badge,
  disabled,
  disabledReason,
}: {
  value: AgentPageTab;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  disabled?: boolean;
  disabledReason?: React.ReactNode;
}) {
  const tabContent = (
    <>
      <Icon size="sm">{icon}</Icon>
      <Txt variant="ui-sm" className="text-inherit">
        {label}
      </Txt>
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 bg-accent1 text-white text-xs font-medium rounded-full px-1.5 py-0 min-w-[18px] text-center leading-[18px]">
          {badge}
        </span>
      )}
    </>
  );

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            <Tab value={value} disabled className="px-3 py-2.5">
              {tabContent}
            </Tab>
          </span>
        </TooltipTrigger>
        {disabledReason && <TooltipContent side="bottom">{disabledReason}</TooltipContent>}
      </Tooltip>
    );
  }

  return (
    <Tab value={value} className="px-3 py-2.5">
      {tabContent}
    </Tab>
  );
}

export function AgentPageTabs({
  agentId,
  activeTab,
  threadId,
  showPlayground = false,
  showObservability = false,
  showChannels = false,
  reviewBadge,
  rightSlot,
}: AgentPageTabsProps) {
  const { navigate } = useLinkComponent();

  const playgroundDisabledReason = !showPlayground ? (
    <p>
      Configure <code>@mastra/editor</code> to use the Editor.{' '}
      <DocsLink href="https://mastra.ai/docs/editor/overview">Learn more</DocsLink>
    </p>
  ) : undefined;
  const observabilityDisabledReason = !showObservability ? (
    <p>
      Add <code>@mastra/observability</code> to enable this tab.{' '}
      <DocsLink href="https://mastra.ai/docs/observability/overview">Learn more</DocsLink>
    </p>
  ) : undefined;

  const hrefMap: Record<AgentPageTab, string> = {
    chat: `/agents/${agentId}/chat/${threadId ?? 'new'}`,
    workspace: threadId ? `/agents/${agentId}/workspace/${threadId}` : `/agents/${agentId}/workspace`,
    versions: `/agents/${agentId}/editor`,
    evaluate: `/agents/${agentId}/evaluate`,
    review: `/agents/${agentId}/review`,
    traces: `/agents/${agentId}/traces`,
    channels: `/agents/${agentId}/channels`,
  };

  const handleTabChange = (value: AgentPageTab) => {
    navigate(hrefMap[value]);
  };

  // Chat and Workspace are the two views of a conversation and stay on the bar.
  // Everything else is agent configuration, reached occasionally, so it moves
  // into the overflow. Deep links to those routes keep working; when one is
  // active the trigger takes its label so the current page is still named.
  const overflowItems: { value: AgentPageTab; label: string; icon: React.ReactNode; disabled: boolean }[] = [
    { value: 'versions', label: 'Editor', icon: <GitBranch />, disabled: !showPlayground },
    { value: 'evaluate', label: 'Evaluate', icon: <FlaskConical />, disabled: !showObservability },
    { value: 'review', label: 'Review', icon: <ClipboardCheck />, disabled: !showObservability },
    ...(showChannels ? [{ value: 'channels' as const, label: 'Channels', icon: <Radio />, disabled: false }] : []),
  ];
  const activeOverflowItem = overflowItems.find(item => item.value === activeTab);

  return (
    <div className="flex items-center gap-2 p-1.5">
      <Tabs value={activeTab} defaultTab={activeTab} onValueChange={handleTabChange} className="flex-1 min-w-0">
        <TabList variant="pill-ghost">
          <AgentTab value="chat" icon={<MessageSquare />} label="Chat" />
          <AgentTab value="workspace" icon={<Folder />} label="Workspace" />
        </TabList>
      </Tabs>
      <DropdownMenu modal={false}>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" className="px-3 py-2.5 gap-2" aria-label="More agent pages">
            <Icon size="sm">
              <MoreHorizontal />
            </Icon>
            {activeOverflowItem && (
              <Txt variant="ui-sm" className="text-inherit">
                {activeOverflowItem.label}
              </Txt>
            )}
            {reviewBadge !== undefined && reviewBadge > 0 && (
              <span className="bg-accent1 text-white text-xs font-medium rounded-full px-1.5 py-0 min-w-[18px] text-center leading-[18px]">
                {reviewBadge}
              </span>
            )}
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          {overflowItems.map(item => {
            const entry = (
              <DropdownMenu.Item
                key={item.value}
                disabled={item.disabled}
                onSelect={() => handleTabChange(item.value)}
                className="gap-2"
              >
                <Icon size="sm">{item.icon}</Icon>
                <Txt variant="ui-sm" className="text-inherit">
                  {item.label}
                </Txt>
                {item.value === 'review' && reviewBadge !== undefined && reviewBadge > 0 && (
                  <span className="ml-auto bg-accent1 text-white text-xs font-medium rounded-full px-1.5 py-0 min-w-[18px] text-center leading-[18px]">
                    {reviewBadge}
                  </span>
                )}
              </DropdownMenu.Item>
            );
            // A disabled item is the only place left to say WHY it is disabled,
            // now that the tab bar no longer shows these as hoverable tabs.
            const reason = item.value === 'versions' ? playgroundDisabledReason : observabilityDisabledReason;
            if (!item.disabled || !reason) return entry;
            return (
              <Tooltip key={item.value}>
                <TooltipTrigger asChild>
                  <span className="block">{entry}</span>
                </TooltipTrigger>
                <TooltipContent side="left">{reason}</TooltipContent>
              </Tooltip>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu>
      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </div>
  );
}
