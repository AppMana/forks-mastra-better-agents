import { Button, Txt } from '@mastra/playground-ui';
import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ThreadListProps {
  children: ReactNode;
  'aria-label'?: string;
}

export const ThreadList = ({ children, 'aria-label': ariaLabel = 'Threads' }: ThreadListProps) => {
  return (
    <div className="h-full w-full pb-2 pl-2">
      <nav
        aria-label={ariaLabel}
        className="bg-surface3 rounded-studio-panel border border-border1/50 h-full overflow-y-auto p-1"
      >
        {children}
      </nav>
    </div>
  );
};

export interface ThreadListNewItemProps {
  as?: ElementType;
  href?: string;
  to?: string;
  children: ReactNode;
}

export const ThreadListNewItem = ({ as, href, to, children }: ThreadListNewItemProps) => {
  return (
    <Button as={as} href={href} to={to} variant="ghost" className="w-full justify-start rounded-xl">
      {children}
    </Button>
  );
};

export const ThreadListSeparator = () => (
  <div role="separator" aria-orientation="horizontal" className="-mx-1 my-1 h-px bg-border1/40" />
);

export interface ThreadListItemsProps {
  children: ReactNode;
}

export const ThreadListItems = ({ children }: ThreadListItemsProps) => (
  <ol className="flex flex-col gap-px" data-testid="thread-list">
    {children}
  </ol>
);

export interface ThreadListItemProps {
  as?: ElementType;
  href?: string;
  to?: string;
  isActive?: boolean;
  isUnread?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}

export const ThreadListItem = ({ as, href, to, isActive, isUnread, actions, children }: ThreadListItemProps) => {
  return (
    <li className="group relative">
      <Button
        as={as}
        href={href}
        to={to}
        variant="ghost"
        className={cn('w-full justify-start rounded-xl pr-10', isActive && 'bg-surface4 text-neutral6')}
      >
        {isUnread && !isActive && (
          <span className="mr-2 h-2 w-2 shrink-0 rounded-full bg-accent3" aria-label="Unread replies" />
        )}
        {children}
      </Button>

      {actions && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          {actions}
        </div>
      )}
    </li>
  );
};

export interface ThreadListEmptyProps {
  children: ReactNode;
}

export const ThreadListEmpty = ({ children }: ThreadListEmptyProps) => {
  return (
    <Txt as="p" variant="ui-sm" className="text-neutral3 py-3 px-5">
      {children}
    </Txt>
  );
};
