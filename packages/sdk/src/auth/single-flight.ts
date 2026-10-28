/**
 * Runs `task` once for all callers that ask while it is in flight. The next call after it
 * settles starts a new run. Parallel 401s therefore share one token refresh.
 */
export function singleFlight<T>(task: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null
  return () => {
    if (inFlight) return inFlight
    const run = (async () => {
      try {
        return await task()
      } finally {
        inFlight = null
      }
    })()
    inFlight = run
    return run
  }
}
