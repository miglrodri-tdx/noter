// Audio blobs live in IndexedDB (localStorage can't hold them: ~5MB quota). Notes only keep a small `audio` reference.
const DB = 'noter-audio'
const STORE = 'clips'

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req ? req.result : undefined)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function putAudio(id: string, blob: Blob): Promise<void> {
  await run('readwrite', (s) => s.put(blob, id))
  // best effort: ask the browser not to evict recordings under storage pressure
  void navigator.storage?.persist?.().catch(() => {})
}

export async function getAudio(id: string): Promise<Blob | undefined> {
  return (await run<Blob | undefined>('readonly', (s) => s.get(id))) ?? undefined
}

/** Fire-and-forget cleanup; failures are ignored (an orphan blob is harmless). */
export async function deleteAudio(ids: string[]): Promise<void> {
  if (!ids.length) return
  try {
    await run('readwrite', (s) => {
      ids.forEach((id) => s.delete(id))
    })
  } catch {
    /* ignore */
  }
}
