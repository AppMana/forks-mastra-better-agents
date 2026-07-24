import { formatWorkspaceUploadLabel, workspaceUploadPercent } from '../workspace-upload';
import type { WorkspaceUploadProgress } from '../workspace-upload';

export interface WorkspaceUploadProgressBarProps {
  progress: WorkspaceUploadProgress | null;
}

export const WorkspaceUploadProgressBar = ({ progress }: WorkspaceUploadProgressBarProps) => {
  if (!progress) return null;

  const percent = workspaceUploadPercent(progress);
  const label = formatWorkspaceUploadLabel(progress);

  return (
    <div className="px-1.5 pb-1.5" data-testid="workspace-upload-progress">
      <div className="flex items-center justify-between gap-2 pb-1 text-ui-sm text-neutral3">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums">{percent}%</span>
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-surface3"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-accent1 transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};
