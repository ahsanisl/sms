/** The session marked active, falling back to the most recent one if none is. */
export function activeSession<T extends { isActive: boolean }>(sessions: T[]): T | undefined {
  return sessions.find((s) => s.isActive) ?? sessions[sessions.length - 1];
}
