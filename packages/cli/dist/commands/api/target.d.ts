export interface ApiGlobalOptions {
  url?: string;
  header: string[];
  timeout?: string;
  pretty: boolean;
  schema?: boolean;
}
export interface ResolvedTarget {
  baseUrl: string;
  headers: Record<string, string>;
  timeoutMs: number;
  fallbackHeaders?: Record<string, string>;
}
export declare function resolveTarget(
  options: ApiGlobalOptions,
  fetchFn?: typeof fetch,
  path?: string,
): Promise<ResolvedTarget>;
//# sourceMappingURL=target.d.ts.map
