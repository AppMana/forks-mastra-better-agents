import type { StorageThreadType } from '@mastra/core/memory';
import { AlertDialog, Button, ContextMenu, DropdownMenu, Icon, Input, Skeleton } from '@mastra/playground-ui';
import { Ellipsis, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  ThreadList,
  ThreadListEmpty,
  ThreadListItem,
  ThreadListItems,
  ThreadListNewItem,
  ThreadListSeparator,
} from '@/components/thread-list';
import { useLinkComponent } from '@/lib/framework';

export interface ChatThreadsProps {
  threads: StorageThreadType[];
  isLoading: boolean;
  threadId: string;
  onDelete: (threadId: string) => void;
  onRename: (threadId: string, title: string) => void;
  unreadThreadIds?: Set<string>;
  resourceId: string;
  resourceType: 'agent' | 'network';
}

export const ChatThreads = ({
  threads,
  isLoading,
  threadId,
  onDelete,
  onRename,
  unreadThreadIds,
  resourceId,
  resourceType,
}: ChatThreadsProps) => {
  const { Link, paths } = useLinkComponent();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [renameThread, setRenameThread] = useState<StorageThreadType | null>(null);

  if (isLoading) {
    return <ChatThreadSkeleton />;
  }

  const newThreadLink =
    resourceType === 'agent' ? paths.agentNewThreadLink(resourceId) : paths.networkNewThreadLink(resourceId);

  return (
    <>
      <ThreadList>
        <ThreadListNewItem as={Link} to={newThreadLink}>
          <Icon>
            <Plus />
          </Icon>
          New Chat
        </ThreadListNewItem>
        <ThreadListSeparator />

        {threads.length === 0 ? (
          <ThreadListEmpty>Your conversations will appear here once you start chatting!</ThreadListEmpty>
        ) : (
          <ThreadListItems>
            {threads.map(thread => {
              const isActive = thread.id === threadId;

              const threadLink =
                resourceType === 'agent'
                  ? paths.agentThreadLink(resourceId, thread.id)
                  : paths.networkThreadLink(resourceId, thread.id);

              return (
                <ThreadListItem
                  key={thread.id}
                  as={Link}
                  to={threadLink}
                  isActive={isActive}
                  isUnread={unreadThreadIds?.has(thread.id)}
                  actions={
                    <ThreadActions onRename={() => setRenameThread(thread)} onDelete={() => setDeleteId(thread.id)} />
                  }
                  contextActions={
                    <ThreadContextActions
                      onRename={() => setRenameThread(thread)}
                      onDelete={() => setDeleteId(thread.id)}
                    />
                  }
                >
                  <ThreadTitle title={thread.title} id={thread.id} createdAt={thread.createdAt} />
                </ThreadListItem>
              );
            })}
          </ThreadListItems>
        )}
      </ThreadList>

      <DeleteThreadDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onDelete={() => {
          if (deleteId) {
            onDelete(deleteId);
          }
        }}
      />
      <RenameThreadDialog
        thread={renameThread}
        onOpenChange={() => setRenameThread(null)}
        onRename={title => {
          if (renameThread) {
            onRename(renameThread.id, title);
            setRenameThread(null);
          }
        }}
      />
    </>
  );
};

function ThreadActions({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Chat actions" onClick={event => event.preventDefault()}>
          <Ellipsis />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Item
          onSelect={event => {
            event.preventDefault();
            onRename();
          }}
        >
          <Pencil />
          Rename
        </DropdownMenu.Item>
        <DropdownMenu.Item
          variant="destructive"
          onSelect={event => {
            event.preventDefault();
            onDelete();
          }}
        >
          <Trash2 />
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

function ThreadContextActions({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
  return (
    <>
      <ContextMenu.Item
        onSelect={event => {
          event.preventDefault();
          onRename();
        }}
      >
        <Pencil />
        Rename
      </ContextMenu.Item>
      <ContextMenu.Item
        variant="destructive"
        onSelect={event => {
          event.preventDefault();
          onDelete();
        }}
      >
        <Trash2 />
        Delete
      </ContextMenu.Item>
    </>
  );
}

interface DeleteThreadDialogProps {
  open: boolean;
  onOpenChange: (n: boolean) => void;
  onDelete: () => void;
}
const DeleteThreadDialog = ({ open, onOpenChange, onDelete }: DeleteThreadDialogProps) => {
  // Confirming is the whole reason the dialog opened, so Enter must confirm it.
  // Base UI otherwise moves initial focus to the first tabbable child, which is
  // Cancel (it comes first in the footer's DOM order, and has to, because the
  // footer reverses on small screens) — so Enter dismissed the dialog and the
  // chat stayed. Escape still cancels, which is where the safety lives.
  const deleteRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content initialFocus={deleteRef}>
        <AlertDialog.Header>
          <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
          <AlertDialog.Description>
            This action cannot be undone. This will permanently delete your chat and remove it from our servers.
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action ref={deleteRef} onClick={onDelete}>
            Delete
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
};

interface RenameThreadDialogProps {
  thread: StorageThreadType | null;
  onOpenChange: (n: boolean) => void;
  onRename: (title: string) => void;
}

const RenameThreadDialog = ({ thread, onOpenChange, onRename }: RenameThreadDialogProps) => {
  const [title, setTitle] = useState('');

  useEffect(() => {
    setTitle(thread ? (isDefaultThreadName(thread.title || '') ? '' : thread.title || '') : '');
  }, [thread]);

  return (
    <AlertDialog open={!!thread} onOpenChange={onOpenChange}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Rename Chat</AlertDialog.Title>
          <AlertDialog.Description>Set a new chat name.</AlertDialog.Description>
        </AlertDialog.Header>
        <div className="px-4 py-3.5">
          <Input
            autoFocus
            value={title}
            placeholder="Chat name"
            onChange={event => setTitle(event.currentTarget.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && title.trim()) {
                onRename(title.trim());
              }
            }}
          />
        </div>
        <AlertDialog.Footer>
          <AlertDialog.Cancel onClick={() => onOpenChange(false)}>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action disabled={!title.trim()} onClick={() => onRename(title.trim())}>
            Rename
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
};

const ChatThreadSkeleton = () => (
  <div className="p-4 w-full h-full space-y-2">
    <div className="flex justify-end">
      <Skeleton className="h-9 w-9" />
    </div>
    <Skeleton className="h-4" />
    <Skeleton className="h-4" />
    <Skeleton className="h-4" />
    <Skeleton className="h-4" />
    <Skeleton className="h-4" />
  </div>
);

function isDefaultThreadName(name: string): boolean {
  const defaultPattern = /^New Thread \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
  return defaultPattern.test(name);
}

function ThreadTitle({ title, id, createdAt }: { title?: string; id?: string; createdAt?: Date }) {
  if (!title || isDefaultThreadName(title)) {
    return (
      <span className="block min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
        {createdAt ? formatDay(createdAt) : `Thread ${id ? id.substring(id.length - 5) : ''}`}
      </span>
    );
  }

  return <span className="block min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{title}</span>;
}

const formatDay = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  };
  return new Date(date).toLocaleString('en-us', options).replace(',', ' at');
};
