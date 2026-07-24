import { Button } from '@mastra/playground-ui';
import { Download, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { classifyPreview, formatBytes } from '../file-preview';
import { useWorkspaceFileBlob } from '../hooks/use-workspace-file-blob';
import { parseSpreadsheet } from '../spreadsheet';
import type { SpreadsheetGrid } from '../spreadsheet';
import { FileViewer } from './file-browser';

const SpreadsheetTable = ({ grid }: { grid: SpreadsheetGrid }) => (
  <div className="overflow-auto max-h-[500px]" data-testid="spreadsheet-preview">
    <table className="text-sm text-neutral5 border-collapse">
      <tbody>
        {grid.rows.map((row, rowIndex) => (
          <tr key={rowIndex} className={rowIndex === 0 ? 'font-medium text-neutral6 bg-surface3 sticky top-0' : ''}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="border border-border1 px-2 py-1 whitespace-nowrap">
                {cell == null ? '' : String(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    {grid.truncated && (
      <p className="p-2 text-ui-sm text-neutral3">
        Showing the first {grid.rowCap} rows — download for the full sheet.
      </p>
    )}
  </div>
);

const DownloadPanel = ({ label, size, onDownload }: { label: string; size?: number; onDownload: () => void }) => (
  <div className="flex flex-col items-center gap-3 py-12" data-testid="download-panel">
    <p className="text-sm text-neutral4">{label}</p>
    <Button variant="default" onClick={onDownload}>
      <Download className="h-4 w-4 mr-2" />
      Download{size !== undefined ? ` (${formatBytes(size)})` : ''}
    </Button>
  </div>
);

export interface WorkspaceFilePreviewProps {
  path: string;
  workspaceId?: string;
  onClose?: () => void;
}

/**
 * Mimetype-aware sidebar preview: browser-native PDF/media rendering via blob
 * URLs, SheetJS for spreadsheets, the existing code viewer for text. Content
 * downloads with a progress bar; anything over the auto-load limit presents a
 * download button instead of fetching.
 */
export const WorkspaceFilePreview = ({ path, workspaceId, onClose }: WorkspaceFilePreviewProps) => {
  const fileName = path.split('/').pop() || path;
  const blob = useWorkspaceFileBlob(path, workspaceId);
  const kind = classifyPreview(blob.mimeType, fileName);

  const grid = useMemo(
    () => (kind === 'spreadsheet' && blob.arrayBuffer ? parseSpreadsheet(blob.arrayBuffer) : null),
    [kind, blob.arrayBuffer],
  );

  // Text files keep the existing highlighted viewer wholesale.
  if (kind === 'text' && blob.status === 'ready') {
    return (
      <FileViewer path={path} content={blob.text ?? ''} isLoading={false} mimeType={blob.mimeType} onClose={onClose} />
    );
  }

  const percent =
    blob.progress && blob.progress.total
      ? Math.min(100, Math.round((blob.progress.loaded / blob.progress.total) * 100))
      : null;

  return (
    <div className="rounded-lg border border-border1 overflow-hidden" data-testid="workspace-file-preview">
      <div className="flex items-center justify-between px-4 py-2 bg-surface3 border-b border-border1">
        <span className="text-sm font-medium text-neutral6 truncate">{fileName}</span>
        <div className="flex items-center gap-2 shrink-0">
          {blob.size !== undefined && <span className="text-ui-sm text-neutral3">{formatBytes(blob.size)}</span>}
          <Button variant="ghost" size="md" tooltip="Download" onClick={() => void blob.download()}>
            <Download className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="md" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="max-h-[560px] overflow-auto bg-surface1">
        {blob.status === 'loading-stat' && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-neutral3" />
          </div>
        )}

        {blob.status === 'gated' && (
          <DownloadPanel
            label="This file is larger than 5 MB, so it is not previewed automatically."
            size={blob.size}
            onDownload={() => void blob.download()}
          />
        )}

        {blob.status === 'downloading' && (
          <div className="px-6 py-10" data-testid="preview-download-progress">
            <div className="flex items-center justify-between pb-1 text-ui-sm text-neutral3">
              <span>Downloading {fileName}…</span>
              {percent !== null && <span className="tabular-nums">{percent}%</span>}
            </div>
            <div
              className="h-1 w-full overflow-hidden rounded-full bg-surface3"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent ?? undefined}
            >
              <div
                className={
                  percent === null
                    ? 'h-full w-1/4 animate-pulse rounded-full bg-accent1'
                    : 'h-full rounded-full bg-accent1 transition-[width]'
                }
                style={percent === null ? undefined : { width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {blob.status === 'error' && (
          <DownloadPanel
            label={`Preview failed: ${blob.error ?? 'unknown error'}`}
            size={blob.size}
            onDownload={() => void blob.download()}
          />
        )}

        {blob.status === 'ready' && blob.objectUrl && (
          <>
            {kind === 'pdf' && (
              <iframe
                src={blob.objectUrl}
                title={fileName}
                className="w-full h-[540px] border-0"
                data-testid="pdf-preview"
              />
            )}
            {kind === 'image' && (
              <div className="p-4 flex items-center justify-center">
                <img src={blob.objectUrl} alt={fileName} className="max-w-full max-h-[500px] object-contain" />
              </div>
            )}
            {kind === 'video' && <video src={blob.objectUrl} controls className="w-full max-h-[500px]" />}
            {kind === 'audio' && <audio src={blob.objectUrl} controls className="w-full p-4" />}
            {kind === 'spreadsheet' && grid && <SpreadsheetTable grid={grid} />}
            {(kind === 'download-only' || (kind === 'text' && blob.text === null)) && (
              <DownloadPanel
                label="No inline preview for this file type."
                size={blob.size}
                onDownload={() => void blob.download()}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
