import { UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { dragHasFiles } from './drag-utils';

export interface WorkspaceDropzoneProps {
  onDropFiles: (files: FileList) => void;
  disabled?: boolean;
}

/**
 * Full-viewport drop target: dragging files anywhere over the page toggles an
 * overlay; releasing uploads them to the durable workspace and attaches each
 * one to the message as a chip, exactly as the composer's upload and "+"
 * buttons do. Uses a depth counter because dragenter/dragleave fire for every
 * child element crossed.
 */
export const WorkspaceDropzone = ({ onDropFiles, disabled }: WorkspaceDropzoneProps) => {
  const [dragDepth, setDragDepth] = useState(0);

  useEffect(() => {
    if (disabled) return;

    const onDragEnter = (event: DragEvent) => {
      if (!dragHasFiles(event)) return;
      event.preventDefault();
      setDragDepth(depth => depth + 1);
    };
    const onDragOver = (event: DragEvent) => {
      if (!dragHasFiles(event)) return;
      // Without this the browser navigates to the dropped file.
      event.preventDefault();
    };
    const onDragLeave = (event: DragEvent) => {
      if (!dragHasFiles(event)) return;
      setDragDepth(depth => Math.max(0, depth - 1));
    };
    const onDrop = (event: DragEvent) => {
      if (!dragHasFiles(event)) return;
      event.preventDefault();
      setDragDepth(0);
      if (event.dataTransfer && event.dataTransfer.files.length > 0) {
        onDropFiles(event.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [disabled, onDropFiles]);

  if (disabled || dragDepth === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface1/80 backdrop-blur-sm"
      data-testid="workspace-dropzone"
    >
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-accent1 bg-surface2 px-12 py-10 pointer-events-none">
        <UploadCloud className="text-accent1" size={40} />
        <p className="font-medium">Drop files to upload to the workspace</p>
        <p className="text-ui-sm text-neutral3">Files land in the workspace and attach to your message</p>
      </div>
    </div>
  );
};
