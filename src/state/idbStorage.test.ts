import { beforeEach, describe, expect, it, vi } from 'vitest'

// In-memory stand-in for IndexedDB so the adapter can be exercised in jsdom
// (which ships no IndexedDB) without adding a heavyweight fake as a dependency.
const mem = new Map<string, string>()

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => mem.get(key)),
  set: vi.fn(async (key: string, value: string) => {
    mem.set(key, value)
  }),
  del: vi.fn(async (key: string) => {
    mem.delete(key)
  }),
}))

import { idbStorage } from './idbStorage'

const KEY = 'momentum-state-v1'

beforeEach(() => {
  mem.clear()
  localStorage.clear()
})

describe('idbStorage adapter', () => {
  it('round-trips a value through IndexedDB', async () => {
    await idbStorage.setItem(KEY, '{"a":1}')
    expect(await idbStorage.getItem(KEY)).toBe('{"a":1}')
    expect(mem.get(KEY)).toBe('{"a":1}')
  })

  it('returns null when nothing is stored anywhere', async () => {
    expect(await idbStorage.getItem(KEY)).toBeNull()
  })

  it('mirrors every write to localStorage as a secondary snapshot', async () => {
    await idbStorage.setItem(KEY, '{"b":2}')
    expect(localStorage.getItem(KEY)).toBe('{"b":2}')
  })

  it('migrates a legacy localStorage snapshot into IndexedDB on first read', async () => {
    // Simulate a pre-migration user: data only in localStorage.
    localStorage.setItem(KEY, '{"legacy":true}')
    expect(mem.has(KEY)).toBe(false)

    const value = await idbStorage.getItem(KEY)
    expect(value).toBe('{"legacy":true}')

    // Copied into IndexedDB…
    expect(mem.get(KEY)).toBe('{"legacy":true}')
    // …and the localStorage copy is left intact (belt and suspenders).
    expect(localStorage.getItem(KEY)).toBe('{"legacy":true}')
  })

  it('prefers the IndexedDB value over a stale localStorage snapshot', async () => {
    localStorage.setItem(KEY, '{"old":true}')
    mem.set(KEY, '{"new":true}')
    expect(await idbStorage.getItem(KEY)).toBe('{"new":true}')
  })

  it('removes the value from both layers', async () => {
    await idbStorage.setItem(KEY, '{"c":3}')
    await idbStorage.removeItem(KEY)
    expect(mem.has(KEY)).toBe(false)
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(await idbStorage.getItem(KEY)).toBeNull()
  })
})
