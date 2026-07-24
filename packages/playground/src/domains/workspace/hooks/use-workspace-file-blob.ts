import { useEffect, useRef, useState } from 'react';
import { base64ToBlob, shouldAutoLoad } from '../file-preview';
import { useWorkspaceFileStat } from '.';
import { useStudioConfig } from '@/domains/configuration/context/studio-config-state';

export interface FileBlobProgress {
  loaded: number;
  total: number | null;
}

export interface WorkspaceFileBlobState {
  status: 'loading-stat' | 'gated' | 'downloading' | 'ready' | 'error';
  progress: FileBlobProgress | null;
  objectUrl: string | null;
  text: string | null;
  arrayBuffer: ArrayBuffer | null;
  size?: number;
  mimeType?: string;
  error?: string;
  download: () => Promise<void>;
}

/**
 * Stat-gated, progress-reporting file fetch for the workspace sidebar.
 * Files above the auto-load limit are never fetched — `status: 'gated'` with a
 * `download()` action instead. Progress comes from the streamed response body
 * (the base64-JSON envelope's content-length tracks the file closely enough
 * for a meaningful bar).
 */
export function useWorkspaceFileBlob(path: string, workspaceId: string | undefined): WorkspaceFileBlobState {
  const { baseUrl, headers, apiPrefix } = useStudioConfig();
  const { data: stat, isError: statFailed } = useWorkspaceFileStat(path, { workspaceId, enabled: !!path });

  const [progress, setProgress] = useState<FileBlobProgress | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [phase, setPhase] = useState<'idle' | 'downloading' | 'ready' | 'error'>('idle');
  const objectUrlRef = useRef<string | null>(null);

  const readUrl = `${baseUrl}${apiPrefix ?? '/api'}/workspaces/${encodeURIComponent(workspaceId ?? '')}/fs/read?path=${encodeURIComponent(path)}&encoding=base64`;

  const fetchWithProgress = async (): Promise<Blob> => {
    const response = await fetch(readUrl, { headers: headers as HeadersInit, credentials: 'include' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const total = Number(response.headers.get('content-length')) || stat?.size || null;
    const reader = response.body?.getReader();
    let raw: Uint8Array;
    if (reader) {
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        setProgress({ loaded, total });
      }
      raw = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) {
        raw.set(chunk, offset);
        offset += chunk.byteLength;
      }
    } else {
      raw = new Uint8Array(await response.arrayBuffer());
    }

    const body = JSON.parse(new TextDecoder().decode(raw)) as { content: string; mimeType?: string };
    return base64ToBlob(body.content, body.mimeType ?? stat?.mimeType ?? 'application/octet-stream');
  };

  useEffect(() => {
    setPhase('idle');
    setProgress(null);
    setText(null);
    setArrayBuffer(null);
    setError(undefined);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setObjectUrl(null);

    if (!path || !workspaceId || !stat) return;
    if (!shouldAutoLoad(stat.size)) return; // gated — no fetch

    let cancelled = false;
    setPhase('downloading');
    void (async () => {
      try {
        const blob = await fetchWithProgress();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setObjectUrl(url);
        setArrayBuffer(await blob.arrayBuffer());
        // Text decode is cheap at <=5MB and lets the text viewer reuse it.
        setText(await blob.text());
        setPhase('ready');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Download failed');
          setPhase('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on identity of the file, not the helpers
  }, [path, workspaceId, stat?.size, stat?.mimeType]);

  const download = async () => {
    const blob = await fetchWithProgress();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = path.split('/').pop() || 'download';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const status: WorkspaceFileBlobState['status'] = !stat
    ? statFailed
      ? 'error'
      : 'loading-stat'
    : !shouldAutoLoad(stat.size)
      ? 'gated'
      : phase === 'ready'
        ? 'ready'
        : phase === 'error'
          ? 'error'
          : 'downloading';

  return {
    status,
    progress,
    objectUrl,
    text,
    arrayBuffer,
    size: stat?.size,
    mimeType: stat?.mimeType,
    error: error ?? (statFailed ? 'Could not stat file' : undefined),
    download,
  };
}
