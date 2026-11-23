const DEFAULT_ATTEMPTS = 8;
const DEFAULT_INTERVAL_MS = 1000;

/**
 * Reads until `isDone` accepts the value or the attempts run out, and returns the last value either
 * way. The AMC services save asynchronously (the call returns before the rows can be searched).
 */
export async function pollUntil<T>(
  read: () => Promise<T>,
  isDone: (value: T) => boolean,
  { attempts = DEFAULT_ATTEMPTS, intervalMs = DEFAULT_INTERVAL_MS } = {},
): Promise<T> {
  let value = await read();
  for (let attempt = 1; attempt < attempts && !isDone(value); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    value = await read();
  }
  return value;
}

/**
 * `pollUntil` for a write the server has already accepted: a slow or failing read must not turn a
 * successful save into an error, so it only delays the refresh.
 */
export async function waitUntilSaved<T>(read: () => Promise<T>, isSaved: (value: T) => boolean): Promise<void> {
  try {
    await pollUntil(read, isSaved);
  } catch {
    // The save itself succeeded; the next refetch shows it.
  }
}
