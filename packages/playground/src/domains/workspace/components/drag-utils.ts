/** True when a drag carries actual files (not text selections or DOM drags). */
export function dragHasFiles(event: Pick<DragEvent, 'dataTransfer'>): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}
