/**
 * Whether the model is still writing this tool call's arguments.
 *
 * `argsText` is the raw JSON the model has emitted so far. While a long
 * argument (a heredoc, a script) is being written that text is not yet valid
 * JSON, so a renderer that only shows parsed arguments has nothing to show for
 * as long as the write takes. Unparseable text is therefore the signal to show
 * the raw text instead of the formatted arguments.
 *
 * A settled call always carries parseable text (the converter stringifies its
 * arguments), so this is false for everything that has landed, including calls
 * restored from storage.
 */
export const isArgsTextIncomplete = (argsText: string | undefined): argsText is string => {
  if (typeof argsText !== 'string') return false;
  try {
    JSON.parse(argsText);
    return false;
  } catch {
    return true;
  }
};
