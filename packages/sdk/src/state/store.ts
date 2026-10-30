// A minimal external store: an immutable snapshot and listeners. React reads it with
// useSyncExternalStore, Vue with a shallowRef. Each change makes a new snapshot object.

export interface Readable<T> {
  /** The current snapshot. The same object until the next change. */
  getSnapshot(): T
  /** Calls `listener` after each change. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void
}

export interface Store<T> extends Readable<T> {
  set(next: T): void
  update(patch: Partial<T>): void
}

export function createStore<T extends object>(initial: T): Store<T> {
  let snapshot = initial
  const listeners = new Set<() => void>()
  function set(next: T): void {
    if (next === snapshot) return
    snapshot = next
    for (const listener of [...listeners]) listener()
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    set,
    update: (patch) => set({ ...snapshot, ...patch })
  }
}
