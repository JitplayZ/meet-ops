/**
 * Wraps a promise in a timeout so that it rejects if the underlying 
 * operation takes longer than the specified milliseconds.
 * 
 * Used primarily to prevent external SDKs from indefinitely retrying 
 * failing operations (e.g. PERMISSION_DENIED on disabled databases)
 * which can cause the UI to hang forever in "Loading..." states.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 3000,
  fallbackMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(fallbackMessage)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}
