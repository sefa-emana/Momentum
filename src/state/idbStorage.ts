/**
 * Durable persistence adapter for zustand/persist.
 *
 * iOS/WebKit may evict *script-writable* localStorage under storage pressure,
 * which for a habit tracker is fatal — so the source of truth moves to
 * IndexedDB (via `idb-keyval`). This module exposes a `StateStorage` adapter
 * plus a transparent one-time migration from the legacy localStorage snapshot.
 *
 * Belt and suspenders: every successful IndexedDB write is mirrored to
 * localStorage as a *secondary* snapshot (never the primary, never deleted), so
 * even if one layer is cleared the other can rehydrate. Both layers are keyed by
 * the same STORAGE_KEY and carry the same migrate chain, so they are always
 * interchangeable.
 */
import { del as idbDel, get as idbGet, set as idbSet } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

/** Guard so `navigator.storage.persist()` is requested at most once per load. */
let persistRequested = false

/**
 * Ask the browser to make our storage bucket persistent (exempt from eviction).
 * Feature-detected, best-effort, result logged to the console only — the app
 * never blocks on or surfaces the outcome (it is a hint, not a guarantee).
 */
export async function requestPersistentStorage(): Promise<void> {
  if (persistRequested) return
  persistRequested = true
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.persist === 'function'
    ) {
      const granted = await navigator.storage.persist()
      // Console-only by design (privacy-first, no telemetry).
      console.info(`[momentum] navigator.storage.persist() → ${granted}`)
    }
  } catch {
    /* persistence unsupported or blocked — carry on gracefully */
  }
}

function readLocal(name: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null
  } catch {
    return null
  }
}

function writeLocal(name: string, value: string): void {
  try {
    localStorage?.setItem(name, value)
  } catch {
    /* quota / private mode — the IndexedDB copy remains authoritative */
  }
}

export const idbStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const val = await idbGet<string>(name)
      if (val != null) return val
      // One-time migration: IndexedDB empty but a legacy localStorage snapshot
      // exists → copy it into IndexedDB transparently and hydrate from it.
      const legacy = readLocal(name)
      if (legacy != null) {
        try {
          await idbSet(name, legacy)
        } catch {
          /* migration write failed — still hydrate from the legacy value */
        }
        return legacy
      }
      return null
    } catch {
      // IndexedDB unavailable (old engine / private mode) — fall back to LS.
      return readLocal(name)
    }
  },

  setItem: async (name, value) => {
    try {
      await idbSet(name, value)
      // First durable write of this session → request persistence once.
      void requestPersistentStorage()
    } catch {
      /* IndexedDB write failed — the localStorage mirror below is the fallback */
    }
    // Always mirror to localStorage as a secondary snapshot (never deleted).
    writeLocal(name, value)
  },

  removeItem: async (name) => {
    try {
      await idbDel(name)
    } catch {
      /* ignore */
    }
    try {
      localStorage?.removeItem(name)
    } catch {
      /* ignore */
    }
  },
}
