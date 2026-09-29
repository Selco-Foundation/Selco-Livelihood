import { useEffect, useState } from "react";

/** Returns `value`, but updates lag behind by `delayMs` — collapses a fast
 * stream of changes (e.g. keystrokes driving a live search) into one update
 * once the caller pauses. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debouncedValue;
}
